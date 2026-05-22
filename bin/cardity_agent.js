#!/usr/bin/env node

const { program } = require('commander');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

const RESULT_SCHEMA = 'cardity.agent_compile_result.v1';

function executablePath(name) {
  const executableName = process.platform === 'win32' ? `${name}.exe` : name;
  return path.join(__dirname, '..', 'build', executableName);
}

function ensureExecutable(name) {
  const fullPath = executablePath(name);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${name} executable not found at ${fullPath}. Run "npm run build" first.`);
  }
  return fullPath;
}

function runCardityc(args) {
  const executable = ensureExecutable('cardityc');
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const error = new Error(`cardityc failed with exit code ${result.status}`);
    error.details = {
      command: [executable, ...args],
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    };
    throw error;
  }

  return result;
}

function outputJson(payload, exitCode = 0) {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(exitCode);
}

function prepareSource(file, options) {
  if (options.sourceText) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cardity-source-'));
    const sourcePath = path.join(tempDir, `${options.name || 'protocol'}.car`);
    fs.writeFileSync(sourcePath, options.sourceText, 'utf8');
    return sourcePath;
  }

  if (!file) {
    throw new Error('Either <file> or --source-text is required.');
  }

  return path.resolve(file);
}

function extractBlock(source, keyword) {
  const start = source.search(new RegExp(`\\b${keyword}\\s*\\{`));
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

function declaredStateFields(source) {
  const block = extractBlock(source, 'state');
  const fields = new Set();
  const fieldRe = /\b([A-Za-z_][A-Za-z0-9_]*)\s*:/g;
  let match;
  while ((match = fieldRe.exec(block)) !== null) {
    fields.add(match[1]);
  }
  return fields;
}

function validateAgentSafeSource(source, sourcePath) {
  const indexedState = [...source.matchAll(/\bstate\.([A-Za-z_][A-Za-z0-9_]*)\s*\[/g)];
  if (indexedState.length > 0) {
    const fields = [...new Set(indexedState.map((match) => match[1]))].join(', ');
    throw new Error(
      `Unsupported indexed state access in ${sourcePath}: ${fields}. ` +
      'Cardity agent-safe protocols must model keyed collections as top-level table blocks, ' +
      'then keep method logic to scalar state, events, permissions, and summaries.'
    );
  }

  const fields = declaredStateFields(source);
  const refs = [...source.matchAll(/\bstate\.([A-Za-z_][A-Za-z0-9_]*)\b/g)];
  const missing = [...new Set(refs.map((match) => match[1]).filter((field) => !fields.has(field)))];
  if (missing.length > 0) {
    throw new Error(
      `Undeclared state field reference in ${sourcePath}: ${missing.join(', ')}. ` +
      'Declare scalar state fields explicitly, or move business collections into table blocks.'
    );
  }
}

function compileForAgent(file, options) {
  const sourcePath = prepareSource(file, options);
  validateAgentSafeSource(fs.readFileSync(sourcePath, 'utf8'), sourcePath);
  const outDir = path.resolve(options.outDir);
  const baseName = options.name || path.basename(sourcePath, path.extname(sourcePath));

  fs.ensureDirSync(outDir);

  const protocolJsonPath = path.join(outDir, `${baseName}.json`);
  const abiPath = path.join(outDir, `${baseName}.abi.json`);
  const manifestPath = path.join(outDir, `${baseName}.agent.json`);
  const carcPath = path.join(outDir, `${baseName}.carc`);

  runCardityc([sourcePath, '--format', 'json', '-o', protocolJsonPath]);
  runCardityc([sourcePath, '--format', 'agent-manifest', '-o', manifestPath]);
  if (options.carc) {
    runCardityc([sourcePath, '--format', 'carc', '-o', carcPath]);
  }

  const manifest = fs.readJsonSync(manifestPath);
  const protocolJson = fs.readJsonSync(protocolJsonPath);
  const abi = fs.readJsonSync(abiPath);

  const payload = {
    schema: RESULT_SCHEMA,
    ok: true,
    source: sourcePath,
    protocol: manifest.protocol,
    artifacts: {
      protocol_json: protocolJsonPath,
      abi: abiPath,
      agent_manifest: manifestPath
    },
    counts: {
      state: Array.isArray(manifest.state) ? manifest.state.length : 0,
      methods: Array.isArray(manifest.methods) ? manifest.methods.length : 0,
      events: Array.isArray(manifest.events) ? manifest.events.length : 0,
      tools: manifest.agent && Array.isArray(manifest.agent.tools) ? manifest.agent.tools.length : 0
    },
    summary: {
      state: Array.isArray(manifest.state) ? manifest.state.map((item) => item.name) : [],
      methods: Array.isArray(manifest.methods) ? manifest.methods.map((item) => item.name) : [],
      events: Array.isArray(manifest.events) ? manifest.events.map((item) => item.name) : [],
      tools: manifest.agent && Array.isArray(manifest.agent.tools) ? manifest.agent.tools.map((item) => item.name) : []
    }
  };

  if (options.carc) {
    payload.artifacts.carc = carcPath;
  }

  if (options.includeProtocol) {
    payload.protocol_json = protocolJson;
  }

  if (options.includeAbi) {
    payload.abi = abi;
  }

  if (options.includeManifest) {
    payload.manifest = manifest;
  }

  return payload;
}

program
  .name('cardity_agent')
  .description('Machine-readable Cardity adapter for agent runtimes')
  .version('1.0.0');

program
  .command('compile [file]')
  .description('Compile a .car protocol into agent-friendly artifacts')
  .option('--out-dir <dir>', 'Output directory', 'dist')
  .option('--name <name>', 'Artifact base name')
  .option('--source-text <text>', 'Protocol source text. Use this for remote agent calls.')
  .option('--no-carc', 'Skip .carc artifact generation')
  .option('--include-protocol', 'Inline compiled protocol JSON in the result')
  .option('--include-abi', 'Inline ABI JSON in the result')
  .option('--include-manifest', 'Inline Agent OS manifest JSON in the result')
  .action((file, options) => {
    try {
      outputJson(compileForAgent(file, options));
    } catch (error) {
      outputJson({
        schema: RESULT_SCHEMA,
        ok: false,
        error: {
          message: error.message,
          details: error.details || null
        }
      }, 1);
    }
  });

program.parse(process.argv);
