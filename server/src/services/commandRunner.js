'use strict';

/**
 * VISION CORE v1.1 — Command Runner
 *
 * Executa comandos locais (npm test, node --check, etc.) com:
 *   - Lista de comandos permitidos (allowlist)
 *   - Path traversal guard no cwd
 *   - Timeout configurável
 *   - Output capturado linha a linha (streaming real)
 *   - Nunca executa shell=true
 *
 * BLOQUEADO POR PADRÃO: rm, del, format, shutdown, git push, curl, wget
 * e qualquer coisa com ; | & || && > >> para evitar injection.
 */

const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');

// ── Allowlist de comandos permitidos ─────────────────────────────────────
const ALLOWED_COMMANDS = new Set([
  'node', 'npm', 'npx',
  'git',                   // git add, commit — NÃO push (bloqueado abaixo)
  'tsc',                   // TypeScript compiler
  'jest', 'vitest', 'mocha', 'tap',
  'eslint', 'prettier',
  'ls', 'dir',             // listagem (read-only)
  'cat', 'type',           // leitura (read-only)
]);

// ── Subcomandos bloqueados mesmo em comandos permitidos ───────────────────
const BLOCKED_SUBCOMMANDS = new Set([
  'push',           // git push (só o server/PR engine pode fazer isso)
  'publish',        // npm publish
  'run-script',     // npm run-script (usar npm test diretamente)
  'install',        // npm install (pode alterar node_modules)
  'uninstall',
  'link',
  'exec',           // npx exec
]);

