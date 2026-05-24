#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const { runConformance } = require("../bin/cardity_conformance");
const { reviewManifest } = require("../bin/cardity_review");

const root = path.resolve(__dirname, "..");
const productionWriteContract = JSON.parse(fs.readFileSync(
  path.join(root, "examples/04_production_write_contract_v1.json"),
  "utf8"
));

function fail(message) {
  throw new Error(message);
}

function baseManifest(actionOverrides = {}) {
  const action = {
    name: "catalog_item_update",
    kind: "command",
    intent_names: ["update catalog item"],
    intent_examples: ["Update a catalog item after approval"],
    disambiguation_keys: ["workspace_id", "item_id"],
    required_context: ["ctx.workspace_id", "ctx.actor_id"],
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string" }
      },
      required: ["item_id"]
    },
    output_schema: {
      type: "object",
      properties: {
        status: { type: "string" }
      },
      required: ["status"]
    },
    permission: "catalog.item.update",
    confirm_required: true,
    dry_run_supported: true,
    readback_required: true,
    readback_query: "catalog.item.detail",
    idempotency_key: "$run.id",
    risk_level: "medium",
    side_effects: {
      writes: ["catalog_items"],
      emits: ["CatalogItemUpdated"],
      external: []
    },
    audit_event: "CatalogItemUpdated",
    replay_policy: {
      mode: "idempotent_command",
      idempotency_key: "$run.id",
      on_replay: "return_prior_result"
    },
    execution_mode: "production_write",
    ...actionOverrides
  };

  return {
    schema: "cardity.agent_manifest.v1",
    protocol: "ProductionWriteSmoke",
    events: [],
    methods: [],
    permissions: [],
    system: {
      api: { routes: [] },
      database: {
        tables: [],
        read_models: [],
        queries: [],
        projections: []
      },
      ui: { actions: [action] },
      workflows: [],
      modules: [
        {
          name: "catalog",
          intent_names: ["catalog"]
        }
      ],
      external: {
        navigation: [],
        services: []
      }
    },
    agent: { tools: [] }
  };
}

const missing = baseManifest();
const missingReview = reviewManifest(missing);
if (!missingReview.findings.some((finding) => finding.code === "PRODUCTION_WRITE_CONTRACT_MISSING")) {
  fail("expected missing production write contract review finding");
}
const missingConformance = runConformance(missing);
if (missingConformance.ok) {
  fail("expected missing production write contract to fail conformance");
}

const invalid = baseManifest({
  production_write_contract: {
    schema: "wrong"
  }
});
const invalidReview = reviewManifest(invalid);
if (!invalidReview.findings.some((finding) => finding.code === "PRODUCTION_WRITE_CONTRACT_INVALID")) {
  fail("expected invalid production write contract review finding");
}

const valid = baseManifest({
  production_write_contract: undefined,
  agent_contract: {
    production_write_contract: productionWriteContract
  }
});
const validReview = reviewManifest(valid);
if (validReview.findings.some((finding) => finding.code.startsWith("PRODUCTION_WRITE_CONTRACT_"))) {
  fail("expected valid nested agent_contract.production_write_contract to pass review");
}
const validConformance = runConformance(valid);
const productionWriteFailures = validConformance.checks.filter((check) => (
  check.status === "fail" && check.id.includes("production_write_contract")
));
if (productionWriteFailures.length > 0) {
  fail("expected valid production write contract to pass conformance checks");
}

console.log("Production write contract verification passed");
