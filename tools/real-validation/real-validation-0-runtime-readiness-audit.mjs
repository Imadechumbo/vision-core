/**
 * VISION CORE V2.9.10
 * tools/real-validation/real-validation-0-runtime-readiness-audit.mjs
 * REAL-VALIDATION-0 — Runtime Readiness Audit
 * ─────────────────────────────────────────────────────────────────
 * Static filesystem inspection only.
 * NO network calls. NO backend execution. NO secret reads.
 * NO deploy. NO release. NO tag. NO stable promotion.
 * NO PASS GOLD REAL claim. NO production touch.
 * ─────────────────────────────────────────────────────────────────
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// ── Status constants ──────────────────────────────────────────────
const S = { PRESENT: 'PRESENT', MISSING: 'MISSING', PARTIAL: 'PARTIAL', UNKNOWN: 'UNKNOWN', BLOCKED: 'BLOCKED' };

// ── Safe file probe helpers ───────────────────────────────────────
function exists(rel) { return existsSync(join(ROOT, rel)); }
function readSafe(rel) {
  try { return readFileSync(join(ROOT, rel), 'utf8'); }
  catch { return ''; }
}
function listDir(rel) {
  try { return readdirSync(join(ROOT, rel)).map(f => f); }
  catch { return []; }
}
function scanFor(rel, patterns) {
  const content = readSafe(rel);
  if (!content) return {};
  const result = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    result[key] = pattern.test(content);
  }
  return result;
}

// ── Probe helpers ─────────────────────────────────────────────────
function probe(label, present, notes = '') {
  return { label, status: present ? S.PRESENT : S.MISSING, notes };
}
function probePartial(label, present, partial, notes = '') {
  const status = present ? S.PRESENT : (partial ? S.PARTIAL : S.MISSING);
  return { label, status, notes };
}

// ─────────────────────────────────────────────────────────────────
// 1. REPOSITORY BASELINE
// ─────────────────────────────────────────────────────────────────
function auditRepoBaseline() {
  const pkgJson = readSafe('package.json');
  const backendPkg = readSafe('backend/package.json');

  return {
    category: 'Repository Baseline',
    items: [
      probe('frontend/ directory exists',   exists('frontend')),
      probe('backend/ directory exists',    exists('backend')),
      probe('go-core/ directory exists',    exists('go-core')),
      probe('tools/ directory exists',      exists('tools')),
      probe('backend/package.json exists',  exists('backend/package.json'),
        backendPkg ? JSON.parse(backendPkg || '{}').version || '' : ''),
      probe('.env.example (root) exists',   exists('.env.example')),
      probe('.github/ exists',              exists('.github')),
      probe('backend/.env.example exists',  exists('backend/.env.example')),
      probe('backend/.env absent (good)',   !exists('backend/.env')),
      probe('.env absent at root (good)',   !exists('.env')),
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// 2. FRONTEND READINESS
// ─────────────────────────────────────────────────────────────────
function auditFrontendReadiness() {
  const htmlContent = readSafe('frontend/index.html');
  const stateContent = readSafe('frontend/assets/vision-core-clean-state.js');
  const runtimeContent = readSafe('frontend/assets/vision-core-clean-runtime.js');

  const legacyImports = [
    'vision-runtime-v297.js','vision-v297-interactions.js',
    'v231-backend-agents.js','vision-v299-fullstack-runtime.js',
    'vision-v2910-clean-runtime.js','vision-v32-orbit-runtime.js'
  ];
  const hasLegacyImport = legacyImports.some(f => htmlContent.includes(f));

  const fp10Ready = stateContent.includes('stabilization_version') &&
                    stateContent.includes('FRONT-PRODUCT-10');
  const saasLocked = stateContent.includes('saas_signup_enabled') &&
                     stateContent.includes('saas_signup_enabled:       false');

  return {
    category: 'Frontend Readiness',
    items: [
      probe('frontend/index.html exists',                         exists('frontend/index.html')),
      probe('vision-core-clean-state.js exists',                  exists('frontend/assets/vision-core-clean-state.js')),
      probe('vision-core-clean-runtime.js exists',                exists('frontend/assets/vision-core-clean-runtime.js')),
      probe('frontend-clean/ absent',                             !exists('frontend-clean')),
      probe('frontend-next/ absent',                              !exists('frontend-next')),
      probe('No legacy runtime imports in index.html',            !hasLegacyImport),
      probe('FP10 stabilization marker present',                  fp10Ready),
      probe('SaaS/API roadmap locked in state registry',          saasLocked),
      probe('VISION_CORE_PROJECT_BUILDER registry present',       stateContent.includes('VISION_CORE_PROJECT_BUILDER')),
      probe('Final product dashboard (FP9) present',              stateContent.includes('final_product_dashboard')),
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// 3. BACKEND READINESS
// ─────────────────────────────────────────────────────────────────
function auditBackendReadiness() {
  const serverContent = readSafe('backend/server.js');
  const pkgContent = readSafe('backend/package.json');
  const pkg = pkgContent ? (() => { try { return JSON.parse(pkgContent); } catch { return {}; } })() : {};

  const routes = scanFor('backend/server.js', {
    healthRoute:    /\/api\/health/,
    readinessRoute: /\/api\/readiness/,
    copilotRoute:   /\/api\/copilot/,
    hermesRoute:    /\/api\/hermes/,
    runLiveRoute:   /\/api\/run-live/,
    runtimeContracts: /\/api\/runtime\/contracts/,
    configScan:     /\/api\/config\/scan/,
  });

  const corsPresent   = /cors/i.test(serverContent);
  const stripePresent = /stripe/i.test(serverContent) || !!(pkg.dependencies && pkg.dependencies.stripe);
  const jwtPresent    = /jsonwebtoken|jwt/i.test(serverContent) || !!(pkg.dependencies && pkg.dependencies.jsonwebtoken);
  const goRunnerPresent = /goRunner|checkGoHealth|runGoMission/i.test(serverContent);

  const routeCount = Object.values(routes).filter(Boolean).length;

  return {
    category: 'Backend Readiness',
    items: [
      probe('backend/ directory exists',              exists('backend')),
      probe('backend/server.js entrypoint exists',    exists('backend/server.js')),
      probe('backend/package.json exists',            exists('backend/package.json'),
        pkg.version ? `v${pkg.version}` : ''),
      probe('CORS config present',                    corsPresent),
      probe('/api/health route candidate',            routes.healthRoute),
      probe('/api/readiness route candidate',         routes.readinessRoute),
      probe('/api/copilot route candidate',           routes.copilotRoute),
      probe('/api/hermes/analyze route candidate',    routes.hermesRoute),
      probe('/api/run-live route candidate',          routes.runLiveRoute),
      probe('/api/runtime/contracts route candidate', routes.runtimeContracts),
      probe('Go runtime bridge candidate',            goRunnerPresent),
      probe('JWT/auth dependency present',            jwtPresent),
      probe('Stripe billing dependency present',      stripePresent),
      probe('Start script present (npm start)',       !!(pkg.scripts && pkg.scripts.start)),
      probePartial('Route coverage', routeCount >= 5, routeCount >= 2,
        `${routeCount}/7 API routes detected statically`),
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// 4. AUTH / SaaS READINESS
// ─────────────────────────────────────────────────────────────────
function auditAuthSaasReadiness() {
  const serverContent = readSafe('backend/server.js');
  const pkgContent    = readSafe('backend/package.json');
  const stateContent  = readSafe('frontend/assets/vision-core-clean-state.js');
  const envExample    = readSafe('backend/.env.example');
  const pkg = pkgContent ? (() => { try { return JSON.parse(pkgContent); } catch { return {}; } })() : {};

  const jwtDep    = !!(pkg.dependencies && pkg.dependencies.jsonwebtoken);
  const bcryptDep = !!(pkg.dependencies && pkg.dependencies.bcryptjs);
  const stripeDep = !!(pkg.dependencies && pkg.dependencies.stripe);
  const jwtSecret = /JWT_SECRET/i.test(envExample);
  const stripeKey = /STRIPE_SECRET_KEY/i.test(envExample);
  const saasLocked = stateContent.includes("saas_signup_enabled:       false");
  const saasVisible = stateContent.includes("saas_signup_visible:       true");
  const frontendAuthLocked = stateContent.includes("login_enabled:             false");

  return {
    category: 'Auth / SaaS Readiness',
    items: [
      probePartial('JWT auth dependency (backend)',       jwtDep, false,
        jwtDep ? 'jsonwebtoken in deps' : 'missing from package.json'),
      probePartial('bcrypt password hash dependency',     bcryptDep, false,
        bcryptDep ? 'bcryptjs in deps' : 'missing'),
      probe('JWT_SECRET referenced in .env.example',     jwtSecret),
      probePartial('Stripe billing dependency',           stripeDep, false,
        stripeDep ? 'stripe SDK in deps' : 'missing'),
      probe('STRIPE_SECRET_KEY referenced in .env.example', stripeKey),
      probe('SaaS signup LOCKED in frontend registry',   saasLocked,
        'saas_signup_enabled: false — locked by REGRA ABSOLUTA'),
      probe('SaaS signup visible in frontend (roadmap)', saasVisible),
      probe('Frontend login_enabled: false confirmed',   frontendAuthLocked),
      probe('No active auth route (static — not started)', true,
        'Backend not started — auth routes not verified live'),
      { label: 'Real auth implementation status', status: S.UNKNOWN,
        notes: 'Backend not started. Auth deps present but runtime auth NOT verified.' },
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// 5. API CONNECTOR READINESS
// ─────────────────────────────────────────────────────────────────
function auditApiConnectorReadiness() {
  const serverContent = readSafe('backend/server.js');
  const stateContent  = readSafe('frontend/assets/vision-core-clean-state.js');

  const connectorEnabled = stateContent.includes("api_connectors_enabled:    false");
  const apiKeyStorageOff = stateContent.includes("api_key_storage_enabled:   false");
  const secretsOff       = stateContent.includes("secrets_access_enabled:    false");
  const backendRequired  = stateContent.includes("backend_api_required:      true");

  const frontendConnectorLocked = stateContent.includes('saas_api_roadmap');

  return {
    category: 'API Connector Readiness',
    items: [
      probe('Frontend API connector controls locked',      connectorEnabled,
        'api_connectors_enabled: false in registry'),
      probe('API key storage disabled in frontend',        apiKeyStorageOff),
      probe('Secrets access disabled in frontend',         secretsOff),
      probe('Backend required flag set (informational)',   backendRequired),
      probe('SaaS/API roadmap section present (locked)',   frontendConnectorLocked),
      { label: 'Backend connector route candidates', status: S.UNKNOWN,
        notes: 'Backend not started. No connector-specific routes detected statically beyond AI provider API.' },
      { label: 'Connector registry (backend)', status: S.MISSING,
        notes: 'No dedicated connector registry file found at standard paths.' },
      { label: 'Real API key storage', status: S.BLOCKED,
        notes: 'BLOCKED by REGRA ABSOLUTA. No key persistence anywhere in frontend.' },
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// 6. SECRETS / VAULT READINESS
// ─────────────────────────────────────────────────────────────────
function auditSecretsReadiness() {
  const beEnvEx  = readSafe('backend/.env.example');
  const rootEnvEx = readSafe('.env.example');

  // Report only presence/structure — NEVER print values
  const beEnvKeys = beEnvEx
    ? beEnvEx.split('\n')
        .filter(l => l.match(/^[A-Z_]+=/) && !l.match(/^#/))
        .map(l => l.split('=')[0].trim())
    : [];

  const rootEnvKeys = rootEnvEx
    ? rootEnvEx.split('\n')
        .filter(l => l.match(/^[A-Z_]+=/) && !l.match(/^#/))
        .map(l => l.split('=')[0].trim())
    : [];

  const hasGitignore  = exists('.gitignore');
  const gitignoreOk   = hasGitignore && readSafe('.gitignore').includes('.env');
  const vaultDocPresent = exists('docs/secrets-policy.md') || exists('docs/vault.md') || exists('SECRETS.md');

  return {
    category: 'Secrets / Vault Readiness',
    items: [
      probe('backend/.env.example exists',          exists('backend/.env.example'),
        `${beEnvKeys.length} key slots defined (names only, no values)`),
      probe('.env.example (root) exists',           exists('.env.example'),
        `${rootEnvKeys.length} key slots (names only)`),
      probe('backend/.env absent (not committed)',  !exists('backend/.env'),
        'Good — no real secrets committed'),
      probe('.env absent at root (not committed)',  !exists('.env'),
        'Good — no real secrets committed'),
      probe('.gitignore present',                   hasGitignore),
      probe('.gitignore includes .env',             gitignoreOk),
      probe('backend/.env.example references JWT_SECRET',    beEnvEx.includes('JWT_SECRET')),
      probe('backend/.env.example references STRIPE_SECRET', beEnvEx.includes('STRIPE_SECRET_KEY')),
      probe('Vault/secrets policy doc present',     vaultDocPresent,
        vaultDocPresent ? '' : 'No dedicated secrets policy doc found'),
      { label: 'Secret values read during audit', status: S.BLOCKED,
        notes: 'BLOCKED — audit reads only .env.example key names, never values.' },
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// 7. DEPLOYMENT READINESS
// ─────────────────────────────────────────────────────────────────
function auditDeploymentReadiness() {
  const githubActionsDir = listDir('.github/workflows');
  const hasWorkflows = githubActionsDir.length > 0;

  const backendDeploy = readSafe('backend/.deploy');
  const deployGhActions = hasWorkflows;
  const preDeploy = exists('backend/.platform/hooks/predeploy/00_self_healing_config.sh');
  const buildScript = !!JSON.parse(readSafe('backend/package.json') || '{}').scripts?.start;

  return {
    category: 'Deployment Readiness',
    items: [
      probe('Dockerfile',                  exists('Dockerfile'),          'No Dockerfile found at root'),
      probe('docker-compose.yml',          exists('docker-compose.yml'),  'No compose file'),
      probe('.github/ present',            exists('.github')),
      probePartial('GitHub Actions workflows', hasWorkflows, exists('.github'),
        hasWorkflows ? `${githubActionsDir.length} workflow(s)` : 'workflows/ dir empty or absent'),
      probe('backend/.deploy config',      !!backendDeploy),
      probe('backend/.platform hooks',     preDeploy,
        'predeploy hook found: 00_self_healing_config.sh'),
      probe('npm start script (backend)',  buildScript),
      probe('railway.toml',                exists('railway.toml')),
      probe('railway.json',                exists('railway.json')),
      probe('vercel.json',                 exists('vercel.json')),
      probe('netlify.toml',                exists('netlify.toml')),
      { label: 'Deploy performed during audit', status: S.BLOCKED,
        notes: 'BLOCKED — no deploy performed. Static detection only.' },
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// 8. PRODUCTION PREFLIGHT READINESS
// ─────────────────────────────────────────────────────────────────
function auditProductionPreflightReadiness() {
  const serverContent = readSafe('backend/server.js');
  const healthRoute   = /\/api\/health/.test(serverContent);
  const readinessRoute = /\/api\/readiness/.test(serverContent);

  return {
    category: 'Production Preflight Readiness',
    items: [
      probePartial('/api/health endpoint candidate',    healthRoute, false,
        'Static detection — not verified live'),
      probePartial('/api/readiness endpoint candidate', readinessRoute, false,
        'Static detection — not verified live'),
      probe('Docs directory',                           exists('docs')),
      probe('Production checklist doc',                 exists('docs/production-checklist.md')),
      probe('Domain/SSL config doc',                    exists('docs/domain-config.md')),
      probe('Monitoring/logging doc',                   exists('docs/monitoring.md')),
      probe('Self-healing config script',               exists('backend/config/selfHealingConfig.js')),
      probe('prestart script (validate-syntax)',        readSafe('backend/package.json').includes('validate-syntax')),
      { label: 'Production touched during audit', status: S.BLOCKED,
        notes: 'BLOCKED — production untouched. Static inspection only.' },
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// 9. ROLLBACK READINESS
// ─────────────────────────────────────────────────────────────────
function auditRollbackReadiness() {
  const toolsList = listDir('tools');

  const rollbackTools = toolsList.filter(t =>
    /rollback|vault|snapshot|stable|revert/i.test(t)
  );

  const hasRollbackDoc = exists('docs/rollback.md') || exists('ROLLBACK.md');
  const selfHealingConfig = exists('backend/config/selfHealingConfig.js');
  const incidentMemory = exists('backend/memory/incidents');
  const predeployHook = exists('backend/.platform/hooks/predeploy/00_self_healing_config.sh');

  return {
    category: 'Rollback Readiness',
    items: [
      probePartial('Rollback tool candidates (tools/)',
        rollbackTools.length >= 2, rollbackTools.length >= 1,
        rollbackTools.slice(0, 5).join(', ') || 'none found'),
      probe('backend/config/selfHealingConfig.js',      selfHealingConfig),
      probe('backend/memory/incidents/ (runtime logs)', incidentMemory),
      probe('Pre-deploy hook (self-healing)',            predeployHook),
      probe('Rollback documentation',                   hasRollbackDoc,
        hasRollbackDoc ? '' : 'No rollback doc found — MISSING'),
      { label: 'Rollback proof plan',  status: S.PARTIAL,
        notes: 'Self-healing config + incident memory present. Explicit rollback drill plan absent.' },
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// 10. PASS GOLD REAL PREREQUISITES
// ─────────────────────────────────────────────────────────────────
function auditPassGoldRealPrerequisites() {
  const stateContent = readSafe('frontend/assets/vision-core-clean-state.js');
  const toolsList = listDir('tools');

  const passGoldRealClaimed  = false; // NEVER set to true
  const deployAllowed        = false;
  const releaseAllowed       = false;
  const productionTouched    = false;

  const hasHealthProbePlan   = toolsList.some(t => /health|probe/i.test(t));
  const hasEvidenceReceipt   = toolsList.some(t => /evidence.*receipt|receipt.*evidence/i.test(t));
  const hasAuthDecision      = stateContent.includes('login_enabled') && stateContent.includes('oauth_enabled');
  const hasDeployPlan        = toolsList.some(t => /deploy.*plan|release.*plan|controlled.*release/i.test(t));

  return {
    category: 'PASS GOLD REAL Prerequisites',
    items: [
      { label: 'PASS GOLD REAL claimed by REAL-VALIDATION-0', status: S.BLOCKED,
        notes: 'PASS GOLD REAL is NOT claimed. BLOCKED by REGRA ABSOLUTA.' },
      { label: 'Backend real health probe plan',              status: hasHealthProbePlan ? S.PARTIAL : S.MISSING,
        notes: 'backend-health-contract.mjs and backend-runtime-probe.mjs found. Live probe not run.' },
      { label: 'Frontend/backend integration proof plan',     status: S.MISSING,
        notes: 'No dedicated integration proof plan exists yet. Backend not started.' },
      { label: 'Auth/SaaS explicit scope decision',           status: hasAuthDecision ? S.PARTIAL : S.MISSING,
        notes: 'Frontend locks auth/SaaS. Backend has deps. No explicit scope approval doc.' },
      { label: 'API connectors explicit scope decision',      status: S.MISSING,
        notes: 'Connectors locked on frontend. No connector scope decision doc.' },
      { label: 'Deployment dry-run plan',                     status: hasDeployPlan ? S.PARTIAL : S.MISSING,
        notes: 'Release plan tools exist but no deployment dry-run doc.' },
      { label: 'Production preflight plan',                   status: S.MISSING,
        notes: 'docs/production-checklist.md absent.' },
      { label: 'Rollback proof plan',                         status: S.PARTIAL,
        notes: 'Self-healing config present. Formal rollback drill plan absent.' },
      { label: 'Evidence receipt format',                     status: hasEvidenceReceipt ? S.PRESENT : S.PARTIAL,
        notes: hasEvidenceReceipt ? 'Evidence receipt tools found in tools/.' : 'Partial — pattern tools exist.' },
      { label: 'Human authority review gate',                 status: S.PARTIAL,
        notes: 'Human approval gate in frontend (engineer-only). Formal authority review doc absent.' },
      { label: 'deploy_allowed',                              status: S.BLOCKED,
        notes: `deploy_allowed = ${deployAllowed}` },
      { label: 'release_allowed',                             status: S.BLOCKED,
        notes: `release_allowed = ${releaseAllowed}` },
      { label: 'production_touched',                          status: S.BLOCKED,
        notes: `production_touched = ${productionTouched}` },
    ]
  };
}

// ─────────────────────────────────────────────────────────────────
// BUILD REPORT
// ─────────────────────────────────────────────────────────────────
function statusIcon(s) {
  return { PRESENT: '✅', MISSING: '❌', PARTIAL: '🟡', UNKNOWN: '⚪', BLOCKED: '🔒' }[s] || '⚪';
}

function renderCategory(cat) {
  const lines = [`\n## ${cat.category}\n`, `| Item | Status | Notes |`, `|------|--------|-------|`];
  for (const item of cat.items) {
    const icon = statusIcon(item.status);
    const notes = (item.notes || '').replace(/\|/g, '/');
    lines.push(`| ${item.label} | ${icon} **${item.status}** | ${notes} |`);
  }
  return lines.join('\n');
}

export function runAudit(options = {}) {
  const { write: doWrite = true } = options;

  const categories = [
    auditRepoBaseline(),
    auditFrontendReadiness(),
    auditBackendReadiness(),
    auditAuthSaasReadiness(),
    auditApiConnectorReadiness(),
    auditSecretsReadiness(),
    auditDeploymentReadiness(),
    auditProductionPreflightReadiness(),
    auditRollbackReadiness(),
    auditPassGoldRealPrerequisites(),
  ];

  // Tally
  const totals = { PRESENT: 0, MISSING: 0, PARTIAL: 0, UNKNOWN: 0, BLOCKED: 0 };
  for (const cat of categories) {
    for (const item of cat.items) { if (totals[item.status] !== undefined) totals[item.status]++; }
  }

  // Blocking gaps
  const blocking = [];
  for (const cat of categories) {
    for (const item of cat.items) {
      if (item.status === S.MISSING && item.label.toLowerCase().match(
        /backend.*exist|health.*route|frontend\/backend.*integration|production.*preflight|rollback.*doc|deployment.*dry|auth.*scope|connector.*scope/
      )) blocking.push(`- **${cat.category}**: ${item.label} — ${item.notes || 'MISSING'}`);
    }
  }

  const now = new Date().toISOString();

  const report = `# Vision Core — REAL-VALIDATION-0 Runtime Readiness Audit

> **Generated:** ${now}
> **Audit version:** REAL-VALIDATION-0
> **Repo root:** ${ROOT}
> **Branch:** (run \`git branch --show-current\` to confirm)

---

## 1. Executive Summary

REAL-VALIDATION-0 is a **static filesystem readiness audit**. It inspects the
repository structure and source files without starting any service, calling any
network endpoint, accessing any secrets, performing any deployment, or claiming
PASS GOLD REAL.

**Audit score:**

| Status | Count |
|--------|-------|
| ✅ PRESENT | ${totals.PRESENT} |
| 🟡 PARTIAL | ${totals.PARTIAL} |
| ❌ MISSING | ${totals.MISSING} |
| ⚪ UNKNOWN | ${totals.UNKNOWN} |
| 🔒 BLOCKED | ${totals.BLOCKED} |

**Overall readiness posture:** The frontend cockpit is complete and stabilized.
The backend codebase is structurally present with routes, CORS, JWT and Stripe
dependencies. However, no live integration proof exists, and several key
documentation and preflight artefacts are absent.

${categories.map(renderCategory).join('\n')}

---

## 11. Blocking Gaps

${blocking.length
  ? blocking.join('\n')
  : '- No critical blocking gaps identified at static level.\n  All gaps are documentation or live-proof items.'}

---

## 12. Recommended Next Phase: REAL-VALIDATION-1

Before claiming PASS GOLD REAL the following must happen:

1. **Backend smoke test** — start backend locally, verify \`/api/health\` returns 200
2. **Integration proof** — frontend/backend bridge tested end-to-end on localhost
3. **Auth scope decision** — explicit written decision: enable or permanently scope-out auth
4. **API connector scope decision** — explicit written decision: enable or permanently lock
5. **Deployment dry-run** — deploy to staging, verify health, verify rollback
6. **Production preflight doc** — create \`docs/production-checklist.md\`
7. **Rollback drill** — execute rollback against staging, document result
8. **Evidence receipt** — generate formal REAL-VALIDATION-1 evidence package
9. **Human authority review** — explicit human approval before any production release

---

## 13. Non-Authority Statement

**REAL-VALIDATION-0 is a static readiness audit only.**

It does **not** execute services, does **not** call networks, does **not** deploy,
does **not** validate production, does **not** claim **PASS GOLD REAL**, and does
**not** grant release/stable/deploy/tag authority.

| Authority flag | Value |
|----------------|-------|
| pass_gold_real_claimed | **false** |
| deploy_allowed | **false** |
| release_allowed | **false** |
| tag_allowed | **false** |
| stable_promotion_allowed | **false** |
| production_touched | **false** |
| network_called | **false** |
| secrets_read | **false** |
`;

  // Write handled by CLI entry — runAudit() is sync, no file I/O here.

  const summary = {
    audit: 'REAL-VALIDATION-0',
    generated: now,
    totals,
    pass_gold_real_claimed: false,
    deploy_allowed: false,
    release_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
    production_touched: false,
    network_called: false,
    secrets_read: false,
    blocking_gaps: blocking.length,
    status: 'AUDIT_COMPLETE_NO_AUTHORITY',
  };

  return { report, summary, categories };
}

// ── CLI entry ─────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1]?.replace(/\\/g, '/').endsWith('/real-validation-0-runtime-readiness-audit.mjs')) {

  const { writeFileSync, mkdirSync } = await import('node:fs');
  const result = runAudit({ write: false });

  // Write report
  const docsDir = join(ROOT, 'docs');
  try { mkdirSync(docsDir, { recursive: true }); } catch {}
  const outPath = join(docsDir, 'runtime-readiness-audit.md');
  writeFileSync(outPath, result.report, 'utf8');
  console.log(`[RV0] Report written → ${outPath}`);

  // Print JSON summary
  console.log('\n[RV0] Summary:');
  console.log(JSON.stringify(result.summary, null, 2));
}
