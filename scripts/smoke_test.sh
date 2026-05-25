#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
JSON_OUT=/tmp/cardity_counter.json
CARC_OUT=/tmp/cardity_counter.carc
STATE_OUT=/tmp/cardity_counter_state.json
ABI_OUT=/tmp/cardity_counter.abi.json
DIRECT_ABI_OUT=/tmp/cardity_counter_direct.abi.json
MANIFEST_OUT=/tmp/cardity_counter.agent.json
AGENT_OUT=/tmp/cardity_agent_result.json
AGENT_DIR=/tmp/cardity_agent_artifacts
MCP_OUT=/tmp/cardity_mcp_result.jsonl
AGENT_TEXT_OUT=/tmp/cardity_agent_text_result.json
MEMBER_MANIFEST_OUT=/tmp/cardity_member_points.agent.json
MEMBER_AGENT_DIR=/tmp/cardity_member_points_agent_artifacts
BAD_AGENT_OUT=/tmp/cardity_bad_agent_result.json
INIT_OUT=/tmp/cardity_init_template_project
EXPLAIN_OUT=/tmp/cardity_counter_explain.md
EXPLAIN_JSON_OUT=/tmp/cardity_counter_explain.json
VISUALIZE_OUT=/tmp/cardity_member_points_visualize.md
VISUALIZE_JSON_OUT=/tmp/cardity_member_points_visualize.json
VISUALIZE_HTML_OUT=/tmp/cardity_member_points_visualize.html
REVIEW_OUT=/tmp/cardity_member_points_review.md
REVIEW_JSON_OUT=/tmp/cardity_member_points_review.json
DIFF_NEW_MANIFEST_OUT=/tmp/cardity_member_points_changed.agent.json
DIFF_OUT=/tmp/cardity_member_points_diff.md
DIFF_JSON_OUT=/tmp/cardity_member_points_diff.json
CONFORMANCE_OUT=/tmp/cardity_member_points_conformance.md
CONFORMANCE_JSON_OUT=/tmp/cardity_member_points_conformance.json
PACKAGE_OUT=/tmp/cardity_member_points.carditypkg
PACKAGE_VERIFY_OUT=/tmp/cardity_member_points_package_verify.json
PACKAGE_UNPACK_DIR=/tmp/cardity_member_points_unpacked
ECOSYSTEM_REGISTRY_OUT=/tmp/cardity_ecosystem_registry.json
ECOSYSTEM_TEMPLATE_OUT=/tmp/cardity_ecosystem_registry_template.json

cd "$ROOT"

./build/cardityc examples/01_counter.car --format json -o "$JSON_OUT" >/dev/null
./build/cardityc examples/01_counter.car --format carc -o "$CARC_OUT" >/dev/null
./build/cardityc examples/01_counter.car --format agent-manifest -o "$MANIFEST_OUT" >/dev/null
./build/cardityc examples/02_member_points_agent.car --format agent-manifest -o "$MEMBER_MANIFEST_OUT" >/dev/null
./build/cardity_abi examples/01_counter.car -o "$DIRECT_ABI_OUT" >/dev/null
node bin/cardity_agent.js compile examples/01_counter.car --out-dir "$AGENT_DIR" --include-manifest > "$AGENT_OUT"
node bin/cardity_agent.js compile examples/02_member_points_agent.car --out-dir "$MEMBER_AGENT_DIR" --include-manifest > /tmp/cardity_member_points_agent_result.json
node bin/cardity_agent.js compile --source-text "$(cat examples/01_counter.car)" --out-dir /tmp/cardity_agent_text_artifacts --include-manifest > "$AGENT_TEXT_OUT"
node scripts/verify_projection_contract.js \
  "$MEMBER_MANIFEST_OUT" \
  /tmp/cardity_member_points_agent_result.json \
  examples/03_merchant_erp_projection_v1_1.json >/dev/null
node scripts/verify_agent_manifest_contract.js \
  "$MANIFEST_OUT" \
  "$MEMBER_MANIFEST_OUT" \
  "$AGENT_OUT" \
  /tmp/cardity_member_points_agent_result.json \
  examples/03_merchant_erp_projection_v1_1.json >/dev/null
