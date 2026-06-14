# §89 — TUTORIAL INTERATIVO + MISSÕES FREE + SF LANDING
## Spec executada | HEAD: 0678db5 | EB: v5.9.5-s89-tutorial-quota | CF Pages: 3b632ef7

---

## CONTEXTO

HEAD anterior: 481a03f (§88 OAuth fix OAUTH_REDIRECT_BASE)
EB: Green (v5.9.4-s88-oauth-google-github)
CF Pages: live (§88)

---

## O QUE FOI IMPLEMENTADO

### BLOCO 1 — Tutorial interativo 12 passos

**Arquivos:** `frontend/index.html` + `frontend/assets/vision-core-bundle.js`

**HTML** adicionado antes de `</body>` em `index.html`:
```html
<div id="vcTutorialOverlay" class="vc-tutorial-overlay" aria-hidden="true">
  <div id="vcTutorialSpotlight" class="vc-tutorial-spotlight"></div>
  <div id="vcTutorialBalloon" class="vc-tutorial-balloon" role="dialog" aria-live="polite">
    <div class="vc-tutorial-step-counter" id="vcTutorialCounter">1 / 12</div>
    <div class="vc-tutorial-title" id="vcTutorialTitle"></div>
    <div class="vc-tutorial-text" id="vcTutorialText"></div>
    <div class="vc-tutorial-actions">
      <button class="vc-tutorial-btn secondary" id="vcTutorialPrev">← Anterior</button>
      <button class="vc-tutorial-btn primary" id="vcTutorialNext">Próximo →</button>
      <button class="vc-tutorial-btn cta hidden" id="vcTutorialCta">CRIAR CONTA GRÁTIS</button>
    </div>
    <div class="vc-tutorial-footer">
      <button class="vc-tutorial-skip" id="vcTutorialSkip">Pular tutorial</button>
      <label class="vc-tutorial-noshowagain">
        <input type="checkbox" id="vcTutorialNoShow"> Não exibir novamente
      </label>
    </div>
  </div>
</div>
```

**CSS** adicionado no `<style>` de `index.html`:
```css
.vc-tutorial-overlay{position:fixed;inset:0;z-index:99999;pointer-events:none;transition:opacity .3s;display:none}
.vc-tutorial-overlay.active{pointer-events:auto}
.vc-tutorial-spotlight{position:fixed;border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,.72);transition:all .35s cubic-bezier(.4,0,.2,1);z-index:100000;pointer-events:none}
.vc-tutorial-balloon{position:fixed;z-index:100001;background:#0f172a;border:1.5px solid #6366f1;border-radius:14px;padding:22px 24px 16px;max-width:340px;min-width:260px;box-shadow:0 8px 40px rgba(99,102,241,.35);transition:all .3s cubic-bezier(.4,0,.2,1)}
.vc-tutorial-step-counter{font-size:10px;color:#6366f1;font-weight:700;letter-spacing:.1em;margin-bottom:8px;text-transform:uppercase}
.vc-tutorial-title{font-size:15px;font-weight:700;color:#f1f5f9;margin-bottom:10px;line-height:1.4}
.vc-tutorial-text{font-size:13px;color:#94a3b8;line-height:1.6;margin-bottom:16px}
.vc-tutorial-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.vc-tutorial-btn{padding:7px 14px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .2s}
.vc-tutorial-btn.primary{background:#6366f1;color:#fff}
.vc-tutorial-btn.cta{background:#0f4;color:#000;font-weight:700}
.vc-tutorial-btn.hidden{display:none}
.vc-tutorial-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.vc-tutorial-skip{background:none;border:none;color:#475569;font-size:11px;cursor:pointer;text-decoration:underline;padding:0}
.vc-tutorial-noshowagain{display:flex;align-items:center;gap:5px;font-size:11px;color:#475569;cursor:pointer}
.vc-tutorial-noshowagain input{cursor:pointer;accent-color:#6366f1}
```

**JS** adicionado no final de `bundle.js` (IIFE separado, após o IIFE principal):

```javascript
(function initTutorial() {
  try { if (localStorage.getItem('vc_tutorial_done') === '1') return; } catch(e) {}
  // 12 steps com target, title, text, pos (top|bottom), cta (bool)
  // ...ver bundle.js linha ~8606+
  // Aparece após 1500ms
  // "Não exibir mais" → localStorage.setItem('vc_tutorial_done', '1')
  // window.vcStartTutorial() → dev helper para reiniciar
})();
```

**12 Steps definidos:**
| # | id | target | pos |
|---|----|----|-----|
| 1 | welcome | `.premium-logo` | bottom |
| 2 | plans | `#plansBox` | top |
| 3 | signin | `#openAuthBtn2` | bottom |
| 4 | mission | `#v298Prompt` | top |
| 5 | execute | `#v298RunBtn` | top |
| 6 | pipeline | `.mini-pipeline` | bottom |
| 7 | diff | `#diff` | top |
| 8 | passgold | `#score` | top |
| 9 | github | `#githubPanel` | top |
| 10 | ai | `#aiApiVault` | top |
| 11 | sf | `[data-open-sf-page]` | bottom |
| 12 | finish | `#openAuthBtn2` | bottom (cta: true) |

