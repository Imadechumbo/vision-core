# SDDF — LEGACY ENGINE POLICY

## Definição
O LEGACY ENGINE é a stack V4.4 GOLD: Node.js + Electron + Cloudflare.
Deve ser preservado intacto enquanto o Go Safe Core está em validação.

## Regras permanentes

1. **O Go Safe Core NUNCA altera** arquivos do legado diretamente.
2. **Node/Electron continuam** como camada SaaS e UI principal.
3. **Nenhuma rota Node existente** é removida ou substituída na V5.0.
4. **O Electron Desktop Agent** continua funcional como legacy.
5. **`legacy_safe: true`** deve ser sempre verdadeiro no Go Safe Core V5.0.

## O que o legado faz que o Go não faz (ainda)

| Feature | Node/Electron (legado) | Go Safe Core V5.0 |
|---------|----------------------|-------------------|
| Auth/Billing | ✅ | ❌ |
| SSE Streaming | ✅ | ❌ |
| Orbit UI | ✅ | ❌ |
| LLM/Hermes | ✅ | ❌ |
| Scanner | ✅ (Babel AST) | ✅ (regex+walk) |
| Patcher | ✅ | ✅ (dry-run) |
| Validator | ✅ | ✅ |
| PASS GOLD | ✅ (server-side) | ✅ (CLI) |

## Transição futura (V5.1+)
Electron vira UI shell. Go executa missões localmente.
Node permanece para SaaS/Auth/Billing indefinidamente.
