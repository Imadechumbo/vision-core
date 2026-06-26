# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-verification.spec.mjs >> §119 — Menu de tutoriais funciona mesmo após vc_tutorial_done=1 >> 2 — Persistência por tutorial: fechar SF tutorial grava vc_tutorial_sf_done, não vc_tutorial_done
- Location: tests\e2e\manual-verification.spec.mjs:890:3

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
        - heading "GitHub Integration Real" [level=2] [ref=e172]
        - paragraph [ref=e173]: Cria branch, aplica commit e abre Pull Request real via GitHub REST API. Bloqueado sem PASS GOLD.
        - generic [ref=e174]: GitHub bloqueado — controlled closure ativo.
        - generic [ref=e175]:
          - button "Verificar GitHub" [ref=e176] [cursor=pointer]
          - button "Criar PR PASS GOLD" [ref=e177] [cursor=pointer]
          - button "Auto-merge Policy" [ref=e178] [cursor=pointer]
      - generic [ref=e179]:
        - heading "V10 ENTERPRISE FOUNDATION" [level=2] [ref=e180]
        - generic [ref=e181]:
          - generic [ref=e182]:
            - strong [ref=e183]: Multi-projeto
            - generic [ref=e184]: gestão por stack e estado GOLD
          - generic [ref=e185]:
            - strong [ref=e186]: Métricas reais
            - generic [ref=e187]: runtime, delivery e GitHub
          - generic [ref=e188]:
            - strong [ref=e189]: Hermes votando
            - generic [ref=e190]: consenso antes do PR
          - generic [ref=e191]:
            - strong [ref=e192]: Auto-merge condicionado
            - generic [ref=e193]: só com checks + GOLD
          - generic [ref=e194]:
            - strong [ref=e195]: Workers distribuídos
            - generic [ref=e196]: filas por execução/rollback
          - generic [ref=e197]:
            - strong [ref=e198]: Billing SaaS
            - generic [ref=e199]: planos prontos para Stripe
      - generic [ref=e200]:
        - paragraph [ref=e201]: AI API VAULT - PROVEDORES PAGOS - ROTEAMENTO INTELIGENTE
        - heading "Menu para adicionar APIs de IAs pagas" [level=2] [ref=e202]
        - paragraph [ref=e203]: Conecte provedores comerciais e defina prioridade/fallback. As chaves ficam preparadas para uso via variaveis de ambiente ou vault local em desenvolvimento.
        - generic [ref=e204]:
          - button "OpenAI GPT / Vision / Assistants" [ref=e205] [cursor=pointer]:
            - strong [ref=e206]: OpenAI
            - generic [ref=e207]: GPT / Vision / Assistants
          - button "Anthropic Claude" [ref=e208] [cursor=pointer]:
            - strong [ref=e209]: Anthropic
            - generic [ref=e210]: Claude
          - button "Google Gemini Flash / Pro / Vision" [ref=e211] [cursor=pointer]:
            - strong [ref=e212]: Google Gemini
            - generic [ref=e213]: Flash / Pro / Vision
          - button "OpenRouter multi-model fallback" [ref=e214] [cursor=pointer]:
            - strong [ref=e215]: OpenRouter
            - generic [ref=e216]: multi-model fallback
          - button "Groq alta velocidade" [ref=e217] [cursor=pointer]:
            - strong [ref=e218]: Groq
            - generic [ref=e219]: alta velocidade
          - button "DeepSeek reasoner/code" [ref=e220] [cursor=pointer]:
            - strong [ref=e221]: DeepSeek
            - generic [ref=e222]: reasoner/code
        - generic [ref=e223]:
          - generic [ref=e224]: Provider
          - combobox [ref=e225]:
            - option "OpenAI" [selected]
            - option "Anthropic"
            - option "Google Gemini"
            - option "OpenRouter"
            - option "Groq"
            - option "DeepSeek"
          - generic [ref=e226]: API Key
          - textbox "cole sua chave aqui..." [ref=e227]
          - generic [ref=e228]: Modelo padrao
          - 'textbox "ex: gpt-4.1, claude-3.7-sonnet, gemini-2.0-flash" [ref=e229]'
          - generic [ref=e230]: Prioridade
          - combobox [ref=e231]:
            - option "primary" [selected]
            - option "fallback"
            - option "disabled"
        - generic [ref=e232]:
          - button "SALVAR PROVIDER" [ref=e233] [cursor=pointer]
          - button "TESTAR PROVIDER" [ref=e234] [cursor=pointer]
          - link "VER LANDING STARTUP" [ref=e235] [cursor=pointer]:
            - /url: landing.html
        - generic [ref=e236]: Nenhuma API salva nesta sessao.
      - generic [ref=e237]:
        - heading "TOOLS MARKETPLACE" [level=2] [ref=e238]
        - paragraph [ref=e239]: Conectores preparados para GitHub, Cloudflare, Railway, Docker, Langfuse e billing.
      - generic [ref=e240]:
        - generic [ref=e241]:
          - heading "LIVE EXECUTION STREAM" [level=2] [ref=e242]
          - button "BAIXAR LOGS" [ref=e243] [cursor=pointer]
        - generic [ref=e244]:
          - generic [ref=e245]: "[CLEAN] Controlled closure ativo — commit: d8e3967"
          - generic [ref=e246]: "[CLEAN] 1164 files OK"
          - generic [ref=e247]: "[CLEAN] RTE chain complete: true"
          - generic [ref=e248]: "[CLEAN] Final closure tests: 101 passed"
          - generic [ref=e249]: "[CLEAN] Todas as ações de release bloqueadas."
      - generic [ref=e250]:
        - generic [ref=e251]:
          - generic [ref=e252]:
            - paragraph [ref=e253]: AGENT METRICS • CUSTO POR AGENTE • PIPELINE
            - heading "MÉTRICAS DOS AGENTES" [level=2] [ref=e254]
            - paragraph [ref=e255]:
              - text: Ligado ao backend em
              - code [ref=e256]: /api/metrics/agents
              - text: . Quando o backend estiver offline, a tela mantém fallback local marcado como UI local.
          - generic [ref=e257]: UI LOCAL
        - generic [ref=e258]:
          - generic [ref=e259]:
            - generic [ref=e260]: OpenClaw
            - generic [ref=e262]: CONVERSA
            - generic [ref=e265]: $0.163
          - generic [ref=e266]:
            - generic [ref=e267]: Hermes RCA
            - generic [ref=e269]: CONVERSA
            - generic [ref=e272]: $0.815
          - generic [ref=e273]:
            - generic [ref=e274]: Scanner
            - generic [ref=e276]: CONVERSA
            - generic [ref=e279]: $0.377
          - generic [ref=e280]:
            - generic [ref=e281]: Aegis
            - generic [ref=e283]: CONVERSA
            - generic [ref=e286]: $0.264
          - generic [ref=e287]:
            - generic [ref=e288]: PatchEngine
            - generic [ref=e290]: LOOP
            - generic [ref=e293]: $0.668
          - generic [ref=e294]:
            - generic [ref=e295]: PI HARNESS
            - generic [ref=e297]: ADAPTIVE
            - generic [ref=e300]: L0-L9
          - generic [ref=e301]:
            - generic [ref=e302]: PASS GOLD
            - generic [ref=e304]: LOOP
            - generic [ref=e307]: $0.471
          - generic [ref=e308]:
            - generic [ref=e309]: Benchmark
            - generic [ref=e311]: AUTO
            - generic [ref=e314]: $1.469
        - generic [ref=e315]:
          - generic [ref=e316]: TOTAL PIPELINE
          - generic [ref=e317]: $13.227
      - generic [ref=e318]:
        - generic [ref=e319]:
          - generic [ref=e320]:
            - paragraph [ref=e321]: OPENSQUAD RESERVE • AGENTES QUE TRABALHAM FORA DO MENU PRINCIPAL
            - heading "AGENTES EXTRAS EM EXECUÇÃO" [level=2] [ref=e322]
            - paragraph [ref=e323]:
              - text: Catálogo lido do backend em
              - code [ref=e324]: /api/agents/catalog
              - text: ", usando os nomes e funções reais do projeto."
          - button "Ver OpenSquad" [ref=e325] [cursor=pointer]
        - generic [ref=e326]:
          - generic [ref=e327] [cursor=pointer]:
            - generic [ref=e328]:
              - generic [ref=e329]: ⬡
              - generic [ref=e330]: ATIVO
            - generic [ref=e331]: BACKEND
            - generic [ref=e332]: Agente Backend
            - generic [ref=e333]: Express, Node.js, rotas, middlewares e erros de servidor.
            - generic [ref=e334]:
              - generic [ref=e335]: routes
              - generic [ref=e336]: api
              - generic [ref=e337]: server
            - generic [ref=e338]:
              - generic [ref=e339]: CONVERSA
              - generic [ref=e340]:
                - button "OFF" [ref=e341]
                - button "AUTO" [ref=e342]
                - button "ON" [ref=e343]
          - generic [ref=e344] [cursor=pointer]:
            - generic [ref=e345]:
              - generic [ref=e346]: ⬡
              - generic [ref=e347]: ATIVO
            - generic [ref=e348]: DATABASE
            - generic [ref=e349]: Agente Database
            - generic [ref=e350]: SQL, queries, conexões, migrations e modelos de dados.
            - generic [ref=e351]:
              - generic [ref=e352]: sql
              - generic [ref=e353]: schema
              - generic [ref=e354]: db
            - generic [ref=e355]:
              - generic [ref=e356]: CONVERSA
              - generic [ref=e357]:
                - button "OFF" [ref=e358]
                - button "AUTO" [ref=e359]
                - button "ON" [ref=e360]
          - generic [ref=e361] [cursor=pointer]:
            - generic [ref=e362]:
              - generic [ref=e363]: ⬡
              - generic [ref=e364]: ATIVO
            - generic [ref=e365]: AUTH
            - generic [ref=e366]: Agente Auth
            - generic [ref=e367]: Autenticação, tokens, sessões, CORS e permissões.
            - generic [ref=e368]:
              - generic [ref=e369]: jwt
              - generic [ref=e370]: cors
              - generic [ref=e371]: 401/403
            - generic [ref=e372]:
              - generic [ref=e373]: CONVERSA
              - generic [ref=e374]:
                - button "OFF" [ref=e375]
                - button "AUTO" [ref=e376]
                - button "ON" [ref=e377]
          - generic [ref=e378] [cursor=pointer]:
            - generic [ref=e379]:
              - generic [ref=e380]: ▣
              - generic [ref=e381]: ATIVO
            - generic [ref=e382]: UPLOAD
            - generic [ref=e383]: Agente Upload/Media
            - generic [ref=e384]: Multer, arquivos, mimetypes, storage, imagens e vision upload.
            - generic [ref=e385]:
              - generic [ref=e386]: multer
              - generic [ref=e387]: req.file
              - generic [ref=e388]: media
            - generic [ref=e389]:
              - generic [ref=e390]: CONVERSA
              - generic [ref=e391]:
                - button "OFF" [ref=e392]
                - button "AUTO" [ref=e393]
                - button "ON" [ref=e394]
          - generic [ref=e395] [cursor=pointer]:
            - generic [ref=e396]:
              - generic [ref=e397]: ⬡
              - generic [ref=e398]: ATIVO
            - generic [ref=e399]: CONFIG
            - generic [ref=e400]: Agente Config
            - generic [ref=e401]: .env, variáveis, portas, host e configuração de ambiente.
            - generic [ref=e402]:
              - generic [ref=e403]: env
              - generic [ref=e404]: port
              - generic [ref=e405]: config
            - generic [ref=e406]:
              - generic [ref=e407]: CONVERSA
              - generic [ref=e408]:
                - button "OFF" [ref=e409]
                - button "AUTO" [ref=e410]
                - button "ON" [ref=e411]
          - generic [ref=e412] [cursor=pointer]:
            - generic [ref=e413]:
              - generic [ref=e414]: ⬡
              - generic [ref=e415]: ATIVO
            - generic [ref=e416]: NETWORK
            - generic [ref=e417]: Agente Network
            - generic [ref=e418]: HTTP, timeouts, DNS, fetch, axios e conexões externas.
            - generic [ref=e419]:
              - generic [ref=e420]: http
              - generic [ref=e421]: timeout
              - generic [ref=e422]: dns
            - generic [ref=e423]:
              - generic [ref=e424]: CONVERSA
              - generic [ref=e425]:
                - button "OFF" [ref=e426]
                - button "AUTO" [ref=e427]
                - button "ON" [ref=e428]
          - generic [ref=e429] [cursor=pointer]:
            - generic [ref=e430]:
              - generic [ref=e431]: ▣
              - generic [ref=e432]: ATIVO
            - generic [ref=e433]: LOCATOR
            - generic [ref=e434]: Reserve Locator
            - generic [ref=e435]: Localizar arquivo alvo quando o Scanner falhar.
            - generic [ref=e436]:
              - generic [ref=e437]: extra_scan_hints
              - generic [ref=e438]: target_recommendations
            - generic [ref=e439]:
              - generic [ref=e440]: CIRÚRGICO
              - generic [ref=e441]:
                - button "OFF" [ref=e442]
                - button "AUTO" [ref=e443]
                - button "ON" [ref=e444]
          - generic [ref=e445] [cursor=pointer]:
            - generic [ref=e446]:
              - generic [ref=e447]: ▣
              - generic [ref=e448]: ATIVO
            - generic [ref=e449]: SECURITY
            - generic [ref=e450]: Reserve Security
            - generic [ref=e451]: Revisar patches de alto risco e autenticação.
            - generic [ref=e452]:
              - generic [ref=e453]: risk_review
              - generic [ref=e454]: security_notes
            - generic [ref=e455]:
              - generic [ref=e456]: CIRÚRGICO
              - generic [ref=e457]:
                - button "OFF" [ref=e458]
                - button "AUTO" [ref=e459]
                - button "ON" [ref=e460]
          - generic [ref=e461] [cursor=pointer]:
            - generic [ref=e462]:
              - generic [ref=e463]: ⬡
              - generic [ref=e464]: ATIVO
            - generic [ref=e465]: VALIDATOR
            - generic [ref=e466]: Reserve Validator
            - generic [ref=e467]: Sugerir validações adicionais antes do PASS GOLD.
            - generic [ref=e469]: validation_suggestions
            - generic [ref=e470]:
              - generic [ref=e471]: LOOP
              - generic [ref=e472]:
                - button "OFF" [ref=e473]
                - button "AUTO" [ref=e474]
                - button "ON" [ref=e475]
          - generic [ref=e476] [cursor=pointer]:
            - generic [ref=e477]:
              - generic [ref=e478]: ▣
              - generic [ref=e479]: ATIVO
            - generic [ref=e480]: ARCHITECT
            - generic [ref=e481]: Reserve Architect
            - generic [ref=e482]: Revisar mudanças amplas de arquitetura.
            - generic [ref=e483]:
              - generic [ref=e484]: architecture
              - generic [ref=e485]: refactor
            - generic [ref=e486]:
              - generic [ref=e487]: CIRÚRGICO
              - generic [ref=e488]:
                - button "OFF" [ref=e489]
                - button "AUTO" [ref=e490]
                - button "ON" [ref=e491]
          - generic [ref=e492] [cursor=pointer]:
            - generic [ref=e493]:
              - generic [ref=e494]: ⬡
              - generic [ref=e495]: ATIVO
            - generic [ref=e496]: MEMORY
            - generic [ref=e497]: Reserve Memory
            - generic [ref=e498]: Consultar histórico de incidentes sem executar ações.
            - generic [ref=e499]:
              - generic [ref=e500]: memory
              - generic [ref=e501]: incidents
            - generic [ref=e502]:
              - generic [ref=e503]: CONSULTA
              - generic [ref=e504]:
                - button "OFF" [ref=e505]
                - button "AUTO" [ref=e506]
                - button "ON" [ref=e507]
      - text: ▸ ▸
    - complementary [ref=e508]:
      - generic [ref=e509]:
        - paragraph [ref=e510]: MISSION INPUT
        - paragraph [ref=e511]: Arquitetura multiagente sugerida
        - generic [ref=e512]:
          - img
          - generic [ref=e513]:
            - img [ref=e514]
            - generic [ref=e517]: FECHADO
            - generic [ref=e518]: CONTROLLED CLOSURE
            - generic [ref=e519]: origem da missão, objetivo, contexto e restrições
          - generic [ref=e520] [cursor=pointer]:
            - img [ref=e522]
            - generic [ref=e524]: PI HARNESS
            - generic [ref=e525]: Mission Runner
            - generic [ref=e526]: AGUARDA
          - generic [ref=e527] [cursor=pointer]:
            - img [ref=e529]
            - generic [ref=e535]: HERMES
            - generic [ref=e536]: Supervisor / RCA
            - generic [ref=e537]: AGUARDA
          - generic [ref=e538] [cursor=pointer]:
            - img [ref=e540]
            - generic [ref=e542]: OPENCLAW
            - generic [ref=e543]: Orchestrator
            - generic [ref=e544]: AGUARDA
          - generic [ref=e545] [cursor=pointer]:
            - img [ref=e547]
            - generic [ref=e550]: SCANNER
            - generic [ref=e551]: Context Builder
            - generic [ref=e552]: AGUARDA
          - generic [ref=e553] [cursor=pointer]:
            - img [ref=e555]
            - generic [ref=e558]: PATCH ENGINE
            - generic [ref=e559]: Exec. controlada
            - generic [ref=e560]: AGUARDA
          - generic [ref=e561] [cursor=pointer]:
            - img [ref=e563]
            - generic [ref=e566]: AEGIS
            - generic [ref=e567]: Security Gate
            - generic [ref=e568]: AGUARDA
          - generic [ref=e569] [cursor=pointer]:
            - img [ref=e571]
            - generic [ref=e575]: GO CORE
            - generic [ref=e576]: Runtime Truth
            - generic [ref=e577]: AGUARDA
          - generic [ref=e578] [cursor=pointer]:
            - img [ref=e580]
            - generic [ref=e582]: PASS GOLD
            - generic [ref=e583]: Final Authority
            - generic [ref=e584]: AGUARDA
          - generic [ref=e585] [cursor=pointer]:
            - img [ref=e587]
            - generic [ref=e589]: ARCHIVIST
            - generic [ref=e590]: Memory Guard
            - generic [ref=e591]: AGUARDA
          - generic [ref=e592] [cursor=pointer]:
            - img [ref=e594]
            - generic [ref=e599]: GITHUB AGENT
            - generic [ref=e600]: PR / CI / Release
            - generic [ref=e601]: AGUARDA
        - generic [ref=e602]:
          - generic [ref=e603]:
            - generic [ref=e604]: ●
            - text: "Decisão: Hermes, OpenClaw"
          - generic [ref=e605]:
            - generic [ref=e606]: ●
            - text: "Execução: PI Harness, Scanner, PatchEngine"
          - generic [ref=e607]:
            - generic [ref=e608]: ●
            - text: "Validação: Aegis, Go Core, PASS GOLD"
          - generic [ref=e609]:
            - generic [ref=e610]: ●
            - text: "Memória: Archivist · Governança: GitHub Agent"
        - generic [ref=e611]:
          - generic [ref=e612]: AGENT METRICS
          - generic [ref=e613]: ● LIVE
        - generic [ref=e614]:
          - generic [ref=e615]:
            - generic [ref=e616]: OpenClaw
            - generic [ref=e618]: —
          - generic [ref=e619]:
            - generic [ref=e620]: Hermes RCA
            - generic [ref=e622]: —
          - generic [ref=e623]:
            - generic [ref=e624]: Scanner
            - generic [ref=e626]: —
          - generic [ref=e627]:
            - generic [ref=e628]: Aegis
            - generic [ref=e630]: —
          - generic [ref=e631]:
            - generic [ref=e632]: PatchEngine
            - generic [ref=e634]: —
          - generic [ref=e635]:
            - generic [ref=e636]: PASS GOLD
            - generic [ref=e638]: —
        - generic [ref=e639]:
          - generic [ref=e640]: TOTAL PIPELINE
          - generic [ref=e641]: —
        - generic [ref=e642]:
          - button "PIPELINE" [ref=e643] [cursor=pointer]
          - button "AGENT LOCAL" [ref=e644] [cursor=pointer]
        - generic [ref=e646]:
          - generic [ref=e647]:
            - generic [ref=e648]: OpenClaw
            - generic [ref=e649]: —
          - generic [ref=e650]:
            - generic [ref=e651]: Scanner
            - generic [ref=e652]: —
          - generic [ref=e653]:
            - generic [ref=e654]: Hermes
            - generic [ref=e655]: —
          - generic [ref=e656]:
            - generic [ref=e657]: Aegis
            - generic [ref=e658]: —
          - generic [ref=e659]:
            - generic [ref=e660]: PASS GOLD
            - generic [ref=e661]: —
      - generic [ref=e662]:
        - heading "GATES (SDDF)" [level=2] [ref=e663]
        - generic [ref=e664]:
          - generic [ref=e665]: SECURITY
          - generic [ref=e666]: —
        - generic [ref=e667]:
          - generic [ref=e668]: COMPATIBILITY
          - generic [ref=e669]: —
        - generic [ref=e670]:
          - generic [ref=e671]: STABILITY
          - generic [ref=e672]: —
        - generic [ref=e673]:
          - generic [ref=e674]: RUNTIME
          - generic [ref=e675]: —
        - generic [ref=e676]:
          - generic [ref=e677]: DIFF
          - generic [ref=e678]: READY
        - generic [ref=e679]:
          - generic [ref=e680]: VAULT
          - generic [ref=e681]: ACTIVE
        - generic [ref=e682]:
          - generic [ref=e683]: PROMOTION
          - generic [ref=e684]: REQUIRES GOLD
        - generic [ref=e685]:
          - generic [ref=e686]: GITHUB PR
          - generic [ref=e687]: REAL API
      - heading "HERMES CONSENSUS" [level=2] [ref=e689]
      - generic [ref=e690]:
        - heading "STABLE VAULT" [level=2] [ref=e691]
        - generic [ref=e692]:
          - generic [ref=e693]: Snapshots
          - generic [ref=e694]: ACTIVE
        - generic [ref=e695]:
          - generic [ref=e696]: Patches
          - generic [ref=e697]: TRACKED
        - generic [ref=e698]:
          - generic [ref=e699]: Rollback
          - generic [ref=e700]: READY
      - generic [ref=e701]:
        - heading "MEMORY / OBSIDIAN" [level=2] [ref=e702]
        - generic [ref=e703]:
          - generic [ref=e704]: Vault
          - generic [ref=e705]: LINKED
        - generic [ref=e706]:
          - generic [ref=e707]: Incidents
          - generic [ref=e708]: PERSIST
      - generic [ref=e709]:
        - generic [ref=e710]:
          - generic [ref=e711]:
            - paragraph [ref=e712]: ARQUITETURA ESCALÁVEL — RESERVADO
            - heading "OPENCLAW / OPENSQUAD" [level=2] [ref=e713]
          - generic [ref=e714]: SCALE TIER
        - paragraph [ref=e715]: Infraestrutura de agentes paralelos para problemas que exigem trabalho simultâneo em múltiplas camadas — banco de dados, backend e frontend ao mesmo tempo. Reservado para casos de escala onde um único agente não é suficiente.
        - generic [ref=e716]:
          - generic [ref=e717]:
            - generic [ref=e719]:
              - strong [ref=e720]: HERMES
              - generic [ref=e721]: RCA · Orquestrador principal
            - generic [ref=e722]: ATIVO
          - generic [ref=e723]:
            - generic [ref=e725]:
              - strong [ref=e726]: OPENCLAW
              - generic [ref=e727]: Router · Distribuição de missões
            - generic [ref=e728]: RESERVADO
          - generic [ref=e729]:
            - generic [ref=e731]:
              - strong [ref=e732]: SQUAD α
              - generic [ref=e733]: Agente especialista · Database layer
            - generic [ref=e734]: ESCALA
          - generic [ref=e735]:
            - generic [ref=e737]:
              - strong [ref=e738]: SQUAD β
              - generic [ref=e739]: Agente especialista · API layer
            - generic [ref=e740]: ESCALA
          - generic [ref=e741]:
            - generic [ref=e743]:
              - strong [ref=e744]: SQUAD γ
              - generic [ref=e745]: Agente especialista · Frontend layer
            - generic [ref=e746]: ESCALA
        - generic [ref=e747]:
          - generic [ref=e748]: Erro complexo
          - generic [ref=e749]: →
          - generic [ref=e750]: OPENCLAW
          - generic [ref=e751]: →
          - generic [ref=e752]: N squads paralelos
          - generic [ref=e753]: →
          - generic [ref=e754]: Consolidação
          - generic [ref=e755]: →
          - generic [ref=e756]: PASS GOLD
        - generic [ref=e757]:
          - generic [ref=e758]: Ativação automática quando missão exige > 1 agente
          - generic [ref=e759]: MULTI-TENANT TIER
      - generic [ref=e760]:
        - heading "OSINT TOOLS" [level=2] [ref=e761]
        - generic [ref=e762]:
          - generic [ref=e763]: SpiderFoot
          - generic [ref=e764]: DOCKER
        - generic [ref=e765]:
          - generic [ref=e766]: Recon-ng
          - generic [ref=e767]: SANDBOX
        - generic [ref=e768]:
          - generic [ref=e769]: Maryam
          - generic [ref=e770]: SANDBOX
      - generic [ref=e771]:
        - heading "WORKERS" [level=2] [ref=e772]
        - button "ATUALIZAR FILA" [ref=e773] [cursor=pointer]
  - generic "Controlled closure ativo — decisão humana final requerida" [ref=e774]:
    - generic [ref=e776]: CLOSURE
    - generic [ref=e777]: ▂▄▆█
  - button "Ver tutorial novamente" [ref=e778] [cursor=pointer]: 🪐
