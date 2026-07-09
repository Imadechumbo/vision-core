#!/usr/bin/env node
/**
 * INCIDENTE-3 — runbook de dados legados (ver CLAUDE.md e docs/CURRENT_HANDOFF.md).
 *
 * Identifica contas cujo password_hash autentica com a credencial de fallback
 * pública legada (pré-§145) e, opcionalmente, invalida essas contas gerando um
 * novo hash a partir de um segredo aleatório desconhecido.
 *
 * Este script não acessa produção sozinho — ele opera sobre um arquivo
 * users.json local (baixado manualmente de onde a produção o mantiver hoje).
 * Ver "Runbook" em docs/CURRENT_HANDOFF.md para pré-condição/comando/resultado
 * esperado/rollback completos.
 *
 * Uso:
 *   node tools/incident-3-legacy-account-scan.mjs <users.json>              # somente leitura
 *   node tools/incident-3-legacy-account-scan.mjs <users.json> --invalidate # gera backup, sobrescreve hash das contas afetadas
 *
 * Código de saída (modo leitura): 0 = nenhuma conta afetada, 1 = há conta(s) afetada(s).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

// Mesmos parâmetros/formato de backend/server.js (hashPassword/verifyPassword) —
// duplicado aqui de propósito: este script roda fora do processo do backend.
const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_LEN = 32;
const FALLBACK = 'vc-user-auto';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('hex');
  return `$scrypt$${SCRYPT_N}$${salt}$${hash}`;
}

function hashPasswordLegacy(password, salt) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith('$scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 5) return false;
    const [, , N, salt, expectedHex] = parts;
    try {
      const actual = crypto.scryptSync(String(password), salt, SCRYPT_LEN, { N: parseInt(N, 10), r: SCRYPT_R, p: SCRYPT_P }).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expectedHex, 'hex'));
    } catch { return false; }
  }
  if (!stored.includes(':')) return false;
  const [salt] = stored.split(':');
  const expected = hashPasswordLegacy(password, salt);
  return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(expected));
}

const file = process.argv[2];
const invalidate = process.argv.includes('--invalidate');
if (!file) {
  console.error('Uso: node tools/incident-3-legacy-account-scan.mjs <users.json> [--invalidate]');
  process.exit(2);
}

const db = JSON.parse(fs.readFileSync(file, 'utf8'));
const users = Array.isArray(db.users) ? db.users : [];
const affected = users.filter(u => verifyPassword(FALLBACK, u.password_hash));

console.log(`Contas verificadas: ${users.length}`);
console.log(`Contas afetadas (hash bate com a credencial de fallback): ${affected.length}`);
for (const u of affected) {
  console.log(` - ${u.id}  ${u.email}  criada_em=${u.created_at}  ultimo_login=${u.last_login || 'nunca'}`);
}

if (!invalidate) {
  console.log('\nModo leitura. Rode novamente com --invalidate para forçar novo hash aleatório nessas contas (gera backup antes).');
  process.exit(affected.length > 0 ? 1 : 0);
}

if (affected.length === 0) {
  console.log('\nNada para invalidar.');
  process.exit(0);
}

const backupPath = `${file}.bak-${Date.now()}`;
fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`\nBackup gravado em: ${backupPath}`);

for (const u of affected) {
  u.password_hash = hashPassword(crypto.randomBytes(24).toString('hex'));
}
fs.writeFileSync(file, JSON.stringify(db, null, 2), 'utf8');
console.log(`Hash de ${affected.length} conta(s) substituído por segredo aleatório desconhecido. Arquivo atualizado: ${file}`);
console.log('Essas contas ficam sem acesso via login/registro atual até um fluxo de reset de senha existir ou intervenção manual — isso é o efeito esperado (fecha a credencial pública, não recupera acesso automaticamente).');
