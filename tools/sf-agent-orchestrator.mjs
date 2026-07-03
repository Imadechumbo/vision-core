#!/usr/bin/env node
/**
 * sf-agent-orchestrator.mjs
 *
 * Orquestra o pipeline de "montar projeto do zero" do Vision Core Software
 * Factory (SF) usando o Claude Agent SDK. Um agente "Hermes" no topo
 * planeja e delega — NÃO escreve código diretamente (sem Write/Edit/Bash
 * no allowedTools) — e invoca subagents especializados (Backend Agent,
 * Frontend Agent) para executar cada módulo do CLAUDE_CODE_BRIEF.
 *
 * Toda escrita de arquivo e execução de comando passa por hooks
 * (PreToolUse / SubagentStop) que reaproveitam a governança já construída
 * em tools/hermes/mission-supervisor.mjs do próprio repo vision-core.
 *
 * EVIDÊNCIA VIVA — RESOLVIDA PARCIALMENTE: `missionEvidence` (opts.
 * missionEvidence) continua existindo como piso ESTÁTICO, mas agora é só
 * uma das duas fontes. Um segundo objeto, `moduleEvidence` — novo por
 * módulo, nunca compartilhado entre módulos concorrentes — é alimentado
 * DURANTE a execução por dois sinais reais, amarrados a comandos
 * reconhecidos (não qualquer coisa que rode):
 *   - exit_code: hook PostToolUse captura o exit code real de uma chamada
 *     Bash, SE E SOMENTE SE o comando bater em TEST_COMMAND_PATTERN (npm/
 *     yarn/pnpm test, pytest, jest, mocha, vitest, go test). Comando fora
 *     dessa lista nunca vira evidência de teste, mesmo com exit 0.
 *   - git_diff: hook SubagentStop compara `git status --porcelain` de
 *     antes/depois do módulo — mudança real de arquivo, fato observado por
 *     fora, não claim do agente.
 * mergeEvidence() combina os dois: estático explícito do caller sempre
 * vence campo a campo; capturado de verdade só preenche o que o caller não
 * informou. AINDA FORA DE ESCOPO (deliberado, não esquecido): log,
 * github_api_evidence, health_probe, evidence_receipt.source, gates_pass,
 * failed_gates — só exit_code/test e git_diff foram resolvidos.
 *
 * Requer: npm install @anthropic-ai/claude-agent-sdk
 */

import { spawnSync } from 'child_process';
import { validateAgentOutput } from './hermes/mission-supervisor.mjs';

// `query` do @anthropic-ai/claude-agent-sdk é importado dinamicamente (não no
// topo do arquivo) por dois motivos: (1) o pacote pode não estar instalado
// ainda — um import estático quebraria a resolução de módulo pra qualquer
// coisa que importe este arquivo, inclusive testes; (2) permite injetar um
// mock via opts.queryFn em teste, sem precisar do pacote real instalado nem
// gastar tokens de verdade.
// Precisa ser um GERADOR async (function*), não uma função async comum.
// Uma função async comum retorna uma Promise ao ser chamada — `for await`
// em runModule espera que `queryFn(...)` seja diretamente async-iterável,
// não uma Promise que resolve pra um iterável. `yield*` delega a
// iteração real pro que query() devolver, depois de esperar o import.
async function* defaultQueryFn(args) {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  yield* query(args);
}

