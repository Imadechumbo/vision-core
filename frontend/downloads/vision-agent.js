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
function askIA(fileContent, missionInput) {
  return new Promise(function(resolve, reject) {
    var message = 'ARQUIVO:\n' + fileContent + '\n\nMISSÃO:\n' + missionInput;
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
    aiAnswer = await askIA(scan.content, m.input);
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

/* ── Polling loop ─────────────────────────────────────────────── */
function poll() {
  httpRequest(WORKER + '/api/agent/mission/pending', {}, function(err, res) {
    if (!err && res.body && res.body.mission) {
      var m = res.body.mission;
      console.log('[' + new Date().toLocaleTimeString() + '] Missão: ' + m.id);
      console.log('Input : ' + (m.input || '').slice(0, 100));

      executeMission(m).then(function(result) {
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

/* ── Health server ────────────────────────────────────────────── */
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
