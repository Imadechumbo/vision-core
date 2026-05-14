#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   PI HARNESS v5 — VISION CORE AUTONOMOUS EXECUTOR                   ║
 * ║   Frontend + Backend + LLM + Evidence + PASS GOLD                   ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║   node tools/pi-harness.mjs                                         ║
 * ║   GROQ_API_KEY obrigatória para escalada LLM em D4/D5               ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║   POLÍTICA DE ESCALADA                                               ║
 * ║   D0-D3 → resolve sozinho                                            ║
 * ║   D4    → 3 tentativas sozinho → LLM                                 ║
 * ║   D5    → LLM na primeira falha                                      ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║   REGRAS ABSOLUTAS                                                   ║
 * ║   • Não altera visual aprovado (V8 Gold)                             ║
 * ║   • Não toca em index.html                                           ║
 * ║   • Não cria PASS GOLD fake                                          ║
 * ║   • Não libera deploy sem PASS GOLD real                             ║
 * ║   • Relatório único no final — zero interrupções                     ║
 * ║   • PASS GOLD só com evidence_receipt real do backend                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

const ROOT         = resolve(process.cwd());
const ARGS         = process.argv.slice(2);
const FLAG         = f => ARGS.includes(f);
const ARG          = p => { const a = ARGS.find(x => x.startsWith(p)); return a ? a.split('=')[1] : null; };

const DRY_RUN      = FLAG('--dry-run');
const SKIP_PUSH    = FLAG('--skip-push');
const SKIP_PULL    = FLAG('--skip-pull');
const MAX_ATTEMPTS = parseInt(ARG('--max-attempts') || '8');
const MAX_LAYER    = parseInt(ARG('--max-layer')    || '9');
const MAX_LLM      = parseInt(ARG('--max-llm')      || '4');

const GROQ_KEY     = process.env.GROQ_API_KEY || '';
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const API_BASE     = 'https://visioncore-api-gateway.weiganlight.workers.dev';

// ═══════════════════════════════════════════════════════════════════
// RELATÓRIO ACUMULADO — zero output até o final
// ═══════════════════════════════════════════════════════════════════

const REPORT = {
  phases:   [],   // { phase, attempt, result, layers, duration, patches, fixes, evidence, errors }
  llmCalls: [],   // { attempt, chars, patches }
  evidence: [],   // linhas finais de evidência
  auditLog: [],   // log completo para debug
  summary:  {},   // campos finais
};

let llmCount = 0;

function audit(msg)    { REPORT.auditLog.push(`  ${msg}`); }
function addEvidence(m){ REPORT.evidence.push(String(m)); }
function sleep(ms)     { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════════
// SHELL
// ═══════════════════════════════════════════════════════════════════

function sh(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim(); }
  catch { return null; }
}

function shFull(cmd, timeout = 90000) {
  const r = spawnSync(cmd, { shell: true, cwd: ROOT, encoding: 'utf8', timeout });
  return { ok: r.status === 0, out: (r.stdout||'').trim(), err: (r.stderr||'').trim() };
}

function read(rel) {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

function write(rel, content) {
  if (DRY_RUN) { audit(`DRY_RUN skip write: ${rel}`); return false; }
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, 'utf8');
  return true;
}

function nodeCheck(rel) {
  if (!existsSync(join(ROOT, rel))) return null;
  return shFull(`node --check "${join(ROOT, rel)}"`).ok;
}

function guardPass() {
  if (!existsSync(join(ROOT, 'tools/sddf-front-guard.mjs'))) return true;
  const r = shFull('node tools/sddf-front-guard.mjs');
  return r.out.includes('GUARD PASS') || r.out.includes('FRONT GUARD PASS');
}

