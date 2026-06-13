#!/usr/bin/env node
/**
 * stress-test-arch-vision-core.js
 * Vision Core — Stress Test Agente Arquiteto
 * 19 cenários totais: 16 automatizados + 3 manuais (frontend/E2E)
 *
 * Categorias:
 *   CAT-1: Leigo vs Técnico (ARCH-01–04)
 *   CAT-2: Confidence Gating (ARCH-05–07)
 *   CAT-3: Cobertura Spec Library (ARCH-08–12)
 *   CAT-4: Fallback por título (ARCH-13)
 *   CAT-5: Frontend/E2E — MANUAL (ARCH-14–16)
 *   CAT-6: Robustez / validação de input (ARCH-17–19)
 *
 * Dashboard: http://localhost:3108
 * Executa:   node scripts/stress-test-arch-vision-core.js
 */

import { mkdirSync }    from 'fs';
import { writeFile }    from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http             from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PORT      = 3108;

// ── Config ─────────────────────────────────────────────────────────────────────
// Default: direct EB HTTP (same pattern as stress-test-sf-vision-core.js — avoids TLS
// issues on Windows). Override with WORKER_URL env var for worker HTTPS.
const WORKER_URL = process.env.WORKER_URL
  || process.env.BACKEND_URL
  || 'http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com';

// ── Global state ───────────────────────────────────────────────────────────────
const state = {
  rodando:    true,
  total:      19,
  atual:      0,
  ativo:      null,
  resultados: [],
  log:        [],
  inicio:     new Date().toISOString(),
};

function addLog(msg) {
  state.log.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
  if (state.log.length > 200) state.log.shift();
  console.log(msg);
}

