import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const pass = [];

function ok(condition, message) {
  if (condition) pass.push(message);
  else failures.push(message);
}

function includesAll(text, items, scope) {
  for (const item of items) ok(text.includes(item), `${scope}: contém ${item}`);
}

function excludesAll(text, items, scope) {
  for (const item of items) ok(!text.includes(item), `${scope}: não contém ${item}`);
}

const index = read("frontend/index.html");
const apiJs = read("frontend/assets/vision-api.js");
const agentJs = read("frontend/assets/vision-agent-local.js");
const uiJs = read("frontend/assets/vision-ui-command.js");
const ownerJs = read("frontend/assets/vision-runtime-owner.js");
const workerJs = read("worker/src/index.js");

const allowedScripts = [
  "assets/vision-api.js",
  "assets/vision-agent-local.js",
  "assets/vision-ui-command.js",
  "assets/vision-runtime-owner.js"
];
const legacyScripts = [
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
const requiredIds = [
  "missionText", "runMode", "executeBtn", "sendChatBtn", "attachBtn", "fileInput",
  "logsBox", "runtimeText", "scoreBox", "workersBox", "githubStatusBtn", "policyBtn",
  "githubPrBtn", "diffBtn", "downloadLogsBtn", "openAuthBtn", "closeAuthBtn",
  "agentOrbit", "agentMetrics", "agentContracts", "chatStream", "missionReport"
];

ok(!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(index), "Index: sem script inline de execução");
const scriptSrcs = [...index.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1].replace(/\?.*$/, ""));
ok(scriptSrcs.length === allowedScripts.length, "Index: carrega exatamente quatro scripts ativos");
ok(scriptSrcs.every((src) => allowedScripts.includes(src)), "Index: scripts ativos pertencem à lista permitida");
includesAll(index, allowedScripts, "Index");
excludesAll(index, legacyScripts, "Index");
includesAll(index, requiredIds.map((id) => `id="${id}"`), "Index IDs");
ok(index.includes("assets/vision-gold.css"), "Index: carrega vision-gold.css");

includesAll(apiJs, ["window.VisionApi", "apiUrl", "get", "post", "download", "meta[name=\"vision-api-base\"]", "replace(/\\/api\\/api\\//g"], "Vision API");

includesAll(ownerJs, [
  "window.VisionRuntimeOwner",
  "runMission",
  "stopMission",
  "status",
  "document.getElementById(\"runMode\")",
  "api().post(\"/api/run-live\"",
  "new EventSource",
  "mission_id=${encodeURIComponent(missionId)}",
  "mode === \"dry-run\"",
  "running = true",
  "releaseLock",
  "Backend não retornou mission_id real"
], "Runtime Owner");
excludesAll(ownerJs, ["?mission=", "Date.now() +", "localMission", "mission=${"], "Runtime Owner");
ok((ownerJs.match(/new EventSource/g) || []).length === 1, "Runtime Owner: apenas uma criação de EventSource");
ok(ownerJs.includes("currentEventSource.close()"), "Runtime Owner: fecha EventSource anterior/atual");
ok(ownerJs.includes("releaseLock(gold ? \"DONE\" : \"BLOCKED\")") && ownerJs.includes("releaseLock(\"BLOCKED\")"), "Runtime Owner: libera lock em done/error/fail");

excludesAll(uiJs, ["/api/run-live", "new EventSource", "create-pr", "pass_gold:true", "promotion_allowed:true"], "UI Command");
includesAll(uiJs, [
  "window.VisionChat",
  "getMissionText",
  "append",
  "clear",
  "getAttachments",
  "sendChatBtn",
  "executeBtn",
  "attachBtn",
  "githubPrBtn",
  "workerRefreshBtn",
  "githubStatusBtn",
  "policyBtn",
  "diffBtn",
  "downloadLogsBtn",
  "openAuthBtn",
  "closeAuthBtn",
  "window.VisionRuntimeOwner.runMission()",
  "/api/copilot",
  "/api/workers/status",
  "/api/github/status",
  "/api/github/automerge-policy",
  "/api/diff/preview",
  "/api/logs/download",
  "PR exige fluxo servidor autorizado e PASS GOLD real"
], "UI Command");

excludesAll(agentJs, ["/api/run-live", "new EventSource", "create-pr"], "Agent Local");
includesAll(agentJs, ["window.VisionAgentLocal", "setStage", "setRuntime", "setMetrics", "setContracts", "reset", "mission:start", "sse:open", "sse:step", "sse:gate", "sse:done", "mission:blocked", "mission:error"], "Agent Local");

includesAll(workerJs, [
  "proxyToOrigin(request, env, ctx)",
  "proxyToOrigin(missionIdOnlyRequest(request), env, ctx)",
  "pass_gold: false",
  "promotion_allowed: false",
  "authorized_server_flow_required",
  "BLOCKED_NO_EVIDENCE",
  "EVIDENCE_RECEIVED_PENDING_VERIFICATION"
], "Worker");
excludesAll(workerJs, ["stub-pr", "promotion_allowed: true", "status: \"GOLD\"", "status:\"GOLD\""], "Worker");

if (failures.length) {
  console.error("SDDF guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SDDF guard passed (${pass.length} checks).`);