// ---------------------------------------------------------------------------
// Gate de comandos destrutivos — lógica própria deste módulo.
// tools/_shared/gate-kit.mjs não tem uma função "validateGate" genérica —
// só exporta cerimônia de release-gate (sha256, makeLockedFlags,
// HashChainLedger, runGateCli). Checar "esse comando Bash é destrutivo?"
// é um domínio diferente, sem equivalente pra reaproveitar — fica aqui,
// real, não é mais um stub.
//
// AVISO HONESTO: isto é uma BLOCKLIST, não uma allowlist — por natureza,
// toda blocklist de comandos é incompleta. Cobre os bypasses concretos
// identificados numa revisão adversarial (flags de rm em qualquer ordem/
// forma, find -delete, git reset --hard, git push -f, truncamento sem
// comando real antes do >, DROP DATABASE/TRUNCATE/DELETE sem WHERE,
// curl|wget para shell, dd/mkfs, fork bomb) — mas NÃO cobre, por exemplo:
// comandos construídos via substituição de variável/eval (`$(echo rm) -rf`),
// `command > arquivo-real-existente.js` (sobrescreve um arquivo de código
// de verdade sem apagar o arquivo inteiro — não dá pra distinguir isso de
// um redirecionamento de saída legítimo só olhando a string do comando,
// sem saber se o arquivo alvo já existe e o que tem dentro), chmod/chown
// recursivos destrutivos, ou qualquer comando novo que não esteja na lista
// abaixo. NÃO é suficiente como única linha de defesa em produção — serve
// como piso conservador, não como gate de segurança completo.
// ---------------------------------------------------------------------------

function isDestructiveRm(command) {
  // Isola cada trecho "rm ..." até o próximo separador de shell, pra não
  // vazar flags de outros comandos numa linha composta (cmd1; rm -rf x).
  const segments = command.match(/\brm\s+[^;&|]*/gi) || [];
  return segments.some((seg) => {
    const hasRecursive = /(?:^|\s)-\w*[rR]\w*(?:\s|$)/.test(seg) || /--recursive\b/i.test(seg);
    const hasForce      = /(?:^|\s)-\w*f\w*(?:\s|$)/i.test(seg)  || /--force\b/i.test(seg);
    return hasRecursive && hasForce;
  });
}

function hasUnscopedSqlWipe(command) {
  if (/\bDROP\s+(DATABASE|TABLE)\b/i.test(command)) return true;
  if (/\bTRUNCATE\s+TABLE\b/i.test(command)) return true;
  const deletes = command.match(/\bDELETE\s+FROM\s+\S+[^;]*/gi) || [];
  return deletes.some((stmt) => !/\bWHERE\b/i.test(stmt));
}

function isBareTruncateRedirect(command) {
  // `:> arquivo`, `> arquivo` sem nenhum comando real antes (só espaço/início
  // de linha/separador de shell), `cat /dev/null > arquivo`, `truncate -s 0`.
  // Deliberadamente NÃO bloqueia `comando > arquivo` em geral — isso
  // quebraria uso legítimo de redirecionamento (ex: `echo x > log.txt`),
  // que é maioria esmagadora dos usos de `>` num agente que escreve código.
  if (/(^|[;&|]\s*):?>\s*\S/.test(command)) return true;
  if (/\bcat\s+\/dev\/null\s*>\s*\S/i.test(command)) return true;
  if (/\btruncate\s+(-s|--size)\s*0?\s*\d*\s+\S/i.test(command)) return true;
  return false;
}

const DESTRUCTIVE_CHECKS = [
  { test: isDestructiveRm,                                          label: 'rm recursivo + forçado (qualquer forma/ordem de flag)' },
  { test: (c) => /\bfind\b[^;&|]*-delete\b/i.test(c),                label: 'find com -delete' },
  { test: (c) => /\bgit\s+reset\s+--hard\b/i.test(c),                label: 'git reset --hard' },
  { test: (c) => /\bgit\s+push\b[^;&|]*(-f\b|--force\b)/i.test(c),   label: 'git push forçado (-f/--force)' },
  { test: isBareTruncateRedirect,                                   label: 'truncamento de arquivo sem comando real antes do redirect' },
  { test: hasUnscopedSqlWipe,                                       label: 'DROP DATABASE/TABLE, TRUNCATE TABLE ou DELETE sem WHERE' },
  { test: (c) => /\b(curl|wget)\b[^;&|]*\|\s*(sh|bash|zsh)\b/i.test(c), label: 'curl/wget pipado pra um shell' },
  { test: (c) => /\bdd\s+if=/i.test(c) || /\bmkfs(\.\w+)?\b/i.test(c), label: 'dd ou mkfs (destruição em nível de disco)' },
  // Sem \b no fim: o nome capturado pode ser ":" (idioma clássico), que não
  // é word char — \b exigiria uma transição word/non-word que não existe
  // ali, e o backreference \1 já garante repetição exata do nome.
  { test: (c) => /([\w:]+)\s*\(\)\s*\{\s*\1\s*\|\s*\1\s*&?\s*;?\s*\}\s*;\s*\1/.test(c), label: 'fork bomb' },
];

