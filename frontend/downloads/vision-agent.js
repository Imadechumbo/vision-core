#!/usr/bin/env node
/**
 * VISION AGENT LOCAL v1.1 — arquivo único, zero dependências externas
 * Fluxo: scan → askIA → parsePatch → applyPatch → validatePatch → gitCommit
 *
 * COMO USAR:
 *   node vision-agent.js "C:\caminho\do\projeto"
 */
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');
const { spawnSync } = require('child_process');

const WORKER = process.env.VC_WORKER || 'https://visioncore-api-gateway.weiganlight.workers.dev';
const POLL   = Number(process.env.VC_POLL_MS) || 3000;
const ROOT   = path.resolve(process.argv[2] || process.cwd());

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║   VISION AGENT LOCAL v1.1            ║');
console.log('╚══════════════════════════════════════╝');
console.log('Projeto : ' + ROOT);
console.log('Worker  : ' + WORKER);
console.log('');
console.log('Aguardando missões... (Ctrl+C para parar)');
console.log('');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/* ── HTTP helpers ──────────────────────────────────────────────── */
function post(url, data, cb) {
  const body = JSON.stringify(data);
  const u    = new URL(url);
  const opt  = {
    hostname: u.hostname,
    path:     u.pathname,
    method:   'POST',
    headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };
  const req = https.request(opt, function(res) {
    let s = '';
    res.on('data', function(c) { s += c; });
    res.on('end', function() {
      try { cb(null, JSON.parse(s)); } catch(e) { cb(null, s); }
    });
  });
  req.on('error', function(e) { cb(e); });
  req.write(body);
  req.end();
}

function get(url, cb) {
  const u   = new URL(url);
  const opt = { hostname: u.hostname, path: u.pathname, method: 'GET' };
  const req = https.request(opt, function(res) {
    let s = '';
    res.on('data', function(c) { s += c; });
    res.on('end', function() {
      try { cb(null, JSON.parse(s)); } catch(e) { cb(null, s); }
    });
  });
  req.on('error', function(e) { cb(e); });
  req.end();
}

/* ── File scanner ──────────────────────────────────────────────── */
const TEXT_EXTS = ['.json','.js','.ts','.jsx','.tsx','.html','.css','.md','.env.example'];
const SKIP_DIRS = ['node_modules','.git','dist','.next','build','coverage'];

function scanProject(input) {
  const result = { files: [], target: null, content: '' };
  const words  = input.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 3; });

  function walk(dir, depth) {
    if (depth > 4) return;
    var entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
    entries.forEach(function(e) {
      if (SKIP_DIRS.includes(e.name)) return;
      var full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full, depth + 1); return; }
      var ext = path.extname(e.name).toLowerCase();
      if (!TEXT_EXTS.includes(ext)) return;
      result.files.push(full);
      if (!result.target && words.length) {
        try {
          var text = fs.readFileSync(full, 'utf8');
          if (words.some(function(w) { return text.toLowerCase().includes(w); })) {
            result.target  = full;
            result.content = text.slice(0, 4000);
          }
        } catch(e) {}
      }
    });
  }

  walk(ROOT, 0);
  return result;
}

/* ── askIA — chama /api/chat no modo fix ───────────────────────── */
function askIA(fileContent, missionInput) {
  return new Promise(function(resolve, reject) {
    var message = 'ARQUIVO:\n' + fileContent + '\n\nMISSÃO:\n' + missionInput;
    post(WORKER + '/api/chat', { message: message, mode: 'fix' }, function(err, data) {
      if (err) return reject(err);
      resolve((data && data.answer) ? data.answer : '');
    });
  });
}

/* ── parsePatchFromAI — extrai bloco JSON da resposta ───────────── */
function parsePatchFromAI(aiAnswer) {
  var match = aiAnswer.match(/```json\n([\s\S]*?)\n```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch(e) { return null; }
}

/* ── applyPatch — aplica patch no arquivo ───────────────────────── */
function applyPatch(filePath, patch, fixType) {
  if (fixType === 'json_field') {
    var obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (typeof patch === 'object' && !Array.isArray(patch)) { Object.assign(obj, patch); }
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n');
  } else if (fixType === 'code_patch') {
    var content = fs.readFileSync(filePath, 'utf8');
    var search  = patch.search;
    var replace = patch.replace || '';
    fs.writeFileSync(filePath, content.replace(search, replace));
  } else { // full_replace
    fs.writeFileSync(filePath, typeof patch === 'string' ? patch : JSON.stringify(patch, null, 2) + '\n');
  }
}

/* ── validatePatch — JSON.parse ou node --check ─────────────────── */
function validatePatch(filePath) {
  var ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    try { JSON.parse(fs.readFileSync(filePath, 'utf8')); return { ok: true }; }
    catch(e) { return { ok: false, error: e.message }; }
  }
  if (['.js','.mjs','.cjs'].includes(ext)) {
    var r = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8', timeout: 10000 });
    if (r.status === 0) return { ok: true };
    return { ok: false, error: (r.stderr || r.stdout || '').trim() };
  }
  return { ok: true }; // .ts, .html, .css etc — sem validação automatizada
}

