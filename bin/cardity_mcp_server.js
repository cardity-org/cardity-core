#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const readline = require('readline');
const os = require('os');
const { summarizeManifest, renderExplainMarkdown } = require('./cardity_explain');
const { reviewManifest, renderReviewMarkdown } = require('./cardity_review');
const { diffManifest, renderDiffMarkdown } = require('./cardity_diff');

const SERVER_INFO = {
  name: 'cardity-core',
  version: '1.0.0'
};

const TOOLS = [
  {
    name: 'cardity_generation_guide',
    description: 'Return the current agent-safe Cardity generation rules and a system-generation prompt scaffold.',
    inputSchema: {
      type: 'object',
      properties: {
        requirement: {
          type: 'string',
          description: 'Natural-language product or system requirement to turn into a protocol.'
        }
      },
      required: []
    }
  },
  {
    name: 'cardity_compile',
    description: 'Compile a Cardity .car protocol into protocol JSON, ABI, CARC, and Agent OS manifest artifacts.',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Path to a .car protocol file.'
        },
        source_text: {
          type: 'string',
          description: 'Protocol source text. Prefer this for remote or untrusted agent calls.'
        },
        out_dir: {
          type: 'string',
          description: 'Directory for generated artifacts.',
          default: 'dist'
        },
        name: {
          type: 'string',
          description: 'Optional artifact base name.'
        },
        include_manifest: {
          type: 'boolean',
          description: 'Inline the generated Agent OS manifest in the tool result.',
          default: true
        },
        include_abi: {
          type: 'boolean',
          description: 'Inline the generated ABI in the tool result.',
          default: false
        },
        include_protocol: {
          type: 'boolean',
          description: 'Inline the compiled protocol JSON in the tool result.',
          default: false
        },
        carc: {
          type: 'boolean',
          description: 'Generate the .carc artifact.',
          default: true
        }
      },
      required: []
    }
  },
  {
    name: 'cardity_manifest',
    description: 'Generate only the Agent OS manifest for a Cardity .car protocol.',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Path to a .car protocol file.'
        },
        source_text: {
          type: 'string',
          description: 'Protocol source text. Prefer this for remote or untrusted agent calls.'
        },
        output: {
          type: 'string',
          description: 'Optional manifest output path.'
        }
      },
      required: []
    }
  },
  {
    name: 'cardity_explain_manifest',
    description: 'Explain a Cardity .car protocol or Agent OS manifest as Markdown or JSON summary.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .car protocol file or manifest JSON file.' },
        source_text: { type: 'string', description: 'Protocol source text.' },
        manifest: { type: 'object', description: 'Inline Agent OS manifest JSON.' },
        format: { enum: ['markdown', 'json'], default: 'markdown' },
        diagram: { type: 'boolean', default: false }
      },
      required: []
    }
  },
  {
    name: 'cardity_review_security',
    description: 'Review a Cardity .car protocol or Agent OS manifest for generic action/projection safety.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .car protocol file or manifest JSON file.' },
        source_text: { type: 'string', description: 'Protocol source text.' },
        manifest: { type: 'object', description: 'Inline Agent OS manifest JSON.' },
        format: { enum: ['markdown', 'json'], default: 'markdown' }
      },
      required: []
    }
  },
  {
    name: 'cardity_diff',
    description: 'Compare two Cardity protocols or Agent OS manifests for breaking contract changes.',
    inputSchema: {
      type: 'object',
      properties: {
        old_file: { type: 'string', description: 'Path to the old .car protocol or manifest JSON file.' },
        new_file: { type: 'string', description: 'Path to the new .car protocol or manifest JSON file.' },
        old_source_text: { type: 'string', description: 'Old protocol source text.' },
        new_source_text: { type: 'string', description: 'New protocol source text.' },
        old_manifest: { type: 'object', description: 'Old inline Agent OS manifest.' },
        new_manifest: { type: 'object', description: 'New inline Agent OS manifest.' },
        format: { enum: ['markdown', 'json'], default: 'markdown' }
      },
      required: []
    }
  }
];

