#!/usr/bin/env bash
set -euo pipefail

# Requirements:
# - .env provides DOGE_RPC_URL, DOGE_RPC_USER, DOGE_RPC_PASS
# - CARDITY_WIF provided via environment (export CARDITY_WIF=...) or .env
# - ADDR mainnet receive address (export ADDR=...)
# - jq, xxd installed

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$REPO_ROOT/.env" ]; then
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
fi

DOGE_RPC_URL="${DOGE_RPC_URL:-}"
DOGE_RPC_USER="${DOGE_RPC_USER:-}"
DOGE_RPC_PASS="${DOGE_RPC_PASS:-}"
ADDR="${ADDR:-}"
CARDITY_WIF="${CARDITY_WIF:-}"

# Compatibility with DOGECOIN_* naming
if [ -z "$DOGE_RPC_USER" ] && [ -n "${DOGECOIN_RPC_USER:-}" ]; then DOGE_RPC_USER="$DOGECOIN_RPC_USER"; fi
if [ -z "$DOGE_RPC_PASS" ] && [ -n "${DOGECOIN_RPC_PASS:-}" ]; then DOGE_RPC_PASS="$DOGECOIN_RPC_PASS"; fi
if [ -z "$DOGE_RPC_URL" ] && [ -n "${DOGECOIN_RPC_HOST:-}" ]; then
  host="$DOGECOIN_RPC_HOST"
  port="${DOGECOIN_RPC_PORT:-22555}"
  if echo "$host" | grep -q "://"; then
    # host already includes scheme, append port if missing
    if echo "$host" | grep -Eq ":[0-9]+$"; then
      DOGE_RPC_URL="$host"
    else
      DOGE_RPC_URL="$host:$port"
    fi
  else
    DOGE_RPC_URL="http://$host:$port"
  fi
fi

# Fallbacks
if [ -z "$ADDR" ] && [ -n "${ADDRESS:-}" ]; then ADDR="$ADDRESS"; fi
if [ -z "$CARDITY_WIF" ] && [ -n "${WIF:-}" ]; then CARDITY_WIF="$WIF"; fi
if [ -z "$CARDITY_WIF" ] && [ -n "${PRIVATE_KEY:-}" ]; then CARDITY_WIF="$PRIVATE_KEY"; fi

if [ -z "$DOGE_RPC_URL" ] || [ -z "$DOGE_RPC_USER" ] || [ -z "$DOGE_RPC_PASS" ]; then
  echo "Missing DOGE_RPC_URL/DOGE_RPC_USER/DOGE_RPC_PASS in environment or .env" >&2
  exit 1
fi
if [ -z "$ADDR" ]; then
  echo "Missing ADDR (mainnet receive address) in environment" >&2
  exit 1
fi
if [ -z "$CARDITY_WIF" ]; then
  echo "Missing CARDITY_WIF in environment" >&2
  exit 1
fi

rpc() {
  local method="$1"; shift
  local params_json="$1"; shift || true
  local data
  if [ -z "${params_json:-}" ]; then
    data='{"jsonrpc":"1.0","id":"cardity","method":"'"$method"'","params":[]}'
  else
    data='{"jsonrpc":"1.0","id":"cardity","method":"'"$method"'","params":'"$params_json"'}'
  fi
  curl -s --user "$DOGE_RPC_USER:$DOGE_RPC_PASS" \
    -H 'content-type: text/plain;' \
    --data-binary "$data" "$DOGE_RPC_URL"
}

rpc_result() {
  rpc "$1" "${2:-}" | jq -r '.result // empty'
}

echo "== Cardity USDT-like mainnet deployment =="
echo "RPC: $DOGE_RPC_URL"
echo "ADDR: $ADDR"

echo "[1/6] Build .carc and inscription"
(
  cd "$REPO_ROOT"
  npm run build >/dev/null
  ./build/cardityc examples/08_usdt_like.car --format carc -o /tmp/usdt.carc --inscription >/dev/null
)

INS_FILE="/tmp/usdt.carc.inscription"
if [ ! -f "$INS_FILE" ]; then
  echo "Inscription file not found: $INS_FILE" >&2
  exit 1
