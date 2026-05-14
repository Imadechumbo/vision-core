#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const authorized = process.env.VISUAL_PATCH_AUTHORIZED === "1";
const manifestPath = "docs/VISUAL_GOLD_HARNESS_MANIFEST.json";

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function fail(message) {
  console.error("VISUAL GOLD HARNESS LOCK FAIL");
  console.error("- " + message);
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

  const currentHash = sha256(file);

  if (currentHash !== expectedHash && !authorized) {
    fail(`${file}: hash changed without VISUAL_PATCH_AUTHORIZED=1`);
  }
}

console.log("VISUAL GOLD HARNESS LOCK PASS");
process.exit(0);
