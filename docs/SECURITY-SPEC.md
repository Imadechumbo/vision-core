# VISION CORE — Security Spec
## Nível exigido: 9/10 antes do lançamento ENTERPRISE
## Atualizado: §149

### Autenticação
- Senhas: bcrypt cost 12 (§151) — não sha256 caseiro atual
- Rate limiting: 5 tentativas/IP/hora no register, 10/IP/15min no login (§149 ✅ DONE)
- JWT: access 24h + refresh 30d + blacklist S3 para revogação (§152)
- 2FA: TOTP obrigatório para ENTERPRISE, opcional para PRO (§158)
- SSO: OpenID Connect configurável por domínio para ENTERPRISE (§155)

### Autorização
- Isolamento por projeto: roles owner/editor/viewer por membro (§156)
- Audit log: todas ações críticas em S3 com timestamp/IP/user_agent (§154)

### Transporte
- HSTS, CSP, X-Frame-Options, X-Content-Type-Options no gateway (§153)
- HTTPS forçado em todos os endpoints

### Billing
- HMAC obrigatório em todos os webhooks Hotmart (§150 ✅ DONE)
- Verificação de assinatura antes de qualquer mudança de plano

### Compliance
- LGPD: endpoint DELETE /api/auth/me para exclusão completa (§159)
- Penetration test OWASP ZAP documentado antes do ENTERPRISE (§160)

### NÃO ACEITAR em produção ENTERPRISE:
- Senhas sem bcrypt
- Webhooks sem verificação HMAC
- Tokens sem rotação
- Ausência de rate limiting nas rotas de auth
- Headers de segurança ausentes