node scripts/verify_npm_package.js >/dev/null
node scripts/verify_contract_schemas.js >/dev/null
node scripts/verify_next_stage_assets.js >/dev/null
node scripts/verify_production_write_contract.js >/dev/null
node scripts/verify_checkpoint_contract.js >/dev/null
node scripts/verify_cardity_bench_demo.js >/dev/null
grep -q 'Cardity Playground' src/cloudflare-worker.js
grep -q 'url.pathname === "/playground"' src/cloudflare-worker.js
rm -rf "$INIT_OUT"
node bin/cardity.js init "$INIT_OUT" --template member_points >/dev/null
test -f "$INIT_OUT/src/protocol.car"
test -f "$INIT_OUT/cardity.json"
node bin/cardity.js explain examples/01_counter.car --diagram > "$EXPLAIN_OUT"
node bin/cardity.js explain "$MANIFEST_OUT" --json > "$EXPLAIN_JSON_OUT"
node bin/cardity.js visualize examples/02_member_points_agent.car > "$VISUALIZE_OUT"
node bin/cardity.js visualize "$MEMBER_MANIFEST_OUT" --json > "$VISUALIZE_JSON_OUT"
node bin/cardity.js visualize "$MEMBER_MANIFEST_OUT" --html > "$VISUALIZE_HTML_OUT"
node bin/cardity.js review examples/02_member_points_agent.car > "$REVIEW_OUT"
node bin/cardity.js review "$MEMBER_MANIFEST_OUT" --json > "$REVIEW_JSON_OUT"
node -e 'const fs=require("fs"); const f=process.argv[1]; const out=process.argv[2]; const m=JSON.parse(fs.readFileSync(f,"utf8")); m.methods=m.methods.filter(x=>x.name!=="spend_points"); m.system.ui.actions=m.system.ui.actions.filter(x=>x.method!=="spend_points"); fs.writeFileSync(out, JSON.stringify(m,null,2));' "$MEMBER_MANIFEST_OUT" "$DIFF_NEW_MANIFEST_OUT"
node bin/cardity.js diff "$MEMBER_MANIFEST_OUT" "$DIFF_NEW_MANIFEST_OUT" > "$DIFF_OUT"
node bin/cardity.js diff "$MEMBER_MANIFEST_OUT" "$DIFF_NEW_MANIFEST_OUT" --json > "$DIFF_JSON_OUT"
node bin/cardity.js conformance examples/02_member_points_agent.car > "$CONFORMANCE_OUT"
node bin/cardity.js conformance "$MEMBER_MANIFEST_OUT" --runtime-adapter examples/runtime_adapter_cardity_mock.json --json > "$CONFORMANCE_JSON_OUT"
rm -f "$PACKAGE_OUT"
rm -rf "$PACKAGE_UNPACK_DIR"
node bin/cardity.js pack "$MEMBER_AGENT_DIR" --name member-points-system --pkg-version 1.0.0 -o "$PACKAGE_OUT" >/dev/null
node bin/cardity.js verify-package "$PACKAGE_OUT" --json > "$PACKAGE_VERIFY_OUT"
node bin/cardity.js unpack "$PACKAGE_OUT" --out-dir "$PACKAGE_UNPACK_DIR" >/dev/null
node bin/cardity.js schemas runtime_adapter_contract_v1 --json >/tmp/cardity_schema_registry_smoke.json
node bin/cardity.js schemas explain_result_v1 --json >/tmp/cardity_explain_schema_registry_smoke.json
node bin/cardity.js schemas production_write_contract_v1 --json >/tmp/cardity_production_write_schema_registry_smoke.json
node bin/cardity.js schemas checkpoint_contract_v1 --json >/tmp/cardity_checkpoint_schema_registry_smoke.json
node bin/cardity.js runtimes pmtsoul-agent-os --json >/tmp/cardity_runtime_registry_smoke.json
node bin/cardity.js registry --json > "$ECOSYSTEM_REGISTRY_OUT"
node bin/cardity.js registry templates member_points --json > "$ECOSYSTEM_TEMPLATE_OUT"
node --check src/cloudflare-worker.js >/tmp/cardity_worker_check_smoke.txt
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"cardity_generation_guide","arguments":{"requirement":"member points"}}}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"cardity_compile","arguments":{"file":"examples/01_counter.car","out_dir":"/tmp/cardity_mcp_artifacts","include_manifest":true}}}' \
  '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"cardity_explain_manifest","arguments":{"file":"examples/01_counter.car","format":"json"}}}' \
  '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"cardity_review_security","arguments":{"file":"examples/02_member_points_agent.car","format":"json"}}}' \
  '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"cardity_diff","arguments":{"old_file":"examples/01_counter.car","new_file":"examples/01_counter.car","format":"json"}}}' \
  '{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"cardity_conformance","arguments":{"file":"examples/02_member_points_agent.car","runtime_adapter_file":"examples/runtime_adapter_cardity_mock.json","format":"json"}}}' \
  '{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"cardity_visualize_manifest","arguments":{"file":"examples/02_member_points_agent.car","format":"mermaid"}}}' \
  '{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"cardity_schema_registry","arguments":{"name":"runtime_adapter_contract_v1"}}}' \
  '{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"cardity_runtime_compatibility","arguments":{"id":"pmtsoul-agent-os"}}}' \
  '{"jsonrpc":"2.0","id":12,"method":"tools/call","params":{"name":"cardity_ecosystem_registry","arguments":{"collection":"templates","id":"member_points"}}}' \
  | node bin/cardity_mcp_server.js > "$MCP_OUT"

