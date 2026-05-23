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

function hasColumns(table, required) {
  const columns = new Set((table.columns || []).map((column) => column.name));
  return required.every((name) => columns.has(name));
}

function hasParams(event, required) {
  const params = new Set((event.params || []).map((param) => param.name));
  return required.every((name) => params.has(name));
}

function normalizeTableSchema(table) {
  const columns = new Set((table.columns || []).map((column) => column.name));
  const normalized = {
    ...table,
    columns: (table.columns || []).map((column) => ({
      nullable: true,
      ...column
    }))
  };
  if (!normalized.primary_key) {
    const businessIds = [
      "goods_id", "product_id", "order_id", "message_id",
      "inventory_id", "customer_id", "sku_id", "id"
    ];
    if (columns.has("merchant_id")) {
      const id = businessIds.find((candidate) => columns.has(candidate) && candidate !== "merchant_id");
      if (id) normalized.primary_key = ["merchant_id", id];
    }
    if (!normalized.primary_key && columns.has("user")) normalized.primary_key = ["user"];
    if (!normalized.primary_key && columns.has("id")) normalized.primary_key = ["id"];
  }
  if (!normalized.indexes) {
    if (columns.has("merchant_id") && columns.has("status")) {
      normalized.indexes = [{
        name: `${snake(table.name)}_merchant_status_idx`,
        columns: ["merchant_id", "status"]
      }];
    } else if (columns.has("merchant_id")) {
      normalized.indexes = [{
        name: `${snake(table.name)}_merchant_idx`,
        columns: ["merchant_id"]
      }];
    } else if (columns.has("user")) {
      normalized.indexes = [{
        name: `${snake(table.name)}_user_idx`,
        columns: ["user"]
      }];
    } else {
      normalized.indexes = [];
    }
  }
  return normalized;
}

function inferReadModels(tables) {
  return tables.map((table) => ({
    name: table.name,
    kind: "read_model",
    columns: table.columns || [],
    primary_key: table.primary_key || [],
    indexes: table.indexes || [],
    query_contracts: [`${snake(table.name)}.list`]
  }));
}

function inferQueries(readModels) {
  return readModels.map((model) => ({
    name: `${snake(model.name)}.list`,
    read_model: model.name,
    operation: "list",
    filters: model.primary_key || []
  }));
}

function inferProjections(tables, events) {
  const balanceTable = tables.find((table) => hasColumns(table, ["user", "balance"]));
  const ledgerTable = tables.find((table) => hasColumns(table, ["user", "delta", "reason", "actor", "operation"]));
  if (!balanceTable && !ledgerTable) return [];

  const projections = [];
  const addPointProjection = (eventName, deltaExpr, actorExpr, operationName) => {
    const writes = [];
    if (balanceTable) {
      writes.push({
        table: balanceTable.name,
        operation: "upsert_delta",
        key: { user: "$event.user" },
        delta: { balance: deltaExpr }
      });
    }
    if (ledgerTable) {
      writes.push({
        table: ledgerTable.name,
        operation: "insert",
        values: {
          user: "$event.user",
          delta: deltaExpr,
          reason: "$event.reason",
          actor: actorExpr,
          operation: operationName
        }
      });
    }
    if (writes.length) {
      projections.push({
        name: `${snake(eventName)}_to_member_points`,
        version: "1.1",
        source_id: "$event.id",
        idempotency: {
          source_id: "$event.id",
          source_run_id: "$event.source_run_id",
          projection_version: "$projection.version",
          write_index: "$event.write_index"
        },
        on: { event: eventName },
        writes
      });
    }
  };

  for (const event of events) {
    const lowered = event.name.toLowerCase();
    if (lowered.includes("earned") && hasParams(event, ["user", "amount", "reason"])) {
      addPointProjection(event.name, "$event.amount", "$ctx.sender", "earn_points");
    } else if (lowered.includes("spent") && hasParams(event, ["user", "amount", "reason"])) {
      addPointProjection(event.name, "-$event.amount", "$ctx.sender", "spend_points");
    } else if (lowered.includes("adjusted") && hasParams(event, ["user", "delta", "reason"])) {
      addPointProjection(event.name, "$event.delta", "$event.admin", "admin_adjust_points");
    }
  }
  return projections;
}

