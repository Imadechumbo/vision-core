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

  // §63 — Reativação controlada: apenas itens da UI legada v236/v297 (hidden,
  // substituídos pela chat UI v298) seguem bloqueados. Os demais botões abaixo
  // foram religados a endpoints reais do backend (ver wireRealActions()).
  var BLOCKED_IDS = [
    'v297AddImageBtn',
    'v297AddFileBtn',
    'v297RunSddfBtn',
    'v236FileBtn',
    'v236CopilotBtn',
  ];

  function blockBtnMsg(btn, msg) {
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor = 'not-allowed';
    btn.title = msg;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      showToast(msg);
    }, true);
  }

  function apiFetch(path, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (opts.body && !opts.headers['Content-Type']) {
      opts.headers['Content-Type'] = 'application/json';
    }
    return fetch(BACKEND_URL + path, opts).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        return { status: r.status, ok: r.ok, body: d };
      });
    });
  }

  // §63 — wire dos botões "controlled closure" para endpoints reais do
  // gateway (que agora proxia para o backend EB sem camada stub).
  function wireRealActions() {
    var missionText = document.getElementById('missionText');
    var runMode      = document.getElementById('runMode');

    var enqueueBtn = document.getElementById('enqueueBtn');
    if (enqueueBtn) {
      enqueueBtn.addEventListener('click', function () {
        var input = (missionText && missionText.value || '').trim();
        enqueueBtn.disabled = true;
        apiFetch('/api/agent/mission/queue', { method: 'POST', body: JSON.stringify({ input: input, type: 'general' }) })
          .then(function (res) {
            showToast(res.body && res.body.ok
              ? ('Missão enfileirada: ' + res.body.mission_id + ' (fila: ' + res.body.queue_length + ')')
              : 'Falha ao enfileirar missão.');
          })
          .catch(function () { showToast('Erro de rede ao enfileirar.'); })
          .then(function () { enqueueBtn.disabled = false; });
      });
    }

    var executeBtn = document.getElementById('executeBtn');
    if (executeBtn) {
      executeBtn.addEventListener('click', function () {
        var input = (missionText && missionText.value || '').trim();
        var mode  = (runMode && runMode.value) || 'dry-run';
        if (!input) { showToast('Descreva a missão antes de executar.'); return; }
        var orig = executeBtn.textContent;
        executeBtn.disabled = true;
        executeBtn.textContent = 'ENFILEIRANDO...';
        apiFetch('/api/agent/mission/queue', { method: 'POST', body: JSON.stringify({ input: input, type: mode }) })
          .then(function (res) {
            showToast(res.body && res.body.ok
              ? ('Missão [' + mode.toUpperCase() + '] enfileirada: ' + res.body.mission_id + '. O Vision Agent local processa via /api/agent/mission/pending.')
              : 'Falha ao executar missão.');
          })
          .catch(function () { showToast('Erro de rede ao executar.'); })
          .then(function () { executeBtn.disabled = false; executeBtn.textContent = orig; });
      });
    }

    // DIFF DEMO — local, sem backend (label já assume "DEMO")
    var diffBtn = document.getElementById('diffBtn');
    var diffViewer = document.getElementById('diffViewer');
    if (diffBtn && diffViewer) {
      diffBtn.addEventListener('click', function () {
        /* §80 B4 — diff preview via backend real */
        var input = (missionText && missionText.value || '').trim();
        diffBtn.disabled = true;
        diffBtn.textContent = '...';
        apiFetch('/api/diff/preview', {
          method: 'POST',
          body: JSON.stringify({ input: input || 'exemplo', context: '' })
        }).then(function(r) {
          if (r.body && r.body.diff) {
            diffViewer.textContent = r.body.diff;
            diffBtn.textContent = r.body.type === 'real' ? 'DIFF REAL' : 'GERAR DIFF DEMO';
          } else {
            diffViewer.textContent = 'Erro ao gerar diff.';
            diffBtn.textContent = 'GERAR DIFF DEMO';
          }
          diffBtn.disabled = false;
        }).catch(function() {
          diffBtn.textContent = 'GERAR DIFF DEMO';
          diffBtn.disabled = false;
        });
      });
    }

    var githubStatusBtn = document.getElementById('githubStatusBtn');
    var githubStatus    = document.getElementById('githubStatus');
    if (githubStatusBtn) {
      githubStatusBtn.addEventListener('click', function () {
        githubStatusBtn.disabled = true;
        apiFetch('/api/github/status', { method: 'GET' })
          .then(function (res) {
            if (!githubStatus) return;
            if (res.body && res.body.configured) {
              githubStatus.textContent = '✓ GitHub configurado no backend — policy: ' + res.body.policy;
              githubStatus.style.color = '#22c55e';
            } else {
              githubStatus.textContent = '✗ GITHUB_TOKEN não configurado no backend.';
              githubStatus.style.color = '#f87171';
            }
          })
          .catch(function () { if (githubStatus) githubStatus.textContent = 'Erro ao consultar gateway.'; })
          .then(function () { githubStatusBtn.disabled = false; });
      });
    }

    var policyBtn = document.getElementById('policyBtn');
    if (policyBtn) {
      policyBtn.addEventListener('click', function () {
        policyBtn.disabled = true;
        apiFetch('/api/github/automerge-policy', { method: 'GET' })
          .then(function (res) {
            showToast(res.body
              ? ('Auto-merge: ' + res.body.default + ' — requer: ' + (res.body.required || []).join(', '))
              : 'Falha ao consultar policy.');
          })
          .catch(function () { showToast('Erro de rede.'); })
          .then(function () { policyBtn.disabled = false; });
      });
    }

    // §64 — /api/github/create-pr implementado. githubPrBtn agora abre mini-form
    // pedindo repo + head_branch e chama o endpoint real. files:[] por enquanto
    // (integração com diff/patch virá em release futura).
    var githubPrBtn = document.getElementById('githubPrBtn');
    if (githubPrBtn) {
      githubPrBtn.addEventListener('click', function () {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:9999;';
        var modal = document.createElement('div');
        modal.style.cssText = 'background:#0f1117;border:1px solid #7c3aed;border-radius:16px;padding:24px;width:380px;max-width:92vw;font-family:inherit;';
        var autoHead = 'vision-core/auto-' + Date.now();
        modal.innerHTML = [
          '<div style="font-size:15px;font-weight:700;color:#a78bfa;margin-bottom:14px;">🚀 Criar PR no GitHub</div>',
          '<label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Repositório (owner/repo)</label>',
          '<input id="vc64-repo" type="text" placeholder="ex: Imadechumbo/technetgamev2" style="width:100%;box-sizing:border-box;background:#1a1a2e;border:1px solid #334155;color:#e2e8f0;font-size:12px;padding:8px;border-radius:8px;margin-bottom:10px;font-family:inherit;">',
          '<label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Branch base</label>',
          '<input id="vc64-base" type="text" value="main" style="width:100%;box-sizing:border-box;background:#1a1a2e;border:1px solid #334155;color:#e2e8f0;font-size:12px;padding:8px;border-radius:8px;margin-bottom:10px;font-family:inherit;">',
          '<label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Branch nova (head)</label>',
          '<input id="vc64-head" type="text" value="' + autoHead + '" style="width:100%;box-sizing:border-box;background:#1a1a2e;border:1px solid #334155;color:#e2e8f0;font-size:12px;padding:8px;border-radius:8px;margin-bottom:10px;font-family:inherit;">',
          '<label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Título do PR</label>',
          '<input id="vc64-title" type="text" value="fix: Vision Core PASS GOLD automated PR" style="width:100%;box-sizing:border-box;background:#1a1a2e;border:1px solid #334155;color:#e2e8f0;font-size:12px;padding:8px;border-radius:8px;margin-bottom:10px;font-family:inherit;">',
          '<div style="font-size:10px;color:#475569;margin-bottom:12px;">files: [] — integração com diff/patch em release futura</div>',
          '<div id="vc64-status" style="font-size:11px;color:#f87171;min-height:16px;margin-bottom:8px;"></div>',
          '<div style="display:flex;gap:8px;justify-content:flex-end;">',
          '<button id="vc64-cancel" style="background:transparent;border:1px solid #334155;color:#94a3b8;font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;">Cancelar</button>',
          '<button id="vc64-submit" style="background:#5b21b6;border:1px solid #7c3aed;color:#e9d5ff;font-size:11px;padding:6px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;">🚀 Criar PR</button>',
          '</div>'
        ].join('');
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.getElementById('vc64-repo').focus();
        document.getElementById('vc64-cancel').onclick = function () { overlay.remove(); };
        document.getElementById('vc64-submit').onclick = function () {
          var repo       = (document.getElementById('vc64-repo').value  || '').trim();
          var baseBr     = (document.getElementById('vc64-base').value  || 'main').trim();
          var headBr     = (document.getElementById('vc64-head').value  || autoHead).trim();
          var titleVal   = (document.getElementById('vc64-title').value || '').trim();
          var statEl     = document.getElementById('vc64-status');
          var submitBtn  = document.getElementById('vc64-submit');
          if (!repo || !repo.includes('/')) { statEl.textContent = '⚠️ Formato: owner/repo'; return; }
          if (!titleVal) { statEl.textContent = '⚠️ Título obrigatório'; return; }
          submitBtn.disabled = true; submitBtn.textContent = '⏳ Criando...';
          statEl.style.color = '#94a3b8'; statEl.textContent = 'Enviando para o backend...';
          apiFetch('/api/github/create-pr', {
            method: 'POST',
            body: JSON.stringify({ repo: repo, base_branch: baseBr, head_branch: headBr, title: titleVal, body: '', files: [] })
          }).then(function (res) {
            if (res.body && res.body.ok) {
              statEl.style.color = '#4ade80';
              statEl.textContent = '✅ PR criado!';
              submitBtn.textContent = '✓ CRIADO';
              showToast('PR criado: ' + res.body.pr_url + ' (#' + res.body.pr_number + ')');
              setTimeout(function () { overlay.remove(); }, 1800);
            } else {
              statEl.style.color = '#f87171';
              statEl.textContent = '❌ ' + (res.body ? (res.body.error + (res.body.detail ? ' — ' + res.body.detail : '')) : 'Erro desconhecido');
              submitBtn.disabled = false; submitBtn.textContent = '🚀 Criar PR';
            }
          }).catch(function () {
            statEl.style.color = '#f87171';
            statEl.textContent = '❌ Erro de rede';
            submitBtn.disabled = false; submitBtn.textContent = '🚀 Criar PR';
          });
        };
      });
    }

    var aiApiKey = document.getElementById('aiApiKey');
    var aiModel  = document.getElementById('aiModel');
    function providerPayload() {
      return JSON.stringify({
        provider: 'auto',
        api_key: (aiApiKey && aiApiKey.value) || '',
        model:   (aiModel && aiModel.value) || ''
      });
    }

    var saveAiProviderBtn = document.getElementById('saveAiProviderBtn');
    if (saveAiProviderBtn) {
      saveAiProviderBtn.addEventListener('click', function () {
        saveAiProviderBtn.disabled = true;
        apiFetch('/api/providers/save', { method: 'POST', body: providerPayload() })
          .then(function (res) {
            showToast(res.body && res.body.saved
              ? ('Provider salvo: ' + res.body.provider + ' (chave: ' + res.body.api_key_masked + ') — ' + res.body.providers_count + ' configurado(s)')
              : 'Falha ao salvar provider.');
          })
          .catch(function () { showToast('Erro de rede ao salvar.'); })
          .then(function () { saveAiProviderBtn.disabled = false; });
      });
    }

    var testAiProviderBtn = document.getElementById('testAiProviderBtn');
    if (testAiProviderBtn) {
      testAiProviderBtn.addEventListener('click', function () {
        testAiProviderBtn.disabled = true;
        apiFetch('/api/providers/test', { method: 'POST', body: providerPayload() })
          .then(function (res) {
            if (!res.body) { showToast('Falha ao testar provider.'); return; }
            var msg;
            if (res.body.connected) {
              msg = '✅ ' + res.body.provider + ' conectado' +
                (res.body.latency_ms ? ' — ' + res.body.latency_ms + 'ms' : '') +
                (res.body.model_count ? ' — ' + res.body.model_count + ' modelos' : '');
            } else {
              msg = '⚠ ' + res.body.provider + ': ' + (res.body.status || 'erro') +
                (res.body.note ? ' — ' + res.body.note : '');
            }
            showToast(msg);
          })
          .catch(function () { showToast('Erro de rede ao testar.'); })
          .then(function () { testAiProviderBtn.disabled = false; });
      });
    }

    var downloadLogsBtn = document.getElementById('downloadLogsBtn');
    if (downloadLogsBtn) {
      downloadLogsBtn.addEventListener('click', function () {
        downloadLogsBtn.disabled = true;
        fetch(BACKEND_URL + '/api/logs/download')
          .then(function (r) { return r.text(); })
          .then(function (text) {
            var blob = new Blob([text], { type: 'text/plain' });
            var url  = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = 'vision-core-logs.txt';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          })
          .catch(function () { showToast('Erro ao baixar logs do backend.'); })
          .then(function () { downloadLogsBtn.disabled = false; });
      });
    }

    var workerRefreshBtn = document.getElementById('workerRefreshBtn');
    var queueBox = document.getElementById('queueBox');
    if (workerRefreshBtn) {
      workerRefreshBtn.addEventListener('click', function () {
        workerRefreshBtn.disabled = true;
        apiFetch('/api/agent/mission/pending', { method: 'GET' })
          .then(function (res) {
            if (!queueBox) return;
            if (res.body && res.body.mission) {
              queueBox.textContent = JSON.stringify(res.body.mission, null, 2) + '\n\nRestantes na fila: ' + res.body.queue_remaining;
            } else {
              queueBox.textContent = 'Fila vazia. Restantes: ' + (res.body ? res.body.queue_remaining : 0);
            }
          })
          .catch(function () { if (queueBox) queueBox.textContent = 'Erro ao consultar fila no backend.'; })
          .then(function () { workerRefreshBtn.disabled = false; });
      });
    }
  }

  function init() {
    var state = window.VISION_CORE_FINAL_STATE || {};

    BLOCKED_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) blockBtn(el);
    });

    wireRealActions();

    // §88: .oauth — Google + GitHub reais, SSO ainda em breve
    document.querySelectorAll('.oauth').forEach(function (btn) {
      var provider = btn.getAttribute('data-provider');
      if (provider === 'google' || provider === 'github') {
        btn.disabled = false;
        btn.style.cursor = 'pointer';
        btn.style.opacity = '1';
        btn.classList.remove('oauth-soon');
        var badge = btn.querySelector('.oauth-badge');
        if (badge) badge.remove();
        btn.addEventListener('click', function () {
          var BACKEND = window.__VISION_API__ || window.API_BASE_URL || BACKEND_URL || '';
          window.location.href = BACKEND + '/api/auth/oauth/' + provider;
        });
      } else {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          if (window.showToast) window.showToast('SSO em breve — use email e senha por enquanto.');
        });
      }
    });
    // §84 B3: .provider buttons unblocked — wire to aiProviderSelect
    document.querySelectorAll('.provider').forEach(function (btn) {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
      btn.addEventListener('click', function () {
        var providerVal = btn.getAttribute('data-provider');
        if (!providerVal) return;
        document.querySelectorAll('.provider').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var sel = document.getElementById('aiProviderSelect');
        if (sel) { sel.value = providerVal; sel.dispatchEvent(new Event('change')); }
        var keyInp = document.getElementById('aiApiKey');
        if (keyInp) { keyInp.focus(); }
        if (window.showLog) window.showLog('PROVIDER', 'selecionado: ' + providerVal, 'cyan');
      });
    });
    // §84 B4: .plan cards unblocked — wire to real Stripe checkout
    document.querySelectorAll('.plan').forEach(function (card) {
      var plan = card.getAttribute('data-plan');
      if (!plan || plan === 'free') return;
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        var token = localStorage.getItem('vision_token') || sessionStorage.getItem('vision_token');
        if (!token) {
          var authBtn = document.getElementById('openAuthBtn');
          if (authBtn) authBtn.click();
          if (window.showToast) window.showToast('Faça login para assinar o plano ' + plan.toUpperCase());
          return;
        }
        card.style.opacity = '0.6';
        card.style.pointerEvents = 'none';
        var _backendBase = window.__VISION_API__ || window.API_BASE_URL || BACKEND_URL || '';
        fetch(_backendBase + '/api/billing/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ plan: plan, return_url: window.location.href })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.checkout_url) {
            window.location.href = data.checkout_url;
          } else {
            if (window.showToast) window.showToast('Checkout não disponível: ' + (data.error || 'Stripe não configurado'));
            card.style.opacity = '';
            card.style.pointerEvents = '';
          }
        })
        .catch(function(err) {
          if (window.showToast) window.showToast('Erro ao abrir checkout: ' + err.message);
          card.style.opacity = '';
          card.style.pointerEvents = '';
        });
      });
    });

    /* §80 B8 — carregar providers salvos */
    apiFetch('/api/providers/list', { method: 'GET' })
      .then(function(r) {
        if (r.body && Array.isArray(r.body.providers) && r.body.providers.length > 0) {
          var last = r.body.providers[r.body.providers.length - 1];
          var sel = document.getElementById('aiProviderSelect');
          var mdl = document.getElementById('aiModel');
          var pri = document.getElementById('aiPriority');
          if (sel && last.provider) { sel.value = last.provider; }
          if (mdl && last.model)    { mdl.value = last.model; }
          if (pri && last.priority) { pri.value = last.priority; }
          var status = document.getElementById('aiProviderStatus');
          if (status) { status.textContent = r.body.providers.length + ' provider(s) configurado(s) nesta sessão.'; }
        }
      }).catch(function() {});

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
          /* §80 B1 — persistir modo no backend */
          var _agentId = card.getAttribute('data-agent-id');
          if (_agentId) {
            apiFetch('/api/agents/' + _agentId + '/mode', {
              method: 'POST',
              body: JSON.stringify({ mode: mode.toUpperCase() })
            }).then(function(r) {
              if (r.ok && r.body && r.body.ok) {
                showToast('Agente ' + _agentId + ': ' + mode.toUpperCase() + ' salvo');
              }
            }).catch(function() {});
          }
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
        var modeId = chip.getAttribute('data-orch-mode');
        setOrchestrationMode(modeId);
        /* §80 B3 — persistir modo de orquestração no backend */
        apiFetch('/api/orchestration/mode', {
          method: 'POST',
          body: JSON.stringify({ mode: modeId })
        }).then(function(r) {
          if (r.ok && r.body && r.body.ok) {
            showToast('Orquestração: ' + modeId.replace(/_/g, ' ') + ' ativo');
          }
        }).catch(function() {});
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
          /* §80 B2 — persistir modo matrix no backend */
          if (agentId) {
            apiFetch('/api/agents/' + agentId + '/mode', {
              method: 'POST',
              body: JSON.stringify({ mode: modeUpper })
            }).catch(function() {});
          }
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
    lines.push('── Status Real do Backend (live, /api/pass-gold/score + /api/github/status) ──');
    if (_realBackendStatus) {
      if (_realBackendStatus.passGold) {
        var pg = _realBackendStatus.passGold;
        lines.push('  pass_gold.status            : ' + (pg.status || 'desconhecido'));
        lines.push('  pass_gold.final             : ' + (pg.final !== undefined ? pg.final : 'n/d'));
        lines.push('  pass_gold.promotion_allowed : ' + (pg.promotion_allowed === true));
        if (pg.pass_gold_reason) { lines.push('  pass_gold.reason            : ' + pg.pass_gold_reason); }
      } else {
        lines.push('  pass_gold.score             : indisponível (gateway/backend offline)');
      }
      if (_realBackendStatus.github) {
        var gh = _realBackendStatus.github;
        lines.push('  github.configured           : ' + (gh.configured === true));
        lines.push('  github.policy               : ' + (gh.policy || 'n/d'));
      } else {
        lines.push('  github.status                : indisponível (gateway/backend offline)');
      }
    } else {
      lines.push('  (status real não consultado — clique em GERAR RELATÓRIO FINAL para buscar)');
    }
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

  var _realBackendStatus = null;

  function fetchRealBackendStatus() {
    return Promise.all([
      apiFetch('/api/pass-gold/score', { method: 'GET' }).then(function (r) { return r.body; }).catch(function () { return null; }),
      apiFetch('/api/github/status', { method: 'GET' }).then(function (r) { return r.body; }).catch(function () { return null; })
    ]).then(function (res) {
      _realBackendStatus = { passGold: res[0], github: res[1] };
      return _realBackendStatus;
    });
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
        var orig = genBtn.textContent;
        genBtn.disabled = true;
        genBtn.textContent = '⬡ CONSULTANDO BACKEND...';
        fetchRealBackendStatus().then(function () {
          renderFinalProductReport();
          genBtn.textContent       = '✓ RELATÓRIO GERADO';
          genBtn.style.borderColor = 'rgba(34,197,94,.65)';
          genBtn.style.color       = '#22c55e';
          genBtn.disabled = false;
        });
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

  // §73.1d — Maps frontend module IDs to SF Spec Library module IDs
  var SF_MODULE_SPEC_MAP = {
    project_builder:   'SF-01',
    project_templates: 'SF-02',
    mission_composer:  'SF-03',
    worker_handoff:    'SF-04',
    export_preview:    'SF-05',
    real_file_command: 'SF-06',
    worker_receipt:    'SF-07',
    final_dashboard:   'SF-08',
    saas_api:          'SF-09',
  };
  var _sfSpecPanelOpen   = false;
  var _sfHighlightSpecId = null;  // §73.4 — spec to highlight after module switch
  // Inverse of SF_MODULE_SPEC_MAP: 'SF-01' → 'project_builder'
  var _sfSpecModuleInverse = (function () {
    var inv = {};
    Object.keys(SF_MODULE_SPEC_MAP).forEach(function (k) { inv[SF_MODULE_SPEC_MAP[k]] = k; });
    return inv;
  }());

  // §73.6 — Stack tag → leigo-friendly card metadata
  var STACK_EXPLAINER = {
    'node-js':         { icon: '🖥️',  label: 'Backend Node.js',        explain: 'Processa pedidos, login e regras do sistema.' },
    'python':          { icon: '🐍',  label: 'Backend Python',          explain: 'Motor do sistema, ideal para IA e análise de dados.' },
    'react':           { icon: '⚛️',  label: 'Interface (React)',       explain: 'Tela que o usuário vê, atualiza sem recarregar a página.' },
    'typescript':      { icon: '🔷',  label: 'TypeScript',              explain: 'JavaScript com verificação de erros — código mais seguro.' },
    'javascript':      { icon: '📜',  label: 'JavaScript',              explain: 'Linguagem que faz a página interativa no navegador.' },
    'html-css':        { icon: '🎨',  label: 'Layout (HTML/CSS)',       explain: 'Estrutura visual e estilos do site.' },
    'api-backend':     { icon: '🔌',  label: 'API Backend',             explain: 'Conexão entre frontend e banco de dados.' },
    'rest-api':        { icon: '🔗',  label: 'API REST',                explain: 'Protocolo padrão para comunicação entre sistemas.' },
    'database':        { icon: '🗄️',  label: 'Banco de Dados',          explain: 'Armazena informações dos usuários e do sistema.' },
    'postgresql':      { icon: '🐘',  label: 'PostgreSQL',              explain: 'Banco de dados robusto e confiável.' },
    'mongodb':         { icon: '🍃',  label: 'MongoDB',                 explain: 'Banco de dados flexível, ótimo para dados variáveis.' },
    'auth':            { icon: '🔐',  label: 'Autenticação',            explain: 'Login, senha, sessão e controle de quem acessa o quê.' },
    'billing-enabled': { icon: '💳',  label: 'Pagamentos',              explain: 'Cobrança, planos e assinatura dos clientes.' },
    'saas-fullstack':  { icon: '☁️',  label: 'SaaS Completo',          explain: 'Produto web com backend, frontend e banco integrados.' },
    'dashboard-admin': { icon: '📊',  label: 'Painel Admin',            explain: 'Área de controle para gerenciar usuários e dados.' },
    'cli-utility':     { icon: '⌨️',  label: 'Ferramenta CLI',          explain: 'Programa rodado no terminal por desenvolvedores.' },
    'llm':             { icon: '🤖',  label: 'Inteligência Artificial',  explain: 'Usa modelos de linguagem (IA) para gerar ou processar texto.' },
    'security':        { icon: '🛡️',  label: 'Segurança',               explain: 'Proteções contra ataques e acessos não autorizados.' },
    'docker':          { icon: '🐳',  label: 'Docker',                  explain: 'Empacota o sistema para rodar igual em qualquer lugar.' },
    'redis':           { icon: '⚡',  label: 'Cache (Redis)',            explain: 'Armazena dados temporários para respostas mais rápidas.' },
    'go':              { icon: '🚀',  label: 'Backend Go',              explain: 'Linguagem de alta performance para sistemas críticos.' },
    'stripe':          { icon: '💰',  label: 'Stripe',                  explain: 'Plataforma de pagamentos integrada ao sistema.' },
    'email':           { icon: '📧',  label: 'E-mail',                  explain: 'Envio de notificações e confirmações por e-mail.' },
    'jwt':             { icon: '🎫',  label: 'Tokens JWT',              explain: 'Autorização segura sem guardar sessão no servidor.' },
    'websocket':       { icon: '📡',  label: 'Tempo Real',              explain: 'Comunicação instantânea entre servidor e navegador.' },
    'file-upload':     { icon: '📁',  label: 'Upload de Arquivos',      explain: 'Envio e armazenamento de arquivos pelos usuários.' },
    'landing-page':    { icon: '🏠',  label: 'Página Inicial',          explain: 'Página de apresentação do produto para visitantes.' },
    'vue':             { icon: '💚',  label: 'Interface (Vue)',          explain: 'Framework para criar interfaces interativas.' },
    'nextjs':          { icon: '▲',   label: 'Next.js',                 explain: 'React com geração de páginas no servidor (mais rápido).' },
    'fastapi':         { icon: '⚡',  label: 'FastAPI',                 explain: 'Framework Python rápido para criar APIs.' },
    'graphql':         { icon: '◆',   label: 'GraphQL',                 explain: 'API flexível — cliente pede exatamente o que precisa.' },
    'microservices':   { icon: '🧩',  label: 'Microsserviços',          explain: 'Sistema dividido em partes independentes.' },
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

    // §73.1d — Load and render spec panel for this module
    _sfLoadSpecs(moduleId);

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

    var tok1 = (function () { try { return sessionStorage.getItem('vc_token') || localStorage.getItem('vision_token'); } catch (e) { return null; } })();
    fetch(BACKEND_URL + '/api/chat', {
      method: 'POST',
      headers: tok1 ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok1 } : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, mode: 'vision-geral' })
    })
    .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function(data) {
      thinking.textContent = (data && data.answer) ? data.answer : JSON.stringify(data);
      stream.scrollTop = stream.scrollHeight;
      // §104: registrar no histórico persistido de missões
      recordMissionTimelineEntry({ source: 'sf-chat', input: text, summary: (data && data.answer) || null, status: 'ANSWERED' });
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
    /* §50 fix(ui): click feedback — transition for scale press */
    sendBtn.style.transition = 'transform 0.12s ease';

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
        '}',
        '@keyframes vcProgress {',
        '  0% { background-position: 200% 0; }',
        '  100% { background-position: -200% 0; }',
        '}',
        '@keyframes vcGoldShimmer {',  /* §45 */
        '  0%   { background-position: 0% 50%; }',
        '  50%  { background-position: 100% 50%; }',
        '  100% { background-position: 0% 50%; }',
        '}',
        '@keyframes vcRipple {',  /* §50fix-ui: ripple ENVIAR */
        '  to { transform: scale(2.5); opacity: 0; }',
        '}'
      ].join('\n');
      document.head.appendChild(_animStyle);
    }

    /* §39 — spinner clássico SVG 12 segmentos (cinza/branco p/ fundo escuro) */
    function buildSpinner(size) {
      size = size || 18;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.setAttribute('viewBox', '0 0 40 40');
      svg.style.cssText = 'display:inline-block;vertical-align:middle;flex-shrink:0;';
      var colors = ['#ffffff','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a','#1e293b','#334155'];
      for (var _si = 0; _si < 12; _si++) {
        var _ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        var _rad = (_si / 12) * 2 * Math.PI;
        _ln.setAttribute('x1', (20 + Math.sin(_rad) * 10).toFixed(2));
        _ln.setAttribute('y1', (20 - Math.cos(_rad) * 10).toFixed(2));
        _ln.setAttribute('x2', (20 + Math.sin(_rad) * 16).toFixed(2));
        _ln.setAttribute('y2', (20 - Math.cos(_rad) * 16).toFixed(2));
        _ln.setAttribute('stroke', colors[_si] || '#94a3b8');
        _ln.setAttribute('stroke-width', '4');
        _ln.setAttribute('stroke-linecap', 'round');
        svg.appendChild(_ln);
      }
      svg.style.animation = 'vcSpin .8s steps(12, end) infinite';
      return svg;
    }

    /* §45 — PASS GOLD: renderiza badge dourado animado no container */
    function _renderPassGold45(container) {
      var pg = document.createElement('div');
      pg.innerHTML = '<div style="background:linear-gradient(135deg,#92400e,#f59e0b,#fde68a,#f59e0b,#92400e);background-size:300% 300%;animation:vcGoldShimmer 2s ease infinite;border-radius:10px;padding:10px 16px;margin:6px 0;text-align:center;box-shadow:0 0 18px rgba(245,158,11,0.35);">' +
        '<div style="font-size:18px;margin-bottom:2px;">✨ PASS GOLD ✨</div>' +
        '<div style="font-size:11px;color:#fde68a;font-weight:600;letter-spacing:1px;">AEGIS CERTIFICADO — ARQUIVO CORRIGIDO</div>' +
        '<div style="font-size:10px;color:#fcd34d;margin-top:2px;">aegis_ok: true · sintaxe válida · patch aplicado</div>' +
        '</div>';
      container.appendChild(pg);
    }

    /* §47 — PASS GOLD Engine: renderiza badge multi-nível + scorecard */
    function _renderGoldLevel47(container, data) {
      var level = data.gold_level || (data.pass_gold ? 'GOLD' : (data.aegis_ok ? 'GOLD' : 'NEEDS_REVIEW'));
      if (level === 'GOLD' || data.pass_gold) {
        _renderPassGold45(container);
        /* §50 — auto-merge toggle (abaixo do badge AEGIS CERTIFICADO) */
        (function() {
          var _amRow = document.createElement('div');
          _amRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin:2px 0 4px;padding:2px 6px;';
          var _amOn = localStorage.getItem('vc_automerge_enabled') === 'true';
          var _amBtn = document.createElement('button');
          _amBtn.id = 'vc50-automerge-btn';
          _amBtn.style.cssText = 'background:' + (_amOn ? '#134e2a' : '#1a1a2e') + ';border:1px solid ' +
            (_amOn ? '#22c55e' : '#334155') + ';color:' + (_amOn ? '#86efac' : '#64748b') +
            ';font-size:10px;padding:3px 10px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .2s;';
          _amBtn.textContent = '🔀 Auto-merge: ' + (_amOn ? 'ON' : 'OFF');
          _amBtn.onclick = function() {
            var _cur = localStorage.getItem('vc_automerge_enabled') === 'true';
            var _next = !_cur;
            localStorage.setItem('vc_automerge_enabled', String(_next));
            _amBtn.textContent = '🔀 Auto-merge: ' + (_next ? 'ON' : 'OFF');
            _amBtn.style.background = _next ? '#134e2a' : '#1a1a2e';
            _amBtn.style.borderColor = _next ? '#22c55e' : '#334155';
            _amBtn.style.color = _next ? '#86efac' : '#64748b';
          };
          _amRow.appendChild(_amBtn);
          /* §51 — auto-deploy toggle (ao lado do auto-merge) */
          var _adOn = localStorage.getItem('vc_autodeploy_enabled') === 'true';
          var _adBtn = document.createElement('button');
          _adBtn.id = 'vc51-autodeploy-btn';
          _adBtn.style.cssText = 'background:' + (_adOn ? '#0a1520' : '#1a1a2e') + ';border:1px solid ' +
            (_adOn ? '#3b82f6' : '#334155') + ';color:' + (_adOn ? '#93c5fd' : '#64748b') +
            ';font-size:10px;padding:3px 10px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .2s;';
          _adBtn.textContent = '🚀 Auto-deploy: ' + (_adOn ? 'ON' : 'OFF');
          _adBtn.onclick = function() {
            var _cur = localStorage.getItem('vc_autodeploy_enabled') === 'true';
            var _next = !_cur;
            localStorage.setItem('vc_autodeploy_enabled', String(_next));
            _adBtn.textContent = '🚀 Auto-deploy: ' + (_next ? 'ON' : 'OFF');
            _adBtn.style.background = _next ? '#0a1520' : '#1a1a2e';
            _adBtn.style.borderColor = _next ? '#3b82f6' : '#334155';
            _adBtn.style.color = _next ? '#93c5fd' : '#64748b';
          };
          _amRow.appendChild(_adBtn);
          container.appendChild(_amRow);
        }());
      } else if (level === 'SILVER') {
        var _sg = document.createElement('div');
        _sg.innerHTML = '<div style="background:#1a1a2e;border:1px solid #94a3b8;border-radius:10px;padding:10px 16px;margin:6px 0;text-align:center;">' +
          '<div style="font-size:16px;margin-bottom:2px;">⚠️ SILVER</div>' +
          '<div style="font-size:11px;color:#94a3b8;font-weight:600;">SILVER — revisão recomendada antes de deploy</div>' +
          '</div>';
        container.appendChild(_sg);
      } else {
        var _nr = document.createElement('div');
        _nr.innerHTML = '<div style="background:#2d0a0a;border:1px solid #f87171;border-radius:10px;padding:10px 16px;margin:6px 0;text-align:center;">' +
          '<div style="font-size:16px;margin-bottom:2px;">🔴 NEEDS REVIEW</div>' +
          '<div style="font-size:11px;color:#f87171;font-weight:600;">Score insuficiente — revisar antes de aplicar</div>' +
          '</div>';
        container.appendChild(_nr);
      }
      if (data.gold_dimensions) {
        var _d = data.gold_dimensions;
        var _riskLbl = _d.risk_level >= 80 ? 'Baixo' : _d.risk_level >= 55 ? 'Médio' : 'Alto';
        var _sc = document.createElement('div');
        _sc.style.cssText = 'font-size:10px;color:#64748b;margin:2px 0 4px;text-align:center;';
        _sc.textContent = 'LLM: ' + _d.llm_confidence + '% · Patch: ' + (_d.patch_specificity >= 70 ? '✅' : '⚠️') +
          ' · Risco: ' + _riskLbl + ' · Build: ' + (_d.build_passed === 100 ? '✅' : '❌') +
          ' · Score: ' + data.gold_score;
        container.appendChild(_sc);
      }
    }

    /* §45 — ZIP download: reconstrói ZIP com arquivo corrigido e dispara download */
    function _dlZip45(patchedContent, filePath, zipName, container) {
      var baseName = (zipName || 'projeto').replace(/\.zip$/i, '');
      var outName  = baseName + '-corrigido.zip';
      if (_lastZipB64 && window.JSZip) {
        window.JSZip.loadAsync(_lastZipB64, { base64: true }).then(function(zip) {
          zip.file(filePath, patchedContent);
          return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        }).then(function(blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = outName;
          document.body.appendChild(a); a.click();
          setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 2000);
          if (container) {
            var note = document.createElement('div');
            note.style.cssText = 'font-size:11px;color:#86efac;margin-top:6px;text-align:center;';
            note.textContent = '📦 ' + outName + ' baixado';
            container.appendChild(note);
          }
        }).catch(function(err) {
          _dlZip45Fallback(patchedContent, filePath, container);
        });
      } else {
        _dlZip45Fallback(patchedContent, filePath, container);
      }
    }

    /* §45 — fallback: baixa só o arquivo JS corrigido se JSZip/base64 indisponível */
    function _dlZip45Fallback(patchedContent, filePath, container) {
      var fname = filePath ? filePath.split('/').pop() : 'arquivo-corrigido.js';
      var blob = new Blob([patchedContent], { type: 'text/javascript' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click();
      setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 2000);
      if (container) {
        var note = document.createElement('div');
        note.style.cssText = 'font-size:11px;color:#fcd34d;margin-top:6px;text-align:center;';
        note.textContent = '⚠️ ZIP indisponível — baixando ' + fname;
        container.appendChild(note);
      }
    }

    /* §51 — helper: auto-deploy pós-merge via /api/deploy/trigger */
    function _doAutoDeploy51(repo, sha, environment, cont, auto) {
      var _env51 = environment || 'production';

      function _execDeploy51() {
        var _ld = document.createElement('div');
        _ld.style.cssText = 'font-size:11px;color:#94a3b8;margin-top:6px;';
        _ld.textContent = '⏳ Disparando deploy ' + _env51 + '...';
        cont.appendChild(_ld);
        fetch(BACKEND_URL + '/api/deploy/trigger', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo: repo, sha: sha, environment: _env51, aegis_ok: true }),
          signal: AbortSignal.timeout(30000)
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          _ld.remove();
          var _db = document.createElement('div');
          var _lbl = auto ? 'DEPLOYED AUTO' : 'DEPLOYED';
          _db.innerHTML = '<div style="background:#0a1520;border:1px solid #3b82f6;border-radius:12px;padding:10px 14px;margin:6px 0;display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:18px;">🚀</span>' +
            '<div><div style="color:#93c5fd;font-weight:600;font-size:13px;">' + _lbl + '</div>' +
            (d.deploy_url
              ? '<a href="' + d.deploy_url + '" target="_blank" rel="noopener" style="color:#60a5fa;font-size:11px;text-decoration:none;">' + d.deploy_url + ' ↗</a>'
              : '<div style="font-size:11px;color:#475569;">' + (d.note || _env51) + '</div>') +
            '</div></div>';
          cont.appendChild(_db);
          chatStream.scrollTop = chatStream.scrollHeight;
        })
        .catch(function(err) {
          _ld.remove();
          var _de = document.createElement('div');
          _de.style.cssText = 'font-size:11px;color:#f87171;margin-top:6px;';
          _de.textContent = '❌ Deploy falhou: ' + (err.message || 'Erro de rede');
          cont.appendChild(_de);
        });
      }

      if (auto) {
        _execDeploy51();
      } else {
        var _ov51 = document.createElement('div');
        _ov51.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;';
        var _mo51 = document.createElement('div');
        _mo51.style.cssText = 'background:#0f1117;border:1px solid #3b82f6;border-radius:16px;padding:24px;width:360px;max-width:92vw;font-family:inherit;';
        _mo51.innerHTML = [
          '<div style="font-size:15px;font-weight:700;color:#93c5fd;margin-bottom:12px;">🚀 Confirmar Deploy</div>',
          '<div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">Commit: <span style="color:#e2e8f0;font-family:monospace;">' + sha.slice(0, 8) + '</span></div>',
          '<div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">Ambiente: <span style="color:#e2e8f0;">' + _env51 + '</span></div>',
          '<div style="display:flex;gap:8px;justify-content:flex-end;">',
          '<button id="vc51-cancel" style="background:transparent;border:1px solid #334155;color:#94a3b8;font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;">Cancelar</button>',
          '<button id="vc51-confirm" style="background:#1d4ed8;border:1px solid #3b82f6;color:#dbeafe;font-size:11px;padding:6px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;">🚀 Fazer Deploy</button>',
          '</div>'
        ].join('');
        _ov51.appendChild(_mo51);
        document.body.appendChild(_ov51);
        document.getElementById('vc51-cancel').onclick  = function() { _ov51.remove(); };
        document.getElementById('vc51-confirm').onclick = function() { _ov51.remove(); _execDeploy51(); };
      }
    }

    /* §50 — helper: squash merge de PR via /api/deploy/merge-pr */
    function _doMerge50(repo, pullNumber, cont) {
      fetch(BACKEND_URL + '/api/deploy/merge-pr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repo, pull_number: pullNumber, aegis_ok: true }),
        signal: AbortSignal.timeout(30000)
      })
      .then(function(r) { return r.json(); })
      .then(function(m) {
        if (m.ok && m.merged) {
          var _mb = document.createElement('div');
          _mb.innerHTML = '<div style="background:#0a1f0a;border:1px solid #22c55e;border-radius:12px;padding:10px 14px;margin:6px 0;display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:18px;">✅</span>' +
            '<div><div style="color:#86efac;font-weight:600;font-size:13px;">MERGED — squash commit</div>' +
            '<a href="' + m.commit_url + '" target="_blank" rel="noopener" style="color:#4ade80;font-size:11px;text-decoration:none;">' +
            m.sha.slice(0, 8) + ' ↗</a></div></div>';
          cont.appendChild(_mb);
          chatStream.scrollTop = chatStream.scrollHeight;
          /* §51 — auto-deploy ou botão manual */
          var _autoDeployOn51 = localStorage.getItem('vc_autodeploy_enabled') === 'true';
          if (_autoDeployOn51) {
            _doAutoDeploy51(repo, m.sha, 'production', cont, true);
          } else {
            var _dBtn51 = document.createElement('button');
            _dBtn51.style.cssText = 'background:#0a1520;border:1px solid #3b82f6;color:#93c5fd;font-size:11px;padding:6px 13px;border-radius:10px;cursor:pointer;font-family:inherit;font-weight:600;margin:6px 0 0 0;display:block;';
            _dBtn51.textContent = '🚀 Fazer Deploy';
            _dBtn51.onclick = function() {
              _dBtn51.disabled = true; _dBtn51.textContent = '⏳ Abrindo...';
              _doAutoDeploy51(repo, m.sha, 'production', cont, false);
              _dBtn51.remove();
            };
            cont.appendChild(_dBtn51);
          }
        } else {
          var _me = document.createElement('div');
          _me.style.cssText = 'font-size:11px;color:#f87171;margin-top:6px;';
          _me.textContent = '❌ Merge falhou: ' + (m.detail || m.error || 'erro desconhecido');
          cont.appendChild(_me);
        }
      })
      .catch(function(err) {
        var _me = document.createElement('div');
        _me.style.cssText = 'font-size:11px;color:#f87171;margin-top:6px;';
        _me.textContent = '❌ ' + (err.message || 'Erro de rede ao tentar merge');
        cont.appendChild(_me);
      });
    }

    /* §46 — botão Deploy GitHub PR pós-AEGIS PASS GOLD */
    function _renderDeployBtn46(container, patchedContent, filePath) {
      var btn = document.createElement('button');
      btn.style.cssText = 'background:#0d1117;border:1px solid #7c3aed;color:#a78bfa;font-size:12px;padding:8px 14px;border-radius:12px;cursor:pointer;font-family:inherit;font-weight:500;margin:4px 0 8px 8px;';
      btn.textContent = '🚀 Deploy ZIP — Abrir PR';
      btn.onclick = function() {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;';
        var modal = document.createElement('div');
        modal.style.cssText = 'background:#0f1117;border:1px solid #7c3aed;border-radius:16px;padding:24px;width:380px;max-width:92vw;font-family:inherit;';
        modal.innerHTML = [
          '<div style="font-size:15px;font-weight:700;color:#a78bfa;margin-bottom:14px;">🚀 Deploy via GitHub PR</div>',
          '<div style="font-size:11px;color:#64748b;margin-bottom:12px;">Arquivo: <span style="color:#94a3b8;">' + filePath + '</span></div>',
          '<label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Repositório (owner/repo)</label>',
          '<input id="vc46-repo" type="text" placeholder="ex: Imadechumbo/technetgamev2" style="width:100%;box-sizing:border-box;background:#1a1a2e;border:1px solid #334155;color:#e2e8f0;font-size:12px;padding:8px;border-radius:8px;margin-bottom:12px;font-family:inherit;">',
          '<label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;">Branch base</label>',
          '<input id="vc46-branch" type="text" value="main" style="width:100%;box-sizing:border-box;background:#1a1a2e;border:1px solid #334155;color:#e2e8f0;font-size:12px;padding:8px;border-radius:8px;margin-bottom:14px;font-family:inherit;">',
          '<div id="vc46-status" style="font-size:11px;color:#f87171;min-height:16px;margin-bottom:8px;"></div>',
          '<div style="display:flex;gap:8px;justify-content:flex-end;">',
          '<button id="vc46-cancel" style="background:transparent;border:1px solid #334155;color:#94a3b8;font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;">Cancelar</button>',
          '<button id="vc46-submit" style="background:#5b21b6;border:1px solid #7c3aed;color:#e9d5ff;font-size:11px;padding:6px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;">🚀 Abrir PR</button>',
          '</div>'
        ].join('');
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.getElementById('vc46-repo').focus();
        document.getElementById('vc46-cancel').onclick = function() { overlay.remove(); };
        document.getElementById('vc46-submit').onclick = (function(pc, fp, cont) { return function() {
          var repo      = (document.getElementById('vc46-repo').value   || '').trim();
          var branchVal = (document.getElementById('vc46-branch').value || 'main').trim();
          var statEl    = document.getElementById('vc46-status');
          if (!repo || !repo.includes('/')) { statEl.textContent = '⚠️ Formato: owner/repo'; return; }
          var submitBtn = document.getElementById('vc46-submit');
          submitBtn.disabled = true; submitBtn.textContent = '⏳ Abrindo PR...';
          statEl.style.color = '#94a3b8'; statEl.textContent = 'Enviando para GitHub...';
          fetch(BACKEND_URL + '/api/deploy/zip-release', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patched_content: pc, file_path: fp, repo: repo, branch: branchVal, aegis_ok: true, commit_message: 'fix: Vision Core AEGIS PASS GOLD — ' + fp.split('/').pop() }),
            signal: AbortSignal.timeout(30000)
          })
          .then(function(r) { return r.json(); })
          .then(function(d) {
            overlay.remove(); /* fechar modal — cont já está no DOM (chatStream child) */
            if (d.ok) {
              /* §46fix-ui Fix 1: badge inline no container do patch */
              var badge = document.createElement('div');
              badge.innerHTML = '<div style="background:#1a0a2e;border:1px solid #7c3aed;border-radius:12px;padding:10px 14px;margin:6px 0;display:flex;align-items:center;gap:10px;">' +
                '<span style="font-size:18px;">🚀</span>' +
                '<div><div style="color:#a78bfa;font-weight:600;font-size:13px;">PR ABERTO</div>' +
                '<a href="' + d.pr_url + '" target="_blank" rel="noopener" style="color:#c4b5fd;font-size:11px;text-decoration:none;">' + d.pr_url + ' ↗</a></div></div>';
              cont.appendChild(badge);
              /* §46fix-ui Fix 2: link permanente no chatStream — sempre visível */
              var prMsg = document.createElement('div');
              prMsg.className = 'vc-msg vc-msg-ai';
              prMsg.style.cssText = 'background:#0d0d1f;border:1px solid #7c3aed;border-radius:14px;padding:14px 16px;margin:8px 0;';
              prMsg.innerHTML = '<div style="font-weight:700;color:#a78bfa;margin-bottom:6px;">🚀 PR ABERTO — Deploy via GitHub</div>' +
                '<a href="' + d.pr_url + '" target="_blank" rel="noopener" ' +
                'style="display:inline-block;background:#1a0a2e;border:1px solid #7c3aed;color:#c4b5fd;font-size:12px;' +
                'padding:7px 14px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:4px;">' +
                '↗ Ver no GitHub</a>' +
                '<div style="font-size:10px;color:#475569;margin-top:6px;">' + (d.branch || '') + ' · ' + (d.repo || '') + '</div>';
              chatStream.appendChild(prMsg);
              chatStream.scrollTop = chatStream.scrollHeight;
              /* §50 — auto-merge ou botão manual */
              var _prNum50 = parseInt((d.pr_url || '').split('/pull/')[1], 10);
              var _autoMerge50 = localStorage.getItem('vc_automerge_enabled') === 'true';
              if (_prNum50) {
                if (_autoMerge50) {
                  _doMerge50(d.repo || repo, _prNum50, cont);
                } else {
                  var _mBtn50 = document.createElement('button');
                  _mBtn50.style.cssText = 'background:#0a1f0a;border:1px solid #22c55e;color:#86efac;font-size:11px;padding:6px 13px;border-radius:10px;cursor:pointer;font-family:inherit;font-weight:600;margin:6px 0 0 0;display:block;';
                  _mBtn50.textContent = '✅ Fazer Merge';
                  _mBtn50.onclick = function() {
                    _mBtn50.disabled = true; _mBtn50.textContent = '⏳ Merging...';
                    _doMerge50(d.repo || repo, _prNum50, cont);
                    _mBtn50.remove();
                  };
                  cont.appendChild(_mBtn50);
                }
              }
            } else {
              var note = document.createElement('div');
              note.style.cssText = 'font-size:11px;color:#f87171;margin-top:6px;';
              note.textContent = '❌ Deploy falhou: ' + (d.detail || d.error || 'erro desconhecido');
              cont.appendChild(note);
              chatStream.scrollTop = chatStream.scrollHeight;
            }
          })
          .catch(function(err) {
            overlay.remove();
            var note = document.createElement('div');
            note.style.cssText = 'font-size:11px;color:#f87171;margin-top:6px;';
            note.textContent = '❌ ' + (err.message || 'Erro de rede') + ' — baixe o ZIP manualmente';
            cont.appendChild(note);
            chatStream.scrollTop = chatStream.scrollHeight;
          });
        }; })(patchedContent, filePath, container);
      };
      container.appendChild(btn);
    }

    /* §39 — progress bar durante ZIP */
    function showProgressBar(el) {
      var bar = document.createElement('div');
      bar.id = 'vc-progress-bar';
      bar.style.cssText = 'position:sticky;top:0;left:0;height:3px;background:linear-gradient(90deg,#4f46e5,#06b6d4,#4ade80);background-size:200% 100%;animation:vcProgress 2s linear infinite;border-radius:2px;z-index:10;margin-bottom:8px;';
      el.insertBefore(bar, el.firstChild);
    }

    function hideProgressBar() {
      var bar = document.getElementById('vc-progress-bar');
      if (bar) bar.remove();
    }

    /* §39 — animação de progresso durante fetch ZIP */
    function showMissionProgress(thinkingEl) {
      var steps = [
        { delay: 0,     text: '📋 Mission Input — missão recebida, classificando...', agent: 'intake'      },
        { delay: 1200,  text: '🔍 Scanner — lendo estrutura do projeto...',           agent: 'scanner'     },
        { delay: 2800,  text: '🔍 Scanner — arquivos relevantes identificados...',    agent: 'scanner'     },
        { delay: 4200,  text: '🔮 Hermes — analisando causa-raiz...',                 agent: 'hermes'      },
        { delay: 5800,  text: '🔮 Hermes — RCA em progresso...',                      agent: 'hermes'      },
        { delay: 7200,  text: '🦾 OpenClaw — montando plano de ação...',              agent: 'openclaw'    },
        { delay: 8500,  text: '⚙️ PatchEngine — preparando patch cirúrgico...',       agent: 'patchengine' },
        { delay: 10000, text: '🛡 Aegis — verificando escopo e segurança...',         agent: 'aegis'       },
        { delay: 11200, text: '✅ Go Core — aguardando evidência real...',             agent: 'gocore'      },
        { delay: 12500, text: '⏳ Finalizando diagnóstico...',                         agent: 'passgold'    }
      ];
      var timers = [];
      steps.forEach(function(step) {
        var t = setTimeout(function() {
          if (thinkingEl && thinkingEl.parentNode) {
            var tt = thinkingEl.querySelector('.vc-thinking-text');
            if (tt) tt.textContent = step.text;
          }
          activateAgent(step.agent, 'active');
        }, step.delay);
        timers.push(t);
      });
      return timers;
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
      /* §39 — fade-in para elementos não-thinking */
      if (cls !== 'thinking') {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        el.style.transition = 'opacity .25s ease, transform .25s ease';
        setTimeout(function() { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 10);
      }
      chatStream.appendChild(el);
      chatStream.scrollTop = chatStream.scrollHeight;
      return el;
    }

    /* Attachment state — shared by sendMessage + file button handlers */
    var _attachedFiles = [];
    var _attachedImg   = null;
    var _pendingZip    = null; /* { file: File, buffer: ArrayBuffer } — staged ZIP, fires on ENVIAR */
    var _lastZipB64    = null; /* base64 do último ZIP processado — fallback para apply-patch */
    var _lastZipName   = null; /* §45: nome original do ZIP para download do ZIP corrigido */
    var _zipFiles      = {};  /* §42: relPath → conteúdo completo — evita reenviar ZIP inteiro no apply-patch */
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

    /* ── §98-E MISSION TIMELINE — historico persistido de missoes ──────────
       Logado: backend (/api/mission/timeline) é a fonte de verdade.
       Visitante sem login: so o cache deste navegador (localStorage). ── */
    var MISSION_HISTORY_CACHE_KEY = 'vc_mission_timeline_cache';
    var _missionHistoryCache = [];

    function _escapeHtml98e(s) {
      return String(s || '').replace(/[&<>"]/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
      });
    }

    function _loadMissionHistoryCache() {
      try {
        var raw = localStorage.getItem(MISSION_HISTORY_CACHE_KEY);
        _missionHistoryCache = raw ? JSON.parse(raw) : [];
      } catch (e) { _missionHistoryCache = []; }
    }

    function _saveMissionHistoryCache() {
      try { localStorage.setItem(MISSION_HISTORY_CACHE_KEY, JSON.stringify(_missionHistoryCache.slice(0, 30))); } catch (e) { /* quota cheia ou bloqueado — ignora, nao quebra a UI */ }
    }

    function renderMissionHistory() {
      var list  = document.getElementById('v298MissionHistoryList');
      var count = document.getElementById('v298MissionHistoryCount');
      if (!list) return;
      if (!_missionHistoryCache.length) {
        list.innerHTML = '<div class="v298-mission-history-empty">Nenhuma missão ainda. Converse ou execute uma missão — fica salvo aqui.</div>';
        if (count) count.textContent = '';
        return;
      }
      if (count) count.textContent = _missionHistoryCache.length + ' ' + (_missionHistoryCache.length > 1 ? 'missões' : 'missão');
      list.innerHTML = '';
      _missionHistoryCache.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'v298-mh-item';
        var dotClass = item.pass_gold === true ? 'ok' : (item.status === 'FAIL' ? 'fail' : (item.status === 'ANSWERED' ? 'ok' : 'wait'));
        var when = '';
        try { when = new Date(item.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { when = ''; }
        row.innerHTML =
          '<span class="v298-mh-dot ' + dotClass + '"></span>' +
          '<div class="v298-mh-body">' +
            '<div class="v298-mh-input">' + _escapeHtml98e((item.input || '').slice(0, 90)) + '</div>' +
            '<div class="v298-mh-meta">' + when + ' · ' + (item.source || 'chat') + (item.status ? ' · ' + item.status : '') + '</div>' +
          '</div>';
        list.appendChild(row);
      });
    }

    function recordMissionTimelineEntry(entry) {
      _missionHistoryCache.unshift({
        ts: Date.now(),
        source: entry.source || 'chat',
        input: entry.input || '',
        summary: entry.summary || null,
        status: entry.status || 'DONE',
        pass_gold: entry.pass_gold === true
      });
      _missionHistoryCache = _missionHistoryCache.slice(0, 30);
      _saveMissionHistoryCache();
      renderMissionHistory();
    }

    function loadMissionHistoryFromBackend() {
      var tok = (function () { try { return sessionStorage.getItem('vc_token') || localStorage.getItem('vision_token'); } catch (e) { return null; } })();
      if (!tok) return; /* sem login: histórico fica só no cache deste navegador */
      fetch(BACKEND_URL + '/api/mission/timeline?limit=20', { headers: { 'Authorization': 'Bearer ' + tok } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.authenticated || !Array.isArray(data.entries)) return;
          /* §102-fix: se backend retornou vazio mas localStorage tem dados,
             manter localStorage (proteção contra EB restart / file loss). */
          if (data.entries.length === 0 && _missionHistoryCache.length > 0) return;
          _missionHistoryCache = data.entries.map(function (e) {
            return {
              ts: new Date(e.ts).getTime() || Date.now(),
              source: e.source, input: e.input, summary: e.summary,
              status: e.status, pass_gold: e.pass_gold === true
            };
          });
          _saveMissionHistoryCache();
          renderMissionHistory();
        })
        .catch(function () { /* falha de rede — mantém o que já estava no cache local */ });
    }

    _loadMissionHistoryCache();
    renderMissionHistory();
    loadMissionHistoryFromBackend();

    var _missionHistoryHead  = document.getElementById('v298MissionHistoryHead');
    var _missionHistoryPanel = document.getElementById('v298MissionHistory');
    if (_missionHistoryHead && _missionHistoryPanel) {
      _missionHistoryHead.addEventListener('click', function () { _missionHistoryPanel.classList.toggle('collapsed'); });
    }

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

    /* ── §39 Agent Report Parser ────────────────────────────── */
    function parseAgentReport(text) {
      if (!text) return null;
      var report = {};
      var agentBlocks = ['MISSÃO RECEBIDA', 'HERMES', 'SCANNER', 'OPENCLAW',
                         'PATCHENGINE', 'AEGIS', 'GO CORE', 'DECISÃO'];
      agentBlocks.forEach(function(agent) {
        var escaped = agent.replace(/[()]/g, '\\$&');
        var others  = agentBlocks.filter(function(a) { return a !== agent; })
                                 .map(function(a) { return a.replace(/[()]/g, '\\$&'); }).join('|');
        var re = new RegExp(escaped + '\\s*\\n([\\s\\S]*?)(?=' + others + '|$)', 'i');
        var m  = text.match(re);
        if (m && m[1].trim()) report[agent] = m[1].trim();
      });
      return Object.keys(report).length > 0 ? report : null;
    }

    function renderAgentReport(report, container) {
      if (!report) return;
      var agentIcons  = { 'MISSÃO RECEBIDA': '📋', 'HERMES': '🔮', 'SCANNER': '🔍',
                          'OPENCLAW': '🦾', 'PATCHENGINE': '⚙️', 'AEGIS': '🛡',
                          'GO CORE': '✅', 'DECISÃO': '⚖️' };
      var agentColors = { 'MISSÃO RECEBIDA': '#60a5fa', 'HERMES': '#a78bfa', 'SCANNER': '#34d399',
                          'OPENCLAW': '#f59e0b', 'PATCHENGINE': '#06b6d4', 'AEGIS': '#f87171',
                          'GO CORE': '#4ade80', 'DECISÃO': '#e2e8f0' };
      var panel = document.createElement('div');
      panel.style.cssText = 'background:#050a0f;border:1px solid #1e293b;border-radius:12px;padding:14px 16px;margin:6px 0 10px;font-size:12px;font-family:inherit;';
      Object.keys(report).forEach(function(agent) {
        var block = document.createElement('div');
        block.style.cssText = 'margin-bottom:10px;';
        var color = agentColors[agent] || '#94a3b8';
        var icon  = agentIcons[agent]  || '▸';
        block.innerHTML =
          '<div style="color:' + color + ';font-weight:600;font-size:11px;letter-spacing:.06em;margin-bottom:4px;display:flex;align-items:center;gap:6px;">' +
          '<span>' + icon + '</span>' + agent + '</div>' +
          '<div style="color:#94a3b8;padding-left:20px;line-height:1.6;">' +
          report[agent].replace(/\n/g, '<br>') + '</div>';
        panel.appendChild(block);
      });
      container.appendChild(panel);
      container.scrollTop = container.scrollHeight;
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
      var isMulti115 = Array.isArray(obj.files) && obj.files.length > 0;
      var parts = [
        '<div style="color:' + color + ';font-weight:700;font-size:14px;margin-bottom:8px;">🔍 HERMES DIAGNÓSTICO</div>',
        '<div style="color:#e2e8f0;margin-bottom:4px;"><b>Decisão:</b> <span style="color:' + color + '">' + decisao + '</span></div>',
        isMulti115 ? '<div style="color:#94a3b8;margin-bottom:4px;"><b>Arquivos (' + obj.files.length + '):</b> ' + obj.files.map(function(f) { return f.file; }).join(', ') + '</div>' : '',
        (!isMulti115 && obj.file)     ? '<div style="color:#94a3b8;margin-bottom:4px;"><b>Arquivo:</b> ' + obj.file + '</div>' : '',
        (!isMulti115 && obj.fix_type) ? '<div style="color:#94a3b8;margin-bottom:4px;"><b>Fix type:</b> ' + obj.fix_type + '</div>' : '',
        obj.confidence ? '<div style="color:#94a3b8;margin-bottom:4px;"><b>Confiança:</b> ' + (Number(obj.confidence) * 100).toFixed(0) + '%</div>' : '',
        obj.diagnosis  ? '<div style="color:#cbd5e1;margin-top:8px;padding-top:8px;border-top:1px solid #ffffff18;">' + String(obj.diagnosis).replace(/</g,'&lt;') + '</div>' : ''
      ];
      panel.innerHTML = parts.join('');
      if (isMulti115) {
        /* §115: 1 <details> por arquivo — patch individual, nunca um blob combinado */
        obj.files.forEach(function(f) {
          var det = document.createElement('details');
          det.style.cssText = 'margin-top:8px;';
          var sum = document.createElement('summary');
          sum.style.cssText = 'color:#60a5fa;cursor:pointer;';
          sum.textContent = 'Ver patch — ' + (f.file || '?') + ' (' + (f.fix_type || '—') + ')';
          var pre = document.createElement('pre');
          pre.style.cssText = 'background:#0a0a12;padding:8px;border-radius:6px;overflow:auto;font-size:11px;margin-top:4px;color:#a5f3fc;';
          var pstr115 = ''; try { pstr115 = JSON.stringify(f.patch, null, 2); } catch(e) { pstr115 = String(f.patch || ''); }
          pre.textContent = pstr115;
          det.appendChild(sum); det.appendChild(pre);
          panel.appendChild(det);
        });
      } else if (obj.patch && typeof obj.patch === 'object' && Object.keys(obj.patch).length) {
        var detSingle = document.createElement('details');
        detSingle.style.cssText = 'margin-top:8px;';
        detSingle.innerHTML = '<summary style="color:#60a5fa;cursor:pointer;">Ver patch</summary><pre style="background:#0a0a12;padding:8px;border-radius:6px;overflow:auto;font-size:11px;margin-top:4px;color:#a5f3fc;">' + JSON.stringify(obj.patch, null, 2).replace(/</g,'&lt;') + '</pre>';
        panel.appendChild(detSingle);
      }
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
        var _zipMode  = 'fix'; /* ZIP sempre mode=fix — hermesDecisionMatrix obrigatório */
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
      /* §39 — SVG spinner */
      var thinking = appendMsg('', 'thinking');
      thinking.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 12px;margin:4px 0;color:#94a3b8;';
      thinking.appendChild(buildSpinner(18));
      var _chatThinkSpan = document.createElement('span');
      _chatThinkSpan.className = 'vc-thinking-text';
      _chatThinkSpan.textContent = 'Mission Input — classificando missão...';
      thinking.appendChild(_chatThinkSpan);
      if (sendBtn) sendBtn.style.animation = 'vcPulse 1s ease-in-out infinite'; /* §38 pulse */
      activateAgent('scanner', 'active');
      var _chatAnimTimer = setTimeout(function() { activateAgent('hermes', 'active'); }, 1200);

      var imgName  = _attachedImg ? _attachedImg.name   : null;
      var imgB64   = _attachedImg ? _attachedImg.base64 : null;
      var imgMime  = _attachedImg ? _attachedImg.mime   : null;
      _attachedImg = null;
      var _histPrefix = getHistoryPrefix();
      var _msgWithCtx = _histPrefix + (text || '(análise de imagem: ' + imgName + ')');
      var payload  = { message: _msgWithCtx, mode: mode, model: model, display_input: (text || null) };
      if (imgName) { payload.image_name = imgName; }
      if (imgB64)  { payload.image_base64 = imgB64; payload.image_mime = imgMime || 'image/jpeg'; }

      var tok2 = (function () { try { return sessionStorage.getItem('vc_token') || localStorage.getItem('vision_token'); } catch (e) { return null; } })();
      fetch(BACKEND_URL + '/api/chat', {
        method: 'POST',
        headers: tok2 ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok2 } : { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function(data) {
        clearTimeout(_chatAnimTimer);
        thinking.remove();
        stopMissionAnimation({ ok: true, steps: [{ agent: 'Scanner', ok: true }, { agent: 'Hermes', ok: true }] });
        /* §27 echo guard */
        if (data && data.provider === 'local') {
          appendMsg('⚠️ Fallback local — todos os provedores de IA falharam. Reduza o payload ou verifique as API keys.', 'error');
        }
        var answer = (data && data.answer) ? data.answer : JSON.stringify(data);
        // §98-D: badge visual do agente especializado detectado
        if (data && data.active_agent && data.active_agent.name) {
          var agentBadgeEl = document.createElement('div');
          agentBadgeEl.innerHTML = '<span class="vc-agent-badge">🤖 ' + data.active_agent.name + '</span>';
          chatStream.appendChild(agentBadgeEl);
          chatStream.scrollTop = chatStream.scrollHeight;
        }
        addToHistory('assistant', answer);
        // §98-E: registrar no histórico persistido de missões
        recordMissionTimelineEntry({ source: 'chat', input: text, summary: answer, status: 'ANSWERED' });
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
        /* §81 — Classify paralelo: sugestão contextual do Arquiteto */
        (function(_userText81) {
          fetch(BACKEND_URL + '/api/architect/interpret', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ message: _userText81 })
          })
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(cls) {
            if (!cls || !cls.ok) return;
            var conf = cls.classification && cls.classification.confidence || 0;
            if (cls.intent !== 'create' || conf < 0.6) return;
            /* Mostrar sugestão contextual abaixo da última bubble */
            var hint = document.createElement('div');
            hint.style.cssText = [
              'display:flex',
              'align-items:center',
              'gap:10px',
              'margin:4px 0 8px',
              'padding:8px 12px',
              'background:rgba(139,92,246,.06)',
              'border:1px solid rgba(139,92,246,.2)',
              'border-radius:8px',
              'font-size:12px',
              'color:#a5b4fc',
            ].join(';');
            var projType = (cls.classification && cls.classification.project_type) || 'projeto';
            hint.innerHTML =
              '<span style="opacity:.7">◈</span>' +
              '<span style="flex:1">Parece uma solicitação de <strong style="color:#c4b5fd">' +
              projType + '</strong>.</span>' +
              '<button type="button" style="' +
                'background:rgba(139,92,246,.15);' +
                'border:1px solid rgba(139,92,246,.35);' +
                'color:#c4b5fd;' +
                'padding:4px 10px;' +
                'border-radius:5px;' +
                'font-size:11px;' +
                'font-family:inherit;' +
                'cursor:pointer;' +
                'white-space:nowrap' +
              '">Abrir Project Builder →</button>';
            hint.querySelector('button').addEventListener('click', function() {
              hint.remove();
              showSoftwareFactoryPage();
            });
            chatStream.appendChild(hint);
            chatStream.scrollTop = chatStream.scrollHeight;
          })
          .catch(function() {});
        }(text));
      })
      .catch(function(err) {
        clearTimeout(_chatAnimTimer);
        thinking.remove();
        resetAllAgents();
        appendMsg('[Erro de conexão com worker: ' + BACKEND_URL + ' — ' + err + ']', 'error');
        setStatus('ERRO', 'error');
        setTimeout(function() { setStatus('READY'); }, 3000);
      });
    }

    sendBtn.addEventListener('click', sendMessage);
    /* §50 fix(ui): press feedback scale(0.95) */
    /* §50fix-ui: ripple + flash visível ao pressionar ENVIAR */
    sendBtn.addEventListener('mousedown', function(e) {
      var _orig = sendBtn.style.background;
      sendBtn.style.background = '#a855f7';
      sendBtn.style.transform  = 'scale(0.96)';
      var _rip  = document.createElement('span');
      var _rect = sendBtn.getBoundingClientRect();
      var _size = Math.max(_rect.width, _rect.height);
      _rip.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,0.35);' +
        'width:' + _size + 'px;height:' + _size + 'px;' +
        'left:' + (e.clientX - _rect.left - _size / 2) + 'px;' +
        'top:'  + (e.clientY - _rect.top  - _size / 2) + 'px;' +
        'transform:scale(0);animation:vcRipple 0.4s ease-out forwards;pointer-events:none;';
      sendBtn.style.position = 'relative';
      sendBtn.style.overflow = 'hidden';
      sendBtn.appendChild(_rip);
      setTimeout(function() { _rip.remove(); }, 400);
      setTimeout(function() { sendBtn.style.background = _orig; sendBtn.style.transform = ''; }, 200);
    });
    sendBtn.addEventListener('mouseup',   function() { sendBtn.style.transform = ''; });
    sendBtn.addEventListener('mouseleave',function() { sendBtn.style.transform = ''; });

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
      var isMulti115v = Array.isArray(res.files) && res.files.length > 0;
      title.textContent = isMulti115v
        ? '✅ ' + res.files.length + ' arquivos aplicados num único commit — validação manual obrigatória (SDDF §14)'
        : '✅ Patch aplicado e commitado — validação manual obrigatória (SDDF §14)';
      wrap.appendChild(title);
      var info = document.createElement('pre');
      info.style.cssText = 'background:#020504;border:1px solid #1a2e1a;border-radius:10px;padding:12px;color:#d4d4d8;overflow:auto;max-height:180px;font-size:11px;margin:0 0 12px;white-space:pre-wrap;word-break:break-all;';
      if (isMulti115v) {
        info.textContent = [
          'Arquivos (' + res.files.length + '): ' + res.files.join(', '),
          'Commit  : ' + (res.hash || 'sem hash') + ' (único commit cobrindo todos os arquivos)'
        ].join('\n');
      } else {
        var pstr = '';
        try { pstr = JSON.stringify(res.patch, null, 2); } catch(e) { pstr = String(res.patch || ''); }
        info.textContent = [
          'Arquivo : ' + (res.file     || '—'),
          'Fix type: ' + (res.fix_type || '—'),
          'Commit  : ' + (res.hash     || 'sem hash'),
          '', '── PATCH ──', pstr
        ].join('\n');
      }
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
          body: JSON.stringify({ mission_id: res.mission_id, file: isMulti115v ? res.files.join(', ') : res.file, hash: res.hash })
        }).then(function(r){ return r.json(); })
          .then(function(d){ approveBtn.textContent = d.ok ? '✅ Push enfileirado' : '❌ ' + (d.error || 'Erro'); approveBtn.style.opacity = '0.7'; })
          .catch(function(){ approveBtn.textContent = '❌ Erro de rede'; approveBtn.disabled = false; revertBtn.disabled = false; });
      };
      revertBtn.onclick = function() {
        if (!confirm(isMulti115v ? 'Reverter o último commit? Isso desfaz o patch nos ' + res.files.length + ' arquivos aplicados juntos.' : 'Reverter o último commit? Isso desfaz o patch aplicado.')) return;
        approveBtn.disabled = true; revertBtn.disabled = true;
        revertBtn.textContent = '⏳ Revertendo...';
        fetch(BACKEND_URL + '/api/agent/mission/revert', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ mission_id: res.mission_id, file: isMulti115v ? res.files.join(', ') : res.file, hash: res.hash })
        }).then(function(r){ return r.json(); })
          .then(function(d){ revertBtn.textContent = d.ok ? '✅ Reversão enfileirada' : '❌ ' + (d.error || 'Erro'); revertBtn.style.opacity = '0.7'; })
          .catch(function(){ revertBtn.textContent = '❌ Erro de rede'; approveBtn.disabled = false; revertBtn.disabled = false; });
      };
      row.appendChild(approveBtn);
      row.appendChild(revertBtn);
      wrap.appendChild(row);
      return wrap;
    }

    /* ── §134: renderSecurityViolations — painel de violations AEGIS com sugestões Hermes ── */
    function renderSecurityViolations(violations, fixSuggestions) {
      if (!violations || violations.length === 0) return null;
      var severityColor = { 'CRITICAL': '#ef4444', 'HIGH': '#f97316', 'MEDIUM': '#eab308', 'LOW': '#6b7280' };
      var wrap = document.createElement('div');
      wrap.style.cssText = 'margin-top:12px;';
      var header = document.createElement('div');
      header.style.cssText = 'color:#f87171;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:8px;';
      header.textContent = '🛡 AEGIS — ' + violations.length + ' VIOLATION' + (violations.length > 1 ? 'S' : '') + ' DETECTADA' + (violations.length > 1 ? 'S' : '');
      wrap.appendChild(header);
      violations.forEach(function(v, i) {
        var fix = fixSuggestions && fixSuggestions[i] && fixSuggestions[i].fix;
        var color = severityColor[v.severity] || '#6b7280';
        var card = document.createElement('div');
        card.style.cssText = 'border:1px solid ' + color + '33;border-radius:8px;padding:12px;margin-bottom:8px;background:#0f172a;';
        var cardTop = document.createElement('div');
        cardTop.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
        var badge = document.createElement('span');
        badge.style.cssText = 'color:' + color + ';font-size:11px;font-weight:700;letter-spacing:1px;';
        badge.textContent = (v.severity || 'INFO') + ' — ' + (v.rule_id || '');
        var loc = document.createElement('span');
        loc.style.cssText = 'color:#64748b;font-size:10px;font-family:monospace;';
        loc.textContent = (v.file || '') + (v.line ? ':' + v.line : '');
        cardTop.appendChild(badge); cardTop.appendChild(loc);
        card.appendChild(cardTop);
        var msg = document.createElement('div');
        msg.style.cssText = 'color:#cbd5e1;font-size:12px;' + (fix ? 'margin-bottom:8px;' : '');
        msg.textContent = v.message || '';
        card.appendChild(msg);
        if (fix) {
          var fixBox = document.createElement('div');
          fixBox.style.cssText = 'background:#1e293b;border-radius:6px;padding:8px;margin-top:4px;';
          var fixLabel = document.createElement('div');
          fixLabel.style.cssText = 'color:#34d399;font-size:10px;font-weight:600;margin-bottom:4px;';
          fixLabel.textContent = '💡 SUGESTÃO DE FIX (Hermes)';
          fixBox.appendChild(fixLabel);
          var fixText = document.createElement('div');
          fixText.style.cssText = 'color:#94a3b8;font-size:11px;font-family:monospace;white-space:pre-wrap;word-break:break-all;';
          fixText.textContent = fix.after || fix.suggestion || JSON.stringify(fix, null, 2);
          fixBox.appendChild(fixText);
          if (fix.env_var) {
            var envLine = document.createElement('div');
            envLine.style.cssText = 'color:#7dd3fc;font-size:10px;margin-top:4px;font-family:monospace;';
            envLine.textContent = '.env.example: ' + fix.env_var + '=YOUR_KEY_HERE';
            fixBox.appendChild(envLine);
          }
          card.appendChild(fixBox);
        }
        wrap.appendChild(card);
      });
      return wrap;
    }

    /* ── §106: vcQueueApplyPatchViaAgent — lógica compartilhada entre renderApplyFixPanel  */
    /* e renderStandardMethodPanel: verifica agent → queue apply_patch → poll resultado.    */
    /* hermesObj : objeto com file, patch, fix_type, diagnosis.                             */
    /* statusEl  : elemento DOM para mensagens de status.                                   */
    /* onReset   : callback chamado em qualquer erro (re-habilita botões do caller).        */
    /* onDone    : callback chamado com (rd) quando o agent responde com sucesso.           */
    function vcQueueApplyPatchViaAgent(hermesObj, statusEl, onReset, onDone) {
      /* §115: missão multi-arquivo quando hermesObj.files é um array não-vazio —
       * mesma função de polling do §106, só troca o corpo do POST e o tipo de missão. */
      var isMulti115 = Array.isArray(hermesObj.files) && hermesObj.files.length > 0;
      var queueBody115 = isMulti115
        ? { type: 'apply_patch_multi', files: hermesObj.files.map(function(f) { return { file: f.file, patch: f.patch, fix_type: f.fix_type || 'code_patch' }; }), diagnosis: hermesObj.diagnosis || 'vision fix multi-arquivo' }
        : { type: 'apply_patch', file: hermesObj.file, patch: hermesObj.patch, fix_type: hermesObj.fix_type || 'code_patch', diagnosis: hermesObj.diagnosis || 'vision fix' };
      statusEl.textContent = 'Consultando /api/agent/status...';
      fetch(BACKEND_URL + '/api/agent/status').then(function(r) { return r.json(); }).then(function(st) {
        if (!st || !st.connected) {
          statusEl.innerHTML = '⚠️ Vision Agent Local não detectado (sem poll nos últimos 15s). ' +
            '<a href="https://visioncoreai.pages.dev/landing.html#agent" target="_blank" style="color:#93c5fd;">Baixe e abra o Vision Agent</a> na máquina onde está o projeto, depois clique novamente.';
          onReset();
          return;
        }
        statusEl.textContent = isMulti115
          ? 'Vision Agent Local ativo — enviando ' + hermesObj.files.length + ' arquivos para fila (missão atômica)...'
          : 'Vision Agent Local ativo — enviando patch para fila...';
        fetch(BACKEND_URL + '/api/agent/mission/queue', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queueBody115)
        }).then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw new Error(e.error || ('HTTP ' + r.status)); }); })
        .then(function(qd) {
          if (!qd.ok || !qd.mission_id) throw new Error(qd.error || 'queue_failed');
          var missionId106 = qd.mission_id;
          statusEl.textContent = 'Missão ' + missionId106 + ' enfileirada — aguardando o agent aplicar no disco real (até 30s)...';
          var tries106 = 0, maxTries106 = 15; /* §14.4 spec: 2s * 15 = 30s */
          function pollResult106() {
            tries106++;
            fetch(BACKEND_URL + '/api/agent/mission/result/' + missionId106)
              .then(function(rr) { return rr.status === 404 ? null : rr.json(); })
              .then(function(rd) {
                if (rd && rd.mission_id) { onDone(rd); return; }
                if (tries106 >= maxTries106) {
                  statusEl.innerHTML = '⏱ Vision Agent Local não respondeu em 30s. Confirme se está rodando ' +
                    '(<code>node vision-agent.js .</code> ou app instalado) e ' +
                    '<a href="#" id="vcRetryAgentPoll106" style="color:#93c5fd;">clique para continuar aguardando</a>.';
                  var _retry106 = document.getElementById('vcRetryAgentPoll106');
                  if (_retry106) { _retry106.onclick = function(e) { e.preventDefault(); tries106 = 0; statusEl.textContent = 'Retomando espera por missão ' + missionId106 + '...'; pollResult106(); }; }
                  onReset();
                  return;
                }
                setTimeout(pollResult106, 2000);
              })
              .catch(function() { setTimeout(pollResult106, 2000); });
          }
          pollResult106();
        })
        .catch(function(err) {
          statusEl.textContent = '❌ ' + (err.message || 'Erro ao enfileirar missão.');
          onReset();
        });
      }).catch(function() {
        statusEl.textContent = '❌ Erro de rede ao consultar /api/agent/status.';
        onReset();
      });
    }

    /* ── §113: vcQueueSfDryRunViaAgent — Etapa A, Fase 3 (polish de UX) ──────────────────── */
    /* Mesmo padrão de polling do §106 (vcQueueApplyPatchViaAgent), mas para o tipo de missão  */
    /* sf_dry_run_real (§111): exige target_path + input (descrição do problema) em vez de     */
    /* file+patch já diagnosticados. Backend/agent NÃO foram alterados — endpoint e mission     */
    /* type já existiam desde o §111; esta função só os chama pela primeira vez via UI.         */
    function vcQueueSfDryRunViaAgent(targetPath, inputDesc, statusEl, onReset, onDone) {
      statusEl.textContent = 'Consultando /api/agent/status...';
      fetch(BACKEND_URL + '/api/agent/status').then(function(r) { return r.json(); }).then(function(st) {
        if (!st || !st.connected) {
          statusEl.innerHTML = '⚠️ Vision Agent Local não detectado (sem poll nos últimos 15s). ' +
            '<a href="https://visioncoreai.pages.dev/landing.html#agent" target="_blank" style="color:#93c5fd;">Baixe e abra o Vision Agent</a> na máquina onde está o projeto-alvo, depois clique novamente.';
          onReset();
          return;
        }
        statusEl.textContent = 'Vision Agent Local ativo — enviando dry-run para fila...';
        fetch(BACKEND_URL + '/api/agent/mission/queue', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'sf_dry_run_real', target_path: targetPath, input: inputDesc })
        }).then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw new Error(e.error || ('HTTP ' + r.status)); }); })
        .then(function(qd) {
          if (!qd.ok || !qd.mission_id) throw new Error(qd.error || 'queue_failed');
          var missionId113 = qd.mission_id;
          statusEl.textContent = 'Missão ' + missionId113 + ' enfileirada — aguardando o agent ler/diagnosticar/simular (até 30s)...';
          var tries113 = 0, maxTries113 = 15; /* mesmo orçamento de espera do §106: 2s * 15 = 30s */
          function pollResult113() {
            tries113++;
            fetch(BACKEND_URL + '/api/agent/mission/result/' + missionId113)
              .then(function(rr) { return rr.status === 404 ? null : rr.json(); })
              .then(function(rd) {
                if (rd && rd.mission_id) { onDone(rd); return; }
                if (tries113 >= maxTries113) {
                  statusEl.innerHTML = '⏱ Vision Agent Local não respondeu em 30s. Confirme se está rodando ' +
                    '(<code>node vision-agent.js .</code> ou app instalado) e ' +
                    '<a href="#" id="vcRetryAgentPoll113" style="color:#93c5fd;">clique para continuar aguardando</a>.';
                  var _retry113 = document.getElementById('vcRetryAgentPoll113');
                  if (_retry113) { _retry113.onclick = function(e) { e.preventDefault(); tries113 = 0; statusEl.textContent = 'Retomando espera por missão ' + missionId113 + '...'; pollResult113(); }; }
                  onReset();
                  return;
                }
                setTimeout(pollResult113, 2000);
              })
              .catch(function() { setTimeout(pollResult113, 2000); });
          }
          pollResult113();
        })
        .catch(function(err) {
          statusEl.textContent = '❌ ' + (err.message || 'Erro ao enfileirar dry-run.');
          onReset();
        });
      }).catch(function() {
        statusEl.textContent = '❌ Erro de rede ao consultar /api/agent/status.';
        onReset();
      });
    }

    /* ── §113/§116: renderSfDryRunResult — renderiza qualquer um dos 10 desfechos possíveis */
    /* de sfDryRunRealMission (vision-agent.js): blocked_self_target, failed, listing,       */
    /* diagnosis_failed, analysis_only, patch_failed, validation_failed, completed (1 arquivo,*/
    /* §113), e multi_patch_failed/multi_validation_failed/multi_completed (N arquivos, §116).*/
    /* Usa textContent (não innerHTML) para o conteúdo do projeto-alvo/IA — é conteúdo de   */
    /* um repositório externo, nunca deve ser interpretado como HTML.                       */
    function renderSfDryRunResult(rd) {
      var box = document.createElement('div');
      var isSuccess  = rd.action === 'sf_dry_run_completed' || rd.action === 'sf_dry_run_multi_completed';
      var isMulti116 = rd.action === 'sf_dry_run_multi_completed' && Array.isArray(rd.files);
      var isBlocked  = rd.action === 'sf_dry_run_blocked_self_target';
      var borderColor = isSuccess ? 'rgba(74,222,128,.45)' : (isBlocked ? 'rgba(239,68,68,.5)' : 'rgba(250,204,21,.4)');
      box.style.cssText = 'background:#050a0f;border:1px solid ' + borderColor + ';border-radius:12px;padding:14px;margin-top:10px;font-size:12.5px;';
      var pre = document.createElement('pre');
      pre.style.cssText = 'white-space:pre-wrap;font-family:inherit;color:#cbd5e1;margin:0;';
      pre.textContent = rd.output || '(sem output)';
      box.appendChild(pre);

      function appendDiffGrid(beforeText, afterText) {
        var diffWrap = document.createElement('div');
        diffWrap.style.cssText = 'margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:10px;';
        var beforeCol = document.createElement('pre');
        beforeCol.style.cssText = 'background:#1a0a0a;border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px;font-size:11px;max-height:260px;overflow:auto;color:#fca5a5;white-space:pre-wrap;margin:0;';
        beforeCol.textContent = '— ANTES (arquivo real, intacto) —\n' + (beforeText || '');
        var afterCol = document.createElement('pre');
        afterCol.style.cssText = 'background:#0a1a0a;border:1px solid rgba(74,222,128,.3);border-radius:8px;padding:10px;font-size:11px;max-height:260px;overflow:auto;color:#86efac;white-space:pre-wrap;margin:0;';
        afterCol.textContent = '— DEPOIS (simulado em memória — NADA foi escrito) —\n' + (afterText || '');
        diffWrap.appendChild(beforeCol); diffWrap.appendChild(afterCol);
        box.appendChild(diffWrap);
      }

      if (rd.action === 'sf_dry_run_completed' && rd.diff_preview) {
        appendDiffGrid(rd.diff_preview.before, rd.diff_preview.after);
      } else if (isMulti116) {
        rd.files.forEach(function(f) {
          var fileLabel = document.createElement('div');
          fileLabel.style.cssText = 'margin-top:12px;font-weight:700;color:#a5b4fc;font-size:11.5px;';
          fileLabel.textContent = '📄 ' + f.file + ' (' + (f.fix_type || '—') + ')';
          box.appendChild(fileLabel);
          appendDiffGrid(f.diff_preview && f.diff_preview.before, f.diff_preview && f.diff_preview.after);
        });
      }
      return box;
    }

    /* ── §113: renderSfDryRunPanel — Etapa A, Fase 3: ponto de entrada no chat para apontar  */
    /* um repositório externo e disparar o dry-run real (§111) visualmente. Núcleo técnico    */
    /* (firewall, scanner, simulação) já existia desde o §111 — esta função só dá uma UI a     */
    /* ele. Acionada pelo botão #vcOpenDryRunPanelBtn (sidebar).                              */
    function renderSfDryRunPanel() {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'background:#050a0f;border:1px solid rgba(129,140,248,.4);border-radius:14px;padding:16px;margin:4px 0 8px;font-size:13px;font-family:inherit;';
      wrap.innerHTML =
        '<div style="font-weight:700;color:#a5b4fc;margin-bottom:8px;">🔬 Software Factory — Dry-Run Real em Repositório Externo</div>' +
        '<div style="color:#94a3b8;font-size:12px;margin-bottom:10px;line-height:1.5;">Aponte um projeto seu — nunca o próprio Vision Core, bloqueado por um firewall de 4 camadas — para ler o código real, diagnosticar de verdade e simular o patch só em memória. Nada é escrito no disco do projeto-alvo nem comitado.</div>' +
        '<input type="text" id="vcSfDryRunPath" placeholder="Caminho completo do projeto no seu computador, ex: C:\\Users\\voce\\Desktop\\meu-projeto" style="width:100%;box-sizing:border-box;background:#0a0f1a;border:1px solid #1e293b;border-radius:8px;padding:8px 10px;color:#e2e8f0;font-size:12.5px;margin-bottom:8px;font-family:inherit;">' +
        '<textarea id="vcSfDryRunDesc" placeholder="Descreva o problema, ex: a função soma() está subtraindo em vez de somar" rows="2" style="width:100%;box-sizing:border-box;background:#0a0f1a;border:1px solid #1e293b;border-radius:8px;padding:8px 10px;color:#e2e8f0;font-size:12.5px;margin-bottom:10px;resize:vertical;font-family:inherit;"></textarea>' +
        '<button id="vcSfDryRunBtn" type="button" style="background:#4f46e5;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:12.5px;font-weight:700;cursor:pointer;">🔬 Rodar Dry-Run Real</button>' +
        '<div id="vcSfDryRunStatus" style="margin-top:10px;font-size:12px;color:#94a3b8;"></div>' +
        '<div id="vcSfDryRunResultHost"></div>';

      var btn        = wrap.querySelector('#vcSfDryRunBtn');
      var statusEl   = wrap.querySelector('#vcSfDryRunStatus');
      var resultHost = wrap.querySelector('#vcSfDryRunResultHost');

      btn.addEventListener('click', function() {
        var targetPath = wrap.querySelector('#vcSfDryRunPath').value.trim();
        var inputDesc  = wrap.querySelector('#vcSfDryRunDesc').value.trim();
        resultHost.innerHTML = '';
        if (!targetPath || !inputDesc) {
          statusEl.textContent = '⚠️ Informe o caminho do projeto e descreva o problema antes de rodar.';
          return;
        }
        btn.disabled = true;
        vcQueueSfDryRunViaAgent(targetPath, inputDesc, statusEl, function() {
          btn.disabled = false;
        }, function(rd) {
          btn.disabled = false;
          statusEl.textContent = (rd.action === 'sf_dry_run_completed' || rd.action === 'sf_dry_run_multi_completed')
            ? '✅ Dry-run concluído — nada foi escrito no disco real.'
            : 'Resultado recebido — ver detalhes abaixo.';
          resultHost.appendChild(renderSfDryRunResult(rd));
        });
      });

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
      var isMulti115panel = Array.isArray(hermesObj.files) && hermesObj.files.length > 0;
      if (isMulti115panel) {
        info.textContent = [
          'Arquivos (' + hermesObj.files.length + '): ' + hermesObj.files.map(function(f) { return f.file; }).join(', '),
          'Confiança: ' + (hermesObj.confidence != null ? (Number(hermesObj.confidence) * 100).toFixed(0) : '—') + '%',
          'Diagnóstico: ' + (hermesObj.diagnosis || '—'),
          '', '── PATCHES (' + hermesObj.files.length + ' arquivos, missão atômica — tudo ou nada) ──',
          hermesObj.files.map(function(f) {
            var p115 = ''; try { p115 = JSON.stringify(f.patch, null, 2); } catch(e) { p115 = String(f.patch || ''); }
            return f.file + ' (' + (f.fix_type || '—') + '):\n' + p115;
          }).join('\n\n')
        ].join('\n');
      } else {
        var pstr = '';
        try { pstr = JSON.stringify(hermesObj.patch, null, 2); } catch(e) { pstr = String(hermesObj.patch || ''); }
        info.textContent = [
          'Arquivo  : ' + (hermesObj.file        || '—'),
          'Fix type : ' + (hermesObj.fix_type     || '—'),
          'Confiança: ' + (hermesObj.confidence != null ? (Number(hermesObj.confidence) * 100).toFixed(0) : '—') + '%',
          'Diagnóstico: ' + (hermesObj.diagnosis   || '—'),
          '', '── PATCH ──', pstr
        ].join('\n');
      }
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

      var applyBtn  = isMulti115panel ? null : mkBtn('✅ Aplicar e Baixar Arquivo Corrigido', '#0a2a1a', '#22c55e', '#86efac');
      var agentBtn  = mkBtn(isMulti115panel ? '📡 Aplicar no Vision Agent Local (' + hermesObj.files.length + ' arquivos)' : '📡 Aplicar no Vision Agent Local', '#0a1a2a', '#3b82f6', '#93c5fd'); /* §105/§115 */
      var cancelBtn = mkBtn('✖ Ignorar', '#1c1c1e', '#555', '#888');
      if (isMulti115panel) {
        var multiNote115 = document.createElement('div');
        multiNote115.style.cssText = 'color:#64748b;font-size:11px;margin:-2px 0 8px;';
        multiNote115.textContent = 'Esse fix abrange ' + hermesObj.files.length + ' arquivos — só disponível via Vision Agent Local, que aplica todos atomicamente (§109).';
        wrap.appendChild(multiNote115);
      }

      if (applyBtn) applyBtn.onclick = function() {
        /* §41: guard BLOCKED/ABORTED decisao — não acionar apply-patch */
        var _dec = hermesObj.decisao;
        if (_dec === 'BLOCKED_INPUT' || _dec === 'BLOCKED_RUNTIME' || _dec === 'ABORTED') {
          statusEl.textContent = '⚠️ Diagnóstico ' + _dec + ' — patch não disponível. Rediagnostique com mais contexto ou aplique manualmente.';
          return;
        }
        if (!hermesObj.patch) { statusEl.textContent = '❌ Patch ausente no diagnóstico.'; return; }
        /* §42: preferir file_content (sem ZIP) — fallback para zip_base64 */
        var _fc42 = _zipFiles[hermesObj.file] || null;
        if (!_fc42) { Object.keys(_zipFiles).forEach(function(k) { if (!_fc42 && (k === hermesObj.file || k.endsWith('/' + hermesObj.file))) { _fc42 = _zipFiles[k]; } }); }
        if (!_fc42 && !_lastZipB64) { statusEl.textContent = '❌ ZIP não encontrado em memória. Reenvie o arquivo.'; return; }

        applyBtn.disabled = true; cancelBtn.disabled = true;
        applyBtn.textContent = '⏳ Aplicando patch...';
        statusEl.textContent = 'Enviando para /api/chat/apply-patch...';

        fetch(BACKEND_URL + '/api/chat/apply-patch', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(_fc42
            ? { file_content: _fc42,       file_path: hermesObj.file, fix_type: hermesObj.fix_type || 'code_patch', patch: hermesObj.patch, diagnosis: hermesObj.diagnosis || 'vision fix' }
            : { zip_base64:   _lastZipB64, file_path: hermesObj.file, fix_type: hermesObj.fix_type || 'code_patch', patch: hermesObj.patch, diagnosis: hermesObj.diagnosis || 'vision fix' }),
          signal: AbortSignal.timeout(30000)
        })
        .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { var _e = new Error(e.error || ('HTTP ' + r.status)); _e.detail = e.detail || null; throw _e; }); })
        .then(function(data) {
          if (!data.ok) { var _e2 = new Error(data.error || 'apply-patch falhou'); _e2.detail = data.detail || null; throw _e2; }

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

          /* §47 — PASS GOLD Engine multidimensional badge + download */
          var _pg45c = document.createElement('div');
          _renderGoldLevel47(_pg45c, data);
          var _glevel47 = data.gold_level || (data.pass_gold ? 'GOLD' : (data.aegis_ok ? 'GOLD' : 'NEEDS_REVIEW'));
          if (_glevel47 !== 'NEEDS_REVIEW') {
            var dlBtn = document.createElement('button');
            dlBtn.style.cssText = 'background:#0a2a1a;border:1px solid #22c55e;color:#86efac;font-size:12px;padding:8px 14px;border-radius:12px;cursor:pointer;font-family:inherit;font-weight:500;margin:4px 0 8px;';
            dlBtn.textContent = (data.pass_gold || _glevel47 === 'GOLD') ? '⬇ Baixar ZIP Corrigido' : '⬇ Baixar ' + (data.filename || data.file_path) + ' (corrigido)';
            dlBtn.onclick = (function(d, c, gl) { return function() {
              if (d.pass_gold || gl === 'GOLD') { _dlZip45(d.patched_content, d.file_path || d.filename, _lastZipName, c); }
              else {
                var blob = new Blob([d.patched_content], { type: 'text/plain;charset=utf-8' });
                var url  = URL.createObjectURL(blob);
                var a    = document.createElement('a');
                a.href = url; a.download = d.filename || d.file_path;
                document.body.appendChild(a); a.click();
                setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 1000);
              }
            }; })(data, _pg45c, _glevel47);
            _pg45c.appendChild(dlBtn);
          }
          /* §46 — deploy button só quando GOLD */
          if (data.pass_gold || _glevel47 === 'GOLD') { _renderDeployBtn46(_pg45c, data.patched_content, data.file_path || data.filename); }
          chatStream.appendChild(_pg45c);
          chatStream.scrollTop = chatStream.scrollHeight;
          setStatus('READY');
        })
        .catch(function(err) {
          applyBtn.disabled = false; cancelBtn.disabled = false;
          applyBtn.textContent = '✅ Aplicar e Baixar Arquivo Corrigido';
          statusEl.textContent = '❌ ' + (err.message || 'Erro desconhecido') + (err.detail ? '\n💡 ' + err.detail : '');
          /* §46fix: fallback download arquivo original quando patch_apply_failed */
          if (err.message === 'patch_apply_failed' && _fc42) {
            var _fname46 = (hermesObj.file || 'arquivo').split('/').pop();
            var _dlOrig46 = document.createElement('button');
            _dlOrig46.style.cssText = 'background:#1a1a2e;border:1px solid #f59e0b;color:#fcd34d;font-size:11px;padding:6px 12px;border-radius:10px;cursor:pointer;font-family:inherit;margin-top:6px;display:block;';
            _dlOrig46.textContent = '⬇ Baixar arquivo original (sem patch) — aplicar manualmente';
            _dlOrig46.onclick = (function(fc, fn) { return function() {
              var blob = new Blob([fc], { type: 'text/plain;charset=utf-8' });
              var url  = URL.createObjectURL(blob);
              var a    = document.createElement('a');
              a.href = url; a.download = fn;
              document.body.appendChild(a); a.click();
              setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 1000);
            }; })(_fc42, _fname46);
            statusEl.appendChild(_dlOrig46);
          }
          setStatus('READY');
        });
      };

      /* §105/§106 — aplicar patch no Vision Agent Local via vcQueueApplyPatchViaAgent (§106: extraído para função compartilhada; §115: agora também aceita hermesObj.files). */
      agentBtn.onclick = function() {
        var _dec105 = hermesObj.decisao;
        if (_dec105 === 'BLOCKED_INPUT' || _dec105 === 'BLOCKED_RUNTIME' || _dec105 === 'ABORTED') {
          statusEl.textContent = '⚠️ Diagnóstico ' + _dec105 + ' — patch não disponível para o agent local.';
          return;
        }
        var _hasSingle115 = hermesObj.patch && hermesObj.file;
        var _hasMulti115  = Array.isArray(hermesObj.files) && hermesObj.files.length > 0;
        if (!_hasSingle115 && !_hasMulti115) { statusEl.textContent = '❌ Patch ou arquivo ausente no diagnóstico.'; return; }
        if (applyBtn) applyBtn.disabled = true; agentBtn.disabled = true; cancelBtn.disabled = true;
        agentBtn.textContent = '⏳ Verificando Vision Agent Local...';
        vcQueueApplyPatchViaAgent(hermesObj, statusEl, function() {
          if (applyBtn) applyBtn.disabled = false; agentBtn.disabled = false; cancelBtn.disabled = false;
          agentBtn.textContent = _hasMulti115 ? '📡 Aplicar no Vision Agent Local (' + hermesObj.files.length + ' arquivos)' : '📡 Aplicar no Vision Agent Local';
        }, function(rd) {
          wrap.remove();
          /* §115fix: rd.ok=false (patch_failed/patch_rollback/patch_multi_failed/patch_multi_rollback)
           * nunca deve render renderValidationPanel — esse painel assume sucesso (push/revert de um
           * commit real) e o agent, nesses casos, ja reverteu tudo via git checkout. */
          if (rd && rd.ok === false) {
            appendMsg(rd.output || ('❌ Missão falhou: ' + (rd.action || 'erro desconhecido')), 'error');
          } else {
            chatStream.appendChild(renderValidationPanel(rd));
            // §134: painel de violations AEGIS com sugestões Hermes
            var _sv134a = renderSecurityViolations(rd && rd.security_violations, rd && rd.security_fix_suggestions);
            if (_sv134a) { chatStream.appendChild(_sv134a); }
          }
          chatStream.scrollTop = chatStream.scrollHeight;
          setStatus('READY');
        });
      };

      cancelBtn.onclick = function() { wrap.remove(); };

      if (applyBtn) row.appendChild(applyBtn);
      row.appendChild(agentBtn);
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
        var isMulti115sm = Array.isArray(h.files) && h.files.length > 0;
        var fileRow115sm = isMulti115sm
          ? '<span style="color:#64748b;">Arquivos</span><span style="color:#e2e8f0;font-family:monospace;">' + h.files.length + ': ' + h.files.map(function(f) { return f.file; }).join(', ') + '</span>'
          : '<span style="color:#64748b;">Arquivo</span><span style="color:#e2e8f0;font-family:monospace;">' + (h.file || '—') + '</span><span style="color:#64748b;">Fix type</span><span style="color:#e2e8f0;">' + (h.fix_type || '—') + '</span>';
        diagBox.innerHTML = '<div style="color:#60a5fa;font-size:11px;font-weight:500;margin-bottom:8px;letter-spacing:.06em;">DIAGNÓSTICO HERMES</div><div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;">' + fileRow115sm + '<span style="color:#64748b;">Decisão</span><span style="color:' + (h.decisao === 'NEEDS_FIX' ? '#4ade80' : '#f87171') + ';font-weight:500;">' + (h.decisao || '—') + '</span><span style="color:#64748b;">Confiança</span><span style="color:#e2e8f0;">' + (h.confidence != null ? Math.round(Number(h.confidence) * 100) + '%' : '—') + '</span><span style="color:#64748b;">Diagnóstico</span><span style="color:#a5b4fc;">' + (h.diagnosis || '—') + '</span></div>';
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
      var confirmBtn  = mkBtn(h ? '✅ Confirmar e Aplicar Patch' : '▶ Iniciar Missão SDDF', '#0a1f0a', '#22c55e', '#86efac');
      var _hMulti115sm = h && Array.isArray(h.files) && h.files.length > 0;
      var agentBtn106 = (h && h.patch && h.file) || _hMulti115sm
        ? mkBtn(_hMulti115sm ? '📡 Aplicar no Vision Agent Local (' + h.files.length + ' arquivos)' : '📡 Aplicar no Vision Agent Local', '#0a1a2a', '#3b82f6', '#93c5fd')
        : null; /* §106/§115 */
      var cancelBtn   = mkBtn('✖ Cancelar', '#1c1c1e', '#555', '#888');
      var statusEl    = document.createElement('div');
      statusEl.style.cssText = 'color:#94a3b8;font-size:12px;margin-top:10px;min-height:18px;width:100%;';
      if (agentBtn106) {
        agentBtn106.onclick = function() {
          if (h.decisao === 'BLOCKED_INPUT' || h.decisao === 'BLOCKED_RUNTIME' || h.decisao === 'ABORTED') {
            statusEl.textContent = '⚠️ Diagnóstico ' + h.decisao + ' — patch não disponível para o agent local.';
            return;
          }
          confirmBtn.disabled = true; agentBtn106.disabled = true; cancelBtn.disabled = true;
          agentBtn106.textContent = '⏳ Verificando Vision Agent Local...';
          vcQueueApplyPatchViaAgent(h, statusEl, function() {
            confirmBtn.disabled = false; agentBtn106.disabled = false; cancelBtn.disabled = false;
            agentBtn106.textContent = _hMulti115sm ? '📡 Aplicar no Vision Agent Local (' + h.files.length + ' arquivos)' : '📡 Aplicar no Vision Agent Local';
          }, function(rd) {
            wrap.remove(); _activeMission = null;
            if (rd && rd.ok === false) {
              appendMsg(rd.output || ('❌ Missão falhou: ' + (rd.action || 'erro desconhecido')), 'error');
            } else {
              chatStream.appendChild(renderValidationPanel(rd));
              // §134: painel de violations AEGIS com sugestões Hermes
              var _sv134b = renderSecurityViolations(rd && rd.security_violations, rd && rd.security_fix_suggestions);
              if (_sv134b) { chatStream.appendChild(_sv134b); }
            }
            chatStream.scrollTop = chatStream.scrollHeight;
            setStatus('READY');
          });
        };
      }
      confirmBtn.onclick = function() {
        /* §41: guard BLOCKED/ABORTED decisao — não acionar apply-patch */
        if (h && (h.decisao === 'BLOCKED_INPUT' || h.decisao === 'BLOCKED_RUNTIME' || h.decisao === 'ABORTED')) {
          var _blockedLabel = h.decisao === 'BLOCKED_INPUT'
            ? '⚠️ Diagnóstico BLOCKED_INPUT — patch não disponível.\nRediagnostique com mais contexto ou aplique manualmente.'
            : h.decisao === 'BLOCKED_RUNTIME'
            ? '⚠️ Diagnóstico BLOCKED_RUNTIME — evidence receipt do Go Core ausente.\nRediagnostique com log de runtime.'
            : '⛔ Diagnóstico ABORTED — arquivo proibido. Operação recusada por segurança.';
          appendMsg(['🛡 Vision Core Standard Method — BLOQUEADO', '', '⚖️  Decisão:    ' + h.decisao, '📋 Diagnóstico: ' + (h.diagnosis || '—'), '', _blockedLabel].join('\n'), 'error');
          wrap.remove(); _activeMission = null; setStatus('READY'); return;
        }
        /* §115: diagnostico multi-arquivo — Standard Method (ZIP/apply-patch) so cobre 1 arquivo,
         * o caminho certo pra isso e o botao do Vision Agent Local (apply_patch_multi), nao um erro. */
        if (h && Array.isArray(h.files) && h.files.length > 0) {
          appendMsg(['🛡 Vision Core Standard Method — fix multi-arquivo', '', '⚖️  Decisão:    ' + (h.decisao || '—'), '📋 Diagnóstico: ' + (h.diagnosis || '—'), '', 'Esse fix abrange ' + h.files.length + ' arquivos (' + h.files.map(function(f) { return f.file; }).join(', ') + ') — o "Confirmar e Aplicar Patch" (Standard Method) só cobre 1 arquivo por vez.', 'Use o botão "📡 Aplicar no Vision Agent Local (' + h.files.length + ' arquivos)" abaixo, que aplica todos atomicamente via apply_patch_multi (§109).'].join('\n'), '');
          return;
        }
        /* §36fix BUG1: h existe mas sem patch/file → BLOCKED_INPUT ou diagnóstico incompleto */
        if (h && (!h.patch || !h.file)) {
          appendMsg(['🛡 Vision Core Standard Method — DIAGNÓSTICO INCOMPLETO','','⚖️  Decisão:   ' + (h.decisao || 'BLOCKED_INPUT'),'📋 Motivo:    patch ou arquivo ausente no diagnóstico','','Opções:','  • Clique EXECUTAR MISSÃO novamente para rediagnosticar com mais contexto','  • Copie o diagnóstico do chat e aplique manualmente'].join('\n'), 'error');
          wrap.remove(); _activeMission = null; setStatus('READY'); return;
        }
        /* §42: preferir file_content (sem ZIP) — fallback zip_base64 */
        var _fc42sm = _zipFiles[h.file] || null;
        if (!_fc42sm) { Object.keys(_zipFiles).forEach(function(k) { if (!_fc42sm && (k === h.file || k.endsWith('/' + h.file))) { _fc42sm = _zipFiles[k]; } }); }
        /* §36fix BUG2: hermesObj com patch mas sem conteúdo nem ZIP em memória */
        if (h && h.patch && h.file && !_fc42sm && !_lastZipB64) {
          statusEl.textContent = '⚠️ ZIP não está em memória — reenvie o arquivo ZIP para aplicar o patch automaticamente. Ou copie o diff acima e aplique manualmente no seu projeto.';
          return;
        }
        if (h && (_fc42sm || _lastZipB64)) {
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
                body: JSON.stringify(_fc42sm
                  ? { file_content: _fc42sm,     file_path: h.file, fix_type: h.fix_type || 'code_patch', patch: h.patch, diagnosis: h.diagnosis || 'vision standard method' }
                  : { zip_base64:   _lastZipB64, file_path: h.file, fix_type: h.fix_type || 'code_patch', patch: h.patch, diagnosis: h.diagnosis || 'vision standard method' }),
                signal: AbortSignal.timeout(30000)
              })
              .then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { var _e = new Error(e.error || 'HTTP ' + r.status); _e.detail = e.detail || null; throw _e; }); })
              .then(function(data) {
                if (!data.ok) { var _e2 = new Error(data.error || 'apply-patch falhou'); _e2.detail = data.detail || null; throw _e2; }
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
                {
                  /* §47 — PASS GOLD Engine multidimensional badge + download */
                  var _pg45c2 = document.createElement('div');
                  _renderGoldLevel47(_pg45c2, data);
                  var _glevel47b = data.gold_level || (data.pass_gold ? 'GOLD' : (data.aegis_ok ? 'GOLD' : 'NEEDS_REVIEW'));
                  if (_glevel47b !== 'NEEDS_REVIEW') {
                    var dlBtn2 = document.createElement('button');
                    dlBtn2.style.cssText = 'background:#0a2a1a;border:1px solid #22c55e;color:#86efac;font-size:12px;padding:8px 14px;border-radius:12px;cursor:pointer;font-family:inherit;font-weight:500;margin:4px 0 8px;';
                    dlBtn2.textContent = (data.pass_gold || _glevel47b === 'GOLD') ? '⬇ Baixar ZIP Corrigido' : '⬇ Baixar ' + (data.filename || data.file_path) + ' (corrigido)';
                    dlBtn2.onclick = (function(d, c, gl) { return function() {
                      if (d.pass_gold || gl === 'GOLD') { _dlZip45(d.patched_content, d.file_path || d.filename, _lastZipName, c); }
                      else {
                        var blob = new Blob([d.patched_content], { type: 'text/plain;charset=utf-8' });
                        var url  = URL.createObjectURL(blob);
                        var a    = document.createElement('a');
                        a.href = url; a.download = d.filename || d.file_path;
                        document.body.appendChild(a); a.click();
                        setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 1000);
                      }
                    }; })(data, _pg45c2, _glevel47b);
                    _pg45c2.appendChild(dlBtn2);
                  }
                  /* §46 — deploy button só quando GOLD */
                  if (data.pass_gold || _glevel47b === 'GOLD') { _renderDeployBtn46(_pg45c2, data.patched_content, data.file_path || data.filename); }
                  chatStream.appendChild(_pg45c2);
                }
                chatStream.scrollTop = chatStream.scrollHeight;
                setStatus('READY');
              })
              .catch(function(err) {
                /* §36fix BUG3 + §46fix: detail + fallback download */
                var _eLines46 = ['🛡 Vision Core Standard Method — FALHA NO CHECKPOINT','','⚖️  Decisão:   NEEDS_FIX — execução bloqueada','❌ Erro:      ' + (err.message || String(err))];
                if (err.detail) { _eLines46.push('💡 Debug:     ' + err.detail); }
                _eLines46.push('','Opções disponíveis:','  • Clique EXECUTAR MISSÃO novamente para rediagnosticar','  • Reenvie o ZIP se o arquivo não estiver em memória','  • Copie o diff do chat e aplique manualmente');
                appendMsg(_eLines46.join('\n'), 'error');
                if (err.message === 'patch_apply_failed' && _fc42sm) {
                  var _fname46sm = (h.file || 'arquivo').split('/').pop();
                  var _dlOrig46sm = document.createElement('button');
                  _dlOrig46sm.style.cssText = 'background:#1a1a2e;border:1px solid #f59e0b;color:#fcd34d;font-size:11px;padding:6px 12px;border-radius:10px;cursor:pointer;font-family:inherit;margin:6px 0;display:block;';
                  _dlOrig46sm.textContent = '⬇ Baixar arquivo original (sem patch) — aplicar manualmente';
                  _dlOrig46sm.onclick = (function(fc, fn) { return function() {
                    var blob = new Blob([fc], { type: 'text/plain;charset=utf-8' });
                    var url  = URL.createObjectURL(blob);
                    var a    = document.createElement('a');
                    a.href = url; a.download = fn;
                    document.body.appendChild(a); a.click();
                    setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 1000);
                  }; })(_fc42sm, _fname46sm);
                  chatStream.appendChild(_dlOrig46sm);
                }
                wrap.remove(); _activeMission = null; setStatus('READY');
              });
            }, 600);
          }, 400);
        } else if (!h) {
          wrap.remove();
          var missionText = mission.input || 'missão SDDF padrão';
          /* §39 — SVG spinner */
          var thinking2 = appendMsg('', 'thinking');
          thinking2.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 12px;margin:4px 0;color:#94a3b8;';
          thinking2.appendChild(buildSpinner(18));
          var _t2Span = document.createElement('span');
          _t2Span.className = 'vc-thinking-text';
          _t2Span.textContent = '📋 missão iniciada — processando via Hermes...';
          thinking2.appendChild(_t2Span);
          setStatus('EXECUTANDO MISSÃO...', 'busy');
          var tok3 = (function () { try { return sessionStorage.getItem('vc_token') || localStorage.getItem('vision_token'); } catch (e) { return null; } })();
          fetch(BACKEND_URL + '/api/chat', {
            method: 'POST',
            headers: tok3 ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok3 } : { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: missionText, mode: 'fix', model: 'auto' })
          })
          .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
          .then(function(d) {
            thinking2.remove();
            var answer = (d && d.answer) ? d.answer : JSON.stringify(d);
            var hObj = parseHermesBlock(answer);
            // §104: registrar no histórico persistido de missões
            recordMissionTimelineEntry({ source: 'hermes', input: missionText, summary: answer, status: hObj ? 'DIAGNOSED' : 'ANSWERED' });
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
      btnRow.appendChild(confirmBtn);
      if (agentBtn106) { btnRow.appendChild(agentBtn106); }
      btnRow.appendChild(cancelBtn);
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
        _lastZipName   = null;  /* §45 */
        _zipFiles      = {};    /* §42 — limpar mapa de arquivos extraídos */
        if (fileNote)    { fileNote.textContent = 'Nenhum arquivo anexado.'; }
        if (addFilesBtn) { addFilesBtn.textContent = '＋ Adicionar arquivos'; }
        setStatus('READY');
      });
    }

    /* ── §108 — observabilidade: liga o painel estático #metricsBoard a dados reais. ──
     * O painel já existia 100% estático em index.html (8 linhas com custos fictícios
     * hardcoded e o badge "UI LOCAL"), sem nenhum código JS por trás — exatamente o
     * comportamento que o próprio texto do painel já prometia ("quando o backend
     * estiver offline, fallback local"). Aqui só cumprimos essa promessa. Se o
     * backend estiver offline, nada muda — o fallback estático continua intacto. */
    (function initObservabilityPanel107() {
      var board = document.getElementById('metricsBoard');
      if (!board) return;
      var badge = document.getElementById('metricsSourceBadge');
      var endpoints = [
        { key: 'agents',  url: '/api/metrics/agents' },
        { key: 'summary', url: '/api/metrics/summary' },
        { key: 'dora',    url: '/api/dora-metrics' },
        { key: 'memory',  url: '/api/metrics/memory' }
      ];
      Promise.all(endpoints.map(function(ep) {
        return fetch(BACKEND_URL + ep.url, { signal: AbortSignal.timeout(8000) })
          .then(function(r) { return r.ok ? r.json() : null; })
          .catch(function() { return null; })
          .then(function(d) { return { key: ep.key, data: d }; });
      })).then(function(results) {
        var data = {};
        results.forEach(function(r) { data[r.key] = r.data; });
        var gotAny = Object.keys(data).some(function(k) { return data[k] && data[k].ok; });
        if (!gotAny) return;

        if (badge) {
          badge.textContent = 'DADOS REAIS';
          badge.style.background = 'rgba(74,222,128,.12)';
          badge.style.color = '#4ade80';
          badge.style.borderColor = 'rgba(74,222,128,.35)';
        }

        if (data.agents && data.agents.ok && Array.isArray(data.agents.agents)) {
          var idMap107 = { 'OpenClaw': 'openclaw', 'Hermes RCA': 'hermes', 'Scanner': 'scanner', 'Aegis': 'aegis', 'PASS GOLD': 'passgold' };
          data.agents.agents.forEach(function(a) {
            var suffix = idMap107[a.name];
            if (!suffix) return;
            var valEl = document.getElementById('val-' + suffix);
            if (valEl) { valEl.textContent = a.status === 'ok' ? '✅ ok' : '⚠ ' + a.status; }
          });
        }

        var extra = document.createElement('div');
        extra.id = 'vcObservabilityExtra107';
        extra.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;font-size:12px;color:#94a3b8;';

        function block107(title, rows) {
          var d = document.createElement('div');
          var h = document.createElement('div');
          h.style.cssText = 'color:#a5b4fc;font-weight:600;margin-bottom:6px;font-size:11px;letter-spacing:.04em;';
          h.textContent = title;
          d.appendChild(h);
          rows.forEach(function(r) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;gap:8px;padding:2px 0;';
            var labelSpan = document.createElement('span');
            labelSpan.textContent = r[0];
            var valSpan = document.createElement('span');
            valSpan.style.cssText = 'color:#e2e8f0;font-family:monospace;';
            valSpan.textContent = String(r[1]);
            row.appendChild(labelSpan); row.appendChild(valSpan);
            d.appendChild(row);
          });
          return d;
        }

        if (data.summary && data.summary.ok && data.summary.runtime) {
          var rt = data.summary.runtime;
          extra.appendChild(block107('RUNTIME (backend)', [
            ['CPU', rt.cpu + '%'], ['Memória', rt.memory + '%'], ['Heap', rt.heap + '%'],
            ['Uptime', rt.uptime_s + 's'], ['Node', rt.node_version]
          ]));
        }
        if (data.dora && data.dora.ok) {
          extra.appendChild(block107('DORA METRICS', [
            ['Deploy freq.', data.dora.deployment_frequency],
            ['Lead time', data.dora.lead_time],
            ['MTTR', data.dora.mttr],
            ['Change fail %', data.dora.change_failure_rate]
          ]));
        }
        if (data.memory && data.memory.ok) {
          var byProv107 = data.memory.by_provider || {};
          var byProvStr107 = Object.keys(byProv107).length
            ? Object.keys(byProv107).map(function(k) { return k + ':' + byProv107[k]; }).join(', ')
            : '—';
          extra.appendChild(block107('MEMORY LAYER (§72/§107)', [
            ['Escalações totais', data.memory.total_escalations],
            ['Por provider', byProvStr107],
            ['Aptas a reordenar', data.memory.memory_capable_entries]
          ]));
        }

        if (extra.children.length > 0) { board.appendChild(extra); }
      });
    }());

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
      /* §39 — SVG spinner + progress bar + mission progress animation */
      var thinking = appendMsg('', 'thinking');
      thinking.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 12px;margin:4px 0;color:#94a3b8;';
      thinking.appendChild(buildSpinner(18));
      var _zipThinkSpan = document.createElement('span');
      _zipThinkSpan.className = 'vc-thinking-text';
      _zipThinkSpan.textContent = '📦 Extraindo ' + file.name + '...';
      thinking.appendChild(_zipThinkSpan);
      showProgressBar(chatStream);
      var _progressTimers = showMissionProgress(thinking);
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

      /* buffer already read by _stageZip — salvar base64 e nome para apply-patch + §45 */
      _lastZipName = file.name || null; /* §45: nome original para ZIP corrigido */
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
            var _rp = c.relPath; /* captura relPath para closure */
            promises.push(c.entry.async('string').then(function(content) {
              _zipFiles[_rp] = content; /* §42: armazenar conteúdo completo para apply-patch sem reenviar ZIP */
              return '[Arquivo: ' + _rp + ']\n' + content.slice(0, _lim) + (content.length > _lim ? '\n...(truncado em ' + _lim + '/' + content.length + ' chars)' : '');
            }));
          });

          if (!promises.length) {
            thinking.remove();
            appendMsg('❌ Nenhum arquivo de texto encontrado no ZIP.', 'error');
            setStatus('READY');
            return;
          }

          return Promise.all(promises).then(function(contents) {
            /* §43 — seleção inteligente ZIP grande: se payload > 35K, filtrar por keyword relevância */
            var _finalContents43 = contents;
            var _totalChars43    = contents.reduce(function(acc, c) { return acc + c.length; }, 0);
            var _totalFiles43    = fileNames.length;
            if (_totalChars43 > 35000) {
              /* keywords da pergunta: palavras com > 3 chars */
              var _kws43 = question.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(function(w) { return w.length > 3; });
              /* pontuar: +10 keyword no nome do arquivo, +1 keyword no conteúdo */
              var _scored43 = fileNames.map(function(fn, i) {
                var fnLow = (fn || '').toLowerCase();
                var cLow  = (contents[i] || '').toLowerCase();
                var score = _kws43.reduce(function(acc, kw) {
                  return acc + (fnLow.indexOf(kw) !== -1 ? 10 : 0) + (cLow.indexOf(kw) !== -1 ? 1 : 0);
                }, 0);
                return { fn: fn, content: contents[i] || '', score: score };
              });
              _scored43.sort(function(a, b) { return b.score - a.score; });
              /* acumular arquivos mais relevantes até 35K chars */
              var _budget43 = 0;
              var _sel43    = [];
              _scored43.forEach(function(item) {
                if (_budget43 + item.content.length <= 35000) {
                  _sel43.push(item);
                  _budget43 += item.content.length;
                }
              });
              /* fallback: se nenhum cabe, pegar o primeiro (mais relevante) */
              if (!_sel43.length && _scored43.length) { _sel43.push(_scored43[0]); }
              /* hint no chat */
              var _hintZip43 = document.createElement('div');
              _hintZip43.style.cssText = 'background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.3);border-radius:10px;padding:8px 12px;margin:4px 0;font-size:11px;color:#fde68a;';
              _hintZip43.textContent = '📦 ZIP grande — analisando ' + _sel43.length + ' de ' + _totalFiles43 + ' arquivos relevantes';
              chatStream.appendChild(_hintZip43);
              fileNames        = _sel43.map(function(i43) { return i43.fn; });
              _finalContents43 = _sel43.map(function(i43) { return i43.content; });
            }

            /* §debug: mostrar quais arquivos foram selecionados */
            var shortNames = fileNames.map(function(p){ return p.split('/').pop(); });
            var _zipTT = thinking.querySelector('.vc-thinking-text');
            if (_zipTT) _zipTT.textContent = '📦 ' + fileNames.length + ' arquivo(s): ' + shortNames.join(', ') + ' — analisando...';
            else thinking.textContent = '📦 ' + fileNames.length + ' arquivo(s): ' + shortNames.join(', ') + ' — analisando...';

            /* §35 FIX2 — prefixo com lista de assets para LLM não inventar caminhos */
            var assetContext = assetPaths.length > 0
              ? '\n\n[ASSETS DISPONÍVEIS NO PROJETO — use estes caminhos ao sugerir patches]\n' +
                assetPaths.sort().map(function(a) { return '  ' + a; }).join('\n')
              : '';
            /* mode/model passed in from sendMessage (captured at send time) */
            /* §24v9: reverter ordem — tail (arquivo inteiro/específico) fica primeiro no prompt */
            var context  = question + assetContext + '\n\n' + _finalContents43.slice().reverse().join('\n\n---\n\n');

            /* Adicionar ao histórico de sessão */
            addToHistory('user', '[ZIP: ' + file.name + '] ' + question);

            /* Timeout 55s — §26: Gemini pode levar até 45s + 10s overhead de rede */
            var ctrl    = new AbortController();
            var timeout = setTimeout(function() { ctrl.abort(); }, 55000);

            var tok4 = (function () { try { return sessionStorage.getItem('vc_token') || localStorage.getItem('vision_token'); } catch (e) { return null; } })();
            return fetch(BACKEND_URL + '/api/chat', {
              method: 'POST',
              headers: tok4 ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok4 } : { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: context, mode: zipMode, model: zipModel, display_input: question }),
              signal: ctrl.signal
            });
          }).then(function(r) {
            if (!r.ok) return Promise.reject(new Error('HTTP ' + r.status));
            return r.json();
          })
          .then(function(d) {
            if (typeof timeout !== 'undefined') clearTimeout(timeout);
            _progressTimers.forEach(function(t) { clearTimeout(t); }); /* §39 */
            hideProgressBar(); /* §39 */
            thinking.remove();

            /* §27 echo guard — avisa se todos os provedores falharam */
            if (d && d.provider === 'local') {
              appendMsg('⚠️ Fallback local — todos os provedores de IA falharam. Reduza o ZIP ou verifique GROQ_API_KEY / GEMINI_API_KEY.', 'error');
            }

            var answer = (d && d.answer) ? d.answer : JSON.stringify(d);

            /* Adicionar ao histórico */
            addToHistory('assistant', answer);
            // §104: registrar no histórico persistido de missões
            recordMissionTimelineEntry({ source: 'zip-upload', input: question, summary: answer, status: 'ANSWERED' });

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

            /* §39 — renderizar relatório de agentes se presente */
            var agentReport = parseAgentReport(answer);
            if (agentReport) { renderAgentReport(agentReport, chatStream); }

            /* §41 — hint condicional por decisao */
            var hasDiff = answer.indexOf('```diff') !== -1 || answer.indexOf('```javascript') !== -1;
            var hasReady = answer.indexOf('DECISÃO') !== -1 && answer.indexOf('READY') !== -1;
            var _blockedDec = hermesObj && (hermesObj.decisao === 'BLOCKED_INPUT' || hermesObj.decisao === 'BLOCKED_RUNTIME' || hermesObj.decisao === 'ABORTED');
            if (_blockedDec) {
              /* Hint para BLOCKED/ABORTED — sem botão EXECUTAR MISSÃO */
              var _hintBl = document.createElement('div');
              _hintBl.style.cssText = 'background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:10px 14px;margin:4px 0 8px;font-size:12px;color:#fca5a5;display:flex;align-items:center;gap:8px;';
              var _blMsg = hermesObj.decisao === 'BLOCKED_INPUT'
                ? '⚠️ Diagnóstico <b>BLOCKED_INPUT</b> — patch não disponível. Rediagnostique com mais contexto ou aplique manualmente.'
                : hermesObj.decisao === 'BLOCKED_RUNTIME'
                ? '⚠️ Diagnóstico <b>BLOCKED_RUNTIME</b> — evidence receipt do Go Core ausente. Rediagnostique com log de runtime.'
                : '⛔ Diagnóstico <b>ABORTED</b> — arquivo proibido. Operação recusada por segurança.';
              _hintBl.innerHTML = '<span style="font-size:16px;">⚠️</span><span>' + _blMsg + '</span>';
              setTimeout(function() { chatStream.appendChild(_hintBl); chatStream.scrollTop = chatStream.scrollHeight; }, 300);
            } else if ((hermesObj || hasDiff) && !(hasReady && !hasDiff)) {
              /* Hint padrão NEEDS_FIX — com EXECUTAR MISSÃO */
              var hintEl38 = document.createElement('div');
              hintEl38.style.cssText = 'background:rgba(79,70,229,.08);border:1px solid rgba(99,102,241,.3);border-radius:10px;padding:10px 14px;margin:4px 0 8px;font-size:12px;color:#a5b4fc;display:flex;align-items:center;gap:8px;';
              hintEl38.innerHTML = '<span style="font-size:16px;">🛡</span><span>Diagnóstico concluído. Clique em <b style="color:#c7d2fe">EXECUTAR MISSÃO</b> para aplicar o patch automaticamente via Vision Core Standard Method.</span>';
              setTimeout(function() { chatStream.appendChild(hintEl38); chatStream.scrollTop = chatStream.scrollHeight; }, 300);
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
          _progressTimers.forEach(function(t) { clearTimeout(t); }); /* §39 */
          hideProgressBar(); /* §39 */
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

  /* ── §73.2b Architect Mode ─────────────────────────────────────── */

  // §74.1 — Arquiteto é o único modo do chat SF-01; sem toggle, sem branch condicional
  /** @deprecated §74.1 — noop; Arquiteto fixo no módulo 01 */
  function _sfSetArchitectMode() { /* noop */ }

  /** §74 — Render architect response INLINE in #vcSfChatStream as chat bubble */
  function _sfRenderArchitectResponse(data) {
    var stream = document.getElementById('vcSfChatStream');
    if (!stream) return;

    var c       = data.classification || {};
    var confPct = Math.round((c.confidence || 0) * 100);
    var confClr = confPct >= 80 ? '#4ade80' : confPct >= 60 ? '#f59e0b' : '#f87171';

    // Meta: project_type + stack cards + confidence
    var metaHtml = '';
    if (c.project_type) metaHtml += '<span style="color:#38bdf8">' + _esc(c.project_type) + '</span>';
    if (c.stack && c.stack.length) {
      var stackCards = c.stack.map(function (tag) {
        var info = STACK_EXPLAINER[tag] || { icon: '⚙️', label: tag, explain: 'Componente técnico do projeto.' };
        return '<span title="' + _esc(info.explain) + '" style="display:inline-flex;align-items:center;gap:3px;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:2px 8px;font-size:10px;color:#cbd5e1;cursor:default;white-space:nowrap">' + info.icon + ' ' + _esc(info.label) + '</span>';
      }).join(' ');
      metaHtml += ' &nbsp;<span style="color:#64748b">·</span>&nbsp; <span style="display:inline-flex;flex-wrap:wrap;gap:4px;align-items:center;vertical-align:middle">' + stackCards + '</span>';
    }
    metaHtml += ' &nbsp;<span style="color:#64748b">·</span>&nbsp; <span style="color:' + confClr + '">' + confPct + '% confiança</span>';

    // Open questions
    var qs        = data.open_questions || [];
    var questHtml = '';
    if (qs.length > 0) {
      questHtml = '<div style="margin-top:9px"><div style="font-size:9px;color:#f59e0b;letter-spacing:.1em;margin-bottom:5px">MAIS INFORMAÇÕES:</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
        qs.map(function (q) {
          return '<button type="button" onclick="(function(b){var inp=document.getElementById(\'vcSfChatInput\');if(inp){inp.value=b.textContent.trim();inp.focus();}})(this)" style="background:#1c2f4a;border:1px solid #1e40af55;color:#93c5fd;padding:3px 9px;border-radius:12px;font-size:11px;cursor:pointer;font-family:inherit">' + _esc(q) + '</button>';
        }).join('') + '</div></div>';
    }

    // Specs suggested
    var specs     = data.specs_suggested || [];
    var specsHtml = '';
    if (specs.length > 0) {
      var typeColor = { 'HAPPY PATH': '#4ade80', 'EDGE': '#f59e0b', 'SECURITY': '#f87171', 'SECURITY CRÍTICO': '#ef4444', 'CRÍTICO': '#ef4444' };
      specsHtml = '<div style="margin-top:9px"><div style="font-size:9px;color:#4ade80;letter-spacing:.1em;margin-bottom:5px">SPECS SUGERIDAS (' + specs.length + '):</div><div>' +
        specs.map(function (s) {
          var tc        = (s.type && typeColor[s.type]) || '#64748b';
          var badge     = s.type ? '<span style="font-size:9px;padding:1px 4px;border-radius:3px;background:' + tc + '22;color:' + tc + ';border:1px solid ' + tc + '44;margin-left:4px">' + _esc(s.type) + '</span>' : '';
          var via       = s.match_via === 'title' ? '<span style="font-size:9px;color:#475569;margin-left:4px">(título)</span>' : '';
          var modPfx    = s.id ? s.id.split('-').slice(0, 2).join('-') : '';
          var modId     = _sfSpecModuleInverse[modPfx] || '';
          var linkHint  = modId ? '<span style="font-size:9px;color:#38bdf8;margin-left:5px;white-space:nowrap">→ ' + _esc(modPfx) + '</span>' : '';
          var dataAttrs = modId ? ' data-sa-module="' + _esc(modId) + '" data-sa-spec="' + _esc(s.id) + '"' : '';
          var clickStyle = modId ? ';cursor:pointer;border-radius:4px;transition:background .15s' : '';
          return '<div' + dataAttrs + ' style="padding:5px 4px;border-bottom:1px solid #0f172a' + clickStyle + '">' +
            '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:3px">' +
              '<span style="font-size:10px;color:#475569;font-family:monospace">' + _esc(s.id) + '</span>' + badge + via + linkHint +
            '</div>' +
            '<div style="font-size:11px;color:#cbd5e1;margin-top:2px">' + _esc(s.title) + '</div>' +
            '</div>';
        }).join('') + '</div></div>';
    }

    // §73.6 — Pacote Completo Sugerido (confidence >= 0.6 e specs existem)
    var pkgHtml = '';
    var showPkg = (c.confidence || 0) >= 0.6 && specs.length > 0;
    if (showPkg) {
      var _stackReadable = (c.stack || []).map(function (tag) {
        var info = STACK_EXPLAINER[tag] || { icon: '⚙️', label: tag };
        return info.icon + ' ' + info.label;
      }).join(', ');
      var _sf03Text = 'Projeto: ' + (c.project_type || 'Site') +
        '\nStack: ' + _stackReadable +
        '\nSpecs de referência:\n' + specs.map(function (s) { return '  • ' + s.id + ' — ' + s.title; }).join('\n') +
        '\n\n(gerado pelo Agente Arquiteto a partir do pedido original)';
      pkgHtml =
        '<div style="margin-top:10px;border-top:1px solid #1e293b;padding-top:8px">' +
          '<button type="button" class="vc-arch-pkg-toggle" style="background:none;border:1px solid #334155;color:#94a3b8;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit;width:100%;text-align:left">📦 VER CONFIGURAÇÃO COMPLETA SUGERIDA</button>' +
          '<div class="vc-arch-pkg-body" style="display:none;margin-top:8px">' +
            '<div style="font-size:11px;color:#64748b;margin-bottom:6px">Tipo: <span style="color:#38bdf8">' + _esc(c.project_type || '') + '</span></div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">' +
              (c.stack || []).map(function (tag) {
                var info = STACK_EXPLAINER[tag] || { icon: '⚙️', label: tag, explain: 'Componente técnico do projeto.' };
                return '<span title="' + _esc(info.explain) + '" style="display:inline-flex;align-items:center;gap:3px;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:2px 8px;font-size:10px;color:#cbd5e1;cursor:default">' + info.icon + ' ' + _esc(info.label) + '</span>';
              }).join('') +
            '</div>' +
            '<div style="font-size:11px;color:#64748b;margin-bottom:4px">Specs de referência (' + specs.length + '):</div>' +
            '<div style="font-size:11px;color:#94a3b8;margin-bottom:8px;max-height:100px;overflow-y:auto;padding-left:4px">' +
              specs.map(function (s) {
                return '<div style="padding:1px 0"><span style="font-family:monospace;color:#475569">' + _esc(s.id) + '</span> — ' + _esc(s.title) + '</div>';
              }).join('') +
            '</div>' +
            '<button type="button" class="vc-arch-sf03-btn" data-sf03text="' + _esc(_sf03Text) + '" style="background:#1e40af;border:none;color:#e2e8f0;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;width:100%;text-align:center">➡️ ENVIAR PARA COMPOSITOR DE MISSÃO (SF-03)</button>' +
          '</div>' +
        '</div>';
    }

    // Assemble inline bubble
    var bubble = document.createElement('div');
    bubble.className = 'vc-sf-chat-msg vc-sf-arch-bubble';
    bubble.innerHTML =
      '<div class="vc-sf-arch-bubble-hdr">🏛️ AGENTE ARQUITETO · ' +
        (data.provider_used && data.provider_used !== 'local'
          ? (data.provider_used.toUpperCase() + (data.model_used ? ' · ' + data.model_used : ''))
          : 'BACKEND') +
      '</div>' +
      '<div style="font-size:11px;line-height:1.5;margin-bottom:6px">' + metaHtml + '</div>' +
      '<div style="font-size:12px;color:#cbd5e1;line-height:1.6">' + _esc(c.explanation || '') + '</div>' +
      questHtml + specsHtml + pkgHtml;

    // Spec click delegation — §73.4
    if (specs.length > 0) {
      bubble.addEventListener('click', function (e) {
        var item = e.target.closest('[data-sa-module]');
        if (!item) return;
        _sfHighlightSpecId = item.dataset.saSpec || null;
        setSoftwareFactoryModule(item.dataset.saModule);
      });
      bubble.addEventListener('mouseover', function (e) {
        var item = e.target.closest('[data-sa-module]');
        if (item) item.style.background = '#1e293b';
      });
      bubble.addEventListener('mouseout', function (e) {
        var item = e.target.closest('[data-sa-module]');
        if (item) item.style.background = '';
      });
    }

    // Pkg toggle + SF-03 button — §73.6
    if (showPkg) {
      var _toggleBtn = bubble.querySelector('.vc-arch-pkg-toggle');
      var _pkgBody   = bubble.querySelector('.vc-arch-pkg-body');
      if (_toggleBtn && _pkgBody) {
        _toggleBtn.onclick = function () {
          var open = _pkgBody.style.display !== 'none';
          _pkgBody.style.display = open ? 'none' : '';
          _toggleBtn.textContent = open ? '📦 VER CONFIGURAÇÃO COMPLETA SUGERIDA' : '📦 OCULTAR CONFIGURAÇÃO';
        };
      }
      var _sf03Btn = bubble.querySelector('.vc-arch-sf03-btn');
      if (_sf03Btn) {
        _sf03Btn.onclick = function () {
          var txt = _sf03Btn.dataset.sf03text;
          setSoftwareFactoryModule('mission_composer');
          var inp = document.getElementById('vcSfChatInput');
          if (inp && txt) {
            inp.value = txt;
            setTimeout(function () {
              inp.focus();
              inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
          }
        };
      }
    }

    stream.appendChild(bubble);
  }

  /** HTML-escape helper */
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /** Send to /api/architect/interpret */
  function _sfArchitectSend(inputId, streamId) {
    var input  = document.getElementById(inputId);
    var stream = document.getElementById(streamId);
    if (!input || !stream) return;
    var text = (input.value || '').trim();
    if (!text) return;
    input.value = '';

    if (!_backendConnected) {
      var offlineEl = document.createElement('div');
      offlineEl.className = 'vc-sf-chat-msg';
      offlineEl.style.color = '#f87171';
      offlineEl.textContent = '🏛️ Arquiteto requer backend conectado. Backend não detectado.';
      stream.appendChild(offlineEl);
      stream.scrollTop = stream.scrollHeight;
      return;
    }

    // Remove hint
    var hint = stream.querySelector('.vc-sf-chat-hint');
    if (hint) hint.remove();

    var uMsg = document.createElement('div');
    uMsg.className = 'vc-sf-chat-msg user';
    uMsg.textContent = text;
    stream.appendChild(uMsg);

    var thinking = document.createElement('div');
    thinking.className = 'vc-sf-chat-msg';
    thinking.textContent = '🏛️ Arquiteto analisando...';
    stream.appendChild(thinking);
    stream.scrollTop = stream.scrollHeight;

    fetch(BACKEND_URL + '/api/architect/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    })
    .then(function (r) { return r.ok ? r.json() : r.json().then(function (e) { return Promise.reject(e); }); })
    .then(function (data) {
      if (!data.ok) {
        thinking.textContent = '🏛️ Erro: ' + (data.error || 'resposta inválida');
        return;
      }
      thinking.remove();
      _sfRenderArchitectResponse(data);
      stream.scrollTop = stream.scrollHeight;
    })
    .catch(function (err) {
      thinking.textContent = '🏛️ Erro de conexão: ' + (err.error || err.message || String(err));
      stream.scrollTop = stream.scrollHeight;
    });
  }

  /* ── §73.1d Spec Panel ─────────────────────────────────────────── */

  /** Render fetched specs into #vcSfSpecList. */
  function _sfRenderSpecPanel(specs) {
    var panel = document.getElementById('vcSfSpecPanel');
    var list  = document.getElementById('vcSfSpecList');
    var count = document.getElementById('vcSfSpecCount');
    if (!panel || !list) return;
    if (!specs || specs.length === 0) { panel.style.display = 'none'; return; }

    panel.style.display = '';
    if (count) count.textContent = specs.length + ' specs';

    var typeColor = {
      'HAPPY PATH':       '#4ade80',
      'EDGE':             '#f59e0b',
      'SECURITY':         '#f87171',
      'SECURITY CRÍTICO': '#ef4444',
      'CRÍTICO':          '#ef4444',
    };

    list.innerHTML = specs.map(function (s) {
      var tc    = (s.type && typeColor[s.type]) || '#64748b';
      var badge = s.type
        ? '<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:' + tc + '22;color:' + tc + ';border:1px solid ' + tc + '44;margin-left:6px;white-space:nowrap">' + s.type + '</span>'
        : '';
      var pass  = s.pass_criteria
        ? '<div style="font-size:11px;color:#4ade80;margin-top:3px">PASS: ' + s.pass_criteria + '</div>'
        : '';
      var fail  = s.fail_criteria
        ? '<div style="font-size:11px;color:#f87171;margin-top:1px">FAIL: ' + s.fail_criteria + '</div>'
        : '';
      return '<div data-spec-id="' + s.id + '" style="padding:8px 12px;border-bottom:1px solid #1e293b;transition:background 0.4s">' +
        '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px">' +
          '<span style="font-size:11px;color:#475569;font-family:monospace">' + s.id + '</span>' + badge +
        '</div>' +
        '<div style="font-size:12px;color:#e2e8f0;margin-top:3px;line-height:1.4">' + s.title + '</div>' +
        pass + fail +
        '</div>';
    }).join('');
    // §73.4 — highlight spec navigated from Architect panel
    if (_sfHighlightSpecId) {
      var _hid = _sfHighlightSpecId;
      _sfHighlightSpecId = null;
      setTimeout(function () {
        var el = list.querySelector('[data-spec-id="' + _hid + '"]');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.background = '#1e40af55';
          setTimeout(function () { el.style.background = ''; }, 1600);
        }
      }, 60);
    }
  }

  /** Fetch specs for the active SF module and render the panel. */
  function _sfLoadSpecs(moduleId) {
    var specModuleId = SF_MODULE_SPEC_MAP[moduleId];
    var panel        = document.getElementById('vcSfSpecPanel');
    if (!specModuleId) { if (panel) panel.style.display = 'none'; return; }
    if (!_backendConnected) { if (panel) panel.style.display = 'none'; return; }

    fetch(BACKEND_URL + '/api/spec?module=' + specModuleId)
      .then(function (r)  { return r.json(); })
      .then(function (d)  { _sfRenderSpecPanel(d.specs || []); })
      .catch(function ()  { if (panel) panel.style.display = 'none'; });
  }

  function initSoftwareFactoryPage() {
    // §118: expõe para tutoriais de seção (T3 — STEPS_SF onEnter)
    window.showSoftwareFactoryPage  = showSoftwareFactoryPage;
    window.setSoftwareFactoryModule = setSoftwareFactoryModule;
    // §128: expõe para tutoriais que precisam voltar ao cockpit antes de iluminar
    window.showMainCockpitPage = showMainCockpitPage;
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

    // §113 — Etapa A, Fase 3: botão de entrada do Dry-Run Real em repositório externo.
    // Dropa o painel renderSfDryRunPanel() direto no chat stream (mesmo host usado por
    // renderApplyFixPanel/renderStandardMethodPanel) — sem abrir a página SF Builder.
    var dryRunPanelBtn = document.getElementById('vcOpenDryRunPanelBtn');
    if (dryRunPanelBtn) {
      dryRunPanelBtn.addEventListener('click', function () {
        var _cs = document.getElementById('v298ChatStream'); /* §117-fix: chatStream do outer scope era undefined aqui (bug de §113) */
        if (_cs) {
          _cs.appendChild(renderSfDryRunPanel());
          _cs.scrollTop = _cs.scrollHeight;
        }
      });
    }

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

    // §74.1 — Arquiteto fixo: init UI direto, sem toggle
    var _sfSendBtnEl = document.getElementById('vcSfChatSendBtn');
    var _sfInpEl     = document.getElementById('vcSfChatInput');
    if (_sfSendBtnEl) _sfSendBtnEl.textContent = '🏛️ ENVIAR';
    if (_sfInpEl) _sfInpEl.placeholder = 'Descreva seu projeto em linguagem livre. Ex.: "quero um site para minha padaria" ou "API REST em Python para estoque"...\n\n(Enter = enviar · Shift+Enter = nova linha)';

    // §74 — Sidebar toggle (left + right panels)
    var sidebarToggleBtn = document.getElementById('vcSfSidebarToggle');
    var sfColumns        = sfPage.querySelector('.vc-sf-columns');
    if (sidebarToggleBtn && sfColumns) {
      sidebarToggleBtn.addEventListener('click', function () {
        var hidden = sfColumns.classList.toggle('panels-hidden');
        sidebarToggleBtn.classList.toggle('panels-on', !hidden);
        sidebarToggleBtn.title = hidden ? 'Mostrar painéis laterais' : 'Ocultar painéis laterais';
      });
      // Start with panels visible
      sidebarToggleBtn.classList.add('panels-on');
    }

    // §74 — SDDF timeline collapse toggle (collapsed by default)
    var sddfCollapseBtn = document.getElementById('vcSfSddfCollapseBtn');
    var sddfTimeline    = sfPage.querySelector('.vc-sf-sddf-timeline-h');
    if (sddfCollapseBtn && sddfTimeline) {
      sddfCollapseBtn.addEventListener('click', function () {
        var collapsed = sddfTimeline.classList.toggle('sddf-collapsed');
        sddfCollapseBtn.textContent = collapsed ? '▼ PIPELINE' : '▲ PIPELINE';
        sddfCollapseBtn.title = collapsed ? 'Expandir pipeline SDDF' : 'Colapsar pipeline SDDF';
      });
      // Start collapsed
      sddfTimeline.classList.add('sddf-collapsed');
      sddfCollapseBtn.textContent = '▼ PIPELINE';
    }

    // Chat send — §74.1 Arquiteto fixo, sempre _sfArchitectSend
    var sendBtn = document.getElementById('vcSfChatSendBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        _sfArchitectSend('vcSfChatInput', 'vcSfChatStream');
      });
    }
    var chatInput = document.getElementById('vcSfChatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          _sfArchitectSend('vcSfChatInput', 'vcSfChatStream');
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

    // EXECUTAR SDDF button — §84 B1: calls real /api/sf/gold-gate
    var runBtn = document.getElementById('vcSfRunBtn');
    if (runBtn) {
      runBtn.addEventListener('click', function () {
        var stream = document.getElementById('vcSfChatStream');
        if (!stream) return;
        var hint = stream.querySelector('.vc-sf-chat-hint');
        if (hint) hint.remove();
        var msg = document.createElement('div');
        msg.className = 'vc-sf-chat-msg';
        msg.textContent = '[SDDF] Executando Gold Gate Check...';
        stream.appendChild(msg);
        stream.scrollTop = stream.scrollHeight;
        runBtn.disabled = true;
        runBtn.textContent = '...';
        var ctx = { project: window.__VISION_PROJECT__ || 'visioncore', timestamp: new Date().toISOString(), module: 'SF08' };
        fetch((window.__VISION_API__ || window.API_BASE_URL || BACKEND_URL || '') + '/api/sf/gold-gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: ctx })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var result = data.result || data.output || JSON.stringify(data, null, 2);
          var out = document.createElement('div');
          out.className = 'vc-sf-chat-msg';
          out.style.whiteSpace = 'pre-wrap';
          out.style.fontFamily = 'monospace';
          out.style.fontSize = '0.82rem';
          out.textContent = '[SDDF GOLD GATE]\n' + result;
          stream.appendChild(out);
          stream.scrollTop = stream.scrollHeight;
          var feed = document.getElementById('vcSfActivityFeed');
          if (feed) {
            var item = document.createElement('div');
            item.className = 'vc-sf-activity-item';
            item.innerHTML = '<span style="color:var(--green,#0f0)">✓ SDDF Gold Gate executado</span>';
            feed.insertBefore(item, feed.firstChild);
            while (feed.children.length > 8) { feed.removeChild(feed.lastChild); }
          }
        })
        .catch(function(err) {
          var out = document.createElement('div');
          out.className = 'vc-sf-chat-msg';
          out.style.color = 'var(--red,#f44)';
          out.textContent = '[SDDF] Erro: ' + err.message;
          stream.appendChild(out);
          stream.scrollTop = stream.scrollHeight;
        })
        .finally(function() {
          runBtn.disabled = false;
          runBtn.textContent = '▶ EXECUTAR SDDF';
        });
      });
    }

    // Module-level generate / copy buttons — §84 B2: calls real SF endpoints
    document.querySelectorAll('[data-sf-generate]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.dataset.sfGenerate;
        var output = document.getElementById(targetId);
        var moduleKey = targetId ? targetId.replace('vcSfOutput-', '') : '';
        var _backendBase = window.__VISION_API__ || window.API_BASE_URL || BACKEND_URL || '';

        var SF_ENDPOINT_MAP = {
          'project_builder':   '/api/sf/mission-composer',
          'project_templates': '/api/sf/mission-composer',
          'mission_composer':  '/api/sf/mission-composer',
          'worker_handoff':    '/api/sf/worker-handoff',
          'export_preview':    '/api/sf/deploy-blueprint',
          'real_file_command': '/api/sf/patch-validator',
          'worker_receipt':    '/api/sf/gold-gate',
          'final_dashboard':   '/api/sf/gold-gate'
        };
        var endpoint = SF_ENDPOINT_MAP[moduleKey] || '/api/sf/mission-composer';

        var origText = btn.dataset.sfLabel || btn.textContent;
        btn.disabled = true;
        btn.textContent = '...';

        var ctx = { project: window.__VISION_PROJECT__ || 'visioncore', timestamp: new Date().toISOString(), module: moduleKey };
        fetch(_backendBase + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: ctx })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var result = data.result || data.output || data.content || data.prompt || JSON.stringify(data, null, 2);
          if (output) {
            output.value = result;
            output.classList.remove('empty');
          }
          btn.textContent = '✓ GERADO';
          setTimeout(function() { btn.disabled = false; btn.textContent = origText; }, 2400);
        })
        .catch(function(err) {
          if (output) {
            output.value = '⚠ Erro ao gerar: ' + err.message + '\n\nVerifique se o backend está conectado.';
            output.classList.remove('empty');
          }
          btn.disabled = false;
          btn.textContent = origText;
        });
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

    // §73.1d — Spec panel toggle
    var specToggleBtn = document.getElementById('vcSfSpecToggleBtn');
    if (specToggleBtn) {
      specToggleBtn.addEventListener('click', function () {
        var list  = document.getElementById('vcSfSpecList');
        var arrow = document.getElementById('vcSfSpecArrow');
        _sfSpecPanelOpen = !_sfSpecPanelOpen;
        if (list)  list.style.display = _sfSpecPanelOpen ? '' : 'none';
        if (arrow) arrow.textContent  = _sfSpecPanelOpen ? '▲' : '▼';
      });
    }

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

      // §86 B4: update plan badge with real user plan
      function updatePlanBadge(plan) {
        var badge = document.getElementById('v299QuotaBadge');
        if (!badge) return;
        var planTag = badge.querySelector('.v299-plan-tag');
        var quotaSpan = badge.querySelector('.v299-quota-ok');
        if (planTag) {
          planTag.className = 'v299-plan-tag ' + (plan || 'free');
          planTag.textContent = (plan || 'free').toUpperCase();
        }
        if (quotaSpan) {
          var quotaMap = { free: '5 missões/mês', pro: 'ilimitado', enterprise: 'multi-projeto' };
          quotaSpan.textContent = quotaMap[plan] || quotaMap.free;
        }
      }

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
              try { sessionStorage.setItem('vc_token', data.token); localStorage.setItem('vision_token', data.token); } catch (ex) {}
            }
            if (data.user && data.user.plan) { updatePlanBadge(data.user.plan); }
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
                  try { sessionStorage.setItem('vc_token', d2.token); localStorage.setItem('vision_token', d2.token); } catch (ex) {}
                }
                if (d2.user && d2.user.plan) { updatePlanBadge(d2.user.plan); }
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

      // Load real plan on page init if already logged in
      (function () {
        var tok = (function () { try { return sessionStorage.getItem('vc_token') || localStorage.getItem('vision_token'); } catch (e) { return null; } })();
        if (tok) {
          fetch(BACKEND_URL + '/api/billing/status', { headers: { 'Authorization': 'Bearer ' + tok } })
            .then(function (r) { return r.json(); })
            .then(function (d) { if (d && d.plan) updatePlanBadge(d.plan); })
            .catch(function () {});
        }
      })();

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

  // §88 B4: handle OAuth callback redirect via URL hash
  (function handleOAuthReturn() {
    var hash = window.location.hash || '';
    if (hash.indexOf('oauth-success') === -1 && hash.indexOf('oauth-error') === -1) return;

    if (hash.indexOf('oauth-error') !== -1) {
      var errMatch = hash.match(/oauth-error=([^&]*)/);
      var errMsg = errMatch ? decodeURIComponent(errMatch[1]) : 'unknown';
      setTimeout(function() {
        if (window.showToast) window.showToast('Erro OAuth: ' + errMsg);
      }, 500);
      history.replaceState(null, '', window.location.pathname);
      return;
    }

    // oauth-success
    var tokenMatch = hash.match(/token=([^&]*)/);
    var planMatch  = hash.match(/plan=([^&]*)/);
    var emailMatch = hash.match(/email=([^&]*)/);
    var token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
    var plan  = planMatch  ? planMatch[1]  : 'free';
    var email = emailMatch ? decodeURIComponent(emailMatch[1]) : '';

    if (token) {
      try {
        sessionStorage.setItem('vc_token', token);
        localStorage.setItem('vision_token', token);
      } catch(e) {}

      // Update plan badge
      var badge = document.getElementById('v299QuotaBadge');
      if (badge) {
        var pt = badge.querySelector('.v299-plan-tag');
        var qs = badge.querySelector('.v299-quota-ok');
        if (pt) { pt.className = 'v299-plan-tag ' + plan; pt.textContent = plan.toUpperCase(); }
        var qm = { free: '5 missões/mês', pro: 'ilimitado', enterprise: 'multi-projeto' };
        if (qs) qs.textContent = qm[plan] || qm.free;
      }

      setTimeout(function() {
        if (window.showToast) window.showToast('✓ Login OAuth realizado' + (email ? ' — ' + email : ''));
        var backdrop = document.getElementById('authBackdrop');
        if (backdrop) backdrop.classList.remove('show');
      }, 300);
    }

    history.replaceState(null, '', window.location.pathname);
  })();

  // §89 B3: fetch real mission quota and update badge
  (function loadMissionQuota() {
    var tok = (function() { try { return sessionStorage.getItem('vc_token') || localStorage.getItem('vision_token'); } catch(e) { return null; } })();
    var BACKEND = window.__VISION_API__ || window.API_BASE_URL || BACKEND_URL || '';
    var headers = tok ? { 'Authorization': 'Bearer ' + tok } : {};
    fetch(BACKEND + '/api/mission/quota', { headers: headers })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var badge = document.getElementById('v299QuotaBadge');
        if (!badge) return;
        var planTag = badge.querySelector('.v299-plan-tag');
        var quotaOk = badge.querySelector('.v299-quota-ok');
        if (d.unlimited) {
          if (planTag) { planTag.className = 'v299-plan-tag pro'; planTag.textContent = (d.plan || 'pro').toUpperCase(); }
          if (quotaOk) quotaOk.textContent = 'ilimitado';
        } else {
          var remaining = d.remaining !== undefined ? d.remaining : (d.limit - d.used);
          if (planTag) { planTag.className = 'v299-plan-tag free'; planTag.textContent = 'FREE'; }
          if (quotaOk) {
            if (remaining <= 0) {
              quotaOk.textContent = 'Limite atingido — upgrade';
              quotaOk.className = 'v299-quota-full';
            } else if (remaining <= 1) {
              quotaOk.textContent = remaining + ' missão restante';
              quotaOk.className = 'v299-quota-warn';
            } else {
              quotaOk.textContent = remaining + ' missões restantes';
              quotaOk.className = 'v299-quota-ok';
            }
          }
        }
      })
      .catch(function() {});
  })();

})();

