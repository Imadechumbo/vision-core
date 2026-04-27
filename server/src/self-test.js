'use strict';

/**
 * VISION CORE — Self-Test v1.0.5
 * Valida que o servidor está íntegro antes de aceitar missões reais.
 *
 * Testa:
 *   1.  Imports críticos (sem módulos quebrados)
 *   2.  SQLite (escreve e lê)
 *   3.  Projeto fake registrado
 *   4.  Patch engine em arquivo temporário
 *   5.  Snapshot salvo no banco
 *   6.  Rollback restaura conteúdo original
 *   7.  PASS GOLD calculado no servidor (sem LLM)
 *   8.  Match engine — todas as estratégias
 *   9.  Security: path traversal bloqueado
 *   10. Security: snapshotFile recusa path fora da base
 *   11. Múltiplas ocorrências bloqueadas sem allowMultiple
 *   12. Múltiplas ocorrências permitidas com allowMultiple
 *   13. partial_first_line bloqueado quando âncora é ambígua
 *   14. Hermes fallback retorna RCA seguro sem chave LLM
 *
 * Pode ser chamado via:
 *   node src/self-test.js         ← CLI direto
 *   GET /api/runtime/self-test    ← endpoint HTTP
 */

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const crypto = require('crypto');

const results = [];
let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(v => { results.push({ name, ok: true, detail: String(v || 'ok') }); passed++; })
        .catch(e => { results.push({ name, ok: false, detail: e.message }); failed++; });
    }
    results.push({ name, ok: true, detail: String(result || 'ok') });
    passed++;
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    failed++;
  }
}

