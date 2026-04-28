'use strict';

function includesAny(text, list) { return list.some(v => text.includes(v)); }
function unique(arr) { return Array.from(new Set(arr.filter(Boolean))); }

function orchestrate(input, context = {}) {
  const raw = String(input || '');
  const t = raw.toLowerCase();
  let category = 'general_runtime';
  let intent = 'diagnose_and_validate';
  const signals = [];
  const targetHints = [];
  const agents = ['OpenClaw', 'Scanner', 'Hermes', 'PatchEngine', 'Aegis', 'SDDF', 'PASS GOLD'];

  if (includesAny(t, ['cors', 'access-control', 'preflight', 'origin'])) {
    category = 'api_contract'; intent = 'fix_cors';
    signals.push('cors', 'preflight', 'origin', 'headers');
    targetHints.push('src/middleware/security.js', 'src/app.js', 'src/routes/api.js', 'server.js');
  }
  if (includesAny(t, ['405', 'method not allowed', '404', 'not found', 'endpoint'])) {
    category = 'api_contract'; intent = 'fix_route_contract';
    signals.push('route_contract', 'alias', 'method_matrix');
    targetHints.push('src/routes/api.js', 'src/app.js', 'index.html');
  }
  if (includesAny(t, ['sse', 'stream', 'eventsource', 'timeline', 'missão vivo', 'pipeline vivo'])) {
    category = 'realtime_pipeline'; intent = 'fix_sse_pipeline';
    signals.push('sse', 'timeline_live', 'event_stream');
    targetHints.push('src/routes/api.js', 'src/services/missionRunner.js', 'assets/v273-sddf-command-chat.js');
  }
  if (includesAny(t, ['mobile', 'responsivo', 'overflow', 'imagem cortada', 'cortada', 'layout'])) {
    category = 'frontend_layout'; intent = 'fix_mobile_layout';
    signals.push('mobile', 'responsive_css', 'overflow_guard');
    targetHints.push('assets/style.css', 'assets/v272-layout-force.css', 'index.html');
  }
  if (includesAny(t, ['github', 'pr', 'pull request', 'merge'])) {
    category = 'integration'; intent = 'github_pr_after_pass_gold';
    signals.push('github_pr', 'pass_gold_required', 'merge_block');
    targetHints.push('src/services/githubPr.js', 'src/routes/api.js');
  }
  if (includesAny(t, ['elastic beanstalk', 'beanstalk', 'eb', 'package.json', 'procfile'])) {
    category = 'deployment'; intent = 'fix_eb_bundle';
    signals.push('eb_bundle', 'package_json_root', 'procfile');
    targetHints.push('package.json', 'Procfile', 'server.js');
  }

  return {
    ok: true,
    input: raw,
    project_id: context.project_id || context.project || 'technetgame',
    mode: context.mode || 'live',
    intent,
    category,
    signals: unique(signals.length ? signals : ['runtime_check', 'pass_gold_gate']),
    targetHints: unique(targetHints.length ? targetHints : ['src/routes/api.js', 'src/app.js', 'server.js']),
    agents,
    safeMode: true,
    rules: ['scanner_before_hermes', 'no_promotion_without_pass_gold', 'memory_only_after_gold', 'no_pr_without_gold', 'rollback_on_fail']
  };
}

module.exports = { orchestrate };
