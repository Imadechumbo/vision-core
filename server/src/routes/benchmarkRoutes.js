'use strict';

const express  = require('express');
const engine   = require('../services/benchmarkEngine');
const reporter = require('../services/benchmarkReporter');

const router = express.Router();

// GET /api/benchmarks — listar benchmark cases
router.get('/', (req, res) => {
  try {
    const benches = engine.loadBenchmarks();
    res.json({ ok: true, benchmarks: benches, total: benches.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/benchmarks/run/:caseId — rodar um caso de benchmark
router.post('/run/:caseId', async (req, res) => {
  try {
    const { projectId, safePatch } = req.body || {};
    const result = await engine.runBenchmarkCase(req.params.caseId, {
      projectId: projectId || process.env.BENCHMARK_PROJECT_ID,
      safePatch:  !!safePatch,
    });
    res.status(result.ok ? 200 : 404).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/benchmarks/run-suite — rodar suite completa
router.post('/run-suite', async (req, res) => {
  try {
    const { projectId, categories, safePatch } = req.body || {};
    const result = await engine.runBenchmarkSuite({
      projectId: projectId || process.env.BENCHMARK_PROJECT_ID,
      categories,
      safePatch: !!safePatch,
    });
    res.status(result.ok ? 200 : 500).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/benchmarks/runs — listar runs recentes
router.get('/runs', (req, res) => {
  try {
    let runs = engine.loadRuns();
    if (req.query.caseId) runs = runs.filter(r => r.caseId === req.query.caseId);
    if (req.query.limit)  runs = runs.slice(0, Number(req.query.limit));
    res.json({ ok: true, runs, total: runs.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/benchmarks/leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const runs = engine.loadRuns();
    const lb   = reporter.generateLeaderboard(runs);
    res.json({ ok: true, leaderboard: lb });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/benchmarks/report/public
router.get('/report/public', (req, res) => {
  try {
    const runs   = engine.loadRuns();
    const format = req.query.format;
    if (format === 'markdown') {
      res.set('Content-Type', 'text/markdown');
      return res.send(reporter.generateMarkdownReport(runs));
    }
    const report = reporter.generatePublicBenchmarkReport(runs);
    res.json(report);
  } catch (e) {
    // Nunca vazar secrets — erro genérico
    console.error('[BENCHMARK REPORT] Erro:', e.message);
    res.status(500).json({ ok: false, error: 'Erro ao gerar relatório público' });
  }
});

module.exports = router;
