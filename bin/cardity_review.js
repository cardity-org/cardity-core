const REVIEW_SCHEMA = 'cardity.security_review.v1';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function names(items) {
  return asArray(items).map((item) => item && item.name).filter(Boolean);
}

function collectStrings(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

function collectEventReferences(value) {
  const refs = new Set();
  for (const text of collectStrings(value)) {
    const re = /\$event\.([A-Za-z_][A-Za-z0-9_]*)/g;
    let match;
    while ((match = re.exec(text)) !== null) refs.add(match[1]);
  }
  return [...refs];
}

function hasWriteSideEffects(action) {
  const sideEffects = action.side_effects || {};
  return (
    asArray(sideEffects.writes).length > 0 ||
    asArray(sideEffects.emits).length > 0 ||
    asArray(sideEffects.external).length > 0
  );
}

function protocolName(protocol) {
  if (typeof protocol === 'string') return protocol;
  return (protocol && protocol.name) || 'Cardity Protocol';
}

function reviewManifest(manifest) {
  const findings = [];
  const system = manifest.system || {};
  const database = system.database || {};
  const ui = system.ui || {};
  const external = system.external || {};
  const eventsByName = new Map(asArray(manifest.events).map((event) => [event.name, event]));
  const readModelsByName = new Set(names(database.read_models));
  const tableNames = new Set(names(database.tables));

  function finding(severity, code, location, message, recommendation) {
    findings.push({ severity, code, location, message, recommendation });
  }

  for (const action of asArray(ui.actions)) {
    const location = `system.ui.actions.${action.name || '<unnamed>'}`;
    const isCommand = action.kind === 'command';
    const writes = hasWriteSideEffects(action);

    if (!action.kind) {
      finding('error', 'ACTION_KIND_MISSING', location, 'Action has no kind.', 'Set action.kind to query, command, or external_navigation.');
    }

    if (!Array.isArray(action.intent_names) || action.intent_names.length === 0) {
      finding('warning', 'ACTION_INTENT_NAMES_MISSING', location, 'Action has no planner intent names.', 'Add stable intent_names so runtimes can map user intent safely.');
    }

    if (action.kind === 'query') {
      if (writes) {
        finding('error', 'QUERY_HAS_SIDE_EFFECTS', location, 'Query action declares writes, emits, or external side effects.', 'Change it to command or remove side effects.');
      }
      if (action.confirm_required) {
        finding('warning', 'QUERY_REQUIRES_CONFIRMATION', location, 'Query action requires confirmation.', 'Queries should usually be read-only with confirm_required=false.');
      }
      if (action.permission) {
        finding('warning', 'QUERY_HAS_PERMISSION', location, 'Query action has a write permission identifier.', 'Use permission=null unless the query exposes protected data with a separate policy.');
      }
    }

    if (isCommand || writes) {
      if (!action.permission) {
        const plannedOnly = action.dry_run_supported || action.execution_mode === 'planned' || (action.side_effects && action.side_effects.planned);
        finding(
          plannedOnly ? 'warning' : 'error',
          plannedOnly ? 'COMMAND_PLANNED_ONLY' : 'COMMAND_PERMISSION_MISSING',
          location,
          plannedOnly
            ? 'Write-like action has no concrete permission contract and must remain planned/dry-run only.'
            : 'Write-like action has no concrete permission contract.',
          'Add a concrete permission contract before enabling production write execution.'
        );
      }
      if (!action.confirm_required) {
        finding('error', 'COMMAND_CONFIRMATION_MISSING', location, 'Write-like action does not require confirmation.', 'Set confirm_required=true for commands that write, emit events, or call external systems.');
      }
      if (!action.dry_run_supported) {
        finding('warning', 'COMMAND_DRY_RUN_MISSING', location, 'Command does not advertise dry-run support.', 'Add dry_run_supported=true when the runtime can preview effects before commit.');
      }
      if (!action.idempotency_key) {
        finding('error', 'COMMAND_IDEMPOTENCY_MISSING', location, 'Command has no idempotency key.', 'Use a stable expression such as $run.id.');
      }
      if (!action.replay_policy || !action.replay_policy.mode) {
        finding('error', 'COMMAND_REPLAY_POLICY_MISSING', location, 'Command has no replay policy.', 'Add replay_policy with an idempotent command mode.');
      }
      if (action.readback_required && !action.readback_query) {
        finding('error', 'READBACK_QUERY_MISSING', location, 'Action requires readback but has no readback query.', 'Add readback_query so projections can consume confirmed state.');
      }
      if (!action.readback_required) {
        finding('warning', 'COMMAND_READBACK_NOT_REQUIRED', location, 'Command does not require confirmed readback.', 'Use readback_required=true when downstream projections or UI need committed current state.');
      }
      if (action.risk_level === 'low') {
        finding('warning', 'WRITE_ACTION_LOW_RISK', location, 'Write-like action is marked low risk.', 'Use medium or high risk for actions with side effects.');
      }
      if (action.risk_level === 'high' && !action.audit_event) {
        finding('warning', 'HIGH_RISK_AUDIT_EVENT_MISSING', location, 'High-risk action has no audit event.', 'Set audit_event to the event or audit record produced by the command.');
      }
    }
  }

  for (const readModel of asArray(database.read_models)) {
    const location = `system.database.read_models.${readModel.name || '<unnamed>'}`;
    if (!Array.isArray(readModel.columns) || readModel.columns.length === 0) {
      finding('warning', 'READ_MODEL_COLUMNS_MISSING', location, 'Read model has no columns.', 'Emit explicit column schema with name/type metadata for stronger runtime generation.');
    }
    if (!Array.isArray(readModel.primary_key) || readModel.primary_key.length === 0) {
      finding('error', 'READ_MODEL_PRIMARY_KEY_MISSING', location, 'Read model has no primary key.', 'Emit a single or composite primary_key.');
    }
  }

  for (const query of asArray(database.queries)) {
    const location = `system.database.queries.${query.name || '<unnamed>'}`;
    if (query.read_model && !readModelsByName.has(query.read_model)) {
      finding('error', 'QUERY_READ_MODEL_UNKNOWN', location, `Query references unknown read model ${query.read_model}.`, 'Point query.read_model to an emitted read model.');
    }
  }

  for (const projection of asArray(database.projections)) {
    const location = `system.database.projections.${projection.name || '<unnamed>'}`;
    const event = projection.on && eventsByName.get(projection.on.event);
    if (!event) {
      finding('error', 'PROJECTION_EVENT_UNKNOWN', location, 'Projection trigger event is missing or unknown.', 'Set projection.on.event to an emitted event.');
    }

    const declaredEventFields = new Set([...names(event && event.params), ...names(event && event.runtime_fields)]);
    for (const ref of collectEventReferences(projection)) {
      if (!declaredEventFields.has(ref)) {
        finding('error', 'PROJECTION_EVENT_FIELD_UNDECLARED', location, `Projection references undeclared $event.${ref}.`, 'Declare the field in events[].params or events[].runtime_fields.');
      }
    }

    if (!projection.idempotency) {
      finding('error', 'PROJECTION_IDEMPOTENCY_MISSING', location, 'Projection has no idempotency metadata.', 'Add source_id, source_run_id, projection_version, and write_index.');
    } else {
      for (const key of ['source_id', 'source_run_id', 'projection_version', 'write_index']) {
        if (!projection.idempotency[key]) {
          finding('error', 'PROJECTION_IDEMPOTENCY_FIELD_MISSING', `${location}.idempotency.${key}`, `Projection idempotency is missing ${key}.`, 'Emit complete replay guard metadata.');
        }
      }
      if (projection.source === 'confirmed_readback' && projection.idempotency.source_id !== '$event.id') {
        finding('error', 'READBACK_SOURCE_ID_UNSTABLE', location, 'Confirmed readback projection does not use $event.id as source_id.', 'Set idempotency.source_id to $event.id.');
      }
      if (projection.source === 'confirmed_readback' && projection.idempotency.write_index !== '$event.write_index') {
        finding('error', 'READBACK_WRITE_INDEX_UNSTABLE', location, 'Confirmed readback projection does not use $event.write_index.', 'Set idempotency.write_index to $event.write_index.');
      }
    }

    for (const write of asArray(projection.writes)) {
      const writeLocation = `${location}.writes.${write.table || '<unknown>'}`;
      if (write.table && !tableNames.has(write.table) && !readModelsByName.has(write.table)) {
        finding('warning', 'PROJECTION_WRITE_TABLE_UNKNOWN', writeLocation, `Projection writes to unknown table ${write.table}.`, 'Emit the target table/read model schema alongside the projection.');
      }
      if (['upsert_delta', 'upsert_snapshot', 'delete', 'soft_delete'].includes(write.operation) && !write.key) {
        finding('error', 'PROJECTION_KEY_MISSING', writeLocation, `${write.operation} projection write has no key.`, 'Add a single or composite key for replay-safe writes.');
      }
      if (write.operation === 'delete') {
        finding('warning', 'PROJECTION_HARD_DELETE', writeLocation, 'Projection performs a hard delete.', 'Prefer soft_delete for business objects unless permanent deletion is required.');
      }
    }
  }

  for (const service of asArray(external.services)) {
    finding('info', 'EXTERNAL_SERVICE_DECLARED', `system.external.services.${service.name || '<unnamed>'}`, 'External service is declared outside action execution.', 'Keep it non-executing unless a concrete permissioned action contract is added.');
  }

  const summary = {
    total: findings.length,
    errors: findings.filter((item) => item.severity === 'error').length,
    warnings: findings.filter((item) => item.severity === 'warning').length,
    info: findings.filter((item) => item.severity === 'info').length
  };

  return {
    schema: REVIEW_SCHEMA,
    protocol: manifest.protocol || {},
    ok: summary.errors === 0,
    summary,
    findings
  };
}

function renderReviewMarkdown(review) {
  const protocol = review.protocol || {};
  const lines = [
    `# ${protocolName(protocol)} Security Review`,
    '',
    `Status: ${review.ok ? 'pass' : 'fail'}`,
    '',
    '| Severity | Count |',
    '| --- | --- |',
    `| error | ${review.summary.errors} |`,
    `| warning | ${review.summary.warnings} |`,
    `| info | ${review.summary.info} |`,
    ''
  ];

  if (review.findings.length === 0) {
    lines.push('No findings.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| Severity | Code | Location | Finding | Recommendation |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const finding of review.findings) {
    lines.push(`| ${finding.severity} | ${finding.code} | ${finding.location} | ${finding.message} | ${finding.recommendation} |`);
  }
  return `${lines.join('\n')}\n`;
}

module.exports = {
  REVIEW_SCHEMA,
  reviewManifest,
  renderReviewMarkdown
};