if node bin/cardity_agent.js compile --source-text 'protocol Bad { version: "1.0.0"; owner: "agent-os"; state { result: string = "ok"; } method get_balance(user: address) { state.balances[params.user] = state.balances[params.user]; } returns: string state.result; }' --out-dir /tmp/cardity_bad_agent_artifacts > "$BAD_AGENT_OUT" 2>&1; then
  echo "Expected agent compile to reject indexed state access"
  cat "$BAD_AGENT_OUT"
  exit 1
fi

if ! grep -q '"p": "cardity"' "$JSON_OUT"; then
  echo "Expected compiled JSON to use p=cardity"
  cat "$JSON_OUT"
  exit 1
fi

if ! grep -q '"count"' "$ABI_OUT" || ! grep -q '"state"' "$ABI_OUT"; then
  echo "Expected ABI to include state definitions"
  cat "$ABI_OUT"
  exit 1
fi

if ! grep -q '"CountChanged"' "$ABI_OUT"; then
  echo "Expected ABI to include CountChanged event"
  cat "$ABI_OUT"
  exit 1
fi

if ! grep -q '"count"' "$DIRECT_ABI_OUT" || ! grep -q '"CountChanged"' "$DIRECT_ABI_OUT"; then
  echo "Expected direct ABI generation from .car to include state and events"
  cat "$DIRECT_ABI_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.agent_manifest.v1"' "$MANIFEST_OUT"; then
  echo "Expected Agent OS manifest schema"
  cat "$MANIFEST_OUT"
  exit 1
fi

if ! grep -q '"counter_set_count"' "$MANIFEST_OUT"; then
  echo "Expected Agent OS manifest to expose a tool for set_count"
  cat "$MANIFEST_OUT"
  exit 1
fi

if ! grep -q '"member_point_balances"' "$MEMBER_MANIFEST_OUT"; then
  echo "Expected Agent OS manifest to include declared member_point_balances table"
  cat "$MEMBER_MANIFEST_OUT"
  exit 1
fi

if ! grep -q '"member_point_ledger"' "$MEMBER_MANIFEST_OUT"; then
  echo "Expected Agent OS manifest to include declared member_point_ledger table"
  cat "$MEMBER_MANIFEST_OUT"
  exit 1
fi

if ! grep -q '"requires_confirmation": true' "$MANIFEST_OUT"; then
  echo "Expected mutating method to require confirmation"
  cat "$MANIFEST_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.agent_compile_result.v1"' "$AGENT_OUT"; then
  echo "Expected agent compile result schema"
  cat "$AGENT_OUT"
  exit 1