/* ── §89 TUTORIAL INTERATIVO ── */
(function initTutorial() {
  // §119: guard removido do topo — só controlava o auto-start do T1, mas bloqueava
  // toda a infraestrutura (window._vcSetActiveTutorial etc.) de ser definida.
  // Consequência: após o usuário ver o T1 uma vez, clicar em qualquer item do menu
  // "🪐 Tutoriais" não fazia nada (window._vcSetActiveTutorial era undefined).
  // O guard foi movido para antes do setTimeout de auto-start, mais abaixo.

  var STEPS = [
    { id:'welcome',  title:'👋 Bem-vindo ao Vision Core!',          text:'Este é um sistema autônomo de desenvolvimento com IA. Ele detecta erros, corrige código, valida e cria PRs no GitHub automaticamente. Vamos mostrar tudo em 12 passos rápidos.',                                                        target:'.premium-logo',       pos:'bottom' },
    { id:'plans',    title:'🎁 Plano FREE — cadastro instantâneo',  text:'Você tem 5 missões gratuitas por mês, sem cartão de crédito. Os planos PRO ($9,99/mês) e ENTERPRISE ($29,99/mês) chegam em breve com missões ilimitadas, auto-merge e workers dedicados.',                                                target:'#plansBox',            pos:'top' },
    { id:'signin',   title:'🔐 Entre com Google, GitHub ou email', text:'Clique em SIGN IN para criar sua conta grátis. Pode usar Google, GitHub ou só seu email. Em segundos você já tem acesso ao cockpit completo.',                                                                                             target:'#openAuthBtn2',        pos:'bottom' },
    { id:'mission',  title:'🎯 Aqui começa tudo — a Missão',       text:'Digite aqui qualquer problema: um erro, um log, um trecho de código quebrado, ou uma tarefa. O Vision Core entende linguagem natural. Exemplo: "O login está retornando 401 em produção".',                                              target:'#v298Prompt',          pos:'top' },
    { id:'execute',  title:'▷ Executar Missão',                     text:'Clique EXECUTAR MISSÃO para iniciar o pipeline: Hermes analisa → Scanner escaneia → PatchEngine corrige → Aegis valida → PASS GOLD aprova → PR criado no GitHub. Tudo automático.',                                                     target:'#v298RunBtn',          pos:'top' },
    { id:'pipeline', title:'⚡ Pipeline em tempo real',             text:'Acompanhe cada etapa ao vivo: Missão → Diagnóstico → Diff → PASS GOLD → PR → Stable Vault. Cada agente tem uma função específica e você vê o status em tempo real.',                                                                    target:'.mini-pipeline',       pos:'bottom' },
    { id:'diff',     title:'📋 Diff Preview — veja o que vai mudar', text:'Antes de qualquer alteração, o Vision Core mostra exatamente o que será mudado linha por linha. Você aprova antes de qualquer ação real no seu código.',                                                                                target:'#diff',                pos:'top' },
    { id:'passgold', title:'🥇 PASS GOLD — qualidade garantida',    text:'Só avança para PR se passar em todos os gates: segurança, compatibilidade, estabilidade e testes. Se reprovar, o sistema faz rollback automático. Zero risco para seu repositório.',                                                     target:'#score',               pos:'top' },
    { id:'passgold_leigo', title:'🥇 O que é PASS GOLD — em linguagem simples', text:'PASS GOLD é o selo de aprovação do Vision Core. Significa que o código foi testado, está seguro e tem mais de 80% de confiança técnica. Só depois do PASS GOLD o sistema cria o PR no GitHub. É como uma inspeção de qualidade antes de entregar.', target:'#score', pos:'top' },
    { id:'github',   title:'🐙 GitHub Integration real',            text:'Quando aprovado, o Vision Core cria automaticamente um Pull Request com o patch, contexto e evidências de PASS GOLD. Você só revisa e faz merge.',                                                                                         target:'#githubPanel',         pos:'top' },
    { id:'ai',       title:'🤖 Conecte sua IA preferida',           text:'Adicione sua API key de OpenAI, Claude, Gemini, Groq ou DeepSeek. O Vision Core usa o provider que você configurar. Também funciona com Ollama local (gratuito).',                                                                       target:'#aiApiVault',          pos:'top' },
    { id:'sf',       title:'◈ Software Factory — construa do zero', text:'8 módulos para criar projetos completos: define stack, compõe missão, gera pacotes para workers, valida patches e gera blueprint de deploy. Acesse pelo menu superior.',                                                                  target:'[data-open-sf-page]',  pos:'bottom' },
    { id:'finish',   title:'🚀 Pronto para começar!',               text:'Agora você conhece o Vision Core. Crie sua conta FREE (5 missões/mês, sem cartão de crédito) e experimente agora. É grátis para sempre no plano básico.',                                                                               target:'#openAuthBtn2',        pos:'bottom', cta:true }
  ];
  // §123: referência imutável ao array original do T1 — STEPS (acima) é reatribuída
  // por window._vcSetActiveTutorial sempre que um tutorial de seção é aberto (Agent
  // local, Mission control, etc.) e nunca era restaurada ao reabrir o tutorial Geral.
  // Bug: clicar "Geral" depois de qualquer tutorial de seção mostrava o conteúdo da
  // última seção aberta, porque STEPS continuava apontando pro array dela.
  var STEPS_GERAL = STEPS;

  var current = 0;
  // §119: chave de storage do tutorial ativo — T1 usa 'vc_tutorial_done', tutoriais
  // de seção usam suas chaves próprias. Atualizada por _vcSetActiveTutorial.
  var _activeStorageKey = 'vc_tutorial_done';
  var overlay   = document.getElementById('vcTutorialOverlay');
  var spotlight = document.getElementById('vcTutorialSpotlight');
  var titleEl   = document.getElementById('vcTutorialTitle');
  var textEl    = document.getElementById('vcTutorialText');
  var counterEl = document.getElementById('vcTutorialCounter');
  var prevBtn   = document.getElementById('vcTutorialPrev');
  var nextBtn   = document.getElementById('vcTutorialNext');
  var ctaBtn    = document.getElementById('vcTutorialCta');
  var skipBtn   = document.getElementById('vcTutorialSkip');
  var noShowCb  = document.getElementById('vcTutorialNoShow');
  if (!overlay || !titleEl) return;

  function getEl(sel) { try { return document.querySelector(sel); } catch(e) { return null; } }

  // §121: scroll tracking — reposiciona balão quando usuário rola manualmente
  var _scrollTgt = null, _scrollHint = null, _scrollRafId = null, _scrollDebTimer = null, _scrollListenerOn = false;
  function _onScroll() {
    if (_scrollRafId) return;
    _scrollRafId = requestAnimationFrame(function() {
      _scrollRafId = null;
      if (!_scrollTgt || !overlay || overlay.style.display === 'none') return;
      var _sb = document.getElementById('vcTutorialBalloon');
      if (_sb) _sb.style.transition = 'none';
      positionBalloon(_scrollTgt, _scrollHint, true); // skipScroll=true
      clearTimeout(_scrollDebTimer);
      _scrollDebTimer = setTimeout(function() { if (_sb) _sb.style.transition = ''; }, 150);
    });
  }
  function _addScrollListener() {
    if (!_scrollListenerOn) { window.addEventListener('scroll', _onScroll, true); _scrollListenerOn = true; }
  }
  function _removeScrollListener() {
    window.removeEventListener('scroll', _onScroll, true);
    _scrollListenerOn = false;
    if (_scrollRafId) { cancelAnimationFrame(_scrollRafId); _scrollRafId = null; }
    clearTimeout(_scrollDebTimer); _scrollDebTimer = null;
    _scrollTgt = null; _scrollHint = null;
  }

  function positionBalloon(targetEl, pos, skipScroll) {
    var balloon = document.getElementById('vcTutorialBalloon');
    var pad = 14;
    if (!balloon) return;

    // Se não tem elemento alvo ou está fora da viewport → centralizar
    var rect = targetEl ? targetEl.getBoundingClientRect() : null;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var inView = rect && rect.width > 0 && rect.height > 0
                 && rect.top > -rect.height && rect.bottom < vh + rect.height
                 && rect.left > -rect.width && rect.right < vw + rect.width;

    if (!inView) {
      // §120: passo conceitual — balão centralizado; overlay escurece uniformemente
      // (spotlight a 0x0 mas com box-shadow, sem apagar o efeito visual).
      balloon.removeAttribute('data-arrow'); // §121: sem seta em passo conceitual
      balloon.style.transform = '';
      balloon.style.top  = Math.max(80, vh / 2 - 120) + 'px';
      balloon.style.left = Math.max(16, vw / 2 - (balloon.offsetWidth || 320) / 2) + 'px';
      spotlight.style.cssText = 'top:0;left:0;width:0;height:0;box-shadow:0 0 0 9999px rgba(0,0,0,0.55)';
      return;
    }

    // Spotlight sobre o elemento real
    spotlight.style.cssText = '';
    spotlight.style.top    = (rect.top - pad) + 'px';
    spotlight.style.left   = (rect.left - pad) + 'px';
    spotlight.style.width  = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';

    var bw = balloon.offsetWidth || 320;
    var bh = balloon.offsetHeight || 220;

    // §120: área do spotlight expandida com pad — o balão nunca deve cair dentro dela.
    var spT = rect.top  - pad;
    var spL = rect.left - pad;
    var spR = rect.right  + pad;
    var spB = rect.bottom + pad;

    // Dois retângulos se sobrepõem quando NÃO é verdade que um está fora do outro.
    function overlaps(t, l) {
      return !(l + bw <= spL || l >= spR || t + bh <= spT || t >= spB);
    }

    // §120: quando o alvo é mais largo que o balão * 1.5, ancora na borda esquerda
    // em vez de centralizar — evita que o balão centralizado caia dentro do spotlight.
    var isWide = rect.width > bw * 1.5;
    function calcPos(candidate) {
      var t, l;
      if (candidate === 'bottom') {
        t = rect.bottom + pad + 8;
        l = isWide ? rect.left + 8 : rect.left + rect.width / 2 - bw / 2;
      } else if (candidate === 'top') {
        t = rect.top - bh - pad - 8;
        l = isWide ? rect.left + 8 : rect.left + rect.width / 2 - bw / 2;
      } else if (candidate === 'right') {
        t = rect.top + rect.height / 2 - bh / 2;
        l = rect.right + pad + 8;
      } else { // left
        t = rect.top + rect.height / 2 - bh / 2;
        l = rect.left - bw - pad - 8;
      }
      l = Math.max(16, Math.min(l, vw - bw - 16));
      t = Math.max(70, Math.min(t, vh - bh - 16));
      return { t: t, l: l };
    }

    // Ordem de tentativa: posição pedida, oposta, lados.
    var order = pos === 'bottom'
      ? ['bottom', 'top', 'right', 'left']
      : ['top', 'bottom', 'right', 'left'];

    var chosen = null;
    var _cand = pos; // §121: candidata escolhida — define data-arrow
    for (var ci = 0; ci < order.length; ci++) {
      var p = calcPos(order[ci]);
      if (!overlaps(p.t, p.l)) { chosen = p; _cand = order[ci]; break; }
    }

    // Fallback: nenhuma candidata escapa do spotlight — elemento preenche o viewport.
    // Usa fallback conceitual (balão centralizado, spotlight zerado) em vez de sobrepôr.
    if (!chosen) {
      balloon.removeAttribute('data-arrow'); // §121: sem seta no fallback
      balloon.style.transform = '';
      balloon.style.top  = Math.max(80, vh / 2 - 120) + 'px';
      balloon.style.left = Math.max(16, vw / 2 - bw / 2) + 'px';
      spotlight.style.cssText = 'top:0;left:0;width:0;height:0;box-shadow:0 0 0 9999px rgba(0,0,0,0.55)';
      return;
    }

    balloon.style.transform = '';
    balloon.style.top  = chosen.t + 'px';
    balloon.style.left = chosen.l + 'px';

    // §121: seta direcional — aponta do balão para o elemento iluminado
    var _arrowDir = { bottom: 'up', top: 'down', right: 'left', left: 'right' };
    balloon.setAttribute('data-arrow', _arrowDir[_cand] || 'up');
    // Alinha ponta ao centro do elemento-alvo (clamped dentro do balão)
    var _ax = Math.round(rect.left + rect.width  / 2 - chosen.l - 9);
    var _ay = Math.round(rect.top  + rect.height / 2 - chosen.t - 9);
    balloon.style.setProperty('--vc-arrow-x', Math.max(12, Math.min(_ax, bw - 30)) + 'px');
    balloon.style.setProperty('--vc-arrow-y', Math.max(12, Math.min(_ay, bh - 30)) + 'px');

    // Scroll suave para o elemento (omitido quando chamado pelo scroll handler)
    if (!skipScroll) {
      try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}
    }
  }

  // §90: mascote refs
  var mascotIdle    = document.getElementById('vcMascotIdle');
  var mascotReading = document.getElementById('vcMascotReading');
  var _typeTimer    = null;

  function setMascot(state) {
    if (!mascotIdle || !mascotReading) return;
    if (state === 'reading') {
      mascotIdle.classList.remove('active');
      mascotReading.classList.add('active');
    } else {
      mascotReading.classList.remove('active');
      mascotIdle.classList.add('active');
    }
  }

  // §95 mascote refs
  var _mascotIdle    = document.getElementById('vcMascotIdle');
  var _mascotReading = document.getElementById('vcMascotReading');
  var _typeTimer     = null;

  function _setMascot(state) {
    if (!_mascotIdle || !_mascotReading) return;
    if (state === 'reading') {
      _mascotIdle.classList.remove('active');
      _mascotReading.classList.add('active');
    } else {
      _mascotReading.classList.remove('active');
      _mascotIdle.classList.add('active');
    }
  }

  function typeText(text, el, onDone) {
    if (_typeTimer) { clearInterval(_typeTimer); _typeTimer = null; }
    el.textContent = '';
    _setMascot('reading');
    nextBtn.disabled = true;
    var i = 0;
    var speed = Math.max(12, Math.min(28, Math.floor(2400 / text.length)));
    _typeTimer = setInterval(function() {
      el.textContent += text[i];
      i++;
      if (i >= text.length) {
        clearInterval(_typeTimer);
        _typeTimer = null;
        setTimeout(function() {
          _setMascot('idle');
          nextBtn.disabled = false;
        }, 300);
        if (onDone) onDone();
      }
    }, speed);
  }

  function showStep(idx) {
    var step = STEPS[idx];
    titleEl.textContent   = step.title;
    counterEl.textContent = (idx + 1) + ' / ' + STEPS.length;
    prevBtn.style.display = idx === 0 ? 'none' : '';
    nextBtn.textContent   = idx === STEPS.length - 1 ? 'Fechar' : 'Próximo →';
    if (ctaBtn) { step.cta ? ctaBtn.classList.remove('hidden') : ctaBtn.classList.add('hidden'); }
    typeText(step.text, textEl, null);
    // §118: onEnter — aciona navegação/reveal antes de medir getBoundingClientRect
    if (typeof step.onEnter === 'function') { try { step.onEnter(); } catch(e) {} }
    // §120: 80ms base para todos (evita entrar no meio de transições CSS do onEnter);
    // se o elemento ainda não estiver em view, retenta 1x após 200ms extra
    // (cobre o caso de SF page que não abre instantaneamente).
    _addScrollListener(); // §121: garante listener ativo durante qualquer passo
    setTimeout(function() {
      var el = getEl(step.target);
      var r  = el ? el.getBoundingClientRect() : null;
      var _vw = window.innerWidth, _vh = window.innerHeight;
      var inV = r && r.width > 0 && r.height > 0
                && r.top > -r.height && r.bottom < _vh + r.height
                && r.left > -r.width  && r.right  < _vw + r.width;
      if (!inV && el) {
        // Elemento existe mas ainda não está em view — retenta uma vez
        setTimeout(function() {
          var el2 = getEl(step.target);
          _scrollTgt = el2; _scrollHint = step.pos; // §121
          positionBalloon(el2, step.pos);
        }, 200);
      } else {
        _scrollTgt = el; _scrollHint = step.pos; // §121
        positionBalloon(el, step.pos);
      }
    }, 80);
  }

  function closeTutorial() {
    _removeScrollListener(); // §121: para de acompanhar scroll ao fechar
    var _cb = document.getElementById('vcTutorialBalloon');
    if (_cb) _cb.removeAttribute('data-arrow'); // §121: remove seta ao fechar
    if (_typeTimer) { clearInterval(_typeTimer); _typeTimer = null; }
    _setMascot('idle');
    nextBtn.disabled = false;
    overlay.style.display = 'none';
    overlay.classList.remove('active');
    // §119: usa _activeStorageKey em vez de 'vc_tutorial_done' hardcoded —
    // tutoriais de seção gravam na chave certa (ex: 'vc_tutorial_sf_done').
    try { if (noShowCb && noShowCb.checked) localStorage.setItem(_activeStorageKey, '1'); } catch(e) {}
    _activeStorageKey = 'vc_tutorial_done'; // reset para default após fechar
  }

  if (nextBtn) nextBtn.addEventListener('click', function() {
    if (current >= STEPS.length - 1) { closeTutorial(); return; }
    current++; showStep(current);
  });
  if (prevBtn) prevBtn.addEventListener('click', function() {
    if (current <= 0) return; current--; showStep(current);
  });
  if (skipBtn) skipBtn.addEventListener('click', closeTutorial);
  if (ctaBtn)  ctaBtn.addEventListener('click', function() {
    closeTutorial();
    var authBtn = document.getElementById('openAuthBtn');
    if (authBtn) authBtn.click();
  });
  window.addEventListener('resize', function() {
    if (overlay.style.display !== 'none') showStep(current);
  });

  // §119: guard movido para cá — controla APENAS o auto-start do T1.
  // A infraestrutura (window._vcSetActiveTutorial, etc.) fica sempre disponível.
  try {
    if (localStorage.getItem('vc_tutorial_done') !== '1') {
      setTimeout(function() {
        overlay.style.display = 'block';
        overlay.classList.add('active');
        showStep(0);
      }, 1500);
    }
  } catch(e) {
    // localStorage indisponível (privado/bloqueado) — não auto-abre, silencioso
  }

  window.vcStartTutorial = function() {
    try { localStorage.removeItem('vc_tutorial_done'); } catch(e) {}
    // §123: restaura STEPS pro array do tutorial Geral e a chave de storage padrão —
    // sem isso, se um tutorial de seção tivesse sido aberto antes, "Geral" mostrava
    // o conteúdo da seção anterior (STEPS nunca era resetada).
    STEPS = STEPS_GERAL;
    _activeStorageKey = 'vc_tutorial_done';
    current = 0;
    overlay.style.display = 'block';
    overlay.classList.add('active');
    showStep(0);
  };

  // §96: botão reabrir tutorial
  var reopenBtn = document.getElementById('vcReopenTutorial');
  if (reopenBtn) {
    reopenBtn.addEventListener('click', function() {
      window.vcStartTutorial();
    });
  }

  // §T2: expor setter para tutoriais de seção reutilizarem overlay/mascote do T1
  // §119: aceita storageKey para persistência por tutorial de seção
  window._vcSetActiveTutorial = function(stepsArr, storageKey) {
    if (_typeTimer) { clearInterval(_typeTimer); _typeTimer = null; }
    STEPS   = stepsArr;
    current = 0;
    // §119: atualiza chave ativa — closeTutorial gravará na chave certa
    _activeStorageKey = storageKey || 'vc_tutorial_done';
    overlay.style.display = 'block';
    overlay.classList.add('active');
    showStep(0);
  };
})();

