'use strict';

/**
 * §48 — PATCH ENGINE COM MATCH ENGINE 5 ESTRATÉGIAS
 *
 * Ref: SDDF_SPEC.md § PIPELINE CANÔNICO — Lei Arquitetural
 * Restaurado da V2.2.2 com adaptação para V3.0.0.
 *
 * Match Engine — 5 estratégias em sequência (code_patch):
 *   1. exact             — String.includes() exato (pós CRLF norm)
 *   2. normalized        — whitespace-colapsado linha a linha
 *   3. auto_regex        — escape + \s+ flex
 *   4. partial_first_line — âncora na 1ª linha (BLOQUEADO se occurrences > 1)
 *   5. candidates        — diagnóstico por keywords (log only, nunca aplica)
 *
 * Snapshot: original_content preservado antes de aplicar (sem SQLite).
 */

/* ── Helper: escape string para RegExp ─────────────────────────── */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * applyCodePatch(content, search, replace, opts) → CodePatchResult
 *
 * @param {string}  content         — conteúdo CRLF-normalizado
 * @param {string}  search          — string a localizar (CRLF-norm)
 * @param {string}  replace         — string substituta (CRLF-norm)
 * @param {object}  [opts]
 * @param {boolean} [opts.allowMultiple=false]
 * @returns {{ patched:string|null, strategy:string|null, log:string[], error:string|null }}
 */
