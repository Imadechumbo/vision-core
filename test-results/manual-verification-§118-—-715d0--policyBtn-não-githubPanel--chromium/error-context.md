# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-verification.spec.mjs >> §118 — Tutorial: balões alinhados com elementos reais (T2/T3/T5/T6) >> T6 — PASS GOLD: passo Auto-merge ilumina #policyBtn (não #githubPanel)
- Location: tests\e2e\manual-verification.spec.mjs:789:3

# Error details

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
          - button "＋ ADICIONAR ARQUIVOS" [disabled] [ref=e91]
          - button "💬 COPILOTO" [disabled] [ref=e92]
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
          - generic [ref=e168]: REVIEW_READY_CONTROLLED_CLOSURE
          - generic [ref=e169]: "PASS GOLD REAL: não reivindicado"
          - generic [ref=e170]: Decisão humana final requerida
      - generic [ref=e171]:
        - generic [ref=e173]:
          - paragraph [ref=e174]: SCALEFORCE MODULES • SF 02–09
          - heading "MÓDULOS SF" [level=2] [ref=e175]
          - paragraph [ref=e176]: Geradores de artefatos SDDF. Cada módulo chama o backend real e exibe o resultado no log.
        - generic [ref=e177]:
          - generic [ref=e178]:
            - generic [ref=e179]: SF02
            - generic [ref=e180]: Mission Composer
            - generic [ref=e181]: Gera prompt estruturado de missão para o pipeline SDDF.
            - button "GERAR" [ref=e182] [cursor=pointer]
          - generic [ref=e184]:
            - generic [ref=e185]: SF03
            - generic [ref=e186]: Worker Handoff
            - generic [ref=e187]: Empacota contexto e artefatos para handoff entre workers.
            - button "GERAR" [ref=e188] [cursor=pointer]
          - generic [ref=e190]:
            - generic [ref=e191]: SF04
            - generic [ref=e192]: Context Snapshot
            - generic [ref=e193]: Snapshot do contexto atual para replay e auditoria.
            - button "GERAR" [ref=e194] [cursor=pointer]
          - generic [ref=e196]:
            - generic [ref=e197]: SF05
            - generic [ref=e198]: Patch Validator
            - generic [ref=e199]: Relatório de validação do patch antes do PASS GOLD.
            - button "GERAR" [ref=e200] [cursor=pointer]
          - generic [ref=e202]:
            - generic [ref=e203]: SF06
            - generic [ref=e204]: Risk Assessor
            - generic [ref=e205]: Avalia riscos do deploy e classifica por severidade.
            - button "GERAR" [ref=e206] [cursor=pointer]
          - generic [ref=e208]:
            - generic [ref=e209]: SF07
            - generic [ref=e210]: Rollback Planner
            - generic [ref=e211]: Plano de rollback automatizado com checkpoints.
            - button "GERAR" [ref=e212] [cursor=pointer]
          - generic [ref=e214]:
            - generic [ref=e215]: SF08
            - generic [ref=e216]: Gold Gate Checker
            - generic [ref=e217]: Checklist de gates SDDF obrigatórios para PASS GOLD.
            - button "GERAR" [ref=e218] [cursor=pointer]
          - generic [ref=e220]:
            - generic [ref=e221]: SF09
            - generic [ref=e222]: Deploy Blueprint
            - generic [ref=e223]: Blueprint de deploy com sequência de steps validados.
            - button "GERAR" [ref=e224] [cursor=pointer]
      - generic [ref=e226]:
        - heading "GitHub Integration Real" [level=2] [ref=e227]
        - paragraph [ref=e228]: Cria branch, aplica commit e abre Pull Request real via GitHub REST API. Bloqueado sem PASS GOLD.
        - generic [ref=e229]: GitHub bloqueado — controlled closure ativo.
        - generic [ref=e230]:
          - button "Verificar GitHub" [ref=e231] [cursor=pointer]
          - button "Criar PR PASS GOLD" [ref=e232] [cursor=pointer]
          - button "Auto-merge Policy" [ref=e233] [cursor=pointer]
      - generic [ref=e234]:
        - heading "V10 ENTERPRISE FOUNDATION" [level=2] [ref=e235]
        - generic [ref=e236]:
          - generic [ref=e237]:
            - strong [ref=e238]: Multi-projeto
            - generic [ref=e239]: gestão por stack e estado GOLD
          - generic [ref=e240]:
            - strong [ref=e241]: Métricas reais
            - generic [ref=e242]: runtime, delivery e GitHub
          - generic [ref=e243]:
            - strong [ref=e244]: Hermes votando
            - generic [ref=e245]: consenso antes do PR
          - generic [ref=e246]:
            - strong [ref=e247]: Auto-merge condicionado
            - generic [ref=e248]: só com checks + GOLD
          - generic [ref=e249]:
            - strong [ref=e250]: Workers distribuídos
            - generic [ref=e251]: filas por execução/rollback
          - generic [ref=e252]:
            - strong [ref=e253]: Billing SaaS
            - generic [ref=e254]: planos prontos para Stripe
      - generic [ref=e255]:
        - paragraph [ref=e256]: AI API VAULT - PROVEDORES PAGOS - ROTEAMENTO INTELIGENTE
        - heading "Menu para adicionar APIs de IAs pagas" [level=2] [ref=e257]
        - paragraph [ref=e258]: Conecte provedores comerciais e defina prioridade/fallback. As chaves ficam preparadas para uso via variaveis de ambiente ou vault local em desenvolvimento.
        - generic [ref=e259]:
          - button "OpenAI GPT / Vision / Assistants" [ref=e260] [cursor=pointer]:
            - strong [ref=e261]: OpenAI
            - generic [ref=e262]: GPT / Vision / Assistants
          - button "Anthropic Claude" [ref=e263] [cursor=pointer]:
            - strong [ref=e264]: Anthropic
            - generic [ref=e265]: Claude
          - button "Google Gemini Flash / Pro / Vision" [ref=e266] [cursor=pointer]:
            - strong [ref=e267]: Google Gemini
            - generic [ref=e268]: Flash / Pro / Vision
          - button "OpenRouter multi-model fallback" [ref=e269] [cursor=pointer]:
            - strong [ref=e270]: OpenRouter
            - generic [ref=e271]: multi-model fallback
          - button "Groq alta velocidade" [ref=e272] [cursor=pointer]:
            - strong [ref=e273]: Groq
            - generic [ref=e274]: alta velocidade
          - button "DeepSeek reasoner/code" [ref=e275] [cursor=pointer]:
            - strong [ref=e276]: DeepSeek
            - generic [ref=e277]: reasoner/code
        - generic [ref=e278]:
          - generic [ref=e279]: Provider
          - combobox [ref=e280]:
            - option "OpenAI" [selected]
            - option "Anthropic"
            - option "Google Gemini"
            - option "OpenRouter"
            - option "Groq"
            - option "DeepSeek"
          - generic [ref=e281]: API Key
          - textbox "cole sua chave aqui..." [ref=e282]
          - generic [ref=e283]: Modelo padrao
          - 'textbox "ex: gpt-4.1, claude-3.7-sonnet, gemini-2.0-flash" [ref=e284]'
          - generic [ref=e285]: Prioridade
          - combobox [ref=e286]:
            - option "primary" [selected]
            - option "fallback"
            - option "disabled"
        - generic [ref=e287]:
          - button "SALVAR PROVIDER" [ref=e288] [cursor=pointer]
          - button "TESTAR PROVIDER" [ref=e289] [cursor=pointer]
          - link "VER LANDING STARTUP" [ref=e290] [cursor=pointer]:
            - /url: landing.html
        - generic [ref=e291]: Nenhuma API salva nesta sessao.
      - generic [ref=e292]:
        - heading "TOOLS MARKETPLACE" [level=2] [ref=e293]
        - paragraph [ref=e294]: Conectores preparados para GitHub, Cloudflare, Railway, Docker, Langfuse e billing.
      - generic [ref=e295]:
        - generic [ref=e296]:
          - heading "LIVE EXECUTION STREAM" [level=2] [ref=e297]
          - button "BAIXAR LOGS" [ref=e298] [cursor=pointer]
        - generic [ref=e299]:
          - generic [ref=e300]: "[CLEAN] Controlled closure ativo — commit: d8e3967"
          - generic [ref=e301]: "[CLEAN] 1164 files OK"
          - generic [ref=e302]: "[CLEAN] RTE chain complete: true"
          - generic [ref=e303]: "[CLEAN] Final closure tests: 101 passed"
          - generic [ref=e304]: "[CLEAN] Todas as ações de release bloqueadas."
      - generic [ref=e305]:
        - generic [ref=e306]:
          - generic [ref=e307]:
            - paragraph [ref=e308]: AGENT METRICS • CUSTO POR AGENTE • PIPELINE
            - heading "MÉTRICAS DOS AGENTES" [level=2] [ref=e309]
            - paragraph [ref=e310]:
              - text: Ligado ao backend em
              - code [ref=e311]: /api/metrics/agents
              - text: . Quando o backend estiver offline, a tela mantém fallback local marcado como UI local.
          - generic [ref=e312]: UI LOCAL
        - generic [ref=e313]:
          - generic [ref=e314]:
            - generic [ref=e315]: OpenClaw
            - generic [ref=e317]: CONVERSA
            - generic [ref=e320]: $0.163
          - generic [ref=e321]:
            - generic [ref=e322]: Hermes RCA
            - generic [ref=e324]: CONVERSA
            - generic [ref=e327]: $0.815
          - generic [ref=e328]:
            - generic [ref=e329]: Scanner
            - generic [ref=e331]: CONVERSA
            - generic [ref=e334]: $0.377
          - generic [ref=e335]:
            - generic [ref=e336]: Aegis
            - generic [ref=e338]: CONVERSA
            - generic [ref=e341]: $0.264
          - generic [ref=e342]:
            - generic [ref=e343]: PatchEngine
            - generic [ref=e345]: LOOP
            - generic [ref=e348]: $0.668
          - generic [ref=e349]:
            - generic [ref=e350]: PI HARNESS
            - generic [ref=e352]: ADAPTIVE
            - generic [ref=e355]: L0-L9
          - generic [ref=e356]:
            - generic [ref=e357]: PASS GOLD
            - generic [ref=e359]: LOOP
            - generic [ref=e362]: $0.471
          - generic [ref=e363]:
            - generic [ref=e364]: Benchmark
            - generic [ref=e366]: AUTO
            - generic [ref=e369]: $1.469
        - generic [ref=e370]:
          - generic [ref=e371]: TOTAL PIPELINE
          - generic [ref=e372]: $13.227
      - generic [ref=e373]:
        - generic [ref=e374]:
          - generic [ref=e375]:
            - paragraph [ref=e376]: OPENSQUAD RESERVE • AGENTES QUE TRABALHAM FORA DO MENU PRINCIPAL
            - heading "AGENTES EXTRAS EM EXECUÇÃO" [level=2] [ref=e377]
            - paragraph [ref=e378]:
              - text: Catálogo lido do backend em
              - code [ref=e379]: /api/agents/catalog
              - text: ", usando os nomes e funções reais do projeto."
          - button "Ver OpenSquad" [ref=e380] [cursor=pointer]
        - generic [ref=e381]:
          - generic [ref=e382] [cursor=pointer]:
            - generic [ref=e383]:
              - generic [ref=e384]: ⬡
              - generic [ref=e385]: ATIVO
            - generic [ref=e386]: BACKEND
            - generic [ref=e387]: Agente Backend
            - generic [ref=e388]: Express, Node.js, rotas, middlewares e erros de servidor.
            - generic [ref=e389]:
              - generic [ref=e390]: routes
              - generic [ref=e391]: api
              - generic [ref=e392]: server
            - generic [ref=e393]:
              - generic [ref=e394]: CONVERSA
              - generic [ref=e395]:
                - button "OFF" [ref=e396]
                - button "AUTO" [ref=e397]
                - button "ON" [ref=e398]
          - generic [ref=e399] [cursor=pointer]:
            - generic [ref=e400]:
              - generic [ref=e401]: ⬡
              - generic [ref=e402]: ATIVO
            - generic [ref=e403]: DATABASE
            - generic [ref=e404]: Agente Database
            - generic [ref=e405]: SQL, queries, conexões, migrations e modelos de dados.
            - generic [ref=e406]:
              - generic [ref=e407]: sql
              - generic [ref=e408]: schema
              - generic [ref=e409]: db
            - generic [ref=e410]:
              - generic [ref=e411]: CONVERSA
              - generic [ref=e412]:
                - button "OFF" [ref=e413]
                - button "AUTO" [ref=e414]
                - button "ON" [ref=e415]
          - generic [ref=e416] [cursor=pointer]:
            - generic [ref=e417]:
              - generic [ref=e418]: ⬡
              - generic [ref=e419]: ATIVO
            - generic [ref=e420]: AUTH
            - generic [ref=e421]: Agente Auth
            - generic [ref=e422]: Autenticação, tokens, sessões, CORS e permissões.
            - generic [ref=e423]:
              - generic [ref=e424]: jwt
              - generic [ref=e425]: cors
              - generic [ref=e426]: 401/403
            - generic [ref=e427]:
              - generic [ref=e428]: CONVERSA
              - generic [ref=e429]:
                - button "OFF" [ref=e430]
                - button "AUTO" [ref=e431]
                - button "ON" [ref=e432]
          - generic [ref=e433] [cursor=pointer]:
            - generic [ref=e434]:
              - generic [ref=e435]: ▣
              - generic [ref=e436]: ATIVO
            - generic [ref=e437]: UPLOAD
            - generic [ref=e438]: Agente Upload/Media
            - generic [ref=e439]: Multer, arquivos, mimetypes, storage, imagens e vision upload.
            - generic [ref=e440]:
              - generic [ref=e441]: multer
              - generic [ref=e442]: req.file
              - generic [ref=e443]: media
            - generic [ref=e444]:
              - generic [ref=e445]: CONVERSA
              - generic [ref=e446]:
                - button "OFF" [ref=e447]
                - button "AUTO" [ref=e448]
                - button "ON" [ref=e449]
          - generic [ref=e450] [cursor=pointer]:
            - generic [ref=e451]:
              - generic [ref=e452]: ⬡
              - generic [ref=e453]: ATIVO
            - generic [ref=e454]: CONFIG
            - generic [ref=e455]: Agente Config
            - generic [ref=e456]: .env, variáveis, portas, host e configuração de ambiente.
            - generic [ref=e457]:
              - generic [ref=e458]: env
              - generic [ref=e459]: port
              - generic [ref=e460]: config
            - generic [ref=e461]:
              - generic [ref=e462]: CONVERSA
              - generic [ref=e463]:
                - button "OFF" [ref=e464]
                - button "AUTO" [ref=e465]
                - button "ON" [ref=e466]
          - generic [ref=e467] [cursor=pointer]:
            - generic [ref=e468]:
              - generic [ref=e469]: ⬡
              - generic [ref=e470]: ATIVO
            - generic [ref=e471]: NETWORK
            - generic [ref=e472]: Agente Network
            - generic [ref=e473]: HTTP, timeouts, DNS, fetch, axios e conexões externas.
            - generic [ref=e474]:
              - generic [ref=e475]: http
              - generic [ref=e476]: timeout
              - generic [ref=e477]: dns
            - generic [ref=e478]:
              - generic [ref=e479]: CONVERSA
              - generic [ref=e480]:
                - button "OFF" [ref=e481]
                - button "AUTO" [ref=e482]
                - button "ON" [ref=e483]
          - generic [ref=e484] [cursor=pointer]:
            - generic [ref=e485]:
              - generic [ref=e486]: ▣
              - generic [ref=e487]: ATIVO
            - generic [ref=e488]: LOCATOR
            - generic [ref=e489]: Reserve Locator
            - generic [ref=e490]: Localizar arquivo alvo quando o Scanner falhar.
            - generic [ref=e491]:
              - generic [ref=e492]: extra_scan_hints
              - generic [ref=e493]: target_recommendations
            - generic [ref=e494]:
              - generic [ref=e495]: CIRÚRGICO
              - generic [ref=e496]:
                - button "OFF" [ref=e497]
                - button "AUTO" [ref=e498]
                - button "ON" [ref=e499]
          - generic [ref=e500] [cursor=pointer]:
            - generic [ref=e501]:
              - generic [ref=e502]: ▣
              - generic [ref=e503]: ATIVO
            - generic [ref=e504]: SECURITY
            - generic [ref=e505]: Reserve Security
            - generic [ref=e506]: Revisar patches de alto risco e autenticação.
            - generic [ref=e507]:
              - generic [ref=e508]: risk_review
              - generic [ref=e509]: security_notes
            - generic [ref=e510]:
              - generic [ref=e511]: CIRÚRGICO
              - generic [ref=e512]:
                - button "OFF" [ref=e513]
                - button "AUTO" [ref=e514]
                - button "ON" [ref=e515]
          - generic [ref=e516] [cursor=pointer]:
            - generic [ref=e517]:
              - generic [ref=e518]: ⬡
              - generic [ref=e519]: ATIVO
            - generic [ref=e520]: VALIDATOR
            - generic [ref=e521]: Reserve Validator
            - generic [ref=e522]: Sugerir validações adicionais antes do PASS GOLD.
            - generic [ref=e524]: validation_suggestions
            - generic [ref=e525]:
              - generic [ref=e526]: LOOP
              - generic [ref=e527]:
                - button "OFF" [ref=e528]
                - button "AUTO" [ref=e529]
                - button "ON" [ref=e530]
          - generic [ref=e531] [cursor=pointer]:
            - generic [ref=e532]:
              - generic [ref=e533]: ▣
              - generic [ref=e534]: ATIVO
            - generic [ref=e535]: ARCHITECT
            - generic [ref=e536]: Reserve Architect
            - generic [ref=e537]: Revisar mudanças amplas de arquitetura.
            - generic [ref=e538]:
              - generic [ref=e539]: architecture
              - generic [ref=e540]: refactor
            - generic [ref=e541]:
              - generic [ref=e542]: CIRÚRGICO
              - generic [ref=e543]:
                - button "OFF" [ref=e544]
                - button "AUTO" [ref=e545]
                - button "ON" [ref=e546]
          - generic [ref=e547] [cursor=pointer]:
            - generic [ref=e548]:
              - generic [ref=e549]: ⬡
              - generic [ref=e550]: ATIVO
            - generic [ref=e551]: MEMORY
            - generic [ref=e552]: Reserve Memory
            - generic [ref=e553]: Consultar histórico de incidentes sem executar ações.
            - generic [ref=e554]:
              - generic [ref=e555]: memory
              - generic [ref=e556]: incidents
            - generic [ref=e557]:
              - generic [ref=e558]: CONSULTA
              - generic [ref=e559]:
                - button "OFF" [ref=e560]
                - button "AUTO" [ref=e561]
                - button "ON" [ref=e562]
      - text: ▸ ▸
    - complementary [ref=e563]:
      - generic [ref=e564]:
        - paragraph [ref=e565]: MISSION INPUT
        - paragraph [ref=e566]: Arquitetura multiagente sugerida
        - generic [ref=e567]:
          - img
          - generic [ref=e568]:
            - img [ref=e569]
            - generic [ref=e572]: FECHADO
            - generic [ref=e573]: CONTROLLED CLOSURE
            - generic [ref=e574]: origem da missão, objetivo, contexto e restrições
          - generic [ref=e575] [cursor=pointer]:
            - img [ref=e577]
            - generic [ref=e579]: PI HARNESS
            - generic [ref=e580]: Mission Runner
            - generic [ref=e581]: AGUARDA
          - generic [ref=e582] [cursor=pointer]:
            - img [ref=e584]
            - generic [ref=e590]: HERMES
            - generic [ref=e591]: Supervisor / RCA
            - generic [ref=e592]: AGUARDA
          - generic [ref=e593] [cursor=pointer]:
            - img [ref=e595]
            - generic [ref=e597]: OPENCLAW
            - generic [ref=e598]: Orchestrator
            - generic [ref=e599]: AGUARDA
          - generic [ref=e600] [cursor=pointer]:
            - img [ref=e602]
            - generic [ref=e605]: SCANNER
            - generic [ref=e606]: Context Builder
            - generic [ref=e607]: AGUARDA
          - generic [ref=e608] [cursor=pointer]:
            - img [ref=e610]
            - generic [ref=e613]: PATCH ENGINE
            - generic [ref=e614]: Exec. controlada
            - generic [ref=e615]: AGUARDA
          - generic [ref=e616] [cursor=pointer]:
            - img [ref=e618]
            - generic [ref=e621]: AEGIS
            - generic [ref=e622]: Security Gate
            - generic [ref=e623]: AGUARDA
          - generic [ref=e624] [cursor=pointer]:
            - img [ref=e626]
            - generic [ref=e630]: GO CORE
            - generic [ref=e631]: Runtime Truth
            - generic [ref=e632]: AGUARDA
          - generic [ref=e633] [cursor=pointer]:
            - img [ref=e635]
            - generic [ref=e637]: PASS GOLD
            - generic [ref=e638]: Final Authority
            - generic [ref=e639]: AGUARDA
          - generic [ref=e640] [cursor=pointer]:
            - img [ref=e642]
            - generic [ref=e644]: ARCHIVIST
            - generic [ref=e645]: Memory Guard
            - generic [ref=e646]: AGUARDA
          - generic [ref=e647] [cursor=pointer]:
            - img [ref=e649]
            - generic [ref=e654]: GITHUB AGENT
            - generic [ref=e655]: PR / CI / Release
            - generic [ref=e656]: AGUARDA
        - generic [ref=e657]:
          - generic [ref=e658]:
            - generic [ref=e659]: ●
            - text: "Decisão: Hermes, OpenClaw"
          - generic [ref=e660]:
            - generic [ref=e661]: ●
            - text: "Execução: PI Harness, Scanner, PatchEngine"
          - generic [ref=e662]:
            - generic [ref=e663]: ●
            - text: "Validação: Aegis, Go Core, PASS GOLD"
          - generic [ref=e664]:
            - generic [ref=e665]: ●
            - text: "Memória: Archivist · Governança: GitHub Agent"
        - generic [ref=e666]:
          - generic [ref=e667]: AGENT METRICS
          - generic [ref=e668]: ● LIVE
        - generic [ref=e669]:
          - generic [ref=e670]:
            - generic [ref=e671]: OpenClaw
            - generic [ref=e673]: —
          - generic [ref=e674]:
            - generic [ref=e675]: Hermes RCA
            - generic [ref=e677]: —
          - generic [ref=e678]:
            - generic [ref=e679]: Scanner
            - generic [ref=e681]: —
          - generic [ref=e682]:
            - generic [ref=e683]: Aegis
            - generic [ref=e685]: —
          - generic [ref=e686]:
            - generic [ref=e687]: PatchEngine
            - generic [ref=e689]: —
          - generic [ref=e690]:
            - generic [ref=e691]: PASS GOLD
            - generic [ref=e693]: —
        - generic [ref=e694]:
          - generic [ref=e695]: TOTAL PIPELINE
          - generic [ref=e696]: —
        - generic [ref=e697]:
          - button "PIPELINE" [ref=e698] [cursor=pointer]
          - button "AGENT LOCAL" [ref=e699] [cursor=pointer]
        - generic [ref=e701]:
          - generic [ref=e702]:
            - generic [ref=e703]: OpenClaw
            - generic [ref=e704]: —
          - generic [ref=e705]:
            - generic [ref=e706]: Scanner
            - generic [ref=e707]: —
          - generic [ref=e708]:
            - generic [ref=e709]: Hermes
            - generic [ref=e710]: —
          - generic [ref=e711]:
            - generic [ref=e712]: Aegis
            - generic [ref=e713]: —
          - generic [ref=e714]:
            - generic [ref=e715]: PASS GOLD
            - generic [ref=e716]: —
      - generic [ref=e717]:
        - heading "GATES (SDDF)" [level=2] [ref=e718]
        - generic [ref=e719]:
          - generic [ref=e720]: SECURITY
          - generic [ref=e721]: —
        - generic [ref=e722]:
          - generic [ref=e723]: COMPATIBILITY
          - generic [ref=e724]: —
        - generic [ref=e725]:
          - generic [ref=e726]: STABILITY
          - generic [ref=e727]: —
        - generic [ref=e728]:
          - generic [ref=e729]: RUNTIME
          - generic [ref=e730]: —
        - generic [ref=e731]:
          - generic [ref=e732]: DIFF
          - generic [ref=e733]: READY
        - generic [ref=e734]:
          - generic [ref=e735]: VAULT
          - generic [ref=e736]: ACTIVE
        - generic [ref=e737]:
          - generic [ref=e738]: PROMOTION
          - generic [ref=e739]: REQUIRES GOLD
        - generic [ref=e740]:
          - generic [ref=e741]: GITHUB PR
          - generic [ref=e742]: REAL API
      - heading "HERMES CONSENSUS" [level=2] [ref=e744]
      - generic [ref=e745]:
        - heading "STABLE VAULT" [level=2] [ref=e746]
        - generic [ref=e747]:
          - generic [ref=e748]: Snapshots
          - generic [ref=e749]: ACTIVE
        - generic [ref=e750]:
          - generic [ref=e751]: Patches
          - generic [ref=e752]: TRACKED
        - generic [ref=e753]:
          - generic [ref=e754]: Rollback
          - generic [ref=e755]: READY
      - generic [ref=e756]:
        - heading "MEMORY / OBSIDIAN" [level=2] [ref=e757]
        - generic [ref=e758]:
          - generic [ref=e759]: Vault
          - generic [ref=e760]: LINKED
        - generic [ref=e761]:
          - generic [ref=e762]: Incidents
          - generic [ref=e763]: PERSIST
      - generic [ref=e764]:
        - generic [ref=e765]:
          - generic [ref=e766]:
            - paragraph [ref=e767]: ARQUITETURA ESCALÁVEL — RESERVADO
            - heading "OPENCLAW / OPENSQUAD" [level=2] [ref=e768]
          - generic [ref=e769]: SCALE TIER
        - paragraph [ref=e770]: Infraestrutura de agentes paralelos para problemas que exigem trabalho simultâneo em múltiplas camadas — banco de dados, backend e frontend ao mesmo tempo. Reservado para casos de escala onde um único agente não é suficiente.
        - generic [ref=e771]:
          - generic [ref=e772]:
            - generic [ref=e774]:
              - strong [ref=e775]: HERMES
              - generic [ref=e776]: RCA · Orquestrador principal
            - generic [ref=e777]: ATIVO
          - generic [ref=e778]:
            - generic [ref=e780]:
              - strong [ref=e781]: OPENCLAW
              - generic [ref=e782]: Router · Distribuição de missões
            - generic [ref=e783]: RESERVADO
          - generic [ref=e784]:
            - generic [ref=e786]:
              - strong [ref=e787]: SQUAD α
              - generic [ref=e788]: Agente especialista · Database layer
            - generic [ref=e789]: ESCALA
          - generic [ref=e790]:
            - generic [ref=e792]:
              - strong [ref=e793]: SQUAD β
              - generic [ref=e794]: Agente especialista · API layer
            - generic [ref=e795]: ESCALA
          - generic [ref=e796]:
            - generic [ref=e798]:
              - strong [ref=e799]: SQUAD γ
              - generic [ref=e800]: Agente especialista · Frontend layer
            - generic [ref=e801]: ESCALA
        - generic [ref=e802]:
          - generic [ref=e803]: Erro complexo
          - generic [ref=e804]: →
          - generic [ref=e805]: OPENCLAW
          - generic [ref=e806]: →
          - generic [ref=e807]: N squads paralelos
          - generic [ref=e808]: →
          - generic [ref=e809]: Consolidação
          - generic [ref=e810]: →
          - generic [ref=e811]: PASS GOLD
        - generic [ref=e812]:
          - generic [ref=e813]: Ativação automática quando missão exige > 1 agente
          - generic [ref=e814]: MULTI-TENANT TIER
      - generic [ref=e815]:
        - heading "OSINT TOOLS" [level=2] [ref=e816]
        - generic [ref=e817]:
          - generic [ref=e818]: SpiderFoot
          - generic [ref=e819]: DOCKER
        - generic [ref=e820]:
          - generic [ref=e821]: Recon-ng
          - generic [ref=e822]: SANDBOX
        - generic [ref=e823]:
          - generic [ref=e824]: Maryam
          - generic [ref=e825]: SANDBOX
      - generic [ref=e826]:
        - heading "WORKERS" [level=2] [ref=e827]
        - button "ATUALIZAR FILA" [ref=e828] [cursor=pointer]
  - generic "Controlled closure ativo — decisão humana final requerida" [ref=e829]:
    - generic [ref=e831]: CLOSURE
    - generic [ref=e832]: ▂▄▆█
  - dialog [ref=e834]:
    - generic:
      - img
      - img
    - generic [ref=e835]: 1 / 13
    - generic [ref=e836]: 👋 Bem-vindo ao Vision Core!
    - generic [ref=e837]: Este é um sistema autônomo de desenvolvimento com IA. Ele detecta erros, corrige código, valida e cria PRs no GitHub automaticamente. Vamos mostrar tudo em 12 passos rápidos.
    - button [ref=e839] [cursor=pointer]: Próximo →
    - generic [ref=e840]:
      - button [ref=e841] [cursor=pointer]: Pular tutorial
      - generic [ref=e842] [cursor=pointer]:
        - checkbox [ref=e843]
        - text: Não exibir novamente
  - button "Ver tutorial novamente" [ref=e844] [cursor=pointer]: 🪐
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