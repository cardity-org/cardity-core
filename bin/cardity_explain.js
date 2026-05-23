const EXPLAIN_SCHEMA = 'cardity.explain_result.v1';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function names(items) {
  return asArray(items).map((item) => item && item.name).filter(Boolean);
}

function bulletList(items, emptyText = 'None') {
  const values = asArray(items).filter((item) => item !== undefined && item !== null && item !== '');
  if (values.length === 0) return `- ${emptyText}`;
  return values.map((item) => `- ${item}`).join('\n');
}

function table(headers, rows) {
  const safeRows = asArray(rows);
  const header = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  if (safeRows.length === 0) return `${header}\n${separator}\n| ${headers.map(() => '-').join(' | ')} |`;
  return [header, separator, ...safeRows.map((row) => `| ${row.map((cell) => String(cell ?? '-').replace(/\|/g, '\\|')).join(' | ')} |`)].join('\n');
}

function schemaFields(schema) {
  const properties = schema && schema.properties && typeof schema.properties === 'object'
    ? Object.keys(schema.properties)
    : [];
  const required = new Set(asArray(schema && schema.required));
  return properties.map((name) => `${name}${required.has(name) ? '*' : ''}`);
}

function summarizeManifest(manifest) {
  const system = manifest.system || {};
  const database = system.database || {};
  const ui = system.ui || {};
  const api = system.api || {};
  const external = system.external || {};
  const actions = asArray(ui.actions);

  return {
    schema: EXPLAIN_SCHEMA,
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
      tools: asArray(manifest.agent && manifest.agent.tools).length
    },
    methods: asArray(manifest.methods).map((method) => ({
      name: method.name,
      route: method.route ? `${method.route.method} ${method.route.path}` : '-',
      returns: method.returns || '-',
      reads: asArray(method.effects && method.effects.reads),
      writes: asArray(method.effects && method.effects.writes),
      emits: asArray(method.effects && method.effects.emits)
    })),
    actions: actions.map((action) => ({
      name: action.name,
      kind: action.kind || '-',
      permission: action.permission || '-',
      confirm_required: Boolean(action.confirm_required),
      dry_run_supported: Boolean(action.dry_run_supported),
      readback_required: Boolean(action.readback_required),
      risk_level: action.risk_level || '-',
      input_fields: schemaFields(action.input_schema),
      output_fields: schemaFields(action.output_schema)
    })),
    database: {
      tables: names(database.tables),
      read_models: names(database.read_models),
      projections: names(database.projections),
      queries: asArray(database.queries).map((query) => query.name || query.id).filter(Boolean)
    },
    permissions: asArray(manifest.permissions).map((permission) => ({
      action: permission.action,
      requires_confirmation: Boolean(permission.requires_confirmation),
      reason: permission.reason || ''
    })),
    events: asArray(manifest.events).map((event) => ({
      name: event.name,
      params: names(event.params),
      runtime_fields: names(event.runtime_fields),
      stream: event.stream || '-'
    })),
    external: {
      navigation: names(external.navigation),
      services: names(external.services)
    }
  };
}

function renderMermaid(summary) {
  const protocolName = summary.protocol.name || 'Protocol';
  const lines = [
    '```mermaid',
    'graph LR',
    `  P["${protocolName} Protocol"] --> API["API Routes (${summary.counts.routes})"]`,
    `  P --> DB["Database Tables (${summary.counts.tables})"]`,
    `  P --> ACT["Agent Actions (${summary.counts.actions})"]`,
    `  P --> EVT["Events (${summary.counts.events})"]`,
    `  ACT --> PERM["Permissions (${summary.permissions.length})"]`,
    `  EVT --> WF["Workflows (${summary.counts.workflows})"]`
  ];

  if (summary.database.read_models.length > 0) {
    lines.push(`  DB --> RM["Read Models (${summary.database.read_models.length})"]`);
  }
  if (summary.database.projections.length > 0) {
    lines.push(`  EVT --> PROJ["Projections (${summary.database.projections.length})"]`);
  }
  lines.push('```');
  return lines.join('\n');
}

function renderExplainMarkdown(summary, options = {}) {
  const protocol = summary.protocol || {};
  const sections = [
    `# ${protocol.name || 'Cardity Protocol'} Manifest`,
    '',
    table(
      ['Field', 'Value'],
      [
        ['Version', protocol.version || '-'],
        ['Owner', protocol.owner || '-'],
        ['State Fields', summary.counts.state],
        ['Methods', summary.counts.methods],
        ['Events', summary.counts.events],
        ['Actions', summary.counts.actions],
        ['Tables', summary.counts.tables],
        ['Read Models', summary.counts.read_models],
        ['Projections', summary.database.projections.length]
      ]
    ),
    '',
    '## Methods',
    '',
    table(
      ['Method', 'Route', 'Returns', 'Writes', 'Emits'],
      summary.methods.map((method) => [
        method.name,
        method.route,
        method.returns,
        method.writes.join(', ') || '-',
        method.emits.join(', ') || '-'
      ])
    ),
    '',
    '## Agent Actions',
    '',
    table(
      ['Action', 'Kind', 'Risk', 'Confirm', 'Dry Run', 'Readback', 'Permission'],
      summary.actions.map((action) => [
        action.name,
        action.kind,
        action.risk_level,
        action.confirm_required ? 'yes' : 'no',
        action.dry_run_supported ? 'yes' : 'no',
        action.readback_required ? 'yes' : 'no',
        action.permission
      ])
    ),
    '',
    '## Database Contract',
    '',
    '**Tables**',
    bulletList(summary.database.tables),
    '',
    '**Read Models**',
    bulletList(summary.database.read_models),
    '',
    '**Queries**',
    bulletList(summary.database.queries),
    '',
    '**Projections**',
    bulletList(summary.database.projections),
    '',
    '## Permissions',
    '',
    table(
      ['Action', 'Confirmation', 'Reason'],
      summary.permissions.map((permission) => [
        permission.action,
        permission.requires_confirmation ? 'required' : 'not required',
        permission.reason || '-'
      ])
    ),
    '',
    '## Events',
    '',
    table(
      ['Event', 'Params', 'Runtime Fields', 'Stream'],
      summary.events.map((event) => [
        event.name,
        event.params.join(', ') || '-',
        event.runtime_fields.join(', ') || '-',
        event.stream
      ])
    )
  ];

  if (options.diagram) {
    sections.push('', '## Contract Graph', '', renderMermaid(summary));
  }

  return `${sections.join('\n')}\n`;
}

module.exports = {
  EXPLAIN_SCHEMA,
  summarizeManifest,
  renderExplainMarkdown
};