function validateDestructiveCommandGate(toolName, toolInput) {
  if (toolName !== 'Bash') return { ready: true, reason: null };
  const command = toolInput?.command ?? '';
  const hit = DESTRUCTIVE_CHECKS.find(({ test }) => test(command));
  if (hit) {
    return { ready: false, reason: `Comando bloqueado pelo gate padrão: ${hit.label}.` };
  }
  return { ready: true, reason: null };
}

// ---------------------------------------------------------------------------
// Ponte pra validateAgentOutput real (tools/hermes/mission-supervisor.mjs).
// A função real espera um objeto de claims booleanos com nomes exatos
// (test_pass, ci_green, backend_online, file_changed, real_evidence,
// pass_gold, merge, deploy, tag, stable) — não texto livre. NÃO fazemos
// parsing heurístico de PROSA livre pra "adivinhar" claims — isso seria o
// próprio tipo de alucinação que a função existe pra detectar. O que
// reconhecemos é diferente: um bloco JSON EXPLÍCITO (```json ... ``` ou um
// objeto {...} isolado) que os prompts dos subagents (abaixo) instruem
// explicitamente a devolver — não é inferência de significado a partir de
// texto, é um contrato estruturado que o próprio prompt pede.
//
// CONFIRMADO contra node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts
// (SubagentStopHookInput): o campo com o texto da última mensagem do
// subagent chama-se `last_assistant_message` — NÃO `result` (esse campo
// não existe no tipo real; um código anterior que lia `input.result`
// estava sempre recebendo undefined). Sempre uma string (ou ausente),
// nunca objeto — por isso extractAgentClaims só precisa do caminho de
// parsing de bloco JSON em string; texto solto sem esse bloco nunca vira
// claim, de nenhuma forma.
// ---------------------------------------------------------------------------
const KNOWN_CLAIM_FIELDS = [
  'test_pass', 'ci_green', 'backend_online', 'file_changed',
  'real_evidence', 'pass_gold', 'merge', 'deploy', 'tag', 'stable',
];

function parseClaimsJsonBlock(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : (text.match(/\{[\s\S]*\}/)?.[0] ?? null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : null;
  } catch {
    return null;
  }
}

function extractAgentClaims(lastAssistantMessage) {
  const claims = {};
  // last_assistant_message é sempre string|undefined no tipo real (nunca
  // objeto) — sem branch de objeto solto pra não fingir suportar um shape
  // que o SDK provadamente não usa.
  const source = typeof lastAssistantMessage === 'string' ? parseClaimsJsonBlock(lastAssistantMessage) : null;
  if (source) {
    for (const key of KNOWN_CLAIM_FIELDS) {
      if (typeof source[key] === 'boolean') claims[key] = source[key];
    }
  }
  return claims;
}

// Mescla a evidência capturada de verdade (moduleEvidence — exit_code/
// git_diff observados durante o módulo) com a evidência estática que o
// caller decidiu passar em opts.missionEvidence. Estático explícito sempre
// vence campo a campo (o caller pode saber de algo que a captura não
// alcança); capturado de verdade é o piso — só preenche o que o caller não
// informou. Se o caller nunca passou uma chave, o spread simplesmente não
// a copia, e o valor capturado continua valendo.
function mergeEvidence(staticEvidence, moduleEvidence) {
  return { ...moduleEvidence, ...staticEvidence };
}

