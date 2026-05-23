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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function layerTitle(layer) {
  if (layer === 'business') return 'Business Protocol Layer';
  if (layer === 'system') return 'System Generation Layer';
  if (layer === 'agent') return 'Agent Execution Layer';
  return layer;
}

function kindLabel(kind) {
  return String(kind || 'item').replace(/_/g, ' ');
}

function renderMeta(meta) {
  const entries = Object.entries(meta || {}).filter(([, value]) => (
    value !== null
    && value !== undefined
    && !(Array.isArray(value) && value.length === 0)
  ));
  if (entries.length === 0) return '<p class="muted">No extra metadata.</p>';
  return entries.map(([key, value]) => {
    const rendered = typeof value === 'object'
      ? `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`
      : `<code>${escapeHtml(value)}</code>`;
    return `<div class="meta-row"><strong>${escapeHtml(kindLabel(key))}</strong>${rendered}</div>`;
  }).join('');
}

function renderNodeCard(node) {
  return `<article class="node-card kind-${escapeHtml(node.kind)}" id="${escapeHtml(node.id)}">
    <div class="node-kind">${escapeHtml(kindLabel(node.kind))}</div>
    <h3>${escapeHtml(node.label)}</h3>
    ${renderMeta(node.meta)}
  </article>`;
}

function renderVisualizationHtml(visualization) {
  const title = `${protocolName(visualization.protocol)} Manifest Visualizer`;
  const nodeById = new Map(visualization.nodes.map((node) => [node.id, node]));
  const metrics = Object.entries(visualization.summary)
    .map(([key, value]) => `<div class="metric"><span>${escapeHtml(kindLabel(key))}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join('');
  const layers = Object.entries(visualization.layers)
    .map(([layer, ids]) => {
      const cards = ids
        .map((id) => nodeById.get(id))
        .filter(Boolean)
        .map(renderNodeCard)
        .join('');
      return `<section class="layer layer-${escapeHtml(layer)}">
        <div class="layer-header">
          <p>${escapeHtml(layer)}</p>
          <h2>${escapeHtml(layerTitle(layer))}</h2>
        </div>
        <div class="node-grid">${cards}</div>
      </section>`;
    })
    .join('');
  const edges = visualization.edges
    .map((item) => `<li><code>${escapeHtml(item.from)}</code> <span>${escapeHtml(item.label || 'links')}</span> <code>${escapeHtml(item.to)}</code></li>`)
    .join('');
  const mermaid = renderMermaid(visualization).replace(/^```mermaid\n/, '').replace(/\n```$/, '');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #070b13;
      --panel: #0f172a;
      --panel-soft: #111827;
      --line: #263244;
      --text: #f8fafc;
      --muted: #94a3b8;
      --blue: #38bdf8;
      --green: #34d399;
      --amber: #f59e0b;
      --red: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    main { max-width: 1440px; margin: 0 auto; padding: 32px; }
    header { display: grid; gap: 18px; margin-bottom: 28px; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: clamp(32px, 5vw, 56px); line-height: 1; letter-spacing: 0; }
    header p { color: var(--muted); max-width: 820px; font-size: 17px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
    .metric { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 14px; }
    .metric span { display: block; color: var(--muted); font-size: 12px; text-transform: uppercase; }
    .metric strong { display: block; font-size: 28px; margin-top: 4px; }
    .layers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
    .layer { border: 1px solid var(--line); background: rgba(15, 23, 42, 0.8); border-radius: 8px; overflow: hidden; }
    .layer-header { padding: 18px; border-bottom: 1px solid var(--line); background: var(--panel-soft); }
    .layer-header p { color: var(--blue); font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; }
    .layer-header h2 { font-size: 20px; margin-top: 4px; }
    .node-grid { display: grid; gap: 10px; padding: 14px; }
    .node-card { border: 1px solid var(--line); border-left: 4px solid var(--blue); border-radius: 8px; padding: 12px; background: #0b1220; min-width: 0; }
    .kind-event, .kind-workflow { border-left-color: var(--amber); }
    .kind-action, .kind-tool, .kind-permission { border-left-color: var(--green); }
    .kind-projection { border-left-color: var(--red); }
    .node-kind { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; }
    .node-card h3 { font-size: 15px; margin-top: 3px; overflow-wrap: anywhere; }
    .meta-row { margin-top: 10px; color: var(--muted); font-size: 12px; }
    .meta-row strong { display: block; color: #cbd5e1; margin-bottom: 4px; }
    code, pre { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
    code { background: #111827; color: #dbeafe; border: 1px solid var(--line); border-radius: 6px; padding: 2px 5px; overflow-wrap: anywhere; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #050816; border: 1px solid var(--line); border-radius: 8px; padding: 10px; color: #dbeafe; margin: 0; }
    .edges { margin-top: 18px; border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 18px; }
    .edges h2 { font-size: 20px; margin-bottom: 12px; }
    .edges ul { columns: 2; column-gap: 24px; padding-left: 18px; margin: 0; }
    .edges li { break-inside: avoid; margin: 0 0 8px; color: var(--muted); }
    .edges span { color: var(--green); }
    .mermaid-source { margin-top: 18px; }
    .muted { color: var(--muted); }
    @media (max-width: 980px) {
      main { padding: 20px; }
      .layers { grid-template-columns: 1fr; }
      .edges ul { columns: 1; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <p>Cardity Manifest Visualizer</p>
      <h1>${escapeHtml(title)}</h1>
      <p>A static, shareable view of the business protocol layer, generated system contract, and Agent runtime contract.</p>
      <div class="metrics">${metrics}</div>
    </header>
    <div class="layers">${layers}</div>
    <section class="edges">
      <h2>Contract Edges</h2>
      <ul>${edges}</ul>
    </section>
    <section class="edges mermaid-source">
      <h2>Mermaid Source</h2>
      <pre>${escapeHtml(mermaid)}</pre>
    </section>
  </main>
</body>
</html>
`;
}

module.exports = {
  VISUALIZER_SCHEMA,
  buildVisualization,
  renderMermaid,
  renderVisualizationMarkdown,
  renderVisualizationHtml
};
