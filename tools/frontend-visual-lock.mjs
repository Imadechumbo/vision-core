#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

const visualPatchAuthorized = process.env.VISUAL_PATCH_AUTHORIZED === "1";

const lockedFiles = [
  "frontend/index.html",
  "frontend/assets/vision-gold.css"
];

const activeFiles = [
  "frontend/index.html",
  "frontend/assets/vision-agent-local.js",
  "frontend/assets/vision-api.js",
  "frontend/assets/vision-chat.js",
  "frontend/assets/vision-runtime-owner.js",
  "frontend/assets/vision-report.js"
];

const forbiddenPatterns = [
  "RUN_PATH",
  "STREAM_PATH",
  "window.fetch =",
  "pass_gold:true",
  "promotion_allowed:true"
];

function changedFiles(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function uniq(items) {
  return [...new Set(items)];
}

function read(file) {
  const full = join(root, file);
  if (!existsSync(full)) {
    failures.push(`${file}: missing active protected file`);
    return "";
  }
  return readFileSync(full, "utf8");
}

const changed = uniq([
  ...changedFiles(["diff", "--name-only"]),
  ...changedFiles(["diff", "--cached", "--name-only"])
]);

for (const file of lockedFiles) {
  if (changed.includes(file) && !visualPatchAuthorized) {
    failures.push(`${file}: visual patch requires VISUAL_PATCH_AUTHORIZED=1`);
  }
}

for (const file of activeFiles) {
  if (!changed.includes(file)) continue;

  const body = read(file);

  for (const pattern of forbiddenPatterns) {
    if (body.includes(pattern)) {
      failures.push(`${file}: forbidden pattern found: ${pattern}`);
    }
  }
}

const runtimeOwner = "frontend/assets/vision-runtime-owner.js";
if (changed.includes(runtimeOwner)) {
  const body = read(runtimeOwner);
  if (body.includes("EventSource")) {
    failures.push(`${runtimeOwner}: EventSource is forbidden in active runtime owner changes`);
  }
}

if (failures.length) {
  console.error("FRONTEND VISUAL LOCK FAIL");
  for (const failure of failures) console.error("- " + failure);
  process.exit(2);
}

console.log("FRONTEND VISUAL LOCK PASS");
process.exit(0);
