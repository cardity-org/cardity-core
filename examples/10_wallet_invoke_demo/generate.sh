#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../../" && pwd)
OUT_DIR="$ROOT/examples/10_wallet_invoke_demo/out"
SRC="$ROOT/examples/08_usdt_like.car"

mkdir -p "$OUT_DIR"

echo "Building compiler..."
cd "$ROOT" && npm run build >/dev/null

echo "Compile to .carc and .json"
./build/cardityc "$SRC" --format carc -o "$OUT_DIR/usdt.carc" >/dev/null
./build/cardityc "$SRC" --format json -o "$OUT_DIR/usdt.json" >/dev/null

echo "Generate hex and base64"
node bin/cardity.js ophex "$OUT_DIR/usdt.carc" > "$OUT_DIR/usdt.carc.hex"
base64 < "$OUT_DIR/usdt.carc" > "$OUT_DIR/usdt.carc.b64"

echo "Create deploy envelope"
cat > "$OUT_DIR/deploy.envelope.json" <<EOF
{
  "p": "cardity",
  "op": "deploy",
  "module": "USDTLikeToken",
  "version": "1.0.0",
  "hex": "$(cat "$OUT_DIR/usdt.carc.hex")",
  "carc_b64": "$(cat "$OUT_DIR/usdt.carc.b64")"
}
EOF

echo "Encode invoke hex for issue(1000000)"
node bin/cardity.js encode-invoke USDTLikeToken.issue --args "[1000000]" > "$OUT_DIR/issue.invoke.hex"

echo "Create invoke envelope"
cat > "$OUT_DIR/invoke_issue.envelope.json" <<EOF
{
  "p": "cardity",
  "op": "invoke",
  "module": "USDTLikeToken",
  "method": "issue",
  "args": [1000000],
  "hex": "$(cat "$OUT_DIR/issue.invoke.hex")"
}
EOF

echo "Done. Outputs in $OUT_DIR"

