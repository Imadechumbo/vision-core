# VISION CORE — SDDF SPEC V8.1.0
> Lei permanente de arquitetura. Nenhum patch, PR ou runtime novo pode violar estas regras.  
> Qualquer violação causa `runtime_ownership_gate = FAIL` e bloqueia PASS GOLD.

---

## 1. PRINCÍPIO MESTRE

**Um domínio = um dono. Sempre.**

Não existe "dois runtimes controlando a mesma coisa com guard". Existe um dono único e os demais são observadores read-only. Ponto.

Se você precisar adicionar um novo runtime, ele nasce como observer. Para torná-lo dono de um domínio, o dono atual deve ser removido ou explicitamente rebaixado.

---

## 2. OWNERSHIP TABLE (imutável)

| Domínio | Owner | Observers permitidos | Proibido para todos os outros |
|---|---|---|---|
| `execution` | V32 | nenhum | chamar `/run-live`, registrar listener de execução |
| `sse` | V32 | V34 (via proxy leitura), V44 (via proxy leitura) | criar `new EventSource()`, abrir SSE próprio |
| `report` | V32 | V34 (leitura), V44 (leitura) | renderizar Mission Report, chamar `fetchReport`, `buildReport`, `doReport` |
| `passgold` | V32 | nenhum | emitir PASS GOLD visual, logar "PASS GOLD confirmado" |
| `orbit_visual` | V34 | V44 | alterar `mc-node` states diretamente |
| `telemetry` | V35 | nenhum | polling de `/api/runtime/harness-stats` ou `/api/workers/status` |
| `ui_input` | V32 | V2910 (copilot apenas), V298 (chat apenas) | registrar `click` em `executeBtn` quando `__V32_OWNER__=true` |
| `fetch_patch` | nenhum | — | **proibido para todos** — nenhum runtime pode sobrescrever `window.fetch` |
| `eventsource_patch` | V32 (proxy bloqueador) | — | qualquer outro runtime criar proxy de EventSource |

---

## 3. RUNTIME ROLES (imutável)

### V32 — Execution Owner (único execution_owner)
- Seta `window.__V32_OWNER__ = true` imediatamente ao carregar
- Único que chama `POST /api/run-live`
- Único que cria `EventSource` (via flag `__V32_CALLING__`)
- Único que chama `fetchReport()` e renderiza Mission Report
- Único que emite estado PASS GOLD visual
- Intercepta `new EventSource()` de outros runtimes com proxy bloqueador silencioso

### V34 — Orbit Observer
- Observa `window.__VISION_SSE__` para atualizar `mc-node` visuais
- Faz polling de `/api/runtime/harness-stats` e `/api/workers/status`
- **Proibido:** chamar `doReport`, `fetchReport`, `buildReport`, criar `EventSource`, registrar execução
- `MutationObserver` no chat: pode detectar "PASS GOLD" para acender node visual, mas **não** chama report — apenas loga

### V35 — Telemetry Observer
- Coleta métricas passivas
- **Proibido:** alterar qualquer state de missão, report, PASS GOLD

### V44 — Consistency Observer
- Verifica consistência de UI (nodes órfãos, estados incoerentes)
- Pode corrigir CSS/display de elementos visuais
- **Proibido:** `buildReport`, `triggerReport`, renderizar Mission Report, emitir PASS GOLD

### V2910 — Legacy Compat (read-only quando V32 ativo)
- Quando `window.__V32_OWNER__ = true`: **nenhuma ação de execução**
- Pode prover `VisionApi.sendCopilot()` (chat/copilot apenas)
- **Proibido quando V32 ativo:** `runMission`, `startSSE`, `new EventSource`, listener de execução

### V297 / vision-runtime-v297 — Legacy UI (read-only quando V32 ativo)
- Quando `window.__V32_OWNER__ = true`: **nenhuma ação de execução**
- Pode prover helpers de timeline visual (`v297SetTimeline`) como ponte
- **Proibido quando V32 ativo:** `runMission`, `startSSE`, `new EventSource`, registrar `executeBtn`

### V298 — Chat/Copilot (read-only quando V32 ativo)
- Quando `window.__V32_OWNER__ = true`: apenas UI de chat, sem execução
- Pode renderizar interface de copilot/conversa
- **Proibido quando V32 ativo:** `runMission`, `startSSE`, `new EventSource`, listener de execução

### V299 — Extends V298
- Herda as mesmas restrições do V298

---

## 4. GATES OBRIGATÓRIOS

### 4.1 `runtime_ownership_gate`
Verificado antes de iniciar qualquer missão.

**Falha se:**
- Mais de um runtime registrou listener em `executeBtn`
- Mais de um runtime tem `EventSource` ativo
- `window.__V32_OWNER__` não está `true`
- Qualquer runtime legado chamou `/run-live` independentemente

**Resultado de falha:**
```
mission_status = FAIL
pass_gold = false
promotion_allowed = false
```

### 4.2 `report_truth_gate`
Verificado antes de renderizar Mission Report.

**Proibido no relatório (causa FAIL/INCOMPLETE):**
- `Project` vazio ou `"—"` com PASS GOLD
- `Root Cause` vazio ou `"—"` com PASS GOLD  
- `Files Changed` vazio, `"—"` ou `0` com PASS GOLD
- `Mission ID` genérico (`"mission"`, `"test"`, `"missão SDDF"`)
- `Promotion Allowed = SIM` sem evidência real
- `Hermes Vote = aprovado` sem RCA documentado
- `SDDF Tests = 95%` sem execução de testes real
- `Logs Available = YES` sem logs capturados
- `Pass Gold = GOLD` sem todos os campos preenchidos