fi

if ! grep -q '# Counter Manifest' "$EXPLAIN_OUT" || ! grep -q 'graph LR' "$EXPLAIN_OUT"; then
  echo "Expected cardity explain to render Markdown with a Mermaid graph"
  cat "$EXPLAIN_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.explain_result.v1"' "$EXPLAIN_JSON_OUT"; then
  echo "Expected cardity explain --json to render explain result schema"
  cat "$EXPLAIN_JSON_OUT"
  exit 1
fi

if ! grep -q '# MemberPointsSystem Manifest Visualizer' "$VISUALIZE_OUT" || ! grep -q 'Business Protocol Layer' "$VISUALIZE_OUT"; then
  echo "Expected cardity visualize to render layered Markdown graph"
  cat "$VISUALIZE_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.manifest_visualization.v1"' "$VISUALIZE_JSON_OUT"; then
  echo "Expected cardity visualize --json to render visualization schema"
  cat "$VISUALIZE_JSON_OUT"
  exit 1
fi

if ! grep -q '<title>MemberPointsSystem Manifest Visualizer</title>' "$VISUALIZE_HTML_OUT" || ! grep -q 'Contract Edges' "$VISUALIZE_HTML_OUT"; then
  echo "Expected cardity visualize --html to render a standalone HTML report"
  cat "$VISUALIZE_HTML_OUT"
  exit 1
fi

if ! grep -q '# MemberPointsSystem Security Review' "$REVIEW_OUT"; then
  echo "Expected cardity review to render Markdown security review"
  cat "$REVIEW_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.security_review.v1"' "$REVIEW_JSON_OUT"; then
  echo "Expected cardity review --json to render security review result schema"
  cat "$REVIEW_JSON_OUT"
  exit 1
fi

if ! grep -q '# MemberPointsSystem Diff' "$DIFF_OUT" || ! grep -q 'METHOD_REMOVED' "$DIFF_OUT"; then
  echo "Expected cardity diff to render Markdown with removed method"
  cat "$DIFF_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.protocol_diff.v1"' "$DIFF_JSON_OUT" || ! grep -q '"compatible": false' "$DIFF_JSON_OUT"; then
  echo "Expected cardity diff --json to render incompatible protocol diff"
  cat "$DIFF_JSON_OUT"
  exit 1
fi

if ! grep -q '# MemberPointsSystem Conformance Report' "$CONFORMANCE_OUT"; then
  echo "Expected cardity conformance to render Markdown report"
  cat "$CONFORMANCE_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.conformance_report.v1"' "$CONFORMANCE_JSON_OUT" || ! grep -q '"ok": true' "$CONFORMANCE_JSON_OUT"; then
  echo "Expected cardity conformance --json to render a passing report"
  cat "$CONFORMANCE_JSON_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.package_verification.v1"' "$PACKAGE_VERIFY_OUT" || ! grep -q '"ok": true' "$PACKAGE_VERIFY_OUT"; then
  echo "Expected cardity verify-package --json to render a passing package verification"
  cat "$PACKAGE_VERIFY_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.ecosystem_registry.v1"' "$ECOSYSTEM_REGISTRY_OUT" || ! grep -q '"member_points"' "$ECOSYSTEM_REGISTRY_OUT"; then
  echo "Expected cardity registry to render the ecosystem registry"
  cat "$ECOSYSTEM_REGISTRY_OUT"
  exit 1
fi

if ! grep -q '"schema": "cardity.ecosystem_registry_entry.v1"' "$ECOSYSTEM_TEMPLATE_OUT" || ! grep -q '"Member Points"' "$ECOSYSTEM_TEMPLATE_OUT"; then
  echo "Expected cardity registry templates member_points to render one template entry"
  cat "$ECOSYSTEM_TEMPLATE_OUT"
  exit 1
fi

if ! test -f "$PACKAGE_UNPACK_DIR/02_member_points_agent.agent.json"; then
  echo "Expected cardity unpack to restore the agent manifest"
  find "$PACKAGE_UNPACK_DIR" -maxdepth 2 -type f
  exit 1
