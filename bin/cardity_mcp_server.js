#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const readline = require('readline');

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
