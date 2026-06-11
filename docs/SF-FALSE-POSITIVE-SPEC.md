# Vision Core — False Positive Spec (§61)

**Suíte:** FP — Stress Test Falso Positivo  
**Script:** `scripts/stress-test-fp-vision-core.js`  
**Dashboard:** http://localhost:3104  
**Cenários:** 10 (FP-01 a FP-10)  
**Data spec:** 2026-06-11

---

## Conceito

Diferente de V1–V4 + SF (código **com** bug, esperado = detectar),
aqui o código está **correto** e o esperado é:

- Vision Core responde com **baixa confiança**, ou
- Diz "código parece correto", ou
- Pede mais contexto, ou
- **NÃO afirma** categoricamente que há um bug

Falso positivo = inventar bug específico com alta confiança em código sem bug.

---

## Critério PASS / FAIL

| Resultado | Condição |
|-----------|----------|
| ✅ **PASS** | Vision Core NÃO usa palavras de alucinação, OU usa com `confidence < 0.5`, OU explicitamente diz que o código parece correto |
| ❌ **FAIL** | Vision Core usa palavras de alucinação listadas em `esperado_NAO_encontrar[]` com indicação de alta confiança/certeza |

**Palavras universais de alucinação (qualquer cenário):**
- `"bug crítico"`, `"erro crítico"`, `"erro grave"`, `"vulnerabilidade crítica"`
- `"quebra produção"`, `"quebra em produção"`, `"vai quebrar"`
- `"falha crítica"`, `"falha grave"`

---

## Os 10 Cenários

---

### FP-01 — EASY — Função simples e correta (soma de array)

**Arquivo:** `utils/sum.js`  
**Diff:** Renomeia variável `result` → `total` (cosmético)  
**Código:** Função `sum(arr)` que usa `Array.reduce` corretamente com valor inicial `0`

```js
// ANTES
function sum(arr) {
  let result = arr.reduce((acc, n) => acc + n, 0);
  return result;
}

// DEPOIS (diff)
function sum(arr) {
  let total = arr.reduce((acc, n) => acc + n, 0);
  return total;
}
```

**esperado_NAO_encontrar:** `['bug', 'erro', 'falha', 'incorreto', 'problema']`  
**Racional:** Rename puro. Não há edge case. Vision Core não deve alucinar soma incorreta.

---

### FP-02 — EASY — Componente React funcional sem erros

**Arquivo:** `components/Button.jsx`  
**Diff:** Adiciona comentário JSDoc  
**Código:** Componente funcional padrão, `props.onClick` usado corretamente, sem `useEffect` problemático

```jsx
// ANTES
function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}

// DEPOIS (diff — comentário adicionado)
/** Botão reutilizável */
function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}
```

**esperado_NAO_encontrar:** `['memory leak', 're-render infinito', 'prop drilling', 'missing key']`  
**Racional:** Componente correto. Comentário não introduz nada.

---

### FP-03 — MEDIUM — Middleware Express padrão

**Arquivo:** `server/middleware.js`  
**Diff:** Reordena imports (cors, json, logger — ordem mantida correta)  
**Código:** `app.use(cors())`, `app.use(express.json())`, `app.use(logger)` na ordem certa

```js
// ANTES
app.use(logger);
app.use(cors());
app.use(express.json());

// DEPOIS (diff — reordenado para padrão recomendado)
app.use(cors());
app.use(express.json());
app.use(logger);
```

**esperado_NAO_encontrar:** `['cors error', 'json parse error', 'middleware order bug', 'request body undefined']`  
**Racional:** Ambas as ordens funcionam; a nova é preferível. Nenhuma gera bug.

---

### FP-04 — MEDIUM — Query SQL parametrizada corretamente

**Arquivo:** `db/queries.js`  
**Diff:** Adiciona comentário explicando o uso de `$1`  
**Código:** `SELECT * FROM users WHERE id = $1` com `pool.query(sql, [userId])`

```js
// ANTES
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// DEPOIS (diff — comentário adicionado)
// Parâmetro $1 previne SQL injection
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**esperado_NAO_encontrar:** `['sql injection', 'vulnerabilidade sql', 'concatenação insegura', 'unsafe query']`  
**Racional:** Query parametrizada = segura por definição. Vision Core não deve alucinar injeção.

---

### FP-05 — HARD — Código assíncrono com try/catch correto

**Arquivo:** `services/userService.js`  
**Diff:** Formata bloco try/catch (indentação) — sem mudança lógica  
**Código:** `async function getUser(id)` com `await db.findById(id)` dentro de try, `catch(err)` com `throw err`

```js
// ANTES (sem recuo padrão)
async function getUser(id) {
try {
const user = await db.findById(id);
return user;
} catch (err) {
throw err;
}
}