function collectEventReferences(value, refs = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$event\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
      refs.add(match[1]);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectEventReferences(item, refs);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectEventReferences(item, refs);
  }
  return refs;
}

function validateProjectionEventReferences(projections, events) {
  const eventFields = new Map();
  for (const event of events) {
    const fields = new Set();
    for (const field of [...(event.params || []), ...(event.runtime_fields || [])]) {
      if (field.name) fields.add(field.name);
    }
    eventFields.set(event.name, fields);
  }

  for (const projection of projections) {
    const refs = collectEventReferences(projection);
    if (!refs.size) continue;
    const eventName = projection.on?.event;
    const declared = eventFields.get(eventName);
    if (!declared) {
      throw new Error(`Projection ${projection.name || "<unnamed>"} references $event.* without a known trigger event`);
    }
    for (const ref of refs) {
      if (!declared.has(ref)) {
        throw new Error(`Projection ${projection.name || "<unnamed>"} references undeclared $event.${ref}; add it to events[].params or events[].runtime_fields`);
      }
    }
  }
}

function compile(sourceText, options = {}) {
  const protocol = parseProtocol(sourceText);
  const normalizedTables = protocol.tables.map(normalizeTableSchema);

  const protocolJson = {
    p: "cardity",
    op: "deploy",
    protocol: protocol.name,
    version: protocol.version,
    cpl: {
      owner: protocol.owner,
      state: Object.fromEntries(protocol.state.map((item) => [item.name, { type: item.type, default: item.default || "" }])),
      tables: normalizedTables,
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
    const inputSchema = {
      type: "object",
      properties: Object.fromEntries(method.params.map((param) => [param.name, { type: jsonSchemaType(param.type) }])),
      required: method.params.map((param) => param.name)
    };
    const toolName = snake(`${protocol.name}_${method.name}`);
    const replayPolicy = mutates
      ? { mode: "idempotent_command", idempotency_key: "$run.id", on_replay: "return_prior_result" }
      : { mode: "read_only" };
    const tool = {
      name: toolName,
      description: `Invoke ${protocol.name}.${method.name}`,
      method: method.name,
      module: protocol.name,
      kind: mutates ? "command" : "query",
      intent_names: [method.name, toolName, title(method.name)],
      intent_examples: [`Invoke ${protocol.name}.${method.name}`],
      disambiguation_keys: method.params.map((param) => param.name),
      required_context: mutates ? ["ctx.sender"] : [],
      input_schema: inputSchema,
      output_schema: {
        type: "object",
        properties: { result: { type: jsonSchemaType(method.returns || "string") } },
        required: ["result"]
      },
      returns_read_model: null,
      permission: mutates ? method.name : null,
      confirm_required: mutates,
      dry_run_supported: mutates,
      readback_required: mutates,
      readback_query: mutates ? { strategy: "post_commit", route } : null,
      idempotency_key: mutates ? "$run.id" : null,
      risk_level: mutates ? "medium" : "low",
      side_effects: effects,
      audit_event: effects.emits[0] || null,
      replay_policy: replayPolicy
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
    runtime_fields: [
      {
        name: "id",
        type: "string",
        required: true,
        source: "runtime",
        description: "Stable event source id for projection idempotency"
      },
      {
        name: "write_index",
        type: "int",
        required: true,
        source: "runtime",
        description: "Deterministic write position within the committed event payload"
      },
      {
        name: "source_run_id",
        type: "string",
        required: true,
        source: "runtime",
        description: "Agent/run id that produced the event"
      },
      {
        name: "idempotency_key",
        type: "string",
        required: true,
        source: "runtime",
        description: "Runtime replay guard key for consumers that cannot use source_id directly"
      }
    ],
    stream: `cardity.${protocol.name}.${event.name}`
  }));

  const stateTable = {
    name: `${snake(protocol.name)}_state`,
    columns: protocol.state.map((item) => ({ name: item.name, type: item.type }))
  };
  const readModels = inferReadModels(normalizedTables);
  const queries = inferQueries(readModels);
  const projections = inferProjections(normalizedTables, events);
  validateProjectionEventReferences(projections, events);

  const manifest = {
    schema: "cardity.agent_manifest.v1",
    protocol: { name: protocol.name, version: protocol.version, owner: protocol.owner },
    source: { p: "cardity", op: "deploy" },
    state: protocol.state.map((item) => ({ name: item.name, type: item.type, storage: "persistent", ...(item.default !== undefined ? { default: item.default } : {}) })),
    tables: normalizedTables,
    events,
    methods: manifestMethods,
    permissions,
    system: {
      api: { routes },
      modules: [{
        name: protocol.name,
        kind: "protocol",
        intent_names: [protocol.name, snake(protocol.name), title(protocol.name)]
      }],
      database: { tables: [stateTable, ...normalizedTables], read_models: readModels, projections, queries },
      ui: { resources: [protocol.name], actions: tools },
      external: { navigation: [], services: [] },
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
      "Generated actions include generic action semantics, planner hints, safety fields, dry-run/readback flags, and replay policy.",
      "When events and tables imply business records, the manifest may include system.database.projections for event-to-table writes.",
      "External entries belong in system.external.navigation or system.external.services unless a concrete permissioned action contract exists.",
      "ERP read models should rely on upsert_snapshot projections, composite keys, tenant context, and confirmed readback when available.",
      "Read-only query methods should avoid writes and emits so they become GET/query tools.",
      "After drafting source, call cardity_compile and fix any compiler or agent-safety errors."
    ],
    table_syntax: "table balances {\n  user: address;\n  balance: int = 0;\n}"
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function itemNames(items) {
  return asArray(items).map((item) => item && item.name).filter(Boolean);
}

function protocolName(protocol) {
  if (typeof protocol === "string") return protocol;
  return protocol?.name || "Cardity Protocol";
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function same(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function summarizeManifest(manifest) {
  const system = manifest.system || {};
  const database = system.database || {};
  const ui = system.ui || {};
  const api = system.api || {};
  const actions = asArray(ui.actions);
  return {
    schema: "cardity.explain_result.v1",
    protocol: manifest.protocol || {},
    counts: {
      state: asArray(manifest.state).length,
      tables: asArray(database.tables).length,
      read_models: asArray(database.read_models).length,
      methods: asArray(manifest.methods).length,
      events: asArray(manifest.events).length,
      routes: asArray(api.routes).length,
      actions: actions.length,
      workflows: asArray(system.workflows).length,
      tools: asArray(manifest.agent?.tools).length
    },
    methods: asArray(manifest.methods).map((method) => ({
      name: method.name,
      route: method.route ? `${method.route.method} ${method.route.path}` : "-",
      returns: method.returns || "-",
      writes: asArray(method.effects?.writes),
      emits: asArray(method.effects?.emits)
    })),
    actions: actions.map((action) => ({
      name: action.name,
      kind: action.kind || "-",
      permission: action.permission || "-",
      confirm_required: Boolean(action.confirm_required),
      dry_run_supported: Boolean(action.dry_run_supported),
      readback_required: Boolean(action.readback_required),
      risk_level: action.risk_level || "-"
    })),
    database: {
      tables: itemNames(database.tables),
      read_models: itemNames(database.read_models),
      projections: itemNames(database.projections),
      queries: asArray(database.queries).map((query) => query.name || query.id).filter(Boolean)
    },
    permissions: asArray(manifest.permissions).map((permission) => ({
      action: permission.action,
      requires_confirmation: Boolean(permission.requires_confirmation),
      reason: permission.reason || ""
    })),
    events: asArray(manifest.events).map((event) => ({
      name: event.name,
      params: itemNames(event.params),
      runtime_fields: itemNames(event.runtime_fields),
      stream: event.stream || "-"
    }))
  };
}

function markdownTable(headers, rows) {
  const safeRows = asArray(rows);
  const header = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  if (!safeRows.length) return `${header}\n${separator}\n| ${headers.map(() => "-").join(" | ")} |`;
  return [header, separator, ...safeRows.map((row) => `| ${row.map((cell) => String(cell ?? "-").replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");
}

function renderExplainMarkdown(summary) {
  return [
    `# ${protocolName(summary.protocol)} Manifest`,
    "",
    markdownTable(["Field", "Value"], [
      ["Version", summary.protocol.version || "-"],
      ["Methods", summary.counts.methods],
      ["Events", summary.counts.events],
      ["Actions", summary.counts.actions],
      ["Tables", summary.counts.tables],
      ["Read Models", summary.counts.read_models],
      ["Projections", summary.database.projections.length]
    ]),
    "",
    "## Agent Actions",
    "",
    markdownTable(["Action", "Kind", "Risk", "Confirm", "Readback", "Permission"], summary.actions.map((action) => [
      action.name,
      action.kind,
      action.risk_level,
      action.confirm_required ? "yes" : "no",
      action.readback_required ? "yes" : "no",
      action.permission
    ]))
  ].join("\n") + "\n";
}

function hasWriteSideEffects(action) {
  const sideEffects = action.side_effects || {};
  return asArray(sideEffects.writes).length > 0 || asArray(sideEffects.emits).length > 0 || asArray(sideEffects.external).length > 0;
}

function reviewManifest(manifest) {
  const findings = [];
  const database = manifest.system?.database || {};
  const actions = asArray(manifest.system?.ui?.actions);
  const readModelsByName = new Set(itemNames(database.read_models));
  const tableNames = new Set(itemNames(database.tables));
  const eventsByName = new Map(asArray(manifest.events).map((event) => [event.name, event]));
  const add = (severity, code, location, message, recommendation) => findings.push({ severity, code, location, message, recommendation });

  for (const action of actions) {
    const location = `system.ui.actions.${action.name || "<unnamed>"}`;
    const writes = action.kind === "command" || hasWriteSideEffects(action);
    if (!action.kind) add("error", "ACTION_KIND_MISSING", location, "Action has no kind.", "Set action.kind.");
    if (writes) {
      if (!action.permission) add(action.dry_run_supported ? "warning" : "error", action.dry_run_supported ? "COMMAND_PLANNED_ONLY" : "COMMAND_PERMISSION_MISSING", location, "Write-like action has no concrete permission contract.", "Add permission before enabling production writes.");
      if (!action.confirm_required) add("error", "COMMAND_CONFIRMATION_MISSING", location, "Write-like action does not require confirmation.", "Set confirm_required=true.");
      if (!action.idempotency_key) add("error", "COMMAND_IDEMPOTENCY_MISSING", location, "Command has no idempotency key.", "Use a stable expression such as $run.id.");
      if (!action.replay_policy?.mode) add("error", "COMMAND_REPLAY_POLICY_MISSING", location, "Command has no replay policy.", "Add replay_policy.mode.");
      if (action.readback_required && !action.readback_query) add("error", "READBACK_QUERY_MISSING", location, "Action requires readback but has no query.", "Add readback_query.");
    }
  }

  for (const readModel of asArray(database.read_models)) {
    const location = `system.database.read_models.${readModel.name || "<unnamed>"}`;
    if (!asArray(readModel.primary_key).length) add("error", "READ_MODEL_PRIMARY_KEY_MISSING", location, "Read model has no primary key.", "Emit a primary_key.");
    if (!asArray(readModel.columns).length) add("warning", "READ_MODEL_COLUMNS_MISSING", location, "Read model has no columns.", "Emit column schema metadata.");
  }

  for (const query of asArray(database.queries)) {
    if (query.read_model && !readModelsByName.has(query.read_model)) {
      add("error", "QUERY_READ_MODEL_UNKNOWN", `system.database.queries.${query.name || "<unnamed>"}`, `Query references unknown read model ${query.read_model}.`, "Point to an emitted read model.");
    }
  }

  for (const projection of asArray(database.projections)) {
    const location = `system.database.projections.${projection.name || "<unnamed>"}`;
    if (!eventsByName.has(projection.on?.event)) add("error", "PROJECTION_EVENT_UNKNOWN", location, "Projection trigger event is missing or unknown.", "Set projection.on.event to an emitted event.");
    if (!projection.idempotency) add("error", "PROJECTION_IDEMPOTENCY_MISSING", location, "Projection has no idempotency metadata.", "Add replay guard metadata.");
    for (const write of asArray(projection.writes)) {
      if (write.table && !tableNames.has(write.table) && !readModelsByName.has(write.table)) add("warning", "PROJECTION_WRITE_TABLE_UNKNOWN", `${location}.writes.${write.table}`, `Projection writes to unknown table ${write.table}.`, "Emit target schema.");
      if (["upsert_delta", "upsert_snapshot", "delete", "soft_delete"].includes(write.operation) && !write.key) add("error", "PROJECTION_KEY_MISSING", `${location}.writes.${write.table || "<unknown>"}`, `${write.operation} projection write has no key.`, "Add replay-safe key.");
      if (write.operation === "delete") add("warning", "PROJECTION_HARD_DELETE", `${location}.writes.${write.table || "<unknown>"}`, "Projection performs a hard delete.", "Prefer soft_delete for business objects.");
    }
  }

  const summary = {
    total: findings.length,
    errors: findings.filter((item) => item.severity === "error").length,
    warnings: findings.filter((item) => item.severity === "warning").length,
    info: findings.filter((item) => item.severity === "info").length
  };
  return { schema: "cardity.security_review.v1", protocol: manifest.protocol || {}, ok: summary.errors === 0, summary, findings };
}

function renderReviewMarkdown(review) {
  if (!review.findings.length) return `# ${protocolName(review.protocol)} Security Review\n\nStatus: pass\n\nNo findings.\n`;
  return [
    `# ${protocolName(review.protocol)} Security Review`,
    "",
    `Status: ${review.ok ? "pass" : "fail"}`,
    "",
    markdownTable(["Severity", "Code", "Location", "Finding", "Recommendation"], review.findings.map((finding) => [
      finding.severity,
      finding.code,
      finding.location,
      finding.message,
      finding.recommendation
    ]))
  ].join("\n") + "\n";
}

function mapBy(items, keyFn) {
  return new Map(asArray(items).map((item) => [keyFn(item), item]).filter(([key]) => key));
}

function compareCollections(changes, oldItems, newItems, options) {
  const keyFn = options.key || ((item) => item?.name);
  const oldMap = mapBy(oldItems, keyFn);
  const newMap = mapBy(newItems, keyFn);
  for (const [name, oldItem] of oldMap) {
    if (!newMap.has(name)) changes.push({ severity: options.removedSeverity || "breaking", code: options.removedCode, location: `${options.location}.${name}`, message: `${options.label} ${name} was removed.`, advice: `Keep ${options.label.toLowerCase()} ${name}, or publish a breaking migration note.`, before: oldItem, after: null });
  }
  for (const [name, newItem] of newMap) {
    if (!oldMap.has(name)) {
      changes.push({ severity: options.addedSeverity || "info", code: options.addedCode, location: `${options.location}.${name}`, message: `${options.label} ${name} was added.`, advice: "Ensure downstream runtimes can consume the new contract entry.", before: null, after: newItem });
    } else if (!same(options.shape(oldMap.get(name)), options.shape(newItem))) {
      changes.push({ severity: options.changedSeverity || "warning", code: options.changedCode, location: `${options.location}.${name}`, message: `${options.label} ${name} changed.`, advice: options.changedAdvice || "Review compatibility before deploying.", before: options.shape(oldMap.get(name)), after: options.shape(newItem) });
    }
  }
}

function diffManifest(oldManifest, newManifest) {
  const changes = [];
  const oldDb = oldManifest.system?.database || {};
  const newDb = newManifest.system?.database || {};
  const oldUi = oldManifest.system?.ui || {};
  const newUi = newManifest.system?.ui || {};
  const oldName = protocolName(oldManifest.protocol);
  const newName = protocolName(newManifest.protocol);
  if (oldName !== newName) changes.push({ severity: "breaking", code: "PROTOCOL_NAME_CHANGED", location: "protocol.name", message: `Protocol name changed from ${oldName} to ${newName}.`, advice: "Treat protocol renames as a new protocol unless every runtime has a migration.", before: oldName, after: newName });
  compareCollections(changes, oldManifest.methods, newManifest.methods, { label: "Method", location: "methods", removedCode: "METHOD_REMOVED", addedCode: "METHOD_ADDED", changedCode: "METHOD_SIGNATURE_CHANGED", changedSeverity: "breaking", shape: (method) => ({ params: method.params, returns: method.returns, route: method.route, effects: method.effects }) });
  compareCollections(changes, oldManifest.events, newManifest.events, { label: "Event", location: "events", removedCode: "EVENT_REMOVED", addedCode: "EVENT_ADDED", changedCode: "EVENT_SCHEMA_CHANGED", changedSeverity: "breaking", shape: (event) => ({ params: event.params, runtime_fields: event.runtime_fields, stream: event.stream }) });
  compareCollections(changes, oldUi.actions, newUi.actions, { label: "Action", location: "system.ui.actions", removedCode: "ACTION_REMOVED", addedCode: "ACTION_ADDED", changedCode: "ACTION_CONTRACT_CHANGED", changedSeverity: "breaking", shape: (action) => ({ kind: action.kind, permission: action.permission, confirm_required: action.confirm_required, readback_required: action.readback_required, idempotency_key: action.idempotency_key, risk_level: action.risk_level }) });
  compareCollections(changes, oldManifest.permissions, newManifest.permissions, { label: "Permission", location: "permissions", key: (permission) => permission?.action, removedCode: "PERMISSION_REMOVED", addedCode: "PERMISSION_ADDED", changedCode: "PERMISSION_CHANGED", changedSeverity: "breaking", shape: (permission) => ({ action: permission.action, requires_confirmation: permission.requires_confirmation }) });
  compareCollections(changes, oldDb.tables, newDb.tables, { label: "Table", location: "system.database.tables", removedCode: "TABLE_REMOVED", addedCode: "TABLE_ADDED", changedCode: "TABLE_SCHEMA_CHANGED", changedSeverity: "breaking", shape: (table) => ({ columns: table.columns, primary_key: table.primary_key, indexes: table.indexes }) });
  compareCollections(changes, oldDb.read_models, newDb.read_models, { label: "Read model", location: "system.database.read_models", removedCode: "READ_MODEL_REMOVED", addedCode: "READ_MODEL_ADDED", changedCode: "READ_MODEL_SCHEMA_CHANGED", changedSeverity: "breaking", shape: (model) => ({ columns: model.columns, primary_key: model.primary_key, query_contracts: model.query_contracts }) });
  compareCollections(changes, oldDb.projections, newDb.projections, { label: "Projection", location: "system.database.projections", removedCode: "PROJECTION_REMOVED", addedCode: "PROJECTION_ADDED", changedCode: "PROJECTION_CHANGED", changedSeverity: "warning", shape: (projection) => ({ version: projection.version, source: projection.source, on: projection.on, idempotency: projection.idempotency, writes: projection.writes }) });
  compareCollections(changes, oldDb.queries, newDb.queries, { label: "Query", location: "system.database.queries", removedCode: "QUERY_REMOVED", addedCode: "QUERY_ADDED", changedCode: "QUERY_CHANGED", changedSeverity: "breaking", shape: (query) => ({ read_model: query.read_model, operation: query.operation, filters: query.filters }) });
  const summary = { total: changes.length, breaking: changes.filter((item) => item.severity === "breaking").length, warnings: changes.filter((item) => item.severity === "warning").length, info: changes.filter((item) => item.severity === "info").length };
  return { schema: "cardity.protocol_diff.v1", old_protocol: oldManifest.protocol || {}, new_protocol: newManifest.protocol || {}, compatible: summary.breaking === 0, summary, changes };
}

function renderDiffMarkdown(diff) {
  if (!diff.changes.length) return `# ${protocolName(diff.old_protocol)} Diff\n\nCompatibility: compatible\n\nNo contract changes.\n`;
  return [
    `# ${protocolName(diff.old_protocol)} Diff`,
    "",
    `Compatibility: ${diff.compatible ? "compatible" : "breaking changes detected"}`,
    "",
    markdownTable(["Severity", "Code", "Location", "Change", "Advice"], diff.changes.map((change) => [change.severity, change.code, change.location, change.message, change.advice]))
  ].join("\n") + "\n";
}

function manifestFromInput(input, prefix = "") {
  const manifest = input[`${prefix}manifest`] || (!prefix ? input.manifest : undefined);
  if (manifest) return manifest.manifest || manifest;
  const sourceText = input[`${prefix}source_text`] || (!prefix ? input.source_text : undefined);
  if (!sourceText) throw new Error(`Missing ${prefix}source_text or ${prefix}manifest`);
  return compile(sourceText, { include_abi: false, include_manifest: true, include_protocol: false, carc: false }).manifest;
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
      },
      {
        name: "cardity_manifest",
        description: "Generate only the Agent OS manifest from Cardity source text.",
        inputSchema: { type: "object", properties: { source_text: { type: "string" } }, required: ["source_text"] }
      },
      {
        name: "cardity_explain_manifest",
        description: "Explain Cardity source text or an Agent OS manifest.",
        inputSchema: { type: "object", properties: { source_text: { type: "string" }, manifest: { type: "object" }, format: { enum: ["markdown", "json"], default: "markdown" } }, required: [] }
      },
      {
        name: "cardity_review_security",
        description: "Review Cardity source text or an Agent OS manifest for action/projection safety.",
        inputSchema: { type: "object", properties: { source_text: { type: "string" }, manifest: { type: "object" }, format: { enum: ["markdown", "json"], default: "markdown" } }, required: [] }
      },
      {
        name: "cardity_diff",
        description: "Compare two Cardity source texts or Agent OS manifests for breaking contract changes.",
        inputSchema: { type: "object", properties: { old_source_text: { type: "string" }, new_source_text: { type: "string" }, old_manifest: { type: "object" }, new_manifest: { type: "object" }, format: { enum: ["markdown", "json"], default: "markdown" } }, required: [] }
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
    if (params.name === "cardity_manifest") {
      const payload = compile(args.source_text || "", { include_abi: false, include_manifest: true, include_protocol: false, carc: false });
      return { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify({ schema: "cardity.agent_manifest_result.v1", ok: true, protocol: payload.protocol, manifest: payload.manifest }, null, 2) }] } };
    }
    if (params.name === "cardity_explain_manifest") {
      const summary = summarizeManifest(manifestFromInput(args));
      const output = args.format === "json" ? summary : renderExplainMarkdown(summary);
      return { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify({ schema: "cardity.explain_tool_result.v1", ok: true, format: args.format || "markdown", summary, output }, null, 2) }] } };
    }
    if (params.name === "cardity_review_security") {
      const review = reviewManifest(manifestFromInput(args));
      const output = args.format === "json" ? review : renderReviewMarkdown(review);
      return { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify({ schema: "cardity.security_review_tool_result.v1", ok: review.ok, format: args.format || "markdown", review, output }, null, 2) }] } };
    }
    if (params.name === "cardity_diff") {
      const diff = diffManifest(manifestFromInput(args, "old_"), manifestFromInput(args, "new_"));
      const output = args.format === "json" ? diff : renderDiffMarkdown(diff);
      return { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify({ schema: "cardity.protocol_diff_tool_result.v1", ok: diff.compatible, format: args.format || "markdown", diff, output }, null, 2) }] } };
    }
    return { jsonrpc: "2.0", id: body.id, error: { code: -32602, message: `Unknown tool: ${params.name}` } };
  }
  return { jsonrpc: "2.0", id: body.id || null, error: { code: -32601, message: `Method not found: ${body.method}` } };
}

async function edgeApi(request) {
  const url = new URL(request.url);
  const body = await readBody(request);
  if (url.pathname === "/mcp") return json(await handleMcp(body));
  if (!body.source_text && !body.manifest && !body.old_source_text && !body.old_manifest && url.pathname !== "/v1/generation-guide") return null;
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
  if (url.pathname === "/v1/explain") {
    const summary = summarizeManifest(manifestFromInput(body));
    return json({ schema: "cardity.explain_tool_result.v1", ok: true, summary, output: body.format === "json" ? summary : renderExplainMarkdown(summary) });
  }
  if (url.pathname === "/v1/review") {
    const review = reviewManifest(manifestFromInput(body));
    return json({ schema: "cardity.security_review_tool_result.v1", ok: review.ok, review, output: body.format === "json" ? review : renderReviewMarkdown(review) });
  }
  if (url.pathname === "/v1/diff") {
    const diff = diffManifest(manifestFromInput(body, "old_"), manifestFromInput(body, "new_"));
    return json({ schema: "cardity.protocol_diff_tool_result.v1", ok: diff.compatible, diff, output: body.format === "json" ? diff : renderDiffMarkdown(diff) });
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