async function runSelfTest() {
  results.length = 0;
  passed = 0;
  failed = 0;

  // ── 1. Imports críticos ──────────────────────────────────────────────────
  check('import: db/sqlite', () => {
    const { db, helpers } = require('./db/sqlite');
    if (!db || !helpers) throw new Error('db ou helpers não exportados');
    return 'OK';
  });

  check('import: hermesRca', () => {
    const { analyzeError, fallbackRca } = require('./services/hermesRca');
    if (typeof analyzeError !== 'function') throw new Error('analyzeError não é função');
    if (typeof fallbackRca  !== 'function') throw new Error('fallbackRca não é função');
    return 'OK';
  });

  check('import: githubService', () => {
    const { createPR, githubStatus } = require('./services/githubService');
    if (typeof createPR !== 'function') throw new Error('createPR não é função');
    return 'OK';
  });

  check('import: patchEngine', () => {
    const { applyPatches, rollbackMission, validate } = require('./services/patchEngine');
    if (typeof applyPatches !== 'function') throw new Error('applyPatches não é função');
    return 'OK';
  });

  check('import: passGoldEngine', () => {
    const { evaluate } = require('./services/passGoldEngine');
    if (typeof evaluate !== 'function') throw new Error('evaluate não é função');
    return 'OK';
  });

  check('import: missionRunner', () => {
    const { runMission } = require('./services/missionRunner');
    if (typeof runMission !== 'function') throw new Error('runMission não é função');
    return 'OK';
  });

  check('import: openclawSquad', () => {
    const { runSquad, needsSquad } = require('./services/openclawSquad');
    if (typeof needsSquad !== 'function') throw new Error('needsSquad não é função');
    return 'OK';
  });

  check('import: logCollector', () => {
    const { collectLogs } = require('./services/logCollector');
    if (typeof collectLogs !== 'function') throw new Error('collectLogs não é função');
    return 'OK';
  });

  // ── 2. SQLite ────────────────────────────────────────────────────────────
  check('sqlite: write + read', () => {
    const { db } = require('./db/sqlite');
    const key = `selftest_${Date.now()}`;
    db.prepare("INSERT OR REPLACE INTO projects (id, name, stack, path, adapter, config) VALUES (?, 'SelfTest', 'test', '/tmp', 'generic', '{}')").run(key);
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(key);
    db.prepare('DELETE FROM projects WHERE id = ?').run(key);
    if (!row) throw new Error('Leitura falhou após escrita');
    return `OK (id=${key})`;
  });

  // ── 3. Patch engine em arquivo temporário ────────────────────────────────
  const tmpDir    = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-selftest-'));
  const tmpFile   = path.join(tmpDir, 'server.js');
  const original  = "const PORT = process.env.PORT || 3000;\napp.listen(PORT);\n";
  const missionId = `selftest_${Date.now()}`;
  const projectId = `selftest_proj_${Date.now()}`;

  fs.writeFileSync(tmpFile, original, 'utf-8');

  // Registrar projeto fake no banco
  check('sqlite: register fake project', () => {
    const { helpers } = require('./db/sqlite');
    helpers.upsertProject.run({
      id: projectId, name: 'SelfTest Project', stack: 'node',
      path: tmpDir, health_url: null, adapter: 'generic', config: '{}',
    });
    helpers.insertMission.run({ id: missionId, project_id: projectId, status: 'running', error_input: 'self-test' });
    return `OK (project=${projectId})`;
  });

  check('patch: snapshot criado no banco', () => {
    const { snapshotFile } = require('./services/patchEngine');
    const snap = snapshotFile(tmpFile, missionId, projectId);
    if (!snap?.id) throw new Error('Snapshot não retornou id');
    const { helpers } = require('./db/sqlite');
    const row = helpers.getSnapshot.get(snap.id);
    if (!row) throw new Error('Snapshot não encontrado no banco');
    if (row.content !== original) throw new Error('Conteúdo do snapshot diferente do original');
    return `OK (id=${snap.id})`;
  });

  check('patch: aplica e marca applied=1', () => {
    const { applyPatches } = require('./services/patchEngine');
    const result = applyPatches(tmpDir, [{
      file: 'server.js',
      find: 'process.env.PORT || 3000',
      replace: 'process.env.PORT || 3001',
      description: 'Alterar porta — self-test',
      order: 1,
    }], missionId, projectId);

    if (!result.ok) throw new Error(`Patch falhou: ${result.error}`);
    if (result.applied !== 1) throw new Error(`Esperado 1 patch aplicado, got ${result.applied}`);

    const newContent = fs.readFileSync(tmpFile, 'utf-8');
    if (!newContent.includes('3001')) throw new Error('Conteúdo do arquivo não foi alterado');

    const { helpers } = require('./db/sqlite');
    const patches = helpers.getPatches.all(missionId);
    if (!patches.length) throw new Error('Patch não persistido no banco');
    if (patches[0].applied !== 1) throw new Error(`applied=${patches[0].applied}, esperado 1`);

    return `OK (arquivo alterado, applied=1 no banco)`;
  });

  // ── 4. Rollback restaura conteúdo original ───────────────────────────────
  check('rollback: restaura conteúdo original', () => {
    const { rollbackMission } = require('./services/patchEngine');
    const result = rollbackMission(missionId);
    if (!result.ok) throw new Error(`Rollback falhou: ${result.error}`);

    const restored = fs.readFileSync(tmpFile, 'utf-8');
    if (restored !== original) {
      throw new Error(`Conteúdo após rollback diferente do original.\nEsperado: ${original}\nGot: ${restored}`);
    }
    return `OK (${result.restored.length} arquivo(s) restaurado(s))`;
  });

  // ── 5. PASS GOLD calculado no servidor ───────────────────────────────────
  check('pass-gold: calculado server-side', () => {
    const { evaluate } = require('./services/passGoldEngine');
    const rca = { cause: 'Porta em uso', fix: 'Alterar porta', confidence: 85, risk: 'low', patches: [{}], source: 'fallback' };
    const patchResult = { applied: 1, results: [] };
    const validation  = { ok: true, files: [{ file: 'server.js', ok: true }], tests: null };
    const snapIds     = ['snap_test_001'];

    const gold = evaluate(missionId + '_gold', rca, null, patchResult, validation, snapIds);

    if (typeof gold.final !== 'number') throw new Error('final não é número');
    if (!gold.level) throw new Error('level não retornado');
    if (typeof gold.pass_gold !== 'boolean') throw new Error('pass_gold não é boolean');
    if (!gold.gates) throw new Error('gates não retornado');

    return `OK (score=${gold.final}/100, level=${gold.level}, pass_gold=${gold.pass_gold})`;
  });

  // ── 6. Match engine — todas as estratégias ───────────────────────────────
  check('security: path traversal bloqueado', () => {
    const { assertSafePath } = require('./services/patchEngine');

    // Deve passar — arquivo dentro da base
    assertSafePath('/tmp/projeto', '/tmp/projeto/server.js');

    // Deve ser bloqueado — tentativa de sair da pasta
    let blocked = false;
    try { assertSafePath('/tmp/projeto', '/tmp/projeto/../../.env'); }
    catch { blocked = true; }
    if (!blocked) throw new Error('Path traversal não foi bloqueado!');

    // Deve ser bloqueado — path absoluto diferente
    blocked = false;
    try { assertSafePath('/tmp/projeto', '/etc/passwd'); }
    catch { blocked = true; }
    if (!blocked) throw new Error('Path absoluto externo não foi bloqueado!');

    return 'OK (traversal bloqueado em ambos os casos)';
  });

  check('security: snapshotFile recusa path fora da base', () => {
    const { snapshotFile } = require('./services/patchEngine');
    // Tentar criar snapshot de arquivo fora do tmpDir
    const outsideFile = path.join(os.tmpdir(), 'outside_target.txt');
    fs.writeFileSync(outsideFile, 'conteudo externo', 'utf-8');

    const snap = snapshotFile(outsideFile, 'st_sec', 'st_proj', tmpDir);
    fs.unlinkSync(outsideFile);

    if (snap !== null) throw new Error('snapshotFile deveria ter retornado null para path externo');
    return 'OK (snapshot recusado para arquivo fora da pasta do projeto)';
  });

  check('patch: múltiplas ocorrências bloqueadas sem allowMultiple', () => {
    const { findMatch } = require('./services/patchEngine');
    // Conteúdo com o trecho duplicado
    const dup = "const x = 1;\nconst x = 1;\n";
    const result = findMatch(dup, "const x = 1;", {});
    if (result.strategy !== 'exact') throw new Error(`Esperado exact, got ${result.strategy}`);
    if (result.occurrences !== 2) throw new Error(`Esperado 2 ocorrências, got ${result.occurrences}`);

    // doReplace com allowMultiple=false deve retornar null para ambíguo
    const { applyPatches } = require('./services/patchEngine');
    // Testar via applyOne indiretamente — criar arquivo temporário com duplicata
    const dupFile = path.join(tmpDir, 'dup_test.js');
    fs.writeFileSync(dupFile, dup, 'utf-8');

    // applyOne com occurrences > 1 e sem allowMultiple deve falhar
    // Usamos applyPatches que chama applyOne internamente
    const r = applyPatches(tmpDir, [{
      file: 'dup_test.js',
      find: 'const x = 1;',
      replace: 'const x = 2;',
      allowMultiple: false,
      fallbackInsert: false,
    }], missionId + '_dup', projectId);

    fs.unlinkSync(dupFile);

    if (r.ok) throw new Error('Deveria ter falhado com trecho ambíguo');
    if (!r.error || !r.results[0]) throw new Error('Erro não retornado corretamente');

    return `OK (falhou corretamente: ${r.results[0].error?.slice(0, 60)})`;
  });

  check('patch: múltiplas ocorrências permitidas com allowMultiple', () => {
    const dupFile = path.join(tmpDir, 'dup_allow.js');
    const dupContent = "log('ok');\nlog('ok');\n";
    fs.writeFileSync(dupFile, dupContent, 'utf-8');

    const { applyPatches } = require('./services/patchEngine');
    const r = applyPatches(tmpDir, [{
      file: 'dup_allow.js',
      find: "log('ok');",
      replace: "log('done');",
      allowMultiple: true,
      fallbackInsert: false,
    }], missionId + '_allow', projectId);

    const result = fs.readFileSync(dupFile, 'utf-8');
    fs.unlinkSync(dupFile);

    if (!r.ok) throw new Error(`Falhou com allowMultiple=true: ${r.error}`);
    if (result.includes("log('ok')")) throw new Error('Substituição incompleta');
    if (!result.includes("log('done')")) throw new Error('Replace não aplicado');

    return `OK (ambas as ocorrências substituídas)`;
  });

  check('patch: partial_first_line bloqueado quando âncora é ambígua', () => {
    const { findMatch } = require('./services/patchEngine');
    // âncora repetida — deve ser bloqueada
    const content = "app.use(cors());\napp.use(cors());\n";
    const find    = "app.use(cors());\noutro trecho que nao existe";
    const result  = findMatch(content, find, {});

    // partial_first_line deve estar no log como blocked=true
    const partialEntry = result.log.find(e => e.strategy === 'partial_first_line');
    if (!partialEntry) throw new Error('partial_first_line não apareceu no log');
    if (!partialEntry.blocked) throw new Error('partial_first_line deveria estar blocked=true');
    if (result.strategy === 'partial_first_line') throw new Error('partial_first_line ambíguo foi aplicado — não deveria');

    return `OK (bloqueado: "${partialEntry.reason}")`;
  });

  check('match engine: exact match', () => {
    const { findMatch } = require('./services/patchEngine');
    const content = "const PORT = process.env.PORT || 3000;\napp.listen(PORT);\n";
    const result  = findMatch(content, "process.env.PORT || 3000", {});
    if (result.strategy !== 'exact') throw new Error(`Esperado exact, got ${result.strategy}`);
    return `OK (strategy=${result.strategy}, occurrences=${result.occurrences})`;
  });

  check('match engine: normalized whitespace', () => {
    const { findMatch } = require('./services/patchEngine');
    // Conteúdo com espaços extras / tabs diferentes do find
    const content = "const   PORT  =  process.env.PORT  ||  3000;\n";
    const find    = "const PORT = process.env.PORT || 3000;";
    const result  = findMatch(content, find, {});
    if (!['exact','normalized','auto_regex'].includes(result.strategy)) {
      throw new Error(`Esperado normalized/auto_regex, got ${result.strategy}`);
    }
    return `OK (strategy=${result.strategy})`;
  });

  check('match engine: regex explícito', () => {
    const { findMatch } = require('./services/patchEngine');
    const content = "const PORT = process.env.PORT || 3000;\n";
    const result  = findMatch(content, "INEXISTENTE", { regex: 'PORT\\s*=.*?3000' });
    if (result.strategy !== 'regex') throw new Error(`Esperado regex, got ${result.strategy}`);
    return `OK (strategy=${result.strategy})`;
  });

  check('match engine: auto_regex whitespace flex', () => {
    const { findMatch } = require('./services/patchEngine');
    const content = "app.use(\n  cors()\n);\n";
    const find    = "app.use(cors());";
    const result  = findMatch(content, find, {});
    if (!['exact','normalized','auto_regex','partial_first_line'].includes(result.strategy)) {
      throw new Error(`Nenhuma estratégia encontrou: ${result.strategy}`);
    }
    return `OK (strategy=${result.strategy})`;
  });

  check('match engine: candidatos similares quando nada encontrado', () => {
    const { findMatch } = require('./services/patchEngine');
    const content = "const port = 3000;\napp.listen(port);\n";
    const find    = "TRECHO QUE NAO EXISTE NA VIDA";
    const result  = findMatch(content, find, {});
    if (result.strategy !== 'none') throw new Error(`Esperado none, got ${result.strategy}`);
    if (!Array.isArray(result.log)) throw new Error('log deve ser array');
    return `OK (strategy=none, ${result.log.length} tentativas logadas)`;
  });

  check('match engine: function-insert fallback', () => {
    const { insertAtFunctionStart } = require('./services/patchEngine');
    const content = "function upload(req, res) {\n  const file = req.file;\n}\n";
    const patch   = { find: "INEXISTENTE", replace: "if (!req.file) return res.status(400).json({ error: 'no file' });" };
    const result  = insertAtFunctionStart(content, patch);
    if (!result) throw new Error('insertAtFunctionStart retornou null');
    if (!result.includes(patch.replace)) throw new Error('replace não inserido');
    return `OK (inserção feita, ${result.length} chars)`;
  });

  check('import: patchEngine exports findMatch e insertAtFunctionStart', () => {
    const pe = require('./services/patchEngine');
    if (typeof pe.findMatch !== 'function') throw new Error('findMatch não exportado');
    if (typeof pe.insertAtFunctionStart !== 'function') throw new Error('insertAtFunctionStart não exportado');
    return 'OK';
  });
  check('hermes: fallback seguro sem chave LLM', () => {
    const { fallbackRca } = require('./services/hermesRca');

    const rca = fallbackRca('EADDRINUSE: address already in use :::3000');
    if (!rca.cause) throw new Error('cause vazio no fallback');
    if (!rca.fix)   throw new Error('fix vazio no fallback');
    if (rca.source !== 'hermes_fallback') throw new Error('source errado');

    return `OK (cause="${rca.cause.slice(0, 50)}", confidence=${rca.confidence}%)`;
  });

  // ── 9. File Scanner ──────────────────────────────────────────────────────
  check('import: fileScanner', () => {
    const { scanProject, buildFileContext, detectCategory } = require('./services/fileScanner');
    if (typeof scanProject      !== 'function') throw new Error('scanProject não é função');
    if (typeof buildFileContext !== 'function') throw new Error('buildFileContext não é função');
    if (typeof detectCategory   !== 'function') throw new Error('detectCategory não é função');
    return 'OK';
  });

  check('scanner: detecta categoria upload_multer', () => {
    const { detectCategory } = require('./services/fileScanner');
    const cat = detectCategory('Cannot read properties of null reading mimetype');
    if (!cat) throw new Error('Categoria não detectada');
    if (cat.name !== 'upload_multer') throw new Error(`Esperado upload_multer, got ${cat.name}`);
    return `OK (categoria=${cat.name})`;
  });

  check('scanner: pontua arquivo com multer corretamente', () => {
    const { scoreFile, detectCategory } = require('./services/fileScanner');
    const cat = detectCategory('Cannot read properties of null reading mimetype');
    const content = [
      "const multer = require('multer');",
      "const upload = multer({ dest: 'uploads/' });",
      "router.post('/upload', upload.single('file'), async (req, res) => {",
      "  const file = req.file;",
      "  if (!file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'tipo inválido' });",
      "});",
    ].join('\n');
    const { score, matched } = scoreFile('/fake/aiRoutes.js', content, cat.fileSignals);
    if (score < 15) throw new Error(`Score muito baixo: ${score} (esperado >= 15)`);
    if (!matched.includes('multer import')) throw new Error('multer import não detectado');
    return `OK (score=${score}, matched=[${matched.join(', ')}])`;
  });

  check('scanner: arquivo sem multer tem score 0', () => {
    const { scoreFile, detectCategory } = require('./services/fileScanner');
    const cat = detectCategory('Cannot read properties of null reading mimetype');
    const content = "const express = require('express');\napp.listen(3000);\n";
    const { score } = scoreFile('/fake/server.js', content, cat.fileSignals);
    if (score !== 0) throw new Error(`Score deveria ser 0, got ${score}`);
    return 'OK (score=0 para arquivo sem multer)';
  });

  check('scanner: scanProject seleciona arquivo multer no tmpDir', () => {
    const { scanProject } = require('./services/fileScanner');
    const multerFile = path.join(tmpDir, 'uploadRoutes.js');
    fs.writeFileSync(multerFile, [
      "const multer = require('multer');",
      "const upload = multer({ storage: multer.memoryStorage() });",
      "router.post('/upload', upload.single('image'), (req, res) => {",
      "  const file = req.file;",
      "  if (!file.mimetype.startsWith('image/')) return res.status(400).end();",
      "  res.json({ ok: true });",
      "});",
    ].join('\n'), 'utf-8');

    const result = scanProject(tmpDir, 'Cannot read properties of null reading mimetype');
    fs.unlinkSync(multerFile);

    if (!result.found) throw new Error('Scanner não encontrou arquivo de upload');
    if (!result.relativePath.includes('uploadRoutes')) {
      throw new Error(`Arquivo errado: ${result.relativePath}`);
    }
    return `OK (selecionado=${result.relativePath}, score=${result.score})`;
  });

  check('scanner: fallbackRca usa arquivo real do scanResult', () => {
    const { fallbackRca } = require('./services/hermesRca');
    const fakeScan = {
      found: true,
      relativePath: 'src/routes/aiRoutes.js',
      content: "const file = req.file;\nif (!file.mimetype.startsWith('image/')) return res.status(400).end();\n",
      score: 25,
      matched: ['req.file usage', '.mimetype access'],
    };
    const rca = fallbackRca('Cannot read properties of null reading mimetype', fakeScan);
    if (!rca.patches.length) throw new Error('Nenhum patch gerado');
    const patch = rca.patches[0];
    if (patch.file !== 'src/routes/aiRoutes.js') {
      throw new Error(`Arquivo errado no patch: ${patch.file}`);
    }
    return `OK (patch.file=${patch.file})`;
  });

  // ── Limpar arquivos temporários ──────────────────────────────────────────
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignorar */ }

  // Limpar projeto fake do banco
  try {
    const { db } = require('./db/sqlite');
    db.prepare('DELETE FROM mission_steps WHERE mission_id LIKE ?').run('selftest_%');
    db.prepare('DELETE FROM patches WHERE mission_id LIKE ?').run('selftest_%');
    db.prepare('DELETE FROM snapshots WHERE mission_id LIKE ?').run('selftest_%');
    db.prepare('DELETE FROM pass_gold_evaluations WHERE mission_id LIKE ?').run('selftest_%');
    db.prepare('DELETE FROM missions WHERE id LIKE ?').run('selftest_%');
    db.prepare('DELETE FROM projects WHERE id LIKE ?').run('selftest_proj_%');
  } catch { /* ignorar */ }

  return {
    ok: failed === 0,
    passed,
    failed,
    total: results.length,
    results,
    summary: `${passed}/${results.length} testes passaram`,
  };
}

module.exports = { runSelfTest };

// ── CLI direto ────────────────────────────────────────────────────────────
if (require.main === module) {
  require('dotenv').config();
  console.log('═'.repeat(52));
  console.log(' VISION CORE — SELF-TEST v1.0.5');
  console.log('═'.repeat(52));

  runSelfTest().then(result => {
    for (const r of result.results) {
      console.log(`  ${r.ok ? '✔' : '✗'} ${r.name}`);
      if (!r.ok) console.log(`    → ${r.detail}`);
      else if (r.detail && r.detail !== 'ok') console.log(`    ↳ ${r.detail}`);
    }
    console.log('─'.repeat(52));
    console.log(` ${result.summary}`);
    console.log('═'.repeat(52));
    process.exit(result.ok ? 0 : 1);
  }).catch(err => {
    console.error('[SELF-TEST FATAL]', err.message);
    process.exit(1);
  });
}