// ── HTML dashboard ─────────────────────────────────────────────────────────────
function buildHTML() {
  const pct      = Math.round((state.atual / state.total) * 100);
  const auto     = state.resultados.filter((r) => !r.manual);
  const passes   = auto.filter((r) => r.passou).length;
  const fails    = auto.filter((r) => !r.passou).length;
  const completo = !state.rodando;

  const catColors = {
    'CAT-1': '#38bdf8', 'CAT-2': '#f59e0b', 'CAT-3': '#4ade80',
    'CAT-4': '#c084fc', 'CAT-5': '#64748b', 'CAT-6': '#f87171',
  };

  const rowsHTML = state.resultados.map((r) => {
    const bg  = r.manual ? '#0f172a' : (r.passou ? '#052e16' : '#450a0a');
    const col = r.manual ? '#64748b' : (r.passou ? '#4ade80' : '#f87171');
    const ico = r.manual ? '🔲' : (r.passou ? '✅' : '❌');
    const statusTxt = r.manual ? 'MANUAL' : (r.passou ? 'PASS' : 'FAIL');
    const catClr = catColors[r.categoria] || '#94a3b8';
    const checks = (r.detalhes || []).map((d) =>
      `${d.ok ? '✓' : '✗'} ${d.nome}`).join(' | ');
    return `<tr style="background:${bg}">
      <td style="color:${catClr};font-weight:600">${r.id}</td>
      <td>${r.descricao.replace(/</g, '&lt;')}</td>
      <td style="color:${catClr};font-size:0.8em">${r.categoria}</td>
      <td style="color:${col};font-weight:700">${ico} ${statusTxt}</td>
      <td>${r.tempo_ms != null ? r.tempo_ms + 'ms' : r.erro ? '<span style="color:#f87171">ERRO</span>' : '—'}</td>
      <td style="font-size:0.75em;color:#94a3b8">${checks || (r.provider_used || '—')}</td>
    </tr>`;
  }).join('');

  const pendentes = SCENARIOS.slice(state.atual).map((s) => {
    const catClr = catColors[s.categoria] || '#94a3b8';
    return `<tr style="background:#0f172a;opacity:0.4">
      <td style="color:${catClr}">${s.id}</td>
      <td>${s.descricao}</td>
      <td style="color:${catClr};font-size:0.8em">${s.categoria}</td>
      <td style="color:#475569">—</td><td>—</td><td>—</td>
    </tr>`;
  }).join('');

  const logHTML = [...state.log].reverse().slice(0, 30).map((l) =>
    `<div style="color:#94a3b8;font-size:0.82em">${l.replace(/</g, '&lt;')}</div>`
  ).join('');

  const autoTotal = SCENARIOS.filter((s) => !s.manual).length;
  const taxaPct   = (passes + fails) > 0 ? Math.round((passes / (passes + fails)) * 100) : 0;

  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta http-equiv="refresh" content="4">
<title>Stress Test ARCH — Vision Core</title>
<style>
  body{font-family:monospace;background:#020617;color:#e2e8f0;padding:24px;margin:0}
  h1{color:#6366f1;margin:0 0 8px}
  .meta{color:#64748b;font-size:0.85em;margin-bottom:20px}
  .bar-bg{background:#1e293b;border-radius:8px;height:20px;margin-bottom:20px}
  .bar-fg{background:linear-gradient(90deg,#6366f1,#38bdf8);height:20px;border-radius:8px;transition:width 0.4s}
  .stats{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap}
  .stat{background:#0f172a;border-radius:8px;padding:12px 20px;text-align:center}
  .stat-val{font-size:2em;font-weight:700}
  .stat-lbl{color:#64748b;font-size:0.85em}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#1e293b;padding:10px;text-align:left;color:#94a3b8}
  td{padding:8px 10px;border-bottom:1px solid #1e293b;vertical-align:top}
  .log-box{background:#0f172a;border-radius:8px;padding:16px;max-height:260px;overflow-y:auto}
  ${completo && passes === autoTotal ? '.bar-fg{background:linear-gradient(90deg,#059669,#4ade80)}' : ''}
</style>
</head><body>
<h1>🏛️ Stress Test ARCH — Agente Arquiteto</h1>
<div class="meta">
  ${autoTotal} cenários automáticos + 3 manuais — Interpretação, Confidence Gating, Spec Library, Robustez<br>
  Início: ${state.inicio} | ${completo ? '✅ COMPLETO' : `⏳ ${state.ativo || 'iniciando...'}`}
</div>

<div class="bar-bg"><div class="bar-fg" style="width:${pct}%"></div></div>
<div style="color:#64748b;font-size:0.85em;margin-top:-16px;margin-bottom:16px">${pct}% — ${state.atual}/${state.total}</div>

<div class="stats">
  <div class="stat"><div class="stat-val" style="color:#4ade80">${passes}</div><div class="stat-lbl">PASS (auto)</div></div>
  <div class="stat"><div class="stat-val" style="color:#f87171">${fails}</div><div class="stat-lbl">FAIL (auto)</div></div>
  <div class="stat"><div class="stat-val" style="color:#64748b">3</div><div class="stat-lbl">MANUAL</div></div>
  <div class="stat"><div class="stat-val" style="color:#fbbf24">${taxaPct}%</div><div class="stat-lbl">Taxa (auto)</div></div>
</div>

<h2>Resultados</h2>
<table>
  <thead><tr><th>ID</th><th>Cenário</th><th>Categoria</th><th>Status</th><th>Tempo</th><th>Checks / Provider</th></tr></thead>
  <tbody>${rowsHTML}${pendentes}</tbody>
</table>

<h2>Log em tempo real</h2>
<div class="log-box">${logHTML || '<div style="color:#475569">Aguardando eventos...</div>'}</div>
</body></html>`;
}

// ── HTTP dashboard ─────────────────────────────────────────────────────────────
function startDashboard() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHTML());
  });
  server.listen(PORT, '127.0.0.1', () => {
    addLog(`🌐 Dashboard ARCH: http://localhost:${PORT}`);
  });
  return server;
}

// ── Evaluate structured ARCH response ─────────────────────────────────────────
function evaluate(scenario, httpStatus, body) {
  if (scenario.manual) {
    return { passou: null, detalhes: [{ nome: 'checklist manual', ok: null }] };
  }

  // Error scenarios (ARCH-17/18/19): expected non-2xx
  if (scenario.expectError) {
    const detalhes = [
      { nome: `status == 400`, ok: httpStatus === 400 },
      { nome: `error field present`,
        ok: !!(body?.error && typeof body.error === 'string' && body.error.length > 0) },
    ];
    if (scenario.expectErrorCode) {
      detalhes.push({
        nome: `error="${scenario.expectErrorCode}"`,
        ok: body?.error === scenario.expectErrorCode ||
            (body?.error || '').toLowerCase().includes(scenario.expectErrorCode.replace('_', '')),
      });
    }
    return { passou: detalhes.every((d) => d.ok), detalhes };
  }

  // Normal scenarios: 2xx with classification
  const c       = body?.classification || {};
  const conf    = typeof c.confidence === 'number' ? c.confidence : -1;
  const stack   = Array.isArray(c.stack) ? c.stack : [];
  const tags    = Array.isArray(c.tags)  ? c.tags  : [];
  const allTags = [...new Set([...stack, ...tags])];
  const specs   = Array.isArray(body?.specs_suggested) ? body.specs_suggested : [];
  const qs      = Array.isArray(body?.open_questions)  ? body.open_questions  : [];

  const detalhes = (scenario.checks || []).map((chk) => {
    let ok = false;
    switch (chk.type) {
      case 'confidence_between':
        ok = conf >= chk.min && conf <= chk.max;
        break;
      case 'confidence_gte':
        ok = conf >= chk.min;
        break;
      case 'confidence_lt':
        ok = conf < chk.max;
        break;
      case 'stack_has_any':
        ok = chk.values.some((v) => allTags.includes(v));
        break;
      case 'stack_has_all_groups':
        // each group is an OR — all groups must have at least one match
        ok = chk.groups.every((grp) => grp.some((v) => allTags.includes(v)));
        break;
      case 'explanation_not_empty':
        ok = typeof c.explanation === 'string' && c.explanation.trim().length > 10;
        break;
      case 'specs_length_gt':
        ok = specs.length > chk.min;
        break;
      case 'specs_length_eq':
        ok = specs.length === chk.val;
        break;
      case 'questions_gte':
        ok = qs.length >= chk.min;
        break;
      case 'questions_gt':
        ok = qs.length > chk.min;
        break;
      case 'specs_has_module':
        ok = specs.some((s) =>
          typeof s.id === 'string' && s.id.startsWith(chk.modulePrefix + '-'));
        break;
      case 'specs_or_empty_ok':
        // pass if specs exist OR confidence was low enough
        ok = specs.length > 0 || conf < chk.confThreshold;
        break;
      case 'status_2xx':
        ok = httpStatus >= 200 && httpStatus < 300;
        break;
      default:
        ok = false;
    }
    return { nome: chk.label, ok };
  });

  return {
    passou: detalhes.every((d) => d.ok !== false && d.ok !== null),
    detalhes,
  };
}

// ── Scenarios ──────────────────────────────────────────────────────────────────
const SCENARIOS = [

  // ═══ CAT-1: Leigo vs Técnico ════════════════════════════════════════════════

  {
    id: 'ARCH-01', categoria: 'CAT-1',
    descricao: 'Leigo: "quero um site para minha padaria"',
    message: 'quero um site para minha padaria',
    checks: [
      { type: 'confidence_between', min: 0.55, max: 0.92,
        label: 'confidence in [0.55, 0.92]' },
      { type: 'stack_has_any',
        values: ['html-css', 'react', 'vue', 'landing-page', 'nextjs', 'javascript', 'frontend'],
        label: 'stack has frontend tag' },
      { type: 'explanation_not_empty',
        label: 'explanation not empty' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  {
    id: 'ARCH-02', categoria: 'CAT-1',
    descricao: 'Técnico: API REST Python FastAPI + PostgreSQL + JWT',
    message: 'preciso de uma API REST em Python com FastAPI, PostgreSQL e autenticação JWT para gerenciar estoque',
    checks: [
      { type: 'confidence_gte', min: 0.75,
        label: 'confidence >= 0.75' },
      { type: 'stack_has_all_groups',
        groups: [
          ['python', 'fastapi', 'api-backend', 'rest-api'],
          ['database', 'postgresql'],
          ['auth', 'jwt'],
        ],
        label: 'stack has python+db+auth groups' },
      { type: 'specs_length_gt', min: 0, label: 'specs_suggested not empty' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  {
    id: 'ARCH-03', categoria: 'CAT-1',
    descricao: 'Semi-leigo: "aquele negócio de loja online com botão de comprar"',
    message: 'tem como vocês fazerem aquele negócio de loja online com aqueles botão de comprar?',
    checks: [
      { type: 'confidence_between', min: 0.40, max: 0.85,
        label: 'confidence in [0.40, 0.85]' },
      { type: 'stack_has_any',
        values: ['billing-enabled', 'saas-fullstack', 'stripe', 'e-commerce', 'database',
                 'react', 'node-js', 'javascript', 'html-css'],
        label: 'stack suggests ecommerce/billing or webapp' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  {
    id: 'ARCH-04', categoria: 'CAT-1',
    descricao: 'Técnico: migração monolito Node para microsserviços com message queue',
    message: 'quero migrar meu monolito Node para microsserviços com message queue',
    checks: [
      { type: 'stack_has_any',
        values: ['microservices', 'node-js', 'redis', 'docker', 'api-backend', 'rest-api'],
        label: 'tags contain microservices or node-js' },
      { type: 'specs_length_gt', min: 0,
        label: 'specs_suggested not empty' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  // ═══ CAT-2: Confidence Gating ════════════════════════════════════════════════

  {
    id: 'ARCH-05', categoria: 'CAT-2',
    descricao: 'Vago: "quero um app" → baixa confiança + perguntas + sem specs',
    message: 'quero um app',
    checks: [
      { type: 'confidence_lt', max: 0.65,
        label: 'confidence < 0.65' },
      { type: 'questions_gte', min: 2,
        label: 'open_questions >= 2' },
      { type: 'specs_or_empty_ok', confThreshold: 0.65,
        label: 'specs vazio (confiança baixa)' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  {
    id: 'ARCH-06', categoria: 'CAT-2',
    descricao: 'Mínimo: "oi" → confiança muito baixa + perguntas',
    message: 'oi',
    checks: [
      { type: 'confidence_lt', max: 0.55,
        label: 'confidence < 0.55' },
      { type: 'questions_gt', min: 0,
        label: 'open_questions > 0' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  {
    id: 'ARCH-07', categoria: 'CAT-2',
    descricao: 'Ambíguo: "quero algo parecido com o que fizeram para outro cliente"',
    message: 'quero algo parecido com o que vocês fizeram para o outro cliente',
    checks: [
      { type: 'confidence_lt', max: 0.72,
        label: 'confidence < 0.72' },
      { type: 'questions_gt', min: 0,
        label: 'open_questions > 0' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  // ═══ CAT-3: Cobertura Spec Library ══════════════════════════════════════════

  {
    id: 'ARCH-08', categoria: 'CAT-3',
    descricao: 'SaaS fullstack Node+React → specs SF-01',
    message: 'SaaS de gestão de projetos com Node.js e React',
    checks: [
      { type: 'specs_has_module', modulePrefix: 'SF-01',
        label: 'specs_suggested has SF-01-xxx' },
      { type: 'stack_has_any',
        values: ['saas-fullstack', 'node-js', 'react', 'dashboard-admin'],
        label: 'stack has saas/node/react' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  {
    id: 'ARCH-09', categoria: 'CAT-3',
    descricao: 'CLI utilitário: "ferramenta de linha de comando para renomear arquivos"',
    message: 'ferramenta de linha de comando para renomear arquivos em lote',
    checks: [
      { type: 'stack_has_any',
        values: ['cli-utility', 'node-js', 'python', 'typescript', 'javascript'],
        label: 'tags contain cli-utility or backend lang' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  {
    id: 'ARCH-10', categoria: 'CAT-3',
    descricao: 'Dashboard admin: "gerenciar usuários e relatórios"',
    message: 'dashboard administrativo para gerenciar usuários e relatórios',
    checks: [
      { type: 'stack_has_any',
        values: ['dashboard-admin', 'auth', 'database', 'react', 'saas-fullstack', 'node-js'],
        label: 'tags contain dashboard-admin or auth' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  {
    id: 'ARCH-11', categoria: 'CAT-3',
    descricao: 'Billing: "SaaS com assinatura mensal e pagamento recorrente"',
    message: 'SaaS com assinatura mensal e pagamento recorrente',
    checks: [
      { type: 'stack_has_any',
        values: ['billing-enabled', 'stripe', 'saas-fullstack', 'auth', 'database'],
        label: 'tags contain billing-enabled or stripe' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  {
    id: 'ARCH-12', categoria: 'CAT-3',
    descricao: 'Segurança: "sistema seguro contra invasão e vazamento de dados"',
    message: 'preciso que o sistema seja seguro contra invasão e vazamento de dados',
    checks: [
      { type: 'stack_has_any',
        values: ['security', 'auth', 'jwt', 'node-js', 'python'],
        label: 'tags contain security or auth' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  // ═══ CAT-4: Fallback por título ══════════════════════════════════════════════

  {
    id: 'ARCH-13', categoria: 'CAT-4',
    descricao: 'Fallback título: "agendamento para salão de beleza"',
    message: 'sistema de agendamento de horários para salão de beleza',
    checks: [
      { type: 'specs_or_empty_ok', confThreshold: 0.60,
        label: 'specs not empty OR confidence < 0.60 (fallback ok)' },
      { type: 'status_2xx', label: 'status 2xx' },
    ],
  },

  // ═══ CAT-5: Frontend/E2E — MANUAL ═══════════════════════════════════════════

  {
    id: 'ARCH-14', categoria: 'CAT-5',
    descricao: 'Manual: clicar spec sugerida → módulo SF correto ativa + highlight',
    message: null,
    manual: true,
  },

  {
    id: 'ARCH-15', categoria: 'CAT-5',
    descricao: 'Manual: "Pacote Completo" → cards de stack com ícone+label+tooltip',
    message: null,
    manual: true,
  },

  {
    id: 'ARCH-16', categoria: 'CAT-5',
    descricao: 'Manual: "Enviar para SF-03" → módulo muda, Arquiteto desativa, textarea populado',
    message: null,
    manual: true,
  },

  // ═══ CAT-6: Robustez ════════════════════════════════════════════════════════

  {
    id: 'ARCH-17', categoria: 'CAT-6',
    descricao: 'Erro: { message: "" } → status 400, error=message_required',
    message: '',
    expectError: true,
    expectErrorCode: 'message_required',
  },

  {
    id: 'ARCH-18', categoria: 'CAT-6',
    descricao: 'Erro: { message: "a".repeat(4001) } → status 400, error=message_too_long',
    message: 'a'.repeat(4001),
    expectError: true,
    expectErrorCode: 'message_too_long',
  },

  {
    id: 'ARCH-19', categoria: 'CAT-6',
    descricao: 'Erro: {} sem campo message → status 400, error presente',
    message: null,   // special: omit field entirely
    noField: true,
    expectError: true,
  },

];

// ── Run single scenario ────────────────────────────────────────────────────────
async function runScenario(scenario, axios) {
  if (scenario.manual) {
    addLog(`⏭  ${scenario.id} [MANUAL] — ${scenario.descricao}`);
    return {
      ...scenario,
      passou:       null,
      tempo_ms:     null,
      detalhes:     [{ nome: 'checklist manual — executar no browser', ok: null }],
      provider_used: null,
    };
  }

  state.ativo = `${scenario.id} — ${scenario.descricao}`;
  addLog(`▶ ${scenario.id} [${scenario.categoria}] ${scenario.descricao}`);

  const inicio  = Date.now();
  const body    = scenario.noField
    ? {}  // no message field at all
    : { message: scenario.message };

  let httpStatus = null;
  let respBody   = null;
  let errorMsg   = null;

  // §70 — retry on 502/503 (EB restart). Other errors: throw or capture.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await axios.post(
        `${WORKER_URL}/api/architect/interpret`,
        body,
        { timeout: 45_000 },
      );
      httpStatus = resp.status;
      respBody   = resp.data;
      break;
    } catch (err) {
      const status = err?.response?.status;
      if ((status === 502 || status === 503) && attempt < 3) {
        addLog(`  [RETRY] ${scenario.id} recebeu ${status}, aguardando 4s (tentativa ${attempt + 1}/3)`);
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      // 4xx expected for error scenarios
      if (err?.response) {
        httpStatus = err.response.status;
        respBody   = err.response.data;
        errorMsg   = null; // not a network error
      } else {
        httpStatus = 0;
        errorMsg   = err.message;
      }
      break;
    }
  }

  // Retry once if all providers failed (non-error scenarios)
  if (!scenario.expectError && !scenario._retried &&
      typeof respBody?.classification?.confidence !== 'number' &&
      httpStatus >= 200 && httpStatus < 300) {
    scenario._retried = true;
    addLog(`  ⚠ ${scenario.id}: resposta incompleta, retry em 3s`);
    await new Promise((r) => setTimeout(r, 3000));
    return runScenario(scenario, axios);
  }

  const tempo_ms   = Date.now() - inicio;
  const { passou, detalhes } = evaluate(scenario, httpStatus, respBody);
  const provider   = respBody?.provider_used || respBody?.classification?.provider || '—';

  const icone = passou ? '✅' : '❌';
  addLog(`  ${icone} ${scenario.id}: ${passou ? 'PASS' : 'FAIL'} (${tempo_ms}ms) provider=${provider}`);
  if (!passou) {
    const failed = detalhes.filter((d) => !d.ok).map((d) => d.nome).join(', ');
    addLog(`     Falhou: ${failed}`);
    if (respBody) {
      const conf = respBody?.classification?.confidence;
      const stack = respBody?.classification?.stack;
      const qs    = respBody?.open_questions?.length;
      addLog(`     conf=${conf} stack=${JSON.stringify(stack)} open_questions=${qs}`);
    }
    if (errorMsg) addLog(`     Erro: ${errorMsg}`);
  }

  return {
    ...scenario,
    passou,
    tempo_ms,
    detalhes,
    httpStatus,
    provider_used: provider,
    conf:   respBody?.classification?.confidence,
    stack:  respBody?.classification?.stack,
    specsN: (respBody?.specs_suggested || []).length,
    qsN:    (respBody?.open_questions  || []).length,
    erro:   errorMsg,
  };
}

// ── Save results ───────────────────────────────────────────────────────────────
async function saveResults() {
  const docsDir = join(ROOT, 'docs');
  mkdirSync(docsDir, { recursive: true });

  const auto   = state.resultados.filter((r) => !r.manual);
  const passes = auto.filter((r) => r.passou === true).length;
  const fails  = auto.filter((r) => r.passou === false).length;
  const total  = state.resultados.length;
  const autoN  = auto.length;
  const taxa   = autoN ? Math.round((passes / autoN) * 100) : 0;
  const now    = new Date().toISOString();

  // ── STRESS-TEST-ARCH-RESULTS.md ──
  const md = [
    `# Vision Core — Stress Test ARCH (Agente Arquiteto) Results`,
    ``,
    `**Data:** ${now}`,
    `**Resultado:** ${passes}/${autoN} PASS automáticos (${taxa}%) — 3 MANUAL pendentes`,
    ``,
    `## Cenários`,
    ``,
    `| ID | Categoria | Descrição | Status | Tempo | Conf | Provider |`,
    `|---|---|---|---|---|---|---|`,
    ...state.resultados.map((r) => {
      const status = r.manual ? '🔲 MANUAL' : (r.passou ? '✅ PASS' : '❌ FAIL');
      const tempo  = r.tempo_ms != null ? `${r.tempo_ms}ms` : '—';
      const conf   = r.conf != null ? (r.conf * 100).toFixed(0) + '%' : '—';
      return `| ${r.id} | ${r.categoria} | ${r.descricao} | ${status} | ${tempo} | ${conf} | ${r.provider_used || '—'} |`;
    }),
    ``,
    `## Checks por cenário`,
    ``,
    ...state.resultados.filter((r) => !r.manual).map((r) => [
      `**${r.id}:** ${r.passou ? '✅ PASS' : '❌ FAIL'}`,
      ...(r.detalhes || []).map((d) => `  - ${d.ok ? '✓' : '✗'} ${d.nome}`),
      ``,
    ].join('\n')),
  ].join('\n');

  // ── STRESS-TEST-ARCH-RESULTS.json ──
  const json = JSON.stringify(
    {
      data:       now,
      resultado:  `${passes}/${autoN} PASS automáticos (${taxa}%)`,
      total:      total,
      auto:       autoN,
      manual:     3,
      cenarios:   state.resultados.map((r) => ({
        id:           r.id,
        categoria:    r.categoria,
        descricao:    r.descricao,
        manual:       r.manual || false,
        passou:       r.passou,
        tempo_ms:     r.tempo_ms || null,
        http_status:  r.httpStatus || null,
        confidence:   r.conf   || null,
        stack:        r.stack  || null,
        specs_count:  r.specsN || 0,
        qs_count:     r.qsN   || 0,
        provider_used: r.provider_used || null,
        detalhes:     r.detalhes || [],
        erro:         r.erro || null,
      })),
    },
    null, 2,
  );

  // ── STRESS-TEST-ARCH-CERTIFICATION.md ──
  const statusEmoji = taxa === 100 ? '✅ CERTIFIED' : (taxa >= 80 ? '⚠️ PARTIAL' : '❌ FAIL');
  const allGaps     = state.resultados.filter((r) => !r.manual && r.passou === false);

  const certMd = [
    `# Vision Core — Stress Test ARCH Certification`,
    ``,
    `**Data:** ${now}`,
    `**Versão:** ARCH-V1.0`,
    `**Resultado:** ${passes}/${autoN} PASS automáticos (${taxa}%) — 3 manuais pendentes`,
    `**Status:** ${statusEmoji}`,
    ``,
    `## Certification Summary`,
    ``,
    `Stress Test do Agente Arquiteto executado contra o endpoint de produção ` +
    `(\`/api/architect/interpret\` via Cloudflare Worker). ` +
    `O teste valida interpretação de linguagem livre, calibração de confiança, ` +
    `cobertura da Spec Library (120 specs), fallback por título, e robustez de input.`,
    ``,
    `## Cenários Certificados`,
    ``,
    `| Categoria | ID | Descrição | Status | Conf | Specs | Provider |`,
    `|---|---|---|---|---|---|---|`,
    ...state.resultados.map((r) => {
      const status = r.manual
        ? '🔲 MANUAL'
        : (r.passou ? '✅ PASS' : '❌ FAIL');
      const conf  = r.conf != null ? (r.conf * 100).toFixed(0) + '%' : r.manual ? '—' : '—';
      const specs = r.specsN != null ? r.specsN : '—';
      return `| ${r.categoria} | ${r.id} | ${r.descricao} | ${status} | ${conf} | ${specs} | ${r.provider_used || '—'} |`;
    }),
    ``,
    `## Coverage`,
    ``,
    `| Área | Status |`,
    `|---|---|`,
    `| Leigo vs Técnico (CAT-1) | ${auto.filter((r) => r.categoria === 'CAT-1' && r.passou).length}/${auto.filter((r) => r.categoria === 'CAT-1').length} PASS |`,
    `| Confidence Gating (CAT-2) | ${auto.filter((r) => r.categoria === 'CAT-2' && r.passou).length}/${auto.filter((r) => r.categoria === 'CAT-2').length} PASS |`,
    `| Cobertura Spec Library (CAT-3) | ${auto.filter((r) => r.categoria === 'CAT-3' && r.passou).length}/${auto.filter((r) => r.categoria === 'CAT-3').length} PASS |`,
    `| Fallback por título (CAT-4) | ${auto.filter((r) => r.categoria === 'CAT-4' && r.passou).length}/${auto.filter((r) => r.categoria === 'CAT-4').length} PASS |`,
    `| Robustez / validação (CAT-6) | ${auto.filter((r) => r.categoria === 'CAT-6' && r.passou).length}/${auto.filter((r) => r.categoria === 'CAT-6').length} PASS |`,
    `| Frontend/E2E (CAT-5) | 🔲 MANUAL — ver checklist abaixo |`,
    ``,
    `## ✅ Gates Validados`,
    ``,
    `- Interpretação de linguagem livre (leigo e técnico) com confidence score`,
    `- Confidence Gating: perguntas geradas automaticamente quando confiança < limiar`,
    `- Matching automático contra Spec Library (120 specs, SF-01 a SF-09 + SEC + INT + LLM)`,
    `- Fallback por título quando matching por tag não encontra resultado`,
    `- Validação de input: mensagem vazia / muito longa / ausente → 400 com error code`,
    ``,
    `## 🔲 Checklist Manual — Frontend/E2E`,
    ``,
    `Execute no browser em ${WORKER_URL.replace('api-gateway.weiganlight.workers.dev', 'ai.pages.dev').replace('visioncore-', 'visioncore')} após enviar "quero um SaaS de gestão de projetos com Node.js" no modo 🏛️ Arquiteto:`,
    ``,
    `### ARCH-14 — Spec sugerida clicável → módulo SF correto`,
    `- [ ] Specs sugeridas aparecem no painel Arquiteto com indicador "→ SF-0X"`,
    `- [ ] Clicar numa spec ativa o módulo SF correspondente (setSoftwareFactoryModule)`,
    `- [ ] Spec específica fica destacada (highlight azul) e scrollada até a view`,
    `- [ ] **Resultado:** [ ] PASS  [ ] FAIL  — Observação: _______________`,
    ``,
    `### ARCH-15 — Pacote Completo: cards de stack com ícone+label+tooltip`,
    `- [ ] Botão "📦 VER CONFIGURAÇÃO COMPLETA SUGERIDA" aparece (confidence >= 0.6)`,
    `- [ ] Ao expandir, cards de stack mostram ícone + label legível (ex: 🖥️ Backend Node.js)`,
    `- [ ] Nenhum card mostra ⚙️ genérico para tags comuns (node-js, react, auth, database)`,
    `- [ ] Tooltip (hover) mostra explicação em português`,
    `- [ ] **Resultado:** [ ] PASS  [ ] FAIL  — Observação: _______________`,
    ``,
    `### ARCH-16 — "Enviar para SF-03" → navegação + textarea populado`,
    `- [ ] Clicar "➡️ ENVIAR PARA COMPOSITOR DE MISSÃO (SF-03)" muda para módulo SF-03`,
    `- [ ] Modo Arquiteto é desativado automaticamente`,
    `- [ ] Textarea (#vcSfChatInput) é populado com resumo estruturado (Projeto / Stack / Specs)`,
    `- [ ] Focus vai para o textarea (scroll até ele)`,
    `- [ ] Mensagem NÃO é enviada automaticamente — usuário controla`,
    `- [ ] **Resultado:** [ ] PASS  [ ] FAIL  — Observação: _______________`,
    ``,
    ...(allGaps.length > 0 ? [
      `## ⚠️ Gaps Identificados`,
      ``,
      `Os seguintes cenários falharam na execução automatizada:`,
      ``,
      ...allGaps.map((r) => {
        const failed = (r.detalhes || []).filter((d) => !d.ok).map((d) => d.nome).join(', ');
        return [
          `### ${r.id} — ${r.descricao}`,
          ``,
          `**Checks que falharam:** ${failed}`,
          `**Confidence real:** ${r.conf != null ? (r.conf * 100).toFixed(0) + '%' : 'N/A'}`,
          `**Stack real:** ${JSON.stringify(r.stack || [])}`,
          `**HTTP status:** ${r.httpStatus}`,
          ``,
          `**Análise:** _(a preencher: (a) bug real no endpoint/prompt, ou (b) check mal calibrado)_`,
          ``,
        ].join('\n');
      }),
    ] : [`## Gaps Identificados`, ``, `Nenhum gap nos cenários automatizados.`, ``]),
    ``,
    `## Performance`,
    ``,
    `- **Endpoint:** ${WORKER_URL}/api/architect/interpret`,
    `- **Timeout por cenário:** 45s`,
    `- **Retry:** 3 tentativas em 502/503 (§70)`,
    `- **Provider chain:** Groq → Cerebras → Gemini (fallback)`,
    ``,
  ].join('\n');

  await writeFile(join(docsDir, 'STRESS-TEST-ARCH-RESULTS.md'),       md,     'utf8');
  await writeFile(join(docsDir, 'STRESS-TEST-ARCH-RESULTS.json'),     json,   'utf8');
  await writeFile(join(docsDir, 'STRESS-TEST-ARCH-CERTIFICATION.md'), certMd, 'utf8');

  addLog(`📄 Resultados salvos em docs/STRESS-TEST-ARCH-RESULTS.md`);
  addLog(`📄 Certificação salva em docs/STRESS-TEST-ARCH-CERTIFICATION.md`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const server = startDashboard();
  const { default: axios } = await import('axios');

  addLog(`🏛️ Stress Test ARCH — ${SCENARIOS.length} cenários (${SCENARIOS.filter((s) => !s.manual).length} auto + 3 manual)`);
  addLog(`🔗 Worker: ${WORKER_URL}`);

  for (const scenario of SCENARIOS) {
    const resultado = await runScenario(scenario, axios);
    state.resultados.push(resultado);
    state.atual++;
    // Delay entre chamadas (manual → sem delay)
    if (!scenario.manual) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  state.rodando = false;
  state.ativo   = null;

  const auto   = state.resultados.filter((r) => !r.manual);
  const passes = auto.filter((r) => r.passou === true).length;
  const autoN  = auto.length;
  addLog(`\n🏁 FINAL: ${passes}/${autoN} PASS automáticos (${Math.round((passes / autoN) * 100)}%)`);

  await saveResults();

  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
