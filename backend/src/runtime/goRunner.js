'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function resolveGoBinary() {
  const root = process.cwd();
  const candidates = [
    process.env.VISION_GO_CORE_BIN,
    path.join(root, '..', 'bin', process.platform === 'win32' ? 'vision-core.exe' : 'vision-core'),
    path.join(root, 'bin', process.platform === 'win32' ? 'vision-core.exe' : 'vision-core'),
    path.join(root, '..', 'go-core', 'bin', process.platform === 'win32' ? 'vision-core.exe' : 'vision-core'),
    path.join(root, '..', 'go-core', 'vision-core.exe'),
    path.join(root, '..', 'go-core', 'vision-core'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (_) {
      // ignore invalid env path
    }
  }

  return candidates[0] || 'vision-core.exe';
}

function normalizeGoResult(parsed, stdout, stderr, bin) {
  return {
    ok: Boolean(parsed.ok),
    status: parsed.status || (parsed.pass_gold ? 'GOLD' : 'FAIL'),
    pass_gold: Boolean(parsed.pass_gold),
    promotion_allowed: Boolean(parsed.promotion_allowed),
    mission_id: parsed.mission_id || null,
    engine: parsed.engine || 'go-safe-core',
    version: parsed.version || null,
    rollback_ready: Boolean(parsed.rollback_ready),
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    step_results: Array.isArray(parsed.step_results) ? parsed.step_results : [],
    gates: parsed.gates || {},
    duration_ms: Number(parsed.duration_ms || 0),
    summary: parsed.summary || '',
    go_binary: bin,
    stdout_chars: stdout.length,
    stderr: stderr.trim() || undefined,
  };
}

async function runGoMission({ root, input } = {}) {
  const missionRoot = path.resolve(root || process.cwd());
  const missionInput = String(input || 'self-test');
  const bin = resolveGoBinary();
  const startedAt = Date.now();

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve({ duration_ms: Date.now() - startedAt, ...payload });
    };

    let child;
    try {
      child = spawn(bin, ['mission', '--root', missionRoot, '--input', missionInput], {
        cwd: missionRoot,
        windowsHide: true,
        shell: false,
      });
    } catch (error) {
      return finish({
        ok: false,
        status: 'FAIL',
        pass_gold: false,
        promotion_allowed: false,
        error_type: 'go_runtime_failure',
        error: error.message,
        go_binary: bin,
      });
    }

    const timeout = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      finish({
        ok: false,
        status: 'FAIL',
        pass_gold: false,
        promotion_allowed: false,
        error_type: 'go_runtime_failure',
        error: 'go core timeout',
        go_binary: bin,
        stdout,
        stderr,
      });
    }, Number(process.env.VISION_GO_CORE_TIMEOUT_MS || 30000));

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });

    child.on('error', (error) => {
      clearTimeout(timeout);
      finish({
        ok: false,
        status: 'FAIL',
        pass_gold: false,
        promotion_allowed: false,
        error_type: 'go_runtime_failure',
        error: error.message,
        go_binary: bin,
        stdout,
        stderr,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        return finish({
          ok: false,
          status: 'FAIL',
          pass_gold: false,
          promotion_allowed: false,
          error_type: 'go_runtime_failure',
          error: `go core exited with code ${code}`,
          exit_code: code,
          go_binary: bin,
          stdout,
          stderr,
        });
      }

      try {
        const first = stdout.indexOf('{');
        const last = stdout.lastIndexOf('}');
        const jsonText = first >= 0 && last >= first ? stdout.slice(first, last + 1) : stdout;
        const parsed = JSON.parse(jsonText);
        return finish(normalizeGoResult(parsed, stdout, stderr, bin));
      } catch (error) {
        return finish({
          ok: false,
          status: 'FAIL',
          pass_gold: false,
          promotion_allowed: false,
          error_type: 'go_runtime_failure',
          error: `invalid go core JSON: ${error.message}`,
          go_binary: bin,
          stdout,
          stderr,
        });
      }
    });
  });
}

module.exports = { runGoMission, resolveGoBinary };
