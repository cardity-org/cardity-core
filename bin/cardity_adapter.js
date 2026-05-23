const ADAPTER_SCHEMA = 'cardity.runtime_adapter_contract.v1';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateRuntimeAdapter(adapter = {}) {
  const checks = [];

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
    'adapter.schema',
    'schema',
    adapter.schema === ADAPTER_SCHEMA,
    'Adapter uses cardity.runtime_adapter_contract.v1.',
    'schema',
    `Set schema to ${ADAPTER_SCHEMA}.`
  );

  check(
    'adapter.runtime.name',
    'runtime',
    hasText(adapter.runtime && adapter.runtime.name),
    'Adapter declares runtime.name.',
    'runtime.name',
    'Add a stable runtime name.'
  );
  check(
    'adapter.runtime.version',
    'runtime',
    hasText(adapter.runtime && adapter.runtime.version),
    'Adapter declares runtime.version.',
    'runtime.version',
    'Add the runtime adapter version.'
  );

  for (const field of [
    'supported_manifest_versions',
    'supported_action_contracts',
    'supported_projection_contracts'
  ]) {
    check(
      `adapter.${field}`,
      'versions',
      asArray(adapter[field]).length > 0,
      `Adapter declares ${field}.`,
      field,
      `Add at least one ${field} entry.`
    );
  }

  const capabilities = adapter.capabilities || {};
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
      `adapter.capability.${capability}`,
      'capabilities',
      typeof capabilities[capability] === 'boolean',
      `Adapter declares capabilities.${capability}.`,
      `capabilities.${capability}`,
      `Set capabilities.${capability} to true or false.`
    );
  }

  if (capabilities.write_executor === true) {
    for (const capability of ['permission_gate', 'readback_executor', 'audit_sink', 'replay_guard']) {
      check(
        `adapter.production_write.${capability}`,
        'safety',
        capabilities[capability] === true,
        `Production writes require ${capability}.`,
        `capabilities.${capability}`,
        `Set capabilities.${capability}=true or disable write_executor.`
      );
    }
  }

  const policy = adapter.production_write_policy || {};
  check(
    'adapter.production_write_policy.mode',
    'safety',
    ['disabled', 'dry_run_only', 'permissioned'].includes(policy.mode),
    'Adapter declares production_write_policy.mode.',
    'production_write_policy.mode',
    'Use disabled, dry_run_only, or permissioned.',
    true
  );

  if (policy.mode === 'permissioned') {
    for (const field of [
      'requires_permission_contract',
      'requires_confirm_required',
      'requires_readback_query',
      'requires_idempotency_key',
      'requires_replay_policy'
    ]) {
      check(
        `adapter.production_write_policy.${field}`,
        'safety',
        policy[field] === true,
        `Permissioned production writes require ${field}.`,
        `production_write_policy.${field}`,
        `Set production_write_policy.${field}=true.`
      );
    }
  }

  check(
    'adapter.conformance.status',
    'conformance',
    ['untested', 'passed', 'failed', 'partial'].includes(adapter.conformance && adapter.conformance.status),
    'Adapter declares conformance.status.',
    'conformance.status',
    'Use untested, passed, failed, or partial.'
  );

  if (adapter.endpoints && adapter.endpoints.conformance) {
    check(
      'adapter.endpoints.conformance',
      'endpoints',
      hasText(adapter.endpoints.conformance),
      'Adapter declares a conformance endpoint.',
      'endpoints.conformance',
      'Use a stable URL or route identifier.',
      true
    );
  }

  const summary = {
    total: checks.length,
    passed: checks.filter((item) => item.status === 'pass').length,
    failed: checks.filter((item) => item.status === 'fail').length,
    warnings: checks.filter((item) => item.status === 'warn').length
  };

  return {
    schema: 'cardity.runtime_adapter_validation.v1',
    ok: summary.failed === 0,
    target: adapter.runtime || null,
    summary,
    checks
  };
}

function renderRuntimeAdapterMarkdown(report) {
  const runtimeName = report.target && report.target.name ? report.target.name : 'Runtime Adapter';
  const lines = [
    `# ${runtimeName} Adapter Validation`,
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

  const nonPass = report.checks.filter((check) => check.status !== 'pass');
  lines.push('| Status | Category | Check | Location | Recommendation |');
  lines.push('| --- | --- | --- | --- | --- |');
  if (nonPass.length === 0) {
    lines.push('| pass | all | All checks passed. | - | - |');
  } else {
    for (const check of nonPass) {
      lines.push(`| ${check.status} | ${check.category} | ${check.message} | ${check.location} | ${check.recommendation} |`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  ADAPTER_SCHEMA,
  validateRuntimeAdapter,
  renderRuntimeAdapterMarkdown
};