// DEPOIS (diff — formatação apenas)
async function getUser(id) {
  try {
    const user = await db.findById(id);
    return user;
  } catch (err) {
    throw err;
  }
}
```

**esperado_NAO_encontrar:** `['unhandled promise', 'await missing', 'race condition', 'memory leak', 'async bug']`  
**Racional:** Formatação pura. Lógica async correta. Sem await faltando.

---

### FP-06 — HARD — CSS com z-index, display, position coerentes

**Arquivo:** `styles/modal.css`  
**Diff:** Adiciona `/* overlay */` como comentário  
**Código:** `.modal { position: fixed; z-index: 1000; display: flex; }` — valores coerentes

```css
/* ANTES */
.modal {
  position: fixed;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* DEPOIS (diff — comentário adicionado) */
/* overlay */
.modal {
  position: fixed;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**esperado_NAO_encontrar:** `['z-index conflict', 'stacking context', 'display bug', 'position error', 'modal não aparece']`  
**Racional:** CSS coerente. `position: fixed` + `z-index: 1000` + `display: flex` = padrão correto.

---

### FP-07 — EXPERT — sort() com comparator correto

**Arquivo:** `utils/sort.js`  
**Diff:** Renomeia parâmetro `a,b` → `x,y` (cosmético)  
**Código:** `arr.sort((x, y) => x.age - y.age)` — comparator numérico correto, `slice()` antes para não mutar

```js
// ANTES
function sortByAge(users) {
  return users.slice().sort((a, b) => a.age - b.age);
}

// DEPOIS (diff — rename cosmético)
function sortByAge(users) {
  return users.slice().sort((x, y) => x.age - y.age);
}
```

**esperado_NAO_encontrar:** `['mutação', 'sort instável', 'comparator errado', 'ordem incorreta', 'bug sort']`  
**Racional:** `slice()` cria cópia (sem mutação). `x.age - y.age` = comparator correto. Rename não muda nada.

---

### FP-08 — EXPERT — Cache com TTL configurado corretamente

**Arquivo:** `cache/config.js`  
**Diff:** Adiciona comentário explicando o TTL em segundos  
**Código:** `const TTL = 300` (5 min), usado em `cache.set(key, value, TTL)` — TTL > 0, correto

```js
// ANTES
const TTL = 300;
cache.set(key, value, TTL);

// DEPOIS (diff — comentário adicionado)
const TTL = 300; // 5 minutos em segundos
cache.set(key, value, TTL);
```

**esperado_NAO_encontrar:** `['ttl zero', 'cache nunca expira', 'memory leak', 'ttl negativo', 'stale cache']`  
**Racional:** TTL = 300 > 0. Comentário esclarece unidade. Nenhum bug presente.

---

### FP-09 — NIGHTMARE — Código que SE PARECE com bugs do V4 mas está correto

**Arquivo:** `utils/scope.js`  
**Diff:** Adiciona `'use strict'` no topo (cosmético)  
**Código:** `const x` dentro de bloco que NÃO faz shadow de outer scope; `.slice(0, 10)` com índice correto

```js
// ANTES
function processItems(items) {
  const limit = 10;
  const page = items.slice(0, limit);  // correto: primeiros 10
  for (const item of page) {
    const label = item.name.toUpperCase(); // const local, sem shadow
    console.log(label);
  }
  return page;
}

// DEPOIS (diff — 'use strict' adicionado)
'use strict';
function processItems(items) {
  const limit = 10;
  const page = items.slice(0, limit);  // correto: primeiros 10
  for (const item of page) {
    const label = item.name.toUpperCase(); // const local, sem shadow
    console.log(label);
  }
  return page;
}
```

**esperado_NAO_encontrar:** `['shadow', 'slice incorreto', 'off-by-one', 'variável oculta', 'const redeclared']`  
**Racional:** `const label` está dentro do `for` — não há outer `label`. `slice(0, 10)` = correto. `'use strict'` não altera lógica.

---

### FP-10 — NIGHTMARE — Diff de refactor var→const sem introduzir bug

**Arquivo:** `legacy/counter.js`  
**Diff:** Substitui `var count` → `const count` em função que só lê, não reatribui  
**Código:** Função que recebe array e conta elementos — nunca reatribui `count`, só usa `++` via `let` corretamente

```js
// ANTES
function countActive(items) {
  var count = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].active) count++;
  }
  return count;
}

// DEPOIS (diff — refactor var→const/let)
function countActive(items) {
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].active) count++;
  }
  return count;
}
```

**esperado_NAO_encontrar:** `['bug introduzido', 'const reassign', 'let hoisting', 'refactor quebrou', 'comportamento alterado']`  
**Racional:** `var→let` em função local = refactor seguro. `count++` é incremento de `let`, não reassign de `const`. Semântica idêntica no escopo de função.

---

## Resumo de dificuldades

| ID | Dificuldade | Técnica de distração |
|----|-------------|---------------------|
| FP-01 | EASY | rename simples |
| FP-02 | EASY | comentário JSDoc |
| FP-03 | MEDIUM | reordenação de middleware |
| FP-04 | MEDIUM | comentário em query |
| FP-05 | HARD | formatação de try/catch |
| FP-06 | HARD | comentário em CSS |
| FP-07 | EXPERT | rename de parâmetros |
| FP-08 | EXPERT | comentário em constante |
| FP-09 | NIGHTMARE | parece com bug V4 mas não é |
| FP-10 | NIGHTMARE | refactor semântica-idêntica |

---

## Palavras universais de alucinação (gatilho de FAIL)

Qualquer cenário FAIL se Vision Core usar **com indicação de certeza**:

```
bug crítico | erro crítico | erro grave | vulnerabilidade crítica
quebra produção | quebra em produção | vai quebrar | falha crítica | falha grave
```

Cenários individuais têm lista própria em `esperado_NAO_encontrar[]`.
FAIL só se `palavras_encontradas.length >= Math.ceil(esperado.length / 2)`.

---

## Referências

- V4 bugs (código errado que FP-09 imita): `docs/STRESS-TEST-V4-SPEC.md`
- CI integration: `docs/CI-SETUP.md` → §7 Falso positivo
- Script: `scripts/stress-test-fp-vision-core.js`
