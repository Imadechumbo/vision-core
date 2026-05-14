#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const authorized = process.env.VISUAL_PATCH_AUTHORIZED === "1";

const manifestPath = "docs/VISUAL_GOLD_HARNESS_MANIFEST.json";

const forbidden = [
  "vision-runtime-v297",
  "vision-v297",
  "vision-v298",
  "vision-v299",
  "vision-v2910",
  "vision-v32",
  "vision-v34",
  "vision-v35",
  "vision-v44",
  "RUN_PATH",
  "STREAM_PATH",
  "window.fetch =",
  "pass_gold:true",
  "promotion_allowed:true"
];

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function fail(msg) {
  console.error("VISUAL GOLD HARNESS LOCK FAIL");
  console.error("- " + msg);
  process.exit(2);
}

if (!existsSync(manifestPath)) {
  fail("missing " + manifestPath);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

for (const [file, expectedHash] of Object.entries(manifest)) {
  if (!existsSync(file)) {
    fail(`${file}: missing protected GOLD file`);
  }

  const body = readFileSync(file, "utf8");
  const currentHash = sha256(file);

  if (currentHash !== expectedHash && !authorized) {
    fail(`${file}: hash changed without VISUAL_PATCH_AUTHORIZED=1`);
  }

  for (const pattern of forbidden) {
    if (body.includes(pattern)) {
      fail(`${file}: forbidden legacy/fake pattern found: ${pattern}`);
    }
  }
}

const runtimeOwner = "frontend/assets/vision-runtime-owner.js";
if (existsSync(runtimeOwner)) {
  const body = readFileSync(runtimeOwner, "utf8");
  if (body.includes("EventSource")) {
    fail(`${runtimeOwner}: EventSource is forbidden in GOLD runtime owner`);
  }
}

console.log("VISUAL GOLD HARNESS LOCK PASS");
process.exit(0);
