'use strict';

/**
 * §44 — MPEG Compress-Context Pipeline
 *
 * 3 stages: STRIP → WINDOW → SUMMARIZE
 *
 * Reduces a single file's content for LLM context while preserving the
 * region most relevant to the diagnosis string.
 *
 * @param {string} fileContent  Full file content
 * @param {string} diagnosis    Diagnosis / question hint (used to find relevant region)
 * @returns {{
 *   compressed:        string,
 *   original_lines:    number,
 *   compressed_lines:  number,
 *   compression_ratio: number,   // % reduction (0-100)
 *   window_start:      number,
 *   window_end:        number,
 *   fallback:          boolean,
 *   error?:            string
 * }}
 */
function compressContext(fileContent, diagnosis) {
  const originalLines = fileContent ? fileContent.split('\n').length : 0;

  try {
    if (!fileContent || fileContent.length === 0) {
      return _fallback(fileContent || '', originalLines, 'empty content');
    }

    /* ── Stage 1: STRIP ───────────────────────────────────────────── */
    let stripped = fileContent
      // Remove multi-line comments (non-greedy)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove single-line // comments (not inside strings — best effort)
      .replace(/^\s*\/\/.*$/gm, '')
      // Remove console.log / warn / error lines
      .replace(/^\s*console\.(log|warn|error|debug|info)\([\s\S]*?\);\s*$/gm, '')
      // Collapse 3+ consecutive blank lines → 1
      .replace(/\n{3,}/g, '\n\n');

    const strippedLines = stripped.split('\n');

    /* ── Stage 2: WINDOW — detect relevant region ────────────────── */
    const diagWords = (diagnosis || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function(w) { return w.length > 3; });

    // Score each line by relevance to diagnosis
    let bestLine  = -1;
    let bestScore = 0;
    strippedLines.forEach(function(line, i) {
      const lc = line.toLowerCase();
      let score = 0;
      diagWords.forEach(function(w) {
        if (lc.includes(w)) score += (w.length > 6 ? 3 : 1);
      });
      if (score > bestScore) { bestScore = score; bestLine = i; }
    });

    // Window: ±50 lines around best match
    const WINDOW = 50;
    let wStart = 0;
    let wEnd   = strippedLines.length - 1;
    if (bestLine >= 0) {
      wStart = Math.max(0, bestLine - WINDOW);
      wEnd   = Math.min(strippedLines.length - 1, bestLine + WINDOW);
    }

    // Always preserve critical constants — expand window if needed
    const CRITICAL_PATTERNS = [
      /const\s+LOCAL_REAL_COVERS/,
      /const\s+TRUSTED_API_COVER_SOURCES/,
      /^import\s+/,
      /^const\s+.*=\s*require\(/,
      /^var\s+.*=\s*require\(/,
      /^'use strict'/,
      /^"use strict"/
    ];
    strippedLines.forEach(function(line, i) {
      if (CRITICAL_PATTERNS.some(function(p) { return p.test(line.trim()); })) {
        wStart = Math.min(wStart, i);
        // include up to 15 lines after a critical declaration
        wEnd   = Math.max(wEnd, Math.min(i + 15, strippedLines.length - 1));
      }
    });
    wEnd = Math.min(wEnd, strippedLines.length - 1);

    /* ── Stage 3: SUMMARIZE — wrap omitted regions ───────────────── */
    const windowLines = strippedLines.slice(wStart, wEnd + 1);
    const parts       = [];

    if (wStart > 0) {
      const omitted = strippedLines.slice(0, wStart);
      const fns     = _extractFunctionNames(omitted);
      const label   = fns.length
        ? ': ' + fns.slice(0, 3).join(', ') + (fns.length > 3 ? ', ...' : '')
        : '';
      parts.push('/* [' + wStart + ' linhas omitidas' + label + ' — irrelevantes ao diagnóstico] */');
    }

    parts.push(windowLines.join('\n'));

    if (wEnd < strippedLines.length - 1) {
      const omitted = strippedLines.slice(wEnd + 1);
      const fns     = _extractFunctionNames(omitted);
      const label   = fns.length
        ? ': ' + fns.slice(0, 3).join(', ') + (fns.length > 3 ? ', ...' : '')
        : '';
      parts.push('/* [' + omitted.length + ' linhas omitidas' + label + ' — irrelevantes ao diagnóstico] */');
    }

    const compressed      = parts.join('\n');
    const compressedLines = compressed.split('\n').length;
    const compressionRatio = originalLines > 0
      ? Math.round((1 - compressedLines / originalLines) * 100)
      : 0;

    // Fallback: compression < 10% → return original (not worth the noise)
    if (compressionRatio < 10) {
      return _fallback(fileContent, originalLines, null);
    }

    return {
      compressed,
      original_lines:    originalLines,
      compressed_lines:  compressedLines,
      compression_ratio: compressionRatio,
      window_start:      wStart,
      window_end:        wEnd,
      fallback:          false
    };

  } catch (err) {
    console.warn('[MPEG §44] compressContext error:', err.message, '— fallback to original');
    return _fallback(fileContent, originalLines, err.message);
  }
}

function _fallback(fileContent, originalLines, reason) {
  return {
    compressed:        fileContent,
    original_lines:    originalLines,
    compressed_lines:  originalLines,
    compression_ratio: 0,
    window_start:      0,
    window_end:        originalLines - 1,
    fallback:          true,
    error:             reason || null
  };
}

function _extractFunctionNames(lines) {
  const names = [];
  lines.forEach(function(l) {
    const m = l.match(/(?:function\s+(\w+)|(?:const|var|let)\s+(\w+)\s*=\s*(?:async\s*)?\()/);
    if (m) names.push(m[1] || m[2]);
  });
  return names.filter(Boolean);
}

module.exports = { compressContext };
