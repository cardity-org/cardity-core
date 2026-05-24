#!/usr/bin/env node

const http = require('http');
const { spawnSync } = require('child_process');
const path = require('path');

const DEFAULT_PORT = Number(process.env.PORT || 8787);
const DEFAULT_HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = Number(process.env.CARDITY_MAX_BODY_BYTES || 1024 * 1024);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(`${body}\n`);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error(`Invalid JSON: ${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

function runAgentCompile(input, overrides = {}) {
  const agentCli = path.join(__dirname, 'cardity_agent.js');
  const args = ['compile'];

  if (input.file) args.push(input.file);
  if (input.source_text) args.push('--source-text', input.source_text);
  args.push('--out-dir', input.out_dir || '/tmp/cardity-public-artifacts');
  if (input.name) args.push('--name', input.name);
  if (input.carc === false || overrides.carc === false) args.push('--no-carc');
  if (input.include_protocol || overrides.includeProtocol) args.push('--include-protocol');
  if (input.include_abi || overrides.includeAbi) args.push('--include-abi');
  if (input.include_manifest !== false || overrides.includeManifest) args.push('--include-manifest');

  const result = spawnSync(process.execPath, [agentCli, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: Number(process.env.CARDITY_COMPILE_TIMEOUT_MS || 30000),
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.error) throw result.error;

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  let payload;
  try {
    payload = JSON.parse(stdout || stderr);
  } catch (error) {
    throw new Error(`Failed to parse cardity_agent output: ${error.message}`);
  }

  if (result.status !== 0 || payload.ok === false) {
    const message = payload.error && payload.error.message ? payload.error.message : `cardity_agent failed with exit code ${result.status}`;
    const err = new Error(message);
    err.payload = payload;
    throw err;
  }

  return payload;
}

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
    ].join('\n')
  };
}

function mcpToolList() {
  return {
    tools: [
      {
        name: 'cardity_generation_guide',
        description: 'Return the current agent-safe Cardity generation rules and prompt scaffold.',
        inputSchema: {
          type: 'object',
          properties: {
            requirement: { type: 'string' }
          },
          required: []
        }
      },
      {
        name: 'cardity_compile',
        description: 'Compile Cardity source text into protocol JSON, ABI, CARC, and Agent OS manifest.',
        inputSchema: {
          type: 'object',
          properties: {
            source_text: { type: 'string' },
            include_manifest: { type: 'boolean', default: true },
            include_abi: { type: 'boolean', default: true },
            include_protocol: { type: 'boolean', default: false },
            carc: { type: 'boolean', default: false }
          },
          required: ['source_text']
        }
      }
    ]
  };
}

function mcpResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

async function handleMcp(body) {
  if (body.method === 'initialize') {
    return mcpResponse(body.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'cardity-core-http', version: '1.0.0' }
    });
  }
  if (body.method === 'tools/list') {
    return mcpResponse(body.id, mcpToolList());
  }
  if (body.method === 'tools/call') {
    const params = body.params || {};
    if (params.name === 'cardity_generation_guide') {
      return mcpResponse(body.id, {
        content: [{ type: 'text', text: JSON.stringify(generationGuide(params.arguments || {}), null, 2) }]
      });
    }
    if (params.name !== 'cardity_compile') {
      return { jsonrpc: '2.0', id: body.id, error: { code: -32602, message: `Unknown tool: ${params.name}` } };
    }
    const payload = runAgentCompile(params.arguments || {}, {
      includeManifest: true,
      includeAbi: true,
      carc: false
    });
    return mcpResponse(body.id, {
      content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
    });
  }
  return { jsonrpc: '2.0', id: body.id || null, error: { code: -32601, message: `Method not found: ${body.method}` } };
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true, service: 'cardity-core', schema: 'cardity.public_api.v1' });
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: { message: 'Method not allowed' } });
      return;
    }

    const body = await readJson(req);

    if (url.pathname === '/v1/compile') {
      sendJson(res, 200, runAgentCompile(body, { includeManifest: true }));
      return;
    }

    if (url.pathname === '/v1/generation-guide') {
      sendJson(res, 200, generationGuide(body));
      return;
    }

    if (url.pathname === '/v1/validate') {
      const payload = runAgentCompile({ ...body, include_manifest: false, include_abi: false, include_protocol: false, carc: false });
      sendJson(res, 200, { schema: 'cardity.validate_result.v1', ok: payload.ok, protocol: payload.protocol, counts: payload.counts });
      return;
    }

    if (url.pathname === '/v1/manifest') {
      const payload = runAgentCompile({ ...body, include_manifest: true, include_abi: false, include_protocol: false, carc: false }, { includeManifest: true, carc: false });
      sendJson(res, 200, {
        schema: 'cardity.agent_manifest_result.v1',
        ok: true,
        protocol: payload.protocol,
        manifest: payload.manifest
      });
      return;
    }

    if (url.pathname === '/v1/abi') {
      const payload = runAgentCompile({ ...body, include_manifest: false, include_abi: true, include_protocol: false, carc: false }, { includeAbi: true, carc: false });
      sendJson(res, 200, {
        schema: 'cardity.abi_result.v1',
        ok: true,
        protocol: payload.protocol,
        abi: payload.abi
      });
      return;
    }

    if (url.pathname === '/mcp') {
      sendJson(res, 200, await handleMcp(body));
      return;
    }

    sendJson(res, 404, { ok: false, error: { message: 'Not found' } });
  } catch (error) {
    sendJson(res, error.message === 'Request body too large' ? 413 : 400, {
      ok: false,
      error: {
        message: error.message,
        details: error.payload || null
      }
    });
  }
}

const server = http.createServer((req, res) => {
  handle(req, res);
});

server.on('error', (error) => {
  process.stderr.write(`Failed to start Cardity public API: ${error.message}\n`);
  process.exit(1);
});

server.listen(DEFAULT_PORT, DEFAULT_HOST, () => {
  process.stderr.write(`Cardity public API listening on http://${DEFAULT_HOST}:${DEFAULT_PORT}\n`);
});