fi
OP_HEX="$(xxd -p -c 999999 "$INS_FILE")"

echo "[2/6] Import private key (no rescan)"
rpc importprivkey "[\"$CARDITY_WIF\", \"\", false]" >/dev/null || true

echo "[3/6] Create + fund deploy tx"
RAW_CREATE="$(rpc_result createrawtransaction "[[], [{\"data\": \"$OP_HEX\"}]]")"
if [ -z "$RAW_CREATE" ]; then echo "createrawtransaction failed" >&2; exit 1; fi
FUND_JSON="$(rpc fundrawtransaction "[\"$RAW_CREATE\", {\"changeAddress\": \"$ADDR\"}]")"
RAW_FUNDED="$(echo "$FUND_JSON" | jq -r '.result.hex')"
if [ -z "$RAW_FUNDED" ] || [ "$RAW_FUNDED" = "null" ]; then echo "fundrawtransaction failed: $FUND_JSON" >&2; exit 1; fi

echo "[4/6] Sign deploy tx"
SIGNED_JSON="$(rpc signrawtransactionwithwallet "[\"$RAW_FUNDED\"]" || true)"
SIGNED_HEX="$(echo "$SIGNED_JSON" | jq -r '.result.hex // empty')"
if [ -z "$SIGNED_HEX" ] || [ "$SIGNED_HEX" = "null" ]; then
  # fallback legacy
  SIGNED_JSON="$(rpc signrawtransaction "[\"$RAW_FUNDED\"]")"
  SIGNED_HEX="$(echo "$SIGNED_JSON" | jq -r '.result.hex // empty')"
fi
if [ -z "$SIGNED_HEX" ] || [ "$SIGNED_HEX" = "null" ]; then echo "sign failed: $SIGNED_JSON" >&2; exit 1; fi

echo "[5/6] Broadcast deploy tx"
DEPLOY_TXID="$(rpc_result sendrawtransaction "[\"$SIGNED_HEX\"]")"
if [ -z "$DEPLOY_TXID" ]; then echo "sendrawtransaction failed" >&2; exit 1; fi
echo "Deploy TXID: $DEPLOY_TXID"

echo "[6/6] Generate and broadcast invoke txs (set_fee_policy, issue, transfer)"
(
  cd "$REPO_ROOT"
  node bin/cardity.js invoke "$DEPLOY_TXID" set_fee_policy --args '[30,1000]' > /tmp/usdt.invoke.set_fee_policy.json
  node bin/cardity.js invoke "$DEPLOY_TXID" issue --args '[1000000]' > /tmp/usdt.invoke.issue.json
  node bin/cardity.js invoke "$DEPLOY_TXID" transfer --args '["$ADDR",5000]' > /tmp/usdt.invoke.transfer.json
)

broadcast_invoke() {
  local f="$1"
  local hex
  hex="$(xxd -p -c 999999 "$f")"
  local raw funded signed sendtx
  raw="$(rpc_result createrawtransaction "[[], [{\"data\": \"$hex\"}]]")"
  funded="$(rpc fundrawtransaction "[\"$raw\", {\"changeAddress\": \"$ADDR\"}]")"
  local funded_hex
  funded_hex="$(echo "$funded" | jq -r '.result.hex')"
  signed="$(rpc signrawtransactionwithwallet "[\"$funded_hex\"]" || true)"
  local signed_hex
  signed_hex="$(echo "$signed" | jq -r '.result.hex // empty')"
  if [ -z "$signed_hex" ] || [ "$signed_hex" = "null" ]; then
    signed="$(rpc signrawtransaction "[\"$funded_hex\"]")"
    signed_hex="$(echo "$signed" | jq -r '.result.hex // empty')"
  fi
  sendtx="$(rpc_result sendrawtransaction "[\"$signed_hex\"]")"
  echo "$f => $sendtx"
}

broadcast_invoke /tmp/usdt.invoke.set_fee_policy.json
broadcast_invoke /tmp/usdt.invoke.issue.json
broadcast_invoke /tmp/usdt.invoke.transfer.json

echo "Done."


