#!/usr/bin/env node
/**
 * VISION AGENT LOCAL v1.2 — SDDF compliant
 * Fluxo: scan → hermes(askIA) → parsePatch → applyPatch → aegis(validate) → commit
 *
 * SDDF refs: seção 14 (fluxo), seção 15 (papéis), seção 16 (Software Factory)
 * SDDF flags: deploy_allowed=false | pass_gold_real=false | push=manual sempre
 *
 * COMO USAR:
 *   node vision-agent.js "C:\caminho\do\projeto"
 *   VC_WORKER=http://localhost:8080 node vision-agent.js .
 */
'use strict';
const fs            = require('fs');
const path          = require('path');
const https         = require('https');
const http          = require('http');
const os            = require('os');
const { spawnSync } = require('child_process');

const VERSION = '1.2';
const WORKER  = process.env.VC_WORKER  || 'https://visioncore-api-gateway.weiganlight.workers.dev';
const POLL_MS = Number(process.env.VC_POLL_MS) || 3000;
const ROOT    = path.resolve(process.argv[2] || process.cwd());

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   VISION AGENT LOCAL v' + VERSION + '             ║');
console.log('╚══════════════════════════════════════════╝');
console.log('Projeto : ' + ROOT);
console.log('Worker  : ' + WORKER);
console.log('SDDF    : scan→hermes→patch→aegis→commit');
console.log('');

/* ── HTTP helper ──────────────────────────────────────────────── */
function httpRequest(url, opts, cb) {
  var u    = new URL(url);
  var mod  = u.protocol === 'https:' ? https : http;
  var body = opts.body ? JSON.stringify(opts.body) : null;
  var reqOpts = {
    method:  opts.method || 'GET',
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      body ? { 'Content-Length': Buffer.byteLength(body) } : {},
      opts.headers || {}
    ),
    rejectUnauthorized: false,
    timeout: opts.timeout || 20000
  };
  var req = mod.request(url, reqOpts, function(res) {
    var data = '';
    res.on('data', function(c) { data += c; });
    res.on('end', function() {
      try   { cb(null, { status: res.statusCode, body: JSON.parse(data) }); }
      catch { cb(null, { status: res.statusCode, body: data }); }
    });
  });
  req.on('error', cb);
  req.on('timeout', function() { req.destroy(new Error('timeout')); });
  if (body) req.write(body);
  req.end();
}

/* ── Scanner — Context Builder ────────────────────────────────── */
// SDDF papel: Context Builder / Scanner
// Prioridade: byName (filename match) > byContent (keyword match)

var TEXT_EXTS = new Set(['.json','.js','.ts','.jsx','.tsx','.html','.css','.md','.txt','.py','.go']);
var SKIP_DIRS = new Set(['node_modules','.git','dist','.next','build','coverage','.vscode','__pycache__']);

function scanProject(input) {
  var result  = { files: [], byName: [], byContent: [], target: null, content: '' };
  var words   = input.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2; });
  var fileRefs = words.filter(function(w) { return w.includes('.') && w.length > 3; });

  function walk(dir, depth) {
    if (depth > 5) return;
    var entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (SKIP_DIRS.has(e.name)) continue;
      var full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full, depth + 1); continue; }
      var ext = path.extname(e.name).toLowerCase();
      if (!TEXT_EXTS.has(ext)) continue;
      result.files.push(full);
      var nameLower = e.name.toLowerCase();

      // Busca 1 — por nome de arquivo (prioridade máxima)
      var nameMatch = fileRefs.some(function(fn) { return nameLower === fn; });
      if (nameMatch) {
        try {
          var text = fs.readFileSync(full, 'utf8');
          result.byName.push({ file: full, content: text, score: 100 });
        } catch(err) {}
      }

      // Busca 2 — por conteúdo (fallback quando sem byName)
      if (!result.byName.length) {
        try {
          var content = fs.readFileSync(full, 'utf8');
          var lc      = content.toLowerCase();
          var score   = words.filter(function(w) { return w.length > 3 && lc.includes(w); }).length;
          if (score > 0) result.byContent.push({ file: full, content: content, score: score });
        } catch(err2) {}
      }
    }
  }

  walk(ROOT, 0);
  result.byContent.sort(function(a, b) { return b.score - a.score; });

  var top = result.byName[0] || result.byContent[0];
  if (top) {
    result.target  = top.file;
    result.content = top.content.slice(0, 4000);
  }
  return result;
}

/* ── Hermes / askIA — supervisor de decisão ──────────────────── */
// SDDF papel: Hermes — RCA + Decision + mode=fix JSON patch
// §111 — fileLabel adicionado: o gate anti-alucinação do backend (§25, em
// server.js) só libera mode=fix se a mensagem tiver um nome de arquivo
// entre colchetes (ex: "[buggy.js]") — sem isso, TODA chamada caía em
// BLOCKED_INPUT antes de chegar no LLM, mesmo com conteúdo real anexado.
// Isso afetava o executeMission() original (chamada sem fileLabel) desde
// sempre; corrigido aqui mantendo o parâmetro opcional pra não quebrar
// nenhuma chamada existente — só passa a respeitar o gate de verdade.
function askIA(fileContent, missionInput, fileLabel) {
  return new Promise(function(resolve, reject) {
    var label   = fileLabel || 'arquivo.txt';
    var message = '[' + label + ']\n' + fileContent + '\n\nMISSÃO:\n' + missionInput;
    httpRequest(WORKER + '/api/chat', {
      method:  'POST',
      body:    { message: message, mode: 'fix' },
      timeout: 25000
    }, function(err, res) {
      if (err) return reject(err);
      if (res.body && res.body.answer) return resolve(res.body.answer);
      reject(new Error('resposta vazia da IA (status ' + (res && res.status) + ')'));
    });
  });
}

/* ── parsePatchFromAI — extrair bloco JSON ───────────────────── */
function parsePatchFromAI(aiAnswer) {
  var patterns = [
    /```json\s*\n([\s\S]*?)\n```/,
    /```json([\s\S]*?)```/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = aiAnswer.match(patterns[i]);
    if (m) {
      try {
        var parsed = JSON.parse(m[1]);
        if (parsed && (parsed.fix_type || parsed.diagnosis || parsed.patch)) return parsed;
      } catch(e) {}
    }
  }
  return null;
}

