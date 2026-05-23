const VISUALIZER_SCHEMA = 'cardity.manifest_visualization.v1';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function names(items) {
  return asArray(items).map((item) => item && item.name).filter(Boolean);
}

function protocolName(protocol) {
  if (typeof protocol === 'string') return protocol;
  return (protocol && protocol.name) || 'Cardity Protocol';
}

function escapeLabel(value) {
  return String(value ?? '-').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function nodeId(prefix, value) {
  return `${prefix}_${String(value || 'item').replace(/[^A-Za-z0-9_]/g, '_')}`;
}

function graphNode(id, label, kind, meta = {}) {
  return { id, label, kind, meta };
}

function edge(from, to, label = '') {
  return { from, to, label };
}

function buildVisualization(manifest) {
  const system = manifest.system || {};
  const database = system.database || {};
  const ui = system.ui || {};
  const api = system.api || {};
  const agent = manifest.agent || {};
  const protocol = protocolName(manifest.protocol);

  const nodes = [
    graphNode('business', 'Business Protocol Layer', 'layer'),
    graphNode('system', 'System Generation Layer', 'layer'),
    graphNode('agent', 'Agent Execution Layer', 'layer'),
    graphNode('protocol', `${protocol} Protocol`, 'protocol', manifest.protocol || {})
  ];
  const edges = [
    edge('business', 'system', 'compiled into'),
    edge('system', 'agent', 'consumed by'),
    edge('business', 'protocol', '')
  ];

  for (const method of asArray(manifest.methods)) {
    const id = nodeId('method', method.name);
    nodes.push(graphNode(id, method.name, 'method', {
      route: method.route || null,
      returns: method.returns || null,
      writes: asArray(method.effects && method.effects.writes),
      emits: asArray(method.effects && method.effects.emits)
    }));
    edges.push(edge('protocol', id, 'method'));
  }

  for (const event of asArray(manifest.events)) {
    const id = nodeId('event', event.name);
    nodes.push(graphNode(id, event.name, 'event', {
      params: names(event.params),
      runtime_fields: names(event.runtime_fields)
    }));
    edges.push(edge('protocol', id, 'event'));
  }

  for (const table of asArray(database.tables)) {
    const id = nodeId('table', table.name);
    nodes.push(graphNode(id, table.name, 'table', {
      columns: names(table.columns),
      primary_key: asArray(table.primary_key)
    }));
    edges.push(edge('system', id, 'database'));
  }

  for (const readModel of asArray(database.read_models)) {
    const id = nodeId('read_model', readModel.name);
    nodes.push(graphNode(id, readModel.name, 'read_model', {
      columns: names(readModel.columns),
      primary_key: asArray(readModel.primary_key),
      query_contracts: asArray(readModel.query_contracts)
    }));
    edges.push(edge('system', id, 'read model'));
  }

  for (const route of asArray(api.routes)) {
    const id = nodeId('route', `${route.method || 'ROUTE'}_${route.path || ''}`);
    nodes.push(graphNode(id, `${route.method || 'ROUTE'} ${route.path || '-'}`, 'api_route'));
    edges.push(edge('system', id, 'api'));
  }

  for (const projection of asArray(database.projections)) {
    const id = nodeId('projection', projection.name);
    nodes.push(graphNode(id, projection.name, 'projection', {
      version: projection.version || null,
      source: projection.source || null,
      idempotency: projection.idempotency || null
    }));
    edges.push(edge('system', id, 'projection'));
    if (projection.on && projection.on.event) edges.push(edge(nodeId('event', projection.on.event), id, 'triggers'));
  }

  for (const workflow of asArray(system.workflows)) {
    const id = nodeId('workflow', workflow.name);
    nodes.push(graphNode(id, workflow.name, 'workflow', workflow.trigger || {}));
    edges.push(edge('system', id, 'workflow'));
    if (workflow.trigger && workflow.trigger.event) edges.push(edge(nodeId('event', workflow.trigger.event), id, 'starts'));
  }

  for (const action of asArray(ui.actions)) {
    const id = nodeId('action', action.name);
    nodes.push(graphNode(id, action.name, 'action', {
      kind: action.kind || null,
      risk_level: action.risk_level || null,
      confirm_required: Boolean(action.confirm_required),
      dry_run_supported: Boolean(action.dry_run_supported),
      readback_required: Boolean(action.readback_required),
      permission: action.permission || null
    }));
    edges.push(edge('agent', id, 'action'));
    if (action.method) edges.push(edge(nodeId('method', action.method), id, 'exposed as'));
  }

  for (const tool of asArray(agent.tools)) {
    const id = nodeId('tool', tool.name);
    nodes.push(graphNode(id, tool.name, 'tool', {
      kind: tool.kind || null,
      method: tool.method || null
    }));
    edges.push(edge('agent', id, 'tool'));
    if (tool.method) edges.push(edge(nodeId('method', tool.method), id, 'registered as'));
  }

  for (const permission of asArray(manifest.permissions)) {
    const id = nodeId('permission', permission.action);
    const matchingActions = asArray(ui.actions)
      .filter((action) => action.permission === permission.action || action.method === permission.action);
    nodes.push(graphNode(id, permission.action, 'permission', {
      requires_confirmation: Boolean(permission.requires_confirmation),
      reason: permission.reason || ''
    }));
    edges.push(edge('agent', id, 'permission'));
    for (const action of matchingActions) edges.push(edge(nodeId('action', action.name), id, 'requires'));
  }

  return {
    schema: VISUALIZER_SCHEMA,
    protocol: manifest.protocol || {},
    summary: {
      nodes: nodes.length,
      edges: edges.length,
      methods: asArray(manifest.methods).length,
      events: asArray(manifest.events).length,
      tables: asArray(database.tables).length,
      read_models: asArray(database.read_models).length,
      actions: asArray(ui.actions).length,
      tools: asArray(agent.tools).length
    },
    layers: {
      business: ['protocol', ...asArray(manifest.methods).map((item) => nodeId('method', item.name)), ...asArray(manifest.events).map((item) => nodeId('event', item.name))],
      system: [
        ...asArray(database.tables).map((item) => nodeId('table', item.name)),
        ...asArray(database.read_models).map((item) => nodeId('read_model', item.name)),
        ...asArray(api.routes).map((item) => nodeId('route', `${item.method || 'ROUTE'}_${item.path || ''}`)),
        ...asArray(database.projections).map((item) => nodeId('projection', item.name)),
        ...asArray(system.workflows).map((item) => nodeId('workflow', item.name))
      ],
      agent: [
        ...asArray(ui.actions).map((item) => nodeId('action', item.name)),
        ...asArray(agent.tools).map((item) => nodeId('tool', item.name)),
        ...asArray(manifest.permissions).map((item) => nodeId('permission', item.action))
      ]
    },
    nodes,
    edges
  };
}

function renderMermaid(visualization) {
  const lines = [
    '```mermaid',
    'graph LR',
    '  subgraph B["Business Protocol Layer"]',
    '    business["Business Contract"]',
    '    protocol["' + escapeLabel((visualization.protocol && visualization.protocol.name) || 'Protocol') + '"]'
  ];

  for (const id of visualization.layers.business.filter((item) => item !== 'protocol')) {
    const node = visualization.nodes.find((item) => item.id === id);
    if (node) lines.push(`    ${node.id}["${escapeLabel(node.label)}"]`);
  }

  lines.push('  end', '  subgraph S["System Generation Layer"]', '    system["Generated System Contract"]');
  for (const id of visualization.layers.system) {
    const node = visualization.nodes.find((item) => item.id === id);
    if (node) lines.push(`    ${node.id}["${escapeLabel(node.label)}"]`);
  }

  lines.push('  end', '  subgraph A["Agent Execution Layer"]', '    agent["Agent Runtime Contract"]');
  for (const id of visualization.layers.agent) {
    const node = visualization.nodes.find((item) => item.id === id);
    if (node) lines.push(`    ${node.id}["${escapeLabel(node.label)}"]`);
  }
  lines.push('  end');

  for (const item of visualization.edges) {
    const label = item.label ? `|${escapeLabel(item.label)}|` : '';
    lines.push(`  ${item.from} -->${label} ${item.to}`);
  }

  lines.push('```');
  return lines.join('\n');
}

function renderVisualizationMarkdown(visualization) {
  return [
    `# ${protocolName(visualization.protocol)} Manifest Visualizer`,
    '',
    '| Metric | Count |',
    '| --- | --- |',
    `| nodes | ${visualization.summary.nodes} |`,
    `| edges | ${visualization.summary.edges} |`,
    `| methods | ${visualization.summary.methods} |`,
    `| events | ${visualization.summary.events} |`,
    `| tables | ${visualization.summary.tables} |`,
    `| read models | ${visualization.summary.read_models} |`,
    `| actions | ${visualization.summary.actions} |`,
    `| tools | ${visualization.summary.tools} |`,
    '',
    '## Contract Graph',
    '',
    renderMermaid(visualization)
  ].join('\n') + '\n';
}

module.exports = {
  VISUALIZER_SCHEMA,
  buildVisualization,
  renderMermaid,
  renderVisualizationMarkdown
};
