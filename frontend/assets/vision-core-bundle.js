/* ================================================================
   VISION CORE V2.9.10 CLEAN FRONT — Reserve Agent Registry
   Static prompt packs. No API calls. No LLM execution.
   For future orchestration reference only.
   ================================================================ */
window.VISION_CORE_RESERVE_AGENTS = Object.freeze([
  {
    id: 'backend',
    name: 'Agente Backend',
    type: 'BACKEND',
    status: 'ATIVO',
    method: 'CONVERSA',
    default_mode: 'AUTO',
    description: 'Express, Node.js, rotas, middlewares e erros de servidor.',
    tags: ['routes', 'api', 'server'],
    prompt_title: 'Agente Backend — Vision Core',
    default_prompt: 'Você é o Agente Backend do Vision Core. Analise rotas, controllers, middlewares, erros HTTP, contratos de API e integração com o servidor. Produza diagnóstico objetivo, arquivos prováveis, riscos e plano de correção sem executar deploy, release, tag ou tocar produção.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'database',
    name: 'Agente Database',
    type: 'DATABASE',
    status: 'ATIVO',
    method: 'CONVERSA',
    default_mode: 'AUTO',
    description: 'SQL, queries, conexões, migrations e modelos de dados.',
    tags: ['sql', 'schema', 'db'],
    prompt_title: 'Agente Database — Vision Core',
    default_prompt: 'Você é o Agente Database do Vision Core. Analise schema, queries, migrations, conexões, modelos de dados, integridade e performance. Produza plano seguro de alteração e validação, sem executar comandos destrutivos e sem tocar produção.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'auth',
    name: 'Agente Auth',
    type: 'AUTH',
    status: 'ATIVO',
    method: 'CONVERSA',
    default_mode: 'AUTO',
    description: 'Autenticação, tokens, sessões, CORS e permissões.',
    tags: ['jwt', 'cors', '401/403'],
    prompt_title: 'Agente Auth — Vision Core',
    default_prompt: 'Você é o Agente Auth do Vision Core. Analise autenticação, tokens, sessões, CORS, permissões, 401/403 e fluxos de autorização. Aponte riscos, arquivos prováveis e testes necessários. Não exponha secrets e não altere produção.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'upload_media',
    name: 'Agente Upload/Media',
    type: 'UPLOAD',
    status: 'ATIVO',
    method: 'CONVERSA',
    default_mode: 'OFF',
    description: 'Multer, arquivos, mimetypes, storage, imagens e vision upload.',
    tags: ['multer', 'req.file', 'media'],
    prompt_title: 'Agente Upload/Media — Vision Core',
    default_prompt: 'Você é o Agente Upload/Media do Vision Core. Analise upload de arquivos, imagens, mimetypes, multer, storage, req.file, limites e vision upload. Sugira correções seguras e validações sem executar operações externas.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'config',
    name: 'Agente Config',
    type: 'CONFIG',
    status: 'ATIVO',
    method: 'CONVERSA',
    default_mode: 'AUTO',
    description: '.env, variáveis, portas, host e configuração de ambiente.',
    tags: ['env', 'port', 'config'],
    prompt_title: 'Agente Config — Vision Core',
    default_prompt: 'Você é o Agente Config do Vision Core. Analise .env, variáveis, portas, host, providers, paths e configuração de ambiente. Identifique inconsistências e proponha ajuste seguro sem revelar secrets.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'network',
    name: 'Agente Network',
    type: 'NETWORK',
    status: 'ATIVO',
    method: 'CONVERSA',
    default_mode: 'AUTO',
    description: 'HTTP, timeouts, DNS, fetch, axios e conexões externas.',
    tags: ['http', 'timeout', 'dns'],
    prompt_title: 'Agente Network — Vision Core',
    default_prompt: 'Você é o Agente Network do Vision Core. Analise HTTP, timeouts, DNS, fetch, axios, CORS, proxy e conexões externas. Diagnostique falhas de comunicação e proponha validações seguras sem executar chamadas externas não autorizadas.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'locator',
    name: 'Reserve Locator',
    type: 'LOCATOR',
    status: 'ATIVO',
    method: 'CIRÚRGICO',
    default_mode: 'AUTO',
    description: 'Localizar arquivo alvo quando o Scanner falhar.',
    tags: ['extra_scan_hints', 'target_recommendations'],
    prompt_title: 'Reserve Locator — Vision Core',
    default_prompt: 'Você é o Reserve Locator do Vision Core. Localize arquivos-alvo quando o Scanner falhar. Use nomes, paths, imports, logs, mensagens de erro e padrões do projeto para sugerir alvos prováveis. Não modifique arquivos.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'security',
    name: 'Reserve Security',
    type: 'SECURITY',
    status: 'ATIVO',
    method: 'CIRÚRGICO',
    default_mode: 'AUTO',
    description: 'Revisar patches de alto risco e autenticação.',
    tags: ['risk_review', 'security_notes'],
    prompt_title: 'Reserve Security — Vision Core',
    default_prompt: 'Você é o Reserve Security do Vision Core. Revise patches de alto risco, autenticação, permissões, secrets, superfície de ataque e regressões de segurança. Bloqueie qualquer ação insegura ou sem evidência suficiente.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'validator',
    name: 'Reserve Validator',
    type: 'VALIDATOR',
    status: 'ATIVO',
    method: 'LOOP',
    default_mode: 'AUTO',
    description: 'Sugerir validações adicionais antes do PASS GOLD.',
    tags: ['validation_suggestions'],
    prompt_title: 'Reserve Validator — Vision Core',
    default_prompt: 'Você é o Reserve Validator do Vision Core. Sugira validações adicionais antes do PASS GOLD. Liste testes, checks, comandos seguros, critérios de aceite e evidências necessárias. Não declare PASS GOLD REAL sem evidência real.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'architect',
    name: 'Reserve Architect',
    type: 'ARCHITECT',
    status: 'ATIVO',
    method: 'CIRÚRGICO',
    default_mode: 'OFF',
    description: 'Revisar mudanças amplas de arquitetura.',
    tags: ['architecture', 'refactor'],
    prompt_title: 'Reserve Architect — Vision Core',
    default_prompt: 'Você é o Reserve Architect do Vision Core. Revise mudanças amplas de arquitetura, acoplamento, modularidade, escalabilidade e dívida técnica. Proponha estrutura incremental sem quebrar compatibilidade.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  },
  {
    id: 'memory',
    name: 'Reserve Memory',
    type: 'MEMORY',
    status: 'ATIVO',
    method: 'CONSULTA',
    default_mode: 'AUTO',
    description: 'Consultar histórico de incidentes sem executar ações.',
    tags: ['memory', 'incidents'],
    prompt_title: 'Reserve Memory — Vision Core',
    default_prompt: 'Você é o Reserve Memory do Vision Core. Consulte histórico, incidentes, decisões anteriores, padrões repetidos e contexto persistente. Produza resumo útil para a missão atual sem executar ações.',
    permissions: ['read_context', 'propose_plan', 'suggest_files', 'produce_prompt', 'produce_validation_plan'],
    prohibitions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure', 'no_unapproved_network', 'no_pass_gold_real_claim']
  }
]);

/* ================================================================
   VISION CORE V2.9.10 — Project Builder Registry
   Local UI state only. No API calls. No LLM execution.
   ================================================================ */
window.VISION_CORE_PROJECT_BUILDER = Object.freeze({
  project_types: Object.freeze([
    { id: 'saas_fullstack',    label: 'SaaS Fullstack',          icon: '⬡',
      agents: { backend:'AUTO', database:'AUTO', auth:'AUTO', config:'AUTO', network:'AUTO', security:'AUTO', validator:'AUTO', architect:'AUTO', upload_media:'OFF', locator:'AUTO', memory:'AUTO' } },
    { id: 'api_backend',       label: 'API Backend',             icon: '⌬',
      agents: { backend:'ON',   database:'AUTO', auth:'AUTO', config:'AUTO', network:'AUTO', security:'AUTO', validator:'AUTO', architect:'OFF', upload_media:'OFF', locator:'AUTO', memory:'AUTO' } },
    { id: 'landing_page',      label: 'Landing Page',            icon: '◻',
      agents: { backend:'OFF',  database:'OFF',  auth:'OFF',  config:'AUTO', network:'AUTO', security:'AUTO', validator:'AUTO', architect:'OFF', upload_media:'AUTO', locator:'AUTO', memory:'AUTO' } },
    { id: 'dashboard_admin',   label: 'Dashboard Admin',         icon: '▥',
      agents: { backend:'AUTO', database:'AUTO', auth:'ON',   config:'AUTO', network:'AUTO', security:'ON',   validator:'AUTO', architect:'AUTO', upload_media:'OFF', locator:'AUTO', memory:'AUTO' } },
    { id: 'game_indie',        label: 'Game / Indie Project',    icon: '◈',
      agents: { backend:'AUTO', database:'OFF',  auth:'OFF',  config:'AUTO', network:'AUTO', security:'AUTO', validator:'AUTO', architect:'AUTO', upload_media:'AUTO', locator:'AUTO', memory:'AUTO' } },
    { id: 'mobile_app',        label: 'Mobile App',              icon: '▣',
      agents: { backend:'AUTO', database:'AUTO', auth:'AUTO', config:'AUTO', network:'ON',   security:'ON',   validator:'AUTO', architect:'AUTO', upload_media:'AUTO', locator:'AUTO', memory:'AUTO' } },
    { id: 'desktop_app',       label: 'Desktop App',             icon: '⊞',
      agents: { backend:'OFF',  database:'AUTO', auth:'OFF',  config:'AUTO', network:'AUTO', security:'AUTO', validator:'AUTO', architect:'AUTO', upload_media:'AUTO', locator:'AUTO', memory:'AUTO' } },
    { id: 'automation_bot',    label: 'Automation / Bot',        icon: '⚙',
      agents: { backend:'AUTO', database:'OFF',  auth:'AUTO', config:'ON',   network:'ON',   security:'ON',   validator:'AUTO', architect:'OFF', upload_media:'OFF', locator:'AUTO', memory:'AUTO' } },
    { id: 'ai_agent_system',   label: 'AI Agent System',         icon: '◎',
      agents: { backend:'AUTO', database:'AUTO', auth:'AUTO', config:'ON',   network:'ON',   security:'ON',   validator:'ON',   architect:'ON',   upload_media:'AUTO', locator:'AUTO', memory:'ON'   } },
    { id: 'ecommerce',         label: 'E-commerce',              icon: '◇',
      agents: { backend:'ON',   database:'ON',   auth:'ON',   config:'ON',   network:'ON',   security:'ON',   validator:'ON',   architect:'AUTO', upload_media:'AUTO', locator:'AUTO', memory:'AUTO' } },
    { id: 'blog_content',      label: 'Blog / Content Platform', icon: '⌁',
      agents: { backend:'AUTO', database:'AUTO', auth:'AUTO', config:'AUTO', network:'AUTO', security:'AUTO', validator:'AUTO', architect:'OFF', upload_media:'ON',   locator:'AUTO', memory:'AUTO' } },
    { id: 'custom',            label: 'Custom',                  icon: '✦',
      agents: null }
  ]),
  project_sizes: Object.freeze([
    { id: 'prototype',         label: 'Prototype',           mode_hint: 'CIRÚRGICO',               validation: 'lighter',   color: 'cyan'   },
    { id: 'mvp',               label: 'MVP',                 mode_hint: 'ASSISTED',                validation: 'standard',  color: 'green'  },
    { id: 'production_ready',  label: 'Production Ready',    mode_hint: 'SOFTWARE FACTORY',        validation: 'required',  color: 'purple' },
    { id: 'enterprise',        label: 'Enterprise',          mode_hint: 'GOVERNED SOFTWARE FACTORY', validation: 'required', color: 'yellow' },
    { id: 'high_risk_refactor',label: 'High Risk Refactor',  mode_hint: 'REVIEW ONLY',             validation: 'required',  color: 'red'    }
  ]),
  stack_options: Object.freeze([
    'HTML/CSS/JS', 'React', 'Vue', 'Node/Express', 'Python/FastAPI',
    'PHP/Laravel', 'Go', 'MySQL', 'PostgreSQL', 'SQLite',
    'Firebase', 'Supabase', 'Docker', 'GitHub Actions'
  ]),
  orchestration_modes: Object.freeze([
    { id: 'manual',           label: 'Manual',                desc: 'Usuário seleciona agentes manualmente.' },
    { id: 'cirurgico',        label: 'Cirúrgico',             desc: 'Apenas agentes reservas selecionados para tarefa específica.' },
    { id: 'auto_assistido',   label: 'Auto Assistido',        desc: 'Vision Core sugere agentes por tipo e stack — usuário aprova.' },
    { id: 'full_sf',          label: 'Full Software Factory', desc: 'Vision Core prepara plano multi-agente completo — sem execução.' },
    { id: 'review_only',      label: 'Review Only',           desc: 'Agentes apenas revisam. Sem patch nem execução.' }
  ]),
  safety_gates: Object.freeze([
    'no_deploy', 'no_release', 'no_tag', 'no_stable_promotion',
    'no_production_touch', 'no_pass_gold_real_claim', 'human_decision_required'
  ]),

  /* ── Template Packs ─────────────────────────────────────────── */
  /* Local blueprint registry. No files created. No API. No exec. */
  template_packs: Object.freeze([
    {
      id: 'tpl_saas_fullstack',
      project_type_id: 'saas_fullstack',
      name: 'SaaS Fullstack Starter',
      summary: 'Aplicação SaaS fullstack com autenticação, dashboard, API, banco de dados, segurança e validação controlada.',
      recommended_stack: ['React', 'Node/Express', 'PostgreSQL', 'Docker', 'GitHub Actions'],
      folder_structure: [
        'frontend/',
        'backend/',
        'backend/routes/',
        'backend/controllers/',
        'backend/middlewares/',
        'backend/models/',
        'backend/services/',
        'database/migrations/',
        'tests/',
        'docs/'
      ],
      initial_files: [
        'frontend/index.html',
        'frontend/assets/app.css',
        'backend/server.js',
        'backend/routes/auth.routes.js',
        'backend/routes/app.routes.js',
        'backend/middlewares/auth.js',
        'backend/middlewares/error-handler.js',
        'database/schema.sql',
        'tests/smoke.test.js',
        'docs/README.md'
      ],
      reserve_agents: ['backend', 'database', 'auth', 'config', 'network', 'security', 'validator', 'architect', 'locator', 'memory'],
      prompt_sequence: [
        '1. Reserve Architect — desenhar módulos e fronteiras.',
        '2. Agente Backend — propor API contract.',
        '3. Agente Database — propor schema inicial.',
        '4. Agente Auth — propor fluxo de autenticação.',
        '5. Reserve Security — revisar riscos.',
        '6. Reserve Validator — definir checklist de validação.',
        '7. Reserve Memory — verificar padrões e decisões anteriores.'
      ],
      validation_checklist: [
        'API contract documentado',
        'schema validado',
        'autenticação sem secrets expostos',
        'rotas protegidas',
        'smoke test local definido',
        'security review pendente antes de produção'
      ],
      risk_warnings: [
        'autenticação e billing exigem revisão humana',
        'schema pode gerar migração destrutiva se mal definido',
        'produção bloqueada até evidência real'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_pass_gold_real_claim'],
      next_safe_action: 'Gerar plano local e revisar API/schema antes de criar qualquer arquivo.'
    },
    {
      id: 'tpl_api_backend',
      project_type_id: 'api_backend',
      name: 'API Backend Starter',
      summary: 'Backend API com rotas, controllers, middlewares, autenticação opcional, configuração e validação local.',
      recommended_stack: ['Node/Express', 'PostgreSQL', 'Docker', 'GitHub Actions'],
      folder_structure: [
        'backend/',
        'backend/routes/',
        'backend/controllers/',
        'backend/middlewares/',
        'backend/services/',
        'backend/models/',
        'tests/',
        'docs/'
      ],
      initial_files: [
        'backend/server.js',
        'backend/routes/index.js',
        'backend/controllers/health.controller.js',
        'backend/middlewares/error-handler.js',
        'backend/config/env.js',
        'tests/api-smoke.test.js',
        'docs/API.md'
      ],
      reserve_agents: ['backend', 'database', 'auth', 'config', 'network', 'security', 'validator', 'locator', 'memory'],
      prompt_sequence: [
        '1. Agente Backend — definir rotas e controllers.',
        '2. Agente Config — revisar env e portas.',
        '3. Agente Database — mapear persistência se necessária.',
        '4. Agente Auth — revisar proteção de rotas se necessário.',
        '5. Reserve Validator — definir testes de API.'
      ],
      validation_checklist: [
        'health route definida',
        'error handler definido',
        'env sem secrets expostos',
        'API smoke test planejado',
        'CORS e auth revisados se aplicável'
      ],
      risk_warnings: [
        'endpoints públicos exigem revisão de segurança',
        'CORS incorreto pode quebrar frontend',
        'secrets não podem ser expostos'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_pass_gold_real_claim'],
      next_safe_action: 'Gerar contrato de API local antes de implementar rotas.'
    },
    {
      id: 'tpl_landing_page',
      project_type_id: 'landing_page',
      name: 'Landing Page Starter',
      summary: 'Landing page estática com hero, seções, CTA, assets e checklist de performance/acessibilidade.',
      recommended_stack: ['HTML/CSS/JS'],
      folder_structure: [
        'frontend/',
        'frontend/assets/',
        'frontend/assets/images/',
        'docs/'
      ],
      initial_files: [
        'frontend/index.html',
        'frontend/assets/style.css',
        'frontend/assets/app.js',
        'docs/content-outline.md'
      ],
      reserve_agents: ['upload_media', 'config', 'network', 'security', 'validator', 'locator', 'memory'],
      prompt_sequence: [
        '1. Reserve Architect — estruturar seções.',
        '2. Agente Upload/Media — revisar imagens e assets.',
        '3. Agente Config — revisar caminhos.',
        '4. Reserve Validator — checklist visual e acessibilidade.'
      ],
      validation_checklist: [
        'hero definido',
        'CTA definido',
        'assets otimizados',
        'responsividade verificada',
        'links e formulários revisados'
      ],
      risk_warnings: [
        'formulários não devem enviar dados sem backend seguro',
        'scripts externos devem ser aprovados',
        'imagens grandes afetam performance'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch'],
      next_safe_action: 'Gerar outline visual e checklist de conteúdo.'
    },
    {
      id: 'tpl_dashboard_admin',
      project_type_id: 'dashboard_admin',
      name: 'Admin Dashboard Starter',
      summary: 'Dashboard administrativo com autenticação, tabelas, métricas, filtros e permissões.',
      recommended_stack: ['React', 'Node/Express', 'PostgreSQL'],
      folder_structure: [
        'frontend/',
        'frontend/components/',
        'frontend/pages/',
        'frontend/assets/',
        'backend/',
        'backend/routes/',
        'backend/controllers/',
        'backend/middlewares/',
        'tests/'
      ],
      initial_files: [
        'frontend/index.html',
        'frontend/assets/dashboard.css',
        'frontend/components/sidebar.js',
        'frontend/components/table.js',
        'backend/routes/admin.routes.js',
        'backend/middlewares/auth.js',
        'tests/dashboard-smoke.test.js'
      ],
      reserve_agents: ['backend', 'database', 'auth', 'config', 'network', 'security', 'validator', 'architect', 'locator', 'memory'],
      prompt_sequence: [
        '1. Reserve Architect — definir módulos de tela.',
        '2. Agente Auth — definir permissões.',
        '3. Agente Backend — definir endpoints admin.',
        '4. Agente Database — definir queries.',
        '5. Reserve Security — revisar acesso.',
        '6. Reserve Validator — validar fluxos críticos.'
      ],
      validation_checklist: [
        'autenticação obrigatória',
        'permissões por rota',
        'tabelas com estados vazios',
        'filtros testados',
        'erros tratados'
      ],
      risk_warnings: [
        'dashboard admin expõe dados sensíveis',
        'permissões precisam ser explícitas',
        'produção bloqueada sem auditoria'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure'],
      next_safe_action: 'Gerar mapa de telas e permissões antes de implementar.'
    },
    {
      id: 'tpl_game_indie',
      project_type_id: 'game_indie',
      name: 'Game / Indie Project Starter',
      summary: 'Projeto indie com loop de jogo, assets, cenas, estado local e validação visual.',
      recommended_stack: ['HTML/CSS/JS'],
      folder_structure: [
        'game/',
        'game/assets/',
        'game/scenes/',
        'game/systems/',
        'game/entities/',
        'docs/'
      ],
      initial_files: [
        'game/index.html',
        'game/assets/style.css',
        'game/main.js',
        'game/scenes/menu.scene.js',
        'game/scenes/game.scene.js',
        'game/systems/input.js',
        'game/systems/audio.js',
        'docs/game-design.md'
      ],
      reserve_agents: ['upload_media', 'config', 'network', 'validator', 'architect', 'locator', 'memory'],
      prompt_sequence: [
        '1. Reserve Architect — definir game loop e cenas.',
        '2. Agente Upload/Media — revisar assets.',
        '3. Agente Config — revisar paths.',
        '4. Reserve Validator — checklist de execução local.',
        '5. Reserve Memory — consultar decisões anteriores.'
      ],
      validation_checklist: [
        'game loop inicial definido',
        'assets organizados',
        'input testado',
        'cena de menu e jogo planejadas',
        'sem dependência externa não aprovada'
      ],
      risk_warnings: [
        'assets grandes podem pesar o build',
        'áudio e imagens precisam fallback',
        'multiplayer exigiria Network/Auth adicionais'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch'],
      next_safe_action: 'Gerar game design local e mapa de cenas.'
    },
    {
      id: 'tpl_mobile_app',
      project_type_id: 'mobile_app',
      name: 'Mobile App Starter',
      summary: 'Aplicativo mobile com telas, autenticação opcional, API, assets e validação de navegação.',
      recommended_stack: ['React', 'Node/Express', 'Firebase'],
      folder_structure: [
        'mobile/',
        'mobile/screens/',
        'mobile/components/',
        'mobile/assets/',
        'backend/',
        'docs/'
      ],
      initial_files: [
        'mobile/App.js',
        'mobile/screens/HomeScreen.js',
        'mobile/screens/LoginScreen.js',
        'mobile/components/Button.js',
        'backend/routes/mobile.routes.js',
        'docs/mobile-flow.md'
      ],
      reserve_agents: ['backend', 'database', 'auth', 'config', 'network', 'security', 'validator', 'architect', 'upload_media', 'locator', 'memory'],
      prompt_sequence: [
        '1. Reserve Architect — mapear telas e navegação.',
        '2. Agente Network — revisar comunicação API.',
        '3. Agente Auth — revisar login se existir.',
        '4. Agente Upload/Media — revisar assets.',
        '5. Reserve Validator — definir smoke flow.'
      ],
      validation_checklist: [
        'navegação definida',
        'estados offline planejados',
        'auth revisada',
        'assets compatíveis',
        'API contract definido'
      ],
      risk_warnings: [
        'mobile exige validação de rede e permissões',
        'auth e storage podem expor dados',
        'builds reais continuam fora de escopo'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch'],
      next_safe_action: 'Gerar mapa de telas e contrato de API local.'
    },
    {
      id: 'tpl_desktop_app',
      project_type_id: 'desktop_app',
      name: 'Desktop App Starter',
      summary: 'Aplicação desktop com interface local, configuração, storage e validação de fluxo offline.',
      recommended_stack: ['HTML/CSS/JS', 'SQLite'],
      folder_structure: [
        'desktop/',
        'desktop/ui/',
        'desktop/assets/',
        'desktop/services/',
        'desktop/storage/',
        'docs/'
      ],
      initial_files: [
        'desktop/index.html',
        'desktop/ui/app.js',
        'desktop/assets/style.css',
        'desktop/services/config.js',
        'desktop/storage/schema.sql',
        'docs/desktop-flow.md'
      ],
      reserve_agents: ['database', 'config', 'network', 'security', 'validator', 'architect', 'upload_media', 'locator', 'memory'],
      prompt_sequence: [
        '1. Reserve Architect — definir camadas desktop.',
        '2. Agente Config — revisar paths e ambiente.',
        '3. Agente Database — revisar storage local.',
        '4. Reserve Security — revisar acesso a arquivos.',
        '5. Reserve Validator — definir validações offline.'
      ],
      validation_checklist: [
        'fluxo offline definido',
        'storage local documentado',
        'paths configuráveis',
        'erros tratados',
        'sem acesso externo não aprovado'
      ],
      risk_warnings: [
        'acesso a filesystem exige revisão',
        'storage local pode guardar dados sensíveis',
        'distribuição/build real fora de escopo'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch'],
      next_safe_action: 'Gerar mapa de telas e storage local.'
    },
    {
      id: 'tpl_automation_bot',
      project_type_id: 'automation_bot',
      name: 'Automation / Bot Starter',
      summary: 'Automação controlada com configuração, rede, limites, logs e checklist de segurança.',
      recommended_stack: ['Node/Express', 'Python/FastAPI', 'GitHub Actions'],
      folder_structure: [
        'automation/',
        'automation/tasks/',
        'automation/config/',
        'automation/logs/',
        'tests/',
        'docs/'
      ],
      initial_files: [
        'automation/main.js',
        'automation/tasks/example-task.js',
        'automation/config/config.example.json',
        'tests/automation-dry-run.test.js',
        'docs/automation-policy.md'
      ],
      reserve_agents: ['backend', 'auth', 'config', 'network', 'security', 'validator', 'locator', 'memory'],
      prompt_sequence: [
        '1. Agente Config — definir config segura.',
        '2. Agente Network — revisar endpoints e timeouts.',
        '3. Reserve Security — bloquear ações perigosas.',
        '4. Reserve Validator — definir dry-run obrigatório.',
        '5. Reserve Memory — consultar incidentes anteriores.'
      ],
      validation_checklist: [
        'dry-run obrigatório',
        'limites definidos',
        'logs sem secrets',
        'rede aprovada',
        'sem ação destrutiva'
      ],
      risk_warnings: [
        'automação pode executar ações perigosas',
        'rede externa requer aprovação',
        'secrets nunca devem aparecer em logs'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_unapproved_network', 'no_secret_exposure'],
      next_safe_action: 'Gerar plano dry-run sem executar tarefas.'
    },
    {
      id: 'tpl_ai_agent_system',
      project_type_id: 'ai_agent_system',
      name: 'AI Agent System Starter',
      summary: 'Sistema multiagente com papéis, prompts, memória, validação, segurança e governança.',
      recommended_stack: ['Node/Express', 'Python/FastAPI', 'PostgreSQL', 'Docker'],
      folder_structure: [
        'agents/',
        'agents/prompts/',
        'agents/memory/',
        'orchestrator/',
        'validators/',
        'docs/'
      ],
      initial_files: [
        'agents/prompts/system.md',
        'agents/prompts/backend-agent.md',
        'agents/prompts/validator-agent.md',
        'orchestrator/index.js',
        'validators/safety-check.js',
        'docs/agent-contract.md'
      ],
      reserve_agents: ['backend', 'database', 'auth', 'config', 'network', 'security', 'validator', 'architect', 'upload_media', 'locator', 'memory'],
      prompt_sequence: [
        '1. Reserve Architect — definir arquitetura multiagente.',
        '2. Reserve Security — definir limites e permissões.',
        '3. Reserve Memory — definir estratégia de contexto.',
        '4. Reserve Validator — definir critérios.',
        '5. Agente Backend — definir orquestrador.',
        '6. Agente Database — definir persistência se necessária.'
      ],
      validation_checklist: [
        'papéis dos agentes definidos',
        'permissões explícitas',
        'proibições explícitas',
        'memória controlada',
        'validação antes de qualquer execução'
      ],
      risk_warnings: [
        'agentes podem alucinar sem contrato claro',
        'execução automática deve permanecer bloqueada',
        'memória pode vazar contexto se mal definida'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_pass_gold_real_claim', 'no_unapproved_network'],
      next_safe_action: 'Gerar contrato de agentes e matriz de permissões.'
    },
    {
      id: 'tpl_ecommerce',
      project_type_id: 'ecommerce',
      name: 'E-commerce Starter',
      summary: 'Loja online com catálogo, carrinho, autenticação, pedidos, banco e validação de segurança.',
      recommended_stack: ['React', 'Node/Express', 'PostgreSQL', 'Docker'],
      folder_structure: [
        'frontend/',
        'frontend/pages/',
        'frontend/components/',
        'backend/',
        'backend/routes/',
        'backend/controllers/',
        'backend/models/',
        'database/migrations/',
        'tests/',
        'docs/'
      ],
      initial_files: [
        'frontend/pages/catalog.html',
        'frontend/pages/cart.html',
        'frontend/components/product-card.js',
        'backend/routes/products.routes.js',
        'backend/routes/orders.routes.js',
        'backend/middlewares/auth.js',
        'database/schema.sql',
        'tests/ecommerce-smoke.test.js',
        'docs/ecommerce-flow.md'
      ],
      reserve_agents: ['backend', 'database', 'auth', 'config', 'network', 'security', 'validator', 'architect', 'upload_media', 'locator', 'memory'],
      prompt_sequence: [
        '1. Reserve Architect — definir fluxo catálogo/carrinho/pedido.',
        '2. Agente Database — definir schema.',
        '3. Agente Auth — revisar conta e sessão.',
        '4. Agente Backend — definir endpoints.',
        '5. Reserve Security — revisar pagamento/dados.',
        '6. Reserve Validator — checklist crítico.'
      ],
      validation_checklist: [
        'catálogo definido',
        'carrinho planejado',
        'pedidos com status',
        'auth revisada',
        'dados sensíveis protegidos',
        'pagamento real fora de escopo'
      ],
      risk_warnings: [
        'pagamento real exige integração segura externa',
        'dados pessoais exigem proteção',
        'produção bloqueada sem auditoria'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_secret_exposure'],
      next_safe_action: 'Gerar fluxo de entidades e endpoints locais.'
    },
    {
      id: 'tpl_blog_content',
      project_type_id: 'blog_content',
      name: 'Blog / Content Platform Starter',
      summary: 'Plataforma de conteúdo com posts, assets, categorias, editor e validação de SEO/acessibilidade.',
      recommended_stack: ['HTML/CSS/JS', 'Node/Express', 'SQLite'],
      folder_structure: [
        'frontend/',
        'frontend/posts/',
        'frontend/assets/',
        'backend/',
        'backend/routes/',
        'content/',
        'docs/'
      ],
      initial_files: [
        'frontend/index.html',
        'frontend/assets/blog.css',
        'content/example-post.md',
        'backend/routes/posts.routes.js',
        'docs/content-model.md'
      ],
      reserve_agents: ['backend', 'database', 'auth', 'config', 'network', 'security', 'validator', 'upload_media', 'locator', 'memory'],
      prompt_sequence: [
        '1. Reserve Architect — definir modelo de conteúdo.',
        '2. Agente Upload/Media — revisar imagens.',
        '3. Agente Database — definir storage se necessário.',
        '4. Agente Backend — definir rotas se dinâmico.',
        '5. Reserve Validator — SEO/acessibilidade/checklist.'
      ],
      validation_checklist: [
        'modelo de post definido',
        'assets organizados',
        'rotas de conteúdo planejadas',
        'SEO básico revisado',
        'acessibilidade revisada'
      ],
      risk_warnings: [
        'upload de mídia exige validação',
        'editor admin exige auth',
        'conteúdo dinâmico exige sanitização'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch'],
      next_safe_action: 'Gerar modelo de conteúdo e mapa de rotas.'
    },
    {
      id: 'tpl_custom',
      project_type_id: 'custom',
      name: 'Custom Project Blueprint',
      summary: 'Blueprint livre para projeto personalizado com seleção manual de stack, agentes e validações.',
      recommended_stack: ['Custom'],
      folder_structure: [
        'project/',
        'project/src/',
        'project/assets/',
        'project/tests/',
        'docs/'
      ],
      initial_files: [
        'docs/project-brief.md',
        'docs/agent-plan.md',
        'docs/validation-checklist.md'
      ],
      reserve_agents: ['locator', 'security', 'validator', 'architect', 'memory'],
      prompt_sequence: [
        '1. Reserve Memory — recuperar contexto.',
        '2. Reserve Architect — propor arquitetura inicial.',
        '3. Reserve Locator — sugerir arquivos ou estrutura.',
        '4. Reserve Security — revisar riscos.',
        '5. Reserve Validator — montar checklist.'
      ],
      validation_checklist: [
        'objetivo definido',
        'stack definida',
        'agentes selecionados',
        'riscos listados',
        'checklist de validação criado'
      ],
      risk_warnings: [
        'projeto custom precisa escopo explícito',
        'agentes automáticos devem ser aprovados manualmente',
        'nenhuma execução real sem decisão humana'
      ],
      forbidden_actions: ['no_deploy', 'no_release', 'no_tag', 'no_stable_promotion', 'no_production_touch', 'no_pass_gold_real_claim'],
      next_safe_action: 'Definir escopo do projeto e gerar plano local.'
    }
  ]),

  /* ── Mission Composer ─────────────────────────────────────────── */
  /* Local-only. No API. No fetch. No execution. No file creation.  */
  mission_composer: Object.freeze({
    composer_version: 'FRONT-PRODUCT-3',

    worker_targets: Object.freeze([
      { id: 'claude_code',      label: 'Claude Code' },
      { id: 'codex',            label: 'Codex' },
      { id: 'manual_operator',  label: 'Manual Operator' },
      { id: 'generic_worker',   label: 'Generic Worker' }
    ]),

    output_modes: Object.freeze([
      { id: 'full_mission',        label: 'Full Mission Prompt' },
      { id: 'agent_prompts_only',  label: 'Agent Prompts Only' },
      { id: 'checklist_only',      label: 'Validation Checklist Only' },
      { id: 'file_blueprint_only', label: 'File Blueprint Only' },
      { id: 'safety_contract_only',label: 'Safety Contract Only' }
    ]),

    prompt_sections: Object.freeze([
      'Mission Header',
      'Project Brief',
      'Template Blueprint',
      'Selected Stack',
      'Reserve Agent Plan',
      'Agent Prompt Sequence',
      'Expected Files and Folders',
      'Validation Checklist',
      'Risk Warnings',
      'Forbidden Actions',
      'Human Approval Boundary',
      'Final Output Format'
    ]),

    composer_options: Object.freeze([
      { id: 'include_project_context',       label: 'Include project context',          default: true },
      { id: 'include_template_blueprint',    label: 'Include template blueprint',       default: true },
      { id: 'include_agent_prompt_sequence', label: 'Include agent prompt sequence',    default: true },
      { id: 'include_validation_checklist',  label: 'Include validation checklist',     default: true },
      { id: 'include_safety_contract',       label: 'Include safety contract',          default: true },
      { id: 'include_expected_final_report', label: 'Include expected final report',    default: true },
      { id: 'include_ps_validation_commands',label: 'Include PowerShell validation commands', default: true }
    ]),

    safety_contract: Object.freeze([
      'no backend call from frontend',
      'no API call from frontend',
      'no file creation from frontend',
      'no command execution from frontend',
      'no deploy',
      'no release',
      'no tag',
      'no stable promotion',
      'no production touch',
      'no PASS GOLD REAL claim',
      'human decision required'
    ])
  }),

  /* ── Worker Handoff ───────────────────────────────────────────── */
  /* Local-only. No API. No fetch. No execution. No file creation.  */
  worker_handoff: Object.freeze({
    handoff_version: 'FRONT-PRODUCT-4',

    package_types: Object.freeze([
      { id: 'full_package',       label: 'Full Worker Package' },
      { id: 'claude_code_pkg',    label: 'Claude Code Package' },
      { id: 'codex_pkg',          label: 'Codex Package' },
      { id: 'manual_checklist',   label: 'Manual Operator Checklist' },
      { id: 'per_agent_pack',     label: 'Per-Agent Prompt Pack' },
      { id: 'safety_review_pack', label: 'Safety Review Pack' },
      { id: 'validation_pack',    label: 'Validation Pack' }
    ]),

    worker_profiles: Object.freeze([
      {
        id: 'claude_code',
        label: 'Claude Code',
        use_case: 'file-aware local coding worker',
        package_style: 'precise implementation prompt with strict scope and validation'
      },
      {
        id: 'codex',
        label: 'Codex',
        use_case: 'code generation and patch reasoning',
        package_style: 'concise task spec with files, constraints and expected result'
      },
      {
        id: 'manual_operator',
        label: 'Manual Operator',
        use_case: 'human executing commands manually',
        package_style: 'checklist with commands and verification steps'
      },
      {
        id: 'generic_worker',
        label: 'Generic Worker',
        use_case: 'any assistant/agent',
        package_style: 'neutral mission brief with safety boundaries'
      },
      {
        id: 'reserve_agents',
        label: 'Reserve Agents',
        use_case: 'selected reserve agent roster',
        package_style: 'per-agent prompt packs with method, responsibility and prohibitions'
      }
    ]),

    handoff_safety_rules: Object.freeze([
      'no automatic execution',
      'no file creation from frontend',
      'no backend call from frontend',
      'no API call from frontend',
      'no deploy',
      'no release',
      'no tag',
      'no stable promotion',
      'no production touch',
      'no PASS GOLD REAL claim',
      'human approval required'
    ]),

    final_report_contract: Object.freeze([
      'files changed',
      'commands run',
      'tests passed',
      'tests failed',
      'forbidden scan result',
      'scope confirmation',
      'backend/go-core/tools/package.json changed yes/no',
      'PASS GOLD REAL claimed yes/no',
      'stable/release/deploy/tag blocked yes/no',
      'production touched yes/no',
      'local-only or real changes'
    ])
  }),

  /* ── Export Preview ─────────────────────────────────────────── */
  /* Local-only. No file creation. No write. No download. No API. */
  export_preview: Object.freeze({
    export_preview_version: 'FRONT-PRODUCT-5',

    preview_modes: Object.freeze([
      { id: 'folder_tree',      label: 'Folder Tree' },
      { id: 'file_list',        label: 'File List' },
      { id: 'content_preview',  label: 'File Content Preview' },
      { id: 'impact_summary',   label: 'Impact Summary' },
      { id: 'approval_contract',label: 'Approval Contract' }
    ]),

    file_creation_lock: Object.freeze({
      file_creation_allowed:    false,
      download_allowed:         false,
      export_allowed:           false,
      backend_write_allowed:    false,
      command_execution_allowed:false,
      human_approval_required:  true,
      next_required_phase:      'FRONT-PRODUCT-6 or explicit external approval'
    }),

    approval_contract: Object.freeze([
      'I understand this frontend only previews file creation.',
      'I understand no files are created by FRONT-PRODUCT-5.',
      'I understand real file creation requires explicit human approval.',
      'I understand backend/API/command execution remains blocked.',
      'I understand deploy/release/tag/stable/production remain blocked.',
      'I understand PASS GOLD REAL is not claimed.'
    ]),

    impact_categories: Object.freeze([
      'folders_to_create',
      'files_to_create',
      'files_to_review',
      'validation_required',
      'risks_before_creation',
      'human_approval_required'
    ]),

    blocked_actions: Object.freeze([
      'no_file_creation',
      'no_file_write',
      'no_download',
      'no_export',
      'no_backend_call',
      'no_api_call',
      'no_command_execution',
      'no_deploy',
      'no_release',
      'no_tag',
      'no_stable_promotion',
      'no_production_touch',
      'no_pass_gold_real_claim'
    ]),

    file_content_templates: Object.freeze({
      'README.md':    '# <Project Name>\n\nGenerated from Vision Core Project Builder preview.\n\nStatus: preview only.\n',
      'package.json': '{\n  "name": "<project-name>",\n  "version": "0.1.0",\n  "private": true,\n  "scripts": {}\n}\n',
      'index.html':   '<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title><Project Name></title>\n</head>\n<body>\n  <div id="app"></div>\n</body>\n</html>\n',
      'server.js':    '// <Project Name> server entry\n// Preview only. No file created by frontend.\n',
      'schema.sql':   '-- <Project Name> database schema\n-- Preview only. Review before creation.\n',
      '_default':     '// Preview placeholder for <file>\n// No file created by FRONT-PRODUCT-5.\n'
    })
  }),

  /* ── Human Approval Gate ────────────────────────────────────── */
  /* Local-only. No file creation. No write. No download. No API. */
  human_approval_gate: Object.freeze({
    approval_gate_version: 'FRONT-PRODUCT-6',

    gate_status: Object.freeze({
      human_approval_gate_ready:    false,
      human_approval_collected:     false,
      file_creation_allowed:        false,
      real_file_creation_enabled:   false,
      backend_write_allowed:        false,
      command_execution_allowed:    false,
      deploy_allowed:               false,
      release_allowed:              false,
      tag_allowed:                  false,
      stable_promotion_allowed:     false,
      production_touched:           false,
      pass_gold_real_claimed:       false
    }),

    required_acknowledgements: Object.freeze([
      { id: 'ack_01', text: 'I reviewed the selected project template.' },
      { id: 'ack_02', text: 'I reviewed the folder tree preview.' },
      { id: 'ack_03', text: 'I reviewed the file list preview.' },
      { id: 'ack_04', text: 'I reviewed the file content placeholders.' },
      { id: 'ack_05', text: 'I reviewed the impact summary.' },
      { id: 'ack_06', text: 'I reviewed the risk warnings.' },
      { id: 'ack_07', text: 'I understand no files are created by this frontend.' },
      { id: 'ack_08', text: 'I understand real file creation requires a separate controlled phase.' },
      { id: 'ack_09', text: 'I understand backend/API/command execution remains blocked.' },
      { id: 'ack_10', text: 'I understand deploy/release/tag/stable/production remain blocked.' },
      { id: 'ack_11', text: 'I understand PASS GOLD REAL is not claimed.' },
      { id: 'ack_12', text: 'I understand this approval receipt is local preview evidence only.' }
    ]),

    approval_receipt_fields: Object.freeze([
      'selected_project_type',
      'selected_template',
      'selected_stack',
      'selected_size_risk',
      'active_agents',
      'folder_count',
      'file_count',
      'validation_count',
      'risk_count',
      'acknowledgements_checked',
      'gate_ready',
      'file_creation_allowed',
      'real_file_creation_enabled',
      'next_required_phase'
    ]),

    locked_capabilities: Object.freeze([
      'file_creation',
      'file_write',
      'backend_write',
      'command_execution',
      'download',
      'export',
      'deploy',
      'release',
      'tag',
      'stable_promotion',
      'production_touch',
      'pass_gold_real_claim'
    ]),

    next_phase_boundary:
      'FRONT-PRODUCT-7 or separate explicit real-file-creation command required.',

    required_final_warning:
      'This local approval gate does not create files and does not grant execution authority.'
  }),

  /* ── Real File Command Package ──────────────────────────────── */
  /* Local-only. No file creation. No write. No download. No API. */
  real_file_command_package: Object.freeze({
    command_package_version: 'FRONT-PRODUCT-7',

    authority_state: Object.freeze({
      external_worker_required:     true,
      human_approval_required:      true,
      command_package_ready:        false,
      file_creation_allowed:        false,
      real_file_creation_enabled:   false,
      frontend_file_write_allowed:  false,
      backend_write_allowed:        false,
      command_execution_allowed:    false,
      download_allowed:             false,
      export_allowed:               false,
      deploy_allowed:               false,
      release_allowed:              false,
      tag_allowed:                  false,
      stable_promotion_allowed:     false,
      production_touched:           false,
      pass_gold_real_claimed:       false
    }),

    package_modes: Object.freeze([
      { id: 'full_real_file_creation_package',        label: 'Full Real File Creation Package' },
      { id: 'claude_code_file_creation_task',         label: 'Claude Code File Creation Task' },
      { id: 'manual_operator_file_creation_checklist',label: 'Manual Operator File Creation Checklist' },
      { id: 'safety_first_dry_run_package',           label: 'Safety-First Dry Run Package' },
      { id: 'validation_only_package',                label: 'Validation-Only Package' }
    ]),

    required_inputs: Object.freeze([
      'selected_project_type',
      'selected_template',
      'selected_stack',
      'export_preview',
      'human_approval_receipt',
      'acknowledgement_status',
      'locked_capabilities',
      'final_safety_boundary'
    ]),

    external_worker_profiles: Object.freeze([
      {
        id:               'claude_code',
        label:            'Claude Code',
        role:             'external local coding worker',
        instruction_style:'precise file creation task with strict scope and validation'
      },
      {
        id:               'manual_operator',
        label:            'Manual Operator',
        role:             'human operator',
        instruction_style:'step-by-step checklist with manual command execution'
      },
      {
        id:               'generic_worker',
        label:            'Generic Worker',
        role:             'external worker',
        instruction_style:'neutral creation brief with strict non-deployment boundary'
      }
    ]),

    command_safety_rules: Object.freeze([
      'frontend does not create files',
      'frontend does not write files',
      'frontend does not execute commands',
      'frontend does not call backend',
      'frontend does not call API',
      'frontend does not download or export files',
      'real file creation requires separate external execution',
      'deploy/release/tag/stable remain blocked',
      'production remains untouched',
      'PASS GOLD REAL is not claimed'
    ]),

    explicit_non_authority_statement:
      'This command package is not execution authority. It is copy-ready planning text only. Real file creation must be performed by a separate explicitly authorized worker or human operator.',

    final_report_contract: Object.freeze([
      'branch used',
      'files created',
      'files modified',
      'files skipped',
      'commands run manually',
      'syntax checks',
      'forbidden scan result',
      'scope confirmation',
      'no backend/go-core/tools/package.json unless explicitly authorized',
      'PASS GOLD REAL claimed yes/no',
      'stable/release/deploy/tag blocked yes/no',
      'production touched yes/no',
      'final human review required yes/no'
    ])
  }),

  /* ── Worker Result Receipt ───────────────────────────────────── */
  /* Local-only. No file read/write. No commands. No API. No exec. */
  worker_result_receipt: Object.freeze({
    receipt_version: 'FRONT-PRODUCT-8',

    authority_state: Object.freeze({
      evidence_review_complete:            false,
      evidence_receipt_ready:              false,
      real_execution_verified_by_frontend: false,
      pass_gold_real_claimed:              false,
      file_creation_allowed:               false,
      real_file_creation_enabled:          false,
      frontend_file_write_allowed:         false,
      backend_write_allowed:               false,
      command_execution_allowed:           false,
      deploy_allowed:                      false,
      release_allowed:                     false,
      tag_allowed:                         false,
      stable_promotion_allowed:            false,
      production_touched:                  false
    }),

    required_evidence_fields: Object.freeze([
      {
        id: 'branch_used',
        label: 'Branch Used',
        markers: ['branch used', 'branch:', 'git branch', 'branch —', 'branch :']
      },
      {
        id: 'files_created',
        label: 'Files Created',
        markers: ['files created', 'created files', 'arquivos criados', 'file created']
      },
      {
        id: 'files_modified',
        label: 'Files Modified',
        markers: ['files modified', 'modified files', 'arquivos modificados', 'file modified']
      },
      {
        id: 'files_skipped',
        label: 'Files Skipped',
        markers: ['files skipped', 'skipped files', 'arquivos ignorados', 'file skipped', 'skipped:']
      },
      {
        id: 'commands_run',
        label: 'Commands Run Manually',
        markers: ['commands run', 'commands run manually', 'comandos executados', 'comandos manuais', 'command run']
      },
      {
        id: 'syntax_checks',
        label: 'Syntax Checks',
        markers: ['syntax check', 'node --check', 'syntax checks', 'verificação de sintaxe']
      },
      {
        id: 'forbidden_scan',
        label: 'Forbidden Scan Result',
        markers: ['forbidden scan', 'scan result', 'forbidden patterns', 'scan de segurança']
      },
      {
        id: 'scope_confirmation',
        label: 'Scope Confirmation',
        markers: ['scope confirmation', 'scope confirmed', 'escopo confirmado', 'scope:']
      },
      {
        id: 'backend_gocore_changed',
        label: 'Backend/go-core/tools/package.json Changed',
        markers: [
          'backend/go-core/tools/package.json',
          'package.json changed',
          'no backend/go-core',
          'backend não modificado',
          'backend unchanged'
        ]
      },
      {
        id: 'pass_gold_claimed',
        label: 'PASS GOLD REAL Claimed',
        markers: ['pass gold real', 'pass_gold_real_claimed', 'pass gold']
      },
      {
        id: 'stable_release_blocked',
        label: 'Stable/Release/Deploy/Tag Blocked',
        markers: [
          'stable/release/deploy/tag',
          'deploy blocked', 'release blocked', 'tag blocked', 'stable blocked',
          'deploy: false', 'release: false', 'tag: false'
        ]
      },
      {
        id: 'production_touched',
        label: 'Production Touched',
        markers: ['production touched', 'production_touched', 'produção', 'production:']
      },
      {
        id: 'final_human_review',
        label: 'Final Human Review Required',
        markers: ['final human review', 'human review required', 'revisão humana', 'human review:']
      }
    ]),

    optional_evidence_fields: Object.freeze([
      { id: 'screenshots',     label: 'Screenshots Reviewed' },
      { id: 'visual',          label: 'Visual Inspection Completed' },
      { id: 'browser',         label: 'Browser Opened' },
      { id: 'limitations',     label: 'Known Limitations' },
      { id: 'next_action',     label: 'Next Recommended Action' }
    ]),

    review_modes: Object.freeze([
      { id: 'evidence_completeness_review', label: 'Evidence Completeness Review' },
      { id: 'safety_flag_review',           label: 'Safety Flag Review' },
      { id: 'scope_review',                 label: 'Scope Review' },
      { id: 'final_receipt_summary',        label: 'Final Receipt Summary' }
    ]),

    evidence_status_labels: Object.freeze({
      present:      'PRESENT',
      missing:      'MISSING',
      needs_review: 'NEEDS REVIEW',
      blocked:      'BLOCKED'
    }),

    non_authority_statement:
      'This local evidence review does not verify the filesystem, does not validate real execution, does not claim PASS GOLD REAL, and does not grant deployment/release/stable authority.',

    final_decision_boundary:
      'Any final PASS GOLD REAL, stable promotion, release, deploy, tag, or production decision remains external and requires explicit human authority.'
  }),

  /* ── Final Product Dashboard ────────────────────────────────── */
  /* Local-only. No exec. No file read/write. No API. No claims.  */
  final_product_dashboard: Object.freeze({
    dashboard_version: 'FRONT-PRODUCT-9',

    chain_sections: Object.freeze([
      { id: 'project_builder',            label: 'Project Builder' },
      { id: 'project_template_packs',     label: 'Project Template Packs' },
      { id: 'mission_plan_composer',      label: 'Mission Plan Composer' },
      { id: 'worker_handoff_packages',    label: 'Worker Handoff Packages' },
      { id: 'project_export_preview',     label: 'Project Export Preview' },
      { id: 'human_approval_gate',        label: 'Advanced Safety Gate' },
      { id: 'real_file_command_package',  label: 'Real File Creation Command Package' },
      { id: 'worker_result_receipt',      label: 'External Worker Result Receipt' }
    ]),

    dashboard_status: Object.freeze({
      product_chain_complete:              true,
      frontend_operator_summary_ready:     false,
      next_action_required:                true,
      real_execution_verified_by_frontend: false,
      pass_gold_real_claimed:              false,
      file_creation_allowed:               false,
      real_file_creation_enabled:          false,
      frontend_file_write_allowed:         false,
      backend_write_allowed:               false,
      command_execution_allowed:           false,
      deploy_allowed:                      false,
      release_allowed:                     false,
      tag_allowed:                         false,
      stable_promotion_allowed:            false,
      production_touched:                  false
    }),

    decision_options: Object.freeze([
      {
        id:    'review_frontend_flow',
        label: 'Review generated frontend flow manually.'
      },
      {
        id:    'continue_external_worker',
        label: 'Continue with external worker execution outside frontend.'
      },
      {
        id:    'request_controlled_creation',
        label: 'Request a separate controlled real file creation phase.'
      },
      {
        id:    'stop_preserve_state',
        label: 'Stop and preserve local-only product state.'
      },
      {
        id:    'prepare_demo',
        label: 'Prepare final product demo without execution authority.'
      }
    ]),

    locked_authority_state: Object.freeze([
      { label: 'Real execution verification by frontend', value: false },
      { label: 'PASS GOLD REAL claim',                   value: false },
      { label: 'File creation authority',                 value: false },
      { label: 'Frontend file write authority',           value: false },
      { label: 'Backend write authority',                 value: false },
      { label: 'Command execution authority',             value: false },
      { label: 'Deploy authority',                        value: false },
      { label: 'Release authority',                       value: false },
      { label: 'Tag authority',                           value: false },
      { label: 'Stable promotion authority',              value: false },
      { label: 'Production touch',                        value: false }
    ]),

    final_report_sections: Object.freeze([
      'Product chain summary',
      'Selected project context',
      'Generated planning artifacts',
      'Evidence review status',
      'Authority lock status',
      'Recommended next action',
      'Non-authority statement',
      'Final operator decision boundary'
    ]),

    non_authority_statement:
      'This frontend dashboard summarizes planning artifacts only. It does not verify real execution, does not create or read files, does not claim PASS GOLD REAL, and does not grant deploy/release/tag/stable authority.',

    next_phase_boundary:
      'Any real file creation, real validation, PASS GOLD REAL claim, deploy, release, tag, stable promotion, or production decision requires a separate explicit human-authorized phase outside this frontend dashboard.'
  }),

  frontend_stabilization: Object.freeze({
    stabilization_version: 'FRONT-PRODUCT-10',
    scope: 'visual QA and final polish only',
    no_new_authority: true,
    no_execution: true,
    no_file_io: true,
    no_backend_api: true
  }),

  saas_api_roadmap: Object.freeze({
    roadmap_version:           'SAAS-API-LOCKED-0',
    saas_signup_visible:       true,
    api_connectors_visible:    true,
    saas_signup_enabled:       false,
    login_enabled:             false,
    oauth_enabled:             false,
    billing_enabled:           false,
    api_connectors_enabled:    false,
    api_key_storage_enabled:   false,
    secrets_access_enabled:    false,
    backend_api_required:      true,
    human_approval_required:   true,
    production_touched:        false,
    non_authority_statement:
      'SaaS/API controls are non-operational. No auth, no OAuth, no billing, no key storage, no backend calls, no API calls. Activation requires a separate explicit human-authorized phase.'
  }),

  software_factory_page: Object.freeze({
    page_version:                  'SOFTWARE-FACTORY-PAGE-0',
    added_as_extra_page:           true,
    replaces_existing_cockpit:     false,
    active_default_module:         'project_builder',
    routing_mode:                  'local_in_memory_view',
    frontend_only:                 true,
    backend_calls_enabled:         false,
    api_calls_enabled:             false,
    file_write_enabled:            false,
    command_execution_enabled:     false,
    pass_gold_real_claimed:        false,
    production_touched:            false
  })
});

window.VISION_CORE_FINAL_STATE = Object.freeze({
  main_commit: 'd8e3967',
  syntax_check: '1164 files OK',
  final_closure_tests: '101 passed',
  rte3_tests: '143 passed',
  project_state: 'REVIEW_READY_CONTROLLED_CLOSURE',
  rte_chain_complete: true,
  rte4_forbidden: true,
  final_closure_1_required: false,
  no_new_gate_chain_required: true,
  pass_gold_real_claimed: false,
  stable_promotion_allowed: false,
  release_allowed: false,
  deploy_allowed: false,
  tag_allowed: false,
  production_touched: false,
  v471_allowed: false,
  rta10_created: false,
  unify1_created: false,
  rc0_created: false,
  final_human_decision_required: true,
});
(function () {
  'use strict';

  var TOAST_MSG = 'Ação bloqueada: controlled closure ativo. Decisão humana final requerida.';

  /* ── Backend connection ─────────────────────────────────────── */
  var BACKEND_URL = 'https://visioncore-api-gateway.weiganlight.workers.dev';
  var _backendConnected = false;
  var _backendVersion = '';

  function _patchBackendStatusDOM(connected, version) {
    var statusEl = document.getElementById('vc-backend-status');
    var modeEl   = document.getElementById('vc-mode-badge');
    if (statusEl) {
      statusEl.textContent = connected ? ('CONECTADO' + (version ? ' — v' + version : '')) : 'NÃO CONECTADO';
      statusEl.className   = 'vc-sf-stat-val ' + (connected ? 'highlight' : 'blocked');
    }
    if (modeEl) {
      modeEl.textContent = connected ? 'WORKER LIVE' : 'LOCAL PREVIEW';
      modeEl.className   = 'vc-sf-stat-val ' + (connected ? 'highlight' : 'ready');
    }
  }

  function checkBackendHealth() {
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 5000) : null;
    fetch(BACKEND_URL + '/api/health', { method: 'GET', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (timer) clearTimeout(timer); return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        _backendConnected = true;
        _backendVersion = (data && data.version) ? String(data.version) : '';
        _patchBackendStatusDOM(true, _backendVersion);
      })
      .catch(function () {
        _backendConnected = false;
        _backendVersion = '';
        _patchBackendStatusDOM(false, '');
      });
  }

  function showToast(msg) {
    var existing = document.getElementById('vc-clean-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'vc-clean-toast';
    toast.textContent = msg;
    toast.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(124,58,237,0.95)',
      'color:#f8f7ff',
      'padding:12px 24px',
      'border-radius:10px',
      'font-size:13px',
      'letter-spacing:0.03em',
      'z-index:9999',
      'border:1px solid rgba(168,85,247,0.5)',
      'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
      'max-width:480px',
      'text-align:center',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 3200);
  }

  function blockBtn(btn) {
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor = 'not-allowed';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      showToast(TOAST_MSG);
    }, true);
  }

  var BLOCKED_IDS = [
    'executeBtn',
    'enqueueBtn',
    'diffBtn',
    'githubStatusBtn',
    'githubPrBtn',
    'policyBtn',
    'v297AddImageBtn',
    'v297AddFileBtn',
    'v297RunSddfBtn',
    'v236FileBtn',
    'v236CopilotBtn',
    'saveAiProviderBtn',
    'testAiProviderBtn',
    'downloadLogsBtn',
    'workerRefreshBtn',
  ];

  function init() {
    var state = window.VISION_CORE_FINAL_STATE || {};

    BLOCKED_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) blockBtn(el);
    });

    document.querySelectorAll('.oauth').forEach(function (btn) { blockBtn(btn); });
    document.querySelectorAll('.provider').forEach(function (btn) { blockBtn(btn); });
    document.querySelectorAll('.plan').forEach(function (btn) { blockBtn(btn); });

    var scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
      scoreBox.innerHTML =
        '<div style="color:#a855f7;font-weight:700;font-size:13px;padding:8px 0;">' +
        'REVIEW_READY_CONTROLLED_CLOSURE</div>' +
        '<div style="color:#a7a1b8;font-size:12px;">PASS GOLD REAL: não reivindicado</div>' +
        '<div style="color:#a7a1b8;font-size:12px;">Decisão humana final requerida</div>';
    }

    var logsBox = document.getElementById('logsBox');
    if (logsBox) {
      logsBox.classList.remove('empty');
      logsBox.innerHTML =
        '<div style="color:#a855f7;">[CLEAN] Controlled closure ativo — commit: ' +
        (state.main_commit || 'd8e3967') + '</div>' +
        '<div style="color:#a7a1b8;">[CLEAN] ' + (state.syntax_check || '1164 files OK') + '</div>' +
        '<div style="color:#22c55e;">[CLEAN] RTE chain complete: ' + state.rte_chain_complete + '</div>' +
        '<div style="color:#22c55e;">[CLEAN] Final closure tests: ' + (state.final_closure_tests || '101 passed') + '</div>' +
        '<div style="color:#ff4d5b;">[CLEAN] Todas as ações de release bloqueadas.</div>';
    }

    var githubStatus = document.getElementById('githubStatus');
    if (githubStatus) {
      githubStatus.textContent = 'GitHub bloqueado — controlled closure ativo.';
      githubStatus.style.color = '#a855f7';
    }

    var mcCoreStatus = document.getElementById('mcCoreStatus');
    if (mcCoreStatus) mcCoreStatus.textContent = 'FECHADO';

    var mcCoreSub = document.getElementById('mcCoreSub');
    if (mcCoreSub) mcCoreSub.textContent = 'CONTROLLED CLOSURE';

    var runtimeText = document.getElementById('runtimeText');
    if (runtimeText) runtimeText.textContent = 'CLOSURE';

    var runtimeMonitor = document.getElementById('runtimeMonitor');
    if (runtimeMonitor) {
      runtimeMonitor.className = 'stable';
      runtimeMonitor.title = 'Controlled closure ativo — decisão humana final requerida';
    }

    var tabs = document.querySelectorAll('.mc-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.mc-tab-pane').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var pane = document.getElementById('mc-tab-' + tab.dataset.tab);
        if (pane) pane.classList.add('active');
      });
    });

    var authBackdrop = document.getElementById('authBackdrop');
    var closeAuthBtn = document.getElementById('closeAuthBtn');
    if (closeAuthBtn && authBackdrop) {
      closeAuthBtn.addEventListener('click', function () {
        authBackdrop.classList.remove('show');
        authBackdrop.setAttribute('aria-hidden', 'true');
      });
      authBackdrop.addEventListener('click', function (e) {
        if (e.target === authBackdrop) {
          authBackdrop.classList.remove('show');
          authBackdrop.setAttribute('aria-hidden', 'true');
        }
      });
    }
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && authBackdrop) {
        authBackdrop.classList.remove('show');
        authBackdrop.setAttribute('aria-hidden', 'true');
      }
    });

    console.info('[VISION CORE CLEAN] State:', state.project_state || 'REVIEW_READY_CONTROLLED_CLOSURE');
    console.info('[VISION CORE CLEAN] Commit:', state.main_commit || 'd8e3967');
    console.info('[VISION CORE CLEAN] pass_gold_real_claimed:', state.pass_gold_real_claimed);
    console.info('[VISION CORE CLEAN] stable_promotion_allowed:', state.stable_promotion_allowed);
  }

  /* ── Reserve Agent mode buttons + prompt preview ─────────────── */
  /* No API calls. No fetch. Local UI state only.                   */

  function getAgentRegistry() {
    return (window.VISION_CORE_RESERVE_AGENTS && Array.isArray(window.VISION_CORE_RESERVE_AGENTS))
      ? window.VISION_CORE_RESERVE_AGENTS
      : [];
  }

  function findAgent(agentId) {
    var registry = getAgentRegistry();
    for (var i = 0; i < registry.length; i++) {
      if (registry[i].id === agentId) { return registry[i]; }
    }
    return null;
  }

  function showPromptPreview(agentId) {
    var agent = findAgent(agentId);
    var panel = document.getElementById('vcPromptPreview');
    if (!panel) { return; }
    if (!agent) { panel.classList.remove('visible'); return; }

    var meta = document.getElementById('vcPromptMeta');
    var body = document.getElementById('vcPromptBody');
    var perms = document.getElementById('vcPromptPerms');
    var prohibs = document.getElementById('vcPromptProhibs');

    if (meta) {
      meta.innerHTML =
        '<span class="vc-prompt-meta-chip">' + agent.name + '</span>' +
        '<span class="vc-prompt-meta-chip">' + agent.method + '</span>' +
        '<span class="vc-prompt-meta-chip">' + agent.type + '</span>';
    }
    if (body) { body.textContent = agent.default_prompt; }
    if (perms) {
      perms.innerHTML = agent.permissions.map(function (p) {
        return '<span class="vc-perm-chip">' + p + '</span>';
      }).join('');
    }
    if (prohibs) {
      prohibs.innerHTML = agent.prohibitions.map(function (p) {
        return '<span class="vc-prohib-chip">' + p + '</span>';
      }).join('');
    }

    panel.classList.add('visible');
  }

  function hidePromptPreview() {
    var panel = document.getElementById('vcPromptPreview');
    if (panel) { panel.classList.remove('visible'); }
  }

  function initReserveAgentControls() {
    /* Mode buttons — local UI state only */
    document.querySelectorAll('.vc-reserve-card').forEach(function (card) {
      var agentId = card.getAttribute('data-agent-id');

      /* Mode buttons */
      card.querySelectorAll('.vc-mode-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var mode = btn.getAttribute('data-mode');
          /* Deactivate all siblings */
          card.querySelectorAll('.vc-mode-btn').forEach(function (b) {
            b.classList.remove('active-off', 'active-auto', 'active-on');
          });
          /* Activate selected */
          if (mode === 'off')  { btn.classList.add('active-off'); }
          if (mode === 'auto') { btn.classList.add('active-auto'); }
          if (mode === 'on')   { btn.classList.add('active-on'); }
        });
      });

      /* Card click — open prompt preview */
      card.addEventListener('click', function () {
        showPromptPreview(agentId);
      });
    });

    /* Close prompt preview */
    var closeBtn = document.getElementById('vcPromptPreviewClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', hidePromptPreview);
    }
    var previewPanel = document.getElementById('vcPromptPreview');
    if (previewPanel) {
      previewPanel.addEventListener('click', function (e) {
        if (e.target === previewPanel) { hidePromptPreview(); }
      });
    }
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hidePromptPreview(); }
    });
  }

  function initReserve() {
    initReserveAgentControls();
  }

  /* ── Project Builder — local UI state only ───────────────────── */
  /* No API. No fetch. No execution. Local state + DOM only.        */

  var pbState = {
    selectedProjectType: null,
    selectedProjectSize: null,
    selectedStacks: [],
    selectedMode: 'auto_assistido',
    agentModes: {}
  };

  function getPBRegistry() {
    return (window.VISION_CORE_PROJECT_BUILDER) ? window.VISION_CORE_PROJECT_BUILDER : null;
  }

  function findProjectType(typeId) {
    var reg = getPBRegistry();
    if (!reg) { return null; }
    var types = reg.project_types;
    for (var i = 0; i < types.length; i++) {
      if (types[i].id === typeId) { return types[i]; }
    }
    return null;
  }

  function findProjectSize(sizeId) {
    var reg = getPBRegistry();
    if (!reg) { return null; }
    var sizes = reg.project_sizes;
    for (var i = 0; i < sizes.length; i++) {
      if (sizes[i].id === sizeId) { return sizes[i]; }
    }
    return null;
  }

  function findOrchMode(modeId) {
    var reg = getPBRegistry();
    if (!reg) { return null; }
    var modes = reg.orchestration_modes;
    for (var i = 0; i < modes.length; i++) {
      if (modes[i].id === modeId) { return modes[i]; }
    }
    return null;
  }

  function setProjectType(typeId) {
    pbState.selectedProjectType = typeId;
    document.querySelectorAll('.vc-project-type-card').forEach(function (card) {
      if (card.getAttribute('data-type-id') === typeId) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
    applyRecommendedAgents(typeId);
    renderOrchestrationPreview();
    syncTemplateWithProjectType(typeId);
  }

  function setProjectSize(sizeId) {
    pbState.selectedProjectSize = sizeId;
    var reg = getPBRegistry();
    document.querySelectorAll('.vc-size-chip').forEach(function (chip) {
      chip.classList.remove('selected-cyan','selected-green','selected-purple','selected-yellow','selected-red');
    });
    if (reg) {
      var sizes = reg.project_sizes;
      for (var i = 0; i < sizes.length; i++) {
        if (sizes[i].id === sizeId) {
          var chip = document.querySelector('.vc-size-chip[data-size-id="' + sizeId + '"]');
          if (chip) { chip.classList.add('selected-' + sizes[i].color); }
          var hint = document.getElementById('vcSizeHint');
          if (hint) { hint.textContent = 'Modo sugerido: ' + sizes[i].mode_hint + ' · Validação: ' + sizes[i].validation; }
          break;
        }
      }
    }
    renderOrchestrationPreview();
  }

  function toggleStack(stackId) {
    var idx = pbState.selectedStacks.indexOf(stackId);
    if (idx === -1) {
      pbState.selectedStacks.push(stackId);
    } else {
      pbState.selectedStacks.splice(idx, 1);
    }
    document.querySelectorAll('.vc-stack-chip').forEach(function (chip) {
      if (chip.getAttribute('data-stack-id') === stackId) {
        if (idx === -1) { chip.classList.add('selected'); } else { chip.classList.remove('selected'); }
      }
    });
    renderOrchestrationPreview();
  }

  function setOrchestrationMode(modeId) {
    pbState.selectedMode = modeId;
    document.querySelectorAll('.vc-mode-chip').forEach(function (chip) {
      chip.classList.remove('selected');
    });
    var active = document.querySelector('.vc-mode-chip[data-orch-mode="' + modeId + '"]');
    if (active) { active.classList.add('selected'); }
    var desc = document.getElementById('vcOrchModeDesc');
    if (desc) {
      var mode = findOrchMode(modeId);
      desc.textContent = mode ? mode.desc : '';
      desc.className = 'vc-mode-desc active';
    }
    renderOrchestrationPreview();
  }

  function applyRecommendedAgents(typeId) {
    var pt = findProjectType(typeId);
    /* Update matrix rows in project builder */
    document.querySelectorAll('.vc-agent-matrix-row').forEach(function (row) {
      var agentId = row.getAttribute('data-agent-id');
      if (!pt || !pt.agents) {
        row.classList.remove('vc-agent-recommended', 'vc-agent-selected');
        var badge = row.querySelector('.vc-agent-matrix-badge');
        if (badge) { badge.textContent = '—'; badge.className = 'vc-agent-matrix-badge norec'; }
        return;
      }
      var recommended = pt.agents[agentId] || 'AUTO';
      pbState.agentModes[agentId] = recommended;
      /* Visual badge */
      var badge = row.querySelector('.vc-agent-matrix-badge');
      if (badge) {
        if (recommended === 'ON') {
          badge.textContent = 'ON'; badge.className = 'vc-agent-matrix-badge rec';
          row.classList.add('vc-agent-recommended', 'vc-agent-selected');
        } else if (recommended === 'AUTO') {
          badge.textContent = 'AUTO'; badge.className = 'vc-agent-matrix-badge rec';
          row.classList.add('vc-agent-recommended');
          row.classList.remove('vc-agent-selected');
        } else {
          badge.textContent = 'OFF'; badge.className = 'vc-agent-matrix-badge norec';
          row.classList.remove('vc-agent-recommended', 'vc-agent-selected');
        }
      }
      /* Sync mode buttons in matrix row */
      row.querySelectorAll('.vc-matrix-mode-btn').forEach(function (btn) {
        btn.classList.remove('active-off','active-auto','active-on');
        var m = btn.getAttribute('data-mode');
        if (m === 'off'  && recommended === 'OFF')  { btn.classList.add('active-off'); }
        if (m === 'auto' && recommended === 'AUTO') { btn.classList.add('active-auto'); }
        if (m === 'on'   && recommended === 'ON')   { btn.classList.add('active-on'); }
      });
    });
  }

  function updateAgentMode(agentId, mode) {
    pbState.agentModes[agentId] = mode;
    var row = document.querySelector('.vc-agent-matrix-row[data-agent-id="' + agentId + '"]');
    if (!row) { return; }
    row.querySelectorAll('.vc-matrix-mode-btn').forEach(function (btn) {
      btn.classList.remove('active-off','active-auto','active-on');
      var m = btn.getAttribute('data-mode');
      if (m === 'off'  && mode === 'OFF')  { btn.classList.add('active-off'); }
      if (m === 'auto' && mode === 'AUTO') { btn.classList.add('active-auto'); }
      if (m === 'on'   && mode === 'ON')   { btn.classList.add('active-on'); }
    });
    var badge = row.querySelector('.vc-agent-matrix-badge');
    if (badge) {
      if (mode === 'ON')   { badge.textContent = 'ON';   badge.className = 'vc-agent-matrix-badge rec'; }
      if (mode === 'AUTO') { badge.textContent = 'AUTO'; badge.className = 'vc-agent-matrix-badge rec'; }
      if (mode === 'OFF')  { badge.textContent = 'OFF';  badge.className = 'vc-agent-matrix-badge norec'; }
    }
    renderOrchestrationPreview();
  }

  function renderOrchestrationPreview() {
    var reg = getPBRegistry();
    var preview = document.getElementById('vcBuilderPreview');
    if (!preview) { return; }

    var pt   = findProjectType(pbState.selectedProjectType);
    var ps   = findProjectSize(pbState.selectedProjectSize);
    var mode = findOrchMode(pbState.selectedMode);

    function set(id, val, cls) {
      var el = document.getElementById(id);
      if (!el) { return; }
      el.textContent = val;
      if (cls) { el.className = 'vc-preview-value ' + cls; }
    }

    set('vcPreviewType',  pt   ? pt.label   : '—');
    set('vcPreviewSize',  ps   ? ps.label   : '—');
    set('vcPreviewMode',  mode ? mode.label : '—', 'highlight');
    set('vcPreviewStack', pbState.selectedStacks.length ? pbState.selectedStacks.join(', ') : '—', 'cyan');

    /* Agent summary */
    var agents = getAgentRegistry();
    var on = [], auto = [], off = [];
    agents.forEach(function (a) {
      var m = pbState.agentModes[a.id] || a.default_mode || 'AUTO';
      if (m === 'ON')   { on.push(a.name); }
      else if (m === 'OFF') { off.push(a.name); }
      else              { auto.push(a.name); }
    });

    set('vcPreviewAgentsOn',   on.length   ? on.join(', ')   : '—', 'green');
    set('vcPreviewAgentsAuto', auto.length ? auto.join(', ') : '—');
    set('vcPreviewAgentsOff',  off.length  ? off.join(', ')  : '—');

    var nextAction = 'Gerar plano de missão local antes de qualquer execução.';
    if (ps && ps.id === 'high_risk_refactor') {
      nextAction = 'Revisão por agentes Security + Architect + Validator obrigatória antes de qualquer ação.';
    } else if (ps && ps.id === 'enterprise') {
      nextAction = 'Aprovação humana + Architecture + Security + Validator requeridos.';
    }
    set('vcPreviewNextAction', nextAction, 'cyan');
  }

  function generateLocalMissionPlan() {
    var output = document.getElementById('vcLocalPlanOutput');
    if (!output) { return; }
    output.classList.add('visible');

    var plan  = document.getElementById('vcBuilderPlan');
    if (!plan) { return; }

    var pt    = findProjectType(pbState.selectedProjectType);
    var ps    = findProjectSize(pbState.selectedProjectSize);
    var mode  = findOrchMode(pbState.selectedMode);
    var agents = getAgentRegistry();
    var reg   = getPBRegistry();

    var lines = [];

    var activeTpl = pbTemplateState.selectedTemplateId
      ? findTemplateById(pbTemplateState.selectedTemplateId)
      : null;

    lines.push('');
    lines.push('PROJETO:    ' + (pt   ? pt.label   : '(não selecionado)'));
    lines.push('TAMANHO:    ' + (ps   ? ps.label + ' — ' + ps.mode_hint : '(não selecionado)'));
    lines.push('MODO:       ' + (mode ? mode.label  : pbState.selectedMode));
    lines.push('STACK:      ' + (pbState.selectedStacks.length ? pbState.selectedStacks.join(', ') : '(nenhuma)'));
    if (activeTpl) {
      lines.push('TEMPLATE:   ' + activeTpl.name);
      lines.push('STACK REC:  ' + activeTpl.recommended_stack.join(', '));
    }
    lines.push('');

    plan.innerHTML = '';

    /* Mission summary */
    appendPlanSection(plan, 'RESUMO DA MISSÃO');
    var summaryDiv = document.createElement('div');
    summaryDiv.className = 'vc-builder-plan';
    summaryDiv.textContent = lines.join('\n');
    plan.appendChild(summaryDiv);

    /* Agent blocks */
    appendPlanSection(plan, 'AGENTES SELECIONADOS');
    agents.forEach(function (a) {
      var m = pbState.agentModes[a.id] || a.default_mode || 'AUTO';
      if (m === 'OFF') { return; }
      var block = document.createElement('div');
      block.className = 'vc-plan-agent-block';
      block.innerHTML =
        '<div class="vc-plan-agent-name">' + a.name + ' <span class="vc-plan-agent-mode">[' + m + ']</span></div>' +
        '<div class="vc-plan-agent-prompt">' + a.prompt_title + '</div>' +
        '<div class="vc-plan-agent-prompt">' + a.description + '</div>';
      plan.appendChild(block);
    });

    /* Template blueprint sections */
    if (activeTpl) {
      appendPlanSection(plan, 'TEMPLATE BLUEPRINT: ' + activeTpl.name.toUpperCase());

      /* Folder structure */
      var tplStructDiv = document.createElement('div');
      tplStructDiv.className = 'vc-builder-plan';
      tplStructDiv.textContent =
        'Estrutura:\n' + activeTpl.folder_structure.join('\n') +
        '\n\nArquivos Iniciais:\n' + activeTpl.initial_files.join('\n');
      plan.appendChild(tplStructDiv);

      appendPlanSection(plan, 'SEQUÊNCIA DE PROMPTS — TEMPLATE');
      var tplPromptDiv = document.createElement('div');
      tplPromptDiv.className = 'vc-builder-plan';
      tplPromptDiv.textContent = activeTpl.prompt_sequence.join('\n');
      plan.appendChild(tplPromptDiv);

      appendPlanSection(plan, 'CHECKLIST TEMPLATE');
      var tplCheckDiv = document.createElement('div');
      tplCheckDiv.className = 'vc-builder-plan';
      tplCheckDiv.textContent = activeTpl.validation_checklist.map(function (c, i) {
        return (i + 1) + '. ' + c;
      }).join('\n');
      plan.appendChild(tplCheckDiv);

      appendPlanSection(plan, 'AVISOS DE RISCO — TEMPLATE');
      var tplRiskDiv = document.createElement('div');
      tplRiskDiv.className = 'vc-builder-plan';
      tplRiskDiv.style.color = '#fca5a5';
      tplRiskDiv.textContent = activeTpl.risk_warnings.map(function (r) {
        return '⚠ ' + r;
      }).join('\n');
      plan.appendChild(tplRiskDiv);

      appendPlanSection(plan, 'PRÓXIMA AÇÃO SEGURA');
      var tplNextDiv = document.createElement('div');
      tplNextDiv.className = 'vc-builder-plan';
      tplNextDiv.style.color = '#22d3ee';
      tplNextDiv.textContent = activeTpl.next_safe_action;
      plan.appendChild(tplNextDiv);
    }

    /* Validation checklist */
    appendPlanSection(plan, 'CHECKLIST DE VALIDAÇÃO');
    var checks = [
      'Revisar arquivos-alvo antes de qualquer modificação.',
      'Executar testes locais (node --check / npm test) após cada patch.',
      'Confirmar que nenhum arquivo de produção foi tocado.',
      'Verificar evidências de cada agente antes de avançar.',
      'Obter aprovação humana antes de qualquer release, tag ou deploy.'
    ];
    if (ps) {
      if (ps.id === 'production_ready' || ps.id === 'enterprise' || ps.id === 'high_risk_refactor') {
        checks.push('Revisão de Security obrigatória.');
        checks.push('Revisão de Architect obrigatória antes de refatoração ampla.');
        checks.push('Validator deve aprovar todos os critérios de aceite.');
      }
    }
    var checkDiv = document.createElement('div');
    checkDiv.className = 'vc-builder-plan';
    checkDiv.textContent = checks.map(function (c, i) { return (i + 1) + '. ' + c; }).join('\n');
    plan.appendChild(checkDiv);

    /* Safety prohibitions */
    appendPlanSection(plan, 'PROIBIÇÕES DE SEGURANÇA');
    if (reg) {
      var prohibList = document.createElement('div');
      prohibList.className = 'vc-plan-prohib-list';
      reg.safety_gates.forEach(function (g) {
        var chip = document.createElement('span');
        chip.className = 'vc-prohib-chip';
        chip.textContent = g;
        prohibList.appendChild(chip);
      });
      plan.appendChild(prohibList);
    }

    /* Human approval */
    appendPlanSection(plan, 'APROVAÇÃO HUMANA');
    var approvalDiv = document.createElement('div');
    approvalDiv.className = 'vc-builder-plan';
    approvalDiv.textContent =
      'Nenhuma execução real, deploy, release, tag, promoção stable ou reivindicação\n' +
      'de PASS GOLD REAL pode ocorrer sem decisão humana explícita.\n' +
      'Este plano é preview local. Ação real requer aprovação humana separada.';
    plan.appendChild(approvalDiv);
  }

  function appendPlanSection(parent, title) {
    var h = document.createElement('div');
    h.className = 'vc-plan-section-title';
    h.textContent = title;
    parent.appendChild(h);
  }

  /* ── Template Packs — local UI only ─────────────────────────── */
  /* No API. No fetch. No file creation. Local state + DOM only.  */

  var pbTemplateState = {
    selectedTemplateId: null
  };

  function getTemplatePacks() {
    var reg = getPBRegistry();
    if (!reg || !reg.template_packs) { return []; }
    return reg.template_packs;
  }

  function findTemplateForProjectType(projectTypeId) {
    var packs = getTemplatePacks();
    for (var i = 0; i < packs.length; i++) {
      if (packs[i].project_type_id === projectTypeId) { return packs[i]; }
    }
    return null;
  }

  function findTemplateById(templateId) {
    var packs = getTemplatePacks();
    for (var i = 0; i < packs.length; i++) {
      if (packs[i].id === templateId) { return packs[i]; }
    }
    return null;
  }

  function renderTemplatePack(templateId) {
    var tpl = findTemplateById(templateId);
    var detail = document.getElementById('vcTemplateDetail');
    if (!detail) { return; }
    if (!tpl) { detail.classList.remove('visible'); return; }

    /* Highlight selected card */
    document.querySelectorAll('.vc-template-card').forEach(function (c) {
      if (c.getAttribute('data-tpl-id') === templateId) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    function setText(id, val) {
      var el = document.getElementById(id);
      if (el) { el.textContent = val; }
    }
    function setHTML(id, html) {
      var el = document.getElementById(id);
      if (el) { el.innerHTML = html; }
    }

    setText('vcTplDetailName', tpl.name);
    setText('vcTplDetailSummary', tpl.summary);

    /* Stack chips */
    setHTML('vcTplDetailStack',
      tpl.recommended_stack.map(function (s) {
        return '<span class="vc-tpl-stack-chip">' + s + '</span>';
      }).join('')
    );

    /* Folder tree */
    setHTML('vcTplDetailTree',
      tpl.folder_structure.map(function (f) {
        return '<div class="vc-tpl-tree-item">' + f + '</div>';
      }).join('')
    );

    /* File list */
    setHTML('vcTplDetailFiles',
      tpl.initial_files.map(function (f) {
        return '<div class="vc-tpl-file-item">' + f + '</div>';
      }).join('')
    );

    /* Agent chips */
    setHTML('vcTplDetailAgents',
      tpl.reserve_agents.map(function (a) {
        return '<span class="vc-tpl-agent-chip">' + a + '</span>';
      }).join('')
    );

    /* Prompt sequence */
    setHTML('vcTplDetailPrompts',
      tpl.prompt_sequence.map(function (p) {
        return '<div class="vc-tpl-prompt-step">' + p + '</div>';
      }).join('')
    );

    /* Validation checklist */
    setHTML('vcTplDetailChecklist',
      tpl.validation_checklist.map(function (c) {
        return '<div class="vc-tpl-check-item">' + c + '</div>';
      }).join('')
    );

    /* Risk warnings */
    setHTML('vcTplDetailRisks',
      tpl.risk_warnings.map(function (r) {
        return '<div class="vc-tpl-risk-item">' + r + '</div>';
      }).join('')
    );

    /* Forbidden chips */
    setHTML('vcTplDetailForbidden',
      tpl.forbidden_actions.map(function (f) {
        return '<span class="vc-tpl-forbidden-chip">' + f + '</span>';
      }).join('')
    );

    /* Next safe action */
    setText('vcTplDetailNextAction', tpl.next_safe_action);

    detail.classList.add('visible');
  }

  function setTemplatePack(templateId) {
    pbTemplateState.selectedTemplateId = templateId;
    renderTemplatePack(templateId);
  }

  function syncTemplateWithProjectType(projectTypeId) {
    var tpl = findTemplateForProjectType(projectTypeId);
    if (tpl) {
      setTemplatePack(tpl.id);
    }
  }

  function buildTemplateGrid() {
    var grid = document.getElementById('vcTemplateGrid');
    if (!grid) { return; }
    var packs = getTemplatePacks();
    if (!packs.length) { return; }

    var typeIcons = {
      saas_fullstack: '⬡',
      api_backend: '⌬',
      landing_page: '◻',
      dashboard_admin: '▥',
      game_indie: '◈',
      mobile_app: '▣',
      desktop_app: '⊞',
      automation_bot: '⚙',
      ai_agent_system: '◎',
      ecommerce: '◇',
      blog_content: '⌁',
      custom: '✦'
    };

    grid.innerHTML = '';
    packs.forEach(function (tpl) {
      var card = document.createElement('div');
      card.className = 'vc-template-card';
      card.setAttribute('data-tpl-id', tpl.id);
      card.setAttribute('data-tpl-type', tpl.project_type_id);
      var icon = typeIcons[tpl.project_type_id] || '◆';
      card.innerHTML =
        '<div class="vc-template-card-icon">' + icon + '</div>' +
        '<div class="vc-template-card-name">' + tpl.name + '</div>' +
        '<div class="vc-template-card-type">' + tpl.project_type_id + '</div>';
      card.addEventListener('click', function () {
        setTemplatePack(tpl.id);
      });
      grid.appendChild(card);
    });
  }

  function initTemplatePacks() {
    buildTemplateGrid();
  }

  function initProjectBuilder() {
    var reg = getPBRegistry();
    if (!reg) { return; }

    /* Project type cards */
    document.querySelectorAll('.vc-project-type-card').forEach(function (card) {
      card.addEventListener('click', function () {
        setProjectType(card.getAttribute('data-type-id'));
      });
    });

    /* Size chips */
    document.querySelectorAll('.vc-size-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        setProjectSize(chip.getAttribute('data-size-id'));
      });
    });

    /* Stack chips */
    document.querySelectorAll('.vc-stack-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        toggleStack(chip.getAttribute('data-stack-id'));
      });
    });

    /* Orchestration mode chips */
    document.querySelectorAll('.vc-mode-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        setOrchestrationMode(chip.getAttribute('data-orch-mode'));
      });
    });

    /* Agent matrix mode buttons */
    document.querySelectorAll('.vc-agent-matrix-row').forEach(function (row) {
      var agentId = row.getAttribute('data-agent-id');
      row.querySelectorAll('.vc-matrix-mode-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var modeRaw = btn.getAttribute('data-mode');
          var modeUpper = modeRaw === 'off' ? 'OFF' : modeRaw === 'auto' ? 'AUTO' : 'ON';
          updateAgentMode(agentId, modeUpper);
        });
      });
    });

    /* Generate plan button */
    var genBtn = document.getElementById('vcGeneratePlanBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        generateLocalMissionPlan();
        genBtn.textContent = '✓ PLANO GERADO — PREVIEW LOCAL';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color = '#22c55e';
      });
    }

    /* Set default mode selection visually */
    setOrchestrationMode('auto_assistido');

    /* Initialize agent matrix modes from registry defaults */
    var agents = getAgentRegistry();
    agents.forEach(function (a) {
      pbState.agentModes[a.id] = a.default_mode || 'AUTO';
    });

    /* Sync matrix button active states from defaults */
    agents.forEach(function (a) {
      var row = document.querySelector('.vc-agent-matrix-row[data-agent-id="' + a.id + '"]');
      if (!row) { return; }
      var def = a.default_mode || 'AUTO';
      row.querySelectorAll('.vc-matrix-mode-btn').forEach(function (btn) {
        btn.classList.remove('active-off','active-auto','active-on');
        var m = btn.getAttribute('data-mode');
        if (m === 'off'  && def === 'OFF')  { btn.classList.add('active-off'); }
        if (m === 'auto' && def === 'AUTO') { btn.classList.add('active-auto'); }
        if (m === 'on'   && def === 'ON')   { btn.classList.add('active-on'); }
      });
    });

    renderOrchestrationPreview();
  }

  /* ── Mission Plan Composer — local UI only ──────────────────── */
  /* No API. No fetch. No file creation. No command execution.     */
  /* No eval. No localStorage. In-memory state only.               */

  var mcState = {
    selectedWorkerTarget: 'claude_code',
    selectedOutputMode:   'full_mission',
    options: {
      include_project_context:        true,
      include_template_blueprint:     true,
      include_agent_prompt_sequence:  true,
      include_validation_checklist:   true,
      include_safety_contract:        true,
      include_expected_final_report:  true,
      include_ps_validation_commands: true
    },
    generatedPrompt: ''
  };

  function getMissionComposerRegistry() {
    var reg = getPBRegistry();
    return (reg && reg.mission_composer) ? reg.mission_composer : null;
  }

  function getSelectedTemplate() {
    return pbTemplateState.selectedTemplateId
      ? findTemplateById(pbTemplateState.selectedTemplateId)
      : null;
  }

  function getSelectedAgentsForMission() {
    var agents = getAgentRegistry();
    var on = [], auto = [];
    agents.forEach(function (a) {
      var m = pbState.agentModes[a.id] || a.default_mode || 'AUTO';
      if (m === 'ON')   { on.push(a); }
      else if (m === 'AUTO') { auto.push(a); }
    });
    return { on: on, auto: auto };
  }

  function getSelectedStackForMission() {
    if (pbState.selectedStacks.length) { return pbState.selectedStacks; }
    var tpl = getSelectedTemplate();
    return tpl ? tpl.recommended_stack : [];
  }

  function getSelectedProjectContext() {
    return {
      projectType: findProjectType(pbState.selectedProjectType),
      projectSize: findProjectSize(pbState.selectedProjectSize),
      orchMode:    findOrchMode(pbState.selectedMode),
      stack:       getSelectedStackForMission()
    };
  }

  function setMissionWorkerTarget(targetId) {
    mcState.selectedWorkerTarget = targetId;
    document.querySelectorAll('.vc-worker-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-worker-id') === targetId);
    });
  }

  function setMissionOutputMode(modeId) {
    mcState.selectedOutputMode = modeId;
    document.querySelectorAll('.vc-output-mode-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-mode-id') === modeId);
    });
  }

  function toggleMissionComposerOption(optionId) {
    mcState.options[optionId] = !mcState.options[optionId];
    var el = document.querySelector('.vc-composer-option[data-option-id="' + optionId + '"]');
    if (el) { el.classList.toggle('active', mcState.options[optionId]); }
  }

  function nl(n) { return new Array((n || 1) + 1).join('\n'); }

  function hr(ch, len) { return new Array((len || 72) + 1).join(ch || '─'); }

  function buildMissionPrompt() {
    var mc   = getMissionComposerRegistry();
    var tpl  = getSelectedTemplate();
    var ctx  = getSelectedProjectContext();
    var agts = getSelectedAgentsForMission();
    var stack = getSelectedStackForMission();
    var reg  = getPBRegistry();

    /* Worker target label */
    var workerLabel = 'Claude Code';
    if (mc) {
      mc.worker_targets.forEach(function (w) {
        if (w.id === mcState.selectedWorkerTarget) { workerLabel = w.label; }
      });
    }

    var mode      = mcState.selectedOutputMode;
    var opts      = mcState.options;
    var lines     = [];
    var sectionCount = 0;

    function section(title) {
      sectionCount++;
      lines.push(hr('═'));
      lines.push('  ' + title);
      lines.push(hr('─'));
    }

    /* ── Full Mission Prompt ── */
    if (mode === 'full_mission') {

      /* Header */
      lines.push(hr('═'));
      lines.push('  MISSION — ' + (tpl ? tpl.name.toUpperCase() : (ctx.projectType ? ctx.projectType.label.toUpperCase() : 'CUSTOM PROJECT')));
      lines.push(hr('─'));
      lines.push('  Target Worker  : ' + workerLabel);
      lines.push('  Mode           : ' + (ctx.orchMode ? ctx.orchMode.label : pbState.selectedMode));
      lines.push('  Project Type   : ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
      lines.push('  Project Size   : ' + (ctx.projectSize ? ctx.projectSize.label + ' — ' + ctx.projectSize.mode_hint : '(not selected)'));
      lines.push('  Selected Stack : ' + (stack.length ? stack.join(', ') : '(none)'));
      lines.push(hr('═'));
      sectionCount++;

      /* Context */
      if (opts.include_project_context) {
        section('CONTEXT');
        lines.push('You are working inside Vision Core Software Factory.');
        lines.push('Use the selected blueprint below.');
        lines.push('Do not execute real deployment, release, tag, stable promotion,');
        lines.push('production access, billing, secrets access, or PASS GOLD REAL claim.');
        lines.push('All actions described here are PLAN-ONLY unless explicitly authorized');
        lines.push('by a human operator outside this frontend.');
        lines.push('');
      }

      /* Template blueprint */
      if (opts.include_template_blueprint && tpl) {
        section('TEMPLATE BLUEPRINT: ' + tpl.name.toUpperCase());
        lines.push('Summary:');
        lines.push('  ' + tpl.summary);
        lines.push('');
        lines.push('Recommended Stack:');
        lines.push('  ' + tpl.recommended_stack.join(', '));
        lines.push('');
        lines.push('Folder Structure:');
        tpl.folder_structure.forEach(function (f) { lines.push('  ' + f); });
        lines.push('');
        lines.push('Initial Files:');
        tpl.initial_files.forEach(function (f) { lines.push('  ' + f); });
        lines.push('');
        lines.push('Next Safe Action:');
        lines.push('  ' + tpl.next_safe_action);
        lines.push('');
      }

      /* Agent plan */
      section('RESERVE AGENT PLAN');
      if (agts.on.length) {
        lines.push('[ ON — Active ]');
        agts.on.forEach(function (a) {
          lines.push('  • ' + a.name + ' [' + a.type + '] — ' + a.method);
          lines.push('    ' + a.description);
        });
        lines.push('');
      }
      if (agts.auto.length) {
        lines.push('[ AUTO — Recommended ]');
        agts.auto.forEach(function (a) {
          lines.push('  • ' + a.name + ' [' + a.type + '] — ' + a.method);
          lines.push('    ' + a.description);
        });
        lines.push('');
      }

      /* Agent prompts */
      if (opts.include_agent_prompt_sequence) {
        section('AGENT PROMPT SEQUENCE');
        if (tpl && tpl.prompt_sequence.length) {
          tpl.prompt_sequence.forEach(function (p) { lines.push('  ' + p); });
        } else {
          var allAgents = agts.on.concat(agts.auto);
          allAgents.forEach(function (a, i) {
            lines.push('  ' + (i + 1) + '. ' + a.prompt_title);
          });
        }
        lines.push('');
        /* Default prompts for ON agents */
        if (agts.on.length) {
          lines.push('[ Agent System Prompts — ON agents ]');
          agts.on.forEach(function (a) {
            lines.push('');
            lines.push('  ── ' + a.name + ' ──');
            lines.push('  ' + a.default_prompt);
          });
          lines.push('');
        }
      }

      /* Validation checklist */
      if (opts.include_validation_checklist) {
        section('VALIDATION CHECKLIST');
        if (tpl) {
          lines.push('Template Checklist:');
          tpl.validation_checklist.forEach(function (c, i) {
            lines.push('  ' + (i + 1) + '. ✓ ' + c);
          });
          lines.push('');
        }
        lines.push('Generic Safety Validation:');
        lines.push('  1. ✓ Revisar arquivos-alvo antes de qualquer modificação.');
        lines.push('  2. ✓ Executar testes locais após cada patch.');
        lines.push('  3. ✓ Confirmar que nenhum arquivo de produção foi tocado.');
        lines.push('  4. ✓ Verificar evidências de cada agente antes de avançar.');
        lines.push('  5. ✓ Obter aprovação humana antes de qualquer release, tag ou deploy.');
        lines.push('');
      }

      /* Risk warnings */
      if (tpl && tpl.risk_warnings.length) {
        section('RISK WARNINGS');
        tpl.risk_warnings.forEach(function (r) { lines.push('  ⚠ ' + r); });
        lines.push('');
      }

      /* Forbidden actions */
      section('FORBIDDEN ACTIONS');
      var forbidden = tpl ? tpl.forbidden_actions.slice() : [];
      if (mc) {
        mc.safety_contract.forEach(function (s) {
          if (forbidden.indexOf(s) === -1) { forbidden.push(s); }
        });
      }
      forbidden.forEach(function (f) { lines.push('  ✗ ' + f); });
      lines.push('');

      /* Human approval boundary */
      section('HUMAN APPROVAL BOUNDARY');
      lines.push('Any real execution, file creation, release, deploy, tag, stable promotion,');
      lines.push('production touch, PASS GOLD REAL claim, secrets access, network action,');
      lines.push('or external side effect REQUIRES EXPLICIT HUMAN APPROVAL outside this frontend.');
      lines.push('');
      lines.push('This prompt is PLAN-ONLY. Execution authority is NEVER granted by this composer.');
      lines.push('');

      /* Expected final report */
      if (opts.include_expected_final_report) {
        section('EXPECTED FINAL REPORT (Worker Must Provide)');
        lines.push('Worker must report:');
        lines.push('  □ files changed');
        lines.push('  □ commands run');
        lines.push('  □ tests passed/failed');
        lines.push('  □ forbidden scan result');
        lines.push('  □ whether any backend/go-core/tools/package.json changed');
        lines.push('  □ whether PASS GOLD REAL was claimed');
        lines.push('  □ whether stable/release/deploy/tag remained blocked');
        lines.push('  □ whether production was touched');
        lines.push('  □ whether output was local-only or real file changes were made');
        lines.push('');
      }

      /* PowerShell validation commands */
      if (opts.include_ps_validation_commands) {
        section('POWERSHELL VALIDATION COMMANDS (display only — do not auto-execute)');
        lines.push('node --check frontend\\assets\\vision-core-clean-state.js');
        lines.push('node --check frontend\\assets\\vision-core-clean-runtime.js');
        lines.push('');
        lines.push('Select-String -Path frontend\\*.html,frontend\\assets\\*.css,frontend\\assets\\*.js `');
        lines.push('  -Pattern "fetch\\(","XMLHttpRequest","child_process","exec\\(","spawn\\(","eval\\(",' );
        lines.push('  "vision-runtime-v297\\.js","vision-v297-interactions\\.js","v23-ui-system\\.js",');
        lines.push('  "v231-backend-agents\\.js","vision-v298-command-chat\\.js",');
        lines.push('  "vision-v298-final-hard-fix2\\.js","vision-v299-fullstack-runtime\\.js",');
        lines.push('  "vision-v2910-clean-runtime\\.js","vision-v32-orbit-runtime\\.js",');
        lines.push('  "vision-v34-enterprise\\.js","vision-v35-telemetry\\.js","vision-v44-runtime-consistency\\.js"');
        lines.push('');
        lines.push('Expected: 0 hits, exit 0 on node --check');
        lines.push('');
      }

    /* ── Agent Prompts Only ── */
    } else if (mode === 'agent_prompts_only') {
      section('AGENT PROMPTS — ' + workerLabel);
      var allActive = agts.on.concat(agts.auto);
      if (!allActive.length) {
        lines.push('(No agents active. Select a project type to activate agents.)');
      } else {
        allActive.forEach(function (a) {
          lines.push('── ' + a.name + ' [' + a.type + '] — ' + a.method + ' ──');
          lines.push(a.default_prompt);
          lines.push('');
        });
      }
      if (tpl && tpl.prompt_sequence.length) {
        section('TEMPLATE PROMPT SEQUENCE');
        tpl.prompt_sequence.forEach(function (p) { lines.push('  ' + p); });
      }

    /* ── Validation Checklist Only ── */
    } else if (mode === 'checklist_only') {
      section('VALIDATION CHECKLIST — ' + (tpl ? tpl.name : 'Project'));
      if (tpl) {
        tpl.validation_checklist.forEach(function (c, i) {
          lines.push('  ' + (i + 1) + '. ✓ ' + c);
        });
        lines.push('');
      }
      lines.push('Generic Safety Gates:');
      if (reg) {
        reg.safety_gates.forEach(function (g) { lines.push('  ✗ ' + g); });
      }
      lines.push('');
      section('VALIDATION COMMANDS');
      lines.push('node --check frontend\\assets\\vision-core-clean-state.js');
      lines.push('node --check frontend\\assets\\vision-core-clean-runtime.js');

    /* ── File Blueprint Only ── */
    } else if (mode === 'file_blueprint_only') {
      section('FILE BLUEPRINT — ' + (tpl ? tpl.name : 'Project'));
      if (tpl) {
        lines.push('Folder Structure:');
        tpl.folder_structure.forEach(function (f) { lines.push('  ' + f); });
        lines.push('');
        lines.push('Initial Files:');
        tpl.initial_files.forEach(function (f) { lines.push('  ' + f); });
        lines.push('');
        lines.push('Stack: ' + tpl.recommended_stack.join(', '));
        lines.push('');
        lines.push('Next Safe Action:');
        lines.push('  ' + tpl.next_safe_action);
      } else {
        lines.push('(No template selected. Select a project type or template to see blueprint.)');
      }

    /* ── Safety Contract Only ── */
    } else if (mode === 'safety_contract_only') {
      section('SAFETY CONTRACT');
      if (mc) {
        mc.safety_contract.forEach(function (s) { lines.push('  ✗ ' + s); });
      }
      lines.push('');
      if (tpl && tpl.forbidden_actions.length) {
        section('TEMPLATE FORBIDDEN ACTIONS');
        tpl.forbidden_actions.forEach(function (f) { lines.push('  ✗ ' + f); });
        lines.push('');
      }
      section('HUMAN APPROVAL BOUNDARY');
      lines.push('Any real execution, file creation, release, deploy, tag, stable promotion,');
      lines.push('production touch, PASS GOLD REAL claim, secrets access, network action,');
      lines.push('or external side effect REQUIRES EXPLICIT HUMAN APPROVAL outside this frontend.');
    }

    mcState.generatedPrompt = lines.join('\n');

    /* Update metrics */
    var lineEl = document.getElementById('vcPromptLineCount');
    var sectEl = document.getElementById('vcPromptSectionCount');
    if (lineEl) { lineEl.textContent = lines.length; }
    if (sectEl) { sectEl.textContent = sectionCount; }

    return mcState.generatedPrompt;
  }

  function renderMissionPrompt() {
    var output = document.getElementById('vcMissionPromptOutput');
    if (!output) { return; }
    var text = buildMissionPrompt();
    output.value = text;
    output.classList.remove('empty');
  }

  function copyMissionPrompt() {
    var statusEl = document.getElementById('vcCopyStatus');
    if (!mcState.generatedPrompt) {
      if (statusEl) {
        statusEl.textContent = 'Gere o prompt primeiro.';
        statusEl.className = 'vc-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-copy-status'; }, 2800);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mcState.generatedPrompt).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className = 'vc-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-copy-status'; }, 2800);
        }
      }, function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className = 'vc-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-copy-status'; }, 3500);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className = 'vc-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-copy-status'; }, 3500);
      }
    }
  }

  function clearMissionPrompt() {
    mcState.generatedPrompt = '';
    var output = document.getElementById('vcMissionPromptOutput');
    if (output) {
      output.value = 'Clique em GERAR PROMPT DE MISSÃO para compor o prompt local.';
      output.classList.add('empty');
    }
    var lineEl = document.getElementById('vcPromptLineCount');
    var sectEl = document.getElementById('vcPromptSectionCount');
    if (lineEl) { lineEl.textContent = '0'; }
    if (sectEl) { sectEl.textContent = '0'; }
    var statusEl = document.getElementById('vcCopyStatus');
    if (statusEl) { statusEl.className = 'vc-copy-status'; }
  }

  function initMissionComposer() {
    var mc = getMissionComposerRegistry();
    if (!mc) { return; }

    /* Build worker target chips */
    var workerRow = document.getElementById('vcWorkerTargetRow');
    if (workerRow) {
      mc.worker_targets.forEach(function (w) {
        var chip = document.createElement('button');
        chip.className = 'vc-worker-chip' + (w.id === mcState.selectedWorkerTarget ? ' selected' : '');
        chip.setAttribute('data-worker-id', w.id);
        chip.type = 'button';
        chip.textContent = w.label;
        chip.addEventListener('click', function () { setMissionWorkerTarget(w.id); });
        workerRow.appendChild(chip);
      });
    }

    /* Build output mode chips */
    var modeRow = document.getElementById('vcOutputModeRow');
    if (modeRow) {
      mc.output_modes.forEach(function (m) {
        var chip = document.createElement('button');
        chip.className = 'vc-output-mode-chip' + (m.id === mcState.selectedOutputMode ? ' selected' : '');
        chip.setAttribute('data-mode-id', m.id);
        chip.type = 'button';
        chip.textContent = m.label;
        chip.addEventListener('click', function () { setMissionOutputMode(m.id); });
        modeRow.appendChild(chip);
      });
    }

    /* Build composer option toggles */
    var optsContainer = document.getElementById('vcComposerOptions');
    if (optsContainer) {
      mc.composer_options.forEach(function (opt) {
        var el = document.createElement('div');
        el.className = 'vc-composer-option' + (mcState.options[opt.id] ? ' active' : '');
        el.setAttribute('data-option-id', opt.id);
        el.innerHTML =
          '<div class="vc-composer-option-dot"></div>' +
          '<span class="vc-composer-option-label">' + opt.label + '</span>';
        el.addEventListener('click', function () { toggleMissionComposerOption(opt.id); });
        optsContainer.appendChild(el);
      });
    }

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateMissionBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderMissionPrompt();
        genBtn.textContent = '✓ PROMPT GERADO — LOCAL ONLY';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color = '#22c55e';
      });
    }

    var copyBtn = document.getElementById('vcCopyMissionBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyMissionPrompt); }

    var clearBtn = document.getElementById('vcClearMissionBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearMissionPrompt();
        if (genBtn) {
          genBtn.textContent = '⬡ GERAR PROMPT DE MISSÃO';
          genBtn.style.borderColor = '';
          genBtn.style.color = '';
        }
      });
    }
  }

  /* ── Worker Handoff Packages — local UI only ────────────────── */
  /* No API. No fetch. No file creation. No download. No export.  */
  /* No localStorage. No sessionStorage. In-memory state only.    */

  var handoffState = {
    selectedType:     'full_package',
    selectedTarget:   'claude_code',
    generatedPackage: ''
  };

  function getWorkerHandoffRegistry() {
    var reg = getPBRegistry();
    return (reg && reg.worker_handoff) ? reg.worker_handoff : null;
  }

  function setHandoffType(typeId) {
    handoffState.selectedType = typeId;
    document.querySelectorAll('.vc-handoff-type-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-handoff-type') === typeId);
    });
  }

  function setHandoffTarget(targetId) {
    handoffState.selectedTarget = targetId;
    document.querySelectorAll('.vc-handoff-target-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-handoff-target') === targetId);
    });
  }

  function getCurrentMissionPromptForHandoff() {
    /* Reuse in-memory generated prompt if available, otherwise build fresh */
    if (mcState && mcState.generatedPrompt) { return mcState.generatedPrompt; }
    return buildMissionPrompt();
  }

  /* ─── Package builders ─────────────────────────────────────── */

  function hr4(ch, len) { return new Array((len || 72) + 1).join(ch || '─'); }

  function buildFullPackage(ctx, tpl, agts, stack, wh) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  FULL WORKER PACKAGE — ' + (tpl ? tpl.name.toUpperCase() : 'CUSTOM PROJECT'));
    lines.push(hr4('─'));
    lines.push('  Target Worker   : ' + handoffState.selectedTarget.replace(/_/g, ' ').toUpperCase());
    lines.push('  Project Type    : ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push('  Template        : ' + (tpl ? tpl.name : '(none)'));
    lines.push('  Stack           : ' + (stack.length ? stack.join(', ') : '(none)'));
    lines.push('  Risk/Size       : ' + (ctx.projectSize ? ctx.projectSize.label + ' — ' + ctx.projectSize.mode_hint : '(not selected)'));
    lines.push(hr4('═'));
    lines.push('');

    lines.push(hr4('─'));
    lines.push('  ACTIVE AGENTS');
    lines.push(hr4('─'));
    var allActive = agts.on.concat(agts.auto);
    if (allActive.length) {
      allActive.forEach(function (a) {
        lines.push('  • ' + a.name + ' [' + a.type + '] — ' + a.method + ' — ' + a.description);
      });
    } else {
      lines.push('  (none — select a project type to activate agents)');
    }
    lines.push('');

    lines.push(hr4('─'));
    lines.push('  MISSION PROMPT');
    lines.push(hr4('─'));
    lines.push(getCurrentMissionPromptForHandoff());
    lines.push('');

    lines.push(hr4('─'));
    lines.push('  SAFETY RULES');
    lines.push(hr4('─'));
    if (wh) { wh.handoff_safety_rules.forEach(function (r) { lines.push('  ✗ ' + r); }); }
    lines.push('');

    lines.push(hr4('─'));
    lines.push('  FINAL REPORT CONTRACT (Worker Must Provide)');
    lines.push(hr4('─'));
    if (wh) { wh.final_report_contract.forEach(function (r) { lines.push('  □ ' + r); }); }
    return lines;
  }

  function buildClaudeCodePackage(ctx, tpl, agts, stack, wh) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  CLAUDE CODE PACKAGE');
    lines.push(hr4('─'));
    lines.push('  Repo     : C:\\Users\\imadechumbo\\Desktop\\vision-core');
    lines.push('  Branch   : [create branch: feat/<your-feature-name>]');
    lines.push('  Type     : ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push('  Template : ' + (tpl ? tpl.name : '(none)'));
    lines.push('  Stack    : ' + (stack.length ? stack.join(', ') : '(none)'));
    lines.push(hr4('═'));
    lines.push('');

    lines.push('SCOPE RULES');
    lines.push(hr4('─'));
    lines.push('Allowed paths (from template):');
    if (tpl) {
      tpl.folder_structure.forEach(function (f) { lines.push('  + ' + f); });
    } else {
      lines.push('  (no template selected — define scope manually)');
    }
    lines.push('');
    lines.push('Forbidden paths (unless explicitly authorized):');
    lines.push('  ✗ backend/*');
    lines.push('  ✗ go-core/*');
    lines.push('  ✗ tools/*');
    lines.push('  ✗ package.json');
    lines.push('');

    if (tpl) {
      lines.push('INITIAL FILES TO CREATE/EDIT:');
      lines.push(hr4('─'));
      tpl.initial_files.forEach(function (f) { lines.push('  ' + f); });
      lines.push('');
    }

    lines.push('ACTIVE AGENTS:');
    lines.push(hr4('─'));
    var allActive = agts.on.concat(agts.auto);
    allActive.forEach(function (a) {
      lines.push('  • ' + a.name + ' — ' + a.prompt_title);
    });
    lines.push('');

    if (tpl) {
      lines.push('PROMPT SEQUENCE:');
      lines.push(hr4('─'));
      tpl.prompt_sequence.forEach(function (p) { lines.push('  ' + p); });
      lines.push('');
      lines.push('VALIDATION CHECKLIST:');
      lines.push(hr4('─'));
      tpl.validation_checklist.forEach(function (c, i) { lines.push('  ' + (i + 1) + '. ' + c); });
      lines.push('');
    }

    lines.push('VALIDATION COMMANDS (display only — do not auto-execute):');
    lines.push(hr4('─'));
    lines.push('node --check frontend\\assets\\vision-core-clean-state.js');
    lines.push('node --check frontend\\assets\\vision-core-clean-runtime.js');
    lines.push('');

    lines.push('FINAL RULES:');
    lines.push(hr4('─'));
    lines.push('  ✗ Do not push unless explicitly requested.');
    lines.push('  ✗ Do not open PR unless explicitly requested.');
    lines.push('  ✗ Do not deploy, release, tag, stable promote, or touch production.');
    lines.push('  ✗ Do not claim PASS GOLD REAL.');
    lines.push('');

    lines.push('FINAL REPORT CONTRACT:');
    lines.push(hr4('─'));
    if (wh) { wh.final_report_contract.forEach(function (r) { lines.push('  □ ' + r); }); }
    return lines;
  }

  function buildCodexPackage(ctx, tpl, agts, stack) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  CODEX PACKAGE');
    lines.push(hr4('─'));
    lines.push('  Task     : ' + (tpl ? tpl.summary : 'Custom project — define task below.'));
    lines.push('  Template : ' + (tpl ? tpl.name : '(none)'));
    lines.push('  Stack    : ' + (stack.length ? stack.join(', ') : '(none)'));
    lines.push(hr4('═'));
    lines.push('');

    if (tpl) {
      lines.push('FILES AND FOLDERS:');
      lines.push(hr4('─'));
      lines.push('Folder structure:');
      tpl.folder_structure.forEach(function (f) { lines.push('  ' + f); });
      lines.push('');
      lines.push('Initial files:');
      tpl.initial_files.forEach(function (f) { lines.push('  ' + f); });
      lines.push('');
    }

    lines.push('CONSTRAINTS:');
    lines.push(hr4('─'));
    lines.push('  • No execution beyond requested code reasoning.');
    lines.push('  • No network calls.');
    lines.push('  • No file writes unless explicitly requested.');
    lines.push('  • No deployment, release, or production access.');
    lines.push('  • No PASS GOLD REAL claim.');
    lines.push('');

    if (tpl) {
      lines.push('VALIDATION CHECKLIST:');
      lines.push(hr4('─'));
      tpl.validation_checklist.forEach(function (c, i) { lines.push('  ' + (i + 1) + '. ' + c); });
      lines.push('');

      lines.push('EXPECTED OUTPUT:');
      lines.push(hr4('─'));
      lines.push('  • Next safe action: ' + tpl.next_safe_action);
      lines.push('  • Code/plan for: ' + tpl.folder_structure.slice(0, 3).join(', '));
    }
    return lines;
  }

  function buildManualOperatorChecklist(ctx, tpl, agts, stack, wh) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  MANUAL OPERATOR CHECKLIST');
    lines.push(hr4('─'));
    lines.push('  Project  : ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push('  Template : ' + (tpl ? tpl.name : '(none)'));
    lines.push(hr4('═'));
    lines.push('');

    lines.push('PRE-FLIGHT STEPS:');
    lines.push(hr4('─'));
    lines.push('  [ ] git checkout main');
    lines.push('  [ ] git pull origin main');
    lines.push('  [ ] git status (confirm clean)');
    lines.push('  [ ] git checkout -b feat/<your-branch-name>');
    lines.push('');

    if (tpl) {
      lines.push('TEMPLATE CHECKLIST:');
      lines.push(hr4('─'));
      tpl.validation_checklist.forEach(function (c, i) {
        lines.push('  [ ] ' + (i + 1) + '. ' + c);
      });
      lines.push('');

      lines.push('RISK WARNINGS:');
      lines.push(hr4('─'));
      tpl.risk_warnings.forEach(function (r) { lines.push('  ⚠ ' + r); });
      lines.push('');
    }

    lines.push('VALIDATION COMMANDS (run manually):');
    lines.push(hr4('─'));
    lines.push('  node --check frontend\\assets\\vision-core-clean-state.js');
    lines.push('  node --check frontend\\assets\\vision-core-clean-runtime.js');
    lines.push('  git diff --name-only');
    lines.push('  git log -5 --oneline');
    lines.push('');

    lines.push('DECISION BOUNDARY:');
    lines.push(hr4('─'));
    lines.push('  Do NOT deploy, release, tag, or promote stable without explicit human GO.');
    lines.push('  Do NOT claim PASS GOLD REAL.');
    lines.push('  Do NOT touch production.');
    lines.push('');

    lines.push('FINAL REPORT CONTRACT:');
    lines.push(hr4('─'));
    if (wh) { wh.final_report_contract.forEach(function (r) { lines.push('  [ ] ' + r); }); }
    return lines;
  }

  function buildPerAgentPromptPack(ctx, tpl, agts) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  PER-AGENT PROMPT PACK');
    lines.push('  Project: ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push(hr4('═'));
    lines.push('');

    var allActive = agts.on.concat(agts.auto);
    if (!allActive.length) {
      lines.push('(No agents active. Select a project type to activate agents.)');
      return lines;
    }

    allActive.forEach(function (a) {
      lines.push(hr4('─'));
      lines.push('  AGENT: ' + a.name.toUpperCase() + ' [' + a.type + ']');
      lines.push(hr4('─'));
      lines.push('  Method         : ' + a.method);
      lines.push('  Prompt Title   : ' + a.prompt_title);
      lines.push('  Responsibility : ' + a.description);
      if (tpl) {
        lines.push('  Project Relevance:');
        var seq = tpl.prompt_sequence.filter(function (s) {
          return s.toLowerCase().indexOf(a.name.split(' ').pop().toLowerCase()) !== -1 ||
                 s.toLowerCase().indexOf(a.type.toLowerCase()) !== -1;
        });
        if (seq.length) {
          seq.forEach(function (s) { lines.push('    ' + s); });
        } else {
          lines.push('    Support role for this template.');
        }
      }
      lines.push('');
      lines.push('  SYSTEM PROMPT:');
      lines.push('  ' + a.default_prompt);
      lines.push('');
      lines.push('  Expected Output:');
      lines.push('    Diagnostic, proposed plan, files to check, validation steps.');
      lines.push('    No deploy, no release, no production touch.');
      lines.push('');
      lines.push('  Prohibitions:');
      a.prohibitions.forEach(function (p) { lines.push('    ✗ ' + p); });
      lines.push('');
    });

    return lines;
  }

  function buildSafetyReviewPack(ctx, tpl, wh) {
    var reg = getPBRegistry();
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  SAFETY REVIEW PACK');
    lines.push('  Project: ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push(hr4('═'));
    lines.push('');

    if (tpl && tpl.risk_warnings.length) {
      lines.push('TEMPLATE RISK WARNINGS:');
      lines.push(hr4('─'));
      tpl.risk_warnings.forEach(function (r) { lines.push('  ⚠ ' + r); });
      lines.push('');
    }

    lines.push('GLOBAL SAFETY GATES:');
    lines.push(hr4('─'));
    if (reg) { reg.safety_gates.forEach(function (g) { lines.push('  ✗ ' + g); }); }
    lines.push('');

    if (tpl && tpl.forbidden_actions.length) {
      lines.push('TEMPLATE FORBIDDEN ACTIONS:');
      lines.push(hr4('─'));
      tpl.forbidden_actions.forEach(function (f) { lines.push('  ✗ ' + f); });
      lines.push('');
    }

    lines.push('HANDOFF SAFETY RULES:');
    lines.push(hr4('─'));
    if (wh) { wh.handoff_safety_rules.forEach(function (r) { lines.push('  ✗ ' + r); }); }
    lines.push('');

    lines.push('HUMAN APPROVAL BOUNDARY:');
    lines.push(hr4('─'));
    lines.push('  Any real execution, file creation, release, deploy, tag, stable promotion,');
    lines.push('  production touch, PASS GOLD REAL claim, secrets access, network action,');
    lines.push('  or external side effect REQUIRES EXPLICIT HUMAN APPROVAL.');
    lines.push('');
    lines.push('  ✗ No PASS GOLD REAL claim.');
    lines.push('  ✗ No production touch.');
    lines.push('  ✗ No automatic execution from this frontend.');
    return lines;
  }

  function buildValidationPack(ctx, tpl, wh) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  VALIDATION PACK');
    lines.push('  Project: ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push(hr4('═'));
    lines.push('');

    if (tpl) {
      lines.push('TEMPLATE VALIDATION CHECKLIST:');
      lines.push(hr4('─'));
      tpl.validation_checklist.forEach(function (c, i) { lines.push('  ' + (i + 1) + '. ✓ ' + c); });
      lines.push('');
    }

    lines.push('GENERIC SAFETY VALIDATION:');
    lines.push(hr4('─'));
    lines.push('  1. ✓ Revisar arquivos-alvo antes de qualquer modificação.');
    lines.push('  2. ✓ Executar testes locais após cada patch.');
    lines.push('  3. ✓ Confirmar que nenhum arquivo de produção foi tocado.');
    lines.push('  4. ✓ Verificar evidências de cada agente antes de avançar.');
    lines.push('  5. ✓ Obter aprovação humana antes de qualquer release, tag ou deploy.');
    lines.push('');

    lines.push('VALIDATION COMMANDS (display only — run manually):');
    lines.push(hr4('─'));
    lines.push('  node --check frontend\\assets\\vision-core-clean-state.js');
    lines.push('  node --check frontend\\assets\\vision-core-clean-runtime.js');
    lines.push('  git diff --name-only');
    lines.push('  git status --short');
    lines.push('');

    lines.push('SCOPE CHECK:');
    lines.push(hr4('─'));
    lines.push('  Expected changed files (frontend only):');
    lines.push('  frontend/index.html');
    lines.push('  frontend/assets/*.js');
    lines.push('  frontend/assets/*.css');
    lines.push('  No backend/go-core/tools/package.json changes.');
    lines.push('');

    lines.push('FINAL REPORT CHECKLIST:');
    lines.push(hr4('─'));
    if (wh) { wh.final_report_contract.forEach(function (r) { lines.push('  □ ' + r); }); }
    return lines;
  }

  function buildWorkerHandoffPackage() {
    var wh   = getWorkerHandoffRegistry();
    var tpl  = getSelectedTemplate();
    var ctx  = getSelectedProjectContext();
    var agts = getSelectedAgentsForMission();
    var stack = getSelectedStackForMission();
    var type  = handoffState.selectedType;

    var lines = [];

    if (type === 'full_package') {
      lines = buildFullPackage(ctx, tpl, agts, stack, wh);
    } else if (type === 'claude_code_pkg') {
      lines = buildClaudeCodePackage(ctx, tpl, agts, stack, wh);
    } else if (type === 'codex_pkg') {
      lines = buildCodexPackage(ctx, tpl, agts, stack);
    } else if (type === 'manual_checklist') {
      lines = buildManualOperatorChecklist(ctx, tpl, agts, stack, wh);
    } else if (type === 'per_agent_pack') {
      lines = buildPerAgentPromptPack(ctx, tpl, agts);
    } else if (type === 'safety_review_pack') {
      lines = buildSafetyReviewPack(ctx, tpl, wh);
    } else if (type === 'validation_pack') {
      lines = buildValidationPack(ctx, tpl, wh);
    }

    handoffState.generatedPackage = lines.join('\n');

    var lineEl = document.getElementById('vcHandoffLineCount');
    if (lineEl) { lineEl.textContent = lines.length; }

    return handoffState.generatedPackage;
  }

  function renderWorkerHandoffPackage() {
    var output = document.getElementById('vcHandoffOutput');
    if (!output) { return; }
    var text = buildWorkerHandoffPackage();
    output.value = text;
    output.classList.remove('empty');
  }

  function copyWorkerHandoffPackage() {
    var statusEl = document.getElementById('vcHandoffCopyStatus');
    if (!handoffState.generatedPackage) {
      if (statusEl) {
        statusEl.textContent = 'Gere o pacote primeiro.';
        statusEl.className = 'vc-handoff-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-handoff-copy-status'; }, 2800);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(handoffState.generatedPackage).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className = 'vc-handoff-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-handoff-copy-status'; }, 2800);
        }
      }, function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className = 'vc-handoff-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-handoff-copy-status'; }, 3500);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className = 'vc-handoff-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-handoff-copy-status'; }, 3500);
      }
    }
  }

  function clearWorkerHandoffPackage() {
    handoffState.generatedPackage = '';
    var output = document.getElementById('vcHandoffOutput');
    if (output) {
      output.value = 'Clique em GERAR PACOTE para compor o pacote de handoff local.';
      output.classList.add('empty');
    }
    var lineEl = document.getElementById('vcHandoffLineCount');
    if (lineEl) { lineEl.textContent = '0'; }
    var statusEl = document.getElementById('vcHandoffCopyStatus');
    if (statusEl) { statusEl.className = 'vc-handoff-copy-status'; }
  }

  function initWorkerHandoff() {
    var wh = getWorkerHandoffRegistry();
    if (!wh) { return; }

    /* Build package type chips */
    var typeRow = document.getElementById('vcHandoffTypeRow');
    if (typeRow) {
      wh.package_types.forEach(function (pt) {
        var chip = document.createElement('button');
        chip.className = 'vc-handoff-type-chip' + (pt.id === handoffState.selectedType ? ' selected' : '');
        chip.setAttribute('data-handoff-type', pt.id);
        chip.type = 'button';
        chip.textContent = pt.label;
        chip.addEventListener('click', function () { setHandoffType(pt.id); });
        typeRow.appendChild(chip);
      });
    }

    /* Build target chips */
    var targetRow = document.getElementById('vcHandoffTargetRow');
    if (targetRow) {
      wh.worker_profiles.forEach(function (wp) {
        var chip = document.createElement('button');
        chip.className = 'vc-handoff-target-chip' + (wp.id === handoffState.selectedTarget ? ' selected' : '');
        chip.setAttribute('data-handoff-target', wp.id);
        chip.type = 'button';
        chip.textContent = wp.label;
        chip.addEventListener('click', function () { setHandoffTarget(wp.id); });
        targetRow.appendChild(chip);
      });
    }

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateHandoffBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderWorkerHandoffPackage();
        genBtn.textContent = '✓ PACOTE GERADO — LOCAL ONLY';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color = '#22c55e';
      });
    }

    var copyBtn = document.getElementById('vcCopyHandoffBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyWorkerHandoffPackage); }

    var clearBtn = document.getElementById('vcClearHandoffBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearWorkerHandoffPackage();
        if (genBtn) {
          genBtn.textContent = '⬡ GERAR PACOTE';
          genBtn.style.borderColor = '';
          genBtn.style.color = '';
        }
      });
    }
  }

  /* ── Project Export Preview — local UI only ─────────────────── */
  /* No file creation. No write. No download. No export. No API.  */
  /* No Blob. No URL.createObjectURL. In-memory state only.       */

  var exportPreviewState = {
    selectedMode:     'folder_tree',
    generatedPreview: ''
  };

  function getExportPreviewRegistry() {
    var reg = getPBRegistry();
    return (reg && reg.export_preview) ? reg.export_preview : null;
  }

  function setExportPreviewMode(modeId) {
    exportPreviewState.selectedMode = modeId;
    document.querySelectorAll('.vc-export-mode-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-export-mode') === modeId);
    });
  }

  function getExportPreviewContext() {
    var tpl  = getSelectedTemplate();
    var ctx  = getSelectedProjectContext();
    var agts = getSelectedAgentsForMission();
    var stack = getSelectedStackForMission();
    return { tpl: tpl, ctx: ctx, agts: agts, stack: stack };
  }

  function getFilePlaceholder(filePath, ep) {
    if (!ep) { return '// Preview placeholder for ' + filePath + '\n// No file created by FRONT-PRODUCT-5.\n'; }
    var tpl = ep.file_content_templates;
    var base = filePath.split('/').pop().split('\\').pop();
    return tpl[base] || tpl['_default'].replace(/<file>/g, filePath);
  }

  function hr5(ch, len) { return new Array((len || 64) + 1).join(ch || '─'); }

  function buildFolderTreePreview() {
    var c = getExportPreviewContext();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — FOLDER TREE');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');
    if (c.tpl && c.tpl.folder_structure.length) {
      c.tpl.folder_structure.forEach(function (f) { lines.push('  ' + f); });
    } else {
      lines.push('  (no template selected — select a project type to see folder structure)');
    }
    lines.push('');
    lines.push(hr5('─'));
    lines.push('No folders created. Preview only.');
    return lines;
  }

  function buildFileListPreview() {
    var c = getExportPreviewContext();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — FILE LIST');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');
    if (c.tpl && c.tpl.initial_files.length) {
      c.tpl.initial_files.forEach(function (f) { lines.push('  ○ ' + f); });
      lines.push('');
      lines.push('Total files: ' + c.tpl.initial_files.length);
    } else {
      lines.push('  (no template selected — select a project type to see file list)');
    }
    lines.push('');
    lines.push(hr5('─'));
    lines.push('No files created. Preview only.');
    return lines;
  }

  function buildFileContentPreview() {
    var c  = getExportPreviewContext();
    var ep = getExportPreviewRegistry();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — FILE CONTENT PLACEHOLDERS');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');
    if (!c.tpl || !c.tpl.initial_files.length) {
      lines.push('(no template selected — select a project type to see content preview)');
    } else {
      c.tpl.initial_files.forEach(function (f) {
        lines.push(hr5('─'));
        lines.push('FILE   : ' + f);
        lines.push('ACTION : WOULD CREATE IF APPROVED IN FUTURE PHASE');
        lines.push('CONTENT PREVIEW:');
        var content = getFilePlaceholder(f, ep);
        content.split('\n').forEach(function (l) { lines.push('  ' + l); });
        lines.push('');
      });
    }
    lines.push(hr5('─'));
    lines.push('No files created. Placeholders only.');
    return lines;
  }

  function buildImpactSummaryPreview() {
    var c  = getExportPreviewContext();
    var ep = getExportPreviewRegistry();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — IMPACT SUMMARY');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');

    var folderCount = c.tpl ? c.tpl.folder_structure.length : 0;
    var fileCount   = c.tpl ? c.tpl.initial_files.length    : 0;
    var agentCount  = c.agts ? (c.agts.on.length + c.agts.auto.length) : 0;
    var checkCount  = c.tpl ? c.tpl.validation_checklist.length : 0;
    var riskCount   = c.tpl ? c.tpl.risk_warnings.length : 0;
    var blockedCount = ep ? ep.blocked_actions.length : 0;

    lines.push('  Project Type    : ' + (c.ctx.projectType ? c.ctx.projectType.label : '(not selected)'));
    lines.push('  Template        : ' + (c.tpl ? c.tpl.name : '(none)'));
    lines.push('  Stack           : ' + (c.stack.length ? c.stack.join(', ') : '(none)'));
    lines.push('  Folders to create : ' + folderCount);
    lines.push('  Files to create   : ' + fileCount);
    lines.push('  Active agents     : ' + agentCount);
    lines.push('  Validation checks : ' + checkCount);
    lines.push('  Risk warnings     : ' + riskCount);
    lines.push('  Blocked actions   : ' + blockedCount);
    lines.push('');

    if (c.tpl && c.tpl.risk_warnings.length) {
      lines.push('Risks before creation:');
      c.tpl.risk_warnings.forEach(function (r) { lines.push('  ⚠ ' + r); });
      lines.push('');
    }

    lines.push('Next safe action:');
    lines.push('  Review preview and approval contract.');
    lines.push('  Real file creation remains locked.');
    if (ep) {
      lines.push('  Next required phase: ' + ep.file_creation_lock.next_required_phase);
    }
    return lines;
  }

  function buildApprovalContractPreview() {
    var ep  = getExportPreviewRegistry();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — APPROVAL CONTRACT');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');

    lines.push('Approval contract:');
    if (ep) {
      ep.approval_contract.forEach(function (c) { lines.push('  ✓ ' + c); });
    }
    lines.push('');

    lines.push('Blocked actions:');
    if (ep) {
      ep.blocked_actions.forEach(function (b) { lines.push('  ✗ ' + b); });
    }
    lines.push('');

    lines.push(hr5('─'));
    lines.push('Human approval boundary:');
    lines.push('  Real file creation requires explicit external human approval');
    lines.push('  and a separate controlled phase.');
    lines.push('  This frontend preview does not grant file creation authority.');
    return lines;
  }

  function buildProjectExportPreview() {
    var mode = exportPreviewState.selectedMode;
    var lines = [];

    if (mode === 'folder_tree')       { lines = buildFolderTreePreview(); }
    else if (mode === 'file_list')    { lines = buildFileListPreview(); }
    else if (mode === 'content_preview') { lines = buildFileContentPreview(); }
    else if (mode === 'impact_summary')  { lines = buildImpactSummaryPreview(); }
    else if (mode === 'approval_contract') { lines = buildApprovalContractPreview(); }

    exportPreviewState.generatedPreview = lines.join('\n');

    var lineEl = document.getElementById('vcExportLineCount');
    if (lineEl) { lineEl.textContent = lines.length; }

    return exportPreviewState.generatedPreview;
  }

  function renderProjectExportPreview() {
    /* Sync source summary */
    var c = getExportPreviewContext();
    function setVal(id, v) { var el = document.getElementById(id); if (el) { el.textContent = v || '—'; } }
    setVal('vcExpSrcType',     c.ctx.projectType ? c.ctx.projectType.label : null);
    setVal('vcExpSrcTemplate', c.tpl ? c.tpl.name : null);
    setVal('vcExpSrcStack',    c.stack.length ? c.stack.join(', ') : null);
    setVal('vcExpSrcSize',     c.ctx.projectSize ? c.ctx.projectSize.label : null);
    var agentCount = c.agts ? (c.agts.on.length + c.agts.auto.length) : 0;
    setVal('vcExpSrcAgents',   agentCount ? agentCount + ' ativos' : null);
    setVal('vcExpSrcHandoff',  handoffState && handoffState.selectedTarget
      ? handoffState.selectedTarget.replace(/_/g, ' ')
      : null);

    /* Build and render preview */
    var output = document.getElementById('vcExportOutput');
    if (!output) { return; }
    var text = buildProjectExportPreview();
    output.value = text;
    output.classList.remove('empty');
  }

  function copyProjectExportPreview() {
    var statusEl = document.getElementById('vcExportCopyStatus');
    if (!exportPreviewState.generatedPreview) {
      if (statusEl) {
        statusEl.textContent = 'Gere o preview primeiro.';
        statusEl.className = 'vc-export-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-export-copy-status'; }, 2800);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(exportPreviewState.generatedPreview).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className = 'vc-export-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-export-copy-status'; }, 2800);
        }
      }, function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className = 'vc-export-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-export-copy-status'; }, 3500);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className = 'vc-export-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-export-copy-status'; }, 3500);
      }
    }
  }

  function clearProjectExportPreview() {
    exportPreviewState.generatedPreview = '';
    var output = document.getElementById('vcExportOutput');
    if (output) {
      output.value = 'Clique em GERAR PREVIEW para visualizar a estrutura local.';
      output.classList.add('empty');
    }
    var lineEl = document.getElementById('vcExportLineCount');
    if (lineEl) { lineEl.textContent = '0'; }
    var statusEl = document.getElementById('vcExportCopyStatus');
    if (statusEl) { statusEl.className = 'vc-export-copy-status'; }
  }

  function initProjectExportPreview() {
    var ep = getExportPreviewRegistry();
    if (!ep) { return; }

    /* Build mode chips */
    var modeRow = document.getElementById('vcExportModeRow');
    if (modeRow) {
      ep.preview_modes.forEach(function (m) {
        var chip = document.createElement('button');
        chip.className = 'vc-export-mode-chip' + (m.id === exportPreviewState.selectedMode ? ' selected' : '');
        chip.setAttribute('data-export-mode', m.id);
        chip.type = 'button';
        chip.textContent = m.label;
        chip.addEventListener('click', function () { setExportPreviewMode(m.id); });
        modeRow.appendChild(chip);
      });
    }

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateExportBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderProjectExportPreview();
        genBtn.textContent = '✓ PREVIEW GERADO — CREATION LOCKED';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color = '#22c55e';
      });
    }

    var copyBtn = document.getElementById('vcCopyExportBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyProjectExportPreview); }

    var clearBtn = document.getElementById('vcClearExportBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearProjectExportPreview();
        if (genBtn) {
          genBtn.textContent = '⬡ GERAR PREVIEW';
          genBtn.style.borderColor = '';
          genBtn.style.color = '';
        }
      });
    }
  }

  /* ── Human Approval Gate — local UI only ─────────────────────── */
  /* No file creation. No write. No download. No export. No API.   */
  /* No Blob. No URL.createObjectURL. In-memory state only.        */

  var humanApprovalState = {
    checked:           {},
    generatedReceipt:  ''
  };

  function getHumanApprovalGateRegistry() {
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    return (pb && pb.human_approval_gate) ? pb.human_approval_gate : null;
  }

  function getHumanApprovalContext() {
    /* Pull from existing in-memory states — no disk, no API */
    var type     = (typeof pbState !== 'undefined' && pbState.selectedType)     ? pbState.selectedType     : '—';
    var stack    = (typeof pbState !== 'undefined' && pbState.selectedStack)    ? pbState.selectedStack    : '—';
    var size     = (typeof pbState !== 'undefined' && pbState.selectedSize)     ? pbState.selectedSize     : '—';
    var tpl      = (typeof pbTemplateState !== 'undefined' && pbTemplateState.selectedTemplate) ? pbTemplateState.selectedTemplate : '—';
    var agents   = (typeof pbState !== 'undefined' && Array.isArray(pbState.activeAgents)) ? pbState.activeAgents.length : 0;

    /* Derive folder/file counts from export preview if generated */
    var folderCount = 6;
    var fileCount   = 10;
    var validCount  = 4;
    var riskCount   = 3;
    if (typeof exportPreviewState !== 'undefined' && exportPreviewState.generatedPreview) {
      var lines = exportPreviewState.generatedPreview.split('\n');
      var fc = lines.filter(function (l) { return l.indexOf('/') !== -1 && l.trim().slice(-1) === '/'; }).length;
      var fl = lines.filter(function (l) { return l.indexOf('.') !== -1 && l.trim().slice(-1) !== '/'; }).length;
      if (fc > 0) { folderCount = fc; }
      if (fl > 0) { fileCount   = fl; }
    }

    return {
      type:        type,
      template:    tpl,
      stack:       stack,
      size:        size,
      agentCount:  agents,
      folderCount: folderCount,
      fileCount:   fileCount,
      validCount:  validCount,
      riskCount:   riskCount
    };
  }

  function toggleHumanAcknowledgement(ackId) {
    humanApprovalState.checked[ackId] = !humanApprovalState.checked[ackId];
    renderHumanApprovalChecklist();
    _updateHumanGateProgress();
  }

  function resetHumanApprovalChecklist() {
    humanApprovalState.checked = {};
    humanApprovalState.generatedReceipt = '';
    renderHumanApprovalChecklist();
    _updateHumanGateProgress();
    var output = document.getElementById('vcHumanReceiptOutput');
    if (output) {
      output.value = 'Clique em GERAR RECIBO LOCAL para gerar o recibo.';
      output.className = 'vc-human-receipt-output empty';
    }
    var statusEl = document.getElementById('vcHumanCopyStatus');
    if (statusEl) { statusEl.className = 'vc-human-copy-status'; }
    var genBtn = document.getElementById('vcGenerateReceiptBtn');
    if (genBtn) {
      genBtn.textContent = '⬡ GERAR RECIBO LOCAL';
      genBtn.style.borderColor = '';
      genBtn.style.color = '';
    }
  }

  function areAllHumanAcknowledgementsChecked() {
    var hag = getHumanApprovalGateRegistry();
    if (!hag) { return false; }
    return hag.required_acknowledgements.every(function (a) {
      return !!humanApprovalState.checked[a.id];
    });
  }

  function _updateHumanGateProgress() {
    var hag = getHumanApprovalGateRegistry();
    if (!hag) { return; }
    var total   = hag.required_acknowledgements.length;
    var checked = hag.required_acknowledgements.filter(function (a) {
      return !!humanApprovalState.checked[a.id];
    }).length;
    var allDone = checked === total;

    /* Summary approval status */
    var approvalEl = document.getElementById('vcHagApprovalStatus');
    if (approvalEl) { approvalEl.textContent = allDone ? 'PRONTO' : (checked + '/' + total + ' pendentes'); }

    /* Counter + gate badge in checklist area */
    var countEl = document.getElementById('vcHagAckCount');
    if (countEl) { countEl.textContent = checked; }
    var gateEl = document.getElementById('vcHagGateStatus');
    if (gateEl) {
      gateEl.textContent = allDone ? 'PRONTO' : 'INCOMPLETO';
      gateEl.className   = 'vc-human-status ' + (allDone ? 'ready' : 'incomplete');
    }

    /* Receipt header counters */
    var rcAckEl = document.getElementById('vcHagReceiptAckCount');
    if (rcAckEl) { rcAckEl.textContent = checked; }
    var rcStatusEl = document.getElementById('vcHagReceiptStatus');
    if (rcStatusEl) {
      rcStatusEl.textContent = allDone ? 'PRONTO' : 'INCOMPLETO';
      rcStatusEl.className   = 'vc-human-status ' + (allDone ? 'ready' : 'incomplete');
    }
  }

  function buildHumanApprovalReceipt() {
    var hag = getHumanApprovalGateRegistry();
    if (!hag) { return ''; }
    var ctx     = getHumanApprovalContext();
    var allDone = areAllHumanAcknowledgementsChecked();
    var total   = hag.required_acknowledgements.length;
    var checked = hag.required_acknowledgements.filter(function (a) {
      return !!humanApprovalState.checked[a.id];
    }).length;

    var lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('   VISION CORE — RECIBO DE APROVAÇÃO HUMANA');
    lines.push('   FRONT-PRODUCT-6 | Local Preview Only');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('STATUS: ' + (allDone ? 'LOCAL PREVIEW READY' : 'INCOMPLETO'));
    lines.push('');
    lines.push('── Contexto do Projeto ─────────────────────────────────────────');
    lines.push('  Tipo de Projeto  : ' + ctx.type);
    lines.push('  Template         : ' + ctx.template);
    lines.push('  Stack            : ' + ctx.stack);
    lines.push('  Tamanho/Risco    : ' + ctx.size);
    lines.push('  Agentes Ativos   : ' + ctx.agentCount);
    lines.push('  Pastas Previstas : ' + ctx.folderCount);
    lines.push('  Arquivos Previstos: ' + ctx.fileCount);
    lines.push('  Validações       : ' + ctx.validCount);
    lines.push('  Riscos           : ' + ctx.riskCount);
    lines.push('');
    lines.push('── Confirmações (' + checked + '/' + total + ') ──────────────────────────────────────');
    hag.required_acknowledgements.forEach(function (a) {
      var mark = humanApprovalState.checked[a.id] ? '[✓]' : '[ ]';
      lines.push('  ' + mark + ' ' + a.text);
    });
    lines.push('');
    lines.push('── Capacidades Bloqueadas ───────────────────────────────────────');
    hag.locked_capabilities.forEach(function (cap) {
      lines.push('  ⊗ ' + cap.toUpperCase().replace(/_/g, ' ') + ' — LOCKED');
    });
    lines.push('');
    lines.push('── Estado de Autoridade Final ──────────────────────────────────');
    lines.push('  human_approval_gate_ready  : ' + allDone);
    lines.push('  human_approval_collected   : ' + allDone);
    lines.push('  file_creation_allowed      : false');
    lines.push('  real_file_creation_enabled : false');
    lines.push('  backend_write_allowed      : false');
    lines.push('  command_execution_allowed  : false');
    lines.push('  deploy_allowed             : false');
    lines.push('  release_allowed            : false');
    lines.push('  tag_allowed                : false');
    lines.push('  stable_promotion_allowed   : false');
    lines.push('  production_touched         : false');
    lines.push('  pass_gold_real_claimed     : false');
    lines.push('');
    lines.push('── Fronteira do Próximo Phase ──────────────────────────────────');
    lines.push('  ' + hag.next_phase_boundary);
    lines.push('');
    lines.push('── Aviso Final ─────────────────────────────────────────────────');
    lines.push('  ' + hag.required_final_warning);
    lines.push('  Este recibo é evidência local de prévia apenas.');
    lines.push('  Não cria arquivos.');
    lines.push('  Não concede autoridade de escrita backend.');
    lines.push('  Não concede autoridade de execução de comandos.');
    lines.push('  Não concede autoridade de deploy/release/tag/stable.');
    lines.push('  Não reivindica PASS GOLD REAL.');
    if (allDone) {
      lines.push('');
      lines.push('  Próximo phase obrigatório:');
      lines.push('  FRONT-PRODUCT-7 ou comando explícito separado de criação real de arquivos.');
    }
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines.join('\n');
  }

  function renderHumanApprovalReceipt() {
    var receipt = buildHumanApprovalReceipt();
    humanApprovalState.generatedReceipt = receipt;
    var output = document.getElementById('vcHumanReceiptOutput');
    if (!output) { return; }
    output.value = receipt;
    output.className = 'vc-human-receipt-output' + (receipt ? '' : ' empty');
    _updateHumanGateProgress();
  }

  function copyHumanApprovalReceipt() {
    var text     = humanApprovalState.generatedReceipt;
    var statusEl = document.getElementById('vcHumanCopyStatus');
    if (!text) {
      if (statusEl) {
        statusEl.textContent  = '⚠ Gere o recibo primeiro.';
        statusEl.className    = 'vc-human-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-human-copy-status'; }, 2500);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className   = 'vc-human-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-human-copy-status'; }, 2500);
        }
      }).catch(function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className   = 'vc-human-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-human-copy-status'; }, 3000);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className   = 'vc-human-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-human-copy-status'; }, 3000);
      }
    }
  }

  function clearHumanApprovalReceipt() {
    humanApprovalState.generatedReceipt = '';
    var output = document.getElementById('vcHumanReceiptOutput');
    if (output) {
      output.value     = 'Clique em GERAR RECIBO LOCAL para gerar o recibo.';
      output.className = 'vc-human-receipt-output empty';
    }
    var statusEl = document.getElementById('vcHumanCopyStatus');
    if (statusEl) { statusEl.className = 'vc-human-copy-status'; }
  }

  function renderHumanApprovalChecklist() {
    var hag = getHumanApprovalGateRegistry();
    var container = document.getElementById('vcHumanAckChecklist');
    if (!hag || !container) { return; }
    /* Rebuild checklist DOM */
    container.innerHTML = '';
    hag.required_acknowledgements.forEach(function (ack) {
      var item = document.createElement('div');
      var isChecked = !!humanApprovalState.checked[ack.id];
      item.className = 'vc-human-ack-item' + (isChecked ? ' checked' : '');
      item.setAttribute('role', 'checkbox');
      item.setAttribute('aria-checked', isChecked ? 'true' : 'false');
      item.setAttribute('tabindex', '0');
      item.setAttribute('data-ack-id', ack.id);

      var box = document.createElement('span');
      box.className   = 'vc-human-ack-box';
      box.textContent = isChecked ? '✓' : '';

      var textEl = document.createElement('span');
      textEl.className   = 'vc-human-ack-text';
      textEl.textContent = ack.text;

      item.appendChild(box);
      item.appendChild(textEl);
      item.addEventListener('click', function () { toggleHumanAcknowledgement(ack.id); });
      item.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleHumanAcknowledgement(ack.id); }
      });
      container.appendChild(item);
    });
  }

  function renderHumanApprovalSummary() {
    var ctx = getHumanApprovalContext();
    var map = {
      vcHagSrcType:     ctx.type,
      vcHagSrcTemplate: ctx.template,
      vcHagSrcStack:    ctx.stack,
      vcHagSrcSize:     ctx.size,
      vcHagSrcAgents:   ctx.agentCount + ' agente(s)',
      vcHagFolderCount: ctx.folderCount + ' pasta(s)',
      vcHagFileCount:   ctx.fileCount  + ' arquivo(s)'
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.textContent = map[id]; }
    });
  }

  function initHumanApprovalGate() {
    var hag = getHumanApprovalGateRegistry();
    if (!hag) { return; }

    renderHumanApprovalChecklist();
    renderHumanApprovalSummary();
    _updateHumanGateProgress();

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateReceiptBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderHumanApprovalSummary();
        renderHumanApprovalReceipt();
        var allDone = areAllHumanAcknowledgementsChecked();
        genBtn.textContent    = allDone ? '✓ RECIBO LOCAL PRONTO' : '✓ RECIBO GERADO — INCOMPLETO';
        genBtn.style.borderColor = allDone ? 'rgba(34,197,94,.65)' : 'rgba(251,146,60,.65)';
        genBtn.style.color       = allDone ? '#22c55e'             : '#fb923c';
      });
    }

    var copyBtn = document.getElementById('vcCopyReceiptBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyHumanApprovalReceipt); }

    var clearBtn = document.getElementById('vcClearReceiptBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearHumanApprovalReceipt();
        if (genBtn) {
          genBtn.textContent       = '⬡ GERAR RECIBO LOCAL';
          genBtn.style.borderColor = '';
          genBtn.style.color       = '';
        }
      });
    }

    var resetBtn = document.getElementById('vcResetAckBtn');
    if (resetBtn) { resetBtn.addEventListener('click', resetHumanApprovalChecklist); }
  }

  /* ── Real File Creation Command Package — local UI only ──────── */
  /* No file creation. No write. No download. No export. No API.  */
  /* No Blob. No URL.createObjectURL. In-memory state only.       */

  var realFileCommandState = {
    selectedMode:      'full_real_file_creation_package',
    selectedWorker:    'claude_code',
    generatedPackage:  ''
  };

  function getRealFileCommandPackageRegistry() {
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    return (pb && pb.real_file_command_package) ? pb.real_file_command_package : null;
  }

  function setRealFileCommandMode(modeId) {
    realFileCommandState.selectedMode = modeId;
    var modeRow = document.getElementById('vcRealCommandModeRow');
    if (modeRow) {
      Array.prototype.forEach.call(modeRow.querySelectorAll('.vc-real-command-mode-chip'), function (c) {
        c.className = 'vc-real-command-mode-chip' + (c.getAttribute('data-cmd-mode') === modeId ? ' selected' : '');
      });
    }
  }

  function setRealFileCommandWorker(workerId) {
    realFileCommandState.selectedWorker = workerId;
    var workerRow = document.getElementById('vcRealCommandWorkerRow');
    if (workerRow) {
      Array.prototype.forEach.call(workerRow.querySelectorAll('.vc-real-command-worker-chip'), function (c) {
        c.className = 'vc-real-command-worker-chip' + (c.getAttribute('data-cmd-worker') === workerId ? ' selected' : '');
      });
    }
  }

  function getRealFileCommandContext() {
    var type    = (typeof pbState !== 'undefined' && pbState.selectedType)  ? pbState.selectedType  : '—';
    var stack   = (typeof pbState !== 'undefined' && pbState.selectedStack) ? pbState.selectedStack : '—';
    var size    = (typeof pbState !== 'undefined' && pbState.selectedSize)  ? pbState.selectedSize  : '—';
    var tpl     = (typeof pbTemplateState !== 'undefined' && pbTemplateState.selectedTemplate) ? pbTemplateState.selectedTemplate : '—';
    var agents  = (typeof pbState !== 'undefined' && Array.isArray(pbState.activeAgents)) ? pbState.activeAgents : [];

    /* Template registry detail */
    var tplDetail = null;
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    if (pb && pb.template_packs && tpl !== '—') {
      tplDetail = null;
      for (var i = 0; i < pb.template_packs.length; i++) {
        if (pb.template_packs[i].id === tpl) { tplDetail = pb.template_packs[i]; break; }
      }
    }

    var exportAvailable = (typeof exportPreviewState !== 'undefined' && !!exportPreviewState.generatedPreview);
    var approvalReady   = (typeof humanApprovalState !== 'undefined' && areAllHumanAcknowledgementsChecked());
    var receiptAvailable = (typeof humanApprovalState !== 'undefined' && !!humanApprovalState.generatedReceipt);

    return {
      type:            type,
      template:        tpl,
      tplDetail:       tplDetail,
      stack:           stack,
      size:            size,
      agents:          agents,
      exportAvailable: exportAvailable,
      approvalReady:   approvalReady,
      receiptAvailable:receiptAvailable
    };
  }

  function isHumanApprovalGateReadyForCommand() {
    return (typeof humanApprovalState !== 'undefined') && areAllHumanAcknowledgementsChecked();
  }

  function renderRealFileCommandStatus() {
    var ctx = getRealFileCommandContext();

    /* Readiness cards */
    var setCard = function (cardId, valId, label, isReady) {
      var card = document.getElementById(cardId);
      var val  = document.getElementById(valId);
      if (card) { card.className = 'vc-real-readiness-card ' + (isReady ? 'ready' : 'blocked'); }
      if (val)  { val.textContent = label; }
    };

    setCard('vcRealReadyType',     'vcRealReadyTypeVal',     ctx.type !== '—'  ? ctx.type  : 'Não selecionado', ctx.type !== '—');
    setCard('vcRealReadyTpl',      'vcRealReadyTplVal',      ctx.template !== '—' ? ctx.template : 'Não selecionado', ctx.template !== '—');
    setCard('vcRealReadyStack',    'vcRealReadyStackVal',    ctx.stack !== '—' ? ctx.stack : 'Não selecionado', ctx.stack !== '—');
    setCard('vcRealReadyExport',   'vcRealReadyExportVal',   ctx.exportAvailable  ? 'Disponível'  : 'Não gerado',   ctx.exportAvailable);
    setCard('vcRealReadyApproval', 'vcRealReadyApprovalVal', ctx.approvalReady    ? 'PRONTO'      : 'Incompleto',   ctx.approvalReady);

    var hag = getHumanApprovalGateRegistry ? getHumanApprovalGateRegistry() : null;
    var total   = hag ? hag.required_acknowledgements.length : 12;
    var checked = (typeof humanApprovalState !== 'undefined')
      ? (hag ? hag.required_acknowledgements.filter(function (a) { return !!humanApprovalState.checked[a.id]; }).length : 0)
      : 0;
    setCard('vcRealReadyAck', 'vcRealReadyAckVal', checked + '/' + total, checked === total);
  }

  /* ── Package builders ──────────────────────────────────────── */

  function _cmdHeader(ctx, mode, worker, gateReady) {
    var lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('   VISION CORE — PACOTE DE COMANDO PARA CRIAÇÃO REAL');
    lines.push('   FRONT-PRODUCT-7 | External Command Package — Text Only');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('MODO     : ' + mode);
    lines.push('WORKER   : ' + worker);
    lines.push('STATUS   : ' + (gateReady ? 'READY FOR EXTERNAL HUMAN-CONTROLLED WORKER' : 'BLOCKED UNTIL HUMAN APPROVAL GATE READY'));
    lines.push('');
    lines.push('── Autoridade ──────────────────────────────────────────────────');
    lines.push('  frontend_file_creation_allowed  : false');
    lines.push('  real_file_creation_enabled      : false');
    lines.push('  frontend_file_write_allowed     : false');
    lines.push('  backend_write_allowed           : false');
    lines.push('  command_execution_allowed       : false');
    lines.push('  external_worker_required        : true');
    lines.push('  human_approval_required         : true');
    lines.push('  deploy_allowed                  : false');
    lines.push('  release_allowed                 : false');
    lines.push('  tag_allowed                     : false');
    lines.push('  stable_promotion_allowed        : false');
    lines.push('  production_touched              : false');
    lines.push('  pass_gold_real_claimed          : false');
    lines.push('');
    lines.push('── Contexto do Projeto ─────────────────────────────────────────');
    lines.push('  Tipo de Projeto  : ' + ctx.type);
    lines.push('  Template         : ' + ctx.template);
    lines.push('  Stack            : ' + ctx.stack);
    lines.push('  Tamanho/Risco    : ' + ctx.size);
    lines.push('  Agentes Ativos   : ' + ctx.agents.length);
    if (ctx.tplDetail) {
      lines.push('  Pastas Previstas : ' + (ctx.tplDetail.folder_count || ctx.tplDetail.preview_folders || '—'));
      lines.push('  Arquivos Previstos: ' + (ctx.tplDetail.file_count || ctx.tplDetail.preview_files || '—'));
    }
    lines.push('  Export Preview   : ' + (ctx.exportAvailable ? 'Disponível' : 'Não gerado'));
    lines.push('  Aprovação Gate   : ' + (ctx.approvalReady ? 'PRONTO' : 'INCOMPLETO'));
    lines.push('');
    return lines;
  }

  function _cmdFooter(pkg) {
    var lines = [];
    lines.push('');
    lines.push('── Regras de Segurança do Pacote ───────────────────────────────');
    pkg.command_safety_rules.forEach(function (r) {
      lines.push('  ✓ ' + r);
    });
    lines.push('');
    lines.push('── Aviso de Não-Autoridade ─────────────────────────────────────');
    lines.push('  ' + pkg.explicit_non_authority_statement);
    lines.push('');
    lines.push('── Contrato de Relatório Final ─────────────────────────────────');
    pkg.final_report_contract.forEach(function (item) {
      lines.push('  [ ] ' + item);
    });
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines;
  }

  function buildFullRealFileCreationPackage() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();
    var workerProfile = pkg.external_worker_profiles.filter(function (w) {
      return w.id === realFileCommandState.selectedWorker;
    })[0] || pkg.external_worker_profiles[0];

    var lines = _cmdHeader(ctx, 'Full Real File Creation Package', workerProfile.label, gateReady);
    lines.push('── Tarefa do Worker Externo ────────────────────────────────────');
    lines.push('  Worker: ' + workerProfile.label + ' (' + workerProfile.role + ')');
    lines.push('  Estilo: ' + workerProfile.instruction_style);
    lines.push('');
    lines.push('  INSTRUÇÃO:');
    lines.push('  Crie os arquivos abaixo em uma fase externa separada e autorizada.');
    lines.push('  Siga a estrutura de pastas e os arquivos iniciais do template selecionado.');
    lines.push('  Use o conteúdo placeholder do export preview como ponto de partida.');
    lines.push('');
    lines.push('  CAMINHOS PERMITIDOS (baseados no template "' + ctx.template + '"):');
    if (ctx.tplDetail && ctx.tplDetail.folder_structure) {
      ctx.tplDetail.folder_structure.forEach(function (f) {
        lines.push('    + ' + f);
      });
    } else {
      lines.push('    (Ver export preview para estrutura detalhada)');
    }
    lines.push('');
    lines.push('  ARQUIVOS INICIAIS:');
    if (ctx.tplDetail && ctx.tplDetail.initial_files) {
      ctx.tplDetail.initial_files.forEach(function (f) {
        lines.push('    + ' + f);
      });
    } else {
      lines.push('    (Ver export preview para lista de arquivos)');
    }
    lines.push('');
    lines.push('  RESTRIÇÕES ABSOLUTAS:');
    lines.push('  ⊗ Não modificar backend/*, go-core/*, tools/*, package.json');
    lines.push('  ⊗ Não fazer deploy/release/tag/stable/produção');
    lines.push('  ⊗ Não reivindicar PASS GOLD REAL');
    lines.push('  ⊗ Reportar todo arquivo criado/modificado');
    lines.push('');
    lines.push('  VALIDAÇÃO (executar manualmente após criar arquivos):');
    lines.push('  $ node --check <arquivo.js>');
    lines.push('  $ git status');
    lines.push('  $ git diff --stat');
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildClaudeCodeFileCreationTask() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();

    var lines = _cmdHeader(ctx, 'Claude Code File Creation Task', 'Claude Code', gateReady);
    lines.push('── Tarefa para Claude Code ─────────────────────────────────────');
    lines.push('  Você é um worker externo local. Não é o Vision Core frontend.');
    lines.push('');
    lines.push('  CONTEXTO DO PROJETO:');
    lines.push('  Repositório: C:\\Users\\<operador>\\Desktop\\vision-core  (ajustar)');
    lines.push('  Template   : ' + ctx.template);
    lines.push('  Stack      : ' + ctx.stack);
    lines.push('  Tipo       : ' + ctx.type);
    lines.push('');
    lines.push('  FASE: Criação local de arquivos em branch separado.');
    lines.push('');
    lines.push('  PASSO 1 — CRIAR BRANCH:');
    lines.push('  git checkout main');
    lines.push('  git pull origin main');
    lines.push('  git checkout -b feat/real-file-creation-<data>');
    lines.push('');
    lines.push('  PASSO 2 — CRIAR ESTRUTURA DE PASTAS E ARQUIVOS:');
    if (ctx.tplDetail && ctx.tplDetail.folder_structure) {
      ctx.tplDetail.folder_structure.forEach(function (f) {
        lines.push('  mkdir -p ' + f.replace(/\/$/, ''));
      });
    } else {
      lines.push('  (Consulte o export preview para estrutura de pastas)');
    }
    lines.push('');
    if (ctx.tplDetail && ctx.tplDetail.initial_files) {
      ctx.tplDetail.initial_files.forEach(function (f) {
        lines.push('  Criar arquivo: ' + f);
      });
    } else {
      lines.push('  (Consulte o export preview para lista de arquivos)');
    }
    lines.push('');
    lines.push('  PASSO 3 — VALIDAÇÃO:');
    lines.push('  node --check <arquivos JS criados>');
    lines.push('  git status');
    lines.push('  git diff --stat');
    lines.push('');
    lines.push('  CAMINHOS PROIBIDOS (não tocar):');
    lines.push('  ⊗ backend/*');
    lines.push('  ⊗ go-core/*');
    lines.push('  ⊗ tools/*');
    lines.push('  ⊗ package.json');
    lines.push('');
    lines.push('  NÃO FAZER SEM INSTRUÇÃO EXPLÍCITA:');
    lines.push('  ⊗ git push');
    lines.push('  ⊗ gh pr create');
    lines.push('  ⊗ git tag');
    lines.push('  ⊗ npm publish / deploy');
    lines.push('');
    lines.push('  RELATÓRIO FINAL OBRIGATÓRIO:');
    pkg.final_report_contract.forEach(function (item) {
      lines.push('  [ ] ' + item);
    });
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildManualOperatorFileCreationChecklist() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();

    var lines = _cmdHeader(ctx, 'Manual Operator File Creation Checklist', 'Manual Operator', gateReady);
    lines.push('── Checklist para Operador Manual ──────────────────────────────');
    lines.push('');
    lines.push('  [ ] 1. Verificar branch atual:');
    lines.push('          git branch');
    lines.push('          git status');
    lines.push('');
    lines.push('  [ ] 2. Criar branch de trabalho:');
    lines.push('          git checkout main && git pull origin main');
    lines.push('          git checkout -b feat/real-file-creation-<data>');
    lines.push('');
    lines.push('  [ ] 3. Criar estrutura de pastas manualmente:');
    if (ctx.tplDetail && ctx.tplDetail.folder_structure) {
      ctx.tplDetail.folder_structure.forEach(function (f) {
        lines.push('          [ ] mkdir ' + f);
      });
    } else {
      lines.push('          (Ver export preview para estrutura)');
    }
    lines.push('');
    lines.push('  [ ] 4. Criar arquivos iniciais manualmente:');
    if (ctx.tplDetail && ctx.tplDetail.initial_files) {
      ctx.tplDetail.initial_files.forEach(function (f) {
        lines.push('          [ ] Criar e preencher: ' + f);
      });
    } else {
      lines.push('          (Ver export preview para lista de arquivos)');
    }
    lines.push('');
    lines.push('  [ ] 5. Colar conteúdo placeholder do export preview');
    lines.push('  [ ] 6. Revisar diff: git diff --stat');
    lines.push('  [ ] 7. Executar validação: node --check <arquivos.js>');
    lines.push('  [ ] 8. Confirmar: git status');
    lines.push('  [ ] 9. NÃO fazer deploy/release/tag/stable/push sem instrução explícita');
    lines.push('  [ ] 10. NÃO reivindicar PASS GOLD REAL');
    lines.push('  [ ] 11. Preencher relatório final');
    lines.push('');
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildSafetyFirstDryRunPackage() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();

    var lines = _cmdHeader(ctx, 'Safety-First Dry Run Package', realFileCommandState.selectedWorker, gateReady);
    lines.push('── Dry Run — Simulação Apenas (NÃO CRIA ARQUIVOS REAIS) ────────');
    lines.push('');
    lines.push('  Este pacote solicita SIMULAÇÃO da criação de arquivos apenas.');
    lines.push('  Nenhum arquivo real deve ser criado nesta fase.');
    lines.push('');
    lines.push('  SIMULAÇÃO — Estrutura que SERIA criada:');
    if (ctx.tplDetail && ctx.tplDetail.folder_structure) {
      ctx.tplDetail.folder_structure.forEach(function (f) {
        lines.push('  [DRY RUN] pasta : ' + f);
      });
    }
    if (ctx.tplDetail && ctx.tplDetail.initial_files) {
      ctx.tplDetail.initial_files.forEach(function (f) {
        lines.push('  [DRY RUN] arquivo: ' + f);
      });
    }
    if (!ctx.tplDetail) {
      lines.push('  (Ver export preview para estrutura simulada)');
    }
    lines.push('');
    lines.push('  VALIDAÇÃO DRY RUN (não cria arquivos):');
    lines.push('  $ git status   # verificar branch limpo');
    lines.push('  $ git diff     # nenhum diff esperado');
    lines.push('');
    lines.push('  PRÓXIMO PASSO (após revisão humana do dry run):');
    lines.push('  Usar Full Real File Creation Package com aprovação explícita.');
    lines.push('');
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildValidationOnlyPackage() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();

    var lines = _cmdHeader(ctx, 'Validation-Only Package', realFileCommandState.selectedWorker, gateReady);
    lines.push('── Pacote de Validação Apenas (SEM CRIAÇÃO DE ARQUIVOS) ────────');
    lines.push('');
    lines.push('  Este pacote NÃO inclui instruções de criação de arquivos.');
    lines.push('  Use-o para verificar o estado atual do repositório e validar');
    lines.push('  precondições antes de qualquer fase real de criação.');
    lines.push('');
    lines.push('  VERIFICAÇÕES DE PRÉ-ESTADO:');
    lines.push('  $ git status              # repositório limpo?');
    lines.push('  $ git branch              # branch correto?');
    lines.push('  $ git log --oneline -5    # histórico recente');
    lines.push('  $ node --version          # Node.js disponível?');
    lines.push('');
    lines.push('  SCAN DE SEGURANÇA (exibir resultado, não executar ação):');
    lines.push('  Verificar manualmente ausência de:');
    lines.push('  - fetch(), XMLHttpRequest, eval(), exec(), spawn()');
    lines.push('  - localStorage, sessionStorage');
    lines.push('  - Blob, URL.createObjectURL');
    lines.push('  - file_creation_allowed: true');
    lines.push('  - real_file_creation_enabled: true');
    lines.push('');
    lines.push('  VERIFICAÇÃO DE ESCOPO:');
    lines.push('  $ git diff --name-only main...HEAD');
    lines.push('  Confirmar: apenas arquivos frontend/ alterados');
    lines.push('');
    lines.push('  VERIFICAÇÃO DE FLAGS DE SEGURANÇA:');
    lines.push('  Confirmar em vision-core-clean-state.js:');
    lines.push('  - pass_gold_real_claimed: false');
    lines.push('  - stable_promotion_allowed: false');
    lines.push('  - release_allowed: false');
    lines.push('  - production_touched: false');
    lines.push('');
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildRealFileCommandPackage() {
    var mode = realFileCommandState.selectedMode;
    if (mode === 'claude_code_file_creation_task')          { return buildClaudeCodeFileCreationTask(); }
    if (mode === 'manual_operator_file_creation_checklist') { return buildManualOperatorFileCreationChecklist(); }
    if (mode === 'safety_first_dry_run_package')            { return buildSafetyFirstDryRunPackage(); }
    if (mode === 'validation_only_package')                 { return buildValidationOnlyPackage(); }
    return buildFullRealFileCreationPackage();
  }

  function renderRealFileCommandPackage() {
    renderRealFileCommandStatus();
    var pkg = buildRealFileCommandPackage();
    realFileCommandState.generatedPackage = pkg;

    var output = document.getElementById('vcRealCommandOutput');
    if (output) {
      output.value     = pkg;
      output.className = 'vc-real-command-output' + (pkg ? '' : ' empty');
    }
    var lineEl = document.getElementById('vcRealCommandLineCount');
    if (lineEl && pkg) { lineEl.textContent = pkg.split('\n').length; }
  }

  function copyRealFileCommandPackage() {
    var text     = realFileCommandState.generatedPackage;
    var statusEl = document.getElementById('vcRealCommandCopyStatus');
    if (!text) {
      if (statusEl) {
        statusEl.textContent = '⚠ Gere o pacote primeiro.';
        statusEl.className   = 'vc-real-command-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-real-command-copy-status'; }, 2500);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className   = 'vc-real-command-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-real-command-copy-status'; }, 2500);
        }
      }).catch(function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className   = 'vc-real-command-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-real-command-copy-status'; }, 3000);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className   = 'vc-real-command-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-real-command-copy-status'; }, 3000);
      }
    }
  }

  function clearRealFileCommandPackage() {
    realFileCommandState.generatedPackage = '';
    var output = document.getElementById('vcRealCommandOutput');
    if (output) {
      output.value     = 'Clique em GERAR PACOTE DE COMANDO para gerar o pacote.';
      output.className = 'vc-real-command-output empty';
    }
    var lineEl = document.getElementById('vcRealCommandLineCount');
    if (lineEl) { lineEl.textContent = '0'; }
    var statusEl = document.getElementById('vcRealCommandCopyStatus');
    if (statusEl) { statusEl.className = 'vc-real-command-copy-status'; }
  }

  function initRealFileCommandPackage() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return; }

    /* Build mode chips */
    var modeRow = document.getElementById('vcRealCommandModeRow');
    if (modeRow) {
      pkg.package_modes.forEach(function (m) {
        var chip = document.createElement('button');
        chip.className = 'vc-real-command-mode-chip' + (m.id === realFileCommandState.selectedMode ? ' selected' : '');
        chip.setAttribute('data-cmd-mode', m.id);
        chip.type = 'button';
        chip.textContent = m.label;
        chip.addEventListener('click', function () { setRealFileCommandMode(m.id); });
        modeRow.appendChild(chip);
      });
    }

    /* Build worker chips */
    var workerRow = document.getElementById('vcRealCommandWorkerRow');
    if (workerRow) {
      pkg.external_worker_profiles.forEach(function (w) {
        var chip = document.createElement('button');
        chip.className = 'vc-real-command-worker-chip' + (w.id === realFileCommandState.selectedWorker ? ' selected' : '');
        chip.setAttribute('data-cmd-worker', w.id);
        chip.type = 'button';
        chip.textContent = w.label;
        chip.addEventListener('click', function () { setRealFileCommandWorker(w.id); });
        workerRow.appendChild(chip);
      });
    }

    /* Initial readiness render */
    renderRealFileCommandStatus();

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateCommandPkgBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderRealFileCommandPackage();
        var gateReady = isHumanApprovalGateReadyForCommand();
        genBtn.textContent    = gateReady ? '✓ PACOTE PRONTO — EXTERNAL ONLY' : '✓ PACOTE GERADO — GATE INCOMPLETO';
        genBtn.style.borderColor = gateReady ? 'rgba(34,211,238,.70)' : 'rgba(251,146,60,.65)';
        genBtn.style.color       = gateReady ? '#22d3ee'              : '#fb923c';
      });
    }

    var copyBtn = document.getElementById('vcCopyCommandPkgBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyRealFileCommandPackage); }

    var clearBtn = document.getElementById('vcClearCommandPkgBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearRealFileCommandPackage();
        if (genBtn) {
          genBtn.textContent       = '⬡ GERAR PACOTE DE COMANDO';
          genBtn.style.borderColor = '';
          genBtn.style.color       = '';
        }
      });
    }
  }

  /* ── Worker Result Receipt — local UI only ────────────────────── */
  /* No file read/write. No commands. No download. No API. No exec. */
  /* Input is manual text paste only. All matching is local string. */

  var workerResultReceiptState = {
    selectedMode:     'evidence_completeness_review',
    reportText:       '',
    evidenceStatus:   {},
    generatedReceipt: ''
  };

  function getWorkerResultReceiptRegistry() {
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    return (pb && pb.worker_result_receipt) ? pb.worker_result_receipt : null;
  }

  function setWorkerResultReviewMode(modeId) {
    workerResultReceiptState.selectedMode = modeId;
    var modeRow = document.getElementById('vcResultModeRow');
    if (modeRow) {
      Array.prototype.forEach.call(modeRow.querySelectorAll('.vc-result-mode-chip'), function (c) {
        c.className = 'vc-result-mode-chip' + (c.getAttribute('data-result-mode') === modeId ? ' selected' : '');
      });
    }
  }

  function getWorkerReportText() {
    var el = document.getElementById('vcWorkerReportInput');
    return el ? el.value : '';
  }

  function normalizeWorkerReportText(text) {
    return text.toLowerCase().replace(/\s+/g, ' ');
  }

  function analyzeWorkerEvidenceText() {
    var wrr = getWorkerResultReceiptRegistry();
    if (!wrr) { return; }

    var rawText = getWorkerReportText();
    workerResultReceiptState.reportText = rawText;
    var normText = normalizeWorkerReportText(rawText);

    var ambiguousMarkers = ['unknown', 'not sure', 'unclear', 'needs review', 'necessita revisão'];

    wrr.required_evidence_fields.forEach(function (field) {
      var found       = false;
      var foundMarker = '';
      var ambiguous   = false;

      /* Check each marker */
      field.markers.forEach(function (marker) {
        if (normText.indexOf(normalizeWorkerReportText(marker)) !== -1) {
          found       = true;
          foundMarker = marker;
        }
      });

      /* Check ambiguous proximity — simple: ambiguous word in whole text near field name */
      if (found) {
        ambiguousMarkers.forEach(function (am) {
          if (normText.indexOf(am) !== -1) {
            /* Only flag ambiguous if the ambiguous word appears close to any field marker */
            var markerIdx  = normText.indexOf(normalizeWorkerReportText(foundMarker));
            var ambigIdx   = normText.indexOf(am);
            if (Math.abs(markerIdx - ambigIdx) < 120) { ambiguous = true; }
          }
        });
      }

      workerResultReceiptState.evidenceStatus[field.id] = {
        status:      found ? (ambiguous ? 'needs_review' : 'present') : 'missing',
        foundMarker: found ? foundMarker : ''
      };
    });

    renderWorkerEvidenceChecklist();
    _updateEvidenceSummary(wrr);
  }

  function _updateEvidenceSummary(wrr) {
    var total    = wrr.required_evidence_fields.length;
    var present  = 0;
    var missing  = 0;
    var review   = 0;

    wrr.required_evidence_fields.forEach(function (f) {
      var s = workerResultReceiptState.evidenceStatus[f.id];
      if (!s) { missing++; return; }
      if (s.status === 'present')      { present++; }
      else if (s.status === 'missing') { missing++; }
      else                             { review++;  }
    });

    var chip  = document.getElementById('vcEvidenceSummaryChip');
    var label = document.getElementById('vcEvidenceCountLabel');
    if (label) { label.textContent = present + ' / ' + total + ' campos'; }
    if (chip) {
      if (missing === 0 && review === 0) {
        chip.textContent = 'EVIDENCE COMPLETE';
        chip.className   = 'vc-evidence-count-chip complete';
      } else if (review > 0) {
        chip.textContent = 'NEEDS REVIEW (' + review + ')';
        chip.className   = 'vc-evidence-count-chip review';
      } else {
        chip.textContent = 'EVIDENCE INCOMPLETE (' + missing + ' MISSING)';
        chip.className   = 'vc-evidence-count-chip incomplete';
      }
    }
  }

  function renderWorkerEvidenceChecklist() {
    var wrr       = getWorkerResultReceiptRegistry();
    var container = document.getElementById('vcEvidenceChecklistGrid');
    if (!wrr || !container) { return; }

    container.innerHTML = '';
    wrr.required_evidence_fields.forEach(function (field) {
      var status = workerResultReceiptState.evidenceStatus[field.id];
      var st     = status ? status.status : 'missing';
      var marker = status ? status.foundMarker : '';

      var iconMap  = { present: '✓', missing: '⊗', needs_review: '◈' };
      var labelMap = { present: 'PRESENT', missing: 'MISSING', needs_review: 'NEEDS REVIEW' };

      var card = document.createElement('div');
      card.className = 'vc-evidence-card ' + (st === 'needs_review' ? 'review' : st);

      var icon = document.createElement('span');
      icon.className   = 'vc-evidence-icon';
      icon.textContent = iconMap[st] || '—';

      var textEl = document.createElement('div');
      textEl.className = 'vc-evidence-text';

      var labelEl = document.createElement('div');
      labelEl.className   = 'vc-evidence-label';
      labelEl.textContent = field.label;

      var statusEl = document.createElement('div');
      statusEl.className   = 'vc-evidence-status';
      statusEl.textContent = labelMap[st] || '—';

      var markerEl = document.createElement('div');
      markerEl.className   = 'vc-evidence-marker';
      markerEl.textContent = marker ? 'Detectado: "' + marker + '"' : (st === 'missing' ? 'Não detectado' : '');

      textEl.appendChild(labelEl);
      textEl.appendChild(statusEl);
      textEl.appendChild(markerEl);
      card.appendChild(icon);
      card.appendChild(textEl);
      container.appendChild(card);
    });
  }

  function buildWorkerEvidenceReceipt() {
    var wrr = getWorkerResultReceiptRegistry();
    if (!wrr) { return ''; }

    var ctx       = (typeof getRealFileCommandContext === 'function') ? getRealFileCommandContext() : {};
    var total     = wrr.required_evidence_fields.length;
    var present   = 0;
    var missing   = 0;
    var review    = 0;

    wrr.required_evidence_fields.forEach(function (f) {
      var s = workerResultReceiptState.evidenceStatus[f.id];
      if (!s || s.status === 'missing')        { missing++; }
      else if (s.status === 'needs_review')    { review++;  }
      else                                     { present++; }
    });

    var overallStatus = (missing === 0 && review === 0)
      ? 'EVIDENCE COMPLETE'
      : (review > 0 ? 'NEEDS REVIEW' : 'EVIDENCE INCOMPLETE');

    var lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('   VISION CORE — RECIBO DO WORKER EXTERNO');
    lines.push('   FRONT-PRODUCT-8 | Manual Evidence Review Only');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('STATUS GERAL: ' + overallStatus);
    lines.push('Campos presentes : ' + present + ' / ' + total);
    lines.push('Campos ausentes  : ' + missing);
    lines.push('Necessitam revisão: ' + review);
    lines.push('');
    lines.push('── Contexto do Projeto ─────────────────────────────────────────');
    lines.push('  Tipo de Projeto  : ' + (ctx.type     || '—'));
    lines.push('  Template         : ' + (ctx.template || '—'));
    lines.push('  Stack            : ' + (ctx.stack    || '—'));
    lines.push('  Modo do Pacote   : ' + workerResultReceiptState.selectedMode.replace(/_/g, ' '));
    lines.push('');
    lines.push('── Checklist de Evidências ─────────────────────────────────────');
    wrr.required_evidence_fields.forEach(function (field) {
      var s   = workerResultReceiptState.evidenceStatus[field.id];
      var st  = s ? s.status : 'missing';
      var mk  = (s && s.foundMarker) ? ' ["' + s.foundMarker + '"]' : '';
      var sym = st === 'present' ? '[✓]' : (st === 'needs_review' ? '[◈]' : '[ ]');
      var lbl = st === 'present' ? 'PRESENT' : (st === 'needs_review' ? 'NEEDS REVIEW' : 'MISSING');
      lines.push('  ' + sym + ' ' + field.label + ' — ' + lbl + mk);
    });
    lines.push('');
    lines.push('── Estado de Autoridade ────────────────────────────────────────');
    lines.push('  real_execution_verified_by_frontend : false');
    lines.push('  pass_gold_real_claimed              : false');
    lines.push('  file_creation_allowed               : false');
    lines.push('  real_file_creation_enabled          : false');
    lines.push('  frontend_file_write_allowed         : false');
    lines.push('  backend_write_allowed               : false');
    lines.push('  command_execution_allowed           : false');
    lines.push('  deploy_allowed                      : false');
    lines.push('  release_allowed                     : false');
    lines.push('  tag_allowed                         : false');
    lines.push('  stable_promotion_allowed            : false');
    lines.push('  production_touched                  : false');
    lines.push('');
    lines.push('── Declaração de Não-Autoridade ────────────────────────────────');
    lines.push('  ' + wrr.non_authority_statement);
    lines.push('');
    lines.push('── Fronteira de Decisão Final ──────────────────────────────────');
    lines.push('  ' + wrr.final_decision_boundary);
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines.join('\n');
  }

  function renderWorkerEvidenceReceipt() {
    var receipt = buildWorkerEvidenceReceipt();
    workerResultReceiptState.generatedReceipt = receipt;
    var output = document.getElementById('vcResultReceiptOutput');
    if (output) {
      output.value     = receipt;
      output.className = 'vc-result-output' + (receipt ? '' : ' empty');
    }
    var lineEl = document.getElementById('vcResultLineCount');
    if (lineEl && receipt) { lineEl.textContent = receipt.split('\n').length; }
  }

  function copyWorkerEvidenceReceipt() {
    var text     = workerResultReceiptState.generatedReceipt;
    var statusEl = document.getElementById('vcResultCopyStatus');
    if (!text) {
      if (statusEl) {
        statusEl.textContent = '⚠ Gere o recibo primeiro.';
        statusEl.className   = 'vc-result-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-result-copy-status'; }, 2500);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className   = 'vc-result-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-result-copy-status'; }, 2500);
        }
      }).catch(function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className   = 'vc-result-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-result-copy-status'; }, 3000);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className   = 'vc-result-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-result-copy-status'; }, 3000);
      }
    }
  }

  function clearWorkerEvidenceReview() {
    workerResultReceiptState.reportText       = '';
    workerResultReceiptState.evidenceStatus   = {};
    workerResultReceiptState.generatedReceipt = '';

    var input = document.getElementById('vcWorkerReportInput');
    if (input) { input.value = ''; }

    var output = document.getElementById('vcResultReceiptOutput');
    if (output) {
      output.value     = 'Clique em ANALISAR TEXTO LOCAL e depois GERAR RECIBO DE EVIDÊNCIA.';
      output.className = 'vc-result-output empty';
    }

    var lineEl = document.getElementById('vcResultLineCount');
    if (lineEl) { lineEl.textContent = '0'; }

    var statusEl = document.getElementById('vcResultCopyStatus');
    if (statusEl) { statusEl.className = 'vc-result-copy-status'; }

    /* Reset evidence cards to empty */
    var wrr = getWorkerResultReceiptRegistry();
    if (wrr) {
      renderWorkerEvidenceChecklist();
      _updateEvidenceSummary(wrr);
    }

    var chip  = document.getElementById('vcEvidenceSummaryChip');
    var label = document.getElementById('vcEvidenceCountLabel');
    if (chip)  { chip.textContent  = 'AGUARDANDO ANÁLISE'; chip.className = 'vc-evidence-count-chip incomplete'; }
    if (label) { label.textContent = '0 / 13 campos'; }
  }

  function renderWorkerResultAuthorityPanel() {
    /* Authority panel is static HTML — all flags false, no dynamic state needed */
  }

  function initWorkerResultReceipt() {
    var wrr = getWorkerResultReceiptRegistry();
    if (!wrr) { return; }

    /* Build mode chips */
    var modeRow = document.getElementById('vcResultModeRow');
    if (modeRow) {
      wrr.review_modes.forEach(function (m) {
        var chip = document.createElement('button');
        chip.className = 'vc-result-mode-chip' + (m.id === workerResultReceiptState.selectedMode ? ' selected' : '');
        chip.setAttribute('data-result-mode', m.id);
        chip.type = 'button';
        chip.textContent = m.label;
        chip.addEventListener('click', function () { setWorkerResultReviewMode(m.id); });
        modeRow.appendChild(chip);
      });
    }

    /* Initial empty checklist render */
    renderWorkerEvidenceChecklist();

    /* Wire buttons */
    var analyzeBtn = document.getElementById('vcAnalyzeWorkerReportBtn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', function () {
        analyzeWorkerEvidenceText();
        analyzeBtn.textContent    = '✓ TEXTO ANALISADO';
        analyzeBtn.style.borderColor = 'rgba(34,197,94,.65)';
        analyzeBtn.style.color       = '#22c55e';
        setTimeout(function () {
          analyzeBtn.textContent       = '⬡ ANALISAR TEXTO LOCAL';
          analyzeBtn.style.borderColor = '';
          analyzeBtn.style.color       = '';
        }, 2000);
      });
    }

    var genBtn = document.getElementById('vcGenerateEvidenceReceiptBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        analyzeWorkerEvidenceText();
        renderWorkerEvidenceReceipt();
        var wrr2   = getWorkerResultReceiptRegistry();
        var total  = wrr2 ? wrr2.required_evidence_fields.length : 13;
        var pCount = Object.keys(workerResultReceiptState.evidenceStatus).filter(function (k) {
          return workerResultReceiptState.evidenceStatus[k].status === 'present';
        }).length;
        var allOk  = pCount === total;
        genBtn.textContent       = allOk ? '✓ RECIBO COMPLETO' : '✓ RECIBO GERADO — INCOMPLETO';
        genBtn.style.borderColor = allOk ? 'rgba(34,197,94,.65)' : 'rgba(251,146,60,.65)';
        genBtn.style.color       = allOk ? '#22c55e'             : '#fb923c';
      });
    }

    var copyBtn = document.getElementById('vcCopyEvidenceReceiptBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyWorkerEvidenceReceipt); }

    var clearBtn = document.getElementById('vcClearEvidenceReviewBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearWorkerEvidenceReview();
        if (analyzeBtn) {
          analyzeBtn.textContent       = '⬡ ANALISAR TEXTO LOCAL';
          analyzeBtn.style.borderColor = '';
          analyzeBtn.style.color       = '';
        }
        if (genBtn) {
          genBtn.textContent       = '⊡ GERAR RECIBO DE EVIDÊNCIA';
          genBtn.style.borderColor = '';
          genBtn.style.color       = '';
        }
      });
    }
  }

  /* ── Final Product Dashboard — local UI only ──────────────────── */
  /* No exec. No file read/write. No download. No API. No claims.  */

  var finalProductDashboardState = {
    selectedDecision: 'review_frontend_flow',
    generatedReport:  ''
  };

  function getFinalProductDashboardRegistry() {
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    return (pb && pb.final_product_dashboard) ? pb.final_product_dashboard : null;
  }

  function setFinalOperatorDecision(decisionId) {
    finalProductDashboardState.selectedDecision = decisionId;
    var row = document.getElementById('vcFinalDecisionRow');
    if (row) {
      Array.prototype.forEach.call(row.querySelectorAll('.vc-final-decision-chip'), function (c) {
        c.className = 'vc-final-decision-chip' + (c.getAttribute('data-decision') === decisionId ? ' selected' : '');
      });
    }
    /* Update context card */
    var decisionEl = document.getElementById('vcFinalCtxDecision');
    if (decisionEl) {
      var fpd = getFinalProductDashboardRegistry();
      if (fpd) {
        var opt = fpd.decision_options.filter(function (d) { return d.id === decisionId; })[0];
        if (opt) { decisionEl.textContent = opt.label; }
      }
    }
  }

  function getFinalProductContext() {
    var type         = (typeof pbState !== 'undefined' && pbState.selectedType)  ? pbState.selectedType  : '—';
    var stack        = (typeof pbState !== 'undefined' && pbState.selectedStack) ? pbState.selectedStack : '—';
    var size         = (typeof pbState !== 'undefined' && pbState.selectedSize)  ? pbState.selectedSize  : '—';
    var tpl          = (typeof pbTemplateState !== 'undefined' && pbTemplateState.selectedTemplate) ? pbTemplateState.selectedTemplate : '—';
    var agents       = (typeof pbState !== 'undefined' && Array.isArray(pbState.activeAgents)) ? pbState.activeAgents.length : 0;
    var workerTarget = (typeof realFileCommandState !== 'undefined') ? realFileCommandState.selectedWorker   : '—';
    var pkgMode      = (typeof realFileCommandState !== 'undefined') ? realFileCommandState.selectedMode.replace(/_/g, ' ') : '—';
    var fpd          = getFinalProductDashboardRegistry();
    var decisionOpt  = fpd ? fpd.decision_options.filter(function (d) { return d.id === finalProductDashboardState.selectedDecision; })[0] : null;
    var decision     = decisionOpt ? decisionOpt.label : finalProductDashboardState.selectedDecision;
    return { type: type, template: tpl, stack: stack, size: size, agents: agents, workerTarget: workerTarget, pkgMode: pkgMode, decision: decision };
  }

  function getFinalArtifactReadiness() {
    var tpl              = (typeof pbTemplateState !== 'undefined' && pbTemplateState.selectedTemplate);
    var missionReady     = (typeof mcState !== 'undefined' && !!mcState.generatedPrompt);
    var handoffReady     = (typeof handoffState !== 'undefined' && !!handoffState.generatedPackage);
    var exportReady      = (typeof exportPreviewState !== 'undefined' && !!exportPreviewState.generatedPreview);
    var approvalReady    = (typeof humanApprovalState !== 'undefined' && !!humanApprovalState.generatedReceipt);
    var cmdPkgReady      = (typeof realFileCommandState !== 'undefined' && !!realFileCommandState.generatedPackage);
    var workerRcptReady  = (typeof workerResultReceiptState !== 'undefined' && !!workerResultReceiptState.generatedReceipt);
    var evidenceHasData  = (typeof workerResultReceiptState !== 'undefined' && Object.keys(workerResultReceiptState.evidenceStatus).length > 0);
    var evidenceHasMiss  = evidenceHasData && Object.keys(workerResultReceiptState.evidenceStatus).some(function (k) {
      var s = workerResultReceiptState.evidenceStatus[k].status;
      return s === 'missing' || s === 'needs_review';
    });
    var evidenceStatus   = !evidenceHasData ? 'waiting' : (evidenceHasMiss ? 'review' : 'ready');

    return [
      { id: 'template_selected',     label: 'Template Selected',              status: tpl         ? 'ready' : 'waiting' },
      { id: 'mission_generated',     label: 'Mission Prompt Generated',       status: missionReady ? 'ready' : 'waiting' },
      { id: 'handoff_generated',     label: 'Handoff Package Generated',      status: handoffReady ? 'ready' : 'waiting' },
      { id: 'export_generated',      label: 'Export Preview Generated',       status: exportReady  ? 'ready' : 'waiting' },
      { id: 'approval_generated',    label: 'Human Approval Receipt Generated',status: approvalReady? 'ready' : 'waiting' },
      { id: 'cmdpkg_generated',      label: 'Real File Command Package',      status: cmdPkgReady  ? 'ready' : 'waiting' },
      { id: 'worker_rcpt_generated', label: 'Worker Result Receipt Generated',status: workerRcptReady? 'ready' : 'waiting' },
      { id: 'evidence_reviewed',     label: 'Evidence Checklist Reviewed',    status: evidenceStatus }
    ];
  }

  function renderFinalProductTimeline() {
    var fpd = getFinalProductDashboardRegistry();
    var container = document.getElementById('vcFinalTimeline');
    if (!fpd || !container) { return; }
    container.innerHTML = '';
    fpd.chain_sections.forEach(function (sec, idx) {
      var item = document.createElement('div');
      item.className = 'vc-final-timeline-item ready';

      var dot = document.createElement('div');
      dot.className = 'vc-final-timeline-dot';

      var num = document.createElement('span');
      num.style.cssText = 'font-size:9px;font-weight:800;color:#4b5563;flex-shrink:0;width:18px;';
      num.textContent = (idx + 1) + '.';

      var lbl = document.createElement('span');
      lbl.className   = 'vc-final-timeline-label';
      lbl.textContent = sec.label;

      var tags = document.createElement('div');
      tags.className = 'vc-final-timeline-tags';

      var localTag = document.createElement('span');
      localTag.className   = 'vc-final-tag local';
      localTag.textContent = 'LOCAL ONLY';

      tags.appendChild(localTag);

      /* Add LOCKED AUTHORITY tag for execution-sensitive stages */
      if (['human_approval_gate', 'real_file_command_package', 'worker_result_receipt'].indexOf(sec.id) !== -1) {
        var lockedTag = document.createElement('span');
        lockedTag.className   = 'vc-final-tag locked';
        lockedTag.textContent = 'LOCKED AUTH';
        tags.appendChild(lockedTag);
      }

      item.appendChild(dot);
      item.appendChild(num);
      item.appendChild(lbl);
      item.appendChild(tags);
      container.appendChild(item);
    });
  }

  function renderFinalProductContext() {
    var ctx = getFinalProductContext();
    var map = {
      vcFinalCtxType:        ctx.type,
      vcFinalCtxTemplate:    ctx.template,
      vcFinalCtxStack:       ctx.stack,
      vcFinalCtxSize:        ctx.size,
      vcFinalCtxAgents:      ctx.agents + ' agente(s)',
      vcFinalCtxWorker:      ctx.workerTarget,
      vcFinalCtxPackageMode: ctx.pkgMode,
      vcFinalCtxDecision:    ctx.decision
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.textContent = map[id]; }
    });
  }

  function renderFinalArtifactReadiness() {
    var items     = getFinalArtifactReadiness();
    var container = document.getElementById('vcFinalReadinessGrid');
    if (!container) { return; }
    container.innerHTML = '';
    items.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'vc-final-readiness-card ' + item.status;

      var iconMap  = { ready: '✓', waiting: '○', review: '◈' };
      var icon = document.createElement('span');
      icon.className   = 'vc-final-readiness-icon';
      icon.textContent = iconMap[item.status] || '—';

      var text = document.createElement('div');
      text.className = 'vc-final-readiness-text';

      var name = document.createElement('div');
      name.className   = 'vc-final-readiness-name';
      name.textContent = item.label;

      var statusLabelMap = { ready: 'READY', waiting: 'WAITING', review: 'REVIEW NEEDED' };
      var statusEl = document.createElement('div');
      statusEl.className   = 'vc-final-readiness-status';
      statusEl.textContent = statusLabelMap[item.status] || item.status.toUpperCase();

      text.appendChild(name);
      text.appendChild(statusEl);
      card.appendChild(icon);
      card.appendChild(text);
      container.appendChild(card);
    });
  }

  function renderFinalAuthorityMatrix() {
    /* Authority matrix is static HTML — all flags false, no dynamic state */
  }

  function renderFinalOperatorDecisions() {
    var fpd = getFinalProductDashboardRegistry();
    var row = document.getElementById('vcFinalDecisionRow');
    if (!fpd || !row) { return; }
    row.innerHTML = '';
    fpd.decision_options.forEach(function (opt) {
      var chip = document.createElement('button');
      chip.className = 'vc-final-decision-chip' + (opt.id === finalProductDashboardState.selectedDecision ? ' selected' : '');
      chip.setAttribute('data-decision', opt.id);
      chip.type = 'button';
      chip.textContent = opt.label;
      chip.addEventListener('click', function () { setFinalOperatorDecision(opt.id); });
      row.appendChild(chip);
    });
  }

  function buildFinalProductReport() {
    var fpd = getFinalProductDashboardRegistry();
    if (!fpd) { return ''; }
    var ctx       = getFinalProductContext();
    var readiness = getFinalArtifactReadiness();
    var decisionOpt = fpd.decision_options.filter(function (d) {
      return d.id === finalProductDashboardState.selectedDecision;
    })[0];
    var decision = decisionOpt ? decisionOpt.label : finalProductDashboardState.selectedDecision;

    var lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('   VISION CORE — RELATÓRIO FINAL DO PRODUTO FRONTEND');
    lines.push('   FRONT-PRODUCT-9 | Operator Decision Dashboard');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('── Cadeia de Produtos Frontend ─────────────────────────────────');
    fpd.chain_sections.forEach(function (sec, idx) {
      lines.push('  ' + (idx + 1) + '. ' + sec.label + ' [LOCAL ONLY]');
    });
    lines.push('');
    lines.push('── Contexto do Projeto ─────────────────────────────────────────');
    lines.push('  Tipo de Projeto  : ' + ctx.type);
    lines.push('  Template         : ' + ctx.template);
    lines.push('  Stack            : ' + ctx.stack);
    lines.push('  Tamanho/Risco    : ' + ctx.size);
    lines.push('  Agentes Ativos   : ' + ctx.agents);
    lines.push('  Worker Target    : ' + ctx.workerTarget);
    lines.push('  Modo do Pacote   : ' + ctx.pkgMode);
    lines.push('');
    lines.push('── Prontidão dos Artefatos ─────────────────────────────────────');
    readiness.forEach(function (item) {
      var symMap = { ready: '[✓]', waiting: '[ ]', review: '[◈]' };
      var lblMap = { ready: 'READY', waiting: 'WAITING', review: 'REVIEW NEEDED' };
      lines.push('  ' + (symMap[item.status] || '[ ]') + ' ' + item.label + ' — ' + (lblMap[item.status] || item.status.toUpperCase()));
    });
    lines.push('');
    lines.push('── Decisão do Operador ─────────────────────────────────────────');
    lines.push('  [✓] ' + decision);
    lines.push('');
    lines.push('── Estado de Autoridade Bloqueada ──────────────────────────────');
    fpd.locked_authority_state.forEach(function (item) {
      lines.push('  ⊗ ' + item.label + ': ' + item.value);
    });
    lines.push('');
    lines.push('── Status de Segurança ─────────────────────────────────────────');
    lines.push('  real_execution_verified_by_frontend : false');
    lines.push('  pass_gold_real_claimed              : false');
    lines.push('  file_creation_allowed               : false');
    lines.push('  real_file_creation_enabled          : false');
    lines.push('  frontend_file_write_allowed         : false');
    lines.push('  backend_write_allowed               : false');
    lines.push('  command_execution_allowed           : false');
    lines.push('  deploy_allowed                      : false');
    lines.push('  release_allowed                     : false');
    lines.push('  tag_allowed                         : false');
    lines.push('  stable_promotion_allowed            : false');
    lines.push('  production_touched                  : false');
    lines.push('');
    lines.push('── Declaração de Não-Autoridade ────────────────────────────────');
    lines.push('  ' + fpd.non_authority_statement);
    lines.push('');
    lines.push('── Fronteira do Próximo Phase ──────────────────────────────────');
    lines.push('  ' + fpd.next_phase_boundary);
    lines.push('');
    lines.push('── Nota Final ──────────────────────────────────────────────────');
    lines.push('  Este relatório é local apenas. Resume o estado de planejamento');
    lines.push('  do frontend e não realiza nem verifica execução real.');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines.join('\n');
  }

  function renderFinalProductReport() {
    renderFinalProductContext();
    renderFinalArtifactReadiness();
    var report = buildFinalProductReport();
    finalProductDashboardState.generatedReport = report;
    var output = document.getElementById('vcFinalReportOutput');
    if (output) {
      output.value     = report;
      output.className = 'vc-final-output' + (report ? '' : ' empty');
    }
    var lineEl = document.getElementById('vcFinalReportLineCount');
    if (lineEl && report) { lineEl.textContent = report.split('\n').length; }
  }

  function copyFinalProductReport() {
    var text     = finalProductDashboardState.generatedReport;
    var statusEl = document.getElementById('vcFinalCopyStatus');
    if (!text) {
      if (statusEl) {
        statusEl.textContent = '⚠ Gere o relatório primeiro.';
        statusEl.className   = 'vc-final-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-final-copy-status'; }, 2500);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className   = 'vc-final-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-final-copy-status'; }, 2500);
        }
      }).catch(function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className   = 'vc-final-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-final-copy-status'; }, 3000);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className   = 'vc-final-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-final-copy-status'; }, 3000);
      }
    }
  }

  function clearFinalProductReport() {
    finalProductDashboardState.generatedReport = '';
    var output = document.getElementById('vcFinalReportOutput');
    if (output) {
      output.value     = 'Clique em GERAR RELATÓRIO FINAL para gerar o relatório.';
      output.className = 'vc-final-output empty';
    }
    var lineEl = document.getElementById('vcFinalReportLineCount');
    if (lineEl) { lineEl.textContent = '0'; }
    var statusEl = document.getElementById('vcFinalCopyStatus');
    if (statusEl) { statusEl.className = 'vc-final-copy-status'; }
  }

  function initFinalProductDashboard() {
    var fpd = getFinalProductDashboardRegistry();
    if (!fpd) { return; }

    renderFinalProductTimeline();
    renderFinalProductContext();
    renderFinalArtifactReadiness();
    renderFinalOperatorDecisions();

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateFinalReportBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderFinalProductReport();
        genBtn.textContent       = '✓ RELATÓRIO GERADO';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color       = '#22c55e';
      });
    }

    var copyBtn = document.getElementById('vcCopyFinalReportBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyFinalProductReport); }

    var clearBtn = document.getElementById('vcClearFinalReportBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearFinalProductReport();
        if (genBtn) {
          genBtn.textContent       = '⬡ GERAR RELATÓRIO FINAL';
          genBtn.style.borderColor = '';
          genBtn.style.color       = '';
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SOFTWARE FACTORY BUILDER PAGE
  // Local in-memory view switching. No backend. No API. No exec.
  // ─────────────────────────────────────────────────────────────

  // New order aligned with SDDF timeline and horizontal menu
  var SF_MODULES = [
    { id: 'project_builder',  num: '01', name: 'MONTAR PROJETO DO ZERO',           sddf: 'Descoberta & Planejamento',    next: 'Selecione tipo de projeto, stack e modo de orquestração.' },
    { id: 'export_preview',   num: '02', name: 'PREVIEW DE CRIAÇÃO DO PROJETO',    sddf: 'Modelagem & Template',         next: 'Revise a lista de arquivos que seriam criados. Nenhum arquivo é escrito.' },
    { id: 'project_templates',num: '03', name: 'TEMPLATES DE PROJETO',             sddf: 'Composição da Missão',         next: 'Escolha um template base com stack e estrutura pré-configurada.' },
    { id: 'mission_composer', num: '04', name: 'COMPOSITOR DE MISSÃO',             sddf: 'Preview & Verificação',        next: 'Componha o pacote de instrução e copie para o agente externo.' },
    { id: 'worker_handoff',   num: '05', name: 'PACOTES PARA WORKERS',             sddf: 'Pacotes para Workers',         next: 'Gere pacote completo de entrega para o worker externo executar.' },
    { id: 'real_file_command',num: '06', name: 'COMANDO PARA CRIAÇÃO REAL',        sddf: 'Comando para Criação Real',    next: 'Revisão do pacote de comando. Execução real bloqueada.' },
    { id: 'worker_receipt',   num: '07', name: 'RECIBO DO WORKER EXTERNO',         sddf: 'Execução & Recibo',            next: 'Cole o resultado do worker externo para análise local.' },
    { id: 'saas_api',         num: '08', name: 'SAAS & API CONNECTORS ROADMAP',    sddf: 'Validação & Entrega',          next: 'Controles SaaS/API bloqueados. Ativação requer autorização explícita.' },
    { id: 'final_dashboard',  num: '09', name: 'PAINEL FINAL DO PRODUTO',          sddf: 'Roadmap & Conectores',         next: 'Gere o relatório final de produto e revise toda a cadeia.' }
  ];

  var _sfActiveModule  = 'project_builder';
  var _sfHomeVisible   = true;   // true = LLM home shown; false = module workspace shown

  // Maps module IDs to the original #projectBuilder section IDs
  var SF_MODULE_SECTION_MAP = {
    project_builder:   'projectBuilder',
    export_preview:    'vcExportPreview',
    project_templates: 'vcTemplatePacks',
    mission_composer:  'vcMissionComposer',
    worker_handoff:    'vcWorkerHandoff',
    real_file_command: 'vcRealFileCommandPackage',
    worker_receipt:    'vcWorkerResultReceipt',
    saas_api:          'vcSaasApiRoadmap',
    final_dashboard:   'vcFinalProductDashboard'
  };

  // Show home view — HOME is exclusive; workspace completely hidden
  function _sfShowHome() {
    _sfHomeVisible = true;
    var homeCtrl  = document.getElementById('vcSfHomeControl');
    var workspace = document.getElementById('vcSfModuleWorkspace');
    if (homeCtrl)  { homeCtrl.style.display = 'flex'; }
    if (workspace) { workspace.style.display = 'none'; }
    var homeBtn = document.getElementById('vcSfHomeBtn');
    if (homeBtn) { homeBtn.classList.add('active'); }
    // Clear active from all module tabs
    document.querySelectorAll('.vc-sf-module-btn').forEach(function (b) {
      if (b !== homeBtn) { b.classList.remove('active'); }
    });
  }

  // Show module workspace — HOME completely hidden, workspace fills center
  function _sfShowWorkspace() {
    _sfHomeVisible = false;
    var homeCtrl  = document.getElementById('vcSfHomeControl');
    var workspace = document.getElementById('vcSfModuleWorkspace');
    if (homeCtrl)  { homeCtrl.style.display = 'none'; }
    if (workspace) { workspace.style.display = 'flex'; }
    var homeBtn = document.getElementById('vcSfHomeBtn');
    if (homeBtn) { homeBtn.classList.remove('active'); }
  }

  function showMainCockpitPage() {
    var sfPage  = document.getElementById('vcSoftwareFactoryPage');
    var cockpit = document.getElementById('vcCockpitView');
    if (sfPage)  { sfPage.style.display  = 'none';  sfPage.setAttribute('aria-hidden', 'true'); }
    if (cockpit) { cockpit.style.display = '';       cockpit.removeAttribute('aria-hidden'); }
  }

  function showSoftwareFactoryPage() {
    var sfPage  = document.getElementById('vcSoftwareFactoryPage');
    var cockpit = document.getElementById('vcCockpitView');
    if (cockpit) { cockpit.style.display = 'none'; cockpit.setAttribute('aria-hidden', 'true'); }
    if (sfPage)  {
      sfPage.style.display = 'flex';
      sfPage.removeAttribute('aria-hidden');
      // Move original #projectBuilder into SF page mount (idempotent)
      var mount = document.getElementById('vcSfOriginalProjectBuilderMount');
      var pb    = document.getElementById('projectBuilder');
      if (mount && pb && !mount.contains(pb)) {
        mount.appendChild(pb);
      }
      // Always reset to home view on every open
      _sfShowHome();
      renderSoftwareFactoryTimelineState(_sfActiveModule);
    }
  }

  function setSoftwareFactoryModule(moduleId) {
    _sfActiveModule = moduleId;

    // Open module workspace if user is still on home
    if (_sfHomeVisible) {
      _sfShowWorkspace();
    }

    // Update module nav buttons
    var btns = document.querySelectorAll('.vc-sf-module-btn');
    btns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.sfModule === moduleId);
    });

    // Scroll to corresponding section in original #projectBuilder
    var sectionId = SF_MODULE_SECTION_MAP[moduleId] || 'projectBuilder';
    var target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Update SDDF timeline
    renderSoftwareFactoryTimelineState(moduleId);

    // Find module metadata
    var mod = SF_MODULES.find(function (m) { return m.id === moduleId; });
    if (!mod) return;

    // Update next action
    var nextEl = document.getElementById('vcSfNextActionText');
    if (nextEl) { nextEl.textContent = mod.next; }

    // Update left summary: active module number
    var summaryModule = document.getElementById('vcSfSummaryModule');
    if (summaryModule) { summaryModule.textContent = mod.num; }

    // Update progress bar
    var modIdx = SF_MODULES.findIndex(function (m) { return m.id === moduleId; });
    var pct = Math.round(((modIdx + 1) / SF_MODULES.length) * 100);
    var fill = document.getElementById('vcSfProgressFill');
    if (fill) { fill.style.width = pct + '%'; }
    var progressLabel = document.getElementById('vcSfProgressLabel');
    if (progressLabel) { progressLabel.textContent = (modIdx + 1) + ' / ' + SF_MODULES.length; }

    // Add activity entry
    var feed = document.getElementById('vcSfActivityFeed');
    if (feed) {
      var item = document.createElement('div');
      item.className = 'vc-sf-activity-item';
      item.innerHTML = '<span>Módulo ' + mod.num + ' selecionado</span>';
      feed.insertBefore(item, feed.firstChild);
      // Keep feed to 8 entries
      while (feed.children.length > 8) { feed.removeChild(feed.lastChild); }
    }
  }

  function renderSoftwareFactoryTimelineState(activeModuleId) {
    var container = document.getElementById('vcSfSddfSteps');
    if (!container) return;
    var steps = container.querySelectorAll('.vc-sf-sddf-step');
    var connectors = container.querySelectorAll('.vc-sf-sddf-connector');
    var activeIdx = SF_MODULES.findIndex(function (m) { return m.id === activeModuleId; });

    steps.forEach(function (step, idx) {
      step.classList.remove('active', 'done');
      if (idx < activeIdx)      step.classList.add('done');
      else if (idx === activeIdx) step.classList.add('active');
    });

    // Color connectors between done steps
    connectors.forEach(function (c, idx) {
      c.classList.toggle('done', idx < activeIdx);
    });
  }

  function _sfChatSend(inputId, streamId) {
    var input  = document.getElementById(inputId);
    var stream = document.getElementById(streamId);
    if (!input || !stream) return;
    var text = (input.value || '').trim();
    if (!text) return;
    input.value = '';

    // Remove hint if present
    var hint = stream.querySelector('.vc-sf-chat-hint');
    if (hint) hint.remove();

    // User message
    var uMsg = document.createElement('div');
    uMsg.className = 'vc-sf-chat-msg user';
    uMsg.textContent = text;
    stream.appendChild(uMsg);
    stream.scrollTop = stream.scrollHeight;

    // Call backend
    var thinking = document.createElement('div');
    thinking.className = 'vc-sf-chat-msg';
    thinking.textContent = '▪ processando...';
    stream.appendChild(thinking);
    stream.scrollTop = stream.scrollHeight;

    fetch(BACKEND_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, mode: 'vision-geral' })
    })
    .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function(data) {
      thinking.textContent = (data && data.answer) ? data.answer : JSON.stringify(data);
      stream.scrollTop = stream.scrollHeight;
    })
    .catch(function(err) {
      thinking.textContent = '[Erro: ' + err + '. Worker: ' + BACKEND_URL + ']';
      stream.scrollTop = stream.scrollHeight;
    });
  }

  /* ── Main VISION AI COMMAND chat ────────────────────────────── */
  var _chatInitialized = false;
  function initMainChat() {
    if (_chatInitialized) return;
    var chatStream  = document.getElementById('v298ChatStream');
    var promptInput = document.getElementById('v298Prompt');
    var sendBtn     = document.getElementById('v298SendBtn');
    var runBtn      = document.getElementById('v298RunBtn');
    var clearBtn    = document.getElementById('v298ClearBtn');
    var statusEl    = document.getElementById('v298CommandStatus');
    var modeSelect  = document.getElementById('v298Mode');
    var modelSelect = document.getElementById('v298Model');

    if (!chatStream || !promptInput || !sendBtn) return;
    _chatInitialized = true;

    /* §38 — inject animation keyframes once */
    if (!document.getElementById('vc-anim-styles')) {
      var _animStyle = document.createElement('style');
      _animStyle.id = 'vc-anim-styles';
      _animStyle.textContent = [
        '@keyframes vcPulse {',
        '  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(139,92,246,.4); }',
        '  50% { opacity: .85; box-shadow: 0 0 0 6px rgba(139,92,246,0); }',
        '}',
        '@keyframes vcSpin {',
        '  to { transform: rotate(360deg); }',
        '}'
      ].join('\n');
      document.head.appendChild(_animStyle);
    }

    function setStatus(text, extra) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.style.color = extra === 'busy' ? '#fbbf24' : extra === 'error' ? '#f87171' : '';
    }

    function appendMsg(text, cls) {
      var hint = chatStream.querySelector('.v298-empty-hint');
      if (hint) hint.remove();
      var el = document.createElement('div');
      el.className = 'v298-chat-msg' + (cls ? ' ' + cls : '');
      el.style.cssText = cls === 'user'
        ? 'padding:8px 12px;margin:4px 0;background:rgba(124,58,237,0.18);border-radius:8px;text-align:right;'
        : cls === 'thinking'
        ? 'padding:8px 12px;margin:4px 0;color:#94a3b8;font-style:italic;'
        : cls === 'error'
        ? 'padding:8px 12px;margin:4px 0;color:#f87171;'
        : 'padding:8px 12px;margin:4px 0;background:rgba(255,255,255,0.05);border-radius:8px;white-space:pre-wrap;';
      el.textContent = text;
      chatStream.appendChild(el);
      chatStream.scrollTop = chatStream.scrollHeight;
      return el;
    }

    /* Attachment state — shared by sendMessage + file button handlers */
    var _attachedFiles = [];
    var _attachedImg   = null;
    var _pendingZip    = null; /* { file: File, buffer: ArrayBuffer } — staged ZIP, fires on ENVIAR */
    var _lastZipB64    = null; /* base64 do último ZIP processado — usado pelo apply-patch endpoint */
    /* §36 — estado da missão SDDF ativa */
    var _activeMission = null;
    /* estrutura: { id, hermesObj, input, stage, evidence[], zipB64, startedAt } */

    /* ── Session History — contexto multi-turn ──────────────── */
    var _sessionHistory = [];       // { role: 'user'|'assistant', content: string }[]
    var SESSION_HISTORY_MAX = 6;    // máx 6 items = 3 pares user/assistant

    function updateContextBadge() {
      var badge = document.getElementById('v298ContextBadge');
      if (!badge) return;
      var pairs = Math.floor(_sessionHistory.length / 2);
      if (pairs > 0) {
        badge.textContent = '🧠 ' + pairs + ' turn' + (pairs > 1 ? 's' : '') + ' em contexto';
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }

    function addToHistory(role, content) {
      _sessionHistory.push({ role: role, content: String(content).slice(0, 2000) });
      if (_sessionHistory.length > SESSION_HISTORY_MAX) {
        _sessionHistory.splice(0, 2); // remove par mais antigo
      }
      updateContextBadge();
    }

    function getHistoryPrefix() {
      if (!_sessionHistory.length) return '';
      return _sessionHistory.map(function(h) {
        return '[' + (h.role === 'user' ? 'USUÁRIO' : 'ASSISTENTE') + ']: ' + h.content;
      }).join('\n') + '\n\n---\n\n';
    }

    function clearHistory() { _sessionHistory = []; updateContextBadge(); }

    var addFilesBtn  = document.getElementById('v298AddFilesBtn');
    var fileInput    = document.getElementById('v298FileInput');
    var fileNote     = document.getElementById('v298FileNote');
    var readPrintBtn = document.getElementById('v298ReadPrintBtn');

    /* ── Typewriter effect ──────────────────────────────────── */
    function typewriterEffect(el, text, speed) {
      el.textContent = '';
      var i = 0;
      var chunk = 3;
      function tick() {
        if (i < text.length) {
          el.textContent += text.slice(i, i + chunk);
          i += chunk;
          if (chatStream) chatStream.scrollTop = chatStream.scrollHeight;
          setTimeout(tick, speed || 12);
        }
      }
      tick();
    }

    /* ── §21 Fetch Transparency Badge ───────────────────────── */
    function renderFetchBadge(data, container) {
      var count = (data && typeof data.fetched_count === 'number') ? data.fetched_count : -1;
      var urls  = (data && Array.isArray(data.fetched_urls)) ? data.fetched_urls : [];
      if (count < 0) return; // backend pré-§20 — silencioso
      var badge = document.createElement('div');
      var ok    = count > 0;
      var color = ok ? '#22c55e' : '#f87171';
      var icon  = ok ? '🔗' : '⚠️';
      var label = ok
        ? icon + ' ' + count + ' fonte' + (count > 1 ? 's' : '') + ' obtida' + (count > 1 ? 's' : '')
        : icon + ' Nenhuma fonte obtida — resposta sem conteúdo real';
      badge.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'gap:6px',
        'background:' + (ok ? 'rgba(34,197,94,.08)' : 'rgba(248,113,113,.08)'),
        'border:1px solid ' + color + '33',
        'border-radius:6px',
        'padding:3px 9px',
        'font-size:11px',
        'color:' + color,
        'margin:6px 0 2px 0',
        'cursor:' + (urls.length ? 'pointer' : 'default')
      ].join(';');
      badge.textContent = label;
      if (urls.length) {
        var tip = document.createElement('span');
        tip.style.cssText = 'color:#64748b;font-size:10px;margin-left:4px;';
        tip.textContent = '(' + urls.map(function(u) {
          try { return new URL(u).hostname; } catch(e) { return u.slice(0, 30); }
        }).join(', ') + ')';
        badge.appendChild(tip);
        badge.title = urls.join('\n');
      }
      container.appendChild(badge);
    }

    /* ── Hermes JSON Block Parser ────────────────────────────── */
    function parseHermesBlock(text) {
      var match = text.match(/```json\s*([\s\S]*?)```/);
      if (!match) return null;
      try {
        var obj = JSON.parse(match[1].trim());
        if (obj.fix_type || obj.decisao || obj.diagnosis || obj.decision) return obj;
      } catch(e) {}
      return null;
    }

    function renderHermesBlock(obj, container) {
      var decisao = (obj.decisao || obj.decision || 'UNKNOWN').toUpperCase();
      var colorMap = { 'NEEDS_FIX': '#fbbf24', 'READY': '#22c55e', 'BLOCKED_INPUT': '#f97316', 'ABORTED': '#f87171' };
      var color = colorMap[decisao] || '#a1a1aa';
      var panel = document.createElement('div');
      panel.style.cssText = 'background:rgba(15,15,25,.7);border:1px solid ' + color + '55;border-radius:10px;padding:14px 16px;margin:8px 0;font-size:13px;';
      var parts = [
        '<div style="color:' + color + ';font-weight:700;font-size:14px;margin-bottom:8px;">🔍 HERMES DIAGNÓSTICO</div>',
        '<div style="color:#e2e8f0;margin-bottom:4px;"><b>Decisão:</b> <span style="color:' + color + '">' + decisao + '</span></div>',
        obj.file       ? '<div style="color:#94a3b8;margin-bottom:4px;"><b>Arquivo:</b> ' + obj.file + '</div>' : '',
        obj.fix_type   ? '<div style="color:#94a3b8;margin-bottom:4px;"><b>Fix type:</b> ' + obj.fix_type + '</div>' : '',
        obj.confidence ? '<div style="color:#94a3b8;margin-bottom:4px;"><b>Confiança:</b> ' + (Number(obj.confidence) * 100).toFixed(0) + '%</div>' : '',
        obj.diagnosis  ? '<div style="color:#cbd5e1;margin-top:8px;padding-top:8px;border-top:1px solid #ffffff18;">' + String(obj.diagnosis).replace(/</g,'&lt;') + '</div>' : ''
      ];
      if (obj.patch && typeof obj.patch === 'object' && Object.keys(obj.patch).length) {
        parts.push('<details style="margin-top:8px;"><summary style="color:#60a5fa;cursor:pointer;">Ver patch</summary><pre style="background:#0a0a12;padding:8px;border-radius:6px;overflow:auto;font-size:11px;margin-top:4px;color:#a5f3fc;">' + JSON.stringify(obj.patch, null, 2).replace(/</g,'&lt;') + '</pre></details>');
      }
      panel.innerHTML = parts.join('');
      container.appendChild(panel);
    }

    function sendMessage() {
      var text = (promptInput.value || '').trim();
      /* Prepend attached text files */
      if (_attachedFiles.length) {
        var fileCtx = _attachedFiles.map(function (f) {
          return '[Arquivo: ' + f.name + ']\n' + f.content.slice(0, 12000);
        }).join('\n---\n');
        text = fileCtx + (text ? '\n\n' + text : '');
        _attachedFiles = [];
        if (fileNote)    { fileNote.textContent = 'Nenhum arquivo anexado.'; }
        if (addFilesBtn) { addFilesBtn.textContent = '＋ Adicionar arquivos'; }
      }
      /* §redesign: ZIP staged — fires here with question captured at send time */
      if (_pendingZip) {
        var _pz = _pendingZip; _pendingZip = null;
        if (fileNote)    { fileNote.textContent    = 'Nenhum arquivo anexado.'; }
        if (addFilesBtn) { addFilesBtn.textContent = '＋ Adicionar arquivos'; }
        var _zipQuestion = text || 'Analise o projeto e identifique problemas';
        promptInput.value = '';
        var _zipMode  = modeSelect  ? modeSelect.value  : 'fix';
        var _zipModel = modelSelect ? modelSelect.value : 'auto';
        /* §32 — limpar imagem anexada para não vazar no próximo ENVIAR */
        _attachedImg = null;
        if (readPrintBtn) { readPrintBtn.textContent = '▧ Ler print/imagem'; }
        /* §35 FIX1 — mostrar mensagem do usuário no chat antes de processar o ZIP */
        if (text) {
          var _zipDisplay = text.slice(0, 300) + (text.length > 300 ? '…' : '');
          appendMsg('📦 ' + _pz.file.name + ' — ' + _zipDisplay, 'user');
        }
        _processZipBuffer(_pz.file, _pz.buffer, _zipQuestion, _zipMode, _zipModel);
        return;
      }
      if (!text && !_attachedImg) return;
      promptInput.value = '';
      var display = text.slice(0, 300) + (text.length > 300 ? '…' : '');
      if (_attachedImg) { display += '\n[Imagem: ' + _attachedImg.name + ']'; }
      appendMsg(display, 'user');
      addToHistory('user', text || (_attachedImg ? '(análise de imagem: ' + _attachedImg.name + ')' : '(sem texto)'));

      var mode  = modeSelect  ? modeSelect.value  : 'vision-geral';
      var model = modelSelect ? modelSelect.value : 'auto';

      setStatus('PROCESSANDO...', 'busy');
      /* §38 — animated spinner */
      var thinking = appendMsg('', 'thinking');
      thinking.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #4f46e5;border-top-color:transparent;border-radius:50%;animation:vcSpin .7s linear infinite;vertical-align:middle;margin-right:8px;"></span>' +
        '<span class="vc-thinking-text">analisando...</span>';
      if (sendBtn) sendBtn.style.animation = 'vcPulse 1s ease-in-out infinite'; /* §38 pulse */
      activateAgent('scanner', 'active');
      var _chatAnimTimer = setTimeout(function() { activateAgent('hermes', 'active'); }, 1200);

      var imgName  = _attachedImg ? _attachedImg.name   : null;
      var imgB64   = _attachedImg ? _attachedImg.base64 : null;
      var imgMime  = _attachedImg ? _attachedImg.mime   : null;
      _attachedImg = null;
      var _histPrefix = getHistoryPrefix();
      var _msgWithCtx = _histPrefix + (text || '(análise de imagem: ' + imgName + ')');
      var payload  = { message: _msgWithCtx, mode: mode, model: model };
      if (imgName) { payload.image_name = imgName; }
      if (imgB64)  { payload.image_base64 = imgB64; payload.image_mime = imgMime || 'image/jpeg'; }

      fetch(BACKEND_URL + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function(data) {
        clearTimeout(_chatAnimTimer);
        thinking.remove();
        if (sendBtn) sendBtn.style.animation = ''; /* §38 */
        stopMissionAnimation({ ok: true, steps: [{ agent: 'Scanner', ok: true }, { agent: 'Hermes', ok: true }] });
        /* §27 echo guard */
        if (data && data.provider === 'local') {
          appendMsg('⚠️ Fallback local — todos os provedores de IA falharam. Reduza o payload ou verifique as API keys.', 'error');
        }
        var answer = (data && data.answer) ? data.answer : JSON.stringify(data);
        addToHistory('assistant', answer);
        renderFetchBadge(data, chatStream);          // §21
        var hermesObj = parseHermesBlock(answer);
        var msgEl = appendMsg('', '');
        if (hermesObj) {
          renderHermesBlock(hermesObj, chatStream);
          typewriterEffect(msgEl, answer.replace(/```json[\s\S]*?```/g, '[↑ diagnóstico estruturado acima]'), 10);
          /* §36 — salvar missão ativa para EXECUTAR MISSÃO */
          _activeMission = { id: 'mission-' + Date.now(), hermesObj: hermesObj, input: text, stage: 'diagnosed', evidence: [{ type: 'diagnosis', data: hermesObj, ts: Date.now() }], zipB64: _lastZipB64 || null, startedAt: Date.now() };
          /* §38 — hint pós-diagnóstico */
          (function() {
            var hintEl = document.createElement('div');
            hintEl.style.cssText = 'background:rgba(79,70,229,.08);border:1px solid rgba(99,102,241,.3);border-radius:10px;padding:10px 14px;margin:4px 0 8px;font-size:12px;color:#a5b4fc;display:flex;align-items:center;gap:8px;';
            hintEl.innerHTML = '<span style="font-size:16px;">🛡</span><span>Diagnóstico concluído. Clique em <b style="color:#c7d2fe">EXECUTAR MISSÃO</b> para aplicar o patch automaticamente via Vision Core Standard Method.</span>';
            chatStream.appendChild(hintEl);
            chatStream.scrollTop = chatStream.scrollHeight;
          }());
        } else {
          typewriterEffect(msgEl, answer, 10);
        }
        setStatus('READY');
      })
      .catch(function(err) {
        clearTimeout(_chatAnimTimer);
        thinking.remove();
        if (sendBtn) sendBtn.style.animation = ''; /* §38 */
        resetAllAgents();
        appendMsg('[Erro de conexão com worker: ' + BACKEND_URL + ' — ' + err + ']', 'error');
        setStatus('ERRO', 'error');
        setTimeout(function() { setStatus('READY'); }, 3000);
      });
    }

    sendBtn.addEventListener('click', sendMessage);

    promptInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    /* ── MISSION INPUT agent animation ─────────────────────────── */
    var AGENT_KEYS   = ['scanner','hermes','patchengine','aegis','gocore','passgold'];
    var AGENT_COLORS = { scanner:'#60a5fa', hermes:'#34d399', patchengine:'#c084fc', aegis:'#fbbf24', gocore:'#fbbf24', passgold:'#facc15' };
    var AGENT_ATXT   = { scanner:'SCAN...', hermes:'RCA...', patchengine:'PATCH...', aegis:'AEGIS...', gocore:'COMMIT...', passgold:'GOLD...' };
    var AGENT_DTXT   = { scanner:'✓ SCAN',  hermes:'✓ RCA',  patchengine:'✓ PATCH',  aegis:'✓ AEGIS',  gocore:'✓ COMMIT',  passgold:'★ GOLD' };
    var _agentAnimTimer = null;

    function activateAgent(key, state) {
      var el   = document.getElementById('v33-t-' + key);
      var node = document.querySelector('[data-key="' + key + '"]');
      if (!el) return;
      var color = AGENT_COLORS[key] || '#a1a1aa';
      /* Reset inline styles + prior state classes */
      if (node) {
        node.classList.remove('v33-idle','v33-running','v33-done','v33-fail');
        node.style.boxShadow   = '';
        node.style.borderColor = '';
        node.style.transition  = '';
      }
      if (state === 'active') {
        el.textContent     = AGENT_ATXT[key] || '...';
        el.style.color     = color;
        el.style.animation = 'agentBlink 0.6s ease-in-out infinite';
        if (node) { node.classList.add('v33-running'); }
      } else if (state === 'done') {
        el.textContent     = AGENT_DTXT[key] || '✓';
        el.style.color     = '#22c55e';
        el.style.animation = '';
        if (node) { node.classList.add('v33-done'); }
      } else if (state === 'error') {
        el.textContent     = '✕ ERRO';
        el.style.color     = '#f87171';
        el.style.animation = '';
        if (node) { node.classList.add('v33-fail'); }
      } else {
        el.textContent     = 'AGUARDA';
        el.style.color     = '';
        el.style.animation = '';
        if (node) { node.classList.add('v33-idle'); }
      }
    }

    function resetAllAgents() {
      AGENT_KEYS.forEach(function(k) { activateAgent(k, 'idle'); });
    }

    function startMissionAnimation() {
      if (_agentAnimTimer) { clearTimeout(_agentAnimTimer); _agentAnimTimer = null; }
      resetAllAgents();
      var seq = ['scanner','hermes','patchengine','aegis','gocore'];
      var i = 0;
      function tick() {
        if (i > 0) activateAgent(seq[i - 1], 'done');
        if (i >= seq.length) return;
        activateAgent(seq[i], 'active');
        i++;
        _agentAnimTimer = setTimeout(tick, 1500);
      }
      tick();
    }

    function stopMissionAnimation(result) {
      if (_agentAnimTimer) { clearTimeout(_agentAnimTimer); _agentAnimTimer = null; }
      var seq = ['scanner','hermes','patchengine','aegis','gocore'];
      if (!result) { resetAllAgents(); return; }
      var steps = (result && result.steps) || [];
      var stMap = {};
      steps.forEach(function(s) {
        var n = (s.agent || '').toLowerCase().replace(/\s+/g, '');
        if (n.indexOf('scan')    >= 0) stMap['scanner']     = s.ok ? 'done' : 'error';
        if (n.indexOf('hermes')  >= 0) stMap['hermes']      = s.ok ? 'done' : 'error';
        if (n.indexOf('patch')   >= 0) stMap['patchengine'] = s.ok ? 'done' : 'error';
        if (n.indexOf('aegis')   >= 0) stMap['aegis']       = s.ok ? 'done' : 'error';
        if (n.indexOf('gocore')  >= 0 || n.indexOf('commit') >= 0) stMap['gocore'] = s.ok ? 'done' : 'error';
      });
      var overall = result.ok ? 'done' : 'error';
      seq.forEach(function(k) { activateAgent(k, stMap[k] || overall); });
      if (result.ok && result.action === 'patch_applied_committed') { activateAgent('passgold', 'done'); }
      else if (!result.ok) { activateAgent('passgold', 'idle'); }
    }

    function renderValidationPanel(res) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'background:#050a08;border:1px solid rgba(34,197,94,.4);border-radius:14px;padding:16px;margin:4px 0 8px;font-size:13px;font-family:inherit;';
      var title = document.createElement('div');
      title.style.cssText = 'color:#4ade80;font-weight:600;font-size:14px;margin-bottom:10px;';
      title.textContent = '✅ Patch aplicado e commitado — validação manual obrigatória (SDDF §14)';
      wrap.appendChild(title);
      var info = document.createElement('pre');
      info.style.cssText = 'background:#020504;border:1px solid #1a2e1a;border-radius:10px;padding:12px;color:#d4d4d8;overflow:auto;max-height:180px;font-size:11px;margin:0 0 12px;white-space:pre-wrap;word-break:break-all;';
      var pstr = '';
      try { pstr = JSON.stringify(res.patch, null, 2); } catch(e) { pstr = String(res.patch || ''); }
      info.textContent = [
        'Arquivo : ' + (res.file     || '—'),
        'Fix type: ' + (res.fix_type || '—'),
        'Commit  : ' + (res.hash     || 'sem hash'),
        '', '── PATCH ──', pstr
      ].join('\n');
      wrap.appendChild(info);
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';
      function mkBtn(txt, bg, bc, fg) {
        var b = document.createElement('button');
        b.style.cssText = 'background:' + bg + ';border:1px solid ' + bc + ';color:' + fg + ';font-size:12px;padding:8px 14px;border-radius:12px;cursor:pointer;font-family:inherit;font-weight:500;';
        b.textContent = txt;
        return b;
      }
      var approveBtn = mkBtn('✅ Aprovar e fazer Push', '#14532d', '#22c55e', '#4ade80');
      var revertBtn  = mkBtn('❌ Reverter commit',      '#7f1d1d', '#f87171', '#fca5a5');
      approveBtn.onclick = function() {
        approveBtn.disabled = true; revertBtn.disabled = true;
        approveBtn.textContent = '⏳ Enviando push...';
        fetch(BACKEND_URL + '/api/agent/mission/push', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ mission_id: res.mission_id, file: res.file, hash: res.hash })
        }).then(function(r){ return r.json(); })
          .then(function(d){ approveBtn.textContent = d.ok ? '✅ Push enfileirado' : '❌ ' + (d.error || 'Erro'); approveBtn.style.opacity = '0.7'; })
          .catch(function(){ approveBtn.textContent = '❌ Erro de rede'; approveBtn.disabled = false; revertBtn.disabled = false; });
      };
      revertBtn.onclick = function() {
        if (!confirm('Reverter o último commit? Isso desfaz o patch aplicado.')) return;
        approveBtn.disabled = true; revertBtn.disabled = true;
        revertBtn.textContent = '⏳ Revertendo...';
        fetch(BACKEND_URL + '/api/agent/mission/revert', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ mission_id: res.mission_id, file: res.file, hash: res.hash })
        }).then(function(r){ return r.json(); })
          .then(function(d){ revertBtn.textContent = d.ok ? '✅ Reversão enfileirada' : '❌ ' + (d.error || 'Erro'); revertBtn.style.opacity = '0.7'; })
          .catch(function(){ revertBtn.textContent = '❌ Erro de rede'; approveBtn.disabled = false; revertBtn.disabled = false; });
      };
      row.appendChild(approveBtn);
      row.appendChild(revertBtn);
      wrap.appendChild(row);
      return wrap;
    }

    /* ── renderApplyFixPanel — aplica patch via /api/chat/apply-patch (sem agent local) ── */
    function renderApplyFixPanel(hermesObj) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'background:#050a0f;border:1px solid rgba(59,130,246,.4);border-radius:14px;padding:16px;margin:4px 0 8px;font-size:13px;font-family:inherit;';

      var title = document.createElement('div');
      title.style.cssText = 'color:#60a5fa;font-weight:600;font-size:14px;margin-bottom:10px;';
      title.textContent = '🔧 Patch proposto — pronto para aplicar';
      wrap.appendChild(title);

      var info = document.createElement('pre');
      info.style.cssText = 'background:#020408;border:1px solid #1a2040;border-radius:10px;padding:12px;color:#d4d4d8;overflow:auto;max-height:180px;font-size:11px;margin:0 0 12px;white-space:pre-wrap;word-break:break-all;';
      var pstr = '';
      try { pstr = JSON.stringify(hermesObj.patch, null, 2); } catch(e) { pstr = String(hermesObj.patch || ''); }
      info.textContent = [
        'Arquivo  : ' + (hermesObj.file        || '—'),
        'Fix type : ' + (hermesObj.fix_type     || '—'),
        'Confiança: ' + (hermesObj.confidence != null ? (Number(hermesObj.confidence) * 100).toFixed(0) : '—') + '%',
        'Diagnóstico: ' + (hermesObj.diagnosis   || '—'),
        '', '── PATCH ──', pstr
      ].join('\n');
      wrap.appendChild(info);

      var statusEl = document.createElement('div');
      statusEl.style.cssText = 'color:#94a3b8;font-size:12px;margin-bottom:8px;min-height:18px;';
      wrap.appendChild(statusEl);

      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

      function mkBtn(txt, bg, bc, fg) {
        var b = document.createElement('button');
        b.style.cssText = 'background:' + bg + ';border:1px solid ' + bc + ';color:' + fg + ';font-size:12px;padding:8px 14px;border-radius:12px;cursor:pointer;font-family:inherit;font-weight:500;';
        b.textContent = txt;
        return b;
      }

      var applyBtn  = mkBtn('✅ Aplicar e Baixar Arquivo Corrigido', '#0a2a1a', '#22c55e', '#86efac');
      var cancelBtn = mkBtn('✖ Ignorar', '#1c1c1e', '#555', '#888');

      applyBtn.onclick = function() {
        if (!hermesObj.patch) { statusEl.textContent = '❌ Patch ausente no diagnóstico.'; return; }
        if (!_lastZipB64)     { statusEl.textContent = '❌ ZIP não encontrado em memória. Reenvie o arquivo.'; return; }

        applyBtn.disabled = true; cancelBtn.disabled = true;
        applyBtn.textContent = '⏳ Aplicando patch...';
        statusEl.textContent = 'Enviando para /api/chat/apply-patch...';

        fetch(BACKEND_URL + '/api/chat/apply-patch', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            zip_base64: _lastZipB64,
            file_path:  hermesObj.file,
            fix_type:   hermesObj.fix_type  || 'code_patch',
            patch:      hermesObj.patch,
            diagnosis:  hermesObj.diagnosis || 'vision fix'
          }),
          signal: AbortSignal.timeout(30000)
        })
        .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw new Error(e.error || ('HTTP ' + r.status)); }); })
        .then(function(data) {
          if (!data.ok) { throw new Error(data.error || 'apply-patch falhou'); }

          wrap.remove();

          var aegisLine = data.aegis_ok
            ? '✅ Aegis: sintaxe válida'
            : '⚠️ Aegis: ' + (data.aegis_error || 'erro de sintaxe — revise o patch');
          appendMsg('✅ PATCH APLICADO\n\nArquivo : ' + data.file_path + '\nFix type: ' + data.fix_type + '\n' + aegisLine + '\nLinhas  : ' + data.original_lines + ' → ' + data.patched_lines, '');

          if (data.diff_preview) {
            var diffEl = document.createElement('pre');
            diffEl.style.cssText = 'background:#020408;border:1px solid #1a2040;border-radius:10px;padding:12px;color:#a5f3fc;overflow:auto;max-height:260px;font-size:11px;margin:4px 0 8px;white-space:pre;';
            var diffLines = data.diff_preview.split('\n').map(function(l) {
              if (l.startsWith('+')) return '<span style="color:#86efac">' + l.replace(/</g,'&lt;') + '</span>';
              if (l.startsWith('-')) return '<span style="color:#f87171">' + l.replace(/</g,'&lt;') + '</span>';
              return '<span style="color:#64748b">' + l.replace(/</g,'&lt;') + '</span>';
            });
            diffEl.innerHTML = diffLines.join('\n');
            chatStream.appendChild(diffEl);
          }

          var dlBtn = document.createElement('button');
          dlBtn.style.cssText = 'background:#0a2a1a;border:1px solid #22c55e;color:#86efac;font-size:12px;padding:8px 14px;border-radius:12px;cursor:pointer;font-family:inherit;font-weight:500;margin:4px 0 8px;';
          dlBtn.textContent = '⬇ Baixar ' + data.filename + ' (corrigido)';
          dlBtn.onclick = function() {
            var blob = new Blob([data.patched_content], { type: 'text/plain;charset=utf-8' });
            var url  = URL.createObjectURL(blob);
            var a    = document.createElement('a');
            a.href     = url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 1000);
          };
          chatStream.appendChild(dlBtn);
          chatStream.scrollTop = chatStream.scrollHeight;
          setStatus('READY');
        })
        .catch(function(err) {
          applyBtn.disabled = false; cancelBtn.disabled = false;
          applyBtn.textContent = '✅ Aplicar e Baixar Arquivo Corrigido';
          statusEl.textContent = '❌ ' + (err.message || 'Erro desconhecido');
          setStatus('READY');
        });
      };

      cancelBtn.onclick = function() { wrap.remove(); };

      row.appendChild(applyBtn);
      row.appendChild(cancelBtn);
      wrap.appendChild(row);
      return wrap;
    }

    /* ── §36: renderStandardMethodPanel — Vision Core Standard Method ── */
    function renderStandardMethodPanel(mission) {
      var h = mission.hermesObj;
      var wrap = document.createElement('div');
      wrap.style.cssText = 'background:#050a0f;border:1.5px solid rgba(99,102,241,.5);border-radius:16px;padding:20px 22px;margin:6px 0 10px;font-size:13px;font-family:inherit;';
      var header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;';
      header.innerHTML = '<div style="width:32px;height:32px;border-radius:8px;background:#4f46e5;display:flex;align-items:center;justify-content:center;font-size:16px;">🛡</div><div><div style="color:#e2e8f0;font-weight:600;font-size:15px;">Vision Core Standard Method</div><div style="color:#7c6fcd;font-size:11px;margin-top:2px;">SDDF Pipeline — Execução Controlada e Auditável</div></div><div style="margin-left:auto;font-size:11px;color:#4ade80;background:rgba(74,222,128,.1);padding:3px 10px;border-radius:20px;border:1px solid rgba(74,222,128,.3);">● PRONTO</div>';
      wrap.appendChild(header);
      if (h) {
        var diagBox = document.createElement('div');
        diagBox.style.cssText = 'background:#0a0f1a;border:1px solid #1e2a4a;border-radius:10px;padding:12px;margin-bottom:16px;';
        diagBox.innerHTML = '<div style="color:#60a5fa;font-size:11px;font-weight:500;margin-bottom:8px;letter-spacing:.06em;">DIAGNÓSTICO HERMES</div><div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;"><span style="color:#64748b;">Arquivo</span><span style="color:#e2e8f0;font-family:monospace;">' + (h.file || '—') + '</span><span style="color:#64748b;">Fix type</span><span style="color:#e2e8f0;">' + (h.fix_type || '—') + '</span><span style="color:#64748b;">Decisão</span><span style="color:' + (h.decisao === 'NEEDS_FIX' ? '#4ade80' : '#f87171') + ';font-weight:500;">' + (h.decisao || '—') + '</span><span style="color:#64748b;">Confiança</span><span style="color:#e2e8f0;">' + (h.confidence != null ? Math.round(Number(h.confidence) * 100) + '%' : '—') + '</span><span style="color:#64748b;">Diagnóstico</span><span style="color:#a5b4fc;">' + (h.diagnosis || '—') + '</span></div>';
        wrap.appendChild(diagBox);
      }
      var stages = [
        { id: 'mission',    icon: '📋', label: 'Missão',              desc: 'Receber e registrar o input da missão com escopo definido' },
        { id: 'scope',      icon: '🎯', label: 'Escopo',              desc: 'Delimitar arquivos, dependências e limites de modificação' },
        { id: 'plan',       icon: '📐', label: 'Plano',               desc: 'Gerar sequência de passos antes de qualquer modificação' },
        { id: 'execution',  icon: '⚙️',  label: 'Execução Controlada', desc: 'Aplicar patch cirúrgico no arquivo-alvo identificado' },
        { id: 'firewall',   icon: '🔒', label: 'Firewall',            desc: 'Verificar flags proibidas: deploy, release, pass_gold falso' },
        { id: 'validation', icon: '✅', label: 'Validação',           desc: 'Aegis (node --check) + validate-syntax + smoke test' },
        { id: 'evidence',   icon: '📎', label: 'Evidência',           desc: 'Registrar hash, diff, resultado e artefatos auditáveis' },
        { id: 'decision',   icon: '⚖️',  label: 'Decisão',            desc: 'Hermes avalia: PASS / NEEDS_FIX / ABORTED / BLOCKED' },
        { id: 'checkpoint', icon: '🏁', label: 'Checkpoint',          desc: 'Estado final: diff entregue, evidência registrada, pronto' }
      ];
      var pipelineDiv = document.createElement('div');
      pipelineDiv.style.cssText = 'margin-bottom:18px;';
      pipelineDiv.innerHTML = '<div style="color:#64748b;font-size:11px;font-weight:500;letter-spacing:.06em;margin-bottom:10px;">PIPELINE DE EXECUÇÃO</div>';
      stages.forEach(function(s, i) {
        var isActive = (s.id === 'execution' && h) || (s.id === 'mission' && !h);
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:8px;margin-bottom:2px;' + (isActive ? 'background:rgba(79,70,229,.15);border:1px solid rgba(79,70,229,.3);' : 'background:transparent;');
        row.innerHTML = '<div style="width:24px;height:24px;border-radius:50%;background:' + (isActive ? '#4f46e5' : '#1e2a3a') + ';display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-top:1px;">' + (i + 1) + '</div><div style="flex:1;"><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:14px;">' + s.icon + '</span><span style="color:' + (isActive ? '#c7d2fe' : '#94a3b8') + ';font-weight:' + (isActive ? '600' : '400') + ';font-size:13px;">' + s.label + '</span>' + (isActive ? '<span style="font-size:10px;color:#818cf8;background:rgba(99,102,241,.15);padding:1px 7px;border-radius:10px;">PRÓXIMO</span>' : '') + '</div><div style="color:#475569;font-size:11px;margin-top:2px;">' + s.desc + '</div></div>';
        pipelineDiv.appendChild(row);
      });
      wrap.appendChild(pipelineDiv);
      var ruleBox = document.createElement('div');
      ruleBox.style.cssText = 'background:#0c0a00;border:1px solid #3d3000;border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:11px;color:#92701e;';
      ruleBox.innerHTML = '<b style="color:#d97706;">⚠ Regra Absoluta:</b> Sem PASS GOLD real → não promove, não faz deploy, não libera. READY ≠ deploy permitido.';
      wrap.appendChild(ruleBox);
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';
      function mkBtn(txt, bg, bc, fg) {
        var b = document.createElement('button');
        b.style.cssText = 'background:' + bg + ';border:1px solid ' + bc + ';color:' + fg + ';font-size:13px;padding:9px 18px;border-radius:12px;cursor:pointer;font-family:inherit;font-weight:500;';
        b.textContent = txt;
        return b;
      }
      var confirmBtn = mkBtn(h ? '✅ Confirmar e Aplicar Patch' : '▶ Iniciar Missão SDDF', '#0a1f0a', '#22c55e', '#86efac');
      var cancelBtn  = mkBtn('✖ Cancelar', '#1c1c1e', '#555', '#888');
      var statusEl   = document.createElement('div');
      statusEl.style.cssText = 'color:#94a3b8;font-size:12px;margin-top:10px;min-height:18px;width:100%;';
      confirmBtn.onclick = function() {
        /* §36fix BUG1: h existe mas sem patch/file → BLOCKED_INPUT ou diagnóstico incompleto */
        if (h && (!h.patch || !h.file)) {
          appendMsg(['🛡 Vision Core Standard Method — DIAGNÓSTICO INCOMPLETO','','⚖️  Decisão:   ' + (h.decisao || 'BLOCKED_INPUT'),'📋 Motivo:    patch ou arquivo ausente no diagnóstico','','Opções:','  • Clique EXECUTAR MISSÃO novamente para rediagnosticar com mais contexto','  • Copie o diagnóstico do chat e aplique manualmente'].join('\n'), 'error');
          wrap.remove(); _activeMission = null; setStatus('READY'); return;
        }
        /* §36fix BUG2: hermesObj com patch mas ZIP não em memória */
        if (h && h.patch && h.file && !_lastZipB64) {
          statusEl.textContent = '⚠️ ZIP não está em memória — reenvie o arquivo ZIP para aplicar o patch automaticamente. Ou copie o diff acima e aplique manualmente no seu projeto.';
          return;
        }
        if (h && _lastZipB64) {
          confirmBtn.disabled = true; cancelBtn.disabled = true;
          confirmBtn.textContent = '⏳ Executando pipeline...';
          statusEl.textContent = '📋 Missão registrada — ' + mission.id;
          setTimeout(function() {
            statusEl.textContent = '🎯 Escopo: ' + (h.file || 'arquivo-alvo') + ' · 📐 Plano: ' + (h.fix_type || 'code_patch');
            setTimeout(function() {
              statusEl.textContent = '⚙️ Execução Controlada — enviando para /api/chat/apply-patch...';
              fetch(BACKEND_URL + '/api/chat/apply-patch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ zip_base64: _lastZipB64, file_path: h.file, fix_type: h.fix_type || 'code_patch', patch: h.patch, diagnosis: h.diagnosis || 'vision standard method' }),
                signal: AbortSignal.timeout(30000)
              })
              .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw new Error(e.error || 'HTTP ' + r.status); }); })
              .then(function(data) {
                if (!data.ok) throw new Error(data.error || 'apply-patch falhou');
                wrap.remove(); _activeMission = null;
                var aegisStatus = data.aegis_ok ? '✅ Aegis PASS' : '⚠️ Aegis: ' + (data.aegis_error || 'erro de sintaxe');
                var decisao = data.aegis_ok ? '✅ PASS — patch aplicado e validado' : '⚠️ NEEDS_FIX — revisar sintaxe';
                appendMsg(['🛡 Vision Core Standard Method — CHECKPOINT','','📋 Missão:    ' + mission.id,'🎯 Escopo:    ' + (data.file_path || h.file),'⚙️  Execução:  patch aplicado (' + data.original_lines + '→' + data.patched_lines + ' linhas)','🔒 Firewall:  deploy_allowed=false · pass_gold_real_claimed=false','✅ Validação: ' + aegisStatus,'📎 Evidência: diff gerado · artefato disponível para download','⚖️  Decisão:   ' + decisao,'🏁 Checkpoint: ' + (data.aegis_ok ? 'PRONTO — baixe o arquivo corrigido' : 'BLOQUEADO — corrija o erro antes de promover')].join('\n'), '');
                if (data.diff_preview) {
                  var diffEl = document.createElement('pre');
                  diffEl.style.cssText = 'background:#020408;border:1px solid #1a2040;border-radius:10px;padding:12px;color:#a5f3fc;overflow:auto;max-height:260px;font-size:11px;margin:4px 0 8px;white-space:pre;';
                  diffEl.innerHTML = data.diff_preview.split('\n').map(function(l) {
                    if (l.startsWith('+')) return '<span style="color:#86efac">' + l.replace(/</g,'&lt;') + '</span>';
                    if (l.startsWith('-')) return '<span style="color:#f87171">' + l.replace(/</g,'&lt;') + '</span>';
                    return '<span style="color:#64748b">' + l.replace(/</g,'&lt;') + '</span>';
                  }).join('\n');
                  chatStream.appendChild(diffEl);
                }
                if (data.aegis_ok) {
                  var dlBtn = document.createElement('button');
                  dlBtn.style.cssText = 'background:#0a2a1a;border:1px solid #22c55e;color:#86efac;font-size:12px;padding:8px 14px;border-radius:12px;cursor:pointer;font-family:inherit;font-weight:500;margin:4px 0 8px;';
                  dlBtn.textContent = '⬇ Baixar ' + data.filename + ' (corrigido)';
                  dlBtn.onclick = function() {
                    var blob = new Blob([data.patched_content], { type: 'text/plain;charset=utf-8' });
                    var url  = URL.createObjectURL(blob);
                    var a    = document.createElement('a');
                    a.href = url; a.download = data.filename;
                    document.body.appendChild(a); a.click();
                    setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 1000);
                  };
                  chatStream.appendChild(dlBtn);
                }
                chatStream.scrollTop = chatStream.scrollHeight;
                setStatus('READY');
              })
              .catch(function(err) {
                /* §36fix BUG3: relatório estruturado no checkpoint de falha */
                appendMsg(['🛡 Vision Core Standard Method — FALHA NO CHECKPOINT','','⚖️  Decisão:   NEEDS_FIX — execução bloqueada','❌ Erro:      ' + (err.message || String(err)),'','Opções disponíveis:','  • Clique EXECUTAR MISSÃO novamente para rediagnosticar','  • Reenvie o ZIP se o arquivo não estiver em memória','  • Copie o diff do chat e aplique manualmente'].join('\n'), 'error');
                wrap.remove(); _activeMission = null; setStatus('READY');
              });
            }, 600);
          }, 400);
        } else if (!h) {
          wrap.remove();
          var missionText = mission.input || 'missão SDDF padrão';
          /* §38 — animated spinner */
          var thinking2 = appendMsg('', 'thinking');
          thinking2.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #4f46e5;border-top-color:transparent;border-radius:50%;animation:vcSpin .7s linear infinite;vertical-align:middle;margin-right:8px;"></span>' +
            '<span class="vc-thinking-text">📋 missão iniciada — processando via Hermes...</span>';
          setStatus('EXECUTANDO MISSÃO...', 'busy');
          fetch(BACKEND_URL + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: missionText, mode: 'fix', model: 'auto' })
          })
          .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
          .then(function(d) {
            thinking2.remove();
            var answer = (d && d.answer) ? d.answer : JSON.stringify(d);
            var hObj = parseHermesBlock(answer);
            if (hObj) {
              _activeMission = { id: mission.id, hermesObj: hObj, input: missionText, stage: 'diagnosed', evidence: [{ type: 'diagnosis', data: hObj, ts: Date.now() }], zipB64: _lastZipB64 || null, startedAt: mission.startedAt };
              renderHermesBlock(hObj, chatStream);
              /* §38 — hint pós-diagnóstico */
              (function() {
                var hintEl = document.createElement('div');
                hintEl.style.cssText = 'background:rgba(79,70,229,.08);border:1px solid rgba(99,102,241,.3);border-radius:10px;padding:10px 14px;margin:4px 0 8px;font-size:12px;color:#a5b4fc;display:flex;align-items:center;gap:8px;';
                hintEl.innerHTML = '<span style="font-size:16px;">🛡</span><span>Diagnóstico concluído. Clique em <b style="color:#c7d2fe">EXECUTAR MISSÃO</b> para aplicar o patch automaticamente via Vision Core Standard Method.</span>';
                chatStream.appendChild(hintEl);
                chatStream.scrollTop = chatStream.scrollHeight;
              }());
            } else {
              appendMsg(answer, '');
            }
            setStatus('READY');
          })
          .catch(function(err) {
            thinking2.remove();
            appendMsg('[Erro na missão: ' + err + ']', 'error');
            setStatus('READY');
          });
        } else {
          statusEl.textContent = '❌ ZIP não encontrado em memória. Reenvie o arquivo ZIP + pergunta.';
        }
      };
      cancelBtn.onclick = function() { wrap.remove(); _activeMission = null; setStatus('READY'); };
      btnRow.appendChild(confirmBtn); btnRow.appendChild(cancelBtn);
      wrap.appendChild(btnRow); wrap.appendChild(statusEl);
      chatStream.appendChild(wrap);
      chatStream.scrollTop = chatStream.scrollHeight;
    }

    /* ── EXECUTAR MISSÃO — §36 Vision Core Standard Method ─── */
    if (runBtn) {
      runBtn.addEventListener('click', function() {
        /* §38 — ripple visual */
        runBtn.style.transform = 'scale(0.97)';
        setTimeout(function() { runBtn.style.transform = ''; }, 150);
        /* §36: missão ativa com hermesObj → mostrar Standard Method panel */
        if (_activeMission && _activeMission.hermesObj) {
          renderStandardMethodPanel(_activeMission);
          return;
        }
        /* §36: sem missão ativa → iniciar nova com input do campo */
        var text = (promptInput.value || '').trim() || 'missão SDDF padrão';
        promptInput.value = '';
        _activeMission = { id: 'mission-' + Date.now(), hermesObj: null, input: text, stage: 'scoping', evidence: [], zipB64: _lastZipB64 || null, startedAt: Date.now() };
        renderStandardMethodPanel(_activeMission);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        chatStream.innerHTML = '<div class="v298-empty-hint">Vision AI pronto. Converse sobre qualquer assunto, cole erros, envie arquivos/imagens ou execute uma missão SDDF.</div>';
        _attachedFiles = [];
        _attachedImg   = null;
        clearHistory();
        _activeMission = null;  /* §36 — limpar missão ativa */
        _lastZipB64    = null;
        if (fileNote)    { fileNote.textContent = 'Nenhum arquivo anexado.'; }
        if (addFilesBtn) { addFilesBtn.textContent = '＋ Adicionar arquivos'; }
        setStatus('READY');
      });
    }

    /* ── ZIP handlers — §redesign: stage on attach, fire on ENVIAR ── */

    /* Stage ZIP — read ArrayBuffer now, fire analysis only on sendMessage */
    function _stageZip(file) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        _pendingZip = { file: file, buffer: ev.target.result };
        if (fileNote)    { fileNote.textContent    = '📦 ' + file.name + ' — adicione sua pergunta e clique ENVIAR'; }
        if (addFilesBtn) { addFilesBtn.textContent = '📦 ' + file.name; }
      };
      reader.onerror = function() {
        appendMsg('❌ Erro ao ler ZIP: ' + file.name, 'error');
      };
      reader.readAsArrayBuffer(file);
    }

    /* Core ZIP processing — called by sendMessage with question captured at send time */
    function _processZipBuffer(file, buffer, question, zipMode, zipModel) {
      var thinking = appendMsg('📦 Extraindo ' + file.name + '...', 'thinking');
      setStatus('EXTRAINDO ZIP...', 'busy');

      if (typeof JSZip === 'undefined') {
        thinking.remove();
        appendMsg('❌ JSZip não carregado. Recarregue a página.', 'error');
        setStatus('READY');
        return;
      }

      var TEXT_EXTS = ['.js','.json','.ts','.jsx','.tsx','.html','.css','.md','.txt','.py','.go','.mjs','.cjs'];
      var SKIP_DIRS = ['node_modules','.git','dist','.next','build','coverage','__pycache__'];
      /* §24v8 — lead+tail split: primeiro MAX_FILES-1 arquivos recebem LEAD_LIMIT,
         último arquivo recebe o orçamento restante (min(sz, 60K−3×12K)=~24K) → sem truncação */
      var SKIP_NAME    = /(?:cache|lock|\.min\.|\.bundle\.|\.map$|vendor\.)/i;
      var TOTAL_BUDGET = 60000; /* §24v8: 3×12K+24K=60K; games-2026 23726 < 24K → inteiro */
      var LEAD_LIMIT   = 12000; /* §24v8: primeiros N-1 arquivos */
      var MAX_FILES    = 4;     /* §24v8: 4 arquivos — 3 lead + 1 tail sem truncação */
      /* Tier: 1A=JS front/ (maior DESC), 1B=JS backend/, 2=HTML, 3=CSS, 4=JSON, 5=outros */
      function _extTier(ext, relPath) {
        if (['.js','.ts','.mjs','.cjs','.jsx','.tsx'].indexOf(ext) !== -1) {
          var isFront = !/(?:^|\/)(?:backend|server|node_modules)\//.test(relPath); /* §24v4: front=not-backend; handles ZIP root prefix */
          return isFront ? 1 : 2; /* front JS antes de backend JS */
        }
        if (ext === '.html') return 3;
        if (ext === '.css')  return 4;
        if (ext === '.json') return 5;
        return 6;
      }

      /* buffer already read by _stageZip — salvar base64 para apply-patch */
      _lastZipB64 = (function(buf) {
        var bytes = new Uint8Array(buf);
        var bin   = '';
        for (var k = 0; k < bytes.length; k++) { bin += String.fromCharCode(bytes[k]); }
        return btoa(bin);
      })(buffer);

      /* buffer already read by _stageZip — process directly */
      JSZip.loadAsync(buffer).then(function(zip) {
          var promises = [];
          var fileNames = [];

          /* FIX D §24 v3 — coletar todos, tier + JS DESC, budget total */
          var candidates = [];
          /* §35 FIX2 — coletar paths de assets (imagens, SVGs, fonts) para injetar no contexto do LLM */
          var ASSET_EXTS = ['.png','.jpg','.jpeg','.gif','.svg','.webp','.ico','.mp4','.mp3','.woff','.woff2','.ttf','.pdf'];
          var assetPaths = [];
          zip.forEach(function(relPath, zipEntry) {
            if (zipEntry.dir) return;
            var skip = SKIP_DIRS.some(function(d) { return relPath.indexOf(d + '/') !== -1 || relPath.indexOf(d + '\\') !== -1; });
            if (skip) return;
            var fname = relPath.split('/').pop().split('\\').pop();
            if (SKIP_NAME.test(fname)) return;
            var dot = relPath.lastIndexOf('.');
            var ext = dot !== -1 ? relPath.slice(dot).toLowerCase() : '';
            /* Coletar assets (antes do filtro TEXT_EXTS) */
            if (ASSET_EXTS.indexOf(ext) !== -1) {
              /* Normalizar: remover prefixo da pasta raiz do ZIP (ex: technetgamev2-main/) */
              var parts = relPath.replace(/\\/g, '/').split('/');
              assetPaths.push(parts.length > 1 ? parts.slice(1).join('/') : relPath);
            }
            if (TEXT_EXTS.indexOf(ext) === -1) return;
            var sz = (zipEntry._data && zipEntry._data.uncompressedSize) ? zipEntry._data.uncompressedSize : 0;
            if (sz < 200) return; /* ignorar stubs/arquivos vazios */
            var tier = _extTier(ext, relPath);
            /* §24v7c: SIZE DESC (maior = mais lógica, tier-1+2 e demais); todos ASC por sortKey */
            var sortKey = (tier <= 2) ? -sz : sz;
            candidates.push({ relPath: relPath, entry: zipEntry, sz: sz, tier: tier, sortKey: sortKey });
          });
          candidates.sort(function(a, b) {
            return (a.tier !== b.tier) ? (a.tier - b.tier) : (a.sortKey - b.sortKey);
          });
          /* §24v8: lead+tail — primeiro MAX_FILES-1 recebem LEAD_LIMIT; último recebe restante */
          var budget = 0;
          candidates.forEach(function(c) {
            if (fileNames.length >= MAX_FILES) return;
            var isLast  = (fileNames.length === MAX_FILES - 1);
            var limit   = isLast ? Math.min(c.sz, TOTAL_BUDGET - budget) : LEAD_LIMIT;
            var contrib = Math.min(c.sz, limit);
            if (contrib <= 0 || budget + contrib > TOTAL_BUDGET) return;
            fileNames.push(c.relPath);
            budget += contrib;
            var _lim = limit; /* captura limit para closure async */
            promises.push(c.entry.async('string').then(function(content) {
              return '[' + c.relPath + ']\n' + content.slice(0, _lim) + (content.length > _lim ? '\n...(truncado em ' + _lim + '/' + content.length + ' chars)' : '');
            }));
          });

          if (!promises.length) {
            thinking.remove();
            appendMsg('❌ Nenhum arquivo de texto encontrado no ZIP.', 'error');
            setStatus('READY');
            return;
          }

          return Promise.all(promises).then(function(contents) {
            /* §debug: mostrar quais arquivos foram selecionados */
            var shortNames = fileNames.map(function(p){ return p.split('/').pop(); });
            thinking.textContent = '📦 ' + fileNames.length + ' arquivo(s): ' + shortNames.join(', ') + ' — analisando...';

            /* §35 FIX2 — prefixo com lista de assets para LLM não inventar caminhos */
            var assetContext = assetPaths.length > 0
              ? '\n\n[ASSETS DISPONÍVEIS NO PROJETO — use estes caminhos ao sugerir patches]\n' +
                assetPaths.sort().map(function(a) { return '  ' + a; }).join('\n')
              : '';
            /* mode/model passed in from sendMessage (captured at send time) */
            /* §24v9: reverter ordem — tail (arquivo inteiro/específico) fica primeiro no prompt */
            var context  = question + assetContext + '\n\n' + contents.slice().reverse().join('\n\n---\n\n');

            /* Adicionar ao histórico de sessão */
            addToHistory('user', '[ZIP: ' + file.name + '] ' + question);

            /* Timeout 55s — §26: Gemini pode levar até 45s + 10s overhead de rede */
            var ctrl    = new AbortController();
            var timeout = setTimeout(function() { ctrl.abort(); }, 55000);

            return fetch(BACKEND_URL + '/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: context, mode: zipMode, model: zipModel }),
              signal: ctrl.signal
            });
          }).then(function(r) {
            if (!r.ok) return Promise.reject(new Error('HTTP ' + r.status));
            return r.json();
          })
          .then(function(d) {
            if (typeof timeout !== 'undefined') clearTimeout(timeout);
            thinking.remove();

            /* §27 echo guard — avisa se todos os provedores falharam */
            if (d && d.provider === 'local') {
              appendMsg('⚠️ Fallback local — todos os provedores de IA falharam. Reduza o ZIP ou verifique GROQ_API_KEY / GEMINI_API_KEY.', 'error');
            }

            var answer = (d && d.answer) ? d.answer : JSON.stringify(d);

            /* Adicionar ao histórico */
            addToHistory('assistant', answer);

            /* §21 fetch transparency badge */
            renderFetchBadge(d, chatStream);

            /* Hermes JSON renderer ou typewriter */
            var hermesObj = parseHermesBlock(answer);
            var msgEl = appendMsg('', '');
            if (hermesObj) {
              renderHermesBlock(hermesObj, chatStream);
              typewriterEffect(msgEl, answer.replace(/```json[\s\S]*?```/g, '[↑ diagnóstico Hermes acima]'), 10);
              /* §36 — salvar missão ativa para EXECUTAR MISSÃO */
              _activeMission = { id: 'mission-' + Date.now(), hermesObj: hermesObj, input: question, stage: 'diagnosed', evidence: [{ type: 'diagnosis', data: hermesObj, ts: Date.now() }], zipB64: _lastZipB64 || null, startedAt: Date.now() };
            } else {
              typewriterEffect(msgEl, answer, 10);
            }

            /* §38fix — hint aparece mesmo quando resposta é texto livre com diff */
            var hasDiff = answer.indexOf('```diff') !== -1 || answer.indexOf('```javascript') !== -1;
            if (hermesObj || hasDiff) {
              var hintEl38 = document.createElement('div');
              hintEl38.style.cssText = 'background:rgba(79,70,229,.08);border:1px solid rgba(99,102,241,.3);border-radius:10px;padding:10px 14px;margin:4px 0 8px;font-size:12px;color:#a5b4fc;display:flex;align-items:center;gap:8px;';
              hintEl38.innerHTML = '<span style="font-size:16px;">🛡</span><span>Diagnóstico concluído. Clique em <b style="color:#c7d2fe">EXECUTAR MISSÃO</b> para aplicar o patch automaticamente via Vision Core Standard Method.</span>';
              setTimeout(function() {
                chatStream.appendChild(hintEl38);
                chatStream.scrollTop = chatStream.scrollHeight;
              }, 300);
            }

            /* §apply_patch — se diagnóstico tem patch, mostrar painel de aplicação */
            if (hermesObj && hermesObj.patch && hermesObj.file &&
                hermesObj.decisao && hermesObj.decisao.toUpperCase() === 'NEEDS_FIX') {
              chatStream.appendChild(renderApplyFixPanel(hermesObj));
              chatStream.scrollTop = chatStream.scrollHeight;
            }

            setStatus('READY');
          });

        }).catch(function(err) {
          if (typeof timeout !== 'undefined') clearTimeout(timeout);
          thinking.remove();
          var msg = err && err.name === 'AbortError'
            ? '⏱ ZIP: timeout 55s — resposta não chegou. Backend pode estar sobrecarregado; tente novamente.'
            : '❌ Erro ao processar ZIP: ' + (err && err.message ? err.message : String(err));
          appendMsg(msg, 'error');
          setStatus('READY');
        });
    } /* end _processZipBuffer */

    /* ── File upload wiring ───────────────────────────────────── */

    /* Shared dispatcher: routes files to ZIP handler or text accumulator */
    function _dispatchFiles(fileList) {
      if (!fileList || !fileList.length) return;
      var zips  = [];
      var texts = [];
      Array.prototype.forEach.call(fileList, function(f) {
        if (f.name.toLowerCase().endsWith('.zip')) { zips.push(f); }
        else { texts.push(f); }
      });

      /* §redesign: stage ZIP — fires on ENVIAR, not on attach */
      zips.forEach(function(z) { _stageZip(z); });

      /* Accumulate text files for sendMessage */
      if (!texts.length) return;
      _attachedFiles = [];
      var pending = texts.length;
      texts.forEach(function (f) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          _attachedFiles.push({ name: f.name, content: ev.target.result || '' });
          pending--;
          if (pending === 0) {
            if (fileNote) {
              fileNote.textContent = _attachedFiles.length + ' arquivo(s): ' +
                _attachedFiles.map(function (a) { return a.name; }).join(', ');
            }
            if (addFilesBtn) {
              addFilesBtn.textContent = '✓ ' + _attachedFiles.length + ' arquivo(s)';
            }
          }
        };
        reader.onerror = function () {
          pending--;
          if (pending === 0 && fileNote) { fileNote.textContent = 'Erro ao ler arquivo(s).'; }
        };
        reader.readAsText(f);
      });
    }

    if (addFilesBtn && fileInput) {
      addFilesBtn.addEventListener('click', function () {
        try { fileInput.value = ''; } catch(e) { /* ignore reset error */ }
        fileInput.click();
      });
      fileInput.addEventListener('change', function () {
        _dispatchFiles(fileInput.files);
      });
    }

    /* ── Drag-and-drop on chatStream (ZIP + text files) ─────── */
    if (chatStream) {
      chatStream.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        chatStream.style.outline = '2px dashed rgba(124,58,237,0.6)';
      });
      chatStream.addEventListener('dragleave', function(e) {
        e.stopPropagation();
        chatStream.style.outline = '';
      });
      chatStream.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        chatStream.style.outline = '';
        var dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) {
          _dispatchFiles(dt.files);
        }
      });
    }

    /* ── Image reader wiring ─────────────────────────────────── */
    if (readPrintBtn) {
      var _imgFileInput = document.createElement('input');
      _imgFileInput.type = 'file';
      _imgFileInput.accept = 'image/*';
      _imgFileInput.style.display = 'none';
      document.body.appendChild(_imgFileInput);
      readPrintBtn.addEventListener('click', function () {
        _imgFileInput.value = '';
        _imgFileInput.click();
      });
      _imgFileInput.addEventListener('change', function () {
        var f = _imgFileInput.files && _imgFileInput.files[0];
        if (!f) { return; }
        var reader = new FileReader();
        reader.onload = function (ev) {
          var dataUrl = ev.target.result || '';
          var mime    = dataUrl.split(';')[0].replace('data:','') || 'image/jpeg';
          var b64     = dataUrl.split(',')[1] || '';
          var kb      = Math.round(b64.length * 0.75 / 1024);
          if (b64.length > 5 * 1024 * 1024) { // >~3.75MB raw → warn
            appendMsg('⚠️ Imagem grande (' + kb + 'KB) — pode falhar. Use imagens menores que 3MB.', 'error');
          }
          _attachedImg = { name: f.name, base64: b64, mime: mime, kb: kb };
          appendMsg('[Imagem pronta: ' + f.name + ' (' + kb + 'KB) — pressione ENVIAR]', 'user');
          if (readPrintBtn) { readPrintBtn.textContent = '✓ ' + f.name.slice(0, 20); }
        };
        reader.onerror = function () {
          appendMsg('[Erro ao ler imagem]', 'error');
        };
        reader.readAsDataURL(f);
      });
    }
  }

  function initSoftwareFactoryPage() {
    var sfPage = document.getElementById('vcSoftwareFactoryPage');
    if (!sfPage) return;

    // Back button
    var backBtn = document.getElementById('vcSfBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', showMainCockpitPage);
    }

    // Nav open buttons (cockpit header/sidebar)
    document.querySelectorAll('[data-open-sf-page]').forEach(function (btn) {
      btn.addEventListener('click', showSoftwareFactoryPage);
    });

    // Module nav buttons
    document.querySelectorAll('.vc-sf-module-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSoftwareFactoryModule(btn.dataset.sfModule);
      });
    });

    // HOME button → reset to home view
    var homeBtn = document.getElementById('vcSfHomeBtn');
    if (homeBtn) {
      homeBtn.addEventListener('click', _sfShowHome);
    }

    // INICIAR MONTAGEM → open workspace at first module
    var startBtn = document.getElementById('vcSfStartBtn');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        setSoftwareFactoryModule('project_builder');
      });
    }

    // Quick-fill action buttons (populate textarea with template, no backend)
    var SF_FILL_TEMPLATES = {
      descricao: 'Tipo de projeto: [SaaS / API / App / Outro]\nObjetivo principal: [descreva aqui]\nFuncionalidades principais:\n  - [funcionalidade 1]\n  - [funcionalidade 2]\n  - [funcionalidade 3]\nStack preferida: [Node.js / Go / Python / etc]\nTamanho estimado: [MVP / Production Ready / Enterprise]',
      briefing:  'BRIEFING DO PROJETO\n\nCliente / Produto: [nome]\nDescrição: [descrição completa do produto]\nEntregas esperadas:\n  - [módulo 1]\n  - [módulo 2]\nRestrições técnicas: [lista]\nCritérios de aceite: [lista]\nPrazo estimado: [data ou duração]',
      exemplos:  'EXEMPLO A — SaaS Fullstack\nTipo: SaaS Fullstack\nStack: Node.js + React + PostgreSQL\nFuncionalidades: autenticação JWT, dashboard, billing Stripe, API REST\nTamanho: Production Ready\n\nEXEMPLO B — API Backend\nTipo: API Backend\nStack: Go + PostgreSQL + Docker\nFuncionalidades: CRUD completo, JWT auth, rate limiting\nTamanho: MVP\n\nEXEMPLO C — AI Agent System\nTipo: AI Agent System\nStack: Python + FastAPI + Redis\nFuncionalidades: orchestrator, workers, task queue, webhooks\nTamanho: Enterprise'
    };
    sfPage.addEventListener('click', function (e) {
      var fillBtn = e.target.closest('[data-sf-fill]');
      if (!fillBtn) return;
      var tpl = SF_FILL_TEMPLATES[fillBtn.dataset.sfFill] || '';
      var inp = document.getElementById('vcSfChatInput');
      if (inp && tpl) { inp.value = tpl; inp.focus(); }
    });

    // Chat send
    var sendBtn = document.getElementById('vcSfChatSendBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        _sfChatSend('vcSfChatInput', 'vcSfChatStream');
      });
    }
    var chatInput = document.getElementById('vcSfChatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          _sfChatSend('vcSfChatInput', 'vcSfChatStream');
        }
      });
    }

    // SDDF timeline node clicks → switch module
    var sddfContainer = document.getElementById('vcSfSddfSteps');
    if (sddfContainer) {
      sddfContainer.addEventListener('click', function (e) {
        var step = e.target.closest('.vc-sf-sddf-step');
        if (step && step.dataset.sfModule) {
          setSoftwareFactoryModule(step.dataset.sfModule);
        }
      });
    }

    // Chip group toggles (single-active per group)
    sfPage.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-sf-chip-group]');
      if (!chip) return;
      var group = chip.dataset.sfChipGroup;
      sfPage.querySelectorAll('[data-sf-chip-group="' + group + '"]').forEach(function (c) {
        c.classList.remove('active');
      });
      chip.classList.add('active');
      var label = chip.textContent.trim();
      // Update config cards in module panel
      var panelMap = { project_type: 'vcSfConfigType', stack: 'vcSfConfigStack', orch: 'vcSfConfigOrch' };
      if (panelMap[group]) {
        var el = document.getElementById(panelMap[group]);
        if (el) el.textContent = label;
      }
      // Mirror to left summary
      var summaryMap = { project_type: 'vcSfSummaryType', stack: 'vcSfSummaryStack', orch: 'vcSfSummaryOrch' };
      if (summaryMap[group]) {
        var sel = document.getElementById(summaryMap[group]);
        if (sel) sel.textContent = label;
      }
    });

    // EXECUTAR SDDF button (local echo only)
    var runBtn = document.getElementById('vcSfRunBtn');
    if (runBtn) {
      runBtn.addEventListener('click', function () {
        var stream = document.getElementById('vcSfChatStream');
        if (!stream) return;
        var hint = stream.querySelector('.vc-sf-chat-hint');
        if (hint) hint.remove();
        var msg = document.createElement('div');
        msg.className = 'vc-sf-chat-msg';
        msg.textContent = '[LOCAL] SDDF local: nenhum backend conectado. Configure módulo e copie para worker externo.';
        stream.appendChild(msg);
        stream.scrollTop = stream.scrollHeight;
        var feed = document.getElementById('vcSfActivityFeed');
        if (feed) {
          var item = document.createElement('div');
          item.className = 'vc-sf-activity-item';
          item.innerHTML = '<span>EXECUTAR SDDF pressionado — local only</span>';
          feed.insertBefore(item, feed.firstChild);
          while (feed.children.length > 8) { feed.removeChild(feed.lastChild); }
        }
      });
    }

    // Module-level generate / copy buttons
    document.querySelectorAll('[data-sf-generate]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.dataset.sfGenerate;
        var output   = document.getElementById(targetId);
        if (!output) return;
        var moduleId = btn.closest('.vc-sf-module-panel') &&
          btn.closest('.vc-sf-module-panel').id.replace('vcSfPanel-', '');
        var mod = SF_MODULES.find(function (m) { return m.id === moduleId; });
        var modName = mod ? mod.name : 'MÓDULO';
        output.value = '── ' + modName + ' ──────────────────────────────────\n' +
          'Gerado em: ' + new Date().toLocaleString('pt-BR') + '\n' +
          'Status: ' + (_backendConnected ? 'WORKER CONECTADO' : 'LOCAL PREVIEW') + '\n' +
          'Execução real: BLOQUEADA\n' +
          'Backend: ' + (_backendConnected ? 'CONECTADO' + (_backendVersion ? ' — v' + _backendVersion : '') : 'NÃO CONECTADO') + '\n' +
          'Worker: ' + BACKEND_URL + '\n\n' +
          '[Use o painel completo no cockpit para configuração detalhada.]';
        output.classList.remove('empty');
        btn.textContent = '✓ GERADO';
        setTimeout(function () { btn.textContent = btn.dataset.sfLabel || '⬡ GERAR'; }, 2400);
      });
    });

    document.querySelectorAll('[data-sf-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sourceId = btn.dataset.sfCopy;
        var source   = document.getElementById(sourceId);
        if (!source) return;
        var text = source.value || source.textContent || '';
        if (!text || !text.trim()) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = '✓ COPIADO';
            setTimeout(function () { btn.textContent = '⎘ COPIAR'; }, 1800);
          }).catch(function () {
            btn.textContent = 'SELECIONE MANUALMENTE';
            setTimeout(function () { btn.textContent = '⎘ COPIAR'; }, 2200);
          });
        }
      });
    });

    // Initialize first module
    setSoftwareFactoryModule(_sfActiveModule);
  }

  /* ── Auth modal wiring ───────────────────────────────────────── */
  function initAuthModal() {
    var authBackdrop = document.getElementById('authBackdrop');
    if (!authBackdrop) { return; }

    function openModal() {
      authBackdrop.classList.add('show');
      authBackdrop.removeAttribute('aria-hidden');
      var emailEl = document.getElementById('signupEmail');
      if (emailEl) { setTimeout(function () { emailEl.focus(); }, 80); }
    }

    ['openAuthBtn', 'openAuthBtn2'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) { return; }
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor  = '';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    var signupBtn = document.getElementById('signupBtn');
    var emailEl   = document.getElementById('signupEmail');
    var resultEl  = document.getElementById('signupResult');

    if (signupBtn && emailEl) {
      signupBtn.disabled = false;
      signupBtn.style.opacity = '';
      signupBtn.style.cursor  = '';

      function doAuth() {
        var email = (emailEl.value || '').trim();
        if (!email || email.indexOf('@') === -1) {
          if (resultEl) { resultEl.textContent = 'Email inválido.'; resultEl.style.color = '#f87171'; }
          return;
        }
        if (resultEl) { resultEl.textContent = 'Conectando…'; resultEl.style.color = '#94a3b8'; }
        signupBtn.disabled = true;

        fetch(BACKEND_URL + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: 'vc-user-auto', name: '' })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok) {
            if (data.token) {
              try { sessionStorage.setItem('vc_token', data.token); } catch (ex) {}
            }
            if (resultEl) {
              resultEl.textContent = '✓ Conta criada! Token: ' + (data.token ? data.token.slice(0, 14) + '…' : 'ok');
              resultEl.style.color = '#22c55e';
            }
            setTimeout(function () {
              authBackdrop.classList.remove('show');
              authBackdrop.setAttribute('aria-hidden', 'true');
            }, 2000);
            signupBtn.disabled = false;
          } else {
            /* Fall back to login */
            return fetch(BACKEND_URL + '/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email, password: 'vc-user-auto' })
            })
            .then(function (r2) { return r2.json(); })
            .then(function (d2) {
              signupBtn.disabled = false;
              if (d2 && d2.ok) {
                if (d2.token) {
                  try { sessionStorage.setItem('vc_token', d2.token); } catch (ex) {}
                }
                if (resultEl) { resultEl.textContent = '✓ Login realizado!'; resultEl.style.color = '#22c55e'; }
                setTimeout(function () {
                  authBackdrop.classList.remove('show');
                  authBackdrop.setAttribute('aria-hidden', 'true');
                }, 2000);
              } else {
                if (resultEl) {
                  resultEl.textContent = 'Erro: ' + (d2 && d2.error ? d2.error : 'falha ao autenticar');
                  resultEl.style.color = '#f87171';
                }
              }
            });
          }
        })
        .catch(function (err) {
          signupBtn.disabled = false;
          if (resultEl) { resultEl.textContent = 'Erro de rede: ' + err; resultEl.style.color = '#f87171'; }
        });
      }

      signupBtn.addEventListener('click', doAuth);
      emailEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doAuth(); }
      });
    }
  }

  /* ── Quick config + Obsidian buttons ─────────────────────────── */
  function initQuickConfig() {
    var configBtn = document.getElementById('v299ConfigBtn');
    if (configBtn) {
      configBtn.addEventListener('click', function () {
        var target = document.getElementById('aiProviderSelect');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { target.focus(); }, 300);
          showToast('Configuração de provedor IA ↑');
        } else {
          showToast('Painel de configuração não visível na aba atual.');
        }
      });
    }

    var obsidianBtn = document.getElementById('v299ObsidianBtn');
    if (obsidianBtn) {
      obsidianBtn.addEventListener('click', function () {
        var origText = obsidianBtn.textContent;
        obsidianBtn.disabled = true;
        obsidianBtn.textContent = '…';
        fetch(BACKEND_URL + '/api/obsidian/status')
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (data) {
          var msg = 'Obsidian: ' + (data.connected ? '✅ CONECTADO' : '⚠ desconectado');
          if (data.vault) { msg += ' — vault: ' + data.vault; }
          showToast(msg);
          obsidianBtn.textContent = data.connected ? '✓ Obsidian' : origText;
          obsidianBtn.disabled = false;
        })
        .catch(function (err) {
          showToast('Obsidian: erro — ' + err);
          obsidianBtn.textContent = origText;
          obsidianBtn.disabled = false;
        });
      });
    }
  }

  checkBackendHealth();
  window.addEventListener('load', function () { checkBackendHealth(); });
  /* Chat init guaranteed independent of DOMContentLoaded chain errors */
  window.addEventListener('load', function () { initMainChat(); });

  function _runAllInits() {
    try { init(); } catch (e) { console.error('[vc] init:', e); }
    try { initReserve(); } catch (e) { console.error('[vc] initReserve:', e); }
    try { initProjectBuilder(); } catch (e) { console.error('[vc] initProjectBuilder:', e); }
    try { initTemplatePacks(); } catch (e) { console.error('[vc] initTemplatePacks:', e); }
    try { initMissionComposer(); } catch (e) { console.error('[vc] initMissionComposer:', e); }
    try { initWorkerHandoff(); } catch (e) { console.error('[vc] initWorkerHandoff:', e); }
    try { initProjectExportPreview(); } catch (e) { console.error('[vc] initProjectExportPreview:', e); }
    try { initHumanApprovalGate(); } catch (e) { console.error('[vc] initHumanApprovalGate:', e); }
    try { initRealFileCommandPackage(); } catch (e) { console.error('[vc] initRealFileCommandPackage:', e); }
    try { initWorkerResultReceipt(); } catch (e) { console.error('[vc] initWorkerResultReceipt:', e); }
    try { initFinalProductDashboard(); } catch (e) { console.error('[vc] initFinalProductDashboard:', e); }
    try { initSoftwareFactoryPage(); } catch (e) { console.error('[vc] initSoftwareFactoryPage:', e); }
    try { initMainChat(); } catch (e) { console.error('[vc] initMainChat:', e); }
    try { initAuthModal(); } catch (e) { console.error('[vc] initAuthModal:', e); }
    try { initQuickConfig(); } catch (e) { console.error('[vc] initQuickConfig:', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _runAllInits);
  } else {
    _runAllInits();
  }
})();