fi

if ! grep -q '"ok": true' "$AGENT_OUT"; then
  echo "Expected agent compile result to succeed"
  cat "$AGENT_OUT"
  exit 1
fi

if ! grep -q '"counter_set_count"' "$AGENT_OUT"; then
  echo "Expected agent compile result to expose generated tools"
  cat "$AGENT_OUT"
  exit 1
fi

if ! grep -q 'cardity-source-' "$AGENT_TEXT_OUT"; then
  echo "Expected agent compile to accept source_text input"
  cat "$AGENT_TEXT_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_compile"' "$MCP_OUT"; then
  echo "Expected MCP server to list cardity_compile tool"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_generation_guide"' "$MCP_OUT"; then
  echo "Expected MCP server to list cardity_generation_guide tool"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q 'cardity.generation_guide.v1' "$MCP_OUT"; then
  echo "Expected MCP cardity_generation_guide call to return generation guide"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_explain_manifest"' "$MCP_OUT" || ! grep -q 'cardity.explain_tool_result.v1' "$MCP_OUT"; then
  echo "Expected MCP server to expose and call cardity_explain_manifest"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_review_security"' "$MCP_OUT" || ! grep -q 'cardity.security_review_tool_result.v1' "$MCP_OUT"; then
  echo "Expected MCP server to expose and call cardity_review_security"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_diff"' "$MCP_OUT" || ! grep -q 'cardity.protocol_diff_tool_result.v1' "$MCP_OUT"; then
  echo "Expected MCP server to expose and call cardity_diff"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_conformance"' "$MCP_OUT" || ! grep -q 'cardity.conformance_tool_result.v1' "$MCP_OUT"; then
  echo "Expected MCP server to expose and call cardity_conformance"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_visualize_manifest"' "$MCP_OUT" || ! grep -q 'cardity.visualization_tool_result.v1' "$MCP_OUT"; then
  echo "Expected MCP server to expose and call cardity_visualize_manifest"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_schema_registry"' "$MCP_OUT" || ! grep -q 'runtime_adapter_contract_v1.schema.json' "$MCP_OUT"; then
  echo "Expected MCP server to expose and call cardity_schema_registry"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_runtime_compatibility"' "$MCP_OUT" || ! grep -q 'pmtsoul-agent-os' "$MCP_OUT"; then
  echo "Expected MCP server to expose and call cardity_runtime_compatibility"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q '"name":"cardity_ecosystem_registry"' "$MCP_OUT" || ! grep -q 'cardity.ecosystem_registry_entry.v1' "$MCP_OUT"; then
  echo "Expected MCP server to expose and call cardity_ecosystem_registry"
  cat "$MCP_OUT"
  exit 1
fi

if ! grep -q 'Unsupported indexed state access' "$BAD_AGENT_OUT"; then
  echo "Expected agent safety validator to explain indexed state access"
  cat "$BAD_AGENT_OUT"
  exit 1
fi

if ! grep -q 'cardity.agent_compile_result.v1' "$MCP_OUT"; then
  echo "Expected MCP cardity_compile call to return agent compile result"
  cat "$MCP_OUT"
  exit 1
fi

SET_OUTPUT=$(./build/cardity_runtime "$JSON_OUT" set_count 12 --state "$STATE_OUT")
GET_OUTPUT=$(./build/cardity_runtime "$JSON_OUT" get_count --state "$STATE_OUT")

if [[ "$SET_OUTPUT" != *"Result: large"* ]]; then
  echo "Expected set_count(12) to return large"
  echo "$SET_OUTPUT"
  exit 1
fi

if [[ "$SET_OUTPUT" != *"CountChanged(12, large)"* ]]; then
  echo "Expected set_count(12) to emit CountChanged(12, large)"
  echo "$SET_OUTPUT"
  exit 1
fi

if [[ "$GET_OUTPUT" != *"Result: 12"* ]]; then
  echo "Expected get_count to return 12"
  echo "$GET_OUTPUT"
  exit 1
fi

echo "Smoke test passed"
