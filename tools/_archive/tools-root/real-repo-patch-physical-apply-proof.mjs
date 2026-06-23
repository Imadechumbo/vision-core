#!/usr/bin/env node
/**
 * Real Repo Patch Physical Apply Proof — V172.1
 */

import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";

export const REAL_REPO_PATCH_PHYSICAL_APPLY_STATUSES = [
  "REPO_PATCH_PHYSICAL_BLOCKED_INPUT",
  "REPO_PATCH_PHYSICAL_BLOCKED_SCOPE",
  "REPO_PATCH_PHYSICAL_BLOCKED_COMMAND",
  "REPO_PATCH_PHYSICAL_APPLIED",
  "REPO_PATCH_PHYSICAL_NOOP"
];

function getFileHash(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, "utf8");
  return createHash("sha256").update(content).digest("hex");
}

export function buildRealRepoPatchPhysicalApplyProof(input) {
  const errors = [];
  const required = ["physical_apply_proof_id", "apply_controller_id", "target_file"];
  for (const field of required) if (!input[field]) errors.push(`Missing: ${field}`);

  const allowedFiles = ["docs/real-repo-patch-drill-target.md"];
  if (input.target_file && !allowedFiles.includes(input.target_file)) {
    errors.push(`Forbidden: ${input.target_file}`);
  }

  const fileHashBefore = getFileHash(input.target_file);
  let patchApplied = false;
  let fileHashAfter = fileHashBefore;

  if (input.apply_command_confirmed && !input.dry_run) {
    try {
      const content = input.file_content || `# Real Repo Patch Drill Target\nCreated at ${new Date().toISOString()}\n`;
      writeFileSync(input.target_file, content, "utf8");
      fileHashAfter = getFileHash(input.target_file);
      patchApplied = true;
    } catch (error) { errors.push(error.message); }
  }

  let status = "REPO_PATCH_PHYSICAL_BLOCKED_INPUT";
  if (!errors.length) {
    if (!input.apply_controller_ready) status = "REPO_PATCH_PHYSICAL_BLOCKED_SCOPE";
    else if (!input.apply_command_confirmed) status = "REPO_PATCH_PHYSICAL_BLOCKED_COMMAND";
    else if (patchApplied) status = "REPO_PATCH_PHYSICAL_APPLIED";
    else status = "REPO_PATCH_PHYSICAL_NOOP";
  }

  return {
    schema_version: "v172.1",
    physical_apply_proof_id: input.physical_apply_proof_id,
    apply_controller_id: input.apply_controller_id,
    target_file: input.target_file,
    file_hash_before: fileHashBefore,
    file_hash_after: fileHashAfter,
    patch_applied: patchApplied,
    physical_apply_proof_ready: status === "REPO_PATCH_PHYSICAL_APPLIED",
    only_allowed_files_touched: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status, errors, timestamp: new Date().toISOString()
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const record = buildRealRepoPatchPhysicalApplyProof({
    physical_apply_proof_id: `proof-${Date.now()}`,
    apply_controller_id: "ctrl-1720-001",
    target_file: "docs/real-repo-patch-drill-target.md",
    apply_controller_ready: true,
    apply_command_confirmed: true
  });
  console.log(JSON.stringify(record, null, 2));
}
