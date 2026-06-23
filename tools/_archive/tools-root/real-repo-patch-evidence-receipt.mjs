export const REAL_REPO_PATCH_EVIDENCE_RECEIPT_STATUSES = [
  "REPO_PATCH_RECEIPT_BLOCKED_INPUT",
  "REPO_PATCH_RECEIPT_BLOCKED_EVIDENCE",
  "REPO_PATCH_RECEIPT_READY"
];

export function buildRealRepoPatchEvidenceReceipt(input) {
  const errors = [];
  if (!input.receipt_id) errors.push("Missing receipt_id");

  let status = "REPO_PATCH_RECEIPT_BLOCKED_INPUT";
  let evidenceComplete = false;

  if (!errors.length) {
    if (!input.physical_apply_proof_ready || !input.diff_truth_bound || !input.test_lane_passed || !input.rollback_drill_passed) {
      status = "REPO_PATCH_RECEIPT_BLOCKED_EVIDENCE";
    } else {
      status = "REPO_PATCH_RECEIPT_READY";
      evidenceComplete = true;
    }
  }

  return {
    schema_version: "v175.0",
    receipt_id: input.receipt_id,
    physical_apply_proof_id: input.physical_apply_proof_id,
    diff_truth_id: input.diff_truth_id,
    test_lane_id: input.test_lane_id,
    rollback_drill_id: input.rollback_drill_id,
    evidence_complete: evidenceComplete,
    real_repo_patch_receipt_ready: status === "REPO_PATCH_RECEIPT_READY",
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status, errors, timestamp: new Date().toISOString()
  };
}
