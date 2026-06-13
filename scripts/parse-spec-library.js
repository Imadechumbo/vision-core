#!/usr/bin/env node
/**
 * scripts/parse-spec-library.js
 * Parses docs/SF-SPEC-LIBRARY.md → docs/spec-library/*.json
 *
 * Output:
 *   docs/spec-library/SF-01.json … SF-LLM.json  — specs estruturados por módulo
 *   docs/spec-library/_needs-review.json         — specs title-only / irregulares
 *
 * Uma spec é "parsed OK" se tiver ao menos um campo de corpo
 * (pre, input, expected_output, pass_criteria ou fail_criteria).
 * Todo o resto vai para _needs-review — sem adivinhar campos.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname }                          from 'path';
import { fileURLToPath }                           from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const SRC       = join(ROOT, 'docs', 'SF-SPEC-LIBRARY.md');
const OUT_DIR   = join(ROOT, 'docs', 'spec-library');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Converte string em slug kebab-case ASCII. */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[áàãâä]/g, 'a').replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i').replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u').replace(/ç/g, 'c').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parseia "key=val, key=val, …" em objeto.
 * Se nenhum par key=val encontrado, retorna { _raw: string }.
 * Chaves com espaços (ex: "seções") são suportadas via lookahead unicode-friendly.
 */
function parseInput(raw) {
  // split somente antes de "algo=", ignorando vírgulas dentro de valores
  const parts = raw.split(/,\s*(?=\S[^,=]*=)/);
  const obj   = {};
  let   hasKV = false;

  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) { obj[key] = val; hasKV = true; }
  }

  if (!hasKV) return { _raw: raw.trim() };
  return obj;
}

/** Gera tags a partir do objeto input (usa valores, não chaves). */
function tagsFromInput(inputObj) {
  const tags = [];
  for (const v of Object.values(inputObj)) {
    if (v === null || v === undefined) continue;
    const s = slugify(String(v));
    if (s && s !== '-') tags.push(s);
  }
  return [...new Set(tags)];
}

// ── Module name map ───────────────────────────────────────────────────────────

const MODULE_NAMES = {
  'SF-INT': 'Integração cross-módulo',
  'SF-SEC': 'Segurança (security wall)',
  'SF-LLM': 'LLM — qualidade de output',
};

