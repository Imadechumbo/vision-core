'use strict';

const fs   = require('fs');
const path = require('path');
const api  = require('../lib/api');
const ui   = require('../lib/ui');

/**
 * vision-agent register <path> [--id <id>] [--name <name>] [--adapter <adapter>]
 *
 * Registra um projeto local no Vision Core Server.
 * Detecta automaticamente stack e nome pelo package.json.
 */
async function register(args) {
  ui.header('VISION AGENT — Registrar Projeto');

  // Resolver path
  const rawPath = args.find(a => !a.startsWith('--')) || '.';
  const projPath = path.resolve(rawPath);

  if (!fs.existsSync(projPath)) {
    ui.error(`Path não encontrado: ${projPath}`);
    process.exit(1);
  }

  ui.info(`Path: ${projPath}`);

  // Auto-detectar nome e stack pelo package.json
  let detectedName  = path.basename(projPath);
  let detectedStack = 'node_express';
  let detectedId    = detectedName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  let healthUrl     = null;

  const pkgPath = path.join(projPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) {
        detectedName = pkg.name;
        detectedId   = pkg.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      }

      // Detectar stack pelas dependências
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.express)   detectedStack = 'node_express';
      if (deps.fastify)   detectedStack = 'node_fastify';
      if (deps.next)      detectedStack = 'nextjs';
      if (deps.nuxt)      detectedStack = 'nuxtjs';
      if (deps.django)    detectedStack = 'python_django';
      if (deps.flask)     detectedStack = 'python_flask';
    } catch { /* ignorar parse error */ }
  }

  // Detectar adapter especial (TechNetGame)
  let adapter = 'generic';
  if (detectedId.includes('technetgame') || detectedName.toLowerCase().includes('technetgame')) {
    adapter   = 'technetgame';
    healthUrl = 'https://api.technetgame.com.br/api/health';
    ui.info('Adapter TechNetGame detectado automaticamente');
  }

  // Sobrescrever com args explícitos
  const idIdx      = args.indexOf('--id');
  const nameIdx    = args.indexOf('--name');
  const adapterIdx = args.indexOf('--adapter');
  const healthIdx  = args.indexOf('--health');

  const id      = idIdx      !== -1 ? args[idIdx + 1]      : detectedId;
  const name    = nameIdx    !== -1 ? args[nameIdx + 1]    : detectedName;
  adapter       = adapterIdx !== -1 ? args[adapterIdx + 1] : adapter;
  healthUrl     = healthIdx  !== -1 ? args[healthIdx + 1]  : healthUrl;

  ui.info(`ID:      ${id}`);
  ui.info(`Nome:    ${name}`);
  ui.info(`Stack:   ${detectedStack}`);
  ui.info(`Adapter: ${adapter}`);
  if (healthUrl) ui.info(`Health:  ${healthUrl}`);

  // Checar conectividade
  ui.working('Conectando ao Vision Core Server');
  try {
    const ok = await api.health();
    if (!ok) throw new Error('Server não respondeu corretamente');
    ui.done('OK');
  } catch (e) {
    process.stdout.write('\n');
    ui.error(`Não foi possível conectar ao server: ${e.message}`);
    ui.detail('Suba o vision-core-server antes de registrar projetos.');
    process.exit(1);
  }

  // Registrar no servidor
  ui.working('Registrando projeto');
  try {
    const res = await api.registerProject({
      id,
      name,
      stack: detectedStack,
      path: projPath,
      health_url: healthUrl,
      adapter,
      config: adapter === 'technetgame'
        ? { check_urls: ['https://api.technetgame.com.br/api/health'] }
        : {},
    });

    if (res.status < 300 && res.data?.ok) {
      ui.done('registrado');
      console.log('');
      ui.ok(`Projeto "${name}" registrado com sucesso!`);
      ui.detail(`ID para missões: ${id}`);
      console.log('');
      ui.log(`Próximo passo:`);
      ui.log(`  vision-agent run "${id}" "descrição do problema"`);
      console.log('');
    } else {
      ui.done('erro');
      ui.error(res.data?.error || `HTTP ${res.status}`);
      process.exit(1);
    }
  } catch (e) {
    process.stdout.write('\n');
    ui.error(e.message);
    process.exit(1);
  }
}

module.exports = { register };
