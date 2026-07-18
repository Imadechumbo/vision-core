// Uso: node tools/export-hermes-dataset.mjs [outPath] [sourceFilter]
// sourceFilter opcional: 'hermes-analyze' (RCA de missão) ou 'modo-total-rca' (RCA do ciclo modo-total).
// Sem sourceFilter, exporta as duas categorias juntas (comportamento default, inalterado).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { HERMES_DATASET_SCHEMA_VERSION, completeHermesExamples } = require('../backend/hermes-dataset.js');

const root = process.cwd();
const outPath = process.argv[2] || path.join(root, 'artifacts', 'hermes-dataset-candidate.jsonl');
const sourceFilter = process.argv[3] || null;
const reportPath = outPath.replace(/\.jsonl$/i, '.report.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function timelineRows() {
  const file = path.join(root, 'backend', 'data', 'mission-timeline.json');
  const entries = readJson(file, { entries: [] }).entries || [];
  const examples = completeHermesExamples(entries);
  const bySource = examples.reduce((acc, ex) => {
    acc[ex.source] = (acc[ex.source] || 0) + 1;
    return acc;
  }, {});
  const filtered = sourceFilter ? examples.filter((ex) => ex.source === sourceFilter) : examples;
  return {
    scanned: entries.length,
    by_source: bySource,
    rows: filtered.map((example) => ({
      schema_version: HERMES_DATASET_SCHEMA_VERSION,
      source: example.source,
      source_id: example.id,
      timestamp: example.timestamp,
      mission_id: example.mission_id,
      provider: example.provider,
      model: example.model,
      input: example.input,
      context: example.context || {},
      decision: example.decision,
      outcome: example.outcome
    }))
  };
}

function snapshotCount() {
  const dir = path.join(root, '.vision-snapshots');
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).length;
}

const timeline = timelineRows();
const rows = timeline.rows;

writeJsonl(outPath, rows);
fs.writeFileSync(reportPath, JSON.stringify({
  schema_version: HERMES_DATASET_SCHEMA_VERSION,
  generated_at: new Date().toISOString(),
  output: path.relative(root, outPath),
  source_filter: sourceFilter,
  scanned: {
    mission_timeline_entries: timeline.scanned,
    vision_snapshots: snapshotCount(),
    by_source: timeline.by_source
  },
  usable_examples: rows.length,
  rule: 'Exports only explicit hermes_dataset records with input + decision + real success/failure outcome. Pending outcomes and raw snapshots are intentionally excluded.',
  minimum_reasonable_volume: 'dozens for a narrow evaluator; hundreds for Hermes RCA',
  note: 'No training API is called. This script only transforms local data.'
}, null, 2) + '\n', 'utf8');

console.log(`Hermes dataset export: ${rows.length}/${timeline.scanned} usable timeline examples${sourceFilter ? ` (source=${sourceFilter})` : ''}`);
console.log(`JSONL: ${outPath}`);
console.log(`Report: ${reportPath}`);
