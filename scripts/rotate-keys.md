# VISION CORE — Rotação de API Keys no Elastic Beanstalk

## Quando usar
- Vazamento suspeito de key
- Key expirada ou próxima do limite
- Rotação preventiva mensal

## Passo a passo (sem downtime)

1. No console EB → Configuration → Software → Environment Properties
2. Adicionar variável `DEEPSEEK_API_KEY_2` com a nova key
   (mantendo `DEEPSEEK_API_KEY` antiga ainda ativa)
3. Salvar e aguardar deploy (~2 min)
4. Testar: `POST /api/providers/test { "provider": "deepseek" }`
5. Confirmar resposta `{ "ok": true, "key_source": "secondary" }`
   - Isso confirma que a rotação está funcionando sem derrubar o serviço
6. Remover `DEEPSEEK_API_KEY` antiga
7. Renomear `DEEPSEEK_API_KEY_2` → `DEEPSEEK_API_KEY` (ou manter como está)

## Repita para GEMINI_API_KEY → GEMINI_API_KEY_2

## Como funciona o código (`backend/server.js`)

```javascript
function resolveApiKey(prefix) {
  return process.env[`${prefix}_API_KEY`] || process.env[`${prefix}_API_KEY_2`] || '';
}
```

- `resolveApiKey('DEEPSEEK')` tenta `DEEPSEEK_API_KEY` → `DEEPSEEK_API_KEY_2` → `''`
- `providerList()` expõe `key_source: 'primary' | 'secondary' | 'none'` por provider

## Verificação pós-rotação

```
GET /api/runtime/provider-status
→ Confirmar key_source: "primary" para todos os providers configurados

POST /api/providers/test { "provider": "gemini" }
→ { "ok": true, "connected": true, "key_source": "primary" }
```

## Providers suportados

| Provider    | Env primária          | Env secundária          |
|-------------|----------------------|------------------------|
| OpenAI      | OPENAI_API_KEY       | OPENAI_API_KEY_2       |
| Anthropic   | ANTHROPIC_API_KEY    | ANTHROPIC_API_KEY_2    |
| Gemini      | GEMINI_API_KEY       | GEMINI_API_KEY_2       |
| DeepSeek    | DEEPSEEK_API_KEY     | DEEPSEEK_API_KEY_2     |
| Groq        | GROQ_API_KEY         | GROQ_API_KEY_2         |
| OpenRouter  | OPENROUTER_API_KEY   | OPENROUTER_API_KEY_2   |
