#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const { runConformance } = require("../bin/cardity_conformance");
const { reviewManifest } = require("../bin/cardity_review");

const root = path.resolve(__dirname, "..");
const checkpointContract = JSON.parse(fs.readFileSync(
  path.join(root, "examples/05_checkpoint_contract_v1.json"),
  "utf8"
));
const pmtsoulLongHorizonManifest = JSON.parse(fs.readFileSync(
  path.join(root, "examples/09_pmtsoul_long_horizon_checkpoint_manifest.json"),
  "utf8"
));

function fail(message) {
  throw new Error(message);
}

function baseManifest(actionOverrides = {}) {
  const action = {
    name: "cross_app_workflow_step",
    kind: "command",
    intent_names: ["run cross app workflow step"],
    intent_examples: ["Update an entity and verify the downstream read model"],
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
    permission: "workflow.step.run",
    confirm_required: true,
    dry_run_supported: true,
    readback_required: true,
    readback_query: "workflow.step.detail",
    idempotency_key: "$run.id",
    risk_level: "medium",
    side_effects: {
      writes: ["workflow_state"],
      emits: ["WorkflowStepCompleted"],
      external: []
    },
    audit_event: "WorkflowStepCompleted",
    replay_policy: {
      mode: "idempotent_command",
      idempotency_key: "$run.id",
      on_replay: "return_prior_result"
    },
    long_horizon: true,
    ...actionOverrides
  };

  return {
    schema: "cardity.agent_manifest.v1",
    protocol: "CheckpointSmoke",
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
          name: "workflow",
          intent_names: ["workflow"]
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
if (!missingReview.findings.some((finding) => finding.code === "CHECKPOINT_CONTRACT_MISSING")) {
  fail("expected missing checkpoint contract review finding");
}
const missingConformance = runConformance(missing);
if (missingConformance.ok) {
  fail("expected missing checkpoint contract to fail conformance");
}

const invalid = baseManifest({
  checkpoint_contract: {
    schema: "wrong"
  }
});
const invalidReview = reviewManifest(invalid);
if (!invalidReview.findings.some((finding) => finding.code === "CHECKPOINT_CONTRACT_INVALID")) {
  fail("expected invalid checkpoint contract review finding");
}

const valid = baseManifest({
  checkpoint_contract: undefined,
  agent_contract: {
    checkpoint_contract: checkpointContract
  }
});
const validReview = reviewManifest(valid);
if (validReview.findings.some((finding) => finding.code.startsWith("CHECKPOINT_CONTRACT_"))) {
  fail("expected valid nested agent_contract.checkpoint_contract to pass review");
}
const validConformance = runConformance(valid);
const checkpointFailures = validConformance.checks.filter((check) => (
  check.status === "fail" && check.id.includes("checkpoint_contract")
));
if (checkpointFailures.length > 0) {
  fail("expected valid checkpoint contract to pass conformance checks");
}

const pmtsoulAction = pmtsoulLongHorizonManifest.system.ui.actions.find((action) => (
  action.name === "merchant_product_publish_long_horizon"
));
if (!pmtsoulAction) {
  fail("expected PMTSoul long-horizon reference action");
}
const pmtsoulCheckpoint = pmtsoulAction.agent_contract && pmtsoulAction.agent_contract.checkpoint_contract;
if (!pmtsoulCheckpoint || pmtsoulCheckpoint.schema !== "cardity.checkpoint_contract.v1") {
  fail("expected PMTSoul action to attach cardity.checkpoint_contract.v1");
}
for (const scenario of [
  "product_publish",
  "storefront_edit_publish",
  "market_research_full_init",
  "knowledge_document_indexing",
  "poster_media_generation"
]) {
  if (!pmtsoulCheckpoint.reference_scenarios.includes(scenario)) {
    fail(`expected PMTSoul checkpoint reference scenario ${scenario}`);
  }
}
const pmtsoulConformance = runConformance(pmtsoulLongHorizonManifest);
if (!pmtsoulConformance.ok) {
  fail("expected PMTSoul long-horizon checkpoint reference manifest to pass conformance");
}

console.log("Checkpoint contract verification passed");