/* ── applyPatch — PatchEngine com backup ─────────────────────── */
// SDDF papel: PatchEngine
// Backup automático antes de qualquer alteração — rollback via backup se falhar
function applyPatch(filePath, patch, fixType) {
  var backup = filePath + '.vision-bak';
  try {
    fs.copyFileSync(filePath, backup);
  } catch(e) {
    return { ok: false, error: 'backup falhou: ' + e.message };
  }

  try {
    if (fixType === 'json_field') {
      var obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      var fields = patch.fields || patch;
      if (Array.isArray(obj) && patch.target_title) {
        // Localiza item no array pelo título/nome
        var found = false;
        for (var i = 0; i < obj.length; i++) {
          var item = obj[i];
          var title = (item.title || item.name || item.label || '').toLowerCase();
          if (title.includes(patch.target_title.toLowerCase())) {
            Object.assign(item, fields);
            found = true;
            break;
          }
        }
        if (!found) throw new Error('item com title "' + patch.target_title + '" não encontrado no array');
      } else if (typeof obj === 'object' && !Array.isArray(obj)) {
        Object.assign(obj, fields);
      } else {
        throw new Error('json_field: arquivo não é objeto nem array com target_title');
      }
      fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');

    } else if (fixType === 'code_patch') {
      var src    = fs.readFileSync(filePath, 'utf8');
      var search  = patch.search  || patch.old_value || '';
      var replace = patch.replace !== undefined ? patch.replace : (patch.new_value || '');
      if (!search) throw new Error('code_patch: campo search ausente');
      if (!src.includes(search)) throw new Error('code_patch: trecho "' + search.slice(0,40) + '..." não encontrado');
      fs.writeFileSync(filePath, src.replace(search, replace), 'utf8');

    } else {
      // full_replace
      var newContent = typeof patch === 'string' ? patch : JSON.stringify(patch, null, 2) + '\n';
      fs.writeFileSync(filePath, newContent, 'utf8');
    }

    // Sucesso — remover backup
    try { fs.unlinkSync(backup); } catch(e) {}
    return { ok: true };

  } catch(e) {
    // Falha — restaurar backup
    try { fs.copyFileSync(backup, filePath); fs.unlinkSync(backup); } catch(e2) {}
    return { ok: false, error: e.message };
  }
}

/* ── validatePatch — Aegis ───────────────────────────────────── */
// SDDF papel: Aegis (gatekeeper de validade)
function validatePatch(filePath) {
  var ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    try { JSON.parse(fs.readFileSync(filePath, 'utf8')); return { ok: true }; }
    catch(e) { return { ok: false, error: 'JSON inválido: ' + e.message }; }
  }
  if (['.js','.mjs','.cjs'].includes(ext)) {
    var r = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8', timeout: 10000 });
    if (r.status === 0) return { ok: true };
    return { ok: false, error: (r.stderr || r.stdout || '').trim().slice(0, 200) };
  }
  return { ok: true };
}

/* ── gitCommit — sem push (SDDF: deploy_allowed=false) ─────── */
function gitCommit(filePath, message) {
  var rel = path.relative(ROOT, filePath);
  var addR = spawnSync('git', ['add', rel], { cwd: ROOT, encoding: 'utf8' });
  if (addR.status !== 0) return { ok: false, error: 'git add: ' + addR.stderr.trim() };
  var comR = spawnSync('git', ['commit', '-m', message], { cwd: ROOT, encoding: 'utf8' });
  if (comR.status !== 0) return { ok: false, error: 'git commit: ' + comR.stderr.trim().slice(0, 100) };
  var logR = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return { ok: true, hash: (logR.stdout || '').trim(), output: comR.stdout.trim().slice(0, 80) };
}