function applyCodePatch(content, search, replace, opts) {
  const allowMultiple = (opts && opts.allowMultiple) || false;
  const log = [];

  /* ── Strategy 1: exact ─────────────────────────────────────────── */
  if (content.includes(search)) {
    const count = content.split(search).length - 1;
    if (!allowMultiple && count > 1) {
      log.push('✗ exact: encontrado ' + count + 'x — ambíguo (allowMultiple=false)');
    } else {
      log.push('✔ exact: match ' + count + 'x');
      const patched = allowMultiple
        ? content.split(search).join(replace)
        : content.replace(search, replace);
      return { patched, strategy: 'exact', log, error: null };
    }
  } else {
    log.push('✗ exact: não encontrado');
  }

  /* ── Strategy 2: normalized (whitespace-colapsado, linha a linha) ─ */
  {
    const sLines = search.split('\n');
    const fLines = content.split('\n');
    let start = -1;
    outer2: for (let i = 0; i <= fLines.length - sLines.length; i++) {
      for (let j = 0; j < sLines.length; j++) {
        if (fLines[i + j].trim() !== sLines[j].trim()) continue outer2;
      }
      start = i;
      break;
    }
    if (start !== -1) {
      log.push('✔ normalized: sequência encontrada em linha ' + (start + 1));
      const rLines = replace.split('\n');
      const patched = [
        ...fLines.slice(0, start),
        ...rLines,
        ...fLines.slice(start + sLines.length)
      ].join('\n');
      return { patched, strategy: 'normalized', log, error: null };
    } else {
      log.push('✗ normalized: sequência de linhas não encontrada');
    }
  }

  /* ── Strategy 3: auto_regex (escape + \s+ flex) ───────────────── */
  {
    try {
      const regexStr = escapeRegex(search)
        .replace(/\\ /g, '\\s+')
        .replace(/\\n/g, '[\\s\\S]*?');
      const rx = new RegExp(regexStr);
      if (rx.test(content)) {
        const allMatches = content.match(new RegExp(regexStr, 'g'));
        const count = allMatches ? allMatches.length : 1;
        if (!allowMultiple && count > 1) {
          log.push('✗ auto_regex: encontrado ' + count + 'x — ambíguo');
        } else {
          log.push('✔ auto_regex: whitespace-flex match (' + count + 'x)');
          const patched = content.replace(rx, replace);
          return { patched, strategy: 'auto_regex', log, error: null };
        }
      } else {
        log.push('✗ auto_regex: regex flex sem match');
      }
    } catch (_e) {
      log.push('✗ auto_regex: erro regex — ' + _e.message);
    }
  }

  /* ── Strategy 4: partial_first_line ──────────────────────────── */
  {
    const firstLine = search.split('\n')[0].trim();
    if (firstLine.length >= 8) {
      const fLines = content.split('\n');
      const occurrences = fLines.filter(l => l.trim() === firstLine).length;
      if (occurrences > 1) {
        log.push('⊘ partial_first_line: BLOQUEADO — âncora "' + firstLine.slice(0, 40) + '" aparece ' + occurrences + 'x (ambígua)');
      } else if (occurrences === 1) {
        const anchorIdx = fLines.findIndex(l => l.trim() === firstLine);
        const sLines = search.split('\n');
        let matches = 0;
        for (let k = 0; k < sLines.length && (anchorIdx + k) < fLines.length; k++) {
          if (fLines[anchorIdx + k].trim() === sLines[k].trim()) matches++;
        }
        const matchRatio = sLines.length > 0 ? matches / sLines.length : 0;
        if (matchRatio >= 0.5) {
          log.push('✔ partial_first_line: âncora L' + (anchorIdx + 1) + ' · ' + matches + '/' + sLines.length + ' linhas OK');
          const rLines = replace.split('\n');
          const patched = [
            ...fLines.slice(0, anchorIdx),
            ...rLines,
            ...fLines.slice(anchorIdx + sLines.length)
          ].join('\n');
          return { patched, strategy: 'partial_first_line', log, error: null };
        } else {
          log.push('✗ partial_first_line: âncora encontrada, match insuficiente (' + matches + '/' + sLines.length + ')');
        }
      } else {
        log.push('✗ partial_first_line: primeira linha "' + firstLine.slice(0, 40) + '" não encontrada');
      }
    } else {
      log.push('✗ partial_first_line: primeira linha muito curta (<8 chars)');
    }
  }

  /* ── Strategy 5: candidates (diagnóstico — log only, nunca aplica) ─ */
  {
    const keywords = search.split(/\W+/).filter(w => w.length >= 5);
    if (keywords.length > 0) {
      const candidates = content.split('\n')
        .map((l, i) => ({ idx: i, line: l, score: keywords.filter(kw => l.includes(kw)).length }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      if (candidates.length > 0) {
        const cStr = candidates.map(c => 'L' + (c.idx + 1) + '(' + c.score + 'kw): ' + c.line.trim().slice(0, 60)).join(' | ');
        log.push('⊘ candidates: ' + cStr);
      } else {
        log.push('⊘ candidates: sem linhas similares');
      }
    } else {
      log.push('⊘ candidates: sem keywords úteis em search');
    }
  }

  /* ── Todas as estratégias falharam — diagnóstico ─────────────── */
  const sNonEmpty = search.split('\n').filter(l => l.trim().length > 0);
  const fAll      = content.split('\n');
  const found     = sNonEmpty.filter(sl => fAll.some(fl => fl.trim() === sl.trim()));
  const missing   = sNonEmpty.filter(sl => !fAll.some(fl => fl.trim() === sl.trim()));
  const errorMsg  =
    'patch.search não encontrado (5 estratégias falharam). ' +
    'Linhas encontradas: ' + found.length + '/' + sNonEmpty.length + '. ' +
    (missing.length ? 'Não encontradas: ' + JSON.stringify(missing.slice(0, 2)) : '');

  return { patched: null, strategy: null, log, error: errorMsg };
}

/**
 * applyPatch(originalContent, patch, fixType) → PatchResult
 *
 * Ponto de entrada principal do §48.
 * snapshot_content = originalContent antes da modificação (alimenta §47 PASS GOLD).
 *
 * @param {string} originalContent
 * @param {*}      patch   — string (full_replace) | {search,replace} | object (json_field)
 * @param {string} fixType — 'code_patch' | 'full_replace' | 'json_field'
 * @returns {{ patchedContent:string, match_strategy:string|null, match_log:string[], snapshot_content:string }}
 * @throws {Error} se patch falhar
 */
function applyPatch(originalContent, patch, fixType) {
  const snapshot_content = originalContent; /* §48: snapshot imutável */

  /* §44fix: normalizar CRLF → LF (ZIPs Windows têm \r\n, LLM gera \n) */
  const normOrig = originalContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  /* ── full_replace ──────────────────────────────────────────────── */
  if (fixType === 'full_replace') {
    const patchedContent = typeof patch === 'string' ? patch : JSON.stringify(patch, null, 2);
    return {
      patchedContent,
      match_strategy: 'full_replace',
      match_log: ['✔ full_replace: conteúdo integral substituído'],
      snapshot_content
    };
  }

  /* ── json_field ────────────────────────────────────────────────── */
  if (fixType === 'json_field') {
    let parsed;
    try { parsed = JSON.parse(normOrig); }
    catch (e) { throw new Error('json_field: JSON inválido — ' + e.message); }
    if (!patch || typeof patch !== 'object') throw new Error('json_field: patch deve ser objeto');
    const merged = Object.assign({}, parsed, patch);
    return {
      patchedContent: JSON.stringify(merged, null, 2),
      match_strategy: 'json_field',
      match_log: ['✔ json_field: campos mesclados'],
      snapshot_content
    };
  }

  /* ── code_patch (default) ──────────────────────────────────────── */
  const searchRaw  = typeof patch === 'object' ? (patch.search  || '') : '';
  const replaceRaw = typeof patch === 'object' ? (patch.replace || '') : '';
  if (!searchRaw) throw new Error('patch.search vazio para code_patch');

  const search  = searchRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const replace = replaceRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const result = applyCodePatch(normOrig, search, replace);

  if (result.error) {
    throw new Error(result.error);
  }

  console.log('[PATCH §48] strategy=' + result.strategy + ' | ' + result.log.join(' | '));

  return {
    patchedContent: result.patched,
    match_strategy: result.strategy,
    match_log:      result.log,
    snapshot_content
  };
}

module.exports = { applyPatch, applyCodePatch };
