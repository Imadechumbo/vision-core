'use strict';

const api = require('../lib/api');
const ui  = require('../lib/ui');
const config = require('../lib/config');

// ════════════════════════════════════════════════════════════
// STATUS — mostra estado do server e projetos
// ════════════════════════════════════════════════════════════
async function status(args) {
  ui.header('VISION AGENT — Status');

  ui.info(`Server: ${config.serverUrl()}`);
  ui.info(`Config: ${config.configPath()}`);
  console.log('');

  // Saúde do server
  ui.working('Verificando server');
  try {
    const res = await api.runtimeStatus();
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    ui.done('online');

    const d = res.data;
    ui.ok(`Missões totais:  ${d.missions_total || 0}`);
    ui.ok(`PASS GOLD:       ${d.pass_gold_count || 0} (${d.gold_rate || 0}%)`);
    ui.ok(`GitHub:          ${d.github?.configured ? 'configurado' : 'não configurado'}`);
    ui.ok(`State:           ${d.state || 'unknown'}`);

  } catch (e) {
    process.stdout.write('\n');
    ui.fail(`Server offline: ${e.message}`);
    ui.detail('Suba com: npm start (no diretório vision-core-server)');
    process.exit(1);
  }

  // Listar projetos
  console.log('');
  ui.working('Carregando projetos');
  try {
    const res = await api.listProjects();
    ui.done(`${res.data?.projects?.length || 0} projeto(s)`);

    if (res.data?.projects?.length) {
      console.log('');
      for (const p of res.data.projects) {
        ui.ok(`${p.name} ${ui.dim ? '' : ''}(${p.id})`);
        console.log(`    ${p.stack} | ${p.adapter} | ${p.path?.slice(0, 50)}`);
      }
    } else {
      ui.warn('Nenhum projeto registrado ainda.');
      ui.detail('Use: vision-agent register <path>');
    }
  } catch (e) {
    process.stdout.write('\n');
    ui.warn(`Não foi possível listar projetos: ${e.message}`);
  }

  console.log('');
}

// ════════════════════════════════════════════════════════════
// ROLLBACK — reverte uma missão
// ════════════════════════════════════════════════════════════
async function rollback(args) {
  ui.header('VISION AGENT — Rollback');

  const missionId = args.find(a => !a.startsWith('--'));
  if (!missionId) {
    ui.error('Uso: vision-agent rollback <mission-id>');
    ui.detail('O mission-id aparece no final de cada missão executada.');
    process.exit(1);
  }

  ui.info(`Missão: ${missionId}`);
  console.log('');
  ui.warn('Isso irá restaurar os arquivos ao estado ANTES da missão.');
  console.log('');

  ui.working('Executando rollback');
  try {
    const res = await api.rollback(missionId);
    if (res.data?.ok) {
      ui.done('concluído');
      console.log('');
      ui.ok(`${res.data.restored?.length || 0} arquivo(s) restaurado(s):`);
      for (const f of (res.data.restored || [])) {
        console.log(`    → ${f}`);
      }
    } else {
      ui.done('erro');
      ui.error(res.data?.error || 'Rollback falhou');
      ui.detail('Verifique se o mission-id está correto e se o snapshot existe.');
      process.exit(1);
    }
  } catch (e) {
    process.stdout.write('\n');
    ui.error(e.message);
    process.exit(1);
  }

  console.log('');
}

// ════════════════════════════════════════════════════════════
// MISSIONS — lista missões do projeto
// ════════════════════════════════════════════════════════════
async function missions(args) {
  ui.header('VISION AGENT — Missões');

  const projectId = args.find(a => !a.startsWith('--'));

  try {
    const url = projectId
      ? `/api/missions/project/${projectId}`
      : '/api/missions?limit=10';

    const res = await api.get(url);
    const list = res.data?.missions || [];

    if (!list.length) {
      ui.warn('Nenhuma missão encontrada.');
      return;
    }

    for (const m of list) {
      const icon = m.status === 'success'          ? '✔'
                 : m.status === 'requires_review'  ? '⚠'
                 : m.status === 'failed'            ? '✗'
                 : '○';

      console.log(`  ${icon} ${m.id.slice(-16)} | ${String(m.status).padEnd(16)} | gold=${m.gold_score || 0}/100 | ${m.created_at?.slice(0, 16) || '—'}`);
      if (m.rca_cause) {
        console.log(`    ${m.rca_cause.slice(0, 70)}`);
      }
    }

  } catch (e) {
    ui.error(e.message);
    process.exit(1);
  }

  console.log('');
}

module.exports = { status, rollback, missions };
