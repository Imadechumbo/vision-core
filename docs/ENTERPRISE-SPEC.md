# VISION CORE — Enterprise Feature Spec
## Atualizado: 2026-06-25 (§154)

---

## §155 — SSO via OpenID Connect

**O que é:** Login corporativo — usuário faz login via Google Workspace, Microsoft Entra, Okta, etc. sem criar conta Vision Core.

**Fluxo:**
1. Tenant configura domínio no painel ENTERPRISE (ex: `empresa.com`)
2. `GET /api/auth/sso/start?domain=empresa.com` → descobre provedor via `/.well-known/openid-configuration`, gera PKCE challenge, redireciona para provedor
3. `GET /api/auth/sso/callback?code=...&state=...` → troca code por token, valida id_token, cria/atualiza usuário ENTERPRISE

**Schema sso-config.json (S3):**
```json
{
  "domains": {
    "empresa.com": {
      "provider_url": "https://accounts.google.com",
      "client_id": "...",
      "client_secret": "...",
      "plan_override": "enterprise"
    }
  }
}
```

**Regras:**
- PKCE obrigatório (sem PKCE = 400)
- state param validado por HMAC (anti-CSRF)
- Usuário SSO nunca tem `password_hash` local
- `oauth_provider: 'sso'`, `sso_domain: 'empresa.com'`
- Auto-cria usuário ENTERPRISE no primeiro login (plano `enterprise`)
- Zero deps npm — usar `crypto` nativo para PKCE + HMAC

**Estimativa:** 1 sessão (§155)

---

## §156 — Multi-projeto com isolamento real

**O que é:** Cada projeto tem membros, roles e contexto isolados. API atual `/api/projects` já existe mas sem controle de acesso por membro.

**Schema projeto (extensão do atual):**
```json
{
  "id": "proj_xxx",
  "name": "Meu Projeto",
  "owner_id": "user_xxx",
  "members": [
    { "user_id": "user_yyy", "role": "editor" },
    { "user_id": "user_zzz", "role": "viewer" }
  ],
  "created_at": "...",
  "plan_required": "enterprise"
}
```

**Endpoints novos:**
- `POST /api/projects/:id/members` — adicionar membro (owner ou admin)
- `DELETE /api/projects/:id/members/:userId` — remover membro
- `GET /api/projects/:id/members` — listar membros

**Middleware:**
```javascript
function checkProjectAccess(role) {
  // Verifica se req user é owner ou tem role >= requerido no projeto
}
```

**Regras:**
- `viewer` pode ler contexto/missões
- `editor` pode criar missões, aplicar patches
- `owner` pode gerenciar membros
- Projetos do plano `enterprise` bloqueados para usuários `free`/`pro`

**Estimativa:** 1 sessão (§156)

---

## §157 — Workers Dashboard completo

**O que é:** Painel de monitoramento em tempo real dos 10 agentes.

**Features:**
- Status de cada agente (online/offline/busy) via `/api/metrics/agents`
- Métricas por projeto: missões/dia, taxa PASS GOLD, tempo médio de resolução
- Histórico últimas 24h (gráfico de barras por hora)
- Alertas: agente em `PENDING_EVIDENCE` por >5min → badge vermelho
- Endpoint: `GET /api/workers/dashboard` → dados consolidados
- Frontend: aba "Dashboard" ou expansão do painel "Métricas" existente

**Schema response:**
```json
{
  "ok": true,
  "agents": [
    { "key": "piharness", "status": "ok", "last_seen_ms": 5000, "missions_24h": 12, "pass_gold_rate": 0.83 }
  ],
  "summary": { "total_missions_24h": 47, "avg_pass_gold_rate": 0.79 },
  "anti_stub": true
}
```

**Estimativa:** 2 sessões — §157 backend + §157b frontend

---

## §158 — 2FA TOTP obrigatório ENTERPRISE

**O que é:** Segundo fator via app (Google Authenticator, Authy).

**Fluxo setup:**
1. `GET /api/auth/2fa/setup` → gera TOTP secret, retorna QR code base32 + URI
2. `POST /api/auth/2fa/verify` com `{code}` → valida código, ativa 2FA na conta
3. `POST /api/auth/2fa/disable` com `{code}` → desativa 2FA (confirmar com código atual)

**Fluxo login com 2FA:**
1. Login normal → `{ ok: true, requires_2fa: true, pending_token: '...' }` (token parcial 5min)
2. `POST /api/auth/2fa/confirm` com `{pending_token, code}` → emite token completo se código válido

**Backup codes:**
- 8 códigos de uso único gerados no setup
- `POST /api/auth/2fa/backup` → usar backup code (consome + invalida)

**Dependências:**
- TOTP RFC 6238 — implementar manualmente com `crypto.createHmac('sha1', ...)` ou usar `otplib` npm
- Recomendação: implementar manualmente (zero deps, 50 linhas)

**Regras:**
- ENTERPRISE: 2FA obrigatório para todos os membros
- PRO: 2FA opcional
- FREE: 2FA não disponível

**Estimativa:** 1 sessão (§158)

---

## Ordem recomendada de implementação

1. §155 SSO — desbloqueador para clientes enterprise reais
2. §156 Multi-projeto — necessário antes de vender enterprise a times
3. §158 2FA — gate de segurança para enterprise
4. §157 Dashboard — polish, pode vir depois do lançamento

**Gate ENTERPRISE:** §155 + §156 + §158 + §160 (pentest) → lançamento ENTERPRISE liberado.
