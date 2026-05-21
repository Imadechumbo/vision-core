export const REAL_REPO_PATCH_TEST_LANE_STATUSES = [
  "REPO_PATCH_TEST_LANE_BLOCKED_INPUT",
  "REPO_PATCH_TEST_LANE_BLOCKED_DIFF",
  "REPO_PATCH_TEST_LANE_PASS",
  "REPO_PATCH_TEST_LANE_FAIL"
];

export function buildRealRepoPatchTestLane(input) {
  const errors = [];
  if (!input.repo_test_lane_id) errors.push("Missing repo_test_lane_id");
  if (!input.diff_truth_id) errors.push("Missing diff_truth_id");

  let status = "REPO_PATCH_TEST_LANE_BLOCKED_INPUT";
  let testsPassed = false;

  if (!errors.length) {
    if (!input.diff_truth_bound) status = "REPO_PATCH_TEST_LANE_BLOCKED_DIFF";
    else if (input.tests_passed) {
      status = "REPO_PATCH_TEST_LANE_PASS";
      testsPassed = true;
    } else status = "REPO_PATCH_TEST_LANE_FAIL";
  }

  return {
    schema_version: "v173.1",
    repo_test_lane_id: input.repo_test_lane_id,
    diff_truth_id: input.diff_truth_id,
    tests_total: input.tests_total || 1,
    tests_passed: input.tests_passed ? 1 : 0,
    tests_failed: input.tests_passed ? 0 : 1,
    test_lane_passed: testsPassed,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status, errors, timestamp: new Date().toISOString()
  };
}
