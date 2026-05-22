function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

function extractBlock(source, startIndex) {
  const open = source.indexOf("{", startIndex);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") {
      depth--;
      if (depth === 0) return { body: source.slice(open + 1, i), end: i + 1 };
    }
  }
  return null;
}

function parseFields(body) {
  const fields = [];
  const fieldRe = /\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*=\s*("[^"]*"|-?\d+|true|false))?\s*;/g;
  let match;
  while ((match = fieldRe.exec(body)) !== null) {
    fields.push({
      name: match[1],
      type: match[2],
      default: match[3] ? match[3].replace(/^"|"$/g, "") : undefined
    });
  }
  return fields;
}

function parseParams(paramsText) {
  if (!paramsText.trim()) return [];
  return paramsText.split(",").map((part) => {
    const match = part.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([A-Za-z_][A-Za-z0-9_]*))?$/);
    if (!match) throw new Error(`Invalid parameter: ${part.trim()}`);
    return { name: match[1], type: match[2] || "string" };
  });
}

function parseProtocol(source) {
  const protocolMatch = source.match(/\bprotocol\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);
  if (!protocolMatch) throw new Error("Expected protocol declaration");

  const protocolStart = protocolMatch.index || 0;
  const protocolBlock = extractBlock(source, protocolStart);
  if (!protocolBlock) throw new Error("Unclosed protocol block");
  const body = protocolBlock.body;

  const version = (body.match(/\bversion\s*:\s*"([^"]+)"\s*;/) || [])[1] || "1.0.0";
  const owner = (body.match(/\bowner\s*:\s*"([^"]*)"\s*;/) || [])[1] || "";

  const stateMatch = body.match(/\bstate\s*\{/);
  const stateBlock = stateMatch ? extractBlock(body, stateMatch.index) : null;
  const state = stateBlock ? parseFields(stateBlock.body) : [];
  const stateNames = new Set(state.map((item) => item.name));

  const tables = [];
  const tableRe = /\btable\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/g;
  let tableMatch;
  while ((tableMatch = tableRe.exec(body)) !== null) {
    const block = extractBlock(body, tableMatch.index);
    if (!block) throw new Error(`Unclosed table block: ${tableMatch[1]}`);
    tables.push({ name: tableMatch[1], columns: parseFields(block.body) });
    tableRe.lastIndex = block.end;
  }

  const events = [];
  const eventRe = /\bevent\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(([^)]*)\)\s*;|\s*\{)/g;
  let eventMatch;
  while ((eventMatch = eventRe.exec(body)) !== null) {
    if (eventMatch[2] !== undefined) {
      events.push({ name: eventMatch[1], params: parseParams(eventMatch[2]) });
      continue;
    }
    const block = extractBlock(body, eventMatch.index);
    if (!block) throw new Error(`Unclosed event block: ${eventMatch[1]}`);
    events.push({ name: eventMatch[1], params: parseFields(block.body).map(({ name, type }) => ({ name, type })) });
    eventRe.lastIndex = block.end;
  }

  const methods = [];
  const methodRe = /\bmethod\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
  let methodMatch;
  while ((methodMatch = methodRe.exec(body)) !== null) {
    const block = extractBlock(body, methodMatch.index);
    if (!block) throw new Error(`Unclosed method block: ${methodMatch[1]}`);
    const after = body.slice(block.end);
    const returnsMatch = after.match(/^\s*returns\s*:\s*(?:(string|int|bool|address)\s+)?([^;]+)\s*;/);
    methods.push({
      name: methodMatch[1],
      params: parseParams(methodMatch[2]),
      logic: block.body.trim(),
      returns: returnsMatch ? (returnsMatch[1] || "string") : null,
      return_expr: returnsMatch ? returnsMatch[2].trim() : ""
    });
    methodRe.lastIndex = block.end + (returnsMatch ? returnsMatch[0].length : 0);
  }

  validateAgentSafe(source, stateNames);

  return {
    name: protocolMatch[1],
    version,
    owner,
    state,
    tables,
    events,
    methods
  };
}

