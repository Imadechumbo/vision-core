'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { helpers } = require('../db/sqlite');

// ── Path traversal guard ──────────────────────────────────────────────────
// Garante que o arquivo alvo está DENTRO da pasta do projeto.
// Bloqueia tentativas como patch.file = "../../.env" ou "../secrets/key"
function assertSafePath(basePath, filePath) {
  const resolvedBase = path.resolve(basePath);
  const resolvedFile = path.resolve(filePath);

  if (!resolvedFile.startsWith(resolvedBase + path.sep) &&
      resolvedFile !== resolvedBase) {
    throw new Error(
      `Path traversal bloqueado: "${resolvedFile}" está fora de "${resolvedBase}"`
    );
  }
}

// ── Tirar snapshot de arquivo antes do patch ──────────────────────────────
function snapshotFile(filePath, missionId, projectId, basePath) {
  if (!fs.existsSync(filePath)) return null;

  // Proteção: snapshot só dentro da pasta do projeto
  if (basePath) {
    try {
      assertSafePath(basePath, filePath);
    } catch (e) {
      console.error(`[SNAPSHOT] ${e.message}`);
      return null;
    }
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const hash    = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  const id      = `snap_${Date.now()}_${hash}`;

  helpers.insertSnapshot.run({
    id, mission_id: missionId, project_id: projectId,
    file_path: filePath, content, hash,
  });

  return { id, hash, filePath };
}

// ── Match engine — tenta encontrar o trecho por múltiplas estratégias ─────
function findMatch(content, find, patch) {
  const log = [];

  // Estratégia 1: match exato
  if (content.includes(find)) {
    const count = content.split(find).length - 1;
    log.push({ strategy: 'exact', found: true, occurrences: count });
    return { strategy: 'exact', occurrences: count, log };
  }
  log.push({ strategy: 'exact', found: false });

  // Estratégia 2: normalizado (whitespace colapsado)
  const normalize  = s => s.replace(/\s+/g, ' ').trim();
  const normContent = normalize(content);
  const normFind    = normalize(find);

  if (normContent.includes(normFind)) {
    log.push({ strategy: 'normalized', found: true });
    return { strategy: 'normalized', occurrences: 1, log };
  }
  log.push({ strategy: 'normalized', found: false });

  // Estratégia 3: regex explícito fornecido no patch
  if (patch.regex) {
    try {
      const flags   = patch.regexFlags || 'g';
      const re      = new RegExp(patch.regex, flags);
      const matches = [...content.matchAll(re)];
      if (matches.length > 0) {
        log.push({ strategy: 'regex', found: true, pattern: patch.regex, occurrences: matches.length });
        return { strategy: 'regex', regex: re, occurrences: matches.length, log };
      }
      log.push({ strategy: 'regex', found: false, pattern: patch.regex });
    } catch (e) {
      log.push({ strategy: 'regex', found: false, error: e.message });
    }
  }

  // Estratégia 4: auto-regex (escape + whitespace flex)
  try {
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexed  = escaped.replace(/\\\s+/g, '\\s+').replace(/\s+/g, '\\s+');
    const autoRe  = new RegExp(flexed);
    if (content.match(autoRe)) {
      log.push({ strategy: 'auto_regex', found: true, occurrences: 1 });
      return { strategy: 'auto_regex', regex: autoRe, occurrences: 1, log };
    }
    log.push({ strategy: 'auto_regex', found: false });
  } catch {
    log.push({ strategy: 'auto_regex', found: false, error: 'regex inválido' });
  }

  // Estratégia 5: partial_first_line — com bloqueio de ambiguidade
  const firstLine = find.split('\n')[0].trim();
  if (firstLine.length >= 8) {
    const occurrences = content.split(firstLine).length - 1;
    if (occurrences === 1) {
      // Exatamente 1 ocorrência — seguro aplicar
      log.push({ strategy: 'partial_first_line', found: true, anchor: firstLine, occurrences: 1 });
      return { strategy: 'partial_first_line', anchor: firstLine, occurrences: 1, log };
    } else if (occurrences > 1) {
      // Ambíguo — registrar no log mas NÃO usar esta estratégia
      log.push({
        strategy: 'partial_first_line',
        found: false,
        anchor: firstLine,
        occurrences,
        blocked: true,
        reason: `âncora ambígua: ${occurrences} ocorrências encontradas`,
      });
    } else {
      log.push({ strategy: 'partial_first_line', found: false, anchor: firstLine });
    }
  } else {
    log.push({ strategy: 'partial_first_line', found: false, reason: 'âncora muito curta (< 8 chars)' });
  }

  // Estratégia 6: candidatos similares (só diagnóstico)
  const lines     = content.split('\n');
  const findWords = find.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const candidates = lines
    .map((line, i) => {
      const lc    = line.toLowerCase();
      const score = findWords.reduce((acc, w) => acc + (lc.includes(w) ? 1 : 0), 0);
      return { line: line.trim(), lineNumber: i + 1, score };
    })
    .filter(c => c.score >= Math.max(1, Math.floor(findWords.length * 0.4)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  log.push({ strategy: 'candidates', found: false, candidates });

  return { strategy: 'none', occurrences: 0, candidates, log };
}

// ── Aplicar substituição com base na estratégia encontrada ────────────────
function doReplace(content, find, replace, matchResult, allowMultiple) {
  switch (matchResult.strategy) {

    case 'exact': {
      if (matchResult.occurrences > 1 && !allowMultiple) return null;
      return allowMultiple
        ? content.replaceAll(find, replace)
        : content.replace(find, replace);
    }

    case 'normalized': {
      const lines      = find.split('\n').map(l => l.trim()).filter(Boolean);
      const firstToken = lines[0];
      const lastToken  = lines[lines.length - 1];
      const idx        = content.indexOf(firstToken);
      if (idx === -1) return null;
      const endIdx = content.indexOf(lastToken, idx);
      if (endIdx === -1) return null;
      const end = endIdx + lastToken.length;
      return content.slice(0, idx) + replace + content.slice(end);
    }

    case 'regex':
    case 'auto_regex': {
      const re = matchResult.regex;
      if (!re) return null;
      return allowMultiple
        ? content.replace(new RegExp(re.source, 'g'), replace)
        : content.replace(re, replace);
    }

    case 'partial_first_line': {
      // Garantido pelo findMatch que occurrences === 1 aqui
      const anchor  = matchResult.anchor;
      const lineIdx = content.indexOf(anchor);
      if (lineIdx === -1) return null;
      const lineEnd = content.indexOf('\n', lineIdx);
      const end     = lineEnd === -1 ? content.length : lineEnd;
      return content.slice(0, lineIdx) + replace + content.slice(end);
    }

    default:
      return null;
  }
}

// ── Fallback: inserir no início da função mais próxima ────────────────────
function insertAtFunctionStart(content, patch) {
  const funcPatterns = [
    /function\s+(\w+)\s*\([^)]*\)\s*\{/g,
    /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g,
    /app\.\w+\s*\([^,]+,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g,
    /router\.\w+\s*\([^,]+,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g,
  ];

  const findKeywords = (patch.find || '').toLowerCase().split(/\W+/).filter(w => w.length > 3);
  let bestMatch = null;
  let bestScore = 0;

  for (const pattern of funcPatterns) {
    let m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(content)) !== null) {
      const context = content.slice(Math.max(0, m.index - 100), m.index + 300).toLowerCase();
      const score   = findKeywords.reduce((acc, w) => acc + (context.includes(w) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { bodyStart: m.index + m[0].length };
      }
    }
  }

  if (!bestMatch || bestScore < 1) return null;

  const indent = '\n  ';
  return content.slice(0, bestMatch.bodyStart) + indent + patch.replace + content.slice(bestMatch.bodyStart);
}

// ── Aplicar um único patch ────────────────────────────────────────────────
function applyOne(basePath, patch, idx) {
  const filePath = path.join(basePath, patch.file);

  // 1. Path traversal protection — antes de qualquer fs.readFileSync
  try {
    assertSafePath(basePath, filePath);
  } catch (e) {
    return { ok: false, idx, file: patch.file, error: e.message };
  }

  if (!fs.existsSync(filePath)) {
    return { ok: false, idx, file: patch.file, error: `Arquivo não encontrado: ${filePath}` };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const find    = patch.find    || '';
  const replace = patch.replace || '';

  // 2. Match engine
  const matchResult = findMatch(content, find, patch);
  const matchLog    = matchResult.log || [];

  console.log(`[PATCH] Match engine [${idx + 1}] ${patch.file}:`);
  for (const entry of matchLog) {
    const icon = entry.found ? '✔' : (entry.blocked ? '⊘' : '✗');
    const suffix = entry.blocked ? ` — BLOQUEADO (${entry.reason})` : entry.found ? '' : ' — não encontrado';
    console.log(`  ${icon} ${entry.strategy}${suffix}`);
    if (entry.candidates?.length) {
      console.log('    Candidatos similares:');
      for (const c of entry.candidates) {
        console.log(`      linha ${c.lineNumber}: ${c.line.slice(0, 70)}`);
      }
    }
  }

  // 3. Tentar aplicar
  let newContent = null;
  if (matchResult.strategy !== 'none') {
    newContent = doReplace(content, find, replace, matchResult, !!patch.allowMultiple);
    if (newContent !== null) {
      console.log(`  → Aplicado via: ${matchResult.strategy}`);
    }
  }

  // 4. Fallback function-insert — DESABILITADO por padrão (fallbackInsert default false)
  if (newContent === null && patch.fallbackInsert === true) {
    console.log('  → Tentando fallback function-insert...');
    newContent = insertAtFunctionStart(content, patch);
    if (newContent !== null) {
      console.log('  → Aplicado via: function_insert_fallback');
      matchResult.strategy = 'function_insert_fallback';
    }
  }

  if (newContent === null) {
    return {
      ok: false, idx, file: patch.file,
      error: `Nenhuma estratégia de match encontrou o trecho em ${patch.file}`,
      matchLog,
      candidates: matchResult.candidates || [],
      tried: matchLog.map(e => e.strategy),
    };
  }

  // 5. Sanidade: patch não pode resultar em conteúdo idêntico
  if (newContent === content) {
    return {
      ok: false, idx, file: patch.file,
      error: 'Patch resultou em conteúdo idêntico — replace igual ao find?',
      matchLog,
    };
  }

  // ── CRITICAL FILE GUARD — bloquear antes de gravar arquivo protegido ─────
  try {
    const guard = require('./criticalFileGuard');
    if (guard.isCriticalFile(filePath)) {
      const guardResult = guard.assertCriticalPatchAllowed(filePath, content, newContent);
      if (!guardResult.ok) {
        return {
          ok:    false,
          idx,
          file:  patch.file,
          error: guardResult.error,
          code:  guardResult.code || 'CRITICAL_FILE_GUARD_BLOCKED',
          guardAnalysis: guardResult.analysis,
        };
      }
    }
  } catch (guardErr) {
    // Guard não disponível — logar mas não bloquear (fail open para não travar deploy)
    console.warn('[GUARD] criticalFileGuard indisponível:', guardErr.message);
  }

  fs.writeFileSync(filePath, newContent, 'utf-8');

  return {
    ok: true,
    idx,
    file: patch.file,
    strategy: matchResult.strategy,
    occurrences: matchResult.occurrences || 1,
    description: patch.description || '',
    linesChanged: Math.abs(newContent.split('\n').length - content.split('\n').length),
    matchLog,
  };
}

// ── Aplicar múltiplos patches (transacional com rollback via SQLite) ───────
function applyPatches(basePath, patches, missionId, projectId) {
  if (!patches || patches.length === 0) {
    return { ok: false, error: 'Nenhum patch fornecido', results: [] };
  }

  const resolvedBase = path.resolve(basePath);
  const sorted = [...patches].sort((a, b) => (a.order || 0) - (b.order || 0));

  // 1. Snapshot de TODOS os arquivos afetados ANTES de qualquer mudança
  const affectedFiles = [...new Set(sorted.map(p => path.join(resolvedBase, p.file)))];
  const snapshots = affectedFiles
    .map(f => snapshotFile(f, missionId, projectId, resolvedBase))
    .filter(Boolean);

  // 2. Inserir patches no banco com applied=0
  const patchRowIds = [];
  for (const p of sorted) {
    const info = helpers.insertPatch.run({
      mission_id: missionId, file: p.file,
      find_text: p.find, replace_text: p.replace,
      description: p.description || '', order_idx: p.order || 1, applied: 0,
    });
    patchRowIds.push(info.lastInsertRowid);
  }

  const results  = [];
  let failedAt   = null;

  // 3. Aplicar em sequência
  for (let i = 0; i < sorted.length; i++) {
    const result = applyOne(resolvedBase, sorted[i], i);
    results.push(result);

    if (!result.ok) {
      failedAt = i;
      console.warn(`[PATCH] ✗ [${i + 1}/${sorted.length}] ${result.file}: ${result.error}`);
      break;
    }

    try { helpers.markPatchApplied.run(patchRowIds[i]); } catch { /* não bloquear */ }
    console.log(`[PATCH] ✔ [${i + 1}/${sorted.length}] ${result.file}: ${result.description}`);
  }

  // 4. Falhou → rollback via snapshots do banco
  if (failedAt !== null) {
    console.warn(`[PATCH] Falha no patch ${failedAt + 1} — revertendo ${snapshots.length} arquivo(s)...`);
    for (const snap of snapshots) {
      try {
        const row = helpers.getSnapshot.get(snap.id);
        if (row) {
          fs.writeFileSync(row.file_path, row.content, 'utf-8');
          console.log(`[PATCH] Revertido: ${row.file_path}`);
        }
      } catch (err) {
        console.error(`[PATCH] Erro ao reverter ${snap.filePath}:`, err.message);
      }
    }
    helpers.markRolledBack.run(missionId);

    return {
      ok: false, failedAt,
      error: results[failedAt].error,
      results,
      rolledBack: snapshots.map(s => s.filePath),
    };
  }

  // 5. Sucesso
  const summary = results.map(r =>
    `  ✔ [${r.idx + 1}] ${r.file}: ${r.description} via ${r.strategy} (${r.linesChanged} linhas)`
  ).join('\n');

  return {
    ok: true,
    applied: sorted.length,
    results,
    summary,
    filesAffected: [...new Set(results.map(r => r.file))],
    snapshots: snapshots.map(s => s.id),
  };
}

// ── Rollback manual de uma missão ─────────────────────────────────────────
function rollbackMission(missionId) {
  const snaps = helpers.getSnapshotsByMission.all(missionId);
  if (!snaps.length) return { ok: false, error: 'Nenhum snapshot encontrado' };

  const restored = [];
  for (const snap of snaps) {
    try {
      fs.writeFileSync(snap.file_path, snap.content, 'utf-8');
      restored.push(snap.file_path);
    } catch (err) {
      console.error(`[ROLLBACK] Erro ao restaurar ${snap.file_path}:`, err.message);
    }
  }

  helpers.markRolledBack.run(missionId);
  console.log(`[ROLLBACK] ✔ ${restored.length} arquivo(s) restaurado(s)`);

  return { ok: true, restored, missionId };
}

// ── Validar sintaxe ───────────────────────────────────────────────────────
function validate(basePath, files = ['server.js']) {
  const { execSync } = require('child_process');
  const results = [];

  for (const file of files) {
    const fp = path.join(basePath, file);
    if (!fs.existsSync(fp)) continue;
    try {
      execSync(`node --check "${fp}"`, { stdio: 'pipe' });
      results.push({ file, ok: true });
    } catch (e) {
      results.push({ file, ok: false, error: e.stderr?.toString()?.slice(0, 300) || e.message });
    }
  }

  let testResult = null;
  const pkgPath = path.join(basePath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.test && !pkg.scripts.test.includes('no test')) {
        const out = execSync('npm test --silent', {
          cwd: basePath, timeout: 30000, stdio: 'pipe', encoding: 'utf-8',
        });
        testResult = { ok: true, output: out.slice(0, 300) };
      }
    } catch (e) {
      testResult = { ok: false, error: e.stdout?.toString()?.slice(0, 200) || e.message };
    }
  }

  return { ok: results.every(r => r.ok), files: results, tests: testResult };
}

module.exports = {
  applyPatches, rollbackMission, validate,
  snapshotFile, findMatch, insertAtFunctionStart, assertSafePath,
};
