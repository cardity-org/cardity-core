const DIFF_SCHEMA = 'cardity.protocol_diff.v1';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function protocolName(protocol) {
  if (typeof protocol === 'string') return protocol;
  return (protocol && protocol.name) || 'Cardity Protocol';
}

function byKey(items, keyFn) {
  return new Map(asArray(items).map((item) => [keyFn(item), item]).filter(([key]) => key));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function same(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function inputRequired(action) {
  return asArray(action && action.input_schema && action.input_schema.required).slice().sort();
}

function actionShape(action) {
  return {
    kind: action && action.kind,
    permission: action && action.permission,
    confirm_required: action && action.confirm_required,
    dry_run_supported: action && action.dry_run_supported,
    readback_required: action && action.readback_required,
    idempotency_key: action && action.idempotency_key,
    risk_level: action && action.risk_level,
    required: inputRequired(action)
  };
}

function routeKey(route) {
  if (!route) return '';
  return `${route.method || ''} ${route.path || ''}`.trim();
}

function projectionShape(projection) {
  return {
    version: projection && projection.version,
    source: projection && projection.source,
    on: projection && projection.on,
    idempotency: projection && projection.idempotency,
    writes: asArray(projection && projection.writes).map((write) => ({
      table: write.table,
      operation: write.operation,
      key: write.key
    }))
  };
}

function readModelShape(readModel) {
  return {
    primary_key: readModel && readModel.primary_key,
    columns: readModel && readModel.columns,
    query_contracts: readModel && readModel.query_contracts
  };
}

function compareNamedCollections(changes, oldItems, newItems, options) {
  const itemKey = options.key || ((item) => item && item.name);
  const oldMap = byKey(oldItems, itemKey);
  const newMap = byKey(newItems, itemKey);

  for (const [name, oldItem] of oldMap) {
    if (!newMap.has(name)) {
      changes.push({
        severity: options.removedSeverity || 'breaking',
        code: options.removedCode,
        location: `${options.location}.${name}`,
        message: `${options.label} ${name} was removed.`,
        advice: options.removedAdvice || `Keep ${options.label.toLowerCase()} ${name}, or publish a breaking migration note.`,
        before: oldItem,
        after: null
      });
    }
  }

  for (const [name, newItem] of newMap) {
    if (!oldMap.has(name)) {
      changes.push({
        severity: options.addedSeverity || 'info',
        code: options.addedCode,
        location: `${options.location}.${name}`,
        message: `${options.label} ${name} was added.`,
        advice: options.addedAdvice || 'Ensure downstream runtimes can consume the new contract entry.',
        before: null,
        after: newItem
      });
      continue;
    }

    const oldShape = options.shape(oldMap.get(name));
    const newShape = options.shape(newItem);
    if (!same(oldShape, newShape)) {
      changes.push({
        severity: options.changedSeverity || 'warning',
        code: options.changedCode,
        location: `${options.location}.${name}`,
        message: `${options.label} ${name} changed.`,
        advice: options.changedAdvice || 'Review compatibility with generated runtimes before deploying.',
        before: oldShape,
        after: newShape
      });
    }
  }
}

function diffManifest(oldManifest, newManifest) {
  const changes = [];
  const oldSystem = oldManifest.system || {};
  const newSystem = newManifest.system || {};
  const oldDatabase = oldSystem.database || {};
  const newDatabase = newSystem.database || {};
  const oldUi = oldSystem.ui || {};
  const newUi = newSystem.ui || {};
  const oldApi = oldSystem.api || {};
  const newApi = newSystem.api || {};

  const oldProtocolName = protocolName(oldManifest.protocol);
  const newProtocolName = protocolName(newManifest.protocol);
  if (oldProtocolName !== newProtocolName) {
    changes.push({
      severity: 'breaking',
      code: 'PROTOCOL_NAME_CHANGED',
      location: 'protocol.name',
      message: `Protocol name changed from ${oldProtocolName} to ${newProtocolName}.`,
      advice: 'Treat protocol renames as a new protocol unless every runtime has an explicit migration.',
      before: oldProtocolName,
      after: newProtocolName
    });
  }

  compareNamedCollections(changes, oldManifest.methods, newManifest.methods, {
    label: 'Method',
    location: 'methods',
    removedCode: 'METHOD_REMOVED',
    addedCode: 'METHOD_ADDED',
    changedCode: 'METHOD_SIGNATURE_CHANGED',
    changedSeverity: 'breaking',
    shape: (method) => ({
      params: method.params,
      returns: method.returns,
      route: method.route,
      effects: method.effects
    })
  });

  compareNamedCollections(changes, oldManifest.events, newManifest.events, {
    label: 'Event',
    location: 'events',
    removedCode: 'EVENT_REMOVED',
    addedCode: 'EVENT_ADDED',
    changedCode: 'EVENT_SCHEMA_CHANGED',
    changedSeverity: 'breaking',
    shape: (event) => ({
      params: event.params,
      runtime_fields: event.runtime_fields,
      stream: event.stream
    })
  });

  compareNamedCollections(changes, oldUi.actions, newUi.actions, {
    label: 'Action',
    location: 'system.ui.actions',
    removedCode: 'ACTION_REMOVED',
    addedCode: 'ACTION_ADDED',
    changedCode: 'ACTION_CONTRACT_CHANGED',
    changedSeverity: 'breaking',
    changedAdvice: 'Check planner routing, permissions, confirmation, readback, and idempotency before accepting this action change.',
    shape: actionShape
  });

  compareNamedCollections(changes, oldManifest.permissions, newManifest.permissions, {
    label: 'Permission',
    location: 'permissions',
    key: (permission) => permission && permission.action,
    removedCode: 'PERMISSION_REMOVED',
    addedCode: 'PERMISSION_ADDED',
    changedCode: 'PERMISSION_CHANGED',
    changedSeverity: 'breaking',
    shape: (permission) => ({
      action: permission.action,
      requires_confirmation: permission.requires_confirmation
    })
  });

  compareNamedCollections(changes, oldDatabase.tables, newDatabase.tables, {
    label: 'Table',
    location: 'system.database.tables',
    removedCode: 'TABLE_REMOVED',
    addedCode: 'TABLE_ADDED',
    changedCode: 'TABLE_SCHEMA_CHANGED',
    changedSeverity: 'breaking',
    changedAdvice: 'Table schema changes can break generated storage, projections, and readback mapping.',
    shape: (table) => ({
      columns: table.columns,
      primary_key: table.primary_key,
      indexes: table.indexes
    })
  });

  compareNamedCollections(changes, oldDatabase.read_models, newDatabase.read_models, {
    label: 'Read model',
    location: 'system.database.read_models',
    removedCode: 'READ_MODEL_REMOVED',
    addedCode: 'READ_MODEL_ADDED',
    changedCode: 'READ_MODEL_SCHEMA_CHANGED',
    changedSeverity: 'breaking',
    changedAdvice: 'Primary key, column, or query contract changes can break generated views and projections.',
    shape: readModelShape
  });

  compareNamedCollections(changes, oldDatabase.projections, newDatabase.projections, {
    label: 'Projection',
    location: 'system.database.projections',
    removedCode: 'PROJECTION_REMOVED',
    addedCode: 'PROJECTION_ADDED',
    changedCode: 'PROJECTION_CHANGED',
    changedSeverity: 'warning',
    changedAdvice: 'Projection changes require replay/idempotency review and may need a projection version bump.',
    shape: projectionShape
  });

  compareNamedCollections(changes, oldDatabase.queries, newDatabase.queries, {
    label: 'Query',
    location: 'system.database.queries',
    removedCode: 'QUERY_REMOVED',
    addedCode: 'QUERY_ADDED',
    changedCode: 'QUERY_CHANGED',
    changedSeverity: 'breaking',
    shape: (query) => ({
      read_model: query.read_model,
      operation: query.operation,
      filters: query.filters
    })
  });

  const oldRoutes = byKey(oldApi.routes, routeKey);
  const newRoutes = byKey(newApi.routes, routeKey);
  for (const [key, route] of oldRoutes) {
    if (!newRoutes.has(key)) {
      changes.push({
        severity: 'breaking',
        code: 'API_ROUTE_REMOVED',
        location: `system.api.routes.${key}`,
        message: `API route ${key} was removed.`,
        advice: 'Keep the route or publish a runtime migration.',
        before: route,
        after: null
      });
    }
  }
  for (const [key, route] of newRoutes) {
    if (!oldRoutes.has(key)) {
      changes.push({
        severity: 'info',
        code: 'API_ROUTE_ADDED',
        location: `system.api.routes.${key}`,
        message: `API route ${key} was added.`,
        advice: 'Ensure downstream routers expose the new route intentionally.',
        before: null,
        after: route
      });
    }
  }

  const summary = {
    total: changes.length,
    breaking: changes.filter((item) => item.severity === 'breaking').length,
    warnings: changes.filter((item) => item.severity === 'warning').length,
    info: changes.filter((item) => item.severity === 'info').length
  };

  return {
    schema: DIFF_SCHEMA,
    old_protocol: oldManifest.protocol || {},
    new_protocol: newManifest.protocol || {},
    compatible: summary.breaking === 0,
    summary,
    changes
  };
}

function renderDiffMarkdown(diff) {
  const lines = [
    `# ${protocolName(diff.old_protocol)} Diff`,
    '',
    `Compatibility: ${diff.compatible ? 'compatible' : 'breaking changes detected'}`,
    '',
    '| Severity | Count |',
    '| --- | --- |',
    `| breaking | ${diff.summary.breaking} |`,
    `| warning | ${diff.summary.warnings} |`,
    `| info | ${diff.summary.info} |`,
    ''
  ];

  if (diff.changes.length === 0) {
    lines.push('No contract changes.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| Severity | Code | Location | Change | Advice |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const change of diff.changes) {
    lines.push(`| ${change.severity} | ${change.code} | ${change.location} | ${change.message} | ${change.advice} |`);
  }
  return `${lines.join('\n')}\n`;
}

module.exports = {
  DIFF_SCHEMA,
  diffManifest,
  renderDiffMarkdown
};
