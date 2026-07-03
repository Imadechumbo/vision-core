#!/usr/bin/env node
/* _test115_apply_patch_multi_chat_ui.cjs — fecha o §109 no chat
   Asserts estruturais — sem navegador, sem rede, sem backend, sem agent real.
   §109 (apply_patch_multi) ficou testado e funcionando em vision-agent.js/server.js,
   mas SEM nenhum gatilho no chat — vision-core-bundle.js não tinha uma única referência
   a 'apply_patch_multi'. Esta etapa fecha esse gap:
     1. server.js — o prompt do LLM agora aceita um formato "files": [...] alternativo
        (além do file/patch único) e o §53 (multi-DIFF) instrui usá-lo quando há 2+ arquivos.
     2. vision-core-bundle.js — vcQueueApplyPatchViaAgent (§106) agora ramifica pra
        apply_patch_multi quando hermesObj.files está presente; renderApplyFixPanel,
        renderStandardMethodPanel e renderValidationPanel sabem exibir/disparar o caso
        multi-arquivo, reaproveitando a MESMA função de polling — nada duplicado.
   Achado em paralelo corrigido nesta sessão (bug pré-existente, não introduzido agora):
   os dois pontos que chamam vcQueueApplyPatchViaAgent ignoravam rd.ok e sempre
   renderizavam renderValidationPanel (painel de "sucesso, aprove o push") mesmo quando
   o agent retornava patch_failed/patch_rollback/patch_multi_failed/patch_multi_rollback
   (ok:false, nada comitado, tudo revertido). Corrigido nos dois call sites.
   vision-agent.js e o endpoint /api/agent/mission/queue (§109) NÃO foram tocados —
   o contrato apply_patch_multi já existia e está testado pelo _test109_*; esta etapa só
   constrói o caminho do chat até ele. */

'use strict';
const fs   = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, 'frontend', 'assets', 'vision-core-bundle.js');
const SERVER = path.join(__dirname, 'backend', 'server.js');
const AGENT  = path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js');

for (const f of [BUNDLE, SERVER, AGENT]) {
  if (!fs.existsSync(f)) { console.error('ARQUIVO NÃO ENCONTRADO: ' + f); process.exit(1); }
}

const bundle = fs.readFileSync(BUNDLE, 'utf8');
const server = fs.readFileSync(SERVER, 'utf8');
const agent  = fs.readFileSync(AGENT, 'utf8');

let passed = 0;
let failed = 0;

function assert(desc, expr) {
  if (expr) { console.log('  ✅ PASS: ' + desc); passed++; }
  else       { console.error('  ❌ FAIL: ' + desc); failed++; }
}

function count(src, pattern) {
  return (src.match(new RegExp(pattern, 'g')) || []).length;
}

console.log('\n§115 apply_patch_multi — gatilho real no chat\n');

/* ── BACKEND: prompt aceita o formato multi-arquivo ──────────────────── */

