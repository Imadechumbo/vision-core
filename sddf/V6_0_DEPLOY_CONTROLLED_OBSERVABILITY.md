# VISION CORE V6.0 - DEPLOY CONTROLADO + RELEASE OBSERVABILITY

## Base

- Release base: `v5.9-main-gold`
- Commit base: `4830e71`
- Estado: MAIN GOLD TAG RELEASE

## Arquitetura operacional

- Node: SaaS/UI/orquestracao externa.
- Go Core: engine critica oficial.
- Legacy Engine: compativel, subordinado ao Go Core.
- PASS GOLD: gate obrigatorio para promocao.

## Regras

- Deploy deve ser manual e controlado.
- Deploy so e permitido apos pre-deploy PASS GOLD.
- Frontend nao decide promocao.
- Node nunca simula GOLD.
- Rollback e responsabilidade operacional baseada na tag estavel.
- Cloudflare/AWS nao devem ser alterados sem validacao pos-deploy.

## Observabilidade minima pos-deploy

Validar:

- `GET /api/health`
- `GET /api/go-core/health`
- `POST /api/run-live`
- `GET frontend`

O deploy so e considerado observavel quando:

- `pass_gold = true`
- `engine = go-safe-core`
- `hermes_enabled = true`
- `transaction_mode = true`

## Rollback

Rollback deve voltar para:

- `v5.9-main-gold`; ou
- ultima tag estavel validada.

Rollback so deve ser aplicado se validacao pos-deploy falhar ou se houver incidente critico confirmado.