// ---------------------------------------------------------------------------
// Evidência capturada de verdade DURANTE a execução de um módulo — diferente
// de missionEvidence (estático, decidido pelo caller antes da missão
// começar). Uma instância NOVA por módulo (ver runModule) — nunca
// compartilhada entre módulos concorrentes quando parallelModules:true.
// ---------------------------------------------------------------------------
function createModuleEvidence() {
  return {
    exit_code: undefined, // number — só setado se um comando RECONHECIDO de teste rodou
    git_diff:  undefined, // string — só setado se houve mudança real de arquivo detectada
  };
}

// Comandos reconhecidos como "rodou teste de verdade". Não tenta cobrir todo
// test runner do mundo — só os prováveis pro tipo de projeto que os
// subagents deste orquestrador escrevem (Node/JS comum + Go, já que o
// próprio vision-core usa Go Core). Comando que não bate aqui NUNCA conta
// como evidência de teste, mesmo que saia com exit 0.
const TEST_COMMAND_PATTERN = /\b(npm|yarn|pnpm)\s+(run\s+)?test\b|\bpytest\b|\bjest\b|\bmocha\b|\bvitest\b|\bgo\s+test\b/i;

// NÃO VERIFICADO CONTRA FONTE OFICIAL: nem a doc pública do Agent SDK
// (platform.claude.com/docs/en/agent-sdk/hooks + referência TypeScript)
// nem o repositório fonte no GitHub expõem a forma literal do payload que
// PostToolUse recebe pra uma chamada Bash. A única pista (não-oficial, um
// blog de terceiros) sugere {stdout, stderr, exit_code} como campos
// irmãos, possivelmente aninhados em `tool_response`. Por isso checamos
// MÚLTIPLOS caminhos candidatos — se nenhum bater, simplesmente não
// capturamos nada (mesmo comportamento de hoje, sem regressão), em vez de
// arriscar ler um campo errado com falsa confiança. RE-VERIFICAR contra os
// tipos reais assim que o pacote for instalado.
function extractBashExitCode(input) {
  const candidates = [
    input?.tool_response?.exit_code,
    input?.tool_response?.exitCode,
    input?.exit_code,
    input?.exitCode,
    input?.tool_response?.result?.exit_code,
  ];
  return candidates.find((v) => typeof v === 'number');
}