/* ── gitCommit — add + commit, sem push ────────────────────────── */
function gitCommit(filePath, message) {
  spawnSync('git', ['add', filePath], { cwd: ROOT });
  var r = spawnSync('git', ['commit', '-m', message], { cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, output: (r.stdout || r.stderr || '').trim() };
}

/* ── executeMission — fluxo completo ───────────────────────────── */
async function executeMission(m) {
  var scan = scanProject(m.input || '');
  var log  = [];

  /* Sem arquivo relevante — retornar listagem */
  if (!scan.target) {
    log.push('scan: ' + scan.files.length + ' arquivos, sem match');
    return {
      mission_id: m.id, ok: true,
      output:  'Projeto: ' + ROOT + '\nArquivos encontrados:\n' + scan.files.slice(0, 30).join('\n'),
      files:   scan.files.length,
      target:  null,
      action:  'listing',
      log:     log
    };
  }

  log.push('scan: target=' + path.relative(ROOT, scan.target));

  /* Perguntar para IA */
  var aiAnswer = '';
  try {
    log.push('askIA: ' + scan.content.length + ' chars');
    aiAnswer = await askIA(scan.content, m.input);
    log.push('askIA: OK (' + aiAnswer.length + ' chars resposta)');
  } catch(e) {
    log.push('askIA: erro — ' + e.message + ' — retornando conteúdo do arquivo');
    return {
      mission_id: m.id, ok: true,
      output:  'Arquivo: ' + scan.target + '\n\n' + scan.content,
      files:   scan.files.length, target: scan.target,
      action:  'file_content_fallback', log: log
    };
  }

  var result = {
    mission_id: m.id, ok: true,
    output:  aiAnswer,
    files:   scan.files.length, target: scan.target,
    action:  'ai_analysis', log: log
  };

  /* Tentar extrair e aplicar patch */
  var patchJson = parsePatchFromAI(aiAnswer);
  if (!patchJson || !patchJson.patch || !patchJson.file) {
    log.push('patch: nenhum bloco JSON encontrado — apenas análise');
    return result;
  }

  var targetFile = path.resolve(ROOT, patchJson.file);
  if (!fs.existsSync(targetFile)) {
    log.push('patch: arquivo não encontrado — ' + patchJson.file);
    return result;
  }

  try {
    log.push('applyPatch: ' + (patchJson.fix_type || 'full_replace') + ' em ' + patchJson.file);
    applyPatch(targetFile, patchJson.patch, patchJson.fix_type || 'full_replace');

    log.push('validatePatch: ' + path.extname(targetFile));
    var validation = validatePatch(targetFile);

    if (validation.ok) {
      var commitMsg = 'fix: ' + (patchJson.diagnosis || m.input).slice(0, 72) + ' [vision-agent]';
      var commitResult = gitCommit(targetFile, commitMsg);
      log.push('gitCommit: ' + (commitResult.ok ? 'OK' : 'FAIL') + ' — ' + commitResult.output.slice(0, 80));
      result.action     = 'patch_applied_committed';
      result.patch      = patchJson;
      result.committed  = commitResult.ok;
      result.validation = 'PASS';
      result.output     = aiAnswer + '\n\n✅ Patch aplicado e commitado: ' + patchJson.file;
    } else {
      spawnSync('git', ['checkout', '--', targetFile], { cwd: ROOT });
      log.push('validatePatch: FAIL — revertido — ' + (validation.error || '').slice(0, 120));
      result.action           = 'patch_rollback';
      result.validation_error = validation.error;
      result.output           = aiAnswer + '\n\n⚠️ Patch inválido — arquivo revertido.\nErro: ' + validation.error;
    }
  } catch(e) {
    log.push('patch error: ' + e.message);
    result.output = aiAnswer + '\n\n⚠️ Erro ao aplicar patch: ' + e.message;
  }

  return result;
}

/* ── Polling loop ───────────────────────────────────────────────── */
function poll() {
  get(WORKER + '/api/agent/mission/pending', async function(err, data) {
    if (!err && data && data.mission) {
      var m = data.mission;
      console.log('[' + new Date().toLocaleTimeString() + '] Missão: ' + m.id);
      console.log('Input: ' + (m.input || '').slice(0, 100));
      try {
        var result = await executeMission(m);
        console.log('Ação: ' + result.action);
        (result.log || []).forEach(function(l) { console.log('  › ' + l); });
        post(WORKER + '/api/agent/mission/result', result, function(err2) {
          if (!err2) console.log('Resultado enviado ✅\n');
          else       console.log('Erro ao enviar: ' + err2.message);
        });
      } catch(e) {
        console.log('Erro na missão: ' + e.message);
      }
    }
    setTimeout(poll, POLL);
  });
}

/* ── Health server ──────────────────────────────────────────────── */
var PORT = Number(process.env.VC_PORT) || 7070;
var srv  = http.createServer(function(req, res) {
  res.writeHead(200, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify({ ok: true, project: ROOT, version: '1.1', worker: WORKER }));
});
srv.on('error', function(e) {
  if (e.code === 'EADDRINUSE') { PORT++; srv.listen(PORT); }
});
srv.listen(PORT, function() {
  console.log('Health : http://localhost:' + PORT);
  console.log('');
  poll();
});
