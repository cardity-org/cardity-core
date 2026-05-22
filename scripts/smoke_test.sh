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
  /tmp/cardity_member_points_agent_result.json >/dev/null
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"cardity_generation_guide","arguments":{"requirement":"member points"}}}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"cardity_compile","arguments":{"file":"examples/01_counter.car","out_dir":"/tmp/cardity_mcp_artifacts","include_manifest":true}}}' \
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
