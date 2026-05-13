# V14.0 Failures to Never Repeat

Este documento lista sabotadores proibidos na V14. Eles representam padrões que criam execução falsa, múltiplos donos de runtime, autenticação bloqueante, mocks perigosos ou validação ilusória.

## Regra principal

Se um item desta lista reaparecer no frontend V14, ele deve ser tratado como regressão crítica. A V14 deve falhar de forma honesta em vez de apresentar sucesso falso.

## Sabotadores proibidos

- `RUN_PATH`
- `STREAM_PATH`
- `executeBtn.onclick`
- `window.fetch =`
- `script inline executável`
- `/api/github/create-pr fake`
- `create-pr`
- `pass_gold:true`
- `promotion_allowed:true`
- `mission-${Date.now()}`
- `signupBtn`
- `oauth mock`
- `authBackdrop antigo`
- `vision-runtime-v297`
- `vision-v297`
- `vision-v298`
- `vision-v299`
- `vision-v2910`
- `vision-v32`
- `vision-v34`
- `vision-v35`
- `vision-v44`
- `guard reduzido`
- `validation shim`

## Por que são proibidos

### Caminhos de execução paralelos

`RUN_PATH`, `STREAM_PATH` e `executeBtn.onclick` tendem a criar atalhos fora do Runtime Owner. Isso fragmenta a execução, dificulta evidência e permite que a UI declare estados que o backend não confirmou.

### Monkey patching e scripts inseguros

`window.fetch =` e script inline executável tornam o comportamento global imprevisível, quebram contratos e dificultam auditoria. A V14 deve usar módulos explícitos e pontos de integração declarados.

### GitHub e promoção falsos

`/api/github/create-pr fake`, `create-pr`, `promotion_allowed:true` e flags equivalentes criam confiança falsa. Integração GitHub e promoção só podem ocorrer por backend real, política real e evidência verificável.

### PASS GOLD falso

`pass_gold:true` é proibido quando aparece como afirmação isolada. PASS GOLD exige score, critérios e evidence receipt.

### Missões fabricadas no cliente

`mission-${Date.now()}` cria identificador falso e quebra rastreabilidade. `mission_id` deve vir do backend/runtime.

### Auth legado ou mockado

`signupBtn`, `oauth mock` e `authBackdrop antigo` criam bloqueio visual ou falsa identidade. A autenticação V14 é opcional, clara e não-bloqueante.

### Versões legadas acumuladas

`vision-runtime-v297`, `vision-v297`, `vision-v298`, `vision-v299`, `vision-v2910`, `vision-v32`, `vision-v34`, `vision-v35` e `vision-v44` representam acúmulo de frontends/runtimes antigos. A V14 deve ter shell e módulos definitivos, não um cemitério de versões.

### Guards e validação ilusória

`guard reduzido` e `validation shim` enfraquecem segurança operacional. Guards devem validar contratos reais e bloquear estados falsos; shims não podem substituir backend, policy ou evidence receipt.
