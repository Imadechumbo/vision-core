# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-verification.spec.mjs >> §120 — Balão nunca esconde nem deixa de iluminar a área explicada >> Regressão §118 — T5 spotlight cobre .vc-reserve-modes e .vc-reserve-tags
- Location: tests\e2e\manual-verification.spec.mjs:1058:3

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
      - generic [ref=e11]:
        - link "LANDING STARTUP" [ref=e12] [cursor=pointer]:
          - /url: landing.html
        - link "GITHUB" [ref=e13] [cursor=pointer]:
          - /url: https://github.com/Imadechumbo/vision-core-master
        - link "BAIXAR AGENT" [ref=e14] [cursor=pointer]:
          - /url: https://github.com/Imadechumbo/vision-core/releases/download/v1.0.0-agent/VisionAgentSetup.exe
        - button "SIGN IN" [ref=e15] [cursor=pointer]
        - link "ENVIAR MISSÃO" [ref=e16] [cursor=pointer]:
          - /url: "#mission"
  - main [ref=e18]:
    - complementary [ref=e19]:
      - generic [ref=e20]:
        - heading "VISION CORE" [level=1] [ref=e21]
        - paragraph [ref=e22]: SEE. DECIDE. EXECUTE.
        - link "um sistema que corrige sistemas" [ref=e23] [cursor=pointer]:
          - /url: about.html
      - navigation [ref=e24]:
        - button "Abrir Software Factory Builder" [ref=e25] [cursor=pointer]: ◈ SOFTWARE FACTORY
        - button "Abrir Dry-Run Real em repositório externo" [ref=e26] [cursor=pointer]: 🔬 DRY-RUN EXTERNO
        - link "◎ MISSION CONTROL" [ref=e27] [cursor=pointer]:
          - /url: "#mission"
        - link "⌁ MISSION TIMELINE" [ref=e28] [cursor=pointer]:
          - /url: "#timeline"
        - link "⌁ EXECUTION MONITOR" [ref=e29] [cursor=pointer]:
          - /url: "#runtime"
        - link "☷ DIAGNOSTICS / HERMES" [ref=e30] [cursor=pointer]:
          - /url: "#hermes"
        - link "☑ VALIDATION / SDDF" [ref=e31] [cursor=pointer]:
          - /url: "#score"
        - link "☷ DIFF PREVIEW" [ref=e32] [cursor=pointer]:
          - /url: "#diff"
        - link "⌂ VAULT / ROLLBACK" [ref=e33] [cursor=pointer]:
          - /url: "#vault"
        - link "▤ MEMORY / OBSIDIAN" [ref=e34] [cursor=pointer]:
          - /url: "#memory"
        - link "⌘ OPENCLAW / OPENSQUAD SCALE" [ref=e35] [cursor=pointer]:
          - /url: "#opensquad"
          - text: ⌘ OPENCLAW / OPENSQUAD
          - generic [ref=e36]: SCALE
        - link "◇ OSINT DOCKER" [ref=e37] [cursor=pointer]:
          - /url: "#osint"
        - link "⌬ GITHUB / PR REAL" [ref=e38] [cursor=pointer]:
          - /url: "#githubPanel"
        - link "◉ SAAS / PLANOS" [ref=e39] [cursor=pointer]:
          - /url: "#saasAuth"
        - link "◇ V10 ENTERPRISE" [ref=e40] [cursor=pointer]:
          - /url: "#v10"
        - link "AI API VAULT" [ref=e41] [cursor=pointer]:
          - /url: "#aiApiVault"
        - link "▣ TOOLS MARKETPLACE" [ref=e42] [cursor=pointer]:
          - /url: "#marketplace"
        - link "▥ MÉTRICAS" [ref=e43] [cursor=pointer]:
          - /url: "#metricsBoard"
        - link "⚙ AGENTES EXTRAS" [ref=e44] [cursor=pointer]:
          - /url: "#agentsBoard"
        - button "🪐 Tutoriais ▾" [ref=e46] [cursor=pointer]:
          - generic [ref=e47]: 🪐 Tutoriais
          - generic [ref=e48]: ▾
    - generic [ref=e49]:
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]:
            - generic [ref=e53]:
              - strong [ref=e54]: VISION AI COMMAND
              - generic [ref=e55]: Chat universal + correção de projetos com PASS GOLD
            - generic [ref=e56]: READY
          - generic [ref=e58]: Vision AI pronto. Converse sobre qualquer assunto, cole erros, envie arquivos/imagens ou execute uma missão SDDF.
          - generic [ref=e59]:
            - generic [ref=e60]:
              - textbox "Pergunte qualquer coisa, cole erro, log, código... Enter = enviar, Shift+Enter = quebrar linha" [ref=e61]
              - generic [ref=e62]:
                - button "ENVIAR" [ref=e63] [cursor=pointer]
                - button "EXECUTAR MISSÃO" [ref=e64] [cursor=pointer]
            - generic [ref=e65]:
              - generic [ref=e66]:
                - generic [ref=e67]: FREE
                - generic [ref=e68]: ilimitado
              - button "＋ Adicionar arquivos" [ref=e69] [cursor=pointer]
              - button "▧ Ler print/imagem" [ref=e70] [cursor=pointer]
              - button "Limpar sessão" [ref=e71] [cursor=pointer]
              - button "⚙ Configurar IA" [ref=e72] [cursor=pointer]
              - button "📓 Obsidian" [ref=e73] [cursor=pointer]
            - generic [ref=e74]: Nenhum arquivo anexado.
        - generic [ref=e75]:
          - generic [ref=e77] [cursor=pointer]: 🕘 Histórico de missões
          - generic [ref=e79]: Nenhuma missão ainda. Converse ou execute uma missão — fica salvo aqui.
        - heading "MISSION CONTROL" [level=2] [ref=e80]
        - paragraph [ref=e81]: Operador técnico multi-projeto, multi-stack, com aprendizado contínuo.
        - generic [ref=e82]:
          - generic [ref=e83]: Projeto ativo
          - combobox [ref=e84]:
            - option "Carregando projetos..." [selected]
          - button "ENFILEIRAR WORKER" [ref=e85] [cursor=pointer]
        - generic "Frase de impacto VISION CORE" [ref=e86]:
          - generic [ref=e87]: IAs criam.
          - strong [ref=e88]: VISION CORE
          - generic [ref=e89]: corrige
        - generic [ref=e90]:
          - button "＋ ADICIONAR ARQUIVOS" [ref=e91] [cursor=pointer]
          - button "💬 COPILOTO" [ref=e92] [cursor=pointer]
          - combobox [ref=e93]:
            - 'option "MODELO: AUTO melhor disponível" [selected]'
            - option "Gemini 2.0 Flash"
            - option "Llama 3.3 70B Groq"
            - option "OpenRouter Auto"
            - option "DeepSeek Reasoner"
            - option "Ollama Local"
          - combobox [ref=e94]:
            - option "DRY RUN" [selected]
            - option "SAFE PATCH"
            - option "PR MODE"
          - button "▷ EXECUTAR LIVE" [ref=e95] [cursor=pointer]
      - generic [ref=e96]:
        - paragraph [ref=e97]: DEPLOY SEGURO • PASS GOLD • GITHUB PR REAL • DIFF • CI • VAULT • AUTO-ROLLBACK
        - heading "Sistema operacional para desenvolvimento com IA." [level=2] [ref=e98]
        - paragraph [ref=e99]: "IAs criam software rápido. O VISION CORE fecha o loop: diagnostica, executa, valida, protege e mostra tudo em logs vivos."
        - generic [ref=e100]:
          - generic [ref=e101]: Missão
          - generic [ref=e102]: →
          - generic [ref=e103]: Diagnóstico
          - generic [ref=e104]: →
          - generic [ref=e105]: Diff
          - generic [ref=e106]: →
          - generic [ref=e107]: PASS GOLD
          - generic [ref=e108]: →
          - generic [ref=e109]: PR
          - generic [ref=e110]: →
          - generic [ref=e111]: Stable Vault
      - generic [ref=e112]:
        - paragraph [ref=e113]: SAAS ONBOARDING • SOCIAL LOGIN / OAUTH SIGNUP POPUP • PLANS
        - heading "Cadastro SaaS automático, simples e popular." [level=2] [ref=e114]
        - paragraph [ref=e115]:
          - strong [ref=e116]: Autonomous Software Repair System.
          - text: Isso não é chat, copiloto ou automação simples. É um sistema que detecta → entende → corrige → valida → protege → aprende.
        - generic [ref=e117]:
          - generic [ref=e118] [cursor=pointer]:
            - strong [ref=e119]: FREE
            - generic [ref=e120]: 5 missões/mês
            - generic [ref=e121]: Cadastro instantâneo · sem cartão
            - emphasis [ref=e122]: BETA ATIVO
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
        - generic [ref=e123]:
          - paragraph [ref=e124]: OPERADOR
          - button "SIGN IN" [ref=e125] [cursor=pointer]
          - text: Social Login / OAuth Signup Popup
        - generic [ref=e126]: "Plano selecionado: FREE"
      - generic [ref=e127]:
        - heading "◈ SOFTWARE FACTORY" [level=2] [ref=e128]
        - paragraph [ref=e129]: "Crie projetos do zero com 8 módulos de IA: da definição de stack até o blueprint de deploy. Tudo guiado por agentes especializados."
        - generic [ref=e130]:
          - generic [ref=e131]:
            - generic [ref=e132]: "01"
            - generic [ref=e133]: Montar Projeto
          - generic [ref=e134]:
            - generic [ref=e135]: "02"
            - generic [ref=e136]: Templates
          - generic [ref=e137]:
            - generic [ref=e138]: "03"
            - generic [ref=e139]: Compositor de Missão
          - generic [ref=e140]:
            - generic [ref=e141]: "04"
            - generic [ref=e142]: Worker Handoff
          - generic [ref=e143]:
            - generic [ref=e144]: "05"
            - generic [ref=e145]: Preview de Criação
          - generic [ref=e146]:
            - generic [ref=e147]: "06"
            - generic [ref=e148]: Comando Real
          - generic [ref=e149]:
            - generic [ref=e150]: "07"
            - generic [ref=e151]: Recibo do Worker
          - generic [ref=e152]:
            - generic [ref=e153]: "08"
            - generic [ref=e154]: Painel Final
        - button "◈ ABRIR SOFTWARE FACTORY" [ref=e155] [cursor=pointer]
      - generic [ref=e156]:
        - heading "MISSION TIMELINE" [level=2] [ref=e157]
        - paragraph [ref=e158]: "Fluxo visual: missão recebida → Hermes → snapshot → diff → validação → GitHub PR."
      - generic [ref=e159]:
        - heading "DIFF PREVIEW" [level=2] [ref=e160]
        - paragraph [ref=e161]: Mostra o patch antes de criar branch, commit ou Pull Request.
        - button "GERAR DIFF DEMO" [ref=e162] [cursor=pointer]
        - generic [ref=e163]: Aguardando diff...
      - generic [ref=e164]:
        - heading "PASS GOLD SCORE" [level=2] [ref=e165]
        - paragraph [ref=e166]: Promoção só é liberada acima do corte GOLD.
      - generic [ref=e167]:
        - heading "GitHub Integration Real" [level=2] [ref=e168]
        - paragraph [ref=e169]: Cria branch, aplica commit e abre Pull Request real via GitHub REST API. Bloqueado sem PASS GOLD.
        - generic [ref=e170]: Verificando GitHub...
        - generic [ref=e171]:
          - button "Verificar GitHub" [ref=e172] [cursor=pointer]
          - button "Criar PR PASS GOLD" [ref=e173] [cursor=pointer]
          - button "Auto-merge Policy" [ref=e174] [cursor=pointer]
      - generic [ref=e175]:
        - heading "V10 ENTERPRISE FOUNDATION" [level=2] [ref=e176]
        - generic [ref=e177]:
          - generic [ref=e178]:
            - strong [ref=e179]: Multi-projeto
            - generic [ref=e180]: gestão por stack e estado GOLD
          - generic [ref=e181]:
            - strong [ref=e182]: Métricas reais
            - generic [ref=e183]: runtime, delivery e GitHub
          - generic [ref=e184]:
            - strong [ref=e185]: Hermes votando
            - generic [ref=e186]: consenso antes do PR
          - generic [ref=e187]:
            - strong [ref=e188]: Auto-merge condicionado
            - generic [ref=e189]: só com checks + GOLD
          - generic [ref=e190]:
            - strong [ref=e191]: Workers distribuídos
            - generic [ref=e192]: filas por execução/rollback
          - generic [ref=e193]:
            - strong [ref=e194]: Billing SaaS
            - generic [ref=e195]: planos prontos para Stripe
      - generic [ref=e196]:
        - paragraph [ref=e197]: AI API VAULT - PROVEDORES PAGOS - ROTEAMENTO INTELIGENTE
        - heading "Menu para adicionar APIs de IAs pagas" [level=2] [ref=e198]
        - paragraph [ref=e199]: Conecte provedores comerciais e defina prioridade/fallback. As chaves ficam preparadas para uso via variaveis de ambiente ou vault local em desenvolvimento.
        - generic [ref=e200]:
          - button "OpenAI GPT / Vision / Assistants" [ref=e201] [cursor=pointer]:
            - strong [ref=e202]: OpenAI
            - generic [ref=e203]: GPT / Vision / Assistants
          - button "Anthropic Claude" [ref=e204] [cursor=pointer]:
            - strong [ref=e205]: Anthropic
            - generic [ref=e206]: Claude
          - button "Google Gemini Flash / Pro / Vision" [ref=e207] [cursor=pointer]:
            - strong [ref=e208]: Google Gemini
            - generic [ref=e209]: Flash / Pro / Vision
          - button "OpenRouter multi-model fallback" [ref=e210] [cursor=pointer]:
            - strong [ref=e211]: OpenRouter
            - generic [ref=e212]: multi-model fallback
          - button "Groq alta velocidade" [ref=e213] [cursor=pointer]:
            - strong [ref=e214]: Groq
            - generic [ref=e215]: alta velocidade
          - button "DeepSeek reasoner/code" [ref=e216] [cursor=pointer]:
            - strong [ref=e217]: DeepSeek
            - generic [ref=e218]: reasoner/code
        - generic [ref=e219]:
          - generic [ref=e220]: Provider
          - combobox [ref=e221]:
            - option "OpenAI" [selected]
            - option "Anthropic"
            - option "Google Gemini"
            - option "OpenRouter"
            - option "Groq"
            - option "DeepSeek"
          - generic [ref=e222]: API Key
          - textbox "cole sua chave aqui..." [ref=e223]
          - generic [ref=e224]: Modelo padrao
          - 'textbox "ex: gpt-4.1, claude-3.7-sonnet, gemini-2.0-flash" [ref=e225]'
          - generic [ref=e226]: Prioridade
          - combobox [ref=e227]:
            - option "primary" [selected]
            - option "fallback"
            - option "disabled"
        - generic [ref=e228]:
          - button "SALVAR PROVIDER" [ref=e229] [cursor=pointer]
          - button "TESTAR PROVIDER" [ref=e230] [cursor=pointer]
          - link "VER LANDING STARTUP" [ref=e231] [cursor=pointer]:
            - /url: landing.html
        - generic [ref=e232]: Nenhuma API salva nesta sessao.
      - generic [ref=e233]:
        - heading "TOOLS MARKETPLACE" [level=2] [ref=e234]
        - paragraph [ref=e235]: Conectores preparados para GitHub, Cloudflare, Railway, Docker, Langfuse e billing.
      - generic [ref=e236]:
        - generic [ref=e237]:
          - heading "LIVE EXECUTION STREAM" [level=2] [ref=e238]
          - button "BAIXAR LOGS" [ref=e239] [cursor=pointer]
        - generic [ref=e240]: Aguardando eventos SSE / polling do missionRunner v1.1...
      - generic [ref=e241]:
        - generic [ref=e242]:
          - generic [ref=e243]:
            - paragraph [ref=e244]: AGENT METRICS • CUSTO POR AGENTE • PIPELINE
            - heading "MÉTRICAS DOS AGENTES" [level=2] [ref=e245]
            - paragraph [ref=e246]:
              - text: Ligado ao backend em
              - code [ref=e247]: /api/metrics/agents
              - text: . Quando o backend estiver offline, a tela mantém fallback local marcado como UI local.
          - generic [ref=e248]: UI LOCAL
        - generic [ref=e249]:
          - generic [ref=e250]:
            - generic [ref=e251]: OpenClaw
            - generic [ref=e253]: CONVERSA
            - generic [ref=e256]: $0.163
          - generic [ref=e257]:
            - generic [ref=e258]: Hermes RCA
            - generic [ref=e260]: CONVERSA
            - generic [ref=e263]: $0.815
          - generic [ref=e264]:
            - generic [ref=e265]: Scanner
            - generic [ref=e267]: CONVERSA
            - generic [ref=e270]: $0.377
          - generic [ref=e271]:
            - generic [ref=e272]: Aegis
            - generic [ref=e274]: CONVERSA
            - generic [ref=e277]: $0.264
          - generic [ref=e278]:
            - generic [ref=e279]: PatchEngine
            - generic [ref=e281]: LOOP
            - generic [ref=e284]: $0.668
          - generic [ref=e285]:
            - generic [ref=e286]: PI HARNESS
            - generic [ref=e288]: ADAPTIVE
            - generic [ref=e291]: L0-L9
          - generic [ref=e292]:
            - generic [ref=e293]: PASS GOLD
            - generic [ref=e295]: LOOP
            - generic [ref=e298]: $0.471
          - generic [ref=e299]:
            - generic [ref=e300]: Benchmark
            - generic [ref=e302]: AUTO
            - generic [ref=e305]: $1.469
        - generic [ref=e306]:
          - generic [ref=e307]: TOTAL PIPELINE
          - generic [ref=e308]: $13.227
      - generic [ref=e309]:
        - generic [ref=e310]:
          - generic [ref=e311]:
            - paragraph [ref=e312]: OPENSQUAD RESERVE • AGENTES QUE TRABALHAM FORA DO MENU PRINCIPAL
            - heading "AGENTES EXTRAS EM EXECUÇÃO" [level=2] [ref=e313]
            - paragraph [ref=e314]:
              - text: Catálogo lido do backend em
              - code [ref=e315]: /api/agents/catalog
              - text: ", usando os nomes e funções reais do projeto."
          - button "Ver OpenSquad" [ref=e316] [cursor=pointer]
        - generic [ref=e317]:
          - generic [ref=e318] [cursor=pointer]:
            - generic [ref=e319]:
              - generic [ref=e320]: ⬡
              - generic [ref=e321]: ATIVO
            - generic [ref=e322]: BACKEND
            - generic [ref=e323]: Agente Backend
            - generic [ref=e324]: Express, Node.js, rotas, middlewares e erros de servidor.
            - generic [ref=e325]:
              - generic [ref=e326]: routes
              - generic [ref=e327]: api
              - generic [ref=e328]: server
            - generic [ref=e329]:
              - generic [ref=e330]: CONVERSA
              - generic [ref=e331]:
                - button "OFF" [ref=e332]
                - button "AUTO" [ref=e333]
                - button "ON" [ref=e334]
          - generic [ref=e335] [cursor=pointer]:
            - generic [ref=e336]:
              - generic [ref=e337]: ⬡
              - generic [ref=e338]: ATIVO
            - generic [ref=e339]: DATABASE
            - generic [ref=e340]: Agente Database
            - generic [ref=e341]: SQL, queries, conexões, migrations e modelos de dados.
            - generic [ref=e342]:
              - generic [ref=e343]: sql
              - generic [ref=e344]: schema
              - generic [ref=e345]: db
            - generic [ref=e346]:
              - generic [ref=e347]: CONVERSA
              - generic [ref=e348]:
                - button "OFF" [ref=e349]
                - button "AUTO" [ref=e350]
                - button "ON" [ref=e351]
          - generic [ref=e352] [cursor=pointer]:
            - generic [ref=e353]:
              - generic [ref=e354]: ⬡
              - generic [ref=e355]: ATIVO
            - generic [ref=e356]: AUTH
            - generic [ref=e357]: Agente Auth
            - generic [ref=e358]: Autenticação, tokens, sessões, CORS e permissões.
            - generic [ref=e359]:
              - generic [ref=e360]: jwt
              - generic [ref=e361]: cors
              - generic [ref=e362]: 401/403
            - generic [ref=e363]:
              - generic [ref=e364]: CONVERSA
              - generic [ref=e365]:
                - button "OFF" [ref=e366]
                - button "AUTO" [ref=e367]
                - button "ON" [ref=e368]
          - generic [ref=e369] [cursor=pointer]:
            - generic [ref=e370]:
              - generic [ref=e371]: ▣
              - generic [ref=e372]: ATIVO
            - generic [ref=e373]: UPLOAD
            - generic [ref=e374]: Agente Upload/Media
            - generic [ref=e375]: Multer, arquivos, mimetypes, storage, imagens e vision upload.
            - generic [ref=e376]:
              - generic [ref=e377]: multer
              - generic [ref=e378]: req.file
              - generic [ref=e379]: media
            - generic [ref=e380]:
              - generic [ref=e381]: CONVERSA
              - generic [ref=e382]:
                - button "OFF" [ref=e383]
                - button "AUTO" [ref=e384]
                - button "ON" [ref=e385]
          - generic [ref=e386] [cursor=pointer]:
            - generic [ref=e387]:
              - generic [ref=e388]: ⬡
              - generic [ref=e389]: ATIVO
            - generic [ref=e390]: CONFIG
            - generic [ref=e391]: Agente Config
            - generic [ref=e392]: .env, variáveis, portas, host e configuração de ambiente.
            - generic [ref=e393]:
              - generic [ref=e394]: env
              - generic [ref=e395]: port
              - generic [ref=e396]: config
            - generic [ref=e397]:
              - generic [ref=e398]: CONVERSA
              - generic [ref=e399]:
                - button "OFF" [ref=e400]
                - button "AUTO" [ref=e401]
                - button "ON" [ref=e402]
          - generic [ref=e403] [cursor=pointer]:
            - generic [ref=e404]:
              - generic [ref=e405]: ⬡
              - generic [ref=e406]: ATIVO
            - generic [ref=e407]: NETWORK
            - generic [ref=e408]: Agente Network
            - generic [ref=e409]: HTTP, timeouts, DNS, fetch, axios e conexões externas.
            - generic [ref=e410]:
              - generic [ref=e411]: http
              - generic [ref=e412]: timeout
              - generic [ref=e413]: dns
            - generic [ref=e414]:
              - generic [ref=e415]: CONVERSA
              - generic [ref=e416]:
                - button "OFF" [ref=e417]
                - button "AUTO" [ref=e418]
                - button "ON" [ref=e419]
          - generic [ref=e420] [cursor=pointer]:
            - generic [ref=e421]:
              - generic [ref=e422]: ▣
              - generic [ref=e423]: ATIVO
            - generic [ref=e424]: LOCATOR
            - generic [ref=e425]: Reserve Locator
            - generic [ref=e426]: Localizar arquivo alvo quando o Scanner falhar.
            - generic [ref=e427]:
              - generic [ref=e428]: extra_scan_hints
              - generic [ref=e429]: target_recommendations
            - generic [ref=e430]:
              - generic [ref=e431]: CIRÚRGICO
              - generic [ref=e432]:
                - button "OFF" [ref=e433]
                - button "AUTO" [ref=e434]
                - button "ON" [ref=e435]
          - generic [ref=e436] [cursor=pointer]:
            - generic [ref=e437]:
              - generic [ref=e438]: ▣
              - generic [ref=e439]: ATIVO
            - generic [ref=e440]: SECURITY
            - generic [ref=e441]: Reserve Security
            - generic [ref=e442]: Revisar patches de alto risco e autenticação.
            - generic [ref=e443]:
              - generic [ref=e444]: risk_review
              - generic [ref=e445]: security_notes
            - generic [ref=e446]:
              - generic [ref=e447]: CIRÚRGICO
              - generic [ref=e448]:
                - button "OFF" [ref=e449]
                - button "AUTO" [ref=e450]
                - button "ON" [ref=e451]
          - generic [ref=e452] [cursor=pointer]:
            - generic [ref=e453]:
              - generic [ref=e454]: ⬡
              - generic [ref=e455]: ATIVO
            - generic [ref=e456]: VALIDATOR
            - generic [ref=e457]: Reserve Validator
            - generic [ref=e458]: Sugerir validações adicionais antes do PASS GOLD.
            - generic [ref=e460]: validation_suggestions
            - generic [ref=e461]:
              - generic [ref=e462]: LOOP
              - generic [ref=e463]:
                - button "OFF" [ref=e464]
                - button "AUTO" [ref=e465]
                - button "ON" [ref=e466]
          - generic [ref=e467] [cursor=pointer]:
            - generic [ref=e468]:
              - generic [ref=e469]: ▣
              - generic [ref=e470]: ATIVO
            - generic [ref=e471]: ARCHITECT
            - generic [ref=e472]: Reserve Architect
            - generic [ref=e473]: Revisar mudanças amplas de arquitetura.
            - generic [ref=e474]:
              - generic [ref=e475]: architecture
              - generic [ref=e476]: refactor
            - generic [ref=e477]:
              - generic [ref=e478]: CIRÚRGICO
              - generic [ref=e479]:
                - button "OFF" [ref=e480]
                - button "AUTO" [ref=e481]
                - button "ON" [ref=e482]
          - generic [ref=e483] [cursor=pointer]:
            - generic [ref=e484]:
              - generic [ref=e485]: ⬡
              - generic [ref=e486]: ATIVO
            - generic [ref=e487]: MEMORY
            - generic [ref=e488]: Reserve Memory
            - generic [ref=e489]: Consultar histórico de incidentes sem executar ações.
            - generic [ref=e490]:
              - generic [ref=e491]: memory
              - generic [ref=e492]: incidents
            - generic [ref=e493]:
              - generic [ref=e494]: CONSULTA
              - generic [ref=e495]:
                - button "OFF" [ref=e496]
                - button "AUTO" [ref=e497]
                - button "ON" [ref=e498]
      - text: ▸ ▸
    - complementary [ref=e499]:
      - generic [ref=e500]:
        - paragraph [ref=e501]: MISSION INPUT
        - paragraph [ref=e502]: Arquitetura multiagente sugerida
        - generic [ref=e503]:
          - img
          - generic [ref=e504]:
            - img [ref=e505]
            - generic [ref=e508]: AGUARDA
            - generic [ref=e509]: USER / MISSION INPUT
            - generic [ref=e510]: origem da missão, objetivo, contexto e restrições
          - generic [ref=e511] [cursor=pointer]:
            - img [ref=e513]
            - generic [ref=e515]: PI HARNESS
            - generic [ref=e516]: Mission Runner
            - generic [ref=e517]: AGUARDA
          - generic [ref=e518] [cursor=pointer]:
            - img [ref=e520]
            - generic [ref=e526]: HERMES
            - generic [ref=e527]: Supervisor / RCA
            - generic [ref=e528]: AGUARDA
          - generic [ref=e529] [cursor=pointer]:
            - img [ref=e531]
            - generic [ref=e533]: OPENCLAW
            - generic [ref=e534]: Orchestrator
            - generic [ref=e535]: AGUARDA
          - generic [ref=e536] [cursor=pointer]:
            - img [ref=e538]
            - generic [ref=e541]: SCANNER
            - generic [ref=e542]: Context Builder
            - generic [ref=e543]: AGUARDA
          - generic [ref=e544] [cursor=pointer]:
            - img [ref=e546]
            - generic [ref=e549]: PATCH ENGINE
            - generic [ref=e550]: Exec. controlada
            - generic [ref=e551]: AGUARDA
          - generic [ref=e552] [cursor=pointer]:
            - img [ref=e554]
            - generic [ref=e557]: AEGIS
            - generic [ref=e558]: Security Gate
            - generic [ref=e559]: AGUARDA
          - generic [ref=e560] [cursor=pointer]:
            - img [ref=e562]
            - generic [ref=e566]: GO CORE
            - generic [ref=e567]: Runtime Truth
            - generic [ref=e568]: AGUARDA
          - generic [ref=e569] [cursor=pointer]:
            - img [ref=e571]
            - generic [ref=e573]: PASS GOLD
            - generic [ref=e574]: Final Authority
            - generic [ref=e575]: AGUARDA
          - generic [ref=e576] [cursor=pointer]:
            - img [ref=e578]
            - generic [ref=e580]: ARCHIVIST
            - generic [ref=e581]: Memory Guard
            - generic [ref=e582]: AGUARDA
          - generic [ref=e583] [cursor=pointer]:
            - img [ref=e585]
            - generic [ref=e590]: GITHUB AGENT
            - generic [ref=e591]: PR / CI / Release
            - generic [ref=e592]: AGUARDA
        - generic [ref=e593]:
          - generic [ref=e594]:
            - generic [ref=e595]: ●
            - text: "Decisão: Hermes, OpenClaw"
          - generic [ref=e596]:
            - generic [ref=e597]: ●
            - text: "Execução: PI Harness, Scanner, PatchEngine"
          - generic [ref=e598]:
            - generic [ref=e599]: ●
            - text: "Validação: Aegis, Go Core, PASS GOLD"
          - generic [ref=e600]:
            - generic [ref=e601]: ●
            - text: "Memória: Archivist · Governança: GitHub Agent"
        - generic [ref=e602]:
          - generic [ref=e603]: AGENT METRICS
          - generic [ref=e604]: ● LIVE
        - generic [ref=e605]:
          - generic [ref=e606]:
            - generic [ref=e607]: OpenClaw
            - generic [ref=e609]: —
          - generic [ref=e610]:
            - generic [ref=e611]: Hermes RCA
            - generic [ref=e613]: —
          - generic [ref=e614]:
            - generic [ref=e615]: Scanner
            - generic [ref=e617]: —
          - generic [ref=e618]:
            - generic [ref=e619]: Aegis
            - generic [ref=e621]: —
          - generic [ref=e622]:
            - generic [ref=e623]: PatchEngine
            - generic [ref=e625]: —
          - generic [ref=e626]:
            - generic [ref=e627]: PASS GOLD
            - generic [ref=e629]: —
        - generic [ref=e630]:
          - generic [ref=e631]: TOTAL PIPELINE
          - generic [ref=e632]: —
        - generic [ref=e633]:
          - button "PIPELINE" [ref=e634] [cursor=pointer]
          - button "AGENT LOCAL" [ref=e635] [cursor=pointer]
        - generic [ref=e637]:
          - generic [ref=e638]:
            - generic [ref=e639]: OpenClaw
            - generic [ref=e640]: —
          - generic [ref=e641]:
            - generic [ref=e642]: Scanner
            - generic [ref=e643]: —
          - generic [ref=e644]:
            - generic [ref=e645]: Hermes
            - generic [ref=e646]: —
          - generic [ref=e647]:
            - generic [ref=e648]: Aegis
            - generic [ref=e649]: —
          - generic [ref=e650]:
            - generic [ref=e651]: PASS GOLD
            - generic [ref=e652]: —
      - generic [ref=e653]:
        - heading "GATES (SDDF)" [level=2] [ref=e654]
        - generic [ref=e655]:
          - generic [ref=e656]: SECURITY
          - generic [ref=e657]: —
        - generic [ref=e658]:
          - generic [ref=e659]: COMPATIBILITY
          - generic [ref=e660]: —
        - generic [ref=e661]:
          - generic [ref=e662]: STABILITY
          - generic [ref=e663]: —
        - generic [ref=e664]:
          - generic [ref=e665]: RUNTIME
          - generic [ref=e666]: —
        - generic [ref=e667]:
          - generic [ref=e668]: DIFF
          - generic [ref=e669]: READY
        - generic [ref=e670]:
          - generic [ref=e671]: VAULT
          - generic [ref=e672]: ACTIVE
        - generic [ref=e673]:
          - generic [ref=e674]: PROMOTION
          - generic [ref=e675]: REQUIRES GOLD
        - generic [ref=e676]:
          - generic [ref=e677]: GITHUB PR
          - generic [ref=e678]: REAL API
      - heading "HERMES CONSENSUS" [level=2] [ref=e680]
      - generic [ref=e681]:
        - heading "STABLE VAULT" [level=2] [ref=e682]
        - generic [ref=e683]:
          - generic [ref=e684]: Snapshots
          - generic [ref=e685]: ACTIVE
        - generic [ref=e686]:
          - generic [ref=e687]: Patches
          - generic [ref=e688]: TRACKED
        - generic [ref=e689]:
          - generic [ref=e690]: Rollback
          - generic [ref=e691]: READY
      - generic [ref=e692]:
        - heading "MEMORY / OBSIDIAN" [level=2] [ref=e693]
        - generic [ref=e694]:
          - generic [ref=e695]: Vault
          - generic [ref=e696]: LINKED
        - generic [ref=e697]:
          - generic [ref=e698]: Incidents
          - generic [ref=e699]: PERSIST
      - generic [ref=e700]:
        - generic [ref=e701]:
          - generic [ref=e702]:
            - paragraph [ref=e703]: ARQUITETURA ESCALÁVEL — RESERVADO
            - heading "OPENCLAW / OPENSQUAD" [level=2] [ref=e704]
          - generic [ref=e705]: SCALE TIER
        - paragraph [ref=e706]: Infraestrutura de agentes paralelos para problemas que exigem trabalho simultâneo em múltiplas camadas — banco de dados, backend e frontend ao mesmo tempo. Reservado para casos de escala onde um único agente não é suficiente.
        - generic [ref=e707]:
          - generic [ref=e708]:
            - generic [ref=e710]:
              - strong [ref=e711]: HERMES
              - generic [ref=e712]: RCA · Orquestrador principal
            - generic [ref=e713]: ATIVO
          - generic [ref=e714]:
            - generic [ref=e716]:
              - strong [ref=e717]: OPENCLAW
              - generic [ref=e718]: Router · Distribuição de missões
            - generic [ref=e719]: RESERVADO
          - generic [ref=e720]:
            - generic [ref=e722]:
              - strong [ref=e723]: SQUAD α
              - generic [ref=e724]: Agente especialista · Database layer
            - generic [ref=e725]: ESCALA
          - generic [ref=e726]:
            - generic [ref=e728]:
              - strong [ref=e729]: SQUAD β
              - generic [ref=e730]: Agente especialista · API layer
            - generic [ref=e731]: ESCALA
          - generic [ref=e732]:
            - generic [ref=e734]:
              - strong [ref=e735]: SQUAD γ
              - generic [ref=e736]: Agente especialista · Frontend layer
            - generic [ref=e737]: ESCALA
        - generic [ref=e738]:
          - generic [ref=e739]: Erro complexo
          - generic [ref=e740]: →
          - generic [ref=e741]: OPENCLAW
          - generic [ref=e742]: →
          - generic [ref=e743]: N squads paralelos
          - generic [ref=e744]: →
          - generic [ref=e745]: Consolidação
          - generic [ref=e746]: →
          - generic [ref=e747]: PASS GOLD
        - generic [ref=e748]:
          - generic [ref=e749]: Ativação automática quando missão exige > 1 agente
          - generic [ref=e750]: MULTI-TENANT TIER
      - generic [ref=e751]:
        - heading "OSINT TOOLS" [level=2] [ref=e752]
        - generic [ref=e753]:
          - generic [ref=e754]: SpiderFoot
          - generic [ref=e755]: DOCKER
        - generic [ref=e756]:
          - generic [ref=e757]: Recon-ng
          - generic [ref=e758]: SANDBOX
        - generic [ref=e759]:
          - generic [ref=e760]: Maryam
          - generic [ref=e761]: SANDBOX
      - generic [ref=e762]:
        - heading "WORKERS" [level=2] [ref=e763]
        - button "ATUALIZAR FILA" [ref=e764] [cursor=pointer]
  - generic "Runtime protegido por GOLD state • Auto-rollback ativo" [ref=e765]:
    - generic [ref=e767]: LIVE
    - generic [ref=e768]: ▂▄▆█
  - button "Ver tutorial novamente" [ref=e769] [cursor=pointer]: 🪐
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