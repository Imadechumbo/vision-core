import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const fail = (message) => {
  console.error(`SDDF GUARD FAIL: ${message}`);
  process.exitCode = 1;
};

const index = read("frontend/index.html");
const uiCommand = read("frontend/assets/vision-ui-command.js");
const spec = read("SDDF_SPEC.md");

const activeScriptSrcs = [...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
const activeScriptBase = activeScriptSrcs.map((src) => src.replace(/\?.*$/, ""));

const expectedScripts = [
  "assets/v23-ui-system.js",
  "assets/v231-backend-agents.js",
  "assets/vision-ui-command.js?v=131",
  "assets/vision-runtime-owner.js?v=131"
];

const legacyRuntimeBases = [
  "assets/vision-runtime-v297.js",
  "assets/vision-v297-interactions.js",
  "assets/vision-v298-command-chat.js",
  "assets/vision-v299-fullstack-runtime.js",
  "assets/vision-v2910-clean-runtime.js",
  "assets/vision-v32-orbit-runtime.js",
  "assets/vision-v34-enterprise.js",
  "assets/vision-v35-telemetry.js",
  "assets/vision-v44-runtime-consistency.js"
];

for (const src of legacyRuntimeBases) {
  if (activeScriptBase.includes(src)) fail(`index.html carrega runtime legado ativo: ${src}`);
}

for (const required of expectedScripts) {
  const count = activeScriptSrcs.filter((src) => src === required).length;
  if (count !== 1) fail(`index.html deve carregar ${required} exatamente uma vez; encontrado ${count}`);
}

const ownerCount = activeScriptBase.filter((src) => src === "assets/vision-runtime-owner.js").length;
const commandCount = activeScriptBase.filter((src) => src === "assets/vision-ui-command.js").length;
if (ownerCount !== 1) fail(`vision-runtime-owner.js deve ocorrer exatamente uma vez; encontrado ${ownerCount}`);
if (commandCount !== 1) fail(`vision-ui-command.js deve ocorrer exatamente uma vez; encontrado ${commandCount}`);

const forbiddenIndexTokens = [
  "RUN_PATH",
  "STREAM_PATH",
  "EventSource",
  "fetch('/api/run-live'",
  "executeBtn.onclick",
  "pass_gold",
  "promotion_allowed"
];
for (const token of forbiddenIndexTokens) {
  if (index.includes(token)) fail(`index.html contém token bloqueado: ${token}`);
}

const forbiddenUiTokens = [
  "EventSource",
  "/api/run-live",
  "/api/github/create-pr",
  "pass_gold",
  "promotion_allowed"
];
for (const token of forbiddenUiTokens) {
  if (uiCommand.includes(token)) fail(`vision-ui-command.js contém responsabilidade proibida: ${token}`);
}

const requiredSpecTokens = [
  "runtime_ownership_gate",
  "report_truth_gate",
  "post_deploy_completion_gate",
  "observed_final_state_gate",
  "estados oficiais de missão",
  "regra de novos runtimes",
  "TechNetGame Marvel Tokon",
  "proibições absolutas",
  "V13.1"
];
for (const token of requiredSpecTokens) {
  if (!spec.includes(token)) fail(`SDDF_SPEC.md perdeu conteúdo obrigatório: ${token}`);
}

if (!process.exitCode) console.log("SDDF GUARD PASS: runtime owner único e SPEC V8.1+V13.1 preservadas.");