**Commit:** `a4baa34` — `feat(tutorial): interactive onboarding HTML/CSS + SF landing card — B1/B4 §89`
**Commit:** `c2e3741` — `feat(tutorial): 12-step onboarding tour + real quota badge — B1/B3 §89`

---

### BLOCO 2 — Quota de missões FREE enforced (server.js)

**Arquivo:** `backend/server.js`

**Adicionado antes do bloco COPILOT:**

```javascript
/* ── §89 MISSION QUOTA — FREE = 5/mês ── */
const MISSION_LOG_PATH = path.join(DB_ROOT, 'mission-log.json');

function getMissionCount(userId) {
  // Conta missões do userId nos últimos 30 dias em mission-log.json
}

function logMission(userId, type) {
  // Persiste entrada em mission-log.json, mantém 90 dias
}

function checkMissionQuota(req, res, next) {
  // Middleware: unauthenticated → next()
  // PRO/ENTERPRISE → next()
  // FREE ≥ 5 missões/30d → 429 { error: 'mission_quota_exceeded', used, limit }
  // FREE < 5 → logMission() + next()
}

app.get('/api/mission/quota', (req, res) => {
  // Unauthenticated: { plan:'free', used:0, limit:5, remaining:5 }
  // PRO/ENT: { unlimited:true }
  // FREE autenticado: { used, limit, remaining }
});
```

**Middleware aplicado em:**
- `app.all('/api/copilot', checkMissionQuota, async ...)`
- `app.all('/api/run-live', checkMissionQuota, async ...)`

**Env var:** `FREE_MISSION_LIMIT` (default: `5`)

**Commit:** `0678db5` — `feat(quota): FREE plan 5 missions/month enforced + /api/mission/quota — B2 §89`

---

### BLOCO 3 — Badge real de quota no cockpit (bundle.js)

**Arquivo:** `frontend/assets/vision-core-bundle.js`

Adicionado dentro do IIFE principal, antes do fechamento `})()`:

```javascript
(function loadMissionQuota() {
  // Chama GET /api/mission/quota com token se disponível
  // Atualiza #v299QuotaBadge:
  //   - unlimited → 'PRO/ilimitado'
  //   - remaining > 1 → 'N missões restantes' (.v299-quota-ok)
  //   - remaining === 1 → warn (.v299-quota-warn)
  //   - remaining === 0 → 'Limite atingido — upgrade' (.v299-quota-full)
})();
```

**Commit:** `c2e3741`

---

### BLOCO 4 — SF Landing card (index.html)

**Arquivo:** `frontend/index.html`

Inserido antes de `<div class="panel" id="timeline">`:

```html
<div class="panel sf-landing-card" id="sfLandingCard">
  <h2>◈ SOFTWARE FACTORY</h2>
  <p>Crie projetos do zero com 8 módulos de IA...</p>
  <div class="sf-landing-modules">
    <!-- 8 módulos 01-08 -->
  </div>
  <button class="btn" type="button" data-open-sf-page>◈ ABRIR SOFTWARE FACTORY</button>
</div>
```

**CSS:**
```css
.sf-landing-card h2{color:#a78bfa;margin-bottom:8px}
.sf-landing-modules{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.sf-landing-mod{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px 12px}
.sf-mod-num{font-size:10px;font-weight:700;color:#6366f1;background:#1e1b4b;padding:2px 6px;border-radius:4px}
```

**Commit:** `a4baa34`

---

## DEPLOY

| Destino | Versão | Status |
|---------|--------|--------|
| Elastic Beanstalk | `v5.9.5-s89-tutorial-quota` | ✅ Green |
| CF Pages | `3b632ef7.visioncoreai.pages.dev` | ✅ live |

**Scripts:**
- EB: `python _deploy89_eb.py`
- CF: `bash bin/deploy-pages.sh "§89: ..."`

---

## VERIFICAÇÃO

```bash
# Quota endpoint
curl -s http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com/api/mission/quota
# → {"plan":"free","used":0,"limit":5,"remaining":5,"anti_stub":true,...}

# CF Pages — elementos presentes
curl -sk https://visioncoreai.pages.dev/ | grep -o "vcTutorialOverlay\|sfLandingCard\|sf-landing-modules"
# → vcTutorialOverlay, sfLandingCard, sf-landing-modules

# Dev: reiniciar tutorial no console do browser
window.vcStartTutorial()
```

---

## COMMITS

| Hash | Descrição |
|------|-----------|
| `a4baa34` | feat(tutorial): interactive onboarding HTML/CSS + SF landing card — B1/B4 §89 |
| `c2e3741` | feat(tutorial): 12-step onboarding tour + real quota badge — B1/B3 §89 |
| `0678db5` | feat(quota): FREE plan 5 missions/month enforced + /api/mission/quota — B2 §89 |

**Tag:** `s89-done`

---

## PENDÊNCIAS §90+

- Testar fluxo completo: 5 missões FREE → 6ª retorna 429 → badge mostra "Limite atingido"
- Upgrade flow: clicar badge "Limite atingido" → abrir modal billing → checkout Stripe
- Tutorial: analytics de quantos completam vs pulam (via `/api/memory/feedback` ou endpoint novo)
- OAuth SSO (Okta/SAML) — requer ENTERPRISE tier
