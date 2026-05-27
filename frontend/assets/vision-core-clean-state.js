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
  ])
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
