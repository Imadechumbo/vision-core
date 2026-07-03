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
 * Requer: npm install @anthropic-ai/claude-agent-sdk
 */

import { validateAgentOutput } from './hermes/mission-supervisor.mjs';

// `query` do @anthropic-ai/claude-agent-sdk é importado dinamicamente (não no
// topo do arquivo) por dois motivos: (1) o pacote pode não estar instalado
// ainda — um import estático quebraria a resolução de módulo pra qualquer
// coisa que importe este arquivo, inclusive testes; (2) permite injetar um
// mock via opts.queryFn em teste, sem precisar do pacote real instalado nem
// gastar tokens de verdade.
async function defaultQueryFn(args) {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  return query(args);
}

// ---------------------------------------------------------------------------
// Gate de comandos destrutivos — lógica própria deste módulo.
// tools/_shared/gate-kit.mjs não tem uma função "validateGate" genérica —
// só exporta cerimônia de release-gate (sha256, makeLockedFlags,
// HashChainLedger, runGateCli). Checar "esse comando Bash é destrutivo?"
// é um domínio diferente, sem equivalente pra reaproveitar — fica aqui,
// real, não é mais um stub.
// ---------------------------------------------------------------------------
function validateDestructiveCommandGate(toolName, toolInput) {
  const destructive = /\brm\s+-rf\b|:>\s*\S|DROP\s+TABLE|git\s+push\s+--force/i;
  if (toolName === 'Bash' && destructive.test(toolInput?.command ?? '')) {
    return { ready: false, reason: 'Comando potencialmente destrutivo bloqueado pelo gate padrão.' };
  }
  return { ready: true, reason: null };
}

// ---------------------------------------------------------------------------
// Ponte pra validateAgentOutput real (tools/hermes/mission-supervisor.mjs).
// A função real espera um objeto de claims booleanos com nomes exatos
// (test_pass, ci_green, backend_online, file_changed, real_evidence,
// pass_gold, merge, deploy, tag, stable) — não texto livre. O SDK devolve
// `input.result` como resultado do subagent, tipicamente string. NÃO
// fazemos parsing heurístico de texto livre pra "adivinhar" claims — isso
// seria o próprio tipo de alucinação que a função existe pra detectar. Só
// extraímos claims quando o subagent devolver campos booleanos explícitos
// com esses nomes; texto livre nunca vira claim.
// ---------------------------------------------------------------------------
const KNOWN_CLAIM_FIELDS = [
  'test_pass', 'ci_green', 'backend_online', 'file_changed',
  'real_evidence', 'pass_gold', 'merge', 'deploy', 'tag', 'stable',
];

function extractAgentClaims(subagentResult) {
  const claims = {};
  if (subagentResult && typeof subagentResult === 'object') {
    for (const key of KNOWN_CLAIM_FIELDS) {
      if (typeof subagentResult[key] === 'boolean') claims[key] = subagentResult[key];
    }
  }
  return claims;
}

// ---------------------------------------------------------------------------
// Definição dos subagents — mapeiam 1:1 com o painel "Agentes Orquestradores"
// ---------------------------------------------------------------------------

const BACKEND_AGENT_PROMPT = `Você é o Backend Agent do Vision Core Software Factory.

Regras obrigatórias:
- Use https.request nativo, nunca axios/node-fetch, para chamadas HTTP no backend.
- Nunca marque um gate de release como liberado (allowed:true) sem evidência real.
- Siga exatamente os requisitos do módulo do brief — não adicione escopo não pedido.
- Ao terminar, resuma o que foi criado/alterado e liste os arquivos tocados.`;

const FRONTEND_AGENT_PROMPT = `Você é o Frontend Agent do Vision Core Software Factory.

Regras obrigatórias:
- Trabalhe apenas dentro de frontend/.
- Não introduza dependências novas sem necessidade clara (YAGNI).
- Ao terminar, resuma o que foi criado/alterado e liste os arquivos tocados.`;

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

function buildHooks({ missionEvidence, onEvent }) {
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
    SubagentStop: [
      {
        hooks: [
          async (input) => {
            const agentClaims = extractAgentClaims(input.result);
            const { ok, errors, blocked_claims } = validateAgentOutput(agentClaims, missionEvidence);
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

  const hooks = buildHooks({ missionEvidence, onEvent });
  const results = [];

  const runModule = async (mod) => {
    onEvent({ type: 'module_start', moduleId: mod.moduleId, title: mod.title });

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
