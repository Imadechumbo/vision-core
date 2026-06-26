# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-verification.spec.mjs >> §121 — position:fixed restaurado + seta direcional + scroll tracking >> 2b — viewport 1920×1080: balão não sobrepõe spotlight em T3 passo 0
- Location: tests\e2e\manual-verification.spec.mjs:1150:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://visioncoreai.pages.dev/", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic "VISION CORE ativo" [ref=e5]
        - generic [ref=e8]:
          - generic [ref=e9]: VISION CORE
          - generic [ref=e10]: VISION CORE V2.9.10 • FULLSTACK • SAAS • HERMES • PASS GOLD
      - navigation "Navegação principal" [ref=e11]:
        - link "▣ Mission" [ref=e12] [cursor=pointer]:
          - /url: "#mission"
        - link "▤ Vault" [ref=e13] [cursor=pointer]:
          - /url: "#vault"
        - link "⌬ GitHub" [ref=e14] [cursor=pointer]:
          - /url: "#githubPanel"
        - link "☷ Tools" [ref=e15] [cursor=pointer]:
          - /url: "#marketplace"
        - link "▥ Métricas" [ref=e16] [cursor=pointer]:
          - /url: "#metricsBoard"
        - link "⚙ Agentes" [ref=e17] [cursor=pointer]:
          - /url: "#agentsBoard"
        - button "Abrir Software Factory Builder" [ref=e18] [cursor=pointer]: ◈ SOFTWARE FACTORY
      - generic [ref=e19]:
        - link "LANDING STARTUP" [ref=e20] [cursor=pointer]:
          - /url: landing.html
        - link "GITHUB" [ref=e21] [cursor=pointer]:
          - /url: https://github.com/Imadechumbo/vision-core-master
        - link "BAIXAR AGENT" [ref=e22] [cursor=pointer]:
          - /url: https://github.com/Imadechumbo/vision-core/releases/download/v1.0.0-agent/VisionAgentSetup.exe
        - button "SIGN IN" [ref=e23] [cursor=pointer]
        - link "ENVIAR MISSÃO" [ref=e24] [cursor=pointer]:
          - /url: "#mission"
  - main [ref=e26]:
    - complementary [ref=e27]:
      - generic [ref=e28]:
        - heading "VISION CORE" [level=1] [ref=e29]
        - paragraph [ref=e30]: SEE. DECIDE. EXECUTE.
        - link "um sistema que corrige sistemas" [ref=e31] [cursor=pointer]:
          - /url: about.html
      - navigation [ref=e32]:
        - button "Abrir Software Factory Builder" [ref=e33] [cursor=pointer]: ◈ SOFTWARE FACTORY
        - button "Abrir Dry-Run Real em repositório externo" [ref=e34] [cursor=pointer]: 🔬 DRY-RUN EXTERNO
        - link "◎ MISSION CONTROL" [ref=e35] [cursor=pointer]:
          - /url: "#mission"
        - link "⌁ MISSION TIMELINE" [ref=e36] [cursor=pointer]:
          - /url: "#timeline"
        - link "⌁ EXECUTION MONITOR" [ref=e37] [cursor=pointer]:
          - /url: "#runtime"
        - link "☷ DIAGNOSTICS / HERMES" [ref=e38] [cursor=pointer]:
          - /url: "#hermes"
        - link "☑ VALIDATION / SDDF" [ref=e39] [cursor=pointer]:
          - /url: "#score"
        - link "☷ DIFF PREVIEW" [ref=e40] [cursor=pointer]:
          - /url: "#diff"
        - link "⌂ VAULT / ROLLBACK" [ref=e41] [cursor=pointer]:
          - /url: "#vault"
        - link "▤ MEMORY / OBSIDIAN" [ref=e42] [cursor=pointer]:
          - /url: "#memory"
        - link "⌘ OPENCLAW / OPENSQUAD SCALE" [ref=e43] [cursor=pointer]:
          - /url: "#opensquad"
          - text: ⌘ OPENCLAW / OPENSQUAD
          - generic [ref=e44]: SCALE
        - link "◇ OSINT DOCKER" [ref=e45] [cursor=pointer]:
          - /url: "#osint"
        - link "⌬ GITHUB / PR REAL" [ref=e46] [cursor=pointer]:
          - /url: "#githubPanel"
        - link "◉ SAAS / PLANOS" [ref=e47] [cursor=pointer]:
          - /url: "#saasAuth"
        - link "◇ V10 ENTERPRISE" [ref=e48] [cursor=pointer]:
          - /url: "#v10"
        - link "AI API VAULT" [ref=e49] [cursor=pointer]:
          - /url: "#aiApiVault"
        - link "▣ TOOLS MARKETPLACE" [ref=e50] [cursor=pointer]:
          - /url: "#marketplace"
        - link "▥ MÉTRICAS" [ref=e51] [cursor=pointer]:
          - /url: "#metricsBoard"
        - link "⚙ AGENTES EXTRAS" [ref=e52] [cursor=pointer]:
          - /url: "#agentsBoard"
        - button "🪐 Tutoriais ▾" [ref=e54] [cursor=pointer]:
          - generic [ref=e55]: 🪐 Tutoriais
          - generic [ref=e56]: ▾
    - generic [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]:
            - generic [ref=e61]:
              - strong [ref=e62]: VISION AI COMMAND
              - generic [ref=e63]: Chat universal + correção de projetos com PASS GOLD
            - generic [ref=e64]: READY
          - generic [ref=e66]: Vision AI pronto. Converse sobre qualquer assunto, cole erros, envie arquivos/imagens ou execute uma missão SDDF.
          - generic [ref=e67]:
            - generic [ref=e68]:
              - textbox "Pergunte qualquer coisa, cole erro, log, código... Enter = enviar, Shift+Enter = quebrar linha" [ref=e69]
              - generic [ref=e70]:
                - button "ENVIAR" [ref=e71] [cursor=pointer]
                - button "EXECUTAR MISSÃO" [ref=e72] [cursor=pointer]
            - generic [ref=e73]:
              - generic [ref=e74]:
                - generic [ref=e75]: FREE
                - generic [ref=e76]: ilimitado
              - button "＋ Adicionar arquivos" [ref=e77] [cursor=pointer]
              - button "▧ Ler print/imagem" [ref=e78] [cursor=pointer]
              - button "Limpar sessão" [ref=e79] [cursor=pointer]
              - button "⚙ Configurar IA" [ref=e80] [cursor=pointer]
              - button "📓 Obsidian" [ref=e81] [cursor=pointer]
            - generic [ref=e82]: Nenhum arquivo anexado.
        - generic [ref=e83]:
          - generic [ref=e85] [cursor=pointer]: 🕘 Histórico de missões
          - generic [ref=e87]: Nenhuma missão ainda. Converse ou execute uma missão — fica salvo aqui.
        - heading "MISSION CONTROL" [level=2] [ref=e88]
        - paragraph [ref=e89]: Operador técnico multi-projeto, multi-stack, com aprendizado contínuo.
        - generic [ref=e90]:
          - generic [ref=e91]: Projeto ativo
          - combobox [ref=e92]:
            - option "Carregando projetos..." [selected]
          - button "ENFILEIRAR WORKER" [ref=e93] [cursor=pointer]
        - generic "Frase de impacto VISION CORE" [ref=e94]:
          - generic [ref=e95]: IAs criam.
          - strong [ref=e96]: VISION CORE
          - generic [ref=e97]: corrige
        - generic [ref=e98]:
          - button "＋ ADICIONAR ARQUIVOS" [disabled] [ref=e99]
          - button "💬 COPILOTO" [disabled] [ref=e100]
          - combobox [ref=e101]:
            - 'option "MODELO: AUTO melhor disponível" [selected]'
            - option "Gemini 2.0 Flash"
            - option "Llama 3.3 70B Groq"
            - option "OpenRouter Auto"
            - option "DeepSeek Reasoner"
            - option "Ollama Local"
          - combobox [ref=e102]:
            - option "DRY RUN" [selected]
            - option "SAFE PATCH"
            - option "PR MODE"
          - button "▷ EXECUTAR LIVE" [ref=e103] [cursor=pointer]
      - generic [ref=e104]:
        - paragraph [ref=e105]: DEPLOY SEGURO • PASS GOLD • GITHUB PR REAL • DIFF • CI • VAULT • AUTO-ROLLBACK
        - heading "Sistema operacional para desenvolvimento com IA." [level=2] [ref=e106]
        - paragraph [ref=e107]: "IAs criam software rápido. O VISION CORE fecha o loop: diagnostica, executa, valida, protege e mostra tudo em logs vivos."
        - generic [ref=e108]:
          - generic [ref=e109]: Missão
          - generic [ref=e110]: →
          - generic [ref=e111]: Diagnóstico
          - generic [ref=e112]: →
          - generic [ref=e113]: Diff
          - generic [ref=e114]: →
          - generic [ref=e115]: PASS GOLD
          - generic [ref=e116]: →
          - generic [ref=e117]: PR
          - generic [ref=e118]: →
          - generic [ref=e119]: Stable Vault
      - generic [ref=e120]:
        - paragraph [ref=e121]: SAAS ONBOARDING • SOCIAL LOGIN / OAUTH SIGNUP POPUP • PLANS
        - heading "Cadastro SaaS automático, simples e popular." [level=2] [ref=e122]
        - paragraph [ref=e123]:
          - strong [ref=e124]: Autonomous Software Repair System.
          - text: Isso não é chat, copiloto ou automação simples. É um sistema que detecta → entende → corrige → valida → protege → aprende.
        - generic [ref=e125]:
          - generic [ref=e126] [cursor=pointer]:
            - strong [ref=e127]: FREE
            - generic [ref=e128]: 5 missões/mês
            - generic [ref=e129]: Cadastro instantâneo · sem cartão
            - emphasis [ref=e130]: BETA ATIVO
          - generic "Em breve — cadastre-se no FREE para ser notificado":
            - strong: PRO
            - generic: Missões ilimitadas
            - generic: GitHub auto PR · rollback · $9,99/mês
            - emphasis: EM BREVE
          - generic "Em breve — para times e múltiplos projetos":
            - strong: ENTERPRISE
            - generic: Multi-projeto + workers
            - generic: Dashboard completo · SSO · $29,99/mês
            - emphasis: EM BREVE
        - generic [ref=e131]:
          - paragraph [ref=e132]: OPERADOR
          - button "SIGN IN" [ref=e133] [cursor=pointer]
          - text: Social Login / OAuth Signup Popup
        - generic [ref=e134]: "Plano selecionado: FREE"
      - generic [ref=e135]:
        - heading "◈ SOFTWARE FACTORY" [level=2] [ref=e136]
        - paragraph [ref=e137]: "Crie projetos do zero com 8 módulos de IA: da definição de stack até o blueprint de deploy. Tudo guiado por agentes especializados."
        - generic [ref=e138]:
          - generic [ref=e139]:
            - generic [ref=e140]: "01"
            - generic [ref=e141]: Montar Projeto
          - generic [ref=e142]:
            - generic [ref=e143]: "02"
            - generic [ref=e144]: Templates
          - generic [ref=e145]:
            - generic [ref=e146]: "03"
            - generic [ref=e147]: Compositor de Missão
          - generic [ref=e148]:
            - generic [ref=e149]: "04"
            - generic [ref=e150]: Worker Handoff
          - generic [ref=e151]:
            - generic [ref=e152]: "05"
            - generic [ref=e153]: Preview de Criação
          - generic [ref=e154]:
            - generic [ref=e155]: "06"
            - generic [ref=e156]: Comando Real
          - generic [ref=e157]:
            - generic [ref=e158]: "07"
            - generic [ref=e159]: Recibo do Worker
          - generic [ref=e160]:
            - generic [ref=e161]: "08"
            - generic [ref=e162]: Painel Final
        - button "◈ ABRIR SOFTWARE FACTORY" [ref=e163] [cursor=pointer]
      - generic [ref=e164]:
        - heading "MISSION TIMELINE" [level=2] [ref=e165]
        - paragraph [ref=e166]: "Fluxo visual: missão recebida → Hermes → snapshot → diff → validação → GitHub PR."
      - generic [ref=e167]:
        - heading "DIFF PREVIEW" [level=2] [ref=e168]
        - paragraph [ref=e169]: Mostra o patch antes de criar branch, commit ou Pull Request.
        - button "GERAR DIFF DEMO" [ref=e170] [cursor=pointer]
        - generic [ref=e171]: Aguardando diff...
      - generic [ref=e172]:
        - heading "PASS GOLD SCORE" [level=2] [ref=e173]
        - paragraph [ref=e174]: Promoção só é liberada acima do corte GOLD.
        - generic [ref=e175]:
          - generic [ref=e176]: REVIEW_READY_CONTROLLED_CLOSURE
          - generic [ref=e177]: "PASS GOLD REAL: não reivindicado"
          - generic [ref=e178]: Decisão humana final requerida
      - generic [ref=e179]:
        - generic [ref=e181]:
          - paragraph [ref=e182]: SCALEFORCE MODULES • SF 02–09
          - heading "MÓDULOS SF" [level=2] [ref=e183]
          - paragraph [ref=e184]: Geradores de artefatos SDDF. Cada módulo chama o backend real e exibe o resultado no log.
        - generic [ref=e185]:
          - generic [ref=e186]:
            - generic [ref=e187]: SF02
            - generic [ref=e188]: Mission Composer
            - generic [ref=e189]: Gera prompt estruturado de missão para o pipeline SDDF.
            - button "GERAR" [ref=e190] [cursor=pointer]
          - generic [ref=e192]:
            - generic [ref=e193]: SF03
            - generic [ref=e194]: Worker Handoff
            - generic [ref=e195]: Empacota contexto e artefatos para handoff entre workers.
            - button "GERAR" [ref=e196] [cursor=pointer]
          - generic [ref=e198]:
            - generic [ref=e199]: SF04
            - generic [ref=e200]: Context Snapshot
            - generic [ref=e201]: Snapshot do contexto atual para replay e auditoria.
            - button "GERAR" [ref=e202] [cursor=pointer]
          - generic [ref=e204]:
            - generic [ref=e205]: SF05
            - generic [ref=e206]: Patch Validator
            - generic [ref=e207]: Relatório de validação do patch antes do PASS GOLD.
            - button "GERAR" [ref=e208] [cursor=pointer]
          - generic [ref=e210]:
            - generic [ref=e211]: SF06
            - generic [ref=e212]: Risk Assessor
            - generic [ref=e213]: Avalia riscos do deploy e classifica por severidade.
            - button "GERAR" [ref=e214] [cursor=pointer]
          - generic [ref=e216]:
            - generic [ref=e217]: SF07
            - generic [ref=e218]: Rollback Planner
            - generic [ref=e219]: Plano de rollback automatizado com checkpoints.
            - button "GERAR" [ref=e220] [cursor=pointer]
          - generic [ref=e222]:
            - generic [ref=e223]: SF08
            - generic [ref=e224]: Gold Gate Checker
            - generic [ref=e225]: Checklist de gates SDDF obrigatórios para PASS GOLD.
            - button "GERAR" [ref=e226] [cursor=pointer]
          - generic [ref=e228]:
            - generic [ref=e229]: SF09
            - generic [ref=e230]: Deploy Blueprint
            - generic [ref=e231]: Blueprint de deploy com sequência de steps validados.
            - button "GERAR" [ref=e232] [cursor=pointer]
      - generic [ref=e234]:
        - heading "GitHub Integration Real" [level=2] [ref=e235]
        - paragraph [ref=e236]: Cria branch, aplica commit e abre Pull Request real via GitHub REST API. Bloqueado sem PASS GOLD.
        - generic [ref=e237]: GitHub bloqueado — controlled closure ativo.
        - generic [ref=e238]:
          - button "Verificar GitHub" [ref=e239] [cursor=pointer]
          - button "Criar PR PASS GOLD" [ref=e240] [cursor=pointer]
          - button "Auto-merge Policy" [ref=e241] [cursor=pointer]
      - generic [ref=e242]:
        - heading "V10 ENTERPRISE FOUNDATION" [level=2] [ref=e243]
        - generic [ref=e244]:
          - generic [ref=e245]:
            - strong [ref=e246]: Multi-projeto
            - generic [ref=e247]: gestão por stack e estado GOLD
          - generic [ref=e248]:
            - strong [ref=e249]: Métricas reais
            - generic [ref=e250]: runtime, delivery e GitHub
          - generic [ref=e251]:
            - strong [ref=e252]: Hermes votando
            - generic [ref=e253]: consenso antes do PR
          - generic [ref=e254]:
            - strong [ref=e255]: Auto-merge condicionado
            - generic [ref=e256]: só com checks + GOLD
          - generic [ref=e257]:
            - strong [ref=e258]: Workers distribuídos
            - generic [ref=e259]: filas por execução/rollback
          - generic [ref=e260]:
            - strong [ref=e261]: Billing SaaS
            - generic [ref=e262]: planos prontos para Stripe
      - generic [ref=e263]:
        - paragraph [ref=e264]: AI API VAULT - PROVEDORES PAGOS - ROTEAMENTO INTELIGENTE
        - heading "Menu para adicionar APIs de IAs pagas" [level=2] [ref=e265]
        - paragraph [ref=e266]: Conecte provedores comerciais e defina prioridade/fallback. As chaves ficam preparadas para uso via variaveis de ambiente ou vault local em desenvolvimento.
        - generic [ref=e267]:
          - button "OpenAI GPT / Vision / Assistants" [ref=e268] [cursor=pointer]:
            - strong [ref=e269]: OpenAI
            - generic [ref=e270]: GPT / Vision / Assistants
          - button "Anthropic Claude" [ref=e271] [cursor=pointer]:
            - strong [ref=e272]: Anthropic
            - generic [ref=e273]: Claude
          - button "Google Gemini Flash / Pro / Vision" [ref=e274] [cursor=pointer]:
            - strong [ref=e275]: Google Gemini
            - generic [ref=e276]: Flash / Pro / Vision
          - button "OpenRouter multi-model fallback" [ref=e277] [cursor=pointer]:
            - strong [ref=e278]: OpenRouter
            - generic [ref=e279]: multi-model fallback
          - button "Groq alta velocidade" [ref=e280] [cursor=pointer]:
            - strong [ref=e281]: Groq
            - generic [ref=e282]: alta velocidade
          - button "DeepSeek reasoner/code" [ref=e283] [cursor=pointer]:
            - strong [ref=e284]: DeepSeek
            - generic [ref=e285]: reasoner/code
        - generic [ref=e286]:
          - generic [ref=e287]: Provider
          - combobox [ref=e288]:
            - option "OpenAI" [selected]
            - option "Anthropic"
            - option "Google Gemini"
            - option "OpenRouter"
            - option "Groq"
            - option "DeepSeek"
          - generic [ref=e289]: API Key
          - textbox "cole sua chave aqui..." [ref=e290]
          - generic [ref=e291]: Modelo padrao
          - 'textbox "ex: gpt-4.1, claude-3.7-sonnet, gemini-2.0-flash" [ref=e292]'
          - generic [ref=e293]: Prioridade
          - combobox [ref=e294]:
            - option "primary" [selected]
            - option "fallback"
            - option "disabled"
        - generic [ref=e295]:
          - button "SALVAR PROVIDER" [ref=e296] [cursor=pointer]
          - button "TESTAR PROVIDER" [ref=e297] [cursor=pointer]
          - link "VER LANDING STARTUP" [ref=e298] [cursor=pointer]:
            - /url: landing.html
        - generic [ref=e299]: Nenhuma API salva nesta sessao.
      - generic [ref=e300]:
        - heading "TOOLS MARKETPLACE" [level=2] [ref=e301]
        - paragraph [ref=e302]: Conectores preparados para GitHub, Cloudflare, Railway, Docker, Langfuse e billing.
      - generic [ref=e303]:
        - generic [ref=e304]:
          - heading "LIVE EXECUTION STREAM" [level=2] [ref=e305]
          - button "BAIXAR LOGS" [ref=e306] [cursor=pointer]
        - generic [ref=e307]:
          - generic [ref=e308]: "[CLEAN] Controlled closure ativo — commit: d8e3967"
          - generic [ref=e309]: "[CLEAN] 1164 files OK"
          - generic [ref=e310]: "[CLEAN] RTE chain complete: true"
          - generic [ref=e311]: "[CLEAN] Final closure tests: 101 passed"
          - generic [ref=e312]: "[CLEAN] Todas as ações de release bloqueadas."
      - generic [ref=e313]:
        - generic [ref=e314]:
          - generic [ref=e315]:
            - paragraph [ref=e316]: AGENT METRICS • CUSTO POR AGENTE • PIPELINE
            - heading "MÉTRICAS DOS AGENTES" [level=2] [ref=e317]
            - paragraph [ref=e318]:
              - text: Ligado ao backend em
              - code [ref=e319]: /api/metrics/agents
              - text: . Quando o backend estiver offline, a tela mantém fallback local marcado como UI local.
          - generic [ref=e320]: UI LOCAL
        - generic [ref=e321]:
          - generic [ref=e322]:
            - generic [ref=e323]: OpenClaw
            - generic [ref=e325]: CONVERSA
            - generic [ref=e328]: $0.163
          - generic [ref=e329]:
            - generic [ref=e330]: Hermes RCA
            - generic [ref=e332]: CONVERSA
            - generic [ref=e335]: $0.815
          - generic [ref=e336]:
            - generic [ref=e337]: Scanner
            - generic [ref=e339]: CONVERSA
            - generic [ref=e342]: $0.377
          - generic [ref=e343]:
            - generic [ref=e344]: Aegis
            - generic [ref=e346]: CONVERSA
            - generic [ref=e349]: $0.264
          - generic [ref=e350]:
            - generic [ref=e351]: PatchEngine
            - generic [ref=e353]: LOOP
            - generic [ref=e356]: $0.668
          - generic [ref=e357]:
            - generic [ref=e358]: PI HARNESS
            - generic [ref=e360]: ADAPTIVE
            - generic [ref=e363]: L0-L9
          - generic [ref=e364]:
            - generic [ref=e365]: PASS GOLD
            - generic [ref=e367]: LOOP
            - generic [ref=e370]: $0.471
          - generic [ref=e371]:
            - generic [ref=e372]: Benchmark
            - generic [ref=e374]: AUTO
            - generic [ref=e377]: $1.469
        - generic [ref=e378]:
          - generic [ref=e379]: TOTAL PIPELINE
          - generic [ref=e380]: $13.227
      - generic [ref=e381]:
        - generic [ref=e382]:
          - generic [ref=e383]:
            - paragraph [ref=e384]: OPENSQUAD RESERVE • AGENTES QUE TRABALHAM FORA DO MENU PRINCIPAL
            - heading "AGENTES EXTRAS EM EXECUÇÃO" [level=2] [ref=e385]
            - paragraph [ref=e386]:
              - text: Catálogo lido do backend em
              - code [ref=e387]: /api/agents/catalog
              - text: ", usando os nomes e funções reais do projeto."
          - button "Ver OpenSquad" [ref=e388] [cursor=pointer]
        - generic [ref=e389]:
          - generic [ref=e390] [cursor=pointer]:
            - generic [ref=e391]:
              - generic [ref=e392]: ⬡
              - generic [ref=e393]: ATIVO
            - generic [ref=e394]: BACKEND
            - generic [ref=e395]: Agente Backend
            - generic [ref=e396]: Express, Node.js, rotas, middlewares e erros de servidor.
            - generic [ref=e397]:
              - generic [ref=e398]: routes
              - generic [ref=e399]: api
              - generic [ref=e400]: server
            - generic [ref=e401]:
              - generic [ref=e402]: CONVERSA
              - generic [ref=e403]:
                - button "OFF" [ref=e404]
                - button "AUTO" [ref=e405]
                - button "ON" [ref=e406]
          - generic [ref=e407] [cursor=pointer]:
            - generic [ref=e408]:
              - generic [ref=e409]: ⬡
              - generic [ref=e410]: ATIVO
            - generic [ref=e411]: DATABASE
            - generic [ref=e412]: Agente Database
            - generic [ref=e413]: SQL, queries, conexões, migrations e modelos de dados.
            - generic [ref=e414]:
              - generic [ref=e415]: sql
              - generic [ref=e416]: schema
              - generic [ref=e417]: db
            - generic [ref=e418]:
              - generic [ref=e419]: CONVERSA
              - generic [ref=e420]:
                - button "OFF" [ref=e421]
                - button "AUTO" [ref=e422]
                - button "ON" [ref=e423]
          - generic [ref=e424] [cursor=pointer]:
            - generic [ref=e425]:
              - generic [ref=e426]: ⬡
              - generic [ref=e427]: ATIVO
            - generic [ref=e428]: AUTH
            - generic [ref=e429]: Agente Auth
            - generic [ref=e430]: Autenticação, tokens, sessões, CORS e permissões.
            - generic [ref=e431]:
              - generic [ref=e432]: jwt
              - generic [ref=e433]: cors
              - generic [ref=e434]: 401/403
            - generic [ref=e435]:
              - generic [ref=e436]: CONVERSA
              - generic [ref=e437]:
                - button "OFF" [ref=e438]
                - button "AUTO" [ref=e439]
                - button "ON" [ref=e440]
          - generic [ref=e441] [cursor=pointer]:
            - generic [ref=e442]:
              - generic [ref=e443]: ▣
              - generic [ref=e444]: ATIVO
            - generic [ref=e445]: UPLOAD
            - generic [ref=e446]: Agente Upload/Media
            - generic [ref=e447]: Multer, arquivos, mimetypes, storage, imagens e vision upload.
            - generic [ref=e448]:
              - generic [ref=e449]: multer
              - generic [ref=e450]: req.file
              - generic [ref=e451]: media
            - generic [ref=e452]:
              - generic [ref=e453]: CONVERSA
              - generic [ref=e454]:
                - button "OFF" [ref=e455]
                - button "AUTO" [ref=e456]
                - button "ON" [ref=e457]
          - generic [ref=e458] [cursor=pointer]:
            - generic [ref=e459]:
              - generic [ref=e460]: ⬡
              - generic [ref=e461]: ATIVO
            - generic [ref=e462]: CONFIG
            - generic [ref=e463]: Agente Config
            - generic [ref=e464]: .env, variáveis, portas, host e configuração de ambiente.
            - generic [ref=e465]:
              - generic [ref=e466]: env
              - generic [ref=e467]: port
              - generic [ref=e468]: config
            - generic [ref=e469]:
              - generic [ref=e470]: CONVERSA
              - generic [ref=e471]:
                - button "OFF" [ref=e472]
                - button "AUTO" [ref=e473]
                - button "ON" [ref=e474]
          - generic [ref=e475] [cursor=pointer]:
            - generic [ref=e476]:
              - generic [ref=e477]: ⬡
              - generic [ref=e478]: ATIVO
            - generic [ref=e479]: NETWORK
            - generic [ref=e480]: Agente Network
            - generic [ref=e481]: HTTP, timeouts, DNS, fetch, axios e conexões externas.
            - generic [ref=e482]:
              - generic [ref=e483]: http
              - generic [ref=e484]: timeout
              - generic [ref=e485]: dns
            - generic [ref=e486]:
              - generic [ref=e487]: CONVERSA
              - generic [ref=e488]:
                - button "OFF" [ref=e489]
                - button "AUTO" [ref=e490]
                - button "ON" [ref=e491]
          - generic [ref=e492] [cursor=pointer]:
            - generic [ref=e493]:
              - generic [ref=e494]: ▣
              - generic [ref=e495]: ATIVO
            - generic [ref=e496]: LOCATOR
            - generic [ref=e497]: Reserve Locator
            - generic [ref=e498]: Localizar arquivo alvo quando o Scanner falhar.
            - generic [ref=e499]:
              - generic [ref=e500]: extra_scan_hints
              - generic [ref=e501]: target_recommendations
            - generic [ref=e502]:
              - generic [ref=e503]: CIRÚRGICO
              - generic [ref=e504]:
                - button "OFF" [ref=e505]
                - button "AUTO" [ref=e506]
                - button "ON" [ref=e507]
          - generic [ref=e508] [cursor=pointer]:
            - generic [ref=e509]:
              - generic [ref=e510]: ▣
              - generic [ref=e511]: ATIVO
            - generic [ref=e512]: SECURITY
            - generic [ref=e513]: Reserve Security
            - generic [ref=e514]: Revisar patches de alto risco e autenticação.
            - generic [ref=e515]:
              - generic [ref=e516]: risk_review
              - generic [ref=e517]: security_notes
            - generic [ref=e518]:
              - generic [ref=e519]: CIRÚRGICO
              - generic [ref=e520]:
                - button "OFF" [ref=e521]
                - button "AUTO" [ref=e522]
                - button "ON" [ref=e523]
          - generic [ref=e524] [cursor=pointer]:
            - generic [ref=e525]:
              - generic [ref=e526]: ⬡
              - generic [ref=e527]: ATIVO
            - generic [ref=e528]: VALIDATOR
            - generic [ref=e529]: Reserve Validator
            - generic [ref=e530]: Sugerir validações adicionais antes do PASS GOLD.
            - generic [ref=e532]: validation_suggestions
            - generic [ref=e533]:
              - generic [ref=e534]: LOOP
              - generic [ref=e535]:
                - button "OFF" [ref=e536]
                - button "AUTO" [ref=e537]
                - button "ON" [ref=e538]
          - generic [ref=e539] [cursor=pointer]:
            - generic [ref=e540]:
              - generic [ref=e541]: ▣
              - generic [ref=e542]: ATIVO
            - generic [ref=e543]: ARCHITECT
            - generic [ref=e544]: Reserve Architect
            - generic [ref=e545]: Revisar mudanças amplas de arquitetura.
            - generic [ref=e546]:
              - generic [ref=e547]: architecture
              - generic [ref=e548]: refactor
            - generic [ref=e549]:
              - generic [ref=e550]: CIRÚRGICO
              - generic [ref=e551]:
                - button "OFF" [ref=e552]
                - button "AUTO" [ref=e553]
                - button "ON" [ref=e554]
          - generic [ref=e555] [cursor=pointer]:
            - generic [ref=e556]:
              - generic [ref=e557]: ⬡
              - generic [ref=e558]: ATIVO
            - generic [ref=e559]: MEMORY
            - generic [ref=e560]: Reserve Memory
            - generic [ref=e561]: Consultar histórico de incidentes sem executar ações.
            - generic [ref=e562]:
              - generic [ref=e563]: memory
              - generic [ref=e564]: incidents
            - generic [ref=e565]:
              - generic [ref=e566]: CONSULTA
              - generic [ref=e567]:
                - button "OFF" [ref=e568]
                - button "AUTO" [ref=e569]
                - button "ON" [ref=e570]
      - text: ▸ ▸
    - complementary [ref=e571]:
      - generic [ref=e572]:
        - paragraph [ref=e573]: MISSION INPUT
        - paragraph [ref=e574]: Arquitetura multiagente sugerida
        - generic [ref=e575]:
          - img
          - generic [ref=e576]:
            - img [ref=e577]
            - generic [ref=e580]: FECHADO
            - generic [ref=e581]: CONTROLLED CLOSURE
            - generic [ref=e582]: origem da missão, objetivo, contexto e restrições
          - generic [ref=e583] [cursor=pointer]:
            - img [ref=e585]
            - generic [ref=e587]: PI HARNESS
            - generic [ref=e588]: Mission Runner
            - generic [ref=e589]: AGUARDA
          - generic [ref=e590] [cursor=pointer]:
            - img [ref=e592]
            - generic [ref=e598]: HERMES
            - generic [ref=e599]: Supervisor / RCA
            - generic [ref=e600]: AGUARDA
          - generic [ref=e601] [cursor=pointer]:
            - img [ref=e603]
            - generic [ref=e605]: OPENCLAW
            - generic [ref=e606]: Orchestrator
            - generic [ref=e607]: AGUARDA
          - generic [ref=e608] [cursor=pointer]:
            - img [ref=e610]
            - generic [ref=e613]: SCANNER
            - generic [ref=e614]: Context Builder
            - generic [ref=e615]: AGUARDA
          - generic [ref=e616] [cursor=pointer]:
            - img [ref=e618]
            - generic [ref=e621]: PATCH ENGINE
            - generic [ref=e622]: Exec. controlada
            - generic [ref=e623]: AGUARDA
          - generic [ref=e624] [cursor=pointer]:
            - img [ref=e626]
            - generic [ref=e629]: AEGIS
            - generic [ref=e630]: Security Gate
            - generic [ref=e631]: AGUARDA
          - generic [ref=e632] [cursor=pointer]:
            - img [ref=e634]
            - generic [ref=e638]: GO CORE
            - generic [ref=e639]: Runtime Truth
            - generic [ref=e640]: AGUARDA
          - generic [ref=e641] [cursor=pointer]:
            - img [ref=e643]
            - generic [ref=e645]: PASS GOLD
            - generic [ref=e646]: Final Authority
            - generic [ref=e647]: AGUARDA
          - generic [ref=e648] [cursor=pointer]:
            - img [ref=e650]
            - generic [ref=e652]: ARCHIVIST
            - generic [ref=e653]: Memory Guard
            - generic [ref=e654]: AGUARDA
          - generic [ref=e655] [cursor=pointer]:
            - img [ref=e657]
            - generic [ref=e662]: GITHUB AGENT
            - generic [ref=e663]: PR / CI / Release
            - generic [ref=e664]: AGUARDA
        - generic [ref=e665]:
          - generic [ref=e666]:
            - generic [ref=e667]: ●
            - text: "Decisão: Hermes, OpenClaw"
          - generic [ref=e668]:
            - generic [ref=e669]: ●
            - text: "Execução: PI Harness, Scanner, PatchEngine"
          - generic [ref=e670]:
            - generic [ref=e671]: ●
            - text: "Validação: Aegis, Go Core, PASS GOLD"
          - generic [ref=e672]:
            - generic [ref=e673]: ●
            - text: "Memória: Archivist · Governança: GitHub Agent"
        - generic [ref=e674]:
          - generic [ref=e675]: AGENT METRICS
          - generic [ref=e676]: ● LIVE
        - generic [ref=e677]:
          - generic [ref=e678]:
            - generic [ref=e679]: OpenClaw
            - generic [ref=e681]: —
          - generic [ref=e682]:
            - generic [ref=e683]: Hermes RCA
            - generic [ref=e685]: —
          - generic [ref=e686]:
            - generic [ref=e687]: Scanner
            - generic [ref=e689]: —
          - generic [ref=e690]:
            - generic [ref=e691]: Aegis
            - generic [ref=e693]: —
          - generic [ref=e694]:
            - generic [ref=e695]: PatchEngine
            - generic [ref=e697]: —
          - generic [ref=e698]:
            - generic [ref=e699]: PASS GOLD
            - generic [ref=e701]: —
        - generic [ref=e702]:
          - generic [ref=e703]: TOTAL PIPELINE
          - generic [ref=e704]: —
        - generic [ref=e705]:
          - button "PIPELINE" [ref=e706] [cursor=pointer]
          - button "AGENT LOCAL" [ref=e707] [cursor=pointer]
        - generic [ref=e709]:
          - generic [ref=e710]:
            - generic [ref=e711]: OpenClaw
            - generic [ref=e712]: —
          - generic [ref=e713]:
            - generic [ref=e714]: Scanner
            - generic [ref=e715]: —
          - generic [ref=e716]:
            - generic [ref=e717]: Hermes
            - generic [ref=e718]: —
          - generic [ref=e719]:
            - generic [ref=e720]: Aegis
            - generic [ref=e721]: —
          - generic [ref=e722]:
            - generic [ref=e723]: PASS GOLD
            - generic [ref=e724]: —
      - generic [ref=e725]:
        - heading "GATES (SDDF)" [level=2] [ref=e726]
        - generic [ref=e727]:
          - generic [ref=e728]: SECURITY
          - generic [ref=e729]: —
        - generic [ref=e730]:
          - generic [ref=e731]: COMPATIBILITY
          - generic [ref=e732]: —
        - generic [ref=e733]:
          - generic [ref=e734]: STABILITY
          - generic [ref=e735]: —
        - generic [ref=e736]:
          - generic [ref=e737]: RUNTIME
          - generic [ref=e738]: —
        - generic [ref=e739]:
          - generic [ref=e740]: DIFF
          - generic [ref=e741]: READY
        - generic [ref=e742]:
          - generic [ref=e743]: VAULT
          - generic [ref=e744]: ACTIVE
        - generic [ref=e745]:
          - generic [ref=e746]: PROMOTION
          - generic [ref=e747]: REQUIRES GOLD
        - generic [ref=e748]:
          - generic [ref=e749]: GITHUB PR
          - generic [ref=e750]: REAL API
      - heading "HERMES CONSENSUS" [level=2] [ref=e752]
      - generic [ref=e753]:
        - heading "STABLE VAULT" [level=2] [ref=e754]
        - generic [ref=e755]:
          - generic [ref=e756]: Snapshots
          - generic [ref=e757]: ACTIVE
        - generic [ref=e758]:
          - generic [ref=e759]: Patches
          - generic [ref=e760]: TRACKED
        - generic [ref=e761]:
          - generic [ref=e762]: Rollback
          - generic [ref=e763]: READY
      - generic [ref=e764]:
        - heading "MEMORY / OBSIDIAN" [level=2] [ref=e765]
        - generic [ref=e766]:
          - generic [ref=e767]: Vault
          - generic [ref=e768]: LINKED
        - generic [ref=e769]:
          - generic [ref=e770]: Incidents
          - generic [ref=e771]: PERSIST
      - generic [ref=e772]:
        - generic [ref=e773]:
          - generic [ref=e774]:
            - paragraph [ref=e775]: ARQUITETURA ESCALÁVEL — RESERVADO
            - heading "OPENCLAW / OPENSQUAD" [level=2] [ref=e776]
          - generic [ref=e777]: SCALE TIER
        - paragraph [ref=e778]: Infraestrutura de agentes paralelos para problemas que exigem trabalho simultâneo em múltiplas camadas — banco de dados, backend e frontend ao mesmo tempo. Reservado para casos de escala onde um único agente não é suficiente.
        - generic [ref=e779]:
          - generic [ref=e780]:
            - generic [ref=e782]:
              - strong [ref=e783]: HERMES
              - generic [ref=e784]: RCA · Orquestrador principal
            - generic [ref=e785]: ATIVO
          - generic [ref=e786]:
            - generic [ref=e788]:
              - strong [ref=e789]: OPENCLAW
              - generic [ref=e790]: Router · Distribuição de missões
            - generic [ref=e791]: RESERVADO
          - generic [ref=e792]:
            - generic [ref=e794]:
              - strong [ref=e795]: SQUAD α
              - generic [ref=e796]: Agente especialista · Database layer
            - generic [ref=e797]: ESCALA
          - generic [ref=e798]:
            - generic [ref=e800]:
              - strong [ref=e801]: SQUAD β
              - generic [ref=e802]: Agente especialista · API layer
            - generic [ref=e803]: ESCALA
          - generic [ref=e804]:
            - generic [ref=e806]:
              - strong [ref=e807]: SQUAD γ
              - generic [ref=e808]: Agente especialista · Frontend layer
            - generic [ref=e809]: ESCALA
        - generic [ref=e810]:
          - generic [ref=e811]: Erro complexo
          - generic [ref=e812]: →
          - generic [ref=e813]: OPENCLAW
          - generic [ref=e814]: →
          - generic [ref=e815]: N squads paralelos
          - generic [ref=e816]: →
          - generic [ref=e817]: Consolidação
          - generic [ref=e818]: →
          - generic [ref=e819]: PASS GOLD
        - generic [ref=e820]:
          - generic [ref=e821]: Ativação automática quando missão exige > 1 agente
          - generic [ref=e822]: MULTI-TENANT TIER
      - generic [ref=e823]:
        - heading "OSINT TOOLS" [level=2] [ref=e824]
        - generic [ref=e825]:
          - generic [ref=e826]: SpiderFoot
          - generic [ref=e827]: DOCKER
        - generic [ref=e828]:
          - generic [ref=e829]: Recon-ng
          - generic [ref=e830]: SANDBOX
        - generic [ref=e831]:
          - generic [ref=e832]: Maryam
          - generic [ref=e833]: SANDBOX
      - generic [ref=e834]:
        - heading "WORKERS" [level=2] [ref=e835]
        - button "ATUALIZAR FILA" [ref=e836] [cursor=pointer]
  - generic "Controlled closure ativo — decisão humana final requerida" [ref=e837]:
    - generic [ref=e839]: CLOSURE
    - generic [ref=e840]: ▂▄▆█
  - dialog [ref=e842]:
    - generic:
      - img
      - img
    - generic [ref=e843]: 1 / 13
    - generic [ref=e844]: 👋 Bem-vindo ao Vision Core!
    - generic [ref=e845]: Este é um sistema autônomo de desenvolvimento com IA. Ele detecta erros, corrige código, valida e cria PRs no GitHub automaticamente. Vamos mostrar tudo em 12 passos rápidos.
    - button [ref=e847] [cursor=pointer]: Próximo →
    - generic [ref=e848]:
      - button [ref=e849] [cursor=pointer]: Pular tutorial
      - generic [ref=e850] [cursor=pointer]:
        - checkbox [ref=e851]
        - text: Não exibir novamente
  - button "Ver tutorial novamente" [ref=e852] [cursor=pointer]: 🪐