function validateAgentSafe(source, stateNames) {
  const indexed = [...source.matchAll(/\bstate\.([A-Za-z_][A-Za-z0-9_]*)\s*\[/g)];
  if (indexed.length) {
    const fields = [...new Set(indexed.map((match) => match[1]))].join(", ");
    throw new Error(`Unsupported indexed state access: ${fields}. Move keyed collections into top-level table blocks.`);
  }

  const missing = [...new Set([...source.matchAll(/\bstate\.([A-Za-z_][A-Za-z0-9_]*)\b/g)]
    .map((match) => match[1])
    .filter((field) => !stateNames.has(field)))];
  if (missing.length) {
    throw new Error(`Undeclared state field reference: ${missing.join(", ")}`);
  }
}

function snake(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "protocol";
}

function title(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function jsonSchemaType(type) {
  const t = String(type || "string").toLowerCase();
  if (["int", "integer", "uint", "long"].includes(t)) return "integer";
  if (["float", "double", "number"].includes(t)) return "number";
  if (["bool", "boolean"].includes(t)) return "boolean";
  return "string";
}

function inferEffects(method) {
  const reads = new Set();
  const writes = new Set();
  const emits = new Set();
  const logic = method.logic.replace(/\s+/g, " ");
  for (const match of logic.matchAll(/\bstate\.([A-Za-z_][A-Za-z0-9_]*)\b/g)) reads.add(match[1]);
  for (const match of logic.matchAll(/\bstate\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+)/g)) {
    const field = match[1];
    const rhs = match[2].replace(/\s+/g, "");
    if (rhs !== `state.${field}`) writes.add(field);
  }
  for (const match of logic.matchAll(/\bemit\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) emits.add(match[1]);
  return { reads: [...reads], writes: [...writes], emits: [...emits] };
}

function compile(sourceText, options = {}) {
  const protocol = parseProtocol(sourceText);

  const protocolJson = {
    p: "cardity",
    op: "deploy",
    protocol: protocol.name,
    version: protocol.version,
    cpl: {
      owner: protocol.owner,
      state: Object.fromEntries(protocol.state.map((item) => [item.name, { type: item.type, default: item.default || "" }])),
      tables: protocol.tables,
      methods: Object.fromEntries(protocol.methods.map((method) => [method.name, {
        params: method.params.map((param) => param.name),
        param_types: method.params.map((param) => param.type),
        logic: method.logic,
        returns: method.returns ? { type: method.returns, expr: method.return_expr } : null
      }])),
      events: Object.fromEntries(protocol.events.map((event) => [event.name, { params: event.params }]))
    }
  };

  const abi = {
    protocol: protocol.name,
    version: protocol.version,
    state: Object.fromEntries(protocol.state.map((item) => [item.name, { type: item.type, default: item.default || "" }])),
    methods: Object.fromEntries(protocol.methods.map((method) => [method.name, {
      params: method.params,
      returns: method.returns
    }])),
    events: Object.fromEntries(protocol.events.map((event) => [event.name, { params: event.params }]))
  };

  const routes = [];
  const tools = [];
  const permissions = [];
  const manifestMethods = protocol.methods.map((method) => {
    const effects = inferEffects(method);
    const mutates = effects.writes.length > 0 || effects.emits.length > 0;
    const route = { method: mutates ? "POST" : "GET", path: `/protocols/${protocol.name}/methods/${method.name}` };
    routes.push(route);
    const tool = {
      name: snake(`${protocol.name}_${method.name}`),
      description: `Invoke ${protocol.name}.${method.name}`,
      method: method.name,
      input_schema: {
        type: "object",
        properties: Object.fromEntries(method.params.map((param) => [param.name, { type: jsonSchemaType(param.type) }])),
        required: method.params.map((param) => param.name)
      }
    };
    tools.push(tool);
    if (mutates) permissions.push({ action: method.name, requires_confirmation: true, reason: "Method writes state or emits protocol events" });
    return {
      name: method.name,
      params: method.params,
      returns: method.returns,
      effects,
      route,
      ui: { kind: mutates ? "action" : "query", label: title(method.name) }
    };
  });

  const events = protocol.events.map((event) => ({
    name: event.name,
    params: event.params,
    stream: `cardity.${protocol.name}.${event.name}`
  }));

  const stateTable = {
    name: `${snake(protocol.name)}_state`,
    columns: protocol.state.map((item) => ({ name: item.name, type: item.type }))
  };

  const manifest = {
    schema: "cardity.agent_manifest.v1",
    protocol: { name: protocol.name, version: protocol.version, owner: protocol.owner },
    source: { p: "cardity", op: "deploy" },
    state: protocol.state.map((item) => ({ name: item.name, type: item.type, storage: "persistent", ...(item.default !== undefined ? { default: item.default } : {}) })),
    tables: protocol.tables,
    events,
    methods: manifestMethods,
    permissions,
    system: {
      api: { routes },
      database: { tables: [stateTable, ...protocol.tables] },
      ui: { resources: [protocol.name], actions: tools },
      workflows: events.map((event) => ({ name: `on_${event.name}`, trigger: { event: event.name }, actions: [] }))
    },
    agent: { tools, events }
  };

  const result = {
    schema: "cardity.agent_compile_result.v1",
    ok: true,
    source: "source_text",
    protocol: { name: protocol.name, owner: protocol.owner, version: protocol.version },
    artifacts: {
      protocol_json: "edge://cardity/protocol.json",
      abi: "edge://cardity/protocol.abi.json",
      agent_manifest: "edge://cardity/protocol.agent.json"
    },
    counts: {
      state: protocol.state.length,
      tables: protocol.tables.length,
      methods: protocol.methods.length,
      events: protocol.events.length,
      tools: tools.length
    },
    summary: {
      state: protocol.state.map((item) => item.name),
      tables: protocol.tables.map((item) => item.name),
      methods: protocol.methods.map((item) => item.name),
      events: protocol.events.map((item) => item.name),
      tools: tools.map((item) => item.name)
    }
  };
  if (options.include_protocol) result.protocol_json = protocolJson;
  if (options.include_abi !== false) result.abi = abi;
  if (options.include_manifest !== false) result.manifest = manifest;
  return result;
}

function generationGuide(requirement = "") {
  return {
    schema: "cardity.generation_guide.v1",
    ok: true,
    requirement,
    protocol_rules: [
      "Use protocol, version, owner, state, table, event, method, and returns blocks only.",
      "State is scalar and explicit: int, string, bool, address. Do not use state.foo[key].",
      "Keyed collections, ledgers, users, balances, tickets, customers, and records belong in top-level table blocks.",
      "Methods define callable intent, params, return type, events, and scalar summary/audit state.",
      "Methods that write state or emit events will be marked requires_confirmation in the Agent OS manifest.",
      "Read-only query methods should avoid writes and emits so they become GET/query tools.",
      "After drafting source, call cardity_compile and fix any compiler or agent-safety errors."
    ],
    table_syntax: "table balances {\n  user: address;\n  balance: int = 0;\n}"
  };
}

async function readBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return {};
  const text = await request.text();
  return text.trim() ? JSON.parse(text) : {};
}

function mcpTools() {
  return {
    tools: [
      {
        name: "cardity_generation_guide",
        description: "Return the current agent-safe Cardity generation rules and prompt scaffold.",
        inputSchema: { type: "object", properties: { requirement: { type: "string" } }, required: [] }
      },
      {
        name: "cardity_compile",
        description: "Compile Cardity source text into protocol JSON, ABI, and Agent OS manifest.",
        inputSchema: {
          type: "object",
          properties: {
            source_text: { type: "string" },
            include_manifest: { type: "boolean", default: true },
            include_abi: { type: "boolean", default: true },
            include_protocol: { type: "boolean", default: false },
            carc: { type: "boolean", default: false }
          },
          required: ["source_text"]
        }
      }
    ]
  };
}

async function handleMcp(body) {
  if (body.method === "initialize") {
    return { jsonrpc: "2.0", id: body.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "cardity-core-edge", version: "1.1.0" } } };
  }
  if (body.method === "tools/list") return { jsonrpc: "2.0", id: body.id, result: mcpTools() };
  if (body.method === "tools/call") {
    const params = body.params || {};
    const args = params.arguments || {};
    if (params.name === "cardity_generation_guide") {
      return { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify(generationGuide(args.requirement || ""), null, 2) }] } };
    }
    if (params.name === "cardity_compile") {
      const payload = compile(args.source_text || "", args);
      return { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] } };
    }
    return { jsonrpc: "2.0", id: body.id, error: { code: -32602, message: `Unknown tool: ${params.name}` } };
  }
  return { jsonrpc: "2.0", id: body.id || null, error: { code: -32601, message: `Method not found: ${body.method}` } };
}

