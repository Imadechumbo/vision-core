'use strict';

const path = require('path');
const fs   = require('fs');

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.error('[DB] better-sqlite3 não instalado. Execute: npm install');
  process.exit(1);
}

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../../.vault/vision_core.db');
const SCHEMA  = path.resolve(__dirname, 'schema.sql');

// Garantir diretório
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, { verbose: process.env.DB_VERBOSE === 'true' ? console.log : undefined });

// WAL mode + foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Migrar schema ────────────────────────────────────────────────────────
function migrate() {
  const sql = fs.readFileSync(SCHEMA, 'utf-8');
  db.exec(sql);
  console.log('[DB] Schema migrado com sucesso.');
}

// Migrar automaticamente antes dos prepared statements.
migrate();

// ── Helpers ───────────────────────────────────────────────────────────────
const helpers = {
  // Projects
  getProject: db.prepare('SELECT * FROM projects WHERE id = ?'),
  listProjects: db.prepare('SELECT * FROM projects ORDER BY created_at DESC'),
  upsertProject: db.prepare(`
    INSERT INTO projects (id, name, stack, path, health_url, adapter, config, updated_at)
    VALUES (@id, @name, @stack, @path, @health_url, @adapter, @config, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, stack = excluded.stack, path = excluded.path,
      health_url = excluded.health_url, adapter = excluded.adapter,
      config = excluded.config, updated_at = datetime('now')
  `),
  deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),

  // Missions
  getMission: db.prepare('SELECT * FROM missions WHERE id = ?'),
  listMissions: db.prepare('SELECT * FROM missions ORDER BY created_at DESC LIMIT ?'),
  listMissionsByProject: db.prepare('SELECT * FROM missions WHERE project_id = ? ORDER BY created_at DESC LIMIT 50'),
  insertMission: db.prepare(`
    INSERT INTO missions (id, project_id, status, error_input, created_at, updated_at)
    VALUES (@id, @project_id, @status, @error_input, datetime('now'), datetime('now'))
  `),
  updateMission: db.prepare(`
    UPDATE missions SET
      status = @status, rca_cause = @rca_cause, rca_fix = @rca_fix,
      rca_confidence = @rca_confidence, rca_risk = @rca_risk, rca_source = @rca_source,
      patches_count = @patches_count, pass_gold = @pass_gold, gold_score = @gold_score,
      gold_level = @gold_level, pr_branch = @pr_branch, pr_url = @pr_url,
      duration_ms = @duration_ms, log_source = @log_source, narrative = @narrative,
      updated_at = datetime('now')
    WHERE id = @id
  `),

  // Steps
  insertStep: db.prepare(`
    INSERT INTO mission_steps (mission_id, step, status, detail, elapsed_ms)
    VALUES (@mission_id, @step, @status, @detail, @elapsed_ms)
  `),
  updateStep: db.prepare(`
    UPDATE mission_steps SET status = @status, detail = @detail, elapsed_ms = @elapsed_ms
    WHERE id = @id
  `),
  getSteps: db.prepare('SELECT * FROM mission_steps WHERE mission_id = ? ORDER BY id'),

  // Patches
  insertPatch: db.prepare(`
    INSERT INTO patches (mission_id, file, find_text, replace_text, description, order_idx, applied)
    VALUES (@mission_id, @file, @find_text, @replace_text, @description, @order_idx, @applied)
  `),
  getPatches: db.prepare('SELECT * FROM patches WHERE mission_id = ? ORDER BY order_idx'),

  // Snapshots
  insertSnapshot: db.prepare(`
    INSERT INTO snapshots (id, mission_id, project_id, file_path, content, hash)
    VALUES (@id, @mission_id, @project_id, @file_path, @content, @hash)
  `),
  getSnapshot: db.prepare('SELECT * FROM snapshots WHERE id = ?'),
  getSnapshotsByMission: db.prepare('SELECT * FROM snapshots WHERE mission_id = ?'),
  getSnapshotsByProject: db.prepare('SELECT * FROM snapshots WHERE project_id = ? ORDER BY created_at DESC LIMIT 20'),
  markRolledBack: db.prepare('UPDATE snapshots SET rolled_back = 1 WHERE mission_id = ?'),
  markPatchApplied: db.prepare('UPDATE patches SET applied = 1 WHERE rowid = ?'),

  // PASS GOLD
  insertGold: db.prepare(`
    INSERT INTO pass_gold_evaluations
      (id, mission_id, final_score, level, llm_confidence, data_quality, patch_specificity,
       risk_level, memory_score, build_passed, tests_passed, lint_passed,
       snapshot_exists, rollback_ready, verdict)
    VALUES
      (@id, @mission_id, @final_score, @level, @llm_confidence, @data_quality, @patch_specificity,
       @risk_level, @memory_score, @build_passed, @tests_passed, @lint_passed,
       @snapshot_exists, @rollback_ready, @verdict)
  `),
  getGold: db.prepare('SELECT * FROM pass_gold_evaluations WHERE mission_id = ?'),

  // Workers
  insertWorker: db.prepare(`
    INSERT INTO worker_queue (id, project_id, type, payload, status)
    VALUES (@id, @project_id, @type, @payload, 'queued')
  `),
  getNextWorker: db.prepare("SELECT * FROM worker_queue WHERE status = 'queued' ORDER BY created_at LIMIT 1"),
  updateWorkerStatus: db.prepare(`
    UPDATE worker_queue SET status = @status, result = @result,
    started_at = CASE WHEN @status = 'running' THEN datetime('now') ELSE started_at END,
    done_at = CASE WHEN @status IN ('done','failed') THEN datetime('now') ELSE done_at END
    WHERE id = @id
  `),
  listWorkers: db.prepare('SELECT * FROM worker_queue ORDER BY created_at DESC LIMIT 30'),

  // Hermes Memory
  insertMemory: db.prepare(`
    INSERT INTO hermes_memory (id, project_id, error_snippet, cause, fix, patch_applied, validation_passed, confidence)
    VALUES (@id, @project_id, @error_snippet, @cause, @fix, @patch_applied, @validation_passed, @confidence)
  `),
  listMemory: db.prepare('SELECT * FROM hermes_memory ORDER BY created_at DESC LIMIT 100'),
  searchMemory: db.prepare("SELECT * FROM hermes_memory WHERE validation_passed = 1 ORDER BY created_at DESC LIMIT 50"),
};

// ── Transaction helper ────────────────────────────────────────────────────
function transaction(fn) {
  return db.transaction(fn);
}

module.exports = { db, migrate, helpers, transaction };