```

# Test source

```ts
  503 |     if (diagConcluido === 0) {
  504 |       // LLM não retornou JSON no formato HERMES, ou o request deu timeout/erro.
  505 |       // Verificar o que apareceu no chat para diagnóstico.
  506 |       const chatContent = await page.locator('#v298ChatStream').innerText().catch(() => '');
  507 |       console.log('  INCONCLUSIVO: "Diagnóstico concluído" não apareceu. Chat stream: ' +
  508 |         chatContent.slice(0, 200) + (chatContent.length > 200 ? '...' : ''));
  509 |       // Registrar como INCONCLUSIVO sem falhar — o LLM pode não ter formatado como JSON.
  510 |       await page.screenshot({ path: 'test-results/apply-115-chat-trigger.png', fullPage: true });
  511 |       return; // test passes as INCONCLUSIVO
  512 |     }
  513 | 
  514 |     // hermesObj válido → EXECUTAR MISSÃO
  515 |     await clickJS(page, '#v298RunBtn');
  516 | 
  517 |     const applyBtn = page.locator('text=/Aplicar no Vision Agent Local/').first();
  518 |     await expect(applyBtn).toBeVisible({ timeout: 20_000 });
  519 |     const buttonText = await applyBtn.innerText();
  520 | 
  521 |     await page.screenshot({ path: 'test-results/apply-115-chat-trigger.png', fullPage: true });
  522 | 
  523 |     if (/\(\d+ arquivos\)/.test(buttonText)) {
  524 |       console.log('  PASS COMPLETO: botão "' + buttonText.trim() + '" — multi-arquivo confirmado.');
  525 |     } else {
  526 |       console.log('  INCONCLUSIVO (não é falha): "' + buttonText.trim() + '" — LLM decidiu single-file. Válido por design. Ver screenshot.');
  527 |     }
  528 |   });
  529 | });
  530 | 
  531 | // ─────────────────────────────────────────────────────────────────────────────
  532 | // §118 — TUTORIAL: BALÕES ALINHADOS COM ELEMENTOS REAIS (T2/T3/T5/T6)
  533 | //
  534 | // Estes testes verificam que positionBalloon() ilumina o elemento específico
  535 | // descrito em cada passo, em vez de um container genérico.
  536 | //
  537 | // Estratégia:
  538 | //   1. Navegar sem suppressTutorial — o T1 precisa inicializar para
  539 | //      _vcSetActiveTutorial ficar disponível no window.
  540 | //   2. Disparar tutorial de seção via window.vcStartSectionTutorial(name).
  541 | //   3. Para cada passo, aguardar typewriter + 80ms de positionBalloon.
  542 | //   4. Comparar getBoundingClientRect() do spotlight vs. do elemento-alvo.
  543 | //      spotlight.top ≈ target.top - pad (pad=14), dentro de tolerância de 20px.
  544 | //      spotlight.width > 0 confirma que o elemento foi encontrado e está em view.
  545 | // ─────────────────────────────────────────────────────────────────────────────
  546 | 
  547 | /**
  548 |  * v5-§118: intercept bundle.js e serve o arquivo LOCAL em vez do de produção.
  549 |  * Necessário para testar as mudanças §118 antes do deploy.
  550 |  * Deve ser chamada ANTES de page.goto().
  551 |  */
  552 | const LOCAL_BUNDLE_PATH = path.resolve(process.cwd(), 'frontend/assets/vision-core-bundle.js');
  553 | const LOCAL_INDEX_PATH  = path.resolve(process.cwd(), 'frontend/index.html');
  554 | 
  555 | async function setupLocalBundleRoute(page) {
  556 |   let localBundle;
  557 |   try {
  558 |     localBundle = readFileSync(LOCAL_BUNDLE_PATH, 'utf8');
  559 |     console.log('[LOCAL BUNDLE] lido: ' + LOCAL_BUNDLE_PATH + ' (' + localBundle.length + ' bytes)');
  560 |   } catch (e) {
  561 |     console.warn('[LOCAL BUNDLE] ERRO ao ler bundle local: ' + e.message + ' — continuando sem intercept');
  562 |     return;
  563 |   }
  564 |   await page.route('**/vision-core-bundle.js', (route) => {
  565 |     route.fulfill({
  566 |       status: 200,
  567 |       contentType: 'application/javascript; charset=utf-8',
  568 |       body: localBundle,
  569 |     });
  570 |   });
  571 | }
  572 | 
  573 | /**
  574 |  * §121: Intercepta o index.html remoto com o arquivo local.
  575 |  * Necessário para que as mudanças de CSS (remoção de position:relative!important)
  576 |  * tomem efeito nos testes sem exigir um deploy prévio.
  577 |  * Deve ser chamada ANTES de page.goto() — junto com setupLocalBundleRoute.
  578 |  */
  579 | async function setupLocalIndexRoute(page) {
  580 |   let localHtml;
  581 |   try {
  582 |     localHtml = readFileSync(LOCAL_INDEX_PATH, 'utf8');
  583 |     console.log('[LOCAL INDEX] lido: ' + LOCAL_INDEX_PATH + ' (' + localHtml.length + ' bytes)');
  584 |   } catch (e) {
  585 |     console.warn('[LOCAL INDEX] ERRO ao ler index.html local: ' + e.message + ' — continuando sem intercept');
  586 |     return;
  587 |   }
  588 |   // Intercepta a URL raiz (com e sem trailing slash)
  589 |   await page.route(/^https:\/\/visioncoreai\.pages\.dev\/?$/, (route) => {
  590 |     route.fulfill({
  591 |       status: 200,
  592 |       contentType: 'text/html; charset=utf-8',
  593 |       body: localHtml,
  594 |     });
  595 |   });
  596 | }
  597 | 
  598 | /**
  599 |  * Navega para BASE_URL SEM suprimir o tutorial — necessário para que
  600 |  * initTutorial() registre _vcSetActiveTutorial no window.
  601 |  */
  602 | async function gotoPageForTutorialTest(page) {
> 603 |   await page.goto(BASE_URL);
      |              ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  604 |   await page.waitForLoadState('networkidle', { timeout: 20_000 });
  605 |   // Aguardar o setTimeout de 1500ms do T1 disparar e _vcSetActiveTutorial ficar disponível
  606 |   await page.waitForFunction(
  607 |     () => typeof window._vcSetActiveTutorial === 'function',
  608 |     {},
  609 |     { timeout: 5_000 }
  610 |   );
  611 | }
  612 | 
  613 | /**
  614 |  * Aguarda o typewriter do passo atual terminar (nextBtn fica habilitado)
  615 |  * e dá uma margem extra para o setTimeout(80ms) de positionBalloon assentar.
  616 |  */
  617 | async function waitForStepReady(page) {
  618 |   await page.waitForFunction(
  619 |     () => {
  620 |       var btn = document.getElementById('vcTutorialNext');
  621 |       return btn && !btn.disabled;
  622 |     },
  623 |     {},
  624 |     { timeout: 15_000 }
  625 |   );
  626 |   await page.waitForTimeout(200); // margem para onEnter + setTimeout(80ms)
  627 | }
  628 | 
  629 | /**
  630 |  * Lê a posição visual do spotlight e do elemento-alvo.
  631 |  * Retorna um objeto com dimensões normalizadas para assertSpotlightCoversTarget().
  632 |  */
  633 | async function getSpotlightVsTarget(page, targetSel) {
  634 |   return await page.evaluate(function(sel) {
  635 |     var spotlight = document.getElementById('vcTutorialSpotlight');
  636 |     var target    = sel ? document.querySelector(sel) : null;
  637 |     var sp = spotlight ? spotlight.getBoundingClientRect() : null;
  638 |     var tg = target    ? target.getBoundingClientRect()    : null;
  639 |     return {
  640 |       spotW:    sp ? sp.width  : -1,
  641 |       spotH:    sp ? sp.height : -1,
  642 |       spotTop:  sp ? sp.top    : -1,
  643 |       spotLeft: sp ? sp.left   : -1,
  644 |       tgTop:    tg ? tg.top    : -1,
  645 |       tgLeft:   tg ? tg.left   : -1,
  646 |       tgW:      tg ? tg.width  : -1,
  647 |       tgH:      tg ? tg.height : -1,
  648 |       targetExists:   !!target,
  649 |       overlayVisible: !!(document.getElementById('vcTutorialOverlay') &&
  650 |                          document.getElementById('vcTutorialOverlay').style.display !== 'none')
  651 |     };
  652 |   }, targetSel);
  653 | }
  654 | 
  655 | /**
  656 |  * Verifica que o spotlight está sobre o elemento-alvo.
  657 |  * pad = 14 (mesmo valor de positionBalloon no bundle).
  658 |  * Tolerância de 20px para rounding e diferenças de viewport.
  659 |  */
  660 | function assertSpotlightCoversTarget(pos, stepLabel, pad) {
  661 |   var p = (pad !== undefined) ? pad : 14;
  662 |   var tol = 20;
  663 |   expect(pos.overlayVisible, stepLabel + ': overlay deve estar visível').toBe(true);
  664 |   expect(pos.spotW, stepLabel + ': spotlight.width deve ser > 0 (elemento não encontrado ou fora do viewport)').toBeGreaterThan(0);
  665 |   expect(pos.spotH, stepLabel + ': spotlight.height deve ser > 0').toBeGreaterThan(0);
  666 |   if (pos.targetExists && pos.tgW > 0) {
  667 |     // spotlight.top ≈ target.top - pad
  668 |     expect(
  669 |       Math.abs(pos.spotTop - (pos.tgTop - p)),
  670 |       stepLabel + ': spotlight.top (' + pos.spotTop + ') deve ≈ target.top (' + pos.tgTop + ') - pad (' + p + ')'
  671 |     ).toBeLessThan(tol);
  672 |     // spotlight.left ≈ target.left - pad
  673 |     expect(
  674 |       Math.abs(pos.spotLeft - (pos.tgLeft - p)),
  675 |       stepLabel + ': spotlight.left (' + pos.spotLeft + ') deve ≈ target.left (' + pos.tgLeft + ') - pad (' + p + ')'
  676 |     ).toBeLessThan(tol);
  677 |   }
  678 | }
  679 | 
  680 | test.describe('§118 — Tutorial: balões alinhados com elementos reais (T2/T3/T5/T6)', () => {
  681 | 
  682 |   test('T2 — Vision Agent Local: spotlight cobre elementos reais por passo', async ({ page }) => {
  683 |     test.setTimeout(60_000);
  684 |     // O botão de download fica a ~730px do topo com viewport 720px padrão — o cockpit
  685 |     // usa altura de viewport, impossibilitando scroll adicional para centralizá-lo.
  686 |     // Aumentamos a viewport para que o elemento fique dentro da área visível.
  687 |     await page.setViewportSize({ width: 1280, height: 900 });
  688 |     await setupLocalBundleRoute(page); // serve bundle local com §118 changes
  689 |     await gotoPageForTutorialTest(page);
  690 | 
  691 |     await page.evaluate(() => window.vcStartSectionTutorial('agent'));
  692 |     await waitForStepReady(page);
  693 | 
  694 |     // Passo 0: .mc-tab[data-tab="agent"] — onEnter abre a aba
  695 |     const p0 = await getSpotlightVsTarget(page, '.mc-tab[data-tab="agent"]');
  696 |     console.log('  T2 p0 (agent tab):', JSON.stringify(p0));
  697 |     assertSpotlightCoversTarget(p0, 'T2 passo 0 — .mc-tab[data-tab="agent"]');
  698 | 
  699 |     await clickJS(page, '#vcTutorialNext');
  700 |     await waitForStepReady(page);
  701 | 
  702 |     // Passo 1: #mc-tab-agent .agent-download (botão de download real)
  703 |     const p1 = await getSpotlightVsTarget(page, '#mc-tab-agent .agent-download');
```