async function edgeApi(request) {
  const url = new URL(request.url);
  const body = await readBody(request);
  if (url.pathname === "/mcp") return json(await handleMcp(body));
  if (!body.source_text && url.pathname !== "/v1/generation-guide") return null;
  if (url.pathname === "/v1/generation-guide") return json(generationGuide(body.requirement || ""));
  if (url.pathname === "/v1/compile") return json(compile(body.source_text, body));
  if (url.pathname === "/v1/validate") {
    const payload = compile(body.source_text, { include_abi: false, include_manifest: false });
    return json({ schema: "cardity.validate_result.v1", ok: true, protocol: payload.protocol, counts: payload.counts, summary: payload.summary });
  }
  if (url.pathname === "/v1/manifest") {
    const payload = compile(body.source_text, { include_abi: false, include_manifest: true });
    return json({ schema: "cardity.agent_manifest_result.v1", ok: true, protocol: payload.protocol, manifest: payload.manifest });
  }
  if (url.pathname === "/v1/abi") {
    const payload = compile(body.source_text, { include_abi: true, include_manifest: false });
    return json({ schema: "cardity.abi_result.v1", ok: true, protocol: payload.protocol, abi: payload.abi });
  }
  return null;
}

export class CardityApiContainer {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const container = this.ctx.container;
    if (!container.running) {
      container.start({ env: { NODE_ENV: "production", PORT: "8787", HOST: "0.0.0.0", CARDITY_MAX_BODY_BYTES: "1048576" } });
    }
    const incomingUrl = new URL(request.url);
    const containerUrl = new URL(incomingUrl.pathname + incomingUrl.search, "http://container");
    const headers = new Headers(request.headers);
    headers.set("host", "container");
    const init = { method: request.method, headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
    return container.getTcpPort(8787).fetch(new Request(containerUrl, init));
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return json({}, 204);
    const url = new URL(request.url);
    if (url.pathname === "/edge-health") {
      return json({ ok: true, service: "cardity-core-edge", container: "cardity-core-api", compiler: "edge-agent-safe-v1" });
    }

    try {
      const response = await edgeApi(request.clone());
      if (response) return response;
    } catch (error) {
      return json({ ok: false, error: { message: error.message } }, 400);
    }

    const id = env.CARDITY_API_CONTAINER.idFromName("public-api-v2");
    return env.CARDITY_API_CONTAINER.get(id).fetch(request);
  }
};