// ── Padrões de injection bloqueados na string do comando ─────────────────
const INJECTION_PATTERNS = [
  /[;&|><`$\\]/,           // shell metachar
  /\.\.\//,                // path traversal
  /\bsudo\b/i,
  /\brm\s+-rf/i,
  /\bdel\s+\/[sf]/i,
  /\bformat\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bpowershell\b/i,
  /\bcmd\.exe\b/i,
];

// ── Validar comando antes de executar ─────────────────────────────────────
function validateCommand(cmd, args, cwd) {
  // 1. Comando na allowlist
  const baseName = path.basename(cmd).replace(/\.exe$/i, '').toLowerCase();
  if (!ALLOWED_COMMANDS.has(baseName)) {
    return { ok: false, reason: `Comando não permitido: "${cmd}". Allowlist: ${[...ALLOWED_COMMANDS].join(', ')}` };
  }

  // 2. Subcomando bloqueado
  const sub = args[0]?.toLowerCase();
  if (sub && BLOCKED_SUBCOMMANDS.has(sub)) {
    return { ok: false, reason: `Subcomando bloqueado: "${cmd} ${sub}"` };
  }

  // 3. Injection em args
  const fullCmd = [cmd, ...args].join(' ');
  for (const p of INJECTION_PATTERNS) {
    if (p.test(fullCmd)) {
      return { ok: false, reason: `Padrão suspeito bloqueado: "${fullCmd.slice(0, 60)}"` };
    }
  }

  // 4. cwd deve existir e ser diretório
  if (cwd && !fs.existsSync(cwd)) {
    return { ok: false, reason: `cwd não existe: ${cwd}` };
  }

  return { ok: true };
}

// ── Executar comando com streaming de output ──────────────────────────────
function runCommand(cmd, args = [], options = {}) {
  const {
    cwd = process.cwd(),
    timeoutMs = Number(process.env.CMD_TIMEOUT_MS || 30000),
    onLine,        // callback(line, stream) para cada linha de output
    env,
  } = options;

  return new Promise((resolve) => {
    const validation = validateCommand(cmd, args, cwd);
    if (!validation.ok) {
      const err = `[CMD BLOCKED] ${validation.reason}`;
      console.warn(err);
      onLine?.(err, 'stderr');
      return resolve({ ok: false, code: null, stdout: '', stderr: err, blocked: true });
    }

    console.log(`[CMD] ${cmd} ${args.join(' ')} (cwd=${path.basename(cwd)})`);

    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'pipe',
      shell: false,   // NUNCA shell=true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      for (const line of text.split('\n').filter(Boolean)) {
        onLine?.(line, 'stdout');
      }
    });

    child.stderr.on('data', chunk => {
      const text = chunk.toString();
      stderr += text;
      for (const line of text.split('\n').filter(Boolean)) {
        onLine?.(line, 'stderr');
      }
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      const msg = `[CMD TIMEOUT] ${cmd} encerrado após ${timeoutMs}ms`;
      console.warn(msg);
      onLine?.(msg, 'stderr');
      resolve({ ok: false, code: null, stdout, stderr: stderr + '\n' + msg, timedOut: true });
    }, timeoutMs);

    child.on('error', err => {
      clearTimeout(timer);
      const msg = `[CMD ERROR] ${err.message}`;
      onLine?.(msg, 'stderr');
      resolve({ ok: false, code: null, stdout, stderr: stderr + '\n' + msg });
    });

    child.on('close', code => {
      clearTimeout(timer);
      const ok = code === 0;
      console.log(`[CMD] exit ${code} — ${cmd} ${args[0] || ''}`);
      resolve({ ok, code, stdout, stderr });
    });
  });
}

// ── Helpers de alto nível ─────────────────────────────────────────────────

// Verificar sintaxe Node.js
function checkSyntax(filePath, onLine) {
  const dir  = path.dirname(filePath);
  const file = path.basename(filePath);
  return runCommand('node', ['--check', file], { cwd: dir, timeoutMs: 10000, onLine });
}

// Rodar testes npm
function runTests(projectPath, onLine) {
  return runCommand('npm', ['test', '--silent'], {
    cwd: projectPath,
    timeoutMs: Number(process.env.TEST_TIMEOUT_MS || 60000),
    onLine,
  });
}

// Rodar lint ESLint
function runLint(projectPath, onLine) {
  return runCommand('npx', ['eslint', '.', '--max-warnings=0'], {
    cwd: projectPath,
    timeoutMs: 30000,
    onLine,
  });
}


// Healthcheck HTTP/HTTPS sem shell. PASS GOLD exige resposta 2xx/3xx quando health_url existe.
async function runHealthCheck(healthUrl, onLine) {
  if (!healthUrl) return { ok: false, configured: false, error: 'health_url ausente' };
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.HEALTH_TIMEOUT_MS || 10000));
    const res = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text().catch(() => '');
    const ok = res.status >= 200 && res.status < 400;
    onLine?.(`[HEALTH] ${res.status} ${healthUrl}`, ok ? 'stdout' : 'stderr');
    return { ok, configured: true, status: res.status, elapsed_ms: Date.now() - started, body: text.slice(0, 500) };
  } catch (e) {
    onLine?.(`[HEALTH] falhou: ${e.message}`, 'stderr');
    return { ok: false, configured: true, error: e.message, elapsed_ms: Date.now() - started };
  }
}

// Git status (verificar mudanças antes de commit)
function gitStatus(repoPath, onLine) {
  return runCommand('git', ['status', '--porcelain'], { cwd: repoPath, timeoutMs: 5000, onLine });
}

// Git add + commit (sem push — push só pelo githubService)
function gitCommit(repoPath, message, onLine) {
  return runCommand('git', ['add', '.'], { cwd: repoPath, timeoutMs: 5000, onLine })
    .then(r => {
      if (!r.ok) return r;
      return runCommand('git', ['commit', '-m', message.slice(0, 120)], {
        cwd: repoPath, timeoutMs: 10000, onLine,
      });
    });
}

module.exports = {
  runCommand, validateCommand,
  checkSyntax, runTests, runLint,
  gitStatus, gitCommit, runHealthCheck,
  ALLOWED_COMMANDS, BLOCKED_SUBCOMMANDS,
};
