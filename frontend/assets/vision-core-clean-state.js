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