**Se dados reais ausentes:**
```
mission_status = INCOMPLETE
pass_gold_status = FAIL
promotion_allowed = false
hermes_vote = "BLOCKED — evidence missing"
memory_learning_allowed = false
```

### 4.3 `post_deploy_completion_gate`
Para missões com deploy (frontend/API pública/Cloudflare/CSS/SSE/CORS):

`DEPLOYED ≠ CONCLUÍDO`

**Obrigatório para fechar como PASS GOLD:**
- `deploy_hash_url` capturado
- `validation_url` testada após deploy
- `observed_result` documentado
- `expected_result` documentado
- `forbidden_result` verificado ausente
- `evidence` registrada

**Sem pós-deploy:**
```
mission_status = INCOMPLETE
pass_gold = false
promotion_allowed = false
```

### 4.4 `observed_final_state_gate`
Para missões de UI/DOM/imagem:

Validação obrigatória via um dos métodos:
- Playwright DOM snapshot
- `document.querySelector()` no console do browser
- Screenshot comparativa
- `fetch`/`curl` no endpoint final

**Sem estado final observado:**
```
pass_gold = false
```

---

## 5. ESTADOS OFICIAIS DE MISSÃO

| Estado | Significado | PASS GOLD permitido? |
|---|---|---|
| `RCA_DONE` | Diagnóstico feito, sem patch | NÃO |
| `PATCHED` | Arquivos alterados, sem validação | NÃO |
| `LOCAL_VALIDATED` | Validação local passou | NÃO |
| `DEPLOYED` | Deploy feito, sem teste final | NÃO |
| `POST_DEPLOY_VERIFIED` | Ambiente final testado e aprovado | SIM |
| `PASS_GOLD` | Todos os gates passaram + evidência real | SIM |
| `INCOMPLETE` | Faltou evidência obrigatória | NÃO |
| `FAIL` | Bug persiste ou gate crítico falhou | NÃO |

---

## 6. REGRA DE ADIÇÃO DE NOVOS RUNTIMES

Qualquer novo arquivo JS adicionado em `frontend/assets/` deve:

1. **Declarar role no topo:**
```js
// VISION CORE RUNTIME ROLE: observer
// OWNER: false
// DOMAINS: [orbit_visual]
// DEPENDS ON: window.__V32_OWNER__
```

2. **Checar `__V32_OWNER__` antes de qualquer ação de execução:**
```js
if (window.__V32_OWNER__) {
  // modo read-only
}
```

3. **Nunca sobrescrever `window.fetch` ou `window.EventSource`**

4. **Nunca registrar listener em `executeBtn` se `__V32_OWNER__` estiver ativo**

5. **Nunca renderizar Mission Report ou emitir PASS GOLD**

---

## 7. REGRESSION TEST PERMANENTE — TechNetGame Marvel Tokon

**Target:** `Marvel Tokon: Fighting Souls`  
**Forbidden:** `images.unsplash.com/photo-1493711662062-fa541adb3fc8`  
**Expected:** `assets/img/game-cover-marvel-tokon-fighting-souls.svg`

Se o DOM final contiver o `forbidden`:
```
mission_status = FAIL
pass_gold = false
```

Se houve alteração local mas sem teste DOM final:
```
mission_status = INCOMPLETE
```

---

## 8. VALIDAÇÃO OBRIGATÓRIA ANTES DE QUALQUER PR

```bash
# JavaScript — verificar sintaxe
node --check frontend/assets/vision-v32-orbit-runtime.js
node --check frontend/assets/vision-v34-enterprise.js
node --check frontend/assets/vision-v44-runtime-consistency.js
node --check frontend/assets/vision-v297-interactions.js
node --check frontend/assets/vision-v298-command-chat.js
node --check frontend/assets/vision-v2910-clean-runtime.js
node --check frontend/assets/vision-v35-telemetry.js

# JavaScript — verificar ausência de padrões proibidos
grep -rn "PASS GOLD confirmado\|doReport(\|buildReport(\|triggerReport(\|new EventSource\|window\.fetch\s*=" frontend/assets/

# Go
cd go-core && go test ./...
cd go-core && go build ./cmd/vision-core
cd go-core && go vet ./...

# Verificar struct duplicada
grep -n "PassSecureOK\|promotion_allowed" go-core/internal/passgold/passgold.go
```

**PR só pode ser mergeado se todos os comandos acima passarem sem erro.**

---

## 9. PROIBIÇÕES ABSOLUTAS (nunca, sob nenhuma circunstância)

```
❌ Dois runtimes com EventSource ativo simultaneamente
❌ window.fetch sobrescrito por qualquer runtime
❌ PASS GOLD sem evidence real
❌ Promotion Allowed = SIM sem diff real
❌ Hermes Vote = aprovado sem RCA documentado
❌ Mission Report com campos "—" e status GOLD
❌ Runtime legado chamando /run-live quando V32 ativo
❌ buildReport/doReport/triggerReport em V34, V44, V297, V298, V2910
❌ Struct Go com campos duplicados
❌ PR mergeado com "testes passaram" sem evidência do output real
```

---

## 10. HISTÓRICO DE VERSÕES DA SPEC

| Versão | Data | Mudança |
|---|---|---|
| V8.0.0 | — | Primeira SPEC de ownership |
| V8.0.1 | — | Adição de report_truth_gate |
| V8.0.2 | — | Adição de post_deploy_completion_gate |
| V8.1.0 | 2026-05-11 | SPEC permanente consolidada — runtime rewrite limpo, proibições absolutas, regression test TechNetGame |

---

*Esta SPEC é lei. Em caso de dúvida entre o código e a SPEC, a SPEC prevalece.*
