#!/usr/bin/env node
'use strict';

/**
 * VISION AGENT v0.1 — CLI Entry Point
 *
 * Uso:
 *   vision-agent login [--token <tok>] [--server <url>]
 *   vision-agent register <path> [--id <id>] [--name <n>] [--adapter <a>]
 *   vision-agent run <project-id> "<problema>" [--mode dry-run|safe-patch|pr]
 *   vision-agent status
 *   vision-agent missions [project-id]
 *   vision-agent rollback <mission-id>
 *   vision-agent help
 */

const { login }             = require('./commands/login');
const { register }          = require('./commands/register');
const { run }               = require('./commands/run');
const { status, rollback, missions } = require('./commands/status');

const args    = process.argv.slice(2);
const command = args[0];
const rest    = args.slice(1);

const ANSI = { purple: '\x1b[35m', cyan: '\x1b[36m', gray: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m' };
const c = (col, t) => `${ANSI[col] || ''}${t}${ANSI.reset}`;

function showHelp() {
  console.log('');
  console.log(c('purple', '═'.repeat(56)));
  console.log(c('purple', ' ') + c('bold', 'VISION AGENT v0.1'));
  console.log(c('gray', '  Executor local do VISION CORE'));
  console.log(c('purple', '═'.repeat(56)));
  console.log('');
  console.log(c('bold', '  Comandos:'));
  console.log('');
  console.log(`  ${c('cyan', 'vision-agent login')} [--token <tok>] [--server <url>]`);
  console.log(c('gray', '    Conecta ao Vision Core Server e salva credenciais'));
  console.log('');
  console.log(`  ${c('cyan', 'vision-agent register')} <path> [--id <id>] [--name <n>]`);
  console.log(c('gray', '    Registra um projeto local no Vision Core Server'));
  console.log('');
  console.log(`  ${c('cyan', 'vision-agent run')} <project-id> "<problema>" [--mode <modo>]`);
  console.log(c('gray', '    Executa uma missão de correção no projeto'));
  console.log(c('gray', '    Modos: dry-run | safe-patch (padrão) | pr'));
  console.log('');
  console.log(`  ${c('cyan', 'vision-agent status')}`);
  console.log(c('gray', '    Mostra estado do server e projetos registrados'));
  console.log('');
  console.log(`  ${c('cyan', 'vision-agent missions')} [project-id]`);
  console.log(c('gray', '    Lista missões executadas'));
  console.log('');
  console.log(`  ${c('cyan', 'vision-agent rollback')} <mission-id>`);
  console.log(c('gray', '    Reverte arquivos ao estado antes da missão'));
  console.log('');
  console.log(c('bold', '  Fluxo recomendado:'));
  console.log('');
  console.log(`  1. ${c('cyan', 'vision-agent login')}`);
  console.log(`  2. ${c('cyan', 'vision-agent register')} C:/projetos/meu-app`);
  console.log(`  3. ${c('cyan', 'vision-agent run')} meu-app "corrigir erro de porta"  --mode dry-run`);
  console.log(`  4. ${c('cyan', 'vision-agent run')} meu-app "corrigir erro de porta"  --mode safe-patch`);
  console.log('');
  console.log(c('gray', '  REGRA: nunca executa patch sem snapshot. Rollback sempre disponível.'));
  console.log('');
}

// ── Dispatcher ────────────────────────────────────────────────────────────
async function main() {
  switch (command) {
    case 'login':
      await login(rest);
      break;

    case 'register':
      await register(rest);
      break;

    case 'run':
      await run(rest);
      break;

    case 'status':
    case 'st':
      await status(rest);
      break;

    case 'missions':
    case 'ms':
      await missions(rest);
      break;

    case 'rollback':
    case 'rb':
      await rollback(rest);
      break;

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      showHelp();
      break;

    default:
      console.error(`\n  Comando desconhecido: ${command}`);
      console.error('  Use "vision-agent help" para ver os comandos disponíveis.\n');
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`\n  [FATAL] ${err.message}\n`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
