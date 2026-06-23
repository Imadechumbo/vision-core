export const REAL_REPO_PATCH_DIFF_TRUTH_STATUSES = [
  "REPO_DIFF_TRUTH_BLOCKED_INPUT",
  "REPO_DIFF_TRUTH_BLOCKED_NO_DIFF",
  "REPO_DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE",
  "REPO_DIFF_TRUTH_BOUND"
];

export function buildRealRepoPatchDiffTruthBinding(input) {
  const errors = [];
  if (!input.diff_truth_id) errors.push("Missing diff_truth_id");
  if (!input.physical_apply_proof_id) errors.push("Missing physical_apply_proof_id");

  let status = "REPO_DIFF_TRUTH_BLOCKED_INPUT";
  if (!errors.length) {
    if (!input.actual_diff || input.actual_diff.length === 0) status = "REPO_DIFF_TRUTH_BLOCKED_NO_DIFF";
    else if (input.forbidden_files_detected) status = "REPO_DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE";
    else status = "REPO_DIFF_TRUTH_BOUND";
  }

  return {
    schema_version: "v173.0",
    diff_truth_id: input.diff_truth_id,
    physical_apply_proof_id: input.physical_apply_proof_id,
    claimed_changed_files: input.claimed_changed_files || [],
    actual_changed_files: input.actual_diff || [],
    claim_matches_diff: JSON.stringify(input.claimed_changed_files) === JSON.stringify(input.actual_diff),
    diff_truth_bound: status === "REPO_DIFF_TRUTH_BOUND",
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status, errors, timestamp: new Date().toISOString()
  };
}
