#!/usr/bin/env node
/**
 * VISION AGENT LOCAL — arquivo único, zero dependências
 *
 * COMO USAR:
 *   node vision-agent.js "C:\caminho\do\projeto"
 *
 * O agent lê arquivos do projeto e conecta ao Vision Core.
 */
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

const WORKER = 'https://visioncore-api-gateway.weiganlight.workers.dev';
const POLL   = 3000;
const ROOT   = process.argv[2] || process.cwd();

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║     VISION AGENT LOCAL v1.0          ║');
console.log('╚══════════════════════════════════════╝');
console.log('Projeto : ' + ROOT);
console.log('Worker  : ' + WORKER);
console.log('');
console.log('Aguardando missões... (Ctrl+C para parar)');
console.log('');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

function scanProject(input) {
  const result = { files: [], target: null, content: '' };
  const words  = input.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 3; });

  function walk(dir, depth) {
    if (depth > 4) return;
    var entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
    entries.forEach(function(e) {
      if (['node_modules', '.git', 'dist', '.next', 'build'].includes(e.name)) return;
      var full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full, depth + 1);
      } else {
        var ext = path.extname(e.name).toLowerCase();
        if (['.json','.js','.ts','.jsx','.tsx','.html','.css','.md'].includes(ext)) {
          result.files.push(full);
          if (!result.target) {
            try {
              var text = fs.readFileSync(full, 'utf8');
              var match = words.some(function(w) { return text.toLowerCase().includes(w); });
              if (match) { result.target = full; result.content = text.slice(0, 4000); }
            } catch(e) {}
          }
        }
      }
    });
  }

  walk(ROOT, 0);
  return result;
}

function poll() {
  get(WORKER + '/api/agent/mission/pending', function(err, data) {
    if (!err && data && data.mission) {
      var m = data.mission;
      console.log('[' + new Date().toLocaleTimeString() + '] Missão recebida: ' + m.id);
      console.log('Input: ' + m.input);

      var scan = scanProject(m.input);
      var output;

      if (scan.target) {
        console.log('Arquivo encontrado: ' + scan.target);
        output = 'Arquivo: ' + scan.target + '\n\n' + scan.content;
      } else {
        console.log('Estrutura mapeada (' + scan.files.length + ' arquivos)');
        output = 'Projeto: ' + ROOT + '\nArquivos encontrados:\n' + scan.files.slice(0, 30).join('\n');
      }

      post(WORKER + '/api/agent/mission/result', {
        mission_id: m.id,
        ok:     true,
        output: output,
        files:  scan.files.length,
        target: scan.target || null
      }, function(err2) {
        if (!err2) console.log('Resultado enviado ✅\n');
        else       console.log('Erro ao enviar: ' + err2.message);
      });
    }
  });
  setTimeout(poll, POLL);
}

var PORT = Number(process.env.VC_PORT) || 7070;
var srv = http.createServer(function(req, res) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({ ok: true, project: ROOT, version: '1.0' }));
});
srv.on('error', function(e) {
  if (e.code === 'EADDRINUSE') {
    PORT = PORT + 1;
    srv.listen(PORT);
  }
});
srv.listen(PORT, function() {
  console.log('Health: http://localhost:' + PORT);
  console.log('');
  poll();
});
