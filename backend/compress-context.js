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
    // §44fix: detect LOCAL_REAL_COVERS block boundaries BEFORE strip.
    // Lines inside the block are copied LITERALLY — no trim, no whitespace change.
    // This ensures the LLM sees the exact indentation present in the real file,
    // preventing patch_apply_failed from indentation mismatch.
    const _rawLines = fileContent.split('\n');
    let _pStart = -1, _pEnd = -1, _depth = 0;
    for (let _i = 0; _i < _rawLines.length; _i++) {
      const _l = _rawLines[_i];
      if (_pStart === -1 && /const\s+LOCAL_REAL_COVERS\s*=/.test(_l)) {
        _pStart = _i; _depth = 0;
      }
      if (_pStart !== -1 && _pEnd === -1) {
        for (let _ci = 0; _ci < _l.length; _ci++) {
          const _ch = _l[_ci];
          if (_ch === '[' || _ch === '{') { _depth++; }
          else if (_ch === ']' || _ch === '}') {
            _depth--;
            if (_depth <= 0) { _pEnd = _i; break; }
          }
        }
        // single-line: const X = [...]; on one line
        if (_pEnd === -1 && _i === _pStart && /;\s*$/.test(_l)) { _pEnd = _i; }
      }
    }

    const _stripFn = function(s) {
      return s
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/^\s*console\.(log|warn|error|debug|info)\([\s\S]*?\);\s*$/gm, '')
        .replace(/\n{3,}/g, '\n\n');
    };

    let stripped;
    if (_pStart >= 0 && _pEnd >= 0) {
      // Split: strip before + after, preserve block LITERAL (exact whitespace)
      const _before = _rawLines.slice(0, _pStart).join('\n');
      const _block  = _rawLines.slice(_pStart, _pEnd + 1).join('\n'); // NO strip
      const _after  = _rawLines.slice(_pEnd + 1).join('\n');
      stripped = _stripFn(_before) + '\n' + _block + '\n' + _stripFn(_after);
    } else {
      // No LOCAL_REAL_COVERS found — strip normally
      stripped = _stripFn(fileContent);
    }

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
