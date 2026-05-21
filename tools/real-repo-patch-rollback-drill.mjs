export const REAL_REPO_PATCH_ROLLBACK_DRILL_STATUSES = [
  "REPO_ROLLBACK_DRILL_BLOCKED_INPUT",
  "REPO_ROLLBACK_DRILL_BLOCKED_PLAN",
  "REPO_ROLLBACK_DRILL_PASS",
  "REPO_ROLLBACK_DRILL_FAIL"
];

export function buildRealRepoPatchRollbackDrill(input) {
  const errors = [];
  if (!input.rollback_drill_id) errors.push("Missing rollback_drill_id");

  let status = "REPO_ROLLBACK_DRILL_BLOCKED_INPUT";
  let rollbackPassed = false;

  if (!errors.length) {
    if (!input.rollback_plan_ready) status = "REPO_ROLLBACK_DRILL_BLOCKED_PLAN";
    else if (input.restored_hash === input.file_hash_before) {
      status = "REPO_ROLLBACK_DRILL_PASS";
      rollbackPassed = true;
    } else status = "REPO_ROLLBACK_DRILL_FAIL";
  }

  return {
    schema_version: "v174.1",
    rollback_drill_id: input.rollback_drill_id,
    rollback_plan_id: input.rollback_plan_id,
    target_file: input.target_file,
    file_hash_before: input.file_hash_before,
    restored_hash: input.restored_hash,
    rollback_drill_passed: rollbackPassed,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status, errors, timestamp: new Date().toISOString()
  };
}