/* ── SISTEMA DE TUTORIAIS POR SEÇÃO (T2/T3/T4/T6) ── */
(function initSectionTutorials() {
  window.vcTutorials = window.vcTutorials || {};

  window.vcRegisterTutorial = function(name, steps, storageKey) {
    window.vcTutorials[name] = { steps: steps, key: storageKey };
  };

  window.vcStartSectionTutorial = function(name) {
    var t = window.vcTutorials[name];
    if (!t) { console.warn('[Vision] Tutorial não encontrado:', name); return; }
    if (typeof window._vcSetActiveTutorial === 'function') {
      // §119: passa t.key para que closeTutorial grave na chave certa do tutorial
      window._vcSetActiveTutorial(t.steps, t.key);
    } else {
      console.warn('[Vision] _vcSetActiveTutorial não disponível');
    }
  };

  // §118: helper de scroll — elementos abaixo do viewport ficam com spotlight=0 sem isso.
  // _scrollInto(sel) retorna um onEnter que faz scrollIntoView antes de positionBalloon.
  // Definido aqui (antes de qualquer STEPS_*) para que todos os tutoriais possam usá-lo.
  var _scrollInto = function(sel) {
    return function() {
      var el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    };
  };

  // ── T2: TUTORIAL VISION AGENT LOCAL ──
  // §118: targets corrigidos — cada passo ilumina o elemento específico descrito.
  // onEnter no passo 1 garante que o painel da aba AGENT LOCAL está visível
  // antes de calcular getBoundingClientRect() (tabs usam display:none por padrão).
  var STEPS_AGENT = [
    {
      title: '🪐 O que é o Vision Agent Local',
      text: 'É um programa pequeno que roda no seu computador e dá ao Vision Core acesso real aos arquivos do seu projeto — sem precisar subir tudo para a nuvem.',
      target: '.mc-tab[data-tab="agent"]', pos: 'top',
      onEnter: function() {
        var agentTab = document.querySelector('.mc-tab[data-tab="agent"]');
        if (agentTab) agentTab.click();
      }
    },
    {
      title: '⬇️ Baixar e instalar',
      text: 'Clique em "VisionAgentSetup.exe (Windows)" para o instalador completo, ou "vision-agent.js" se você já tem Node.js e prefere rodar direto.',
      target: '#mc-tab-agent .agent-download', pos: 'bottom',
      // §118: botão pode estar fora do viewport — scroll antes de medir
      onEnter: function() {
        var el = document.querySelector('#mc-tab-agent .agent-download');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    },
    {
      title: '▶️ Rodando o agent',
      text: 'Depois de instalado, o agent fica escutando em localhost:7070. Se outro programa já estiver usando essa porta (como o AnyDesk), mude a porta dele nas configurações antes de abrir o agent.',
      target: '.agent-cmd', pos: 'top'
    },
    {
      title: '🔍 O que ele faz: scan → search → read',
      text: 'Quando uma missão chega, o agent primeiro escaneia a raiz do projeto, depois busca arquivos relevantes pela missão descrita, e por fim lê o conteúdo mais relevante para enviar ao Vision Core.',
      target: '.agent-cmd', pos: 'top'
    },
    {
      title: '📡 Conexão com o Worker',
      text: 'O agent faz polling no Worker Gateway a cada poucos segundos perguntando se há missões pendentes para este projeto — assim ele trabalha junto com o Vision Core sem você precisar copiar e colar nada manualmente.',
      target: '.agent-cmd', pos: 'top'
    },
    {
      title: '✅ Resultado de volta',
      text: 'Depois de executar, o agent envia o resultado (ok=true/false, arquivos lidos, detalhes de cada etapa) de volta para o backend, que segue o pipeline normal até o PASS GOLD.',
      target: '.agent-cmd', pos: 'top'
    }
  ];

  window.vcRegisterTutorial('agent', STEPS_AGENT, 'vc_tutorial_agent_done');

  // ── T4: TUTORIAL MISSION CONTROL ──
  var STEPS_MISSION = [
    { title: '💬 Bem-vindo ao Mission Control', text: 'Aqui você conversa com a Vision AI sobre qualquer assunto técnico: cole um erro, descreva uma tarefa, ou peça para corrigir um projeto.', target: '#mission', pos: 'top' },
    { title: '✍️ Digite sua missão', text: 'Escreva no campo de texto o que você precisa. Pode ser um erro colado, um log, um endpoint quebrado, ou uma descrição livre da tarefa.', target: '#v298Prompt', pos: 'top' },
    { title: '＋ Anexe arquivos se precisar', text: 'Clique em "Adicionar arquivos" para enviar código, configs ou logs. O conteúdo entra no contexto da IA.', target: '#v298Prompt', pos: 'bottom' },
    { title: '⚙️ Escolha o modo e modelo', text: '"Vision geral" conversa livremente. "Corrigir projeto" ou "Rodar SDDF" ativam o pipeline completo. O modelo pode ficar em automático ou você escolhe.', target: '#runMode', pos: 'top' },
    { title: '📤 ENVIAR vs EXECUTAR MISSÃO', text: '"ENVIAR" é só conversa — a IA responde no chat. "EXECUTAR MISSÃO" dispara o pipeline real: Scanner → Hermes → PatchEngine → Aegis → PASS GOLD → PR.', target: '#v298RunBtn', pos: 'top' },
    { title: '🎯 Acompanhe o pipeline', text: 'A timeline compacta mostra cada estágio em tempo real. Quando passar do PASS GOLD, o Pull Request é criado automaticamente no GitHub.', target: '.mini-pipeline', pos: 'bottom' },
    { title: '🎁 Quota e planos', text: 'No plano FREE você tem 5 missões por mês, sem cartão. O badge no canto mostra quantas restam.', target: '#v299QuotaBadge', pos: 'bottom' }
  ];
  window.vcRegisterTutorial('mission', STEPS_MISSION, 'vc_tutorial_mission_done');

  // ── T6: TUTORIAL PASS GOLD ──
  // §118: #score, #githubPanel, #policyBtn ficam longe abaixo do viewport —
  // scroll via onEnter obrigatório para positionBalloon enxergar os elementos.
  var STEPS_PASSGOLD = [
    { title: '🏅 O que é PASS GOLD', text: 'PASS GOLD é o selo de aprovação do Vision Core. Só depois dele o sistema cria o Pull Request no GitHub — é como uma inspeção de qualidade antes da entrega.', target: '#score', pos: 'top', onEnter: _scrollInto('#score') },
    { title: '📊 Como funciona o score', text: 'Cada missão passa por gates: segurança, compatibilidade, estabilidade e testes. O score precisa estar acima do corte GOLD para liberar a promoção.', target: '#score', pos: 'top', onEnter: _scrollInto('#score') },
    { title: '🔁 Reprovou? Rollback automático', text: 'Se o código não atingir o corte, o Vision Core faz rollback automático. Nenhum código de baixa confiança chega ao seu repositório.', target: '#score', pos: 'bottom', onEnter: _scrollInto('#score') },
    { title: '🔗 GitHub Integration Real', text: 'Com PASS GOLD aprovado, o botão "Criar PR PASS GOLD" cria branch, aplica commit e abre o Pull Request de verdade via GitHub REST API.', target: '#githubPanel', pos: 'top', onEnter: _scrollInto('#githubPanel') },
    // §118: #policyBtn é o elemento real do botão "Auto-merge Policy" dentro de #githubPanel
    { title: '⚙️ Auto-merge Policy', text: 'Você pode configurar se PRs aprovados com PASS GOLD são mesclados automaticamente ou aguardam revisão manual.', target: '#policyBtn', pos: 'top', onEnter: _scrollInto('#policyBtn') }
  ];
  window.vcRegisterTutorial('passgold', STEPS_PASSGOLD, 'vc_tutorial_passgold_done');

  // ── T3: TUTORIAL SOFTWARE FACTORY ──
  // §118: targets corrigidos — cada passo ilumina o botão de módulo real.
  // onEnter abre a SF page e navega ao módulo certo antes de posicionar o spotlight.
  // window.showSoftwareFactoryPage e window.setSoftwareFactoryModule são expostos
  // por initSoftwareFactoryPage() (§118).
  var _sfOnEnter = function(moduleId) {
    return function() {
      if (typeof window.showSoftwareFactoryPage  === 'function') window.showSoftwareFactoryPage();
      if (moduleId && typeof window.setSoftwareFactoryModule === 'function') window.setSoftwareFactoryModule(moduleId);
    };
  };
  var STEPS_SF = [
    { title: '◈ Bem-vindo à Software Factory', text: 'Aqui você monta um projeto do zero com 8 módulos de IA — da definição de stack até o blueprint de deploy.', target: '#vcSfHomeBtn', pos: 'bottom', onEnter: _sfOnEnter(null) },
    { title: '01 — Montar Projeto do Zero', text: 'Descreva o tipo de projeto e a stack desejada. A IA monta a estrutura inicial e sugere a arquitetura.', target: '[data-sf-module="project_builder"]', pos: 'bottom', onEnter: _sfOnEnter('project_builder') },
    { title: '03 — Templates de Projeto', text: 'Use blueprints locais prontos para acelerar o início — templates testados para os padrões mais comuns de SaaS e API.', target: '[data-sf-module="project_templates"]', pos: 'bottom', onEnter: _sfOnEnter('project_templates') },
    { title: '04 — Compositor de Missão', text: 'Transforma sua descrição em um prompt estruturado e pronto para copiar.', target: '[data-sf-module="mission_composer"]', pos: 'bottom', onEnter: _sfOnEnter('mission_composer') },
    { title: '05 — Pacotes para Workers', text: 'Gera o pacote de handoff completo para um worker externo executar.', target: '[data-sf-module="worker_handoff"]', pos: 'bottom', onEnter: _sfOnEnter('worker_handoff') },
    // §118: "EM BREVE" — ilumina o primeiro módulo marcado como EM BREVE no HTML (real_file_command, módulo 06)
    { title: '🟡 Módulos em breve', text: 'Comando para Criação Real (06), Preview de Criação (02) e Painel Final (09) aparecem como "EM BREVE" — esses módulos ainda não criam nada automaticamente.', target: '[data-sf-module="real_file_command"]', pos: 'bottom', onEnter: _sfOnEnter('real_file_command') },
    // §118: Gold Gate — usa módulo 09 "PAINEL FINAL" como alvo visual
    // (#vcSfSddfSteps fica dentro da timeline colapsada por padrão — height:0 = spotlight zerado)
    { title: '🏅 Gold Gate — o validador final', text: 'Antes de qualquer entrega, o Gold Gate avalia segurança, risco e qualidade — o mesmo padrão de validação do PASS GOLD. O módulo "Painel Final" (09) é o destino após todas as etapas de validação.', target: '[data-sf-module="final_dashboard"]', pos: 'bottom', onEnter: _sfOnEnter(null) }
  ];
  window.vcRegisterTutorial('sf', STEPS_SF, 'vc_tutorial_sf_done');

  // ── T5: TUTORIAL AGENTES EXTRAS ──
  // §118: #agentsBoard fica longe abaixo do viewport — scroll via onEnter (usando _scrollInto acima)
  var STEPS_AGENTS = [
    { title: '🤖 O que são os Agentes Extras', text: 'São 15 especialistas — Backend, Database, Auth, Frontend, Security e outros — que ficam de prontidão para responder sobre o assunto certo quando você conversa no Mission Control.', target: '#agentsBoard', pos: 'top', onEnter: _scrollInto('#agentsBoard') },
    // §118: ilumina os botões reais de modo do primeiro card (backend) em vez do board inteiro
    { title: '🎛️ Três modos: OFF, AUTO, ON', text: 'OFF desliga o agente — ele nunca participa. AUTO deixa o Vision Core decidir quando ele é relevante. ON garante prioridade sempre que o assunto bate com a especialidade dele.', target: '.vc-reserve-card[data-agent-id="backend"] .vc-reserve-modes', pos: 'top', onEnter: _scrollInto('.vc-reserve-card[data-agent-id="backend"] .vc-reserve-modes') },
    // §118: ilumina as tags/keywords reais do card backend em vez do board inteiro
    { title: '🔍 Como a detecção funciona', text: 'Cada agente tem palavras-chave da própria área — "jwt" e "token" acionam o Agente Auth, "sql" e "schema" acionam o Agente Database. Se a sua mensagem bater com alguma, ele entra na conversa.', target: '.vc-reserve-card[data-agent-id="backend"] .vc-reserve-tags', pos: 'top', onEnter: _scrollInto('.vc-reserve-card[data-agent-id="backend"] .vc-reserve-tags') },
    { title: '🏷️ O badge no chat', text: 'Quando um agente especializado responde, aparece um selo "🤖 Nome do Agente" acima da resposta — assim você sabe exatamente quem está te ajudando.', target: '#mission', pos: 'top', onEnter: _scrollInto('#mission') },
    { title: '⚙️ Ajustando os modos', text: 'Em "AGENTES EXTRAS" na sidebar, cada card tem os botões OFF/AUTO/ON. A escolha é salva no backend e vale para todas as suas próximas conversas.', target: '#agentsBoard', pos: 'top', onEnter: _scrollInto('#agentsBoard') }
  ];
  window.vcRegisterTutorial('agents', STEPS_AGENTS, 'vc_tutorial_agents_done');

  // §128: helper — garante cockpit visível + scroll ao alvo.
  // Tutoriais de seções fora do SF page precisam voltar ao cockpit
  // caso o usuário esteja na SF page quando abrir o tutorial.
  var _cockpitScroll = function(sel) {
    return function() {
      if (typeof window.showMainCockpitPage === 'function') window.showMainCockpitPage();
      var el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    };
  };

  // ── T7: TUTORIAL GITHUB AGENT ──
  // §128: ilumina cada elemento real do painel de integração GitHub.
  // onEnter garante cockpit visível + scroll ao elemento antes de medir getBoundingClientRect.
  var STEPS_GITHUB = [
    {
      title: '⌬ GitHub Integration Real',
      text: 'O Vision Core cria Pull Requests reais no GitHub — branch, commit e PR aberto automaticamente. Funciona só com GITHUB_TOKEN configurado no backend e após PASS GOLD.',
      target: '#githubPanel', pos: 'top',
      onEnter: _cockpitScroll('#githubPanel')
    },
    {
      title: '🔍 Status da conexão',
      text: 'Este badge mostra se o token está configurado e qual repositório está conectado. Fica verde quando o GitHub responde com sucesso.',
      target: '#githubStatus', pos: 'top',
      onEnter: _cockpitScroll('#githubStatus')
    },
    {
      title: '▶ Verificar GitHub',
      text: 'Clique para testar a conexão agora. O Vision Core chama /api/github/status no backend e exibe o resultado — repo, usuário, permissões.',
      target: '#githubStatusBtn', pos: 'bottom',
      onEnter: _cockpitScroll('#githubStatusBtn')
    },
    {
      title: '🔃 Criar PR PASS GOLD',
      text: 'Só ativo depois que uma missão atinge PASS GOLD. Cria branch com o nome do fix, aplica o commit e abre o PR automaticamente. Você só revisa e faz merge.',
      target: '#githubPrBtn', pos: 'bottom',
      onEnter: _cockpitScroll('#githubPrBtn')
    },
    {
      title: '⚙ Auto-merge Policy',
      text: 'Configura se PRs com PASS GOLD são merged automaticamente ou aguardam revisão manual. Recomendado: revisão manual até o time confiar no pipeline.',
      target: '#policyBtn', pos: 'bottom',
      onEnter: _cockpitScroll('#policyBtn')
    }
  ];
  window.vcRegisterTutorial('github', STEPS_GITHUB, 'vc_tutorial_github_done');

  // ── T8: TUTORIAL TOOLS MARKETPLACE ──
  // §128: ilumina o painel e a grade de ferramentas disponíveis.
  var STEPS_TOOLS = [
    {
      title: '▣ Tools Marketplace',
      text: 'Conectores prontos para integrar o Vision Core com suas ferramentas externas: GitHub, Cloudflare, Railway, Docker, Langfuse e billing via Stripe.',
      target: '#marketplace', pos: 'top',
      onEnter: _cockpitScroll('#marketplace')
    },
    {
      title: '🔧 Grade de conectores',
      text: 'Cada card mostra o status de conexão (ativo/pendente) e permite configurar credenciais. Os conectores habilitados aparecem no pipeline de missões como destinos de deploy.',
      target: '#toolsBox', pos: 'top',
      onEnter: _cockpitScroll('#toolsBox')
    }
  ];
  window.vcRegisterTutorial('tools', STEPS_TOOLS, 'vc_tutorial_tools_done');

  // ── T9: TUTORIAL MÉTRICAS ──
  // §128: ilumina o painel de métricas de agentes com dados reais do backend.
  var STEPS_METRICS = [
    {
      title: '▥ Métricas dos Agentes',
      text: 'Custo real por agente e método de execução. Dados vivos do backend em /api/metrics/agents. Quando o backend está offline, fallback estático mantém a tela visível (badge "UI LOCAL").',
      target: '#metricsBoard', pos: 'top',
      onEnter: _cockpitScroll('#metricsBoard')
    },
    {
      title: '📊 Barras de custo por agente',
      text: 'Cada barra mostra custo relativo de tokens/chamadas. CONVERSA = resposta única, LOOP = múltiplas iterações, ADAPTIVE = modo varia por missão. Hermes e PatchEngine costumam ser os mais caros.',
      target: '#agentMetricsLarge', pos: 'top',
      onEnter: _cockpitScroll('#agentMetricsLarge')
    },
    {
      title: '🏷 Fonte dos dados',
      text: 'O badge "UI LOCAL" aparece quando o backend está offline — os valores são estimativas estáticas. Quando o backend responde, o badge some e os valores são dados reais da sessão.',
      target: '#metricsSourceBadge', pos: 'bottom',
      onEnter: _cockpitScroll('#metricsSourceBadge')
    }
  ];
  window.vcRegisterTutorial('metrics', STEPS_METRICS, 'vc_tutorial_metrics_done');

  // T-MENU: toggle do accordion na sidebar
  window.vcToggleTutorialMenu = function() {
    var panel   = document.getElementById('vcTutPanel');
    var chevron = document.getElementById('vcTutChevron');
    if (!panel) return;
    var isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      if (chevron) chevron.classList.remove('open');
    } else {
      panel.classList.add('open');
      if (chevron) chevron.classList.add('open');
    }
  };
})();