function generationGuide(args = {}) {
  return {
    schema: 'cardity.generation_guide.v1',
    ok: true,
    requirement: args.requirement || '',
    protocol_rules: [
      'Use protocol, version, owner, state, table, event, method, and returns blocks only.',
      'State is scalar and explicit: int, string, bool, address. Do not use state.foo[key].',
      'Keyed collections, ledgers, users, balances, tickets, customers, and records belong in top-level table blocks.',
      'Methods define callable intent, params, return type, events, and scalar summary/audit state.',
      'Methods that write state or emit events will be marked requires_confirmation in the Agent OS manifest.',
      'Generated actions include generic action semantics, planner hints, safety fields, dry-run/readback flags, and replay policy.',
      'When events and tables imply business records, the manifest may include system.database.projections for event-to-table writes.',
      'External entries belong in system.external.navigation or system.external.services unless a concrete permissioned action contract exists.',
      'ERP read models should rely on upsert_snapshot projections, composite keys, tenant context, and confirmed readback when available.',
      'Read-only query methods should avoid writes and emits so they become GET/query tools.',
      'After drafting source, call cardity_compile and fix any compiler or agent-safety errors.'
    ],
    table_syntax: [
      'table balances {',
      '  user: address;',
      '  balance: int = 0;',
      '}'
    ].join('\n'),
    prompt_scaffold: [
      'Draft a Cardity protocol for the requirement.',
      'Keep Cardity state scalar. Put business collections in table blocks.',
      'Compile it with cardity_compile using source_text.',
      'Return the source, methods/tools/permissions summary, and Agent OS API/database/UI/workflow plan.'
    ].join('\n'),
    safe_source_template: [
      'protocol ExampleSystem {',
      '  version: "1.0.0";',
      '  owner: "agent-os";',
      '',
      '  state {',
      '    result: string = "ok";',
      '    last_actor: address = "";',
      '    last_operation: string = "none";',
      '  }',
      '',
      '  table records {',
      '    id: string;',
      '    owner: address;',
      '    status: string = "active";',
      '  }',
      '',
      '  event RecordChanged {',
      '    id: string;',
      '    operation: string;',
      '  }',
      '',
      '  method get_record(id: string) {',
      '    state.result = state.result;',
      '  }',
      '  returns: string state.result;',
      '',
      '  method update_record(id: string, status: string) {',
      '    state.result = "ok";',
      '    state.last_actor = ctx.sender;',
      '    state.last_operation = "update_record";',
      '    emit RecordChanged(params.id, "update_record");',
      '  }',
      '  returns: string state.result;',
      '}'
    ].join('\n')
  };
}

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

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const error = new Error(`${path.basename(command)} failed with exit code ${result.status}`);
    error.details = {
      command: [command, ...args],
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    };
    throw error;
  }

  return result;
}

function compile(args) {
  const agentCli = path.join(__dirname, 'cardity_agent.js');
  const cliArgs = ['compile'];

  if (args.file) cliArgs.push(args.file);

  if (args.out_dir) cliArgs.push('--out-dir', args.out_dir);
  if (args.name) cliArgs.push('--name', args.name);
  if (args.source_text) cliArgs.push('--source-text', args.source_text);
  if (args.carc === false) cliArgs.push('--no-carc');
  if (args.include_protocol === true) cliArgs.push('--include-protocol');
  if (args.include_abi === true) cliArgs.push('--include-abi');
  if (args.include_manifest !== false) cliArgs.push('--include-manifest');

  const result = run(process.execPath, [agentCli, ...cliArgs]);
  return JSON.parse(result.stdout);
}

function manifest(args) {
  const output = args.output || path.join(process.cwd(), `${path.basename(args.file || args.name || 'protocol', path.extname(args.file || ''))}.agent.json`);
  const payload = compile({
    file: args.file,
    source_text: args.source_text,
    out_dir: path.dirname(output),
    name: path.basename(output, '.agent.json'),
    include_manifest: true,
    carc: false
  });
  const manifestPayload = payload.manifest || fs.readJsonSync(payload.artifacts.agent_manifest);
  if (payload.artifacts.agent_manifest !== path.resolve(output)) {
    fs.writeJsonSync(output, manifestPayload, { spaces: 2 });
  }
  return {
    schema: 'cardity.agent_manifest_result.v1',
    ok: true,
    source: args.file ? path.resolve(args.file) : 'source_text',
    artifact: path.resolve(output),
    manifest: manifestPayload
  };
}

