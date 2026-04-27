'use strict';

/**
 * VISION AGENT — Terminal UI
 * Output formatado sem chalk/ora/inquirer — só ANSI puro.
 */

const ANSI = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  purple: '\x1b[35m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
  bgGreen: '\x1b[42m',
  bgRed:   '\x1b[41m',
  bgYellow:'\x1b[43m',
};

function c(color, text) {
  return `${ANSI[color] || ''}${text}${ANSI.reset}`;
}

function bold(text)   { return `${ANSI.bold}${text}${ANSI.reset}`; }
function dim(text)    { return `${ANSI.dim}${text}${ANSI.reset}`; }

const ui = {
  // ── Linha divisória ─────────────────────────────────────────────────────
  divider(char = '─', len = 56) {
    console.log(c('gray', char.repeat(len)));
  },

  header(title) {
    console.log('');
    console.log(c('purple', '═'.repeat(56)));
    console.log(c('purple', ' ') + bold(c('white', title)));
    console.log(c('purple', '═'.repeat(56)));
  },

  // ── Status icons ────────────────────────────────────────────────────────
  ok(msg)      { console.log(`  ${c('green', '✔')} ${msg}`); },
  fail(msg)    { console.log(`  ${c('red', '✗')} ${msg}`); },
  warn(msg)    { console.log(`  ${c('yellow', '⚠')} ${msg}`); },
  info(msg)    { console.log(`  ${c('cyan', '▸')} ${msg}`); },
  step(msg)    { console.log(`  ${c('purple', '◎')} ${bold(msg)}`); },
  detail(msg)  { console.log(`    ${dim(msg)}`); },

  // ── Spinner simples (sem animação, para ambientes sem TTY) ────────────
  working(msg) { process.stdout.write(`  ${c('yellow', '⟳')} ${msg}...`); },
  done(msg)    { process.stdout.write(` ${c('green', msg || 'OK')}\n`); },

  // ── Timeline de missão ──────────────────────────────────────────────────
  timeline(steps) {
    if (!steps || !steps.length) return;
    console.log('');
    console.log(bold('  Timeline:'));
    for (const s of steps) {
      const icon = s.status === 'ok'   ? c('green', '✔')
                 : s.status === 'fail' ? c('red', '✗')
                 : s.status === 'running' ? c('yellow', '⟳')
                 : c('gray', '○');
      const elapsed = s.elapsed_ms ? dim(`  +${s.elapsed_ms}ms`) : '';
      console.log(`    ${icon} ${s.step}${elapsed}`);
      if (s.detail) console.log(`       ${dim(s.detail.slice(0, 80))}`);
    }
  },

  // ── PASS GOLD badge ─────────────────────────────────────────────────────
  passGold(gold) {
    if (!gold) return;
    console.log('');

    if (gold.level === 'GOLD') {
      console.log(`  ${c('bgGreen', c('white', bold(' ✔ PASS GOLD ')))} ${c('green', `Score: ${gold.final}/100`)}`);
    } else if (gold.level === 'SILVER') {
      console.log(`  ${c('bgYellow', c('white', bold(' ◎ PASS SILVER ')))} ${c('yellow', `Score: ${gold.final}/100`)}`);
    } else {
      console.log(`  ${c('bgRed', c('white', bold(' ✗ NEEDS REVIEW ')))} ${c('red', `Score: ${gold.final}/100`)}`);
    }

    console.log(`  ${dim(gold.verdict || '')}`);

    if (gold.dimensions) {
      console.log('');
      console.log(`  ${bold('Score breakdown:')}`);
      for (const [, v] of Object.entries(gold.dimensions)) {
        const bar = '█'.repeat(Math.round(v.score / 10)).padEnd(10, '░');
        const barColored = v.score >= 70 ? c('green', bar) : v.score >= 40 ? c('yellow', bar) : c('red', bar);
        console.log(`    ${barColored} ${String(v.score).padStart(3)}% ${dim(v.label)}`);
      }
    }
  },

  // ── Resultado da missão ─────────────────────────────────────────────────
  missionResult(result) {
    const status = result.status || result.ok;
    console.log('');

    if (result.status === 'success') {
      ui.ok(bold('Missão concluída com sucesso'));
    } else if (result.status === 'requires_review') {
      ui.warn('Requer revisão manual — confiança insuficiente');
    } else if (result.status === 'high_risk') {
      ui.warn('Risco alto detectado — aguardando aprovação');
    } else if (result.status === 'patch_failed') {
      ui.fail('Patch falhou — rollback executado automaticamente');
    } else if (result.status === 'validation_failed') {
      ui.fail('Validação falhou — rollback executado');
    } else if (result.status === 'no_patch') {
      ui.warn('Nenhum patch automático disponível');
    } else {
      ui.fail(`Status: ${result.status || 'erro'}`);
    }

    if (result.rca) {
      console.log('');
      console.log(`  ${bold('Causa:')} ${result.rca.cause || '—'}`);
      console.log(`  ${bold('Fix:')}   ${result.rca.fix || '—'}`);
      console.log(`  ${bold('Risco:')} ${result.rca.risk || '—'} | ${bold('Confiança:')} ${result.rca.confidence || 0}%`);
    }

    if (result.patchResult?.applied > 0) {
      console.log('');
      console.log(`  ${c('green', '✔')} ${result.patchResult.applied} patch(es) aplicado(s)`);
      if (result.patchResult.filesAffected?.length) {
        for (const f of result.patchResult.filesAffected) {
          console.log(`    ${dim('→')} ${f}`);
        }
      }
    }

    if (result.pr?.ok) {
      console.log('');
      console.log(`  ${c('cyan', '⎇')} PR criada: ${result.pr.branch}`);
      if (result.pr.pr_url) console.log(`    ${dim(result.pr.pr_url)}`);
    }

    if (result.id) {
      console.log('');
      console.log(`  ${dim('Mission ID:')} ${dim(result.id)}`);
      if (result.duration_ms) console.log(`  ${dim('Duração:')} ${dim(result.duration_ms + 'ms')}`);
    }
  },

  // ── Modo DRY RUN ────────────────────────────────────────────────────────
  dryRun(rca) {
    console.log('');
    console.log(c('yellow', bold('  ── DRY RUN (nenhum arquivo foi alterado) ──')));
    if (rca) {
      console.log(`  ${bold('Causa identificada:')} ${rca.cause}`);
      console.log(`  ${bold('Fix sugerido:')}       ${rca.fix}`);
      console.log(`  ${bold('Confiança:')}          ${rca.confidence}%`);
      console.log(`  ${bold('Risco:')}              ${rca.risk}`);

      if (rca.patches?.length) {
        console.log('');
        console.log(`  ${bold('Patches que seriam aplicados:')}`);
        for (const p of rca.patches) {
          console.log(`    ${c('cyan', '→')} ${p.file}: ${p.description || '—'}`);
          console.log(`      ${dim('find:')}    ${String(p.find || '').slice(0, 60)}`);
          console.log(`      ${dim('replace:')} ${String(p.replace || '').slice(0, 60)}`);
        }
      }
    }
    console.log('');
    console.log(dim('  Para aplicar: vision-agent run "..." --mode safe-patch'));
  },

  error(msg) {
    console.error(`\n  ${c('red', '✗')} ${bold('Erro:')} ${msg}\n`);
  },

  log(msg) { console.log(`  ${msg}`); },
};

module.exports = ui;
