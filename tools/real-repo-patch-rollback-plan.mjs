export const REAL_REPO_PATCH_ROLLBACK_PLAN_STATUSES = [
  "REPO_ROLLBACK_PLAN_BLOCKED_INPUT",
  "REPO_ROLLBACK_PLAN_BLOCKED_PRE_STATE",
  "REPO_ROLLBACK_PLAN_READY"
];

export function buildRealRepoPatchRollbackPlan(input) {
  const errors = [];
  if (!input.rollback_plan_id) errors.push("Missing rollback_plan_id");

  let status = "REPO_ROLLBACK_PLAN_BLOCKED_INPUT";
  if (!errors.length) {
    if (!input.file_hash_before) status = "REPO_ROLLBACK_PLAN_BLOCKED_PRE_STATE";
    else status = "REPO_ROLLBACK_PLAN_READY";
  }

  return {
    schema_version: "v174.0",
    rollback_plan_id: input.rollback_plan_id,
    target_file: input.target_file,
    file_hash_before: input.file_hash_before,
    file_hash_after: input.file_hash_after,
    rollback_strategy: input.file_exists_before ? "RESTORE_PREVIOUS_CONTENT" : "DELETE_CREATED_FILE",
    rollback_plan_ready: status === "REPO_ROLLBACK_PLAN_READY",
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status, errors, timestamp: new Date().toISOString()
  };
}