function manifestFromArgs(args, prefix = '') {
  const manifestArg = args[`${prefix}manifest`] || (!prefix ? args.manifest : undefined);
  if (manifestArg) return manifestArg.manifest || manifestArg;

  const file = args[`${prefix}file`] || (!prefix ? args.file : undefined);
  const sourceText = args[`${prefix}source_text`] || (!prefix ? args.source_text : undefined);
  if (sourceText) {
    return compile({
      source_text: sourceText,
      out_dir: args.out_dir || path.join(process.cwd(), 'dist'),
      name: args.name,
      include_manifest: true,
      include_abi: false,
      include_protocol: false,
      carc: false
    }).manifest;
  }

  if (file) {
    const absolute = path.resolve(file);
    if (path.extname(absolute).toLowerCase() === '.json') {
      const payload = fs.readJsonSync(absolute);
      return payload.manifest || payload;
    }
    return compile({
      file: absolute,
      out_dir: path.join(os.tmpdir(), 'cardity-mcp-artifacts'),
      name: path.basename(absolute, path.extname(absolute)),
      include_manifest: true,
      include_abi: false,
      include_protocol: false,
      carc: false
    }).manifest;
  }

  throw new Error(`Missing ${prefix ? prefix.replace(/_$/, ' ') : ''}file, source_text, or manifest.`);
}

function explain(args) {
  const manifestPayload = manifestFromArgs(args);
  const summary = summarizeManifest(manifestPayload);
  return {
    schema: 'cardity.explain_tool_result.v1',
    ok: true,
    format: args.format || 'markdown',
    summary,
    output: args.format === 'json' ? summary : renderExplainMarkdown(summary, { diagram: Boolean(args.diagram) })
  };
}

function review(args) {
  const manifestPayload = manifestFromArgs(args);
  const reviewPayload = reviewManifest(manifestPayload);
  return {
    schema: 'cardity.security_review_tool_result.v1',
    ok: reviewPayload.ok,
    format: args.format || 'markdown',
    review: reviewPayload,
    output: args.format === 'json' ? reviewPayload : renderReviewMarkdown(reviewPayload)
  };
}

function diff(args) {
  const oldManifest = manifestFromArgs(args, 'old_');
  const newManifest = manifestFromArgs(args, 'new_');
  const diffPayload = diffManifest(oldManifest, newManifest);
  return {
    schema: 'cardity.protocol_diff_tool_result.v1',
    ok: diffPayload.compatible,
    format: args.format || 'markdown',
    diff: diffPayload,
    output: args.format === 'json' ? diffPayload : renderDiffMarkdown(diffPayload)
  };
}

function toolResult(payload) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function success(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function failure(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  send({ jsonrpc: '2.0', id, error });
}

async function handle(request) {
  if (!request || typeof request !== 'object') return;
  if (request.id === undefined && request.method && request.method.startsWith('notifications/')) return;

  try {
    switch (request.method) {
      case 'initialize':
        success(request.id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: SERVER_INFO
        });
        break;
      case 'tools/list':
        success(request.id, { tools: TOOLS });
        break;
      case 'tools/call': {
        const params = request.params || {};
        const args = params.arguments || {};
        if (params.name === 'cardity_generation_guide') {
          success(request.id, toolResult(generationGuide(args)));
        } else if (params.name === 'cardity_compile') {
          success(request.id, toolResult(compile(args)));
        } else if (params.name === 'cardity_manifest') {
          success(request.id, toolResult(manifest(args)));
        } else if (params.name === 'cardity_explain_manifest') {
          success(request.id, toolResult(explain(args)));
        } else if (params.name === 'cardity_review_security') {
          success(request.id, toolResult(review(args)));
        } else if (params.name === 'cardity_diff') {
          success(request.id, toolResult(diff(args)));
        } else {
          failure(request.id, -32602, `Unknown tool: ${params.name}`);
        }
        break;
      }
      case 'ping':
        success(request.id, {});
        break;
      default:
        failure(request.id, -32601, `Method not found: ${request.method}`);
    }
  } catch (error) {
    failure(request.id, -32000, error.message, error.details || null);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    handle(JSON.parse(line));
  } catch (error) {
    failure(null, -32700, error.message);
  }
});
