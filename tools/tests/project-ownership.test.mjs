#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());
const FILES = ['users.json', 'projects.json', 'chat-conversations.json', 'operation-log.json', 'token-blacklist.json', 'audit-log.json'].map(name => resolve(ROOT, 'data', name));
const backups = FILES.map(file => ({ file, existed: existsSync(file), content: existsSync(file) ? readFileSync(file, 'utf8') : null }));
const PORT = 18736;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { console.log(`  ✓ ${message}`); passed++; }
  else { console.error(`  ✗ FAIL: ${message}`); failed++; }
}

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, body: await response.json() };
}

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { if ((await fetch(BASE + '/api/health')).ok) return true; } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  return false;
}

const child = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT: String(PORT),
    AWS_S3_BUCKET: '',
    SESSION_SECRET: 'project-ownership-test-session-secret-32chars',
    PROVIDER_VAULT_SECRET: 'project-ownership-test-vault-secret-32chars'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
child.stdout.on('data', data => { serverLog += data.toString(); });
child.stderr.on('data', data => { serverLog += data.toString(); });

try {
  const up = await waitForHealth();
  assert(up, 'backend real sobe em porta isolada');
  if (!up) throw new Error(serverLog.slice(-2000));

  const anonymousGet = await request('/api/projects');
  const anonymousPost = await request('/api/projects', { method: 'POST', body: { name: 'sem owner' } });
  assert(anonymousGet.status === 401 && anonymousGet.body.error === 'not_authenticated', 'GET anônimo falha com 401');
  assert(anonymousPost.status === 401 && anonymousPost.body.error === 'not_authenticated', 'POST anônimo falha com 401');

  const stamp = Date.now();
  const registerA = await request('/api/auth/register', { method: 'POST', body: { email: `project-a-${stamp}@example.invalid`, password: 'project-test-password-a' } });
  const registerB = await request('/api/auth/register', { method: 'POST', body: { email: `project-b-${stamp}@example.invalid`, password: 'project-test-password-b' } });
  assert(registerA.status === 200 && registerB.status === 200, 'dois usuários reais registrados');

  const tokenA = registerA.body.token;
  const tokenB = registerB.body.token;
  const createdA = await request('/api/projects', { method: 'POST', token: tokenA, body: { name: 'Projeto A' } });
  const createdB = await request('/api/projects', { method: 'POST', token: tokenB, body: { name: 'Projeto B' } });
  assert(createdA.body.project.user_id === registerA.body.user.id, 'owner do projeto A vem da sessão A');
  assert(createdB.body.project.user_id === registerB.body.user.id, 'owner do projeto B vem da sessão B');

  const listA = await request('/api/projects', { token: tokenA });
  const listB = await request('/api/projects', { token: tokenB });
  assert(listA.body.projects.length === 1 && listA.body.projects[0].name === 'Projeto A', 'usuário A lista somente o próprio projeto');
  assert(listB.body.projects.length === 1 && listB.body.projects[0].name === 'Projeto B', 'usuário B lista somente o próprio projeto');

  const spoof = await request('/api/projects', { method: 'POST', token: tokenA, body: { name: 'Spoof', user_id: registerB.body.user.id } });
  assert(spoof.status === 400 && spoof.body.error === 'project_owner_not_assignable', 'user_id fornecido pelo cliente é rejeitado');

  const anonymousChats = await request(`/api/chat/conversations?project_id=${createdA.body.project.id}`);
  assert(anonymousChats.status === 401, 'histórico anônimo falha com 401');
  const foreignProject = await request('/api/chat/conversations', { method: 'POST', token: tokenA, body: { project_id: createdB.body.project.id } });
  assert(foreignProject.status === 404 && foreignProject.body.error === 'project_not_found', 'usuário A não cria conversa no projeto B');

  const createdChat = await request('/api/chat/conversations', { method: 'POST', token: tokenA, body: { project_id: createdA.body.project.id, title: 'Conversa A' } });
  const chatId = createdChat.body.conversation.id;
  assert(createdChat.status === 200 && chatId, 'usuário A cria conversa no próprio projeto');
  const savedMessage = await request(`/api/chat/conversations/${chatId}/messages`, { method: 'POST', token: tokenA, body: { role: 'user', content: 'mensagem visível' } });
  assert(savedMessage.status === 200 && savedMessage.body.message.content === 'mensagem visível', 'mensagem textual é persistida');
  const readA = await request(`/api/chat/conversations/${chatId}`, { token: tokenA });
  const readB = await request(`/api/chat/conversations/${chatId}`, { token: tokenB });
  assert(readA.body.conversation.messages.length === 1, 'owner lê as mensagens da conversa');
  assert(readB.status === 404 && readB.body.error === 'conversation_not_found', 'outro usuário não lê a conversa');
  const listChats = await request(`/api/chat/conversations?project_id=${createdA.body.project.id}`, { token: tokenA });
  assert(listChats.body.conversations.length === 1 && listChats.body.conversations[0].message_count === 1, 'listagem traz somente metadados e contagem');
  await request('/api/chat/conversations', { method: 'POST', token: tokenA, body: { project_id: createdA.body.project.id, title: 'Conversa A2' } });
  const paged = await request(`/api/chat/conversations?project_id=${createdA.body.project.id}&limit=1&offset=1`, { token: tokenA });
  assert(paged.body.conversations.length === 1 && paged.body.total === 2 && paged.body.next_offset === null, 'paginação retorna total e offset determinísticos');

  const anonymousLogs = await request(`/api/logs?project_id=${createdA.body.project.id}`);
  const logsA = await request(`/api/logs?project_id=${createdA.body.project.id}&limit=2`, { token: tokenA });
  const logsB = await request(`/api/logs?project_id=${createdA.body.project.id}`, { token: tokenB });
  assert(anonymousLogs.status === 401, 'logs anônimos falham com 401');
  assert(logsB.status === 404, 'outro usuário não consulta logs do projeto A');
  assert(logsA.body.entries.length === 2 && logsA.body.total >= 4 && Number.isInteger(logsA.body.next_offset), 'logs têm paginação e correlação por projeto');
  assert(logsA.body.entries.every(entry => entry.request_id && !('user_id' in entry) && !('email' in entry) && !('ip' in entry) && !('ua' in entry)), 'resposta de logs usa allowlist redigida');
  const rawLogs = await request('/api/logs/download', { token: tokenA });
  assert(rawLogs.status === 410 && rawLogs.body.error === 'raw_log_download_retired', 'download bruto foi encerrado');

  const deletedAccount = await request('/api/auth/me', { method: 'DELETE', token: tokenA });
  const conversationsAfterDelete = JSON.parse(readFileSync(resolve(ROOT, 'data', 'chat-conversations.json'), 'utf8')).conversations;
  assert(deletedAccount.status === 200 && conversationsAfterDelete.every(item => item.user_id !== registerA.body.user.id), 'exclusão de conta remove todas as conversas do owner');
} finally {
  child.kill();
  for (const backup of backups) {
    try {
      if (backup.existed) writeFileSync(backup.file, backup.content, 'utf8');
      else if (existsSync(backup.file)) unlinkSync(backup.file);
    } catch {}
  }
}

console.log(`\nproject-ownership: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