/** Extrai nomes de módulo das linhas "## SF-XX — Nome". */
function extractModuleNames(lines) {
  for (const line of lines) {
    const m = line.match(/^##\s+(SF-\d{2})\s+[—–-]+\s+(.+)$/);
    if (m) MODULE_NAMES[m[1]] = m[2].trim();
  }
}

// ── Type keywords (ordem importa: mais longo primeiro) ───────────────────────

const TYPE_KEYWORDS = ['HAPPY PATH', 'SECURITY CRÍTICO', 'SECURITY', 'EDGE', 'CRÍTICO'];

// ── Header parser ─────────────────────────────────────────────────────────────

/**
 * Parseia linha "### SF-XX-NNN [TYPE —] título"
 * Retorna { id, module_id, type|null, title } ou null se não casar.
 */
function parseHeader(line) {
  // Captura: id completo, código do módulo (01–09 ou INT/SEC/LLM), número, resto
  const m = line.match(/^###\s+(SF-([A-Z0-9]+)-(\d{3}))\s+(.+)$/);
  if (!m) return null;

  const id          = m[1];
  const module_code = m[2];
  let   rest        = m[4].trim();

  // Normaliza ID do módulo
  const module_id = /^\d+$/.test(module_code)
    ? `SF-${module_code.padStart(2, '0')}`
    : `SF-${module_code}`;

  // Detecta keyword de tipo antes do separador "—"
  let type = null;
  for (const kw of TYPE_KEYWORDS) {
    // ex: "HAPPY PATH — título" ou "SECURITY CRÍTICO — título"
    const re = new RegExp(`^${kw}\\s+[—–\\-]+\\s*(.+)$`);
    const hit = rest.match(re);
    if (hit) { type = kw; rest = hit[1].trim(); break; }
  }

  // Remove separador inicial se sem keyword
  if (!type) rest = rest.replace(/^[—–\-]+\s*/, '').trim();

  return { id, module_id, type, title: rest };
}

// ── Body parser ───────────────────────────────────────────────────────────────

/**
 * Extrai campos estruturados do corpo de uma spec.
 * Retorna objeto com pre, input, expected_output, pass_criteria, fail_criteria.
 * Campos ausentes ficam null.
 */
function parseBody(body) {
  const result = {
    pre:             null,
    input:           null,
    expected_output: null,
    pass_criteria:   null,
    fail_criteria:   null,
  };

  // Pré:
  const preM = body.match(/^Pré:\s*(.+)$/m);
  if (preM) result.pre = preM[1].trim();

  // Input:
  const inM = body.match(/^Input:\s*(.+)$/m);
  if (inM) result.input = parseInput(inM[1].trim());

  // Output esperado: com bullets
  const outBullets = body.match(/^Output esperado:\s*\n((?:\s*-\s+.+\n?)+)/m);
  if (outBullets) {
    result.expected_output = outBullets[1]
      .split('\n')
      .map(l => l.replace(/^\s*-\s+/, '').trim())
      .filter(Boolean);
  } else {
    // Output esperado: inline
    const outEspInline = body.match(/^Output esperado:\s+(.+)$/m);
    if (outEspInline) {
      result.expected_output = [outEspInline[1].trim()];
    } else {
      // Output: (sem "esperado")
      const outInline = body.match(/^Output:\s+(.+)$/m);
      if (outInline) result.expected_output = [outInline[1].trim()];
    }
  }

  // PASS:
  const passM = body.match(/^PASS:\s*(.+)$/m);
  if (passM) result.pass_criteria = passM[1].trim();

  // FAIL:
  const failM = body.match(/^FAIL:\s*(.+)$/m);
  if (failM) result.fail_criteria = failM[1].trim();

  return result;
}

/** Retorna true se o resultado do parseBody tem ao menos um campo preenchido. */
function hasMeaningfulContent(parsed) {
  return !!(
    parsed.pre ||
    parsed.input ||
    (parsed.expected_output && parsed.expected_output.length > 0) ||
    parsed.pass_criteria ||
    parsed.fail_criteria
  );
}

// ── Main parse ────────────────────────────────────────────────────────────────

function parse(md) {
  const lines = md.split('\n');
  extractModuleNames(lines);

  const specs       = [];  // parsed OK
  const needsReview = [];  // title-only ou irregular

  let curHeader  = null;
  let bodyLines  = [];

  function flush() {
    if (!curHeader) return;

    const body    = bodyLines.join('\n').trim();
    const { id, module_id, type, title } = curHeader;
    const rawLine = curHeader.raw;

    // Corpo vazio ou só separadores → needs_review
    const cleanBody = body.replace(/^---+$/gm, '').trim();
    if (!cleanBody) {
      needsReview.push({
        id, module_id,
        module_name: MODULE_NAMES[module_id] ?? null,
        type, title, raw: rawLine,
      });
      curHeader = null; bodyLines = [];
      return;
    }

    const parsed = parseBody(cleanBody);

    if (!hasMeaningfulContent(parsed)) {
      needsReview.push({
        id, module_id,
        module_name: MODULE_NAMES[module_id] ?? null,
        type, title, raw: rawLine, body: cleanBody,
      });
      curHeader = null; bodyLines = [];
      return;
    }

    // Gera tags
    const tags = [];
    if (type) tags.push(slugify(type));
    if (parsed.input) tags.push(...tagsFromInput(parsed.input));

    specs.push({
      id,
      module:          module_id,
      module_name:     MODULE_NAMES[module_id] ?? null,
      type:            type ?? null,
      title,
      pre:             parsed.pre,
      input:           parsed.input,
      expected_output: parsed.expected_output,
      pass_criteria:   parsed.pass_criteria,
      fail_criteria:   parsed.fail_criteria,
      tags:            [...new Set(tags)].filter(Boolean),
    });

    curHeader = null; bodyLines = [];
  }

  for (const line of lines) {
    if (line.startsWith('### SF-')) {
      flush();
      const hdr = parseHeader(line);
      if (hdr) curHeader = { ...hdr, raw: line };
    } else if (curHeader) {
      // Fim de seção encerra spec atual
      if (line.startsWith('## ') || line.startsWith('# ')) {
        flush();
      } else {
        bodyLines.push(line);
      }
    }
  }
  flush(); // última spec

  return { specs, needsReview };
}

// ── Write output ──────────────────────────────────────────────────────────────

function writeOutput(specs, needsReview) {
  mkdirSync(OUT_DIR, { recursive: true });

  // Agrupa por módulo
  const specsByMod = {};
  const nrByMod    = {};

  for (const s of specs)      (specsByMod[s.module]    ??= []).push(s);
  for (const s of needsReview)(nrByMod[s.module_id]    ??= []).push(s);

  const allMods = [...new Set([...Object.keys(specsByMod), ...Object.keys(nrByMod)])].sort();

  for (const mod of allMods) {
    const parsed = specsByMod[mod] ?? [];
    const nr     = nrByMod[mod]    ?? [];
    const out = {
      module:              mod,
      module_name:         MODULE_NAMES[mod] ?? null,
      parsed_count:        parsed.length,
      needs_review_count:  nr.length,
      specs:               parsed,
    };
    writeFileSync(join(OUT_DIR, `${mod}.json`), JSON.stringify(out, null, 2), 'utf8');
  }

  // _needs-review.json (todos os módulos juntos)
  writeFileSync(
    join(OUT_DIR, '_needs-review.json'),
    JSON.stringify({
      total:  needsReview.length,
      ids:    needsReview.map(s => s.id),
      specs:  needsReview,
    }, null, 2),
    'utf8',
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────

function printSummary(specs, needsReview) {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  SF-SPEC-LIBRARY parse result        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n  Parsed OK:      ${specs.length}`);
  console.log(`  Needs review:   ${needsReview.length}`);
  console.log(`  Total:          ${specs.length + needsReview.length}`);
  console.log(`  Output dir:     ${OUT_DIR}\n`);

  if (specs.length > 0) {
    console.log('── Parsed OK ─────────────────────────────');
    for (const s of specs) {
      const type = s.type ? ` [${s.type}]` : '';
      console.log(`  ✅  ${s.id}${type} — ${s.title}`);
    }
  }

  console.log(`\n── Needs review (${needsReview.length}) ────────────────────────`);
  // Agrupa por módulo para melhor leitura
  const nrByMod = {};
  for (const s of needsReview) (nrByMod[s.module_id] ??= []).push(s.id);
  for (const [mod, ids] of Object.entries(nrByMod).sort()) {
    console.log(`  ${mod}: ${ids.join(', ')}`);
  }
  console.log('');
}

// ── Run ───────────────────────────────────────────────────────────────────────

const md = readFileSync(SRC, 'utf8');
const { specs, needsReview } = parse(md);
writeOutput(specs, needsReview);
printSummary(specs, needsReview);
