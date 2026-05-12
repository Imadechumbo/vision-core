import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const fail = (message) => {
  console.error(`SDDF Guard failed: ${message}`);
  process.exitCode = 1;
};

const index = read("frontend/index.html");
const owner = read("frontend/assets/vision-runtime-owner.js");
const agent = read("frontend/assets/vision-agent-local.js");
const css = read("frontend/assets/vision-gold.css");

const legacyRuntimeFiles = [
  "vision-runtime-v297.js",
  "vision-v297-interactions.js",
  "vision-v298-command-chat.js",
  "vision-v299-fullstack-runtime.js",
  "vision-v2910-clean-runtime.js",
  "vision-v32-orbit-runtime.js",
  "vision-v34-enterprise.js",
  "vision-v35-telemetry.js",
  "vision-v44-runtime-consistency.js"
];

for (const legacy of legacyRuntimeFiles) {
  if (index.includes(legacy)) fail(`legacy runtime loaded in index: ${legacy}`);
}

const scriptSrcs = [...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
const allowedScripts = [
  "assets/vision-api.js",
  "assets/vision-agent-local.js",
  "assets/vision-ui-command.js",
  "assets/vision-runtime-owner.js"
];
if (JSON.stringify(scriptSrcs) !== JSON.stringify(allowedScripts)) {
  fail(`index scripts must be exactly ${allowedScripts.join(", ")} but found ${scriptSrcs.join(", ")}`);
}

if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(index)) fail("inline executable script found in index");
if (!index.includes('rel="stylesheet" href="assets/vision-gold.css"')) fail("vision-gold.css is not loaded");

const requiredIds = [
  "missionText",
  "runMode",
  "executeBtn",
  "sendChatBtn",
  "attachBtn",
  "fileInput",
  "logsBox",
  "runtimeText",
  "scoreBox",
  "workersBox",
  "githubStatusBtn",
  "policyBtn",
  "githubPrBtn",
  "diffBtn",
  "downloadLogsBtn",
  "openAuthBtn",
  "closeAuthBtn",
  "agentOrbit",
  "agentMetrics",
  "agentContracts",
  "chatStream",
  "missionReport"
];
for (const id of requiredIds) {
  if (!new RegExp(`id=["']${id}["']`).test(index)) fail(`required id missing: #${id}`);
}

const requiredClasses = [
  "vision-eye-logo",
  "vision-eye-core",
  "vision-eye-pulse",
  "vision-brand-title",
  "vision-brand-subtitle"
];
for (const className of requiredClasses) {
  if (!index.includes(className)) fail(`required visual class missing in index: .${className}`);
  if (!css.includes(`.${className}`)) fail(`required visual class missing in CSS: .${className}`);
}

if (/<img\b/i.test(index) || /<svg\b/i.test(index) || /\.svg["')]/i.test(index + css)) {
  fail("logo must be CSS/HTML only; image or SVG reference found");
}

const frontendRuntimeFiles = [
  "frontend/assets/vision-api.js",
  "frontend/assets/vision-agent-local.js",
  "frontend/assets/vision-ui-command.js"
];
for (const file of frontendRuntimeFiles) {
  const contents = read(file);
  if (contents.includes("/api/run-live")) fail(`/api/run-live used outside runtime owner: ${file}`);
  if (/new\s+EventSource\s*\(/.test(contents)) fail(`SSE opened outside runtime owner: ${file}`);
}

if (!owner.includes("renderMissionReport")) fail("runtime owner must render mission report");
if (!owner.includes("missionReport")) fail("runtime owner does not target #missionReport");
if (!owner.includes("/api/run-live")) fail("runtime owner does not own /api/run-live call");
if (!/new\s+EventSource\s*\(/.test(owner)) fail("runtime owner does not own SSE EventSource");
if (!owner.includes("evidenceReceiptIsValid") || !owner.includes("pass_gold === true") || !owner.includes("promotion_allowed === true")) {
  fail("PASS GOLD gate must require pass_gold, promotion_allowed and valid evidence receipt");
}
if (!agent.includes("hasGoldEvidence") || !agent.includes("evidenceReceiptIsValid")) fail("agent local must gate GOLD stage on evidence");
if (!owner.includes("INCOMPLETE / BLOCKED — evidence missing")) fail("missing blocked evidence report text");
if (/promotion_allowed\s*:\s*true/.test(owner + agent) || /promotion_allowed["']?\s*,\s*true/.test(owner + agent)) {
  fail("frontend must not manufacture promotion_allowed:true");
}

if (process.exitCode) process.exit(process.exitCode);
console.log("SDDF Guard passed: clean V13.2 Gold UI with runtime owner evidence gate.");
