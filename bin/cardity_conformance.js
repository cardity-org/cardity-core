const { reviewManifest } = require('./cardity_review');
const { validateRuntimeAdapter } = require('./cardity_adapter');

const CONFORMANCE_SCHEMA = 'cardity.conformance_report.v1';

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

function eventReferences(value) {
  const refs = new Set();
  for (const text of collectStrings(value)) {
    const re = /\$event\.([A-Za-z_][A-Za-z0-9_]*)/g;
    let match;
    while ((match = re.exec(text)) !== null) refs.add(match[1]);
  }
  return [...refs];
}

function protocolName(protocol) {
  if (typeof protocol === 'string') return protocol;
  return (protocol && protocol.name) || 'Cardity Protocol';
}

function runConformance(manifest, options = {}) {
  const checks = [];
  const system = manifest.system || {};
  const database = system.database || {};
  const ui = system.ui || {};
  const runtimeAdapter = options.runtimeAdapter || null;

  function check(id, category, condition, message, location, recommendation, warnOnly = false) {
    checks.push({
      id,
      category,
      status: condition ? 'pass' : (warnOnly ? 'warn' : 'fail'),
      message,
      location,
      recommendation
    });
  }

  check(
    'manifest.schema',
    'manifest',
    manifest.schema === 'cardity.agent_manifest.v1',
    'Manifest uses cardity.agent_manifest.v1.',
    'schema',
    'Emit schema: cardity.agent_manifest.v1.'
  );

  for (const field of ['protocol', 'events', 'methods', 'permissions', 'system', 'agent']) {
    check(
      `manifest.required.${field}`,
      'manifest',
      field in manifest,
      `Manifest includes top-level ${field}.`,
      field,
      `Add top-level ${field} to the Agent OS manifest.`
    );
  }

  for (const field of ['api', 'database', 'ui', 'workflows', 'modules', 'external']) {
    check(
      `system.required.${field}`,
      'manifest',
      field in system,
      `Manifest includes system.${field}.`,
      `system.${field}`,
      `Add system.${field} to the Agent OS manifest.`
    );
  }

  const actions = asArray(ui.actions);
  check(
    'action.list.present',
    'action',
    actions.length > 0,
    'Manifest exposes at least one agent action.',
    'system.ui.actions',
    'Emit system.ui.actions from methods/tools.'
  );

  const requiredActionFields = [
    'kind',
    'intent_names',
    'intent_examples',
    'disambiguation_keys',
    'required_context',
    'input_schema',
    'permission',
    'confirm_required',
    'dry_run_supported',
    'readback_required',
    'readback_query',
    'idempotency_key',
    'risk_level',
    'side_effects',
    'audit_event',
    'replay_policy'
  ];

  for (const action of actions) {
    const location = `system.ui.actions.${action.name || '<unnamed>'}`;
    for (const field of requiredActionFields) {
      check(
        `action.${action.name || 'unnamed'}.field.${field}`,
        'action',
        field in action,
        `Action ${action.name || '<unnamed>'} declares ${field}.`,
        `${location}.${field}`,
        `Add ${field} to the action contract.`
      );
    }

    check(
      `action.${action.name || 'unnamed'}.kind`,
      'action',
      ['query', 'command', 'external_navigation'].includes(action.kind),
      `Action ${action.name || '<unnamed>'} uses a valid kind.`,
      `${location}.kind`,
      'Use action.kind query, command, or external_navigation.'
    );
    check(
      `action.${action.name || 'unnamed'}.intent_names`,
      'action',
      Array.isArray(action.intent_names) && action.intent_names.length > 0,
      `Action ${action.name || '<unnamed>'} has planner intent names.`,
      `${location}.intent_names`,
      'Add one or more intent_names.'
    );
    check(
      `action.${action.name || 'unnamed'}.output`,
      'action',
      Boolean(action.output_schema || action.returns_read_model),
      `Action ${action.name || '<unnamed>'} declares output_schema or returns_read_model.`,
      `${location}.output_schema`,
      'Add output_schema or returns_read_model.'
    );
  }

  check(
    'runtime.modules.intent_names',
    'planner',
    asArray(system.modules).every((module) => Array.isArray(module.intent_names) && module.intent_names.length > 0),
    'Every module declares intent_names.',
    'system.modules',
    'Add system.modules[].intent_names.'
  );

  check(
    'external.boundary',
    'external',
    Array.isArray(system.external && system.external.navigation) && Array.isArray(system.external && system.external.services),
    'External navigation/services boundaries are explicit.',
    'system.external',
    'Emit system.external.navigation and system.external.services arrays.'
  );

  const eventsByName = new Map(asArray(manifest.events).map((event) => [event.name, event]));
  for (const projection of asArray(database.projections)) {
    const location = `system.database.projections.${projection.name || '<unnamed>'}`;
    const event = projection.on && eventsByName.get(projection.on.event);
    check(
      `projection.${projection.name || 'unnamed'}.event`,
      'projection',
      Boolean(event),
      `Projection ${projection.name || '<unnamed>'} references a known event.`,
      `${location}.on.event`,
      'Set projection.on.event to an emitted event.'
    );

    const eventFields = new Set([...names(event && event.params), ...names(event && event.runtime_fields)]);
    for (const ref of eventReferences(projection)) {
      check(
        `projection.${projection.name || 'unnamed'}.event_ref.${ref}`,
        'projection',
        eventFields.has(ref),
        `Projection ${projection.name || '<unnamed>'} declares $event.${ref}.`,
        location,
        `Add ${ref} to the trigger event params or runtime_fields.`
      );
    }

    for (const field of ['source_id', 'source_run_id', 'projection_version', 'write_index']) {
      check(
        `projection.${projection.name || 'unnamed'}.idempotency.${field}`,
        'projection',
        Boolean(projection.idempotency && projection.idempotency[field]),
        `Projection ${projection.name || '<unnamed>'} has idempotency.${field}.`,
        `${location}.idempotency.${field}`,
        `Add idempotency.${field} for replay-safe projection writes.`
      );
    }
  }

  for (const readModel of asArray(database.read_models)) {
    const location = `system.database.read_models.${readModel.name || '<unnamed>'}`;
    check(
      `read_model.${readModel.name || 'unnamed'}.primary_key`,
      'projection',
      Array.isArray(readModel.primary_key) && readModel.primary_key.length > 0,
      `Read model ${readModel.name || '<unnamed>'} declares a primary key.`,
      `${location}.primary_key`,
      'Emit read_models[].primary_key.'
    );
    check(
      `read_model.${readModel.name || 'unnamed'}.columns`,
      'projection',
      Array.isArray(readModel.columns) && readModel.columns.length > 0,
      `Read model ${readModel.name || '<unnamed>'} declares columns.`,
      `${location}.columns`,
      'Emit read_models[].columns with name/type metadata.',
      true
    );
  }

  const securityReview = reviewManifest(manifest);
  check(
    'security.review.errors',
    'security',
    securityReview.summary.errors === 0,
    'Security review has no error findings.',
    'security_review.findings',
    'Fix error findings from cardity review.'
  );
  check(
    'security.review.warnings',
    'security',
    securityReview.summary.warnings === 0,
    'Security review has no warning findings.',
    'security_review.findings',
    'Review warning findings from cardity review.',
    true
  );

  if (runtimeAdapter) {
    const adapterValidation = validateRuntimeAdapter(runtimeAdapter);
    for (const adapterCheck of adapterValidation.checks) {
      check(
        `runtime_adapter.contract.${adapterCheck.id}`,
        'runtime_adapter',
        adapterCheck.status === 'pass',
        adapterCheck.message,
        adapterCheck.location,
        adapterCheck.recommendation,
        adapterCheck.status === 'warn'
      );
    }

    check(
      'runtime_adapter.schema',
      'runtime_adapter',
      runtimeAdapter.schema === 'cardity.runtime_adapter_contract.v1',
      'Runtime adapter uses cardity.runtime_adapter_contract.v1.',
      'runtime_adapter.schema',
      'Emit schema: cardity.runtime_adapter_contract.v1.'
    );
    check(
      'runtime_adapter.manifest_version',
      'runtime_adapter',
      asArray(runtimeAdapter.supported_manifest_versions).includes(manifest.schema),
      'Runtime adapter supports this manifest version.',
      'runtime_adapter.supported_manifest_versions',
      `Add ${manifest.schema} to supported_manifest_versions.`
    );
    check(
      'runtime_adapter.action_contract',
      'runtime_adapter',
      asArray(runtimeAdapter.supported_action_contracts).includes('agent_action_contract_v1'),
      'Runtime adapter supports agent_action_contract_v1.',
      'runtime_adapter.supported_action_contracts',
      'Add agent_action_contract_v1 to supported_action_contracts.'
    );
    check(
      'runtime_adapter.projection_contract',
      'runtime_adapter',
      asArray(runtimeAdapter.supported_projection_contracts).includes('projection_contract_v1_1'),
      'Runtime adapter supports projection_contract_v1_1.',
      'runtime_adapter.supported_projection_contracts',
      'Add projection_contract_v1_1 to supported_projection_contracts.'
    );
    for (const capability of [
      'register_actions',
      'permission_gate',
      'dry_run_executor',
      'write_executor',
      'readback_executor',
      'audit_sink',
      'replay_guard'
    ]) {
      check(
        `runtime_adapter.capability.${capability}`,
        'runtime_adapter',
        Boolean(runtimeAdapter.capabilities && runtimeAdapter.capabilities[capability]),
        `Runtime adapter supports ${capability}.`,
        `runtime_adapter.capabilities.${capability}`,
        `Set capabilities.${capability}=true or declare partial compatibility.`,
        capability === 'write_executor'
      );
    }
  }

  const summary = {
    total: checks.length,
    passed: checks.filter((item) => item.status === 'pass').length,
    failed: checks.filter((item) => item.status === 'fail').length,
    warnings: checks.filter((item) => item.status === 'warn').length
  };

  return {
    schema: CONFORMANCE_SCHEMA,
    target: {
      protocol: protocolName(manifest.protocol),
      manifest_schema: manifest.schema || null,
      runtime_adapter: runtimeAdapter && runtimeAdapter.runtime ? runtimeAdapter.runtime : null
    },
    ok: summary.failed === 0,
    summary,
    checks,
    security_review: securityReview
  };
}

function renderConformanceMarkdown(report) {
  const lines = [
    `# ${report.target.protocol} Conformance Report`,
    '',
    `Status: ${report.ok ? 'pass' : 'fail'}`,
    '',
    '| Result | Count |',
    '| --- | --- |',
    `| passed | ${report.summary.passed} |`,
    `| failed | ${report.summary.failed} |`,
    `| warnings | ${report.summary.warnings} |`,
    ''
  ];

  if (report.checks.length === 0) {
    lines.push('No checks.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| Status | Category | Check | Location | Recommendation |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const check of report.checks) {
    if (check.status === 'pass') continue;
    lines.push(`| ${check.status} | ${check.category} | ${check.message} | ${check.location} | ${check.recommendation} |`);
  }
  if (report.checks.every((check) => check.status === 'pass')) {
    lines.push('| pass | all | All checks passed. | - | - |');
  }
  return `${lines.join('\n')}\n`;
}

module.exports = {
  CONFORMANCE_SCHEMA,
  runConformance,
  renderConformanceMarkdown
};
