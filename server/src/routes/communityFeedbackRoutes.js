'use strict';

const express  = require('express');
const feedback = require('../services/communityFeedback');

const router = express.Router();

// POST /api/community/feedback
router.post('/feedback', (req, res) => {
  try {
    const result = feedback.submitFeedback(req.body);
    res.status(result.ok ? 201 : 422).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/community/feedback
router.get('/feedback', (req, res) => {
  try {
    const list = feedback.listFeedback({
      status:   req.query.status,
      category: req.query.category,
      limit:    req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json({ ok: true, feedback: list, total: list.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/community/feedback/:id/triage
router.post('/feedback/:id/triage', (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ ok: false, error: 'status obrigatório' });
    const result = feedback.triageFeedback(req.params.id, status, notes);
    res.status(result.ok ? 200 : 404).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/community/feedback/:id/benchmark
router.post('/feedback/:id/benchmark', (req, res) => {
  try {
    const result = feedback.convertToBenchmark(req.params.id);
    res.status(result.ok ? 200 : 404).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/community/feedback/:id/solved
router.post('/feedback/:id/solved', (req, res) => {
  try {
    const passGoldResult = req.body?.passGoldResult || req.body;
    if (!passGoldResult?.pass_gold) {
      return res.status(403).json({
        ok: false,
        error: 'PASS GOLD obrigatório para promoção. pass_gold deve ser true.',
      });
    }
    const result = feedback.promoteToSolved(req.params.id, passGoldResult);
    res.status(result.ok ? 200 : 404).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/community/benchmarks/public
router.get('/benchmarks/public', (req, res) => {
  try {
    const benches = feedback.exportPublicBenchmarks();
    res.json({ ok: true, benchmarks: benches, total: benches.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