/* ── gitPush — push autorizado por humano (OBJETIVO 2) ─────── */
function gitPush(m) {
  return new Promise(function(resolve) {
    console.log('[GoCore] git push origin HEAD — aprovação humana recebida');
    var r = spawnSync('git', ['push', 'origin', 'HEAD'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
    var ok = r.status === 0;
    resolve({
      ok:            ok,
      action:        ok ? 'pushed' : 'push_failed',
      mission_id:    m.id,
      output:        ((r.stdout || '') + (r.stderr || '')).trim().slice(0, 300),
      sddf_baseline: SDDF_BASELINE
    });
  });
}

/* ── gitRevert — reverte último commit autorizado por humano ── */
function gitRevert(m) {
  return new Promise(function(resolve) {
    console.log('[GoCore] git reset --hard HEAD~1 — reversão humana recebida');
    var r = spawnSync('git', ['reset', '--hard', 'HEAD~1'], { cwd: ROOT, encoding: 'utf8', timeout: 15000 });
    var ok = r.status === 0;
    resolve({
      ok:            ok,
      action:        ok ? 'reverted' : 'revert_failed',
      mission_id:    m.id,
      output:        ((r.stdout || '') + (r.stderr || '')).trim().slice(0, 300),
      sddf_baseline: SDDF_BASELINE
    });
  });
}

/* ── SDDF baseline obrigatório ───────────────────────────────── */
var SDDF_BASELINE = {
  deploy_allowed:         false,
  promotion_allowed:      false,
  pass_gold_real_claimed: false,
  production_touched:     false
};

/* ── executeMission — PI Harness / orquestrador ─────────────── */
// Papéis: Scanner → Hermes → PatchEngine → Aegis → GoCore(commit)
async function executeMission(m) {
  var log   = [];
  var steps = [];

  function step(agent, ok, detail) {
    steps.push({ agent: agent, ok: ok, detail: detail });
    log.push(agent + ': ' + (ok ? '✓' : '✗') + ' ' + detail);
    console.log('  › ' + agent + ': ' + detail);
  }

  // ── PASSO 1: Scanner ────────────────────────────────────────
  var scan = scanProject(m.input || '');
  step('Scanner', scan.target !== null,
    scan.target
      ? 'byName=' + scan.byName.length + ' byContent=' + scan.byContent.length + ' → ' + path.relative(ROOT, scan.target)
      : scan.files.length + ' arquivos, sem match'
  );

  if (!scan.target) {
    return {
      mission_id: m.id, ok: true, pass_gold: false,
      action:  'listing',
      output:  'Estrutura do projeto (' + ROOT + '):\n' + scan.files.slice(0, 40).map(function(f) { return '  ' + path.relative(ROOT, f); }).join('\n'),
      files:   scan.files.length, target: null,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  var relTarget = path.relative(ROOT, scan.target);

  // ── PASSO 2: Hermes/askIA ────────────────────────────────────
  var aiAnswer = '';
  try {
    aiAnswer = await askIA(scan.content, m.input, relTarget);
    step('Hermes', true, 'diagnóstico OK (' + aiAnswer.length + ' chars)');
  } catch(e) {
    step('Hermes', false, e.message);
    return {
      mission_id: m.id, ok: true, pass_gold: false,
      action:  'file_content_fallback',
      output:  'Arquivo: ' + relTarget + '\n\n' + scan.content,
      files:   scan.files.length, target: scan.target,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  // ── PASSO 3: parsePatch ──────────────────────────────────────
  var patchJson = parsePatchFromAI(aiAnswer);
  if (!patchJson || !patchJson.patch) {
    step('PatchEngine', false, 'sem bloco JSON — análise apenas');
    return {
      mission_id: m.id, ok: true, pass_gold: false,
      action: 'hermes_analysis', output: aiAnswer,
      files:  scan.files.length, target: scan.target,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  // ── PASSO 4: applyPatch ──────────────────────────────────────
  var targetFile = scan.target;
  if (patchJson.file) {
    var resolved = path.resolve(ROOT, patchJson.file);
    if (fs.existsSync(resolved)) targetFile = resolved;
  }

  var patchData = patchJson.patch;
  // Injetar target_title para json_field em arrays
  if (patchJson.fix_type === 'json_field' && typeof patchData === 'object') {
    patchData.target_title = patchData.target_title ||
      (m.input || '').replace(/\b(corrigir|fix|campo|vazio|cover|field|update|alterar|mudar)\b/gi, '').trim();
  }

  var patchResult = applyPatch(targetFile, patchData, patchJson.fix_type || 'full_replace');
  step('PatchEngine', patchResult.ok, patchResult.ok ? patchJson.fix_type + ' → ' + path.relative(ROOT, targetFile) : patchResult.error);

  if (!patchResult.ok) {
    return {
      mission_id: m.id, ok: false, pass_gold: false,
      action:  'patch_failed',
      output:  aiAnswer + '\n\n⚠️ Patch falhou (rollback automático via backup):\n' + patchResult.error,
      files:   scan.files.length, target: scan.target,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  // ── PASSO 5: Aegis/validatePatch ────────────────────────────
  var validation = validatePatch(targetFile);
  step('Aegis', validation.ok, validation.ok ? 'PASS' : 'FAIL — ' + validation.error);

  if (!validation.ok) {
    spawnSync('git', ['checkout', '--', path.relative(ROOT, targetFile)], { cwd: ROOT });
    step('Rollback', true, 'git checkout -- ' + path.relative(ROOT, targetFile));
    return {
      mission_id: m.id, ok: false, pass_gold: false,
      action:  'patch_rollback',
      output:  aiAnswer + '\n\n⚠️ Validação falhou — arquivo revertido:\n' + validation.error,
      files:   scan.files.length, target: scan.target,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  // ── PASSO 6: gitCommit (sem push) ────────────────────────────
  var diagnosis  = (patchJson.diagnosis || m.input || 'fix').slice(0, 60);
  var commitMsg  = 'fix: ' + diagnosis + ' [vision-agent v' + VERSION + ']';
  var commitResult = gitCommit(targetFile, commitMsg);
  step('GoCore', commitResult.ok, commitResult.ok ? 'commit ' + commitResult.hash : commitResult.error);

  var outputLines = [
    aiAnswer, '',
    '─────────────────────────────────────────────',
    commitResult.ok ? '✅ Patch aplicado e commitado' : '⚠️  Patch aplicado — commit falhou',
    'Arquivo : ' + path.relative(ROOT, targetFile),
    'Commit  : ' + (commitResult.hash || 'N/A'),
    '',
    '⚠️  Push pendente — revisar e aprovar manualmente:',
    '   git -C "' + ROOT + '" push origin main',
    '',
    'SDDF: deploy_allowed=false | pass_gold_real=false | push=manual'
  ];

  return {
    mission_id:  m.id,
    ok:          true,
    pass_gold:   false,       // SDDF: nunca true no agent local
    action:      commitResult.ok ? 'patch_applied_committed' : 'patch_applied_no_commit',
    output:      outputLines.join('\n'),
    files:       scan.files.length,
    target:      scan.target,
    committed:   commitResult.ok,
    commit_hash: commitResult.hash || null,
    patch:       { fix_type: patchJson.fix_type, diagnosis: patchJson.diagnosis, confidence: patchJson.confidence },
    validation:  'PASS',
    log:         log,
    steps:       steps,
    sddf:        SDDF_BASELINE
  };
}

/* ── applyPatchMission — pula Scanner+Hermes, direto ao PatchEngine ── */
// Tipo: 'apply_patch'
// Dados: { type, file, fix_type, patch, diagnosis, mission_id }
// Fonte: patch pré-computado pelo /api/chat ZIP (front já tem o JSON)
function applyPatchMission(m) {
  return new Promise(function(resolve) {
    var steps = [];
    var log   = [];
    function step(agent, ok, detail) {
      steps.push({ agent: agent, ok: ok, detail: detail });
      log.push(agent + ': ' + (ok ? '✓' : '✗') + ' ' + detail);
      console.log('  › ' + agent + ': ' + detail);
    }

    // Resolver caminho — tenta direto, fallback busca por nome no projeto
    var targetFile = m.file ? path.resolve(ROOT, m.file) : null;
    if (!targetFile || !fs.existsSync(targetFile)) {
      // Fallback: buscar pelo nome do arquivo dentro do projeto
      var baseName = m.file ? path.basename(m.file) : null;
      if (baseName) {
        var found = null;
        function findFile(dir, depth) {
          if (depth > 6 || found) return;
          var entries;
          try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
          for (var i = 0; i < entries.length; i++) {
            if (found) return;
            var e = entries[i];
            if (SKIP_DIRS.has(e.name)) continue;
            var full = path.join(dir, e.name);
            if (e.isDirectory()) { findFile(full, depth + 1); }
            else if (e.name === baseName) { found = full; }
          }
        }
        findFile(ROOT, 0);
        if (found) {
          step('Resolver', true, 'busca por nome: ' + path.relative(ROOT, found));
          targetFile = found;
        } else {
          step('Resolver', false, 'não encontrado por caminho ou nome: ' + m.file);
          return resolve({
            mission_id: m.id, ok: false, pass_gold: false,
            action: 'patch_failed',
            output: '❌ Arquivo não encontrado: ' + m.file +
                    '\n\nBuscado em: ' + ROOT +
                    '\nVerifique se o Vision Agent foi iniciado na raiz correta do projeto.',
            log: log, steps: steps, sddf: SDDF_BASELINE
          });
        }
      } else {
        step('Resolver', false, 'campo file ausente na missão');
        return resolve({
          mission_id: m.id, ok: false, pass_gold: false,
          action: 'patch_failed',
          output: '❌ Campo file ausente na missão apply_patch.',
          log: log, steps: steps, sddf: SDDF_BASELINE
        });
      }
    } else {
      var relTarget0 = path.relative(ROOT, targetFile);
      step('Resolver', true, relTarget0);
    }

    var relTarget = path.relative(ROOT, targetFile);
    step('Resolver', true, relTarget);

    // PatchEngine — com backup+rollback automático
    var patchResult = applyPatch(targetFile, m.patch, m.fix_type || 'code_patch');
    step('PatchEngine', patchResult.ok,
      patchResult.ok ? (m.fix_type || 'code_patch') + ' → ' + relTarget : patchResult.error);

    if (!patchResult.ok) {
      return resolve({
        mission_id: m.id, ok: false, pass_gold: false,
        action: 'patch_failed',
        output: '❌ Patch falhou (rollback automático via backup):\n' + patchResult.error,
        file: relTarget, fix_type: m.fix_type,
        log: log, steps: steps, sddf: SDDF_BASELINE
      });
    }

    // Aegis — validar sintaxe
    var validation = validatePatch(targetFile);
    step('Aegis', validation.ok, validation.ok ? 'PASS' : 'FAIL — ' + validation.error);

    if (!validation.ok) {
      spawnSync('git', ['checkout', '--', relTarget], { cwd: ROOT });
      step('Rollback', true, 'git checkout -- ' + relTarget);
      return resolve({
        mission_id: m.id, ok: false, pass_gold: false,
        action: 'patch_rollback',
        output: '⚠️ Validação Aegis falhou — arquivo revertido:\n' + validation.error,
        file: relTarget, fix_type: m.fix_type,
        log: log, steps: steps, sddf: SDDF_BASELINE
      });
    }

    // GitCommit — sem push (SDDF: deploy_allowed=false)
    var diagnosis    = (m.diagnosis || 'vision fix').slice(0, 60);
    var commitMsg    = 'fix: ' + diagnosis + ' [vision-agent apply_patch]';
    var commitResult = gitCommit(targetFile, commitMsg);
    step('GoCore', commitResult.ok, commitResult.ok ? 'commit ' + commitResult.hash : commitResult.error);

    resolve({
      mission_id:  m.id,
      ok:          true,
      pass_gold:   false,
      action:      commitResult.ok ? 'patch_applied_committed' : 'patch_applied_no_commit',
      output: [
        '✅ Patch aplicado via apply_patch',
        'Arquivo : ' + relTarget,
        'Fix type: ' + (m.fix_type || 'code_patch'),
        'Commit  : ' + (commitResult.hash || 'N/A'),
        '',
        '⚠️  Push pendente — revisar e aprovar manualmente.',
        'SDDF: deploy_allowed=false | push=manual'
      ].join('\n'),
      file:       relTarget,
      hash:       commitResult.hash || null,
      fix_type:   m.fix_type || 'code_patch',
      patch:      m.patch,
      validation: 'PASS',
      log:        log,
      steps:      steps,
      sddf:       SDDF_BASELINE
    });
  });
}

/* ── §109 — Etapa D: multi-arquivo atômico ───────────────────────
 * Princípio: uma missão pode tocar N arquivos, mas é tudo-ou-nada.
 * Se qualquer patch ou validação Aegis falhar em qualquer arquivo,
 * TODOS os arquivos da missão voltam ao estado anterior (git checkout)
 * — nenhuma alteração parcial fica no repositório. No caminho feliz,
 * é feito exatamente UM commit cobrindo todos os arquivos juntos
 * (não um commit por arquivo). Reaproveita applyPatch/validatePatch
 * já testados pelo §105 — não duplica a lógica de patch em si, só a
 * orquestração de múltiplos arquivos em volta dela. */

/* Mesma lógica de resolução por nome do applyPatchMission, extraída como
 * helper standalone — não toca na função single-arquivo já testada em produção. */
function resolveTargetFile(fileRef) {
  var targetFile = fileRef ? path.resolve(ROOT, fileRef) : null;
  if (targetFile && fs.existsSync(targetFile)) return { path: targetFile, via: 'direto' };
  var baseName = fileRef ? path.basename(fileRef) : null;
  if (!baseName) return { path: null, error: 'campo file ausente' };
  var found = null;
  function findFile(dir, depth) {
    if (depth > 6 || found) return;
    var entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
    for (var i = 0; i < entries.length; i++) {
      if (found) return;
      var e = entries[i];
      if (SKIP_DIRS.has(e.name)) continue;
      var full = path.join(dir, e.name);
      if (e.isDirectory()) { findFile(full, depth + 1); }
      else if (e.name === baseName) { found = full; }
    }
  }
  findFile(ROOT, 0);
  if (found) return { path: found, via: 'busca por nome' };
  return { path: null, error: 'não encontrado por caminho ou nome: ' + fileRef };
}

/* Reverte uma lista de arquivos (caminhos relativos) pro estado do HEAD do git.
 * Usado nos dois pontos de falha possíveis (patch ou validação) pra garantir
 * que a missão nunca deixa um subconjunto de arquivos meio-alterado. */
function rollbackFiles(relPaths) {
  relPaths.forEach(function(rel) {
    spawnSync('git', ['checkout', '--', rel], { cwd: ROOT });
  });
}

/* Commit único cobrindo múltiplos arquivos — diferente de gitCommit (1 arquivo),
 * essa versão faz um `git add` com todos os caminhos antes do commit, garantindo
 * que o caminho feliz produz exatamente 1 commit, não N commits separados. */
function gitCommitMulti(filePaths, message) {
  var rels = filePaths.map(function(fp) { return path.relative(ROOT, fp); });
  var addR = spawnSync('git', ['add'].concat(rels), { cwd: ROOT, encoding: 'utf8' });
  if (addR.status !== 0) return { ok: false, error: 'git add: ' + addR.stderr.trim() };
  var comR = spawnSync('git', ['commit', '-m', message], { cwd: ROOT, encoding: 'utf8' });
  if (comR.status !== 0) return { ok: false, error: 'git commit: ' + comR.stderr.trim().slice(0, 100) };
  var logR = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return { ok: true, hash: (logR.stdout || '').trim(), output: comR.stdout.trim().slice(0, 80) };
}

// Tipo: 'apply_patch_multi'
// Dados: { type, files: [{file, patch, fix_type}], diagnosis, mission_id }
// Garantia: tudo-ou-nada. Ver comentário do bloco acima.
function applyPatchMultiMission(m) {
  return new Promise(function(resolve) {
    var steps = [];
    var log   = [];
    function step(agent, ok, detail) {
      steps.push({ agent: agent, ok: ok, detail: detail });
      log.push(agent + ': ' + (ok ? '✓' : '✗') + ' ' + detail);
      console.log('  › ' + agent + ': ' + detail);
    }

    if (!Array.isArray(m.files) || m.files.length === 0) {
      step('Resolver', false, 'missão apply_patch_multi sem campo files (array)');
      return resolve({
        mission_id: m.id, ok: false, pass_gold: false,
        action: 'patch_multi_failed',
        output: '❌ Campo files ausente ou vazio na missão apply_patch_multi.',
        log: log, steps: steps, sddf: SDDF_BASELINE
      });
    }

    // Etapa 1: resolver todos os caminhos ANTES de tocar em qualquer arquivo —
    // assim uma falha de resolução nunca deixa um arquivo parcialmente alterado.
    var resolved = [];
    for (var i = 0; i < m.files.length; i++) {
      var f = m.files[i];
      var r = resolveTargetFile(f.file);
      if (!r.path) {
        step('Resolver', false, 'arquivo ' + (i + 1) + '/' + m.files.length + ' (' + f.file + '): ' + r.error);
        return resolve({
          mission_id: m.id, ok: false, pass_gold: false,
          action: 'patch_multi_failed',
          output: '❌ Arquivo não encontrado antes de aplicar qualquer patch: ' + f.file + '\n' + r.error +
                   '\n\nNenhum arquivo foi tocado — a resolução de caminho roda antes de qualquer escrita.',
          log: log, steps: steps, sddf: SDDF_BASELINE
        });
      }
      step('Resolver', true, (i + 1) + '/' + m.files.length + ': ' + path.relative(ROOT, r.path) + ' (' + r.via + ')');
      resolved.push({ path: r.path, rel: path.relative(ROOT, r.path), patch: f.patch, fix_type: f.fix_type || 'code_patch' });
    }

    // Etapa 2: aplicar patches em ordem; se algum falhar, reverter os já aplicados
    var applied = [];
    for (var j = 0; j < resolved.length; j++) {
      var rf = resolved[j];
      var patchResult = applyPatch(rf.path, rf.patch, rf.fix_type);
      step('PatchEngine', patchResult.ok,
        patchResult.ok ? rf.fix_type + ' → ' + rf.rel : rf.rel + ': ' + patchResult.error);
      if (!patchResult.ok) {
        rollbackFiles(applied.map(function(a) { return a.rel; }));
        step('Rollback', true, applied.length + ' arquivo(s) revertido(s) via git checkout: ' +
          applied.map(function(a) { return a.rel; }).join(', '));
        return resolve({
          mission_id: m.id, ok: false, pass_gold: false,
          action: 'patch_multi_failed',
          output: '❌ Patch falhou em "' + rf.rel + '" (' + (j + 1) + '/' + resolved.length + '):\n' + patchResult.error +
                   '\n\n↩️  Atômico: ' + applied.length + ' arquivo(s) já modificado(s) nesta missão foram revertidos. ' +
                   'Nenhum arquivo da missão ficou parcialmente alterado.',
          files: resolved.map(function(r) { return r.rel; }),
          log: log, steps: steps, sddf: SDDF_BASELINE
        });
      }
      applied.push(rf);
    }

    // Etapa 3: Aegis — validar sintaxe de TODOS os arquivos; se algum falhar, reverter tudo
    for (var k = 0; k < applied.length; k++) {
      var av = applied[k];
      var validation = validatePatch(av.path);
      step('Aegis', validation.ok, av.rel + ': ' + (validation.ok ? 'PASS' : 'FAIL — ' + validation.error));
      if (!validation.ok) {
        rollbackFiles(applied.map(function(a) { return a.rel; }));
        step('Rollback', true, applied.length + ' arquivo(s) revertido(s) via git checkout (validação falhou)');
        return resolve({
          mission_id: m.id, ok: false, pass_gold: false,
          action: 'patch_multi_rollback',
          output: '⚠️ Validação Aegis falhou em "' + av.rel + '":\n' + validation.error +
                   '\n\n↩️  Atômico: todos os ' + applied.length + ' arquivo(s) desta missão foram revertidos — ' +
                   'nenhuma alteração parcial ficou no repositório.',
          files: applied.map(function(a) { return a.rel; }),
          log: log, steps: steps, sddf: SDDF_BASELINE
        });
      }
    }

    // Etapa 4: commit único cobrindo todos os arquivos juntos
    var diagnosis    = (m.diagnosis || 'vision fix multi-arquivo').slice(0, 60);
    var commitMsg    = 'fix: ' + diagnosis + ' [vision-agent apply_patch_multi, ' + applied.length + ' arquivos]';
    var commitResult = gitCommitMulti(applied.map(function(a) { return a.path; }), commitMsg);
    step('GoCore', commitResult.ok,
      commitResult.ok ? 'commit único ' + commitResult.hash + ' (' + applied.length + ' arquivos)' : commitResult.error);

    resolve({
      mission_id: m.id,
      ok:         true,
      pass_gold:  false,
      action:     commitResult.ok ? 'patch_multi_applied_committed' : 'patch_multi_applied_no_commit',
      output: [
        '✅ Patch multi-arquivo aplicado atomicamente via apply_patch_multi',
        'Arquivos (' + applied.length + '): ' + applied.map(function(a) { return a.rel; }).join(', '),
        'Commit  : ' + (commitResult.hash || 'N/A') + ' (um único commit cobrindo todos)',
        '',
        '⚠️  Push pendente — revisar e aprovar manualmente.',
        'SDDF: deploy_allowed=false | push=manual'
      ].join('\n'),
      files:      applied.map(function(a) { return a.rel; }),
      hash:       commitResult.hash || null,
      log:        log,
      steps:      steps,
      sddf:       SDDF_BASELINE
    });
  });
}

/* ── §110 — Etapa A (Software Factory fora do sandbox), Fase 1: ─────
 * FIREWALL DE AUTO-MODIFICAÇÃO.
 *
 * Princípio: a Software Factory pode, no futuro, rodar dry-run real
 * (diagnóstico real + diff real, sem commit/push) contra um repositório
 * EXTERNO autorizado explicitamente pelo usuário — mas em NENHUMA
 * hipótese pode ser apontada pra si mesma (o próprio vision-core). Um
 * agente capaz de reescrever as próprias regras de governança deixa de
 * ser confiável; o SDDF gate só vale alguma coisa se for inviolável.
 *
 * Esta função tem que estar provada robusta ANTES de qualquer lógica de
 * dry-run real ser construída em cima dela — é por isso que ela é a
 * primeira peça de Etapa A, entregue isolada e com testes próprios,
 * antes do endpoint/mission type que vai consumi-la (fase 2, sessão
 * futura).
 *
 * 4 camadas de defesa independentes — qualquer uma bastando pra bloquear: */

/* Camada 1+2: contenção de caminho. `child` é bloqueado se for igual a
 * `parent`, estiver DENTRO de `parent`, ou se `parent` estiver dentro de
 * `child` (cobre tanto "apontar pra dentro do vision-core" quanto
 * "apontar pra uma pasta-pai que contém o vision-core como subpasta"). */
function isPathInside(parent, child) {
  var rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/* Camada 3: remote git. Normaliza https vs ssh (git@host:org/repo.git),
 * com/sem sufixo .git, com/sem barra final, e case — pra não deixar uma
 * variação de formatação escapar da comparação. */
function normalizeGitUrl(url) {
  return (url || '').toLowerCase()
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

var SELF_GIT_REMOTES = [
  'https://github.com/imadechumbo/vision-core',
  'https://gitlab.com/imadechumbo/vision-core-pages'
];

function hasSelfGitRemote(dir) {
  var r = spawnSync('git', ['remote', '-v'], { cwd: dir, encoding: 'utf8', timeout: 5000 });
  if (r.status !== 0) return false;
  var urls = (r.stdout || '').split('\n').map(function(line) {
    var m = line.match(/\s(\S+)\s+\(/);
    return m ? normalizeGitUrl(m[1]) : null;
  }).filter(Boolean);
  return urls.some(function(u) { return SELF_GIT_REMOTES.indexOf(u) !== -1; });
}

/* Camada 4: fingerprint de arquivos. CLAUDE.md + SDDF_SPEC.md juntos na
 * raiz são uma assinatura forte deste projeto específico — cobre o caso
 * de alguém copiar/clonar o vision-core pra outro caminho, sem .git ou
 * com remote removido, e tentar usar isso como alvo do dry-run. */
function hasSelfFingerprint(dir) {
  return fs.existsSync(path.join(dir, 'CLAUDE.md')) && fs.existsSync(path.join(dir, 'SDDF_SPEC.md'));
}

function realpathOrResolve(p) {
  try { return fs.realpathSync(path.resolve(p)); }
  catch (e) { return path.resolve(p); } // pode nao existir ainda (ex: alvo hipotetico) — segue com o path resolvido
}

/* Função principal — chamar ANTES de qualquer leitura/escrita num alvo
 * de dry-run real. Retorna { forbidden: bool, reason?: string }. */
function isSelfTargetForbidden(targetPath) {
  var resolvedTarget = realpathOrResolve(targetPath);
  var resolvedRoot    = realpathOrResolve(ROOT);

  if (isPathInside(resolvedRoot, resolvedTarget)) {
    return { forbidden: true, reason: 'caminho alvo é o próprio vision-core ou está dentro dele (camada 1/2 — contenção de caminho): ' + resolvedTarget };
  }
  if (isPathInside(resolvedTarget, resolvedRoot)) {
    return { forbidden: true, reason: 'caminho alvo é uma pasta-pai que contém o vision-core (camada 1/2 — contenção de caminho): ' + resolvedTarget };
  }
  if (fs.existsSync(resolvedTarget) && hasSelfGitRemote(resolvedTarget)) {
    return { forbidden: true, reason: 'remote git do alvo aponta pro repositório do próprio vision-core (camada 3 — remote git)' };
  }
  if (fs.existsSync(resolvedTarget) && hasSelfFingerprint(resolvedTarget)) {
    return { forbidden: true, reason: 'alvo contém CLAUDE.md + SDDF_SPEC.md — fingerprint do próprio vision-core, mesmo fora do caminho/git esperado (camada 4 — fingerprint)' };
  }
  return { forbidden: false };
}

/* ── §111 — Etapa A, Fase 2: dry-run real ────────────────────────
 * Agora que o firewall (§110) está provado, esta é a capability que ele
 * protege: rodar o MESMO pipeline scan→Hermes→patch já usado por
 * `executeMission` (linha ~287), mas apontado pra um `target_path`
 * explícito em vez do próprio ROOT, e SEM NUNCA escrever no disco real
 * nem fazer commit/push. O resultado é um diff_preview — equivalente a
 * um rascunho de PR, não uma alteração de verdade. */

/* Mesma lógica de varredura de `scanProject` (linha ~72), parametrizada
 * por um root explícito em vez do ROOT fixo do agente — extraída como
 * função standalone pra não tocar em `scanProject`/`executeMission`,
 * que já estão testados e em produção desde a v1.0 deste arquivo. */
function scanExternalProject(targetRoot, input) {
  var result   = { files: [], byName: [], byContent: [], target: null, content: '' };
  var words    = input.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2; });
  var fileRefs = words.filter(function(w) { return w.includes('.') && w.length > 3; });

  function walk(dir, depth) {
    if (depth > 5) return;
    var entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (SKIP_DIRS.has(e.name)) continue;
      var full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full, depth + 1); continue; }
      var ext = path.extname(e.name).toLowerCase();
      if (!TEXT_EXTS.has(ext)) continue;
      result.files.push(full);
      var nameLower = e.name.toLowerCase();

      var nameMatch = fileRefs.some(function(fn) { return nameLower === fn; });
      if (nameMatch) {
        try {
          var text = fs.readFileSync(full, 'utf8');
          result.byName.push({ file: full, content: text, score: 100 });
        } catch(err) {}
      }

      if (!result.byName.length) {
        try {
          var content = fs.readFileSync(full, 'utf8');
          var lc      = content.toLowerCase();
          var score   = words.filter(function(w) { return w.length > 3 && lc.includes(w); }).length;
          if (score > 0) result.byContent.push({ file: full, content: content, score: score });
        } catch(err2) {}
      }
    }
  }

  walk(targetRoot, 0);
  result.byContent.sort(function(a, b) { return b.score - a.score; });

  var top = result.byName[0] || result.byContent[0];
  if (top) {
    result.target  = top.file;
    result.content = top.content.slice(0, 4000);
  }
  return result;
}

/* Mesma lógica de transformação de `applyPatch` (linha ~161), mas NUNCA
 * chama fs.writeFileSync — lê o conteúdo real (read-only) e calcula só
 * em memória o que o patch produziria. Retorna { ok, before, after } em
 * vez de escrever. Sem backup (não precisa — nada é alterado de fato). */
function simulatePatch(filePath, patch, fixType) {
  var before;
  try { before = fs.readFileSync(filePath, 'utf8'); }
  catch(e) { return { ok: false, error: 'leitura falhou: ' + e.message }; }

  try {
    var after;
    if (fixType === 'json_field') {
      var obj = JSON.parse(before);
      var fields = patch.fields || patch;
      if (Array.isArray(obj) && patch.target_title) {
        var found = false;
        for (var i = 0; i < obj.length; i++) {
          var item = obj[i];
          var title = (item.title || item.name || item.label || '').toLowerCase();
          if (title.includes(patch.target_title.toLowerCase())) {
            Object.assign(item, fields);
            found = true;
            break;
          }
        }
        if (!found) throw new Error('item com title "' + patch.target_title + '" não encontrado no array');
      } else if (typeof obj === 'object' && !Array.isArray(obj)) {
        Object.assign(obj, fields);
      } else {
        throw new Error('json_field: arquivo não é objeto nem array com target_title');
      }
      after = JSON.stringify(obj, null, 2) + '\n';

    } else if (fixType === 'code_patch') {
      var search  = patch.search  || patch.old_value || '';
      var replace = patch.replace !== undefined ? patch.replace : (patch.new_value || '');
      if (!search) throw new Error('code_patch: campo search ausente');
      if (!before.includes(search)) throw new Error('code_patch: trecho "' + search.slice(0, 40) + '..." não encontrado');
      after = before.replace(search, replace);

    } else {
      after = typeof patch === 'string' ? patch : JSON.stringify(patch, null, 2) + '\n';
    }

    return { ok: true, before: before, after: after };

  } catch(e) {
    return { ok: false, error: e.message };
  }
}

/* Equivalente a `validatePatch`, mas valida uma STRING em memória em vez
 * de um arquivo real — escreve num arquivo TEMPORÁRIO fora do projeto
 * alvo (os.tmpdir()) só pra rodar `node --check` (que exige um caminho
 * real), e apaga o temporário imediatamente depois. O arquivo real do
 * projeto-alvo nunca é tocado nesse processo. */
function validatePatchContent(content, ext) {
  if (ext === '.json') {
    try { JSON.parse(content); return { ok: true }; }
    catch(e) { return { ok: false, error: 'JSON inválido: ' + e.message }; }
  }
  if (['.js', '.mjs', '.cjs'].includes(ext)) {
    var tmpFile = path.join(os.tmpdir(), 'vc-dryrun-check-' + Date.now() + '-' + Math.random().toString(16).slice(2) + ext);
    try {
      fs.writeFileSync(tmpFile, content, 'utf8');
      var r = spawnSync(process.execPath, ['--check', tmpFile], { encoding: 'utf8', timeout: 10000 });
      if (r.status === 0) return { ok: true };
      return { ok: false, error: (r.stderr || r.stdout || '').trim().slice(0, 200) };
    } finally {
      try { fs.unlinkSync(tmpFile); } catch(e) {}
    }
  }
  return { ok: true };
}

// Tipo: 'sf_dry_run_real'
// Dados: { type, target_path, input, mission_id }
// Garantia: NUNCA escreve no arquivo real do target_path, NUNCA commita,
// NUNCA dá push. Mesma infraestrutura de diagnóstico (askIA/parsePatchFromAI)
// já usada por executeMission/apply_patch — não duplica o pipeline de IA,
// só troca o que acontece DEPOIS do diagnóstico (simulação em vez de escrita).
async function sfDryRunRealMission(m) {
  var log   = [];
  var steps = [];
  function step(agent, ok, detail) {
    steps.push({ agent: agent, ok: ok, detail: detail });
    log.push(agent + ': ' + (ok ? '✓' : '✗') + ' ' + detail);
    console.log('  › ' + agent + ': ' + detail);
  }

  if (!m.target_path) {
    step('Firewall', false, 'campo target_path ausente na missão sf_dry_run_real');
    return {
      mission_id: m.id, ok: false, pass_gold: false,
      action: 'sf_dry_run_failed',
      output: '❌ Campo target_path ausente — obrigatório pra dry-run real.',
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  // ── PASSO 0: Firewall de auto-modificação (§110) — ANTES de qualquer leitura ──
  var firewallCheck = isSelfTargetForbidden(m.target_path);
  step('Firewall', !firewallCheck.forbidden,
    firewallCheck.forbidden ? firewallCheck.reason : 'alvo liberado: ' + m.target_path);

  if (firewallCheck.forbidden) {
    return {
      mission_id: m.id, ok: false, pass_gold: false,
      action: 'sf_dry_run_blocked_self_target',
      output: '🛑 Dry-run bloqueado pelo firewall de auto-modificação:\n' + firewallCheck.reason,
      target_path: m.target_path,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  var resolvedTargetRoot = realpathOrResolve(m.target_path);
  if (!fs.existsSync(resolvedTargetRoot)) {
    step('Scanner', false, 'target_path não existe: ' + resolvedTargetRoot);
    return {
      mission_id: m.id, ok: false, pass_gold: false,
      action: 'sf_dry_run_failed',
      output: '❌ target_path não existe no disco: ' + resolvedTargetRoot,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  // ── PASSO 1: Scanner (no target_path, NUNCA no ROOT do agente) ──
  var scan = scanExternalProject(resolvedTargetRoot, m.input || '');
  step('Scanner', scan.target !== null,
    scan.target
      ? 'byName=' + scan.byName.length + ' byContent=' + scan.byContent.length + ' → ' + path.relative(resolvedTargetRoot, scan.target)
      : scan.files.length + ' arquivos, sem match');

  if (!scan.target) {
    return {
      mission_id: m.id, ok: true, pass_gold: false,
      action: 'sf_dry_run_listing',
      output: 'Estrutura do projeto-alvo (' + resolvedTargetRoot + '):\n' + scan.files.slice(0, 40).map(function(f) { return '  ' + path.relative(resolvedTargetRoot, f); }).join('\n'),
      files: scan.files.length, target_path: m.target_path,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  var relTarget = path.relative(resolvedTargetRoot, scan.target);

  // ── PASSO 2: Hermes/askIA — mesma infraestrutura do chat, sem duplicar ──
  var aiAnswer = '';
  try {
    aiAnswer = await askIA(scan.content, m.input || '', relTarget);
    step('Hermes', true, 'diagnóstico OK (' + aiAnswer.length + ' chars)');
  } catch(e) {
    step('Hermes', false, e.message);
    return {
      mission_id: m.id, ok: true, pass_gold: false,
      action: 'sf_dry_run_diagnosis_failed',
      output: 'Arquivo: ' + relTarget + '\n\n' + scan.content,
      files: scan.files.length, target_path: m.target_path,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  // ── PASSO 3: parsePatch — mesmo parser usado por executeMission ──
  var patchJson = parsePatchFromAI(aiAnswer);
  if (!patchJson || !patchJson.patch) {
    step('PatchEngine', false, 'sem bloco JSON — análise apenas, sem diff');
    return {
      mission_id: m.id, ok: true, pass_gold: false,
      action: 'sf_dry_run_analysis_only', output: aiAnswer,
      files: scan.files.length, target_path: m.target_path,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  var targetFile = scan.target;
  if (patchJson.file) {
    var resolvedFile = path.resolve(resolvedTargetRoot, patchJson.file);
    if (fs.existsSync(resolvedFile)) targetFile = resolvedFile;
  }

  // ── PASSO 4: simulatePatch — NUNCA escreve no disco real do target ──
  var simResult = simulatePatch(targetFile, patchJson.patch, patchJson.fix_type || 'full_replace');
  step('PatchEngine (simulado)', simResult.ok,
    simResult.ok ? (patchJson.fix_type || 'full_replace') + ' → ' + path.relative(resolvedTargetRoot, targetFile) + ' (em memória)' : simResult.error);

  if (!simResult.ok) {
    return {
      mission_id: m.id, ok: false, pass_gold: false,
      action: 'sf_dry_run_patch_failed',
      output: aiAnswer + '\n\n⚠️ Simulação de patch falhou (nada foi escrito):\n' + simResult.error,
      files: scan.files.length, target_path: m.target_path,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  // ── PASSO 5: Aegis — valida o CONTEÚDO simulado, não o arquivo real ──
  var ext = path.extname(targetFile).toLowerCase();
  var validation = validatePatchContent(simResult.after, ext);
  step('Aegis (simulado)', validation.ok, validation.ok ? 'PASS' : 'FAIL — ' + validation.error);

  if (!validation.ok) {
    return {
      mission_id: m.id, ok: false, pass_gold: false,
      action: 'sf_dry_run_validation_failed',
      output: aiAnswer + '\n\n⚠️ Validação Aegis do diff simulado falhou (nada foi escrito):\n' + validation.error,
      files: scan.files.length, target_path: m.target_path,
      log: log, steps: steps, sddf: SDDF_BASELINE
    };
  }

  // ── Resultado: diff_preview — NUNCA commit, NUNCA push, NUNCA escrita real ──
  return {
    mission_id:      m.id,
    ok:              true,
    pass_gold:       false,
    action:          'sf_dry_run_completed',
    real_io:         true,
    written_to_disk: false,
    committed:       false,
    output: [
      aiAnswer, '',
      '─────────────────────────────────────────────',
      '🔍 DRY-RUN REAL — diff gerado, NADA foi escrito no disco do projeto-alvo',
      'Projeto-alvo : ' + resolvedTargetRoot,
      'Arquivo      : ' + path.relative(resolvedTargetRoot, targetFile),
      'Fix type     : ' + (patchJson.fix_type || 'full_replace'),
      '',
      'Pra aplicar de verdade, use uma missão apply_patch separada com este mesmo patch.'
    ].join('\n'),
    target_path: m.target_path,
    file:        path.relative(resolvedTargetRoot, targetFile),
    fix_type:    patchJson.fix_type || 'full_replace',
    diagnosis:   patchJson.diagnosis || null,
    diff_preview: {
      before: simResult.before,
      after:  simResult.after
    },
    patch: patchJson.patch,
    log: log, steps: steps, sddf: SDDF_BASELINE
  };
}

/* ── Polling loop ─────────────────────────────────────────────── */
function poll() {
  httpRequest(WORKER + '/api/agent/mission/pending', {}, function(err, res) {
    if (!err && res.body && res.body.mission) {
      var m = res.body.mission;
      console.log('[' + new Date().toLocaleTimeString() + '] Missão: ' + m.id);
      console.log('Input : ' + (m.input || '').slice(0, 100));

      var handler = m.type === 'git_push'          ? gitPush                :
                    m.type === 'git_revert'        ? gitRevert              :
                    m.type === 'apply_patch'       ? applyPatchMission      :
                    m.type === 'apply_patch_multi' ? applyPatchMultiMission :
                    m.type === 'sf_dry_run_real'   ? sfDryRunRealMission    :
                    executeMission;
      handler(m).then(function(result) {
        console.log('Ação  : ' + result.action);
        httpRequest(WORKER + '/api/agent/mission/result', {
          method: 'POST', body: result
        }, function(err2) {
          if (!err2) console.log('Enviado ✅\n');
          else       console.log('Erro ao enviar: ' + err2.message + '\n');
        });
      }).catch(function(e) {
        console.log('Erro: ' + e.message);
      });
    }
    setTimeout(poll, POLL_MS);
  });
}

/* ── Health server + start ───────────────────────────────────────
 * Só inicia o servidor de health-check e o polling quando este arquivo
 * é executado diretamente via `node vision-agent.js` (uso normal do
 * usuário, e também como os testes E2E já existentes — _test105,
 * _test108, _test109 — sempre o invocaram, então nada muda pra eles).
 * Quando importado via require() — usado pelo §110 pra testar de
 * verdade as funções puras do firewall de auto-modificação, em vez de
 * só verificar a presença do código por grep — nada disso roda; só as
 * funções abaixo ficam disponíveis via module.exports. */
if (require.main === module) {
  var PORT = Number(process.env.VC_PORT) || 7070;
  var srv  = http.createServer(function(req, res) {
    res.writeHead(200, {
      'Content-Type':                 'application/json',
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    res.end(JSON.stringify({ ok: true, version: VERSION, project: ROOT, worker: WORKER, sddf: 'compliant' }));
  });
  srv.on('error', function(e) { if (e.code === 'EADDRINUSE') { PORT++; srv.listen(PORT); } });
  srv.listen(PORT, function() {
    console.log('Health : http://localhost:' + PORT);
    console.log('');
    poll();
  });
}

module.exports = {
  isSelfTargetForbidden: isSelfTargetForbidden,
  isPathInside:           isPathInside,
  normalizeGitUrl:        normalizeGitUrl,
  hasSelfFingerprint:     hasSelfFingerprint,
  simulatePatch:          simulatePatch,
  validatePatchContent:   validatePatchContent,
  scanExternalProject:    scanExternalProject
};
