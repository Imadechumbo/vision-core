export const REAL_REPO_PATCH_LEDGER_STATUSES = [
  "REPO_PATCH_LEDGER_EMPTY",
  "REPO_PATCH_LEDGER_READY",
  "REPO_PATCH_LEDGER_TAMPERED",
  "REPO_PATCH_LEDGER_BLOCKED_EVENT"
];

export function buildRealRepoPatchLedger(events) {
  const requiredEvents = [
    "REPO_PATCH_SCOPE_READY",
    "REPO_PATCH_PRE_STATE_READY",
    "REPO_PATCH_APPLY_READY",
    "REPO_PATCH_PHYSICAL_APPLIED",
    "REPO_PATCH_DIFF_BOUND",
    "REPO_PATCH_TEST_LANE_PASS",
    "REPO_PATCH_ROLLBACK_PLAN_READY",
    "REPO_PATCH_ROLLBACK_DRILL_PASS",
    "REPO_PATCH_RECEIPT_READY"
  ];

  const hasAllEvents = requiredEvents.every(e => events.includes(e));
  const status = hasAllEvents ? "REPO_PATCH_LEDGER_READY" : "REPO_PATCH_LEDGER_EMPTY";

  return {
    schema_version: "v175.1",
    events: events,
    required_events: requiredEvents,
    all_events_present: hasAllEvents,
    ledger_ready: status === "REPO_PATCH_LEDGER_READY",
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status, timestamp: new Date().toISOString()
  };
}
