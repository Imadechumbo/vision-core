export const REAL_REPO_PATCH_FINAL_REPORT_STATUSES = [
  "REPO_PATCH_REPORT_BLOCKED_INPUT",
  "REPO_PATCH_REPORT_BLOCKED_RECEIPT",
  "REPO_PATCH_REPORT_READY"
];

export function buildRealRepoPatchFinalReport(input) {
  const errors = [];
  if (!input.report_id) errors.push("Missing report_id");

  let status = "REPO_PATCH_REPORT_BLOCKED_INPUT";
  let reportReady = false;

  if (!errors.length) {
    if (!input.evidence_receipt_ready) status = "REPO_PATCH_REPORT_BLOCKED_RECEIPT";
    else {
      status = "REPO_PATCH_REPORT_READY";
      reportReady = true;
    }
  }

  return {
    schema_version: "v176.0",
    report_id: input.report_id,
    receipt_id: input.receipt_id,
    target_file: input.target_file,
    tests_passed: input.tests_passed,
    rollback_drill_passed: input.rollback_drill_passed,
    diff_truth_bound: input.diff_truth_bound,
    only_allowed_files_touched: input.only_allowed_files_touched,
    real_repo_patch_final_report_ready: reportReady,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status, errors, timestamp: new Date().toISOString()
  };
}