assert(
  'server.js: bloco "FORMATO MULTI-ARQUIVO" presente nas instruções do LLM',
  server.includes('FORMATO MULTI-ARQUIVO')
);
assert(
  'server.js: formato multi-arquivo usa "files" (array) com file/fix_type/patch por item',
  /"files":\s*\[/.test(server) && server.includes('"file": "caminho/A.js"')
);
assert(
  'server.js: regra explícita contra "files" com 1 único item (não force multi-arquivo)',
  server.includes('nunca use "files" com 1 único item')
);
assert(
  'server.js: §53 (multi-DIFF) instrui usar o formato files[] quando 2+ blocos [DIFF]',
  server.includes('§115:') && server.includes('FORMATO MULTI-ARQUIVO') &&
  /MÚLTIPLOS BUGS[\s\S]{0,400}§115/.test(server)
);
assert(
  'server.js: ensureHermesJson (§34 re-prompt) também sabe extrair files[] quando aplicável',
  /extractPrompt[\s\S]{0,2000}"files"/.test(server)
);

/* Regressão — o formato de 1 arquivo (caso comum) continua exatamente como era */
assert(
  'server.js: formato de 1 arquivo (file/fix_type/patch) intacto — regra REGRAS POR fix_type não mudou',
  server.includes('"fix_type":   "json_field | code_patch | full_replace"') &&
  server.includes('json_field   → patch = objeto com campos a setar.')
);

/* Regressão — apply_patch_multi no backend (§109) não foi tocado nesta sessão */
assert(
  'server.js: validação de apply_patch_multi (§109) intacta — mesmas 2 mensagens de erro',
  server.includes('apply_patch_multi_requires_files_array') &&
  server.includes('apply_patch_multi_each_file_requires_file_and_patch')
);

/* ── FRONTEND: renderHermesBlock sabe exibir múltiplos arquivos ─────────── */

assert(
  'renderHermesBlock: ramo isMulti115 detecta Array.isArray(obj.files)',
  /isMulti115\s*=\s*Array\.isArray\(obj\.files\)/.test(bundle)
);
assert(
  'renderHermesBlock: mostra contagem de arquivos quando multi (não um único "Arquivo:")',
  bundle.includes("Arquivos (' + obj.files.length + '):</b>")
);
assert(
  'renderHermesBlock: 1 <details> por arquivo no caso multi (patch individual, nunca um blob combinado)',
  bundle.includes("obj.files.forEach(function(f) {") &&
  bundle.includes("'Ver patch — ' + (f.file || '?')")
);

/* ── FRONTEND: vcQueueApplyPatchViaAgent (§106) ramifica pra apply_patch_multi ─── */

assert(
  'vcQueueApplyPatchViaAgent: ramifica em isMulti115 = Array.isArray(hermesObj.files)',
  /function vcQueueApplyPatchViaAgent[\s\S]{0,400}isMulti115\s*=\s*Array\.isArray\(hermesObj\.files\)/.test(bundle)
);
assert(
  'vcQueueApplyPatchViaAgent: corpo multi-arquivo usa type: \'apply_patch_multi\' + files mapeado',
  bundle.includes("type: 'apply_patch_multi', files: hermesObj.files.map(function(f)")
);
assert(
  'vcQueueApplyPatchViaAgent: corpo single-file (regressão) ainda usa type: \'apply_patch\' com file/patch diretos',
  bundle.includes("type: 'apply_patch', file: hermesObj.file, patch: hermesObj.patch")
);
assert(
  'vcQueueApplyPatchViaAgent: definida exatamente 1 vez (sem duplicação)',
  count(bundle, 'function vcQueueApplyPatchViaAgent') === 1
);

/* ── FRONTEND: renderApplyFixPanel sabe lidar com diagnóstico multi-arquivo ─── */

assert(
  'renderApplyFixPanel: applyBtn (ZIP/apply-patch, single-file only) é null quando multi-arquivo',
  bundle.includes('var applyBtn  = isMulti115panel ? null :')
);
assert(
  'renderApplyFixPanel: agentBtn rotulado com contagem de arquivos quando multi',
  bundle.includes("'📡 Aplicar no Vision Agent Local (' + hermesObj.files.length + ' arquivos)'")
);
assert(
  'renderApplyFixPanel: agentBtn.onclick aceita hermesObj.files (multi) além de patch+file (single)',
  /_hasMulti115\s*=\s*Array\.isArray\(hermesObj\.files\)/.test(bundle) &&
  bundle.includes('if (!_hasSingle115 && !_hasMulti115)')
);
assert(
  'renderApplyFixPanel: nota explicando que o fix multi-arquivo só roda via Vision Agent Local',
  bundle.includes('só disponível via Vision Agent Local, que aplica todos atomicamente (§109)')
);

/* ── FRONTEND: renderStandardMethodPanel (EXECUTAR MISSÃO) — mesmo tratamento ─── */

assert(
  'renderStandardMethodPanel: agentBtn106 aparece também para diagnóstico multi-arquivo',
  /agentBtn106\s*=\s*\(h && h\.patch && h\.file\) \|\| _hMulti115sm/.test(bundle)
);
assert(
  'renderStandardMethodPanel: confirmBtn redireciona (não trata como erro) quando h.files presente',
  bundle.includes('Standard Method — fix multi-arquivo') &&
  bundle.includes('"Confirmar e Aplicar Patch" (Standard Method) só cobre 1 arquivo por vez')
);
assert(
  'renderStandardMethodPanel: diagBox mostra lista de arquivos quando multi, sem quebrar o caso single',
  bundle.includes("isMulti115sm = Array.isArray(h.files) && h.files.length > 0") &&
  bundle.includes('fileRow115sm')
);

/* ── FRONTEND: renderValidationPanel exibe corretamente o resultado multi-arquivo ─── */

assert(
  'renderValidationPanel: detecta res.files (array) e mostra título "N arquivos... único commit"',
  bundle.includes("isMulti115v = Array.isArray(res.files)") &&
  bundle.includes("' arquivos aplicados num único commit")
);
assert(
  'renderValidationPanel: push/revert envia os arquivos juntos (res.files.join) quando multi',
  count(bundle, "isMulti115v \\? res\\.files\\.join\\(', '\\)") === 2
);

/* ── §115fix: bug pré-existente corrigido — rd.ok=false nunca deve renderizar painel de sucesso ─── */

assert(
  'renderApplyFixPanel.onDone: checa rd.ok === false antes de renderValidationPanel (não mostra "sucesso" numa falha)',
  /agentBtn\.onclick[\s\S]{0,1600}if \(rd && rd\.ok === false\) \{\s*\n\s*appendMsg\(rd\.output/.test(bundle)
);
assert(
  'renderStandardMethodPanel.onDone: mesma checagem rd.ok === false aplicada no botão agentBtn106',
  /agentBtn106\.onclick[\s\S]{0,1600}if \(rd && rd\.ok === false\) \{\s*\n\s*appendMsg\(rd\.output/.test(bundle)
);

/* ── Regressão — nada do §105/§106/§109/§113 foi removido ou duplicado ─── */

assert('renderApplyFixPanel intacta — 1 definição',        count(bundle, 'function renderApplyFixPanel') === 1);
assert('renderStandardMethodPanel intacta — 1 definição',  count(bundle, 'function renderStandardMethodPanel') === 1);
assert('renderValidationPanel intacta — 1 definição',      count(bundle, 'function renderValidationPanel') === 1);
assert('renderHermesBlock intacta — 1 definição',           count(bundle, 'function renderHermesBlock') === 1);
assert('parseHermesBlock intacta — 1 definição (não precisou mudar)', count(bundle, 'function parseHermesBlock') === 1);
assert('vcQueueSfDryRunViaAgent (§113) intacta — 1 definição', count(bundle, 'function vcQueueSfDryRunViaAgent') === 1);

/* vision-agent.js NÃO foi tocado nesta sessão — o contrato apply_patch_multi já existia
   desde o §109 e está certificado pelo _test109_*; aqui só confirmamos que continua lá. */
assert(
  'vision-agent.js: applyPatchMultiMission (§109) ainda dispatchada por type apply_patch_multi (contrato intocado)',
  agent.includes("m.type === 'apply_patch_multi' ? applyPatchMultiMission :")
);
/* Nota (§116): a asserção que originalmente checava `!agent.includes('§115')`
   foi removida aqui. Sua premissa — "vision-agent.js não foi tocado nesta
   sessão" — era verdadeira só no momento do §115 (agent ficou de fora,
   etapa era só backend+frontend); deixou de ser uma invariante válida no
   §116, que passou a tocar vision-agent.js por um motivo sem relação com o
   §115 (dry-run multi-arquivo), e cujos comentários de código citam "§115"
   como referência histórica de onde vem o formato files[] que ele consome.
   Isso não é uma regressão de comportamento — é só a checagem ter ficado
   datada. A garantia que de fato importa (dispatcher/contrato do §109
   intactos) já está coberta pela asserção acima, e reconfirmada de ponta a
   ponta pela regressão completa do _test109_multi_patch_atomic_e2e.sh. */

/* ── Achado em paralelo (bug pré-existente, não introduzido nesta sessão): ───────
   _h49budgetMs era referenciado na resposta 503 de ALL_PROVIDERS_EXHAUSTED mas
   NUNCA foi definido em lugar nenhum do arquivo — resquício de um "budget" global
   que um refactor anterior (comentário §49 nas linhas acima) removeu, sem atualizar
   essa 1 linha. Crashava o processo (ReferenceError não tratado) toda vez que TODOS
   os providers de IA falhassem ao mesmo tempo — cenário raro em produção (precisa de
   outage simultâneo) mas real, e 100% reprodutível neste sandbox sem chaves de API. */
assert(
  'server.js: _h49budgetMs (variável nunca definida) não existe mais em lugar nenhum',
  !server.includes('_h49budgetMs')
);
assert(
  'server.js: mensagem de ALL_PROVIDERS_EXHAUSTED agora usa _h49timeout (variável real, já em scope)',
  server.includes("'Todos os providers de IA falharam ou atingiram o timeout de ' + (_h49timeout / 1000) + 's. '")
);

console.log('\n' + (failed === 0 ? '✅ ALL PASS' : '❌ FAILURES') +
  ': ' + passed + '/' + (passed + failed) + '\n');

if (failed > 0) process.exit(1);
