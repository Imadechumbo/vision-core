'use strict';

const config = require('../lib/config');
const api    = require('../lib/api');
const ui     = require('../lib/ui');

/**
 * vision-agent login [--token <tok>] [--server <url>]
 *
 * Salva o token do Vision Core e a URL do server em ~/.vision-agent/config.json
 */
async function login(args) {
  ui.header('VISION AGENT — Login');

  // Ler args
  const tokenIdx  = args.indexOf('--token');
  const serverIdx = args.indexOf('--server');

  let token  = tokenIdx  !== -1 ? args[tokenIdx  + 1] : null;
  let server = serverIdx !== -1 ? args[serverIdx + 1] : null;

  // Sem token: modo sem autenticação (desenvolvimento local)
  if (!token) {
    ui.warn('Nenhum token fornecido — usando modo local (sem autenticação)');
    ui.detail('Para autenticação: vision-agent login --token <seu-token>');
    token = 'local';
  }

  // URL do servidor
  if (!server) {
    server = config.serverUrl();
    ui.info(`Usando server: ${server}`);
    ui.detail('Para outro server: vision-agent login --server http://seu-servidor:8787');
  }

  // Salvar config
  config.save({ token, server_url: server });

  // Testar conexão
  ui.working('Testando conexão com o server');
  try {
    const ok = await api.health();
    if (ok) {
      ui.done('conectado');
      ui.ok(`Vision Core Server online em ${server}`);
    } else {
      ui.done('aviso');
      ui.warn(`Server respondeu mas retornou status inesperado`);
      ui.detail('Verifique se o vision-core-server está rodando');
    }
  } catch (e) {
    process.stdout.write('\n');
    ui.warn(`Não foi possível conectar em ${server}`);
    ui.detail(e.message);
    ui.detail('Token salvo. Suba o server e tente novamente.');
  }

  console.log('');
  ui.ok(`Configuração salva em: ${config.configPath()}`);
  ui.detail(`Token: ${token === 'local' ? '(local)' : token.slice(0, 8) + '...'}`);
  ui.detail(`Server: ${server}`);
  console.log('');
}

module.exports = { login };