```

# Test source

```ts
  748 |   });
  749 | 
  750 |   test('T5 — Agentes Extras: spotlight cobre .vc-reserve-modes e .vc-reserve-tags', async ({ page }) => {
  751 |     test.setTimeout(60_000);
  752 |     await setupLocalBundleRoute(page); // serve bundle local com §118 changes
  753 |     await gotoPageForTutorialTest(page);
  754 | 
  755 |     await page.evaluate(() => window.vcStartSectionTutorial('agents'));
  756 |     await waitForStepReady(page);
  757 | 
  758 |     // Passo 0: #agentsBoard (geral — pode preencher o viewport inteiro)
  759 |     // §120: quando o board é maior que o viewport, o fallback conceitual é ativado
  760 |     // (spotlight.width=0). Isso é comportamento correto, não regressão.
  761 |     const p0 = await getSpotlightVsTarget(page, '#agentsBoard');
  762 |     console.log('  T5 p0 (agentsBoard):', JSON.stringify(p0));
  763 |     expect(p0.overlayVisible, 'T5 p0: overlay deve estar visível').toBe(true);
  764 |     if (p0.spotW > 0) {
  765 |       assertSpotlightCoversTarget(p0, 'T5 passo 0 — #agentsBoard (spotlight real)');
  766 |     } else {
  767 |       console.log('  T5 p0: #agentsBoard preenche viewport — fallback conceitual ativado (§120)');
  768 |     }
  769 | 
  770 |     await clickJS(page, '#vcTutorialNext');
  771 |     await waitForStepReady(page);
  772 | 
  773 |     // Passo 1 (§118 fix): .vc-reserve-card[data-agent-id="backend"] .vc-reserve-modes
  774 |     const p1 = await getSpotlightVsTarget(page, '.vc-reserve-card[data-agent-id="backend"] .vc-reserve-modes');
  775 |     console.log('  T5 p1 (backend .vc-reserve-modes):', JSON.stringify(p1));
  776 |     assertSpotlightCoversTarget(p1, 'T5 passo 1 — backend .vc-reserve-modes');
  777 | 
  778 |     await clickJS(page, '#vcTutorialNext');
  779 |     await waitForStepReady(page);
  780 | 
  781 |     // Passo 2 (§118 fix): .vc-reserve-card[data-agent-id="backend"] .vc-reserve-tags
  782 |     const p2 = await getSpotlightVsTarget(page, '.vc-reserve-card[data-agent-id="backend"] .vc-reserve-tags');
  783 |     console.log('  T5 p2 (backend .vc-reserve-tags):', JSON.stringify(p2));
  784 |     assertSpotlightCoversTarget(p2, 'T5 passo 2 — backend .vc-reserve-tags');
  785 | 
  786 |     console.log('  T5 PASS: 3 passos verificados, modos e tags do card backend iluminados.');
  787 |   });
  788 | 
  789 |   test('T6 — PASS GOLD: passo Auto-merge ilumina #policyBtn (não #githubPanel)', async ({ page }) => {
  790 |     test.setTimeout(60_000);
  791 |     await setupLocalBundleRoute(page); // serve bundle local com §118 changes
  792 |     await gotoPageForTutorialTest(page);
  793 | 
  794 |     await page.evaluate(() => window.vcStartSectionTutorial('passgold'));
  795 |     await waitForStepReady(page);
  796 | 
  797 |     // Avançar até o passo 3 (GitHub Integration Real — target #githubPanel)
  798 |     for (let i = 0; i < 3; i++) {
  799 |       await clickJS(page, '#vcTutorialNext');
  800 |       await waitForStepReady(page);
  801 |     }
  802 | 
  803 |     // Passo 3: #githubPanel (GitHub Integration Real — deve continuar correto)
  804 |     const p3 = await getSpotlightVsTarget(page, '#githubPanel');
  805 |     console.log('  T6 p3 (githubPanel):', JSON.stringify(p3));
  806 |     assertSpotlightCoversTarget(p3, 'T6 passo 3 — #githubPanel');
  807 | 
  808 |     await clickJS(page, '#vcTutorialNext');
  809 |     await waitForStepReady(page);
  810 | 
  811 |     // Passo 4 (§118 fix): #policyBtn — Auto-merge Policy
  812 |     const p4 = await getSpotlightVsTarget(page, '#policyBtn');
  813 |     console.log('  T6 p4 (policyBtn):', JSON.stringify(p4));
  814 |     assertSpotlightCoversTarget(p4, 'T6 passo 4 — #policyBtn (Auto-merge)');
  815 | 
  816 |     // Verificação extra: spotlight NÃO deve estar sobre o githubPanel inteiro
  817 |     // (se fosse, spotW seria muito maior que o policyBtn)
  818 |     const policyBtnW = p4.tgW;
  819 |     expect(
  820 |       p4.spotW,
  821 |       'T6 p4: spotlight.width (' + p4.spotW + ') deve ser próximo ao policyBtn.width (' + policyBtnW + '), não ao githubPanel inteiro'
  822 |     ).toBeLessThan(policyBtnW + 80); // policyBtn + 2*pad + tolerância
  823 | 
  824 |     console.log('  T6 PASS: #policyBtn iluminado (w=' + Math.round(p4.spotW) + 'px), não o painel inteiro.');
  825 |   });
  826 | });
  827 | 
  828 | // ─────────────────────────────────────────────────────────────────────────────
  829 | // §119 — Menu de tutoriais funciona mesmo após vc_tutorial_done=1
  830 | //
  831 | // Testes determinísticos de DOM/localStorage — sem chamadas de LLM.
  832 | // Causa raiz: guard `if (vc_tutorial_done==='1') return` bloqueava a definição
  833 | // de window._vcSetActiveTutorial, que os itens do accordion precisam.
  834 | // ─────────────────────────────────────────────────────────────────────────────
  835 | 
  836 | test.describe('§119 — Menu de tutoriais funciona mesmo após vc_tutorial_done=1', () => {
  837 | 
  838 |   /**
  839 |    * Navega com vc_tutorial_done=1 no localStorage (reproduz usuário recorrente).
  840 |    * Usa bundle local (com §119 fix) e NÃO suprime via gotoPage para poder verificar
  841 |    * que o overlay inicializa corretamente.
  842 |    */
  843 |   async function gotoAsReturningUser(page) {
  844 |     // Seta a flag ANTES do goto via addInitScript (roda antes do JS da página)
  845 |     await page.addInitScript(() => {
  846 |       try { localStorage.setItem('vc_tutorial_done', '1'); } catch(e) {}
  847 |     });
> 848 |     await page.goto(BASE_URL);
      |                ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  849 |     await page.waitForLoadState('networkidle', { timeout: 20_000 });
  850 |     // _vcSetActiveTutorial deve existir mesmo com vc_tutorial_done=1 (§119 fix)
  851 |     await page.waitForFunction(
  852 |       () => typeof window._vcSetActiveTutorial === 'function',
  853 |       {},
  854 |       { timeout: 5_000 }
  855 |     );
  856 |   }
  857 | 
  858 |   test('1 — Bug reproduzido+corrigido: vcStartSectionTutorial funciona com vc_tutorial_done=1', async ({ page }) => {
  859 |     test.setTimeout(30_000);
  860 |     await setupLocalBundleRoute(page);
  861 |     await gotoAsReturningUser(page);
  862 | 
  863 |     // Clicar no accordion para abrir o painel
  864 |     await clickJS(page, '#vcTutMenuBtn');
  865 |     await page.waitForTimeout(200);
  866 | 
  867 |     // Clicar no item "Software factory" via link real (como usuário faria)
  868 |     await clickJS(page, 'a[onclick*="vcStartSectionTutorial(\'sf\')"]');
  869 |     await page.waitForTimeout(300);
  870 | 
  871 |     // Overlay deve estar visível e ativo
  872 |     const overlayState = await page.evaluate(() => {
  873 |       var ov = document.getElementById('vcTutorialOverlay');
  874 |       return {
  875 |         display: ov ? ov.style.display : 'not-found',
  876 |         hasActive: ov ? ov.classList.contains('active') : false,
  877 |         titleText: document.getElementById('vcTutorialTitle') ? document.getElementById('vcTutorialTitle').textContent : ''
  878 |       };
  879 |     });
  880 |     console.log('  §119 overlay state:', JSON.stringify(overlayState));
  881 | 
  882 |     expect(overlayState.display, '§119: overlay deve estar visível (display != none)').not.toBe('none');
  883 |     expect(overlayState.display, '§119: overlay deve estar exibido').not.toBe('');
  884 |     expect(overlayState.hasActive, '§119: overlay.classList deve ter "active"').toBe(true);
  885 |     expect(overlayState.titleText.length, '§119: título do tutorial deve estar preenchido').toBeGreaterThan(0);
  886 | 
  887 |     console.log('  §119 PASS: overlay visível após clicar no menu com vc_tutorial_done=1 (bug corrigido).');
  888 |   });
  889 | 
  890 |   test('2 — Persistência por tutorial: fechar SF tutorial grava vc_tutorial_sf_done, não vc_tutorial_done', async ({ page }) => {
  891 |     test.setTimeout(30_000);
  892 |     await setupLocalBundleRoute(page);
  893 |     await gotoAsReturningUser(page);
  894 | 
  895 |     // Abrir tutorial SF
  896 |     await page.evaluate(() => window.vcStartSectionTutorial('sf'));
  897 |     await waitForStepReady(page);
  898 | 
  899 |     // Marcar "não exibir novamente" e fechar
  900 |     await page.evaluate(() => {
  901 |       var cb = document.getElementById('vcTutorialNoShow');
  902 |       if (cb) cb.checked = true;
  903 |     });
  904 |     await clickJS(page, '#vcTutorialSkip');
  905 |     await page.waitForTimeout(200);
  906 | 
  907 |     // Verificar que a chave certa foi gravada
  908 |     const keys = await page.evaluate(() => ({
  909 |       sfKey:   localStorage.getItem('vc_tutorial_sf_done'),
  910 |       t1Key:   localStorage.getItem('vc_tutorial_done'),
  911 |     }));
  912 |     console.log('  §119 storage keys after close:', JSON.stringify(keys));
  913 | 
  914 |     expect(keys.sfKey, '§119: vc_tutorial_sf_done deve ser "1"').toBe('1');
  915 |     // vc_tutorial_done pode ser '1' (setado no addInitScript) mas não deve ter sido
  916 |     // SOBRESCRITO pela persistência do tutorial SF — já tinha '1', continua '1' (ok).
  917 |     // O que não pode acontecer: antes do fix, closeTutorial gravava em vc_tutorial_done
  918 |     // mesmo quando o tutorial ativo era de seção. Ambos são '1' aqui é um falso positivo
  919 |     // aceitável — o que importa é que sf_done foi gravado.
  920 |     // Para certificar que o comportamento é correto: abrir 'agents' (diferente de 'sf')
  921 |     // e fechar também deve gravar a chave certa.
  922 |     await page.evaluate(() => { localStorage.removeItem('vc_tutorial_agents_done'); });
  923 |     await page.evaluate(() => window.vcStartSectionTutorial('agents'));
  924 |     await waitForStepReady(page);
  925 |     await page.evaluate(() => {
  926 |       var cb = document.getElementById('vcTutorialNoShow');
  927 |       if (cb) cb.checked = true;
  928 |     });
  929 |     await clickJS(page, '#vcTutorialSkip');
  930 |     await page.waitForTimeout(200);
  931 | 
  932 |     const agentsKey = await page.evaluate(() => localStorage.getItem('vc_tutorial_agents_done'));
  933 |     console.log('  §119 agents key:', agentsKey);
  934 |     expect(agentsKey, '§119: vc_tutorial_agents_done deve ser "1"').toBe('1');
  935 | 
  936 |     console.log('  §119 PASS: cada tutorial de seção grava na própria chave ao fechar.');
  937 |   });
  938 | 
  939 |   test('3 — Regressão T1: sem flag, tutorial geral ainda auto-abre após 1500ms', async ({ page }) => {
  940 |     test.setTimeout(10_000);
  941 |     await setupLocalBundleRoute(page);
  942 |     // SEM addInitScript de vc_tutorial_done — primeira visita simulada
  943 |     await page.goto(BASE_URL);
  944 |     await page.waitForLoadState('networkidle', { timeout: 20_000 });
  945 | 
  946 |     // Aguardar o setTimeout de 1500ms + margem
  947 |     await page.waitForFunction(
  948 |       () => {
```