// HTTP via PowerShell (curl tem SSL issue no Windows)
function httpPost(url, body) {
  const escaped = JSON.stringify(body).replace(/'/g, "''");
  const cmd = `powershell -Command "try { $r = Invoke-WebRequest -Uri '${url}' -Method POST -Body '${escaped}' -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15; Write-Output $r.Content } catch { Write-Output ('ERROR:' + $_.Exception.Message) }"`;
  const r = shFull(cmd, 30000);
  if (!r.ok || r.out.startsWith('ERROR:')) return null;
  try { return JSON.parse(r.out); } catch { return null; }
}

function httpGet(url) {
  const cmd = `powershell -Command "try { $r = Invoke-WebRequest -Uri '${url}' -UseBasicParsing -TimeoutSec 10; Write-Output $r.Content } catch { Write-Output ('ERROR:' + $_.Exception.Message) }"`;
  const r = shFull(cmd, 20000);
  if (!r.ok || r.out.startsWith('ERROR:')) return null;
  try { return JSON.parse(r.out); } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════
// CONTRATOS IMUTÁVEIS
// ═══════════════════════════════════════════════════════════════════

const CLEAN_OWNERS = [
  'frontend/assets/vision-api.js',
  'frontend/assets/vision-chat.js',
  'frontend/assets/vision-agent-local.js',
  'frontend/assets/vision-runtime-owner.js',
  'frontend/assets/vision-report.js',
];

const LEGACY_FILES = [
  'frontend/assets/vision-v44-runtime-consistency.js',
  'frontend/assets/vision-v34-enterprise.js',
  'frontend/assets/vision-v35-telemetry.js',
  'frontend/assets/v231-backend-agents.js',
      'backend/src/runtime/goRunner.js',
      'backend/server.js',
  'frontend/assets/vision-v297-interactions.js',
  'frontend/assets/vision-v298-command-chat.js',
  'frontend/assets/vision-v299-fullstack-runtime.js',
  'frontend/assets/vision-v2910-clean-runtime.js',
  'frontend/assets/vision-v32-orbit-runtime.js',
  'frontend/assets/v233-realtime.js',
  'frontend/assets/v273-sddf-command-chat.js',
];

const CRITICAL_MARKERS = [
  'window.fetch =', 'executeBtn.onclick',
  'pass_gold:true', 'promotion_allowed:true', 'EventSource',
];

const ORBIT = {
  openclaw:    { top:'5%',    left:'50%'   },
  scanner:     { top:'18.2%', left:'81.8%' },
  hermes:      { top:'50%',   left:'95%'   },
  patchengine: { top:'81.8%', left:'81.8%' },
  aegis:       { top:'95%',   left:'50%'   },
  passgold:    { top:'81.8%', left:'18.2%' },
  github:      { top:'50%',   left:'5%'    },
  pi_harness:  { top:'18.2%', left:'18.2%' },
};

const DIFFICULTY = {
  D0: { label:'Trivial',    maxLayer:2, llmThreshold:null },
  D1: { label:'Low',        maxLayer:4, llmThreshold:null },
  D2: { label:'Medium',     maxLayer:6, llmThreshold:null },
  D3: { label:'High',       maxLayer:7, llmThreshold:null },
  D4: { label:'Critical',   maxLayer:8, llmThreshold:3   },
  D5: { label:'Enterprise', maxLayer:9, llmThreshold:1   },
};

// ═══════════════════════════════════════════════════════════════════
// ESTADO POR TENTATIVA
// ═══════════════════════════════════════════════════════════════════

function freshState() {
  return {
    // Git
    branch:'main', localHead:null, remoteHead:null, githubConfirmed:false,
    // Dificuldade
    difficulty:'D0', maxLayerAllowed:MAX_LAYER,
    // Execução
    layersExecuted:[], layersFailed:[],
    result:'PENDING', blockReason:null,
    fixesApplied:[], filesChanged:[], validationErrors:[],
    patchesApplied:[], plan:[],
    // Frontend
    legacyCleanConfirmed:false, v14CleanOwnership:false,
    orbitOk:false, guardOk:false,
    // Backend
    backendAlive:false, backendHasMissionId:false,
    backendHasEvidenceReceipt:false, backendStub:true,
    goCoreCompiled:false, goCorePath:null,
    evidenceReceiptInSchema:false, evidenceReceiptInNormalizer:false,
    serverVersionDeployed:null,
    // Gates
    passGoldCandidate:false, promotionAllowed:false, deployAllowed:false,
  };
}

function classify(ind) {
  let s = 0;
  if (ind.legacyActive > 5)      s += 3;
  else if (ind.legacyActive > 0) s += 1;
  if (ind.criticalMarkers > 0)   s += 2;
  if (ind.hasSSE)                s += 2;
  if (ind.hasPassGoldFake)       s += 3;
  if (ind.multipleOwners)        s += 1;
  if (ind.backendStub)           s += 2;
  if (ind.noEvidence)            s += 2;
  if (s >= 11) return 'D5';
  if (s >= 8)  return 'D4';
  if (s >= 5)  return 'D3';
  if (s >= 3)  return 'D2';
  if (s >= 1)  return 'D1';
  return 'D0';
}

// ═══════════════════════════════════════════════════════════════════
// LLM — GROQ
// ═══════════════════════════════════════════════════════════════════

const LLM_SYSTEM = `
Você é engenheiro sênior executando patches no Vision Core V14.

REGRAS ABSOLUTAS:
- Nunca alterar frontend/index.html
- Nunca alterar visual aprovado V8 Gold ou vision-gold.css
- Nunca criar pass_gold:true hardcoded
- Nunca liberar promotion sem evidence_receipt real
- Não alterar backend, worker ou go-core fora do escopo

ORBIT IMUTÁVEL:
openclaw top:5% left:50% | scanner top:18.2% left:81.8%
hermes top:50% left:95% | patchengine top:81.8% left:81.8%
aegis top:95% left:50% | passgold top:81.8% left:18.2%
github top:50% left:5% | pi_harness top:18.2% left:18.2%

ARQUIVOS PERMITIDOS:
frontend/assets/vision-*.js, frontend/assets/v2*.js
backend/server.js, backend/src/runtime/goRunner.js
go-core/contracts/result.schema.json
tools/, docs/

RESPOSTA — JSON puro sem markdown:
{
  "analysis": "causa raiz",
  "risk": "low|medium|high",
  "patches": [{"file":"path","action":"replace|append|write","find":"string exata","content":"novo"}],
  "validation": ["node --check arquivo.js"],
  "commit_message": "tipo(escopo): descrição"
}
Se não conseguir: {"analysis":"motivo","risk":"high","patches":[],"validation":[],"commit_message":"","blocked":true,"block_reason":"desc"}
`.trim();

async function callLLM(context) {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY não configurada');
  if (llmCount >= MAX_LLM) throw new Error(`limite LLM atingido (${MAX_LLM})`);
  llmCount++;
  audit(`[LLM] chamada ${llmCount}/${MAX_LLM}`);

  const body = JSON.stringify({
    model: GROQ_MODEL, max_tokens: 4096, temperature: 0.1,
    messages: [
      { role:'system', content:LLM_SYSTEM },
      { role:'user',   content:context    },
    ],
  });

  const r = spawnSync(
    `curl -s -X POST "${GROQ_URL}" -H "Content-Type: application/json" -H "Authorization: Bearer ${GROQ_KEY}" -d @-`,
    { shell:true, cwd:ROOT, encoding:'utf8', input:body, timeout:90000 }
  );
  if (r.status !== 0) throw new Error('curl groq: ' + (r.stderr||'').substring(0,100));
  let json;
  try { json = JSON.parse(r.stdout); } catch { throw new Error('groq resposta inválida'); }
  if (json.error) throw new Error('Groq: ' + json.error.message);
  const content = json?.choices?.[0]?.message?.content || '';
  REPORT.llmCalls.push({ attempt: llmCount, chars: content.length });
  return content;
}

async function applyLLMPatch(response, s) {
  let parsed;
  try { parsed = JSON.parse(response.replace(/```json|```/g,'').trim()); }
  catch { audit('[LLM] JSON inválido'); return false; }
  audit(`[LLM] análise: ${parsed.analysis} | risco: ${parsed.risk}`);
  if (parsed.blocked) { s.blockReason = parsed.block_reason; return false; }
  if (!parsed.patches?.length) { audit('[LLM] sem patches'); return false; }

  for (const p of parsed.patches) {
    const { file, action, find, content } = p;
    // Proteção absoluta
    if (file === 'frontend/index.html' || file?.endsWith('vision-gold.css')) {
      audit(`[LLM] BLOQUEADO: tentou ${file}`); continue;
    }
    if (action === 'replace' && find) {
      const cur = read(file);
      if (!cur?.includes(find)) { audit(`[LLM] string não encontrada: ${file}`); continue; }
      write(file, cur.replace(find, content));
    } else if (action === 'append') {
      write(file, (read(file)||'') + '\n' + content);
    } else if (action === 'write') {
      write(file, content);
    }
    s.filesChanged.push(file);
    audit(`[LLM] patch: ${action} → ${file}`);
  }
  REPORT.llmCalls[REPORT.llmCalls.length-1].patches = parsed.patches.map(p=>p.file).join(', ');
  s.fixesApplied.push(`llm(${parsed.patches.length})`);
  return true;
}

function buildLLMContext(s, attempt) {
  const gitLog  = sh('git log --oneline -5') || '?';
  const gitStat = sh('git status --short')   || 'clean';
  const guard   = existsSync(join(ROOT,'tools/sddf-front-guard.mjs'))
    ? shFull('node tools/sddf-front-guard.mjs').out.split('\n')[0] : 'N/A';

  const files = {};
  for (const f of ['backend/src/runtime/goRunner.js','backend/server.js','frontend/assets/vision-agent-local.js']) {
    const c = read(f);
    if (c) files[f] = c.split('\n').slice(0,60).join('\n') + (c.split('\n').length>60?'\n...(truncado)':'');
  }

  return `
BLOQUEIO — TENTATIVA ${attempt}/${MAX_ATTEMPTS} | D:${s.difficulty}
Bloqueio: ${s.blockReason||'?'}
Layers: ${s.layersExecuted.join(',')} | Erros: ${s.validationErrors.join('|')||'none'}
Backend: alive=${s.backendAlive} stub=${s.backendStub} evidence=${s.backendHasEvidenceReceipt}
Go compiled: ${s.goCoreCompiled} | Server: ${s.serverVersionDeployed}
evidence_receipt: normalizer=${s.evidenceReceiptInNormalizer} schema=${s.evidenceReceiptInSchema}

GIT LOG: ${gitLog}
GIT STATUS: ${gitStat}
GUARD: ${guard}

${Object.entries(files).map(([f,c])=>`--- ${f} ---\n${c}`).join('\n\n')}

Retorne JSON com patches para resolver o bloqueio.
`.trim();
}

// ═══════════════════════════════════════════════════════════════════
// PATCHES DE BACKEND
// ═══════════════════════════════════════════════════════════════════

function patchEvidenceNormalizer(s) {
  const paths = ['backend/src/runtime/goRunner.js', 'backend/server.js'];
  const helperFn = `
function buildEvidenceReceipt(result) {
  const { createHash } = require('crypto');
  const gates = (result && (result.gates || result.validation)) || [];
  return {
    id: (result && result.mission_id) || ('ev-' + Date.now()),
    mission_id: result && result.mission_id,
    snapshot_id: result && result.snapshot_id,
    gates_hash: createHash('sha256').update(JSON.stringify(gates)).digest('hex').substring(0,16),
    issued_at: new Date().toISOString(),
    result: (result && result.pass_gold === true) ? 'PASS' : 'FAIL',
  };
}
`;
  for (const p of paths) {
    const c = read(p); if (!c) continue;
    if (c.includes('evidence_receipt')) {
      s.evidenceReceiptInNormalizer = true;
      audit(`[L5] evidence_receipt já existe: ${p}`);
      return true;
    }
    if (c.includes('pass_gold') || c.includes('mission_id')) {
      write(p, helperFn + c);
      s.filesChanged.push(p);
      s.patchesApplied.push(`evidence-receipt-${p.split('/').pop()}`);
      s.evidenceReceiptInNormalizer = true;
      audit(`[L5] buildEvidenceReceipt adicionado: ${p}`);
      return true;
    }
  }
  audit('[L5] ponto de inserção não encontrado para evidence_receipt');
  return false;
}

function patchEvidenceSchema(s) {
  const p = 'go-core/contracts/result.schema.json';
  const c = read(p); if (!c) return false;
  if (c.includes('evidence_receipt')) { s.evidenceReceiptInSchema = true; return true; }
  try {
    const schema = JSON.parse(c);
    if (schema.properties) {
      schema.properties.evidence_receipt = {
        type:'object', description:'Evidence receipt after mission completion',
        properties: {
          id:          { type:'string' },
          mission_id:  { type:'string' },
          snapshot_id: { type:['string','null'] },
          gates_hash:  { type:'string' },
          issued_at:   { type:'string', format:'date-time' },
          result:      { type:'string', enum:['PASS','FAIL'] },
        },
        required: ['id','issued_at','result'],
      };
      write(p, JSON.stringify(schema, null, 2));
      s.filesChanged.push(p);
      s.patchesApplied.push('evidence-receipt-schema');
      s.evidenceReceiptInSchema = true;
      audit('[L5] evidence_receipt adicionado ao schema');
      return true;
    }
  } catch { audit('[L5] schema JSON inválido'); }
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-FIX LOCAL
// ═══════════════════════════════════════════════════════════════════

async function tryAutoFix(s) {
  const reason = s.blockReason || '';
  audit(`[FIX] razão: ${reason.substring(0,80)}`);

  // Arquivo git solto na raiz
  if (existsSync(join(ROOT,'git'))) {
    if (!DRY_RUN) { sh('git rm --cached git 2>nul'); sh('del git 2>nul || rm -f git'); }
    s.fixesApplied.push('remove-git-file'); return true;
  }

  // Unstaged / pull falhou
  if (/pull|unstaged/i.test(reason)) {
    sh('git add tools/ frontend/assets/ docs/ backend/ .gitignore 2>nul || true');
    const st = shFull('git status --porcelain');
    if ((st.out||'').split('\n').some(l=>l.match(/^[MADRCU]/))) {
      shFull('git commit -m "chore: pi-harness pre-pull auto-commit"');
      audit('[FIX] pre-pull commit feito');
    } else {
      sh('git stash --include-untracked 2>nul || git stash');
    }
    const pull = shFull('git pull origin main --rebase');
    sh('git stash pop 2>nul || true');
    if (pull.ok) { s.fixesApplied.push('auto-commit+pull'); return true; }
    sh('git reset --hard HEAD');
    const pull2 = shFull('git pull origin main');
    if (pull2.ok) { s.fixesApplied.push('reset+pull'); return true; }
  }

  // Syntax error — restaurar
  if (reason.includes('syntax error')) {
    const m = reason.match(/syntax error: ([^\s|]+)/);
    if (m) {
      const r = shFull(`git checkout HEAD -- "${m[1].trim()}"`);
      if (r.ok) { s.fixesApplied.push(`restore-${m[1].split('/').pop()}`); return true; }
    }
  }

  // Runner continue como fallback
  if (existsSync(join(ROOT,'tools/v14-refactor-continue.mjs'))) {
    const r = shFull('node tools/v14-refactor-continue.mjs --skip-pull --no-push');
    if (r.ok) { s.fixesApplied.push('v14-continue-fallback'); return true; }
  }

  // Untracked na raiz → gitignore
  const status = shFull('git status --porcelain');
  const untracked = (status.out||'').split('\n')
    .filter(l=>l.startsWith('??'))
    .map(l=>l.replace('?? ','').trim())
    .filter(f=>!f.startsWith('frontend/')&&!f.startsWith('tools/')&&!f.startsWith('docs/')&&!f.startsWith('backend/'));
  if (untracked.length > 0 && !DRY_RUN) {
    const gi = read('.gitignore') || '';
    const toAdd = untracked.filter(f=>!gi.includes(f));
    if (toAdd.length > 0) {
      write('.gitignore', gi + '\n' + toAdd.join('\n') + '\n');
      s.fixesApplied.push('gitignore-untracked'); return true;
    }
  }

  audit('[FIX] sem fix local disponível');
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// CAMADAS L0–L9
// ═══════════════════════════════════════════════════════════════════

async function L0(s) {
  s.layersExecuted.push('L0');
  s.branch = sh('git rev-parse --abbrev-ref HEAD') || 'main';
  if (s.branch !== 'main') { s.blockReason = `Branch: ${s.branch} ≠ main`; return false; }
  audit('[L0] branch: main ✓');
  return true;
}

async function L1(s) {
  s.layersExecuted.push('L1');

  if (!SKIP_PULL) {
    let pull = shFull('git pull origin main --rebase');
    if (!pull.ok) {
      audit('[L1] pull falhou — limpando workspace');
      sh('git add tools/ frontend/assets/ docs/ backend/ .gitignore 2>nul || true');
      const st = shFull('git status --porcelain');
      if ((st.out||'').split('\n').some(l=>l.match(/^[MADRCU]/))) {
        shFull('git commit -m "chore: pi-harness pre-pull"');
      } else {
        sh('git stash --include-untracked 2>nul || git stash');
      }
      pull = shFull('git pull origin main --rebase');
      sh('git stash pop 2>nul || true');
      if (!pull.ok) {
        sh('git reset --hard HEAD');
        pull = shFull('git pull origin main');
        if (!pull.ok) { s.blockReason = 'git pull falhou: ' + pull.err; return false; }
      }
    }
  }

  s.localHead  = sh('git rev-parse HEAD')        || '?';
  s.remoteHead = sh('git rev-parse origin/main') || '?';

  // Inventário frontend
  const index = read('frontend/index.html') || '';
  let legacyActive = 0;
  for (const f of LEGACY_FILES) { if (index.includes(f.split('/').pop())) legacyActive++; }

  let criticalCount=0, hasSSE=false, hasPassGoldFake=false;
  for (const f of CLEAN_OWNERS) {
    const c = read(f); if (!c) continue;
    for (const m of CRITICAL_MARKERS) {
      if (c.includes(m)) {
        criticalCount++;
        if (m==='EventSource') hasSSE=true;
        if (m.includes('pass_gold:true')) hasPassGoldFake=true;
      }
    }
  }
  if (index.includes('pass_gold:true')) hasPassGoldFake=true;

  // Inventário backend
  const goRunner = read('backend/src/runtime/goRunner.js') || '';
  const server   = read('backend/server.js') || '';
  const schema   = read('go-core/contracts/result.schema.json') || '';
  s.evidenceReceiptInNormalizer = goRunner.includes('evidence_receipt') || server.includes('evidence_receipt');
  s.evidenceReceiptInSchema     = schema.includes('evidence_receipt');
  s.serverVersionDeployed       = existsSync(join(ROOT,'backend/server-v41.js')) ? 'server-v41(stub)' : 'server.js';

  const goBins = ['bin/vision-core','bin/vision-core.exe','go-core/vision-core','go-core/vision-core.exe'];
  s.goCoreCompiled = goBins.some(p=>existsSync(join(ROOT,p)));
  s.goCorePath     = goBins.find(p=>existsSync(join(ROOT,p))) || null;

  s.difficulty      = classify({
    legacyActive, criticalMarkers:criticalCount, hasSSE,
    hasPassGoldFake: hasPassGoldFake && criticalCount>0,
    multipleOwners: legacyActive>2,
    backendStub: s.serverVersionDeployed.includes('stub'),
    noEvidence: !s.evidenceReceiptInNormalizer,
  });
  s.maxLayerAllowed = Math.min(MAX_LAYER, DIFFICULTY[s.difficulty].maxLayer);

  audit(`[L1] D:${s.difficulty} | legacy:${legacyActive} | critical:${criticalCount} | go:${s.goCoreCompiled}`);
  addEvidence(`D:${s.difficulty} | LEGACY:${legacyActive} | CRITICAL:${criticalCount} | BACKEND:${s.serverVersionDeployed} | GO:${s.goCoreCompiled}`);
  return true;
}

async function L2(s) {
  s.layersExecuted.push('L2');
  const issues = [];

  // Orbit
  const al = read('frontend/assets/vision-agent-local.js');
  if (al) {
    s.orbitOk = Object.keys(ORBIT).every(k=>al.includes(k));
    if (!s.orbitOk) issues.push('orbit: chaves ausentes em vision-agent-local.js');
    else audit('[L2] orbit ✓');
  } else { issues.push('vision-agent-local.js não encontrado'); }

  // Runtime owner
  if (!existsSync(join(ROOT,'frontend/assets/vision-runtime-owner.js')))
    issues.push('vision-runtime-owner.js ausente');

  // Evidence gate
  const rep = read('frontend/assets/vision-report.js');
  if (!rep?.includes('evidence_receipt')) issues.push('vision-report.js: evidence gate ausente');

  // Guard
  s.guardOk = guardPass();
  if (!s.guardOk) issues.push('sddf-front-guard: FAIL');
  else audit('[L2] guard ✓');

  // Backend probe
  audit('[L2] sondando backend...');
  const probe = httpPost(`${API_BASE}/api/run-live`, { mission:'pi-harness-probe', mode:'inspect' });
  s.backendAlive          = !!probe;
  s.backendHasMissionId   = !!(probe?.mission_id);
  s.backendHasEvidenceReceipt = !!(probe?.evidence_receipt);
  s.backendStub           = probe?.status==='queued' || !probe?.steps;
  audit(`[L2] backend: alive=${s.backendAlive} evidence=${s.backendHasEvidenceReceipt} stub=${s.backendStub}`);
  addEvidence(`BACKEND: alive=${s.backendAlive} | mission_id=${s.backendHasMissionId} | evidence_receipt=${s.backendHasEvidenceReceipt} | stub=${s.backendStub}`);

  s.validationErrors = issues;
  addEvidence(`ISSUES: ${issues.length} | ${issues.join(' | ')||'none'}`);
  if (issues.filter(i=>!i.includes('backend')).length > 3) {
    s.blockReason = issues.slice(0,2).join('; '); return false;
  }
  return true;
}

async function L3(s) {
  s.layersExecuted.push('L3');
  const plan = [];
  if (existsSync(join(ROOT,'tools/v14-refactor-total.mjs')))    plan.push('v14-total');
  if (existsSync(join(ROOT,'tools/v14-refactor-continue.mjs'))) plan.push('v14-continue');
  if (!s.evidenceReceiptInNormalizer) plan.push('patch-evidence-normalizer');
  if (!s.evidenceReceiptInSchema)     plan.push('patch-evidence-schema');
  if (!s.goCoreCompiled)              plan.push('compile-go-core');
  s.plan = plan;
  audit(`[L3] plano: ${plan.join(', ')}`);
  addEvidence(`PLAN: ${plan.join(', ')}`);
  return true;
}

async function L4(s) {
  s.layersExecuted.push('L4');
  let total = 0;
  for (const f of ['frontend/assets/vision-v34-enterprise.js','frontend/assets/vision-v44-runtime-consistency.js']) {
    const c = read(f); if (!c) continue;
    const found = CRITICAL_MARKERS.filter(m=>c.includes(m));
    total += found.length;
    audit(`[L4] ${f.split('/').pop()}: markers=${found.length}`);
  }
  if (total === 0) {
    s.legacyCleanConfirmed = true;
    s.v14CleanOwnership    = true;
    audit('[L4] legacy ownership clean ✓');
  }
  addEvidence(`LEGACY_MARKERS:${total} | LEGACY_CLEAN:${s.legacyCleanConfirmed}`);
  return true;
}

async function L5(s) {
  s.layersExecuted.push('L5');
  if (DRY_RUN) { audit('[L5] DRY_RUN skip'); return true; }

  // Frontend patchers
  const patchers = [
    'tools/v14-runtime-bridge-patch.mjs', 'tools/v14-report-bridge-patch.mjs',
    'tools/v14-status-bridge-patch.mjs',  'tools/v14-legacy-adapter-patch.mjs',
  ];
  for (const p of patchers) {
    if (!existsSync(join(ROOT,p))) continue;
    const r = shFull(`node "${join(ROOT,p)}" --skip-push --skip-pull`);
    if (r.ok) { s.patchesApplied.push(p.split('/').pop()); audit(`[L5] ${p.split('/').pop()}: ✓`); }
    else audit(`[L5] ${p.split('/').pop()}: FAIL`);
  }

  // Runner total
  if (existsSync(join(ROOT,'tools/v14-refactor-total.mjs'))) {
    const r = shFull('node tools/v14-refactor-total.mjs --full-js-check');
    if (r.out.includes('RESULT: PASS')) {
      s.patchesApplied.push('v14-total'); audit('[L5] v14-total: ✓');
    }
  }

  // Backend — evidence_receipt no normalizer
  if (!s.evidenceReceiptInNormalizer) {
    patchEvidenceNormalizer(s);
  }

  // Backend — evidence_receipt no schema
  if (!s.evidenceReceiptInSchema) {
    patchEvidenceSchema(s);
  }

  // Compilar Go se disponível
  if (!s.goCoreCompiled) {
    const goVer = sh('go version 2>nul || go version 2>/dev/null');
    if (goVer) {
      audit('[L5] compilando go-core...');
      mkdirSync(join(ROOT,'bin'), {recursive:true});
      const build = shFull('go build -o bin/vision-core ./go-core/cmd/vision-core/ 2>&1 || go build -o bin/vision-core ./go-core/... 2>&1', 120000);
      if (build.ok || existsSync(join(ROOT,'bin/vision-core'))) {
        s.goCoreCompiled = true;
        s.goCorePath = 'bin/vision-core';
        s.patchesApplied.push('go-core-compiled');
        s.filesChanged.push('bin/vision-core');
        audit('[L5] go-core compilado ✓');
      } else {
        audit('[L5] go build: ' + build.out.substring(0,150));
      }
    } else {
      audit('[L5] Go não instalado — skip compilação');
    }
  }

  addEvidence(`PATCHES: ${s.patchesApplied.join(', ')||'none'}`);
  return true;
}

async function L6(s) {
  s.layersExecuted.push('L6');
  const errors = [];

  const toCheck = [
    ...CLEAN_OWNERS,
    'frontend/assets/vision-v44-runtime-consistency.js',
    'frontend/assets/vision-v34-enterprise.js',
    'backend/src/runtime/goRunner.js',
    'backend/server.js',
    'tools/v14-refactor-total.mjs',
    'tools/v14-refactor-continue.mjs',
    'tools/pi-harness.mjs',
    'backend/src/runtime/goRunner.js',
    'backend/server.js',
    'tools/pi-harness-v141-audit.mjs',
    'tools/pi-harness-v141-backend-probe.mjs',
    'tools/pi-harness-v141-endpoint-contract-audit.mjs',
    'tools/pi-harness-v141-gold-gate-audit.mjs',
    'tools/pi-harness-v141-final-audit.mjs',
    'tools/pi-harness-v141-release-readiness-audit.mjs',
    'tools/pi-harness-v141-evidence-summary.mjs',
    'tools/v14-backend-receipt-normalizer.mjs',
    'tools/v14-backend-endpoint-normalizer.mjs',
    'tools/sddf-front-guard.mjs',
  ];

  for (const f of toCheck) {
    const ok = nodeCheck(f);
    if (ok === null) continue;
    if (!ok) { errors.push(`syntax error: ${f}`); audit(`[L6] ✗ ${f}`); }
    else audit(`[L6] ✓ ${f.split('/').pop()}`);
  }

  if (!shFull('git diff --check').ok) errors.push('whitespace: git diff --check');
  if (!guardPass()) errors.push('sddf-front-guard: FAIL');
  else audit('[L6] guard ✓');

  s.validationErrors = errors;
  addEvidence(`VALIDATION_ERRORS: ${errors.length}`);
  const syntaxErrors = errors.filter(e=>e.includes('syntax error'));
  if (syntaxErrors.length > 0) { s.blockReason = syntaxErrors[0]; return false; }
  return true;
}

async function L7(s) {
  s.layersExecuted.push('L7');
  if (DRY_RUN) { audit('[L7] DRY_RUN skip'); return true; }

  const status = shFull('git status --porcelain');
  if (status.out.trim()) {
    for (const p of ['frontend/assets/','tools/','docs/','backend/','go-core/contracts/','.github/','bin/'])
      sh(`git add ${p} 2>nul || true`);
    const r = shFull('git commit -m "refactor: pi-harness v5 autonomous — frontend+backend evidence_receipt"');
    if (r.ok) {
      s.localHead = sh('git rev-parse HEAD') || s.localHead;
      audit('[L7] commit ✓');
    } else if (!r.out.includes('nothing')) {
      audit('[L7] commit fail: ' + r.err.substring(0,80));
    }
  } else { audit('[L7] no diff — skip commit'); }

  if (!SKIP_PUSH) {
    const push = shFull('git push origin main');
    audit(`[L7] push: ${push.ok?'✓':'FAIL'}`);
    sh('git fetch origin main');
    s.localHead       = sh('git rev-parse HEAD')        || '?';
    s.remoteHead      = sh('git rev-parse origin/main') || '?';
    s.githubConfirmed = s.localHead === s.remoteHead;
    audit(`[L7] github confirmed: ${s.githubConfirmed}`);
  }

  addEvidence(`LOCAL_HEAD:${s.localHead} | REMOTE_HEAD:${s.remoteHead} | GITHUB:${s.githubConfirmed}`);
  return true;
}

async function L8(s) {
  s.layersExecuted.push('L8');
  s.passGoldCandidate = false;

  if (s.backendAlive && !DRY_RUN) {
    await sleep(1000);
    const probe = httpPost(`${API_BASE}/api/run-live`, { mission:'pi-harness-gold-probe', mode:'inspect' });
    if (probe?.evidence_receipt) {
      s.passGoldCandidate = true;
      audit('[L8] ★ PASS GOLD CANDIDATE — evidence_receipt recebido do backend!');
    } else {
      audit(`[L8] PASS GOLD bloqueado: evidence_receipt ausente (stub:${s.backendStub})`);
    }
  } else {
    audit('[L8] PASS GOLD: backend offline ou DRY_RUN');
  }

  addEvidence(`PASS_GOLD_CANDIDATE:${s.passGoldCandidate} | EVIDENCE_IN_BACKEND:${s.backendHasEvidenceReceipt}`);
  return true;
}

async function L9(s) {
  s.layersExecuted.push('L9');
  s.promotionAllowed = s.passGoldCandidate;
  s.deployAllowed    = false; // deploy sempre manual
  audit(`[L9] promotion:${s.promotionAllowed} | deploy: sempre manual`);
  addEvidence(`PROMOTION_ALLOWED:${s.promotionAllowed} | DEPLOY_ALLOWED:false`);
  return true;
}

const LAYERS = [
  {id:0,fn:L0},{id:1,fn:L1},{id:2,fn:L2},{id:3,fn:L3},
  {id:4,fn:L4},{id:5,fn:L5},{id:6,fn:L6},{id:7,fn:L7},
  {id:8,fn:L8},{id:9,fn:L9},
];

function shouldEscalate(s, attempt) {
  const level = DIFFICULTY[s.difficulty];
  return level?.llmThreshold ? attempt >= level.llmThreshold : false;
}

// ═══════════════════════════════════════════════════════════════════
// EXECUÇÃO DE UMA TENTATIVA
// ═══════════════════════════════════════════════════════════════════

async function runOnce(attempt) {
  const s   = freshState();
  const t0  = Date.now();
  audit(`\n━━━ TENTATIVA ${attempt}/${MAX_ATTEMPTS} ━━━`);

  for (const layer of LAYERS) {
    if (layer.id > s.maxLayerAllowed && layer.id < 8) { audit(`[L${layer.id}] skip`); continue; }
    let ok = false;
    try { ok = await layer.fn(s); }
    catch (err) {
      s.layersFailed.push(`L${layer.id}:${err.message}`);
      s.blockReason = s.blockReason || `L${layer.id}: ${err.message}`;
      ok = false;
    }
    if (!ok) { s.result = 'BLOCKED'; break; }
  }

  if (s.result === 'PENDING') s.result = 'PASS';
  const duration = ((Date.now()-t0)/1000).toFixed(1);

  REPORT.phases.push({
    attempt, result:s.result, difficulty:s.difficulty,
    layers: s.layersExecuted.join(','),
    duration, patches: s.patchesApplied.slice(),
    fixes: s.fixesApplied.slice(),
    errors: s.validationErrors.slice(),
    block: s.blockReason||null,
    passGold: s.passGoldCandidate,
    backendAlive: s.backendAlive,
    evidenceInBackend: s.backendHasEvidenceReceipt,
  });

  return s;
}

// ═══════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const globalStart = Date.now();
  let lastState     = null;
  let finalResult   = 'PENDING';
  let llmAttempts   = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const s = await runOnce(attempt);
    lastState = s;

    if (s.result === 'PASS') { finalResult = 'PASS'; break; }

    // Escalada LLM ou auto-fix
    if (shouldEscalate(s, attempt) && llmAttempts < MAX_LLM && GROQ_KEY) {
      llmAttempts++;
      audit(`[ESCALADA] D${s.difficulty} → LLM (${llmAttempts}/${MAX_LLM})`);
      try {
        const ctx  = buildLLMContext(s, attempt);
        const resp = await callLLM(ctx);
        const ok   = await applyLLMPatch(resp, s);
        if (!ok) { finalResult = 'BLOCKED'; break; }
        audit('[LLM] patch aplicado → retomando loop');
      } catch (err) {
        audit(`[LLM] erro: ${err.message}`);
        const fixed = await tryAutoFix(s);
        if (!fixed) { finalResult = 'BLOCKED'; break; }
      }
    } else {
      const fixed = await tryAutoFix(s);
      if (!fixed && s.result === 'BLOCKED') {
        if (!GROQ_KEY && shouldEscalate(s, attempt))
          audit('[WARN] GROQ_API_KEY não configurada — escalada LLM indisponível');
        finalResult = 'BLOCKED';
        break;
      }
    }

    if (attempt < MAX_ATTEMPTS) await sleep(1000);
    else finalResult = s.result;
  }

  const totalElapsed = ((Date.now()-globalStart)/1000).toFixed(1);
  const s = lastState || freshState();

  REPORT.summary = {
    result: finalResult,
    difficulty: s.difficulty,
    totalAttempts: REPORT.phases.length,
    totalElapsed,
    llmCalls: llmCount,
    // Frontend
    legacyClean: s.legacyCleanConfirmed,
    v14Clean: s.v14CleanOwnership,
    orbitOk: s.orbitOk,
    guardOk: s.guardOk,
    githubConfirmed: s.githubConfirmed,
    localHead: s.localHead,
    remoteHead: s.remoteHead,
    // Backend
    backendAlive: s.backendAlive,
    backendStub: s.backendStub,
    serverDeployed: s.serverVersionDeployed,
    goCoreCompiled: s.goCoreCompiled,
    evidenceInSchema: s.evidenceReceiptInSchema,
    evidenceInNormalizer: s.evidenceReceiptInNormalizer,
    evidenceInBackend: s.backendHasEvidenceReceipt,
    // Gates
    passGoldCandidate: s.passGoldCandidate,
    promotionAllowed: s.promotionAllowed,
    deployAllowed: false,
    blockReason: s.blockReason||null,
  };

  // ═══════════════════════════════════════════════════════════════
  // RELATÓRIO ÚNICO FINAL — zero output antes deste ponto
  // ═══════════════════════════════════════════════════════════════

  const W   = 70;
  const sep = '═'.repeat(W);
  const box = t => `║  ${t}${' '.repeat(Math.max(0,W-t.length-2))}║`;
  const div = t => `\n${'─'.repeat(4)} ${t} ${'─'.repeat(Math.max(0,W-t.length-7))}`;

  console.log('');
  console.log(`╔${sep}╗`);
  console.log(box('PI HARNESS v5 — VISION CORE AUTONOMOUS EXECUTOR'));
  console.log(box('RELATÓRIO FINAL COMPLETO'));
  console.log(`╚${sep}╝`);

  // ── SUMÁRIO GERAL ──
  console.log(div('SUMÁRIO'));
  console.log(`RESULT:                    ${finalResult}`);
  console.log(`DIFFICULTY:                ${s.difficulty} — ${DIFFICULTY[s.difficulty]?.label||'?'}`);
  console.log(`TOTAL_ATTEMPTS:            ${REPORT.phases.length}/${MAX_ATTEMPTS}`);
  console.log(`LLM_CALLS:                 ${llmCount}/${MAX_LLM}`);
  console.log(`TOTAL_ELAPSED:             ${totalElapsed}s`);

  // ── FASES ──
  console.log(div('FASES EXECUTADAS'));
  for (const ph of REPORT.phases) {
    const icon = ph.result==='PASS' ? '✓' : '✗';
    console.log(`  ${icon} Tentativa ${ph.attempt} | ${ph.result} | D:${ph.difficulty} | ${ph.duration}s | layers:[${ph.layers}]`);
    if (ph.patches.length) console.log(`    patches: ${ph.patches.join(', ')}`);
    if (ph.fixes.length)   console.log(`    fixes:   ${ph.fixes.join(', ')}`);
    if (ph.block)          console.log(`    block:   ${ph.block}`);
    if (ph.errors.length)  console.log(`    errors:  ${ph.errors.slice(0,3).join(' | ')}`);
  }

  // ── LLM ──
  if (REPORT.llmCalls.length) {
    console.log(div('LLM CALLS'));
    for (const c of REPORT.llmCalls)
      console.log(`  ✦ chamada ${c.attempt}: ${c.chars} chars${c.patches?' | patches: '+c.patches:''}`);
  }

  // ── FRONTEND ──
  console.log(div('FRONTEND GATES'));
  console.log(`LEGACY_CLEAN_CONFIRMED:    ${s.legacyCleanConfirmed}`);
  console.log(`V14_CLEAN_OWNERSHIP:       ${s.v14CleanOwnership}`);
  console.log(`ORBIT_CONTRACT_OK:         ${s.orbitOk}`);
  console.log(`GUARD_PASS:                ${s.guardOk}`);
  console.log(`GITHUB_CONFIRMED:          ${s.githubConfirmed}`);
  console.log(`LOCAL_HEAD:                ${s.localHead||'?'}`);
  console.log(`REMOTE_HEAD:               ${s.remoteHead||'?'}`);

  // ── BACKEND ──
  console.log(div('BACKEND GATES'));
  console.log(`BACKEND_ALIVE:             ${s.backendAlive}`);
  console.log(`BACKEND_STUB:              ${s.backendStub}`);
  console.log(`SERVER_DEPLOYED:           ${s.serverVersionDeployed||'?'}`);
  console.log(`GO_CORE_COMPILED:          ${s.goCoreCompiled}`);
  console.log(`EVIDENCE_IN_SCHEMA:        ${s.evidenceReceiptInSchema}`);
  console.log(`EVIDENCE_IN_NORMALIZER:    ${s.evidenceReceiptInNormalizer}`);
  console.log(`EVIDENCE_IN_BACKEND:       ${s.backendHasEvidenceReceipt}`);

  // ── PASS GOLD ──
  console.log(div('PASS GOLD'));
  console.log(`PASS_GOLD_CANDIDATE:       ${s.passGoldCandidate}`);
  console.log(`PROMOTION_ALLOWED:         ${s.promotionAllowed}`);
  console.log(`DEPLOY_ALLOWED:            false (sempre manual)`);
  if (!s.passGoldCandidate) {
    console.log('');
    console.log('  BLOQUEIO PASS GOLD:');
    if (!s.backendAlive)              console.log('  → Backend não responde');
    if (s.backendStub)                console.log('  → Backend rodando stub (server-v41.js)');
    if (!s.evidenceReceiptInNormalizer) console.log('  → evidence_receipt ausente em goRunner.js/server.js');
    if (!s.evidenceReceiptInSchema)   console.log('  → evidence_receipt ausente em result.schema.json');
    if (!s.goCoreCompiled)            console.log('  → Go binary não compilado');
    if (!s.backendHasEvidenceReceipt) console.log('  → Backend não retorna evidence_receipt no payload');
  }

  // ── EVIDENCE ──
  console.log(div('EVIDENCE COMPLETA'));
  for (const e of REPORT.evidence) console.log(`  * ${e}`);

  // ── PATCHES ──
  if (s.patchesApplied?.length) {
    console.log(div('PATCHES APLICADOS'));
    for (const p of s.patchesApplied) console.log(`  ✓ ${p}`);
  }

  // ── BLOQUEIO (se falhou) ──
  if (finalResult !== 'PASS') {
    console.log(div('BLOQUEIO'));
    console.log(`BLOCK_REASON: ${s.blockReason||'desconhecido'}`);
    if (s.validationErrors?.length) for (const e of s.validationErrors) console.log(`  • ${e}`);
    if (!GROQ_KEY) {
      console.log('');
      console.log('  AVISO: GROQ_API_KEY não configurada.');
      console.log('  Configure: $env:GROQ_API_KEY="sua-key"');
    }
    console.log(div('AUDIT LOG'));
    for (const l of REPORT.auditLog) console.log(l);
  }

  // ── RODAPÉ ──
  console.log('');
  console.log(`╔${sep}╗`);
  if (finalResult === 'PASS') {
    console.log(box('✓ PI HARNESS PASS — VISION CORE AUTONOMOUS EXECUTOR COMPLETO'));
  } else {
    console.log(box(`✗ PI HARNESS ${finalResult} — BLOQUEIO DETECTADO`));
  }
  console.log(`╚${sep}╝`);
  console.log('');

  process.exit(finalResult==='PASS' ? 0 : 1);
}

main().catch(err => {
  console.error('PI HARNESS FATAL:', err.message);
  process.exit(1);
});
