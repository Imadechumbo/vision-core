#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const visualPatchAuthorized = process.env.VISUAL_PATCH_AUTHORIZED === "1";
const manifestPath = "docs/VISUAL_GOLD_HARNESS_MANIFEST.json";

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

function runGit(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function lines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function uniq(items) {
  return [...new Set(items)];
}

function full(file) {
  return join(root, file);
}

function read(file) {
  if (!existsSync(full(file))) {
    failures.push(`${file}: missing active protected file`);
    return "";
  }
  return readFileSync(full(file), "utf8");
}

function sha256(file) {
  return createHash("sha256")
    .update(readFileSync(full(file), "utf8").replace(/\r\n/g, "\n"), "utf8")
    .digest("hex");
}

function loadManifest() {
  if (!existsSync(full(manifestPath))) return {};
  try {
    return JSON.parse(readFileSync(full(manifestPath), "utf8"));
  } catch {
    failures.push(`${manifestPath}: invalid JSON`);
    return {};
  }
}

function baseRef() {
  const candidates = [
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "",
    process.env.GITHUB_BASE_SHA || "",
    "origin/main"
  ].filter(Boolean);

  for (const ref of candidates) {
    if (runGit(["rev-parse", "--verify", ref])) return ref;
  }
  return "";
}

function changedFiles() {
  const local = [
    ...lines(runGit(["diff", "--name-only"])),
    ...lines(runGit(["diff", "--cached", "--name-only"]))
  ];

  const base = baseRef();
  if (!base) return uniq(local);

  const mergeBase = runGit(["merge-base", "HEAD", base]) || base;
  const againstBase = lines(runGit(["diff", "--name-only", `${mergeBase}...HEAD`]));

  return uniq([...local, ...againstBase]);
}

const manifest = loadManifest();

function isGoldManifestMatch(file) {
  return Boolean(manifest[file] && existsSync(full(file)) && sha256(file) === manifest[file]);
}

const changed = changedFiles();

for (const file of lockedFiles) {
  if (changed.includes(file) && !visualPatchAuthorized && !isGoldManifestMatch(file)) {
    failures.push(`${file}: visual patch requires VISUAL_PATCH_AUTHORIZED=1 unless it matches GOLD manifest`);
  }
}

for (const file of activeFiles) {
  if (!changed.includes(file)) continue;
  if (isGoldManifestMatch(file)) continue;

  const body = read(file);

  for (const pattern of forbiddenPatterns) {
    if (body.includes(pattern)) {
      failures.push(`${file}: forbidden pattern found: ${pattern}`);
    }
  }
}

const runtimeOwner = "frontend/assets/vision-runtime-owner.js";
if (changed.includes(runtimeOwner) && !isGoldManifestMatch(runtimeOwner)) {
  const body = read(runtimeOwner);
  if (body.includes("EventSource")) {
    failures.push(`${runtimeOwner}: EventSource is forbidden in non-GOLD runtime owner changes`);
  }
}

if (failures.length) {
  console.error("FRONTEND VISUAL LOCK FAIL");
  for (const failure of failures) console.error("- " + failure);
  console.error("Changed files inspected:");
  for (const file of changed) console.error("  " + file);
  process.exit(2);
}

console.log("FRONTEND VISUAL LOCK PASS");
process.exit(0);