// `git status --porcelain` em vez de `git diff`: o caso principal deste
// orquestrador é o subagent CRIAR arquivos novos (scaffolding do zero) —
// `git diff` sozinho não mostra nada pra arquivo novo não rastreado (`??`
// no status), só compara arquivos já rastreados. `git status --porcelain`
// lista criados/modificados/removidos, é mais barato, e o conteúdo
// devolvido vira o próprio campo `git_diff` (o nome do campo é fixo pelo
// contrato de validateAgentOutput — só o CONTEÚDO que capturamos aqui é o
// mais correto pro caso real de uso). Retorna null (não string vazia)
// quando não dá pra confiar no resultado (não é repo git, git ausente,
// timeout) — null é tratado como "não sabemos", nunca como "sem mudança".
function captureGitStatusPorcelain(cwd) {
  try {
    const result = spawnSync('git', ['status', '--porcelain'], {
      cwd, encoding: 'utf8', timeout: 5000,
    });
    if (result.error || typeof result.status !== 'number' || result.status !== 0) return null;
    return result.stdout ?? '';
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Definição dos subagents — mapeiam 1:1 com o painel "Agentes Orquestradores"
// ---------------------------------------------------------------------------

const BACKEND_AGENT_PROMPT = `Você é o Backend Agent do Vision Core Software Factory.

Regras obrigatórias:
- Use https.request nativo, nunca axios/node-fetch, para chamadas HTTP no backend.
- Nunca marque um gate de release como liberado (allowed:true) sem evidência real.
- Siga exatamente os requisitos do módulo do brief — não adicione escopo não pedido.
- Ao terminar, resuma o que foi criado/alterado e liste os arquivos tocados.
- Ao terminar, inclua também um bloco JSON com os claims verificáveis do seu
  trabalho, exatamente neste formato (nunca reporte um valor que você não
  verificou de fato):
  \`\`\`json
  {"file_changed": true, "test_pass": true}
  \`\`\`
  - file_changed: true se você criou ou alterou algum arquivo, false caso
    contrário. Nunca omita este campo.
  - test_pass: só inclua este campo se você de fato rodou os testes do
    módulo (via Bash) e observou o resultado real. Omita o campo inteiro
    se não rodou nenhum teste — nunca reporte true sem ter rodado de verdade.
  Não inclua ci_green, backend_online, real_evidence, pass_gold, merge,
  deploy, tag ou stable — são claims de pipeline de release/CI, fora do
  seu escopo de escrever código.`;

const FRONTEND_AGENT_PROMPT = `Você é o Frontend Agent do Vision Core Software Factory.

Regras obrigatórias:
- Trabalhe apenas dentro de frontend/.
- Não introduza dependências novas sem necessidade clara (YAGNI).
- Ao terminar, resuma o que foi criado/alterado e liste os arquivos tocados.
- Ao terminar, inclua também um bloco JSON com os claims verificáveis do seu
  trabalho, exatamente neste formato (nunca reporte um valor que você não
  verificou de fato):
  \`\`\`json
  {"file_changed": true}
  \`\`\`
  - file_changed: true se você criou ou alterou algum arquivo, false caso
    contrário. Nunca omita este campo.
  Não inclua test_pass, ci_green, backend_online, real_evidence, pass_gold,
  merge, deploy, tag ou stable — são claims fora do seu escopo.`;

const SUBAGENTS = {
  'backend-agent': {
    description:
      'Implementa módulos de backend Node.js/Express — APIs, integrações, banco de dados, webhooks. ' +
      'Use para qualquer tarefa que envolva backend/, server.js, ou rotas de API.',
    prompt: BACKEND_AGENT_PROMPT,
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    model: 'sonnet',
  },
  'frontend-agent': {
    description:
      'Implementa módulos de frontend — HTML/CSS/JS, componentes de UI, páginas. ' +
      'Use para qualquer tarefa dentro de frontend/.',
    prompt: FRONTEND_AGENT_PROMPT,
    tools: ['Read', 'Write', 'Edit', 'Grep', 'Glob'],
    model: 'sonnet',
  },
};

// ---------------------------------------------------------------------------
// Hooks — a camada de governança:
//   PreToolUse   gate em cada Write/Edit/Bash antes de executar
//   SubagentStop gate no que um subagent tem permissão de devolver a Hermes
// ---------------------------------------------------------------------------

function buildHooks({ missionEvidence, onEvent, moduleEvidence, moduleId, projectWorkspace, gitBeforeSnapshot }) {
  return {
    PreToolUse: [
      {
        matcher: 'Write|Edit|Bash',
        hooks: [
          async (input) => {
            const gate = validateDestructiveCommandGate(input.tool_name, input.tool_input);
            onEvent?.({
              type: 'gate_check',
              tool: input.tool_name,
              ready: gate.ready,
              reason: gate.reason,
            });
            if (!gate.ready) {
              return { decision: 'block', reason: gate.reason ?? 'Bloqueado pelo gate de release.' };
            }
            return { decision: 'approve' };
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: 'Bash',
        hooks: [
          async (input) => {
            const command = input.tool_input?.command ?? '';
            if (TEST_COMMAND_PATTERN.test(command)) {
              const exitCode = extractBashExitCode(input);
              if (typeof exitCode === 'number') {
                moduleEvidence.exit_code = exitCode;
                onEvent?.({ type: 'evidence_captured', field: 'exit_code', value: exitCode, command, moduleId });
              }
            }
            return {};
          },
        ],
      },
    ],
    SubagentStop: [
      {
        hooks: [
          async (input) => {
            const agentClaims = extractAgentClaims(input.last_assistant_message);

            // git_diff é FATO observado por fora, não claim do agente. Só
            // compara com o "antes" se conseguimos capturar os dois lados
            // com confiança (gitBeforeSnapshot !== null e o "depois"
            // também não falhou) — senão não arriscamos afirmar nada.
            if (gitBeforeSnapshot !== null) {
              const afterSnapshot = captureGitStatusPorcelain(projectWorkspace);
              if (afterSnapshot !== null && afterSnapshot !== gitBeforeSnapshot) {
                moduleEvidence.git_diff = afterSnapshot;
                onEvent?.({ type: 'evidence_captured', field: 'git_diff', moduleId });
              }
            }

            const effectiveEvidence = mergeEvidence(missionEvidence, moduleEvidence);
            const { ok, errors, blocked_claims } = validateAgentOutput(agentClaims, effectiveEvidence);
            onEvent?.({
              type: 'subagent_stop',
              subagent: input.subagent_type,
              blocked: !ok,
            });
            if (!ok) {
              return {
                decision: 'block',
                reason: errors[0] ?? `Claim não verificável na evidência real: ${
                  blocked_claims[0] ?? 'motivo desconhecido'
                }`,
              };
            }
            return { decision: 'approve' };
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Parsing do brief — quebra um CLAUDE_CODE_BRIEF nas seções
// "### Prompt N: MN - ..." pra cada uma virar uma unidade de trabalho
// dispatchável (sequencial ou em paralelo via OpenSquad).
// ---------------------------------------------------------------------------

function parseBriefModules(brief) {
  const sections = brief.split(/(?=^### Prompt \d+:)/m).filter((s) => s.trim());

  return sections.map((section) => {
    const titleMatch = section.match(/^### Prompt (\d+): (M\d+) - (.+)$/m);
    const codeMatch = section.match(/```\s*\n([\s\S]*?)```/);

    return {
      index: titleMatch ? Number(titleMatch[1]) : null,
      moduleId: titleMatch ? titleMatch[2] : null,
      title: titleMatch ? titleMatch[3].trim() : section.slice(0, 60),
      prompt: codeMatch ? codeMatch[1].trim() : section.trim(),
    };
  });
}

// ---------------------------------------------------------------------------
// subtype != 'success' possíveis na mensagem final type:'result' do SDK.
// Fonte: docs oficiais do Agent SDK ("How the agent loop works").
// ---------------------------------------------------------------------------
const RESULT_ERROR_REASONS = {
  error_max_turns:                       'Limite de turnos (maxTurns) atingido antes de concluir o módulo.',
  error_max_budget_usd:                   'Limite de custo (maxBudgetUsd) atingido antes de concluir o módulo.',
  error_during_execution:                 'Erro durante a execução (falha de API ou execução cancelada).',
  error_max_structured_output_retries:    'Nenhuma saída estruturada válida dentro do limite de tentativas.',
};

// ---------------------------------------------------------------------------
// Orquestrador — roda Hermes como planejador/delegador. Hermes em si não
// tem Write/Edit/Bash — só pode raciocinar e invocar subagents via "Agent".
// ---------------------------------------------------------------------------

export async function runSoftwareFactoryBrief(brief, opts = {}) {
  const {
    projectWorkspace,
    onEvent = () => {},
    missionEvidence = {},
    parallelModules = false, // dispatch estilo OpenSquad
    maxTurns = 40,
    queryFn = defaultQueryFn, // override em teste — evita pacote real/tokens
  } = opts;

  if (!projectWorkspace) {
    throw new Error('runSoftwareFactoryBrief: projectWorkspace (cwd) é obrigatório.');
  }

  const modules = parseBriefModules(brief);
  onEvent({ type: 'plan', totalModules: modules.length, modules: modules.map((m) => m.moduleId) });

  const results = [];

  const runModule = async (mod) => {
    onEvent({ type: 'module_start', moduleId: mod.moduleId, title: mod.title });

    // Evidência (exit_code/git_diff) + hooks são construídos AQUI, um por
    // chamada a runModule — nunca compartilhados entre módulos concorrentes
    // (parallelModules:true pode rodar vários ao mesmo tempo via Promise.all).
    const moduleEvidence = createModuleEvidence();
    const gitBeforeSnapshot = captureGitStatusPorcelain(projectWorkspace);
    const hooks = buildHooks({
      missionEvidence, onEvent, moduleEvidence, moduleId: mod.moduleId,
      projectWorkspace, gitBeforeSnapshot,
    });

    const options = {
      cwd: projectWorkspace,
      allowedTools: ['Read', 'Grep', 'Glob', 'Agent'],
      agents: SUBAGENTS,
      hooks,
      permissionMode: 'default',
      maxTurns,
    };

    const messages = [];
    let finalResult = null;
    try {
      for await (const message of queryFn({ prompt: mod.prompt, options })) {
        messages.push(message);
        emitProgress(message, mod, onEvent);
        if (message.type === 'result') finalResult = message;
      }

      // O SDK não lança exceção quando maxTurns/maxBudgetUsd é atingido, ou
      // quando a saída estruturada falha em todas as tentativas — ele encerra
      // o stream com uma mensagem `type:'result'` cujo `subtype` não é
      // 'success' (valores confirmados: error_max_turns, error_max_budget_usd,
      // error_during_execution, error_max_structured_output_retries — fonte:
      // docs oficiais do Agent SDK, "How the agent loop works"). Sem checar
      // isso aqui, um módulo cortado pela metade seria reportado como 'done'
      // igual a um módulo que terminou de verdade.
      if (!finalResult) {
        const reason = 'Stream terminou sem mensagem type:"result" — sem confirmação de sucesso.';
        onEvent({ type: 'module_error', moduleId: mod.moduleId, error: reason });
        return { moduleId: mod.moduleId, status: 'error', error: reason, messages };
      }
      if (finalResult.subtype !== 'success') {
        const reason = RESULT_ERROR_REASONS[finalResult.subtype]
          ?? `Execução terminou com subtype inesperado: ${finalResult.subtype}`;
        onEvent({ type: 'module_error', moduleId: mod.moduleId, error: reason });
        return { moduleId: mod.moduleId, status: 'error', error: reason, subtype: finalResult.subtype, messages };
      }

      onEvent({ type: 'module_done', moduleId: mod.moduleId });
      return { moduleId: mod.moduleId, status: 'done', messages };
    } catch (err) {
      onEvent({ type: 'module_error', moduleId: mod.moduleId, error: String(err) });
      return { moduleId: mod.moduleId, status: 'error', error: String(err) };
    }
  };

  if (parallelModules) {
    // OpenSquad: dispatch de todos os módulos em paralelo. Só é seguro se
    // os módulos não tiverem dependência cruzada — quem chama é responsável
    // por esse julgamento (o brief não declara dependências entre M1..M9).
    const settled = await Promise.all(modules.map(runModule));
    results.push(...settled);
  } else {
    for (const mod of modules) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await runModule(mod));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Traduz os eventos do stream do SDK pro formato que o painel "Atividade
// Recente" / barra de progresso do SF já espera.
// ---------------------------------------------------------------------------

function emitProgress(message, mod, onEvent) {
  if (message.type === 'assistant') {
    for (const block of message.message?.content ?? []) {
      if (block.type === 'tool_use' && block.name === 'Agent') {
        onEvent({
          type: 'agent_status',
          subagent: block.input?.subagent_type,
          status: 'ATIVO',
          moduleId: mod.moduleId,
        });
      }
      if (block.type === 'text' && block.text?.trim()) {
        onEvent({ type: 'log', moduleId: mod.moduleId, text: block.text.trim() });
      }
    }
  }

  if (message.type === 'result') {
    onEvent({
      type: 'module_result',
      moduleId: mod.moduleId,
      subtype: message.subtype,
      costUsd: message.total_cost_usd,
      durationMs: message.duration_ms,
    });
  }
}

// ---------------------------------------------------------------------------
// Exemplo de uso (não executa nada sozinho — é referência):
//
// import { runSoftwareFactoryBrief } from './sf-agent-orchestrator.mjs';
//
// const results = await runSoftwareFactoryBrief(claudeCodeBriefText, {
//   projectWorkspace: '/workspaces/projeto-123',
//   parallelModules: false,
//   onEvent: (ev) => websocket.send(JSON.stringify(ev)), // -> painel do SF
// });
// ---------------------------------------------------------------------------
