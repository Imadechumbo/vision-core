#!/usr/bin/env node
/**
 * project-infographic.mjs
 *
 * Gera um infográfico HTML do PROJETO ESPECÍFICO a partir de um
 * CLAUDE_CODE_BRIEF.md real (gerado por /api/sf/project-files, branch
 * complexity==='complex' — ver backend/server.js). Reaproveita o CSS
 * literal de docs/SOFTWARE_FACTORY_INFOGRAFICO.html (mesmas classes
 * .panel/.chip/.lane/.matrix/.legend), mas nunca o catálogo universal de
 * linguagens/stacks/tipos de projeto — só o que o parser extraiu DESTE
 * brief.
 *
 * Determinístico por design: parsing de regex/seções, ZERO chamada de
 * LLM, zero I/O (função pura — sem fetch/fs/rede). Depende do formato
 * estrutural exigido no prompt do brief (backend/server.js, branch
 * complexity==='complex', ver comentário "Fase A2" lá) — não interpreta
 * conteúdo, só reconhece a casca (headers/tabela/bullets).
 *
 * Fora de escopo deliberado (ver investigação da Fase B): nenhuma seção
 * ".flow" — o Tier 1/Tier 2 abaixo não atribui papel a ela, e gerar uma
 * exigiria sintetizar uma narrativa que não existe literalmente no brief
 * (proibido explicitamente — isso é interpretação editorial, não parsing).
 */

// ---------------------------------------------------------------------------
// Normalização — usada em DOIS lugares bem distintos, nunca pra alterar o
// texto exibido ao usuário:
//   1) matching de headers de seção ("## DOMÍNIO" vs "## DOMINIO")
//   2) matching de marcadores Tier 2 ("ATENÇÃO:" vs "Atencao:")
// Decisão aprovada explicitamente (não é desvio silencioso da spec original,
// que pedia "verbatim"): o brief real de fixture usa as DUAS grafias do
// mesmo marcador ("Atencao:" em R1, "ATENÇÃO:" em R6) — um match verbatim
// estrito perderia R1 silenciosamente. Normalizar (lowercase + remover
// diacríticos) antes de comparar é mais robusto contra essa variação do LLM,
// pelo mesmo motivo que motivou apertar o prompt na Fase A2 (mesma classe de
// problema, camada mais fina). O CONTEÚDO extraído e exibido no HTML nunca
// passa por este normalize — só a decisão estrutural de "isto bate com X?".
// ---------------------------------------------------------------------------
function normalizeForMatch(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '') // remove marcas diacríticas (Unicode category Mn) pós-decomposição NFD
    .toLowerCase();
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Split do markdown em seções de nível 2 ("## HEADER"). Chave normalizada
// (sem acento, lowercase) — tolera variação de acentuação no PRÓPRIO header
// pelo mesmo motivo do normalizeForMatch acima. "### M<N> - ..." dentro do
// corpo NUNCA é confundido com header de seção: `^##\s+` exige espaço logo
// após os dois `#`, e o terceiro `#` de "###" quebra esse match.
// ---------------------------------------------------------------------------
function splitSections(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const sections = {};
  let currentKey = null;
  let buf = [];
  const flush = () => { if (currentKey) sections[currentKey] = buf.join('\n').trim(); };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      currentKey = normalizeForMatch(m[1]);
      buf = [];
    } else if (currentKey) {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

// Coleta bullets "- ..." logo após uma linha que bate labelRegex, até a
// próxima linha de label em negrito ("**Algo:**") ou até o corpo acabar.
function extractLabeledBullets(sectionBody, labelRegex) {
  const lines = String(sectionBody || '').split(/\r?\n/);
  let collecting = false;
  const bullets = [];
  for (const line of lines) {
    if (!collecting) {
      if (labelRegex.test(line)) collecting = true;
      continue;
    }
    const bulletMatch = line.match(/^-\s+(.*)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim());
    } else if (line.trim() === '') {
      continue; // linha em branco entre bullets — segue coletando
    } else {
      break; // qualquer outra coisa (inclusive outro label **X:**) encerra
    }
  }
  return bullets;
}

function parseComplianceBullet(bulletText) {
  const m = bulletText.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
  if (!m) return null;
  return { term: m[1].trim(), description: m[2].trim(), raw: bulletText };
}

function parseRiskBullet(bulletText) {
  const m = bulletText.match(/^\*\*R(\d+)\s*-\s*([^*]+?):\*\*\s*(.*)$/);
  if (!m) return null;
  return { number: Number(m[1]), title: m[2].trim(), description: m[3].trim(), raw: bulletText };
}

// ---------------------------------------------------------------------------
// Tier 2 — legenda de riscos críticos. Um risco é "crítico" se e somente se
// contém (normalizado) uma das frases-marcador que o próprio brief já usa
// pra sinalizar destaque. Nunca inventa criticidade a partir do conteúdo
// semântico do risco (ex: R4 descreve um SPOF em prosa — "ponto unico de
// falha operacional" — sem usar a sigla "SPOF" nem nenhum outro marcador;
// fica de fora da legenda, propositalmente, por decisão já confirmada).
// ---------------------------------------------------------------------------
const CRITICAL_MARKERS = ['mais critic', 'ponto mais frágil', 'lacuna mais critica', 'spof', 'atencao:']
  .map(normalizeForMatch);

function isRiskCritical(riskRawText) {
  const norm = normalizeForMatch(riskRawText);
  return CRITICAL_MARKERS.some((marker) => norm.includes(marker));
}

// ---------------------------------------------------------------------------
// Tier 1 — categorização de risco em até 3 boxes. Heurística simples de
// palavra-chave, NÃO julgamento livre. A ORDEM do array é a regra de
// desempate aprovada explicitamente: se um risco bater em mais de uma
// categoria ao mesmo tempo, "Dados pessoais" vence (checada primeiro) —
// nenhum risco na fixture real bate em duas ao mesmo tempo, mas a regra
// existe pra não deixar esse caso indefinido no futuro.
// ---------------------------------------------------------------------------
const RISK_CATEGORIES = [
  { name: 'Dados pessoais', keywords: ['lgpd', 'dado', 'titular', 'terceiro'] },
  { name: 'Cadeia de custódia/integridade', keywords: ['hash', 'custodia', 'assinatura', 'carimbo'] },
];
const DEFAULT_RISK_CATEGORY = 'Operação e negócio';

function categorizeRisk(riskRawText) {
  const norm = normalizeForMatch(riskRawText);
  for (const cat of RISK_CATEGORIES) {
    if (cat.keywords.some((kw) => norm.includes(kw))) return cat.name;
  }
  return DEFAULT_RISK_CATEGORY;
}

// ---------------------------------------------------------------------------
// Stack: tabela markdown "| Tecnologia | Camada | Justificativa |". Primeira
// linha com "|" = header (descartada), linha "|---|---|---|" = separador
// (descartada via regex de alinhamento markdown padrão), demais = dados.
// ---------------------------------------------------------------------------
function parseStackTable(sectionBody) {
  const lines = String(sectionBody || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = [];
  let sawHeader = false;
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = line.slice(1, line.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim());
    if (!sawHeader) { sawHeader = true; continue; }
    if (cells.every((c) => /^:?-{1,}:?$/.test(c))) continue;
    if (cells[0]) rows.push({ tech: cells[0], layer: cells[1] || '', justification: cells[2] || '' });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Módulos: "### M<N> - <nome>" seguido de "**Descricao:**" (entre outros
// labels não usados aqui — Dependencias/Criterio de Done ficam fora de
// escopo do infográfico, o Tier 1 só pede number/nome/subtítulo).
// ---------------------------------------------------------------------------
function parseModules(sectionBody) {
  const parts = String(sectionBody || '').split(/(?=^###\s+M\d+\s*-)/m).filter((s) => s.trim());
  return parts.map((part) => {
    const headerMatch = part.match(/^###\s+M(\d+)\s*-\s*(.+)$/m);
    if (!headerMatch) return null;
    const descMatch = part.match(/\*\*Descri[cç][aã]o:\*\*\s*(.+)/i);
    const firstSentence = descMatch ? descMatch[1].split(/\.\s/)[0].trim() : '';
    const words = firstSentence.split(/\s+/).filter(Boolean);
    const truncated = words.length > 5;
    const subtitle = words.slice(0, 5).join(' ') + (truncated ? '…' : '');
    return { number: Number(headerMatch[1]), name: headerMatch[2].trim(), subtitle };
  }).filter(Boolean);
}

// Diagrama ASCII — capturado literalmente, sem tentativa de redesenho.
// Remove um cerco ``` opcional (o prompt pede bloco de código, mas o brief
// real de fixture não usa fence — a extração por limite de seção funciona
// com ou sem, então isto é só limpeza cosmética, não uma dependência).
function extractArchitectureAscii(sectionBody) {
  let body = String(sectionBody || '').trim();
  const fenced = body.match(/^```[\w]*\r?\n([\s\S]*?)\r?\n?```$/);
  if (fenced) body = fenced[1];
  return body;
}

// ---------------------------------------------------------------------------
// CSS — copiado literalmente de docs/SOFTWARE_FACTORY_INFOGRAFICO.html
// (conteúdo entre <style> e </style>). Não reescrever daqui — se o
// infográfico universal mudar de visual, atualizar aqui também.
// ---------------------------------------------------------------------------
const INFOGRAPHIC_CSS = `
    :root {
      --bg: #0b1020;
      --panel: #111827;
      --panel-2: #172033;
      --line: #263247;
      --text: #eef2ff;
      --muted: #a8b3c7;
      --blue: #38bdf8;
      --green: #34d399;
      --violet: #8b5cf6;
      --amber: #f59e0b;
      --red: #fb7185;
      --ink: #050816;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }

    main {
      width: min(1440px, calc(100% - 48px));
      margin: 0 auto;
      padding: 40px 0 56px;
    }

    .hero {
      display: grid;
      grid-template-columns: 1.2fr .8fr;
      gap: 24px;
      align-items: stretch;
      border: 1px solid var(--line);
      background: linear-gradient(135deg, #111827 0%, #121a2c 56%, #09243a 100%);
      padding: 32px;
      border-radius: 8px;
    }

    h1, h2, h3, p {
      margin: 0;
    }

    h1 {
      max-width: 760px;
      font-size: clamp(34px, 5vw, 68px);
      line-height: .95;
      letter-spacing: 0;
    }

    .subtitle {
      max-width: 820px;
      margin-top: 18px;
      color: var(--muted);
      font-size: 18px;
    }

    .stamp {
      align-self: end;
      display: grid;
      gap: 12px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, .12);
      background: rgba(5, 8, 22, .42);
      border-radius: 8px;
    }

    .stamp strong {
      font-size: 14px;
      color: var(--blue);
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .stamp span {
      color: var(--muted);
      font-size: 14px;
    }

    .grid {
      display: grid;
      gap: 18px;
      margin-top: 18px;
    }

    .cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .cols-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .panel {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 20px;
      min-height: 100%;
    }

    .panel.soft {
      background: var(--panel-2);
    }

    .panel h2 {
      margin-bottom: 14px;
      font-size: 18px;
      color: var(--text);
    }

    .panel h3 {
      margin-bottom: 8px;
      font-size: 13px;
      color: var(--muted);
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 6px 10px;
      border: 1px solid rgba(255, 255, 255, .11);
      border-radius: 6px;
      background: rgba(255, 255, 255, .04);
      color: var(--text);
      font-size: 13px;
      white-space: nowrap;
    }

    .chip.blue { border-color: rgba(56, 189, 248, .36); color: #bae6fd; }
    .chip.green { border-color: rgba(52, 211, 153, .38); color: #bbf7d0; }
    .chip.violet { border-color: rgba(139, 92, 246, .42); color: #ddd6fe; }
    .chip.amber { border-color: rgba(245, 158, 11, .44); color: #fde68a; }
    .chip.red { border-color: rgba(251, 113, 133, .44); color: #fecdd3; }

    .lane {
      display: grid;
      grid-template-columns: repeat(9, minmax(100px, 1fr));
      gap: 10px;
      align-items: stretch;
    }

    .step {
      position: relative;
      min-height: 118px;
      padding: 14px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #0f172a;
    }

    .step b {
      display: block;
      width: 30px;
      height: 30px;
      margin-bottom: 10px;
      border-radius: 50%;
      background: var(--blue);
      color: var(--ink);
      text-align: center;
      line-height: 30px;
      font-size: 13px;
    }

    .step strong {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
    }

    .step span {
      color: var(--muted);
      font-size: 12px;
    }

    .matrix {
      display: grid;
      grid-template-columns: 1.05fr 1fr 1fr;
      gap: 12px;
    }

    .matrix .box {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #0f172a;
    }

    .box ul,
    .panel ul {
      margin: 8px 0 0;
      padding-left: 18px;
      color: var(--muted);
      font-size: 14px;
    }

    .box li,
    .panel li {
      margin: 5px 0;
    }

    .flow {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
    }

    .flow-card {
      padding: 16px;
      min-height: 150px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #0f172a;
    }

    .flow-card strong {
      display: block;
      margin-bottom: 8px;
      color: var(--blue);
      font-size: 14px;
    }

    .flow-card p {
      color: var(--muted);
      font-size: 13px;
    }

    .legend {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .mini {
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #0f172a;
    }

    .mini strong {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
    }

    .mini p {
      color: var(--muted);
      font-size: 13px;
    }

    .footer {
      margin-top: 18px;
      padding: 16px 20px;
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--muted);
      background: #0f172a;
      font-size: 13px;
    }

    pre.ascii-arch {
      margin: 0;
      overflow-x: auto;
      font-family: "Cascadia Code", "Fira Code", Consolas, "Courier New", monospace;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text);
    }

    @media (max-width: 1180px) {
      .hero,
      .cols-3,
      .cols-4,
      .matrix,
      .flow,
      .legend {
        grid-template-columns: 1fr;
      }

      .lane {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 720px) {
      main {
        width: min(100% - 28px, 1440px);
        padding-top: 22px;
      }

      .hero,
      .panel {
        padding: 18px;
      }

      .lane {
        grid-template-columns: 1fr;
      }
    }

    @media print {
      body {
        background: #fff;
        color: #111827;
      }

      main {
        width: 100%;
        padding: 0;
      }

      .hero,
      .panel,
      .step,
      .box,
      .flow-card,
      .mini,
      .footer {
        break-inside: avoid;
        background: #fff;
        color: #111827;
        border-color: #cbd5e1;
      }

      .subtitle,
      .stamp span,
      .step span,
      .box ul,
      .panel ul,
      .flow-card p,
      .mini p,
      .footer {
        color: #475569;
      }
    }
`;

/**
 * generateProjectInfographic — função pura, zero I/O, zero chamada de LLM.
 *
 * @param {string} briefMarkdown — conteúdo do CLAUDE_CODE_BRIEF.md gerado
 *   por /api/sf/project-files (branch complex).
 * @param {{name?: string}} projectMeta — nome do projeto (não vem do
 *   brief — vem do arquivo/request original, por isso é parâmetro
 *   separado, não parseado).
 * @returns {string|null} HTML completo, ou `null` se o brief não tiver
 *   estrutura suficiente (ex: caminho fallback "## Projeto" documentado em
 *   server.js) — degradação graciosa, nunca inventa seção vazia.
 */
export function generateProjectInfographic(briefMarkdown, projectMeta = {}) {
  const sections = splitSections(briefMarkdown);
  const domSection = sections['dominio e compliance'];
  const stackSection = sections['stack justificada'];
  const modulesSection = sections['modulos a implementar'];
  const archSection = sections['arquitetura de componentes'];

  // Degradação graciosa: nenhuma das 3 seções essenciais do Tier 1 existe
  // — brief sem estrutura suficiente (ex: fallback determinístico "##
  // Projeto"). Não força um render vazio, não inventa conteúdo.
  if (!domSection && !stackSection && !modulesSection) return null;

  const domainMatch = domSection ? domSection.match(/\*\*Dom[ií]nio:\*\*\s*(.+)/i) : null;
  const domainSentence = domainMatch ? domainMatch[1].trim() : '';

  const complianceBullets = domSection
    ? extractLabeledBullets(domSection, /\*\*Compliance Obrigat[oó]rio:\*\*/i).map(parseComplianceBullet).filter(Boolean)
    : [];

  const riskBullets = domSection
    ? extractLabeledBullets(domSection, /\*\*Riscos Espec[ií]ficos:\*\*/i).map(parseRiskBullet).filter(Boolean)
    : [];

  const stackRows = stackSection ? parseStackTable(stackSection) : [];
  const modules = modulesSection ? parseModules(modulesSection) : [];
  const architectureAscii = archSection ? extractArchitectureAscii(archSection) : '';

  const projectName = String(projectMeta.name || 'Projeto').trim();

  const complianceChips = complianceBullets
    .map((b) => `<span class="chip amber">${escapeHtml(b.term)}</span>`)
    .join('\n          ');

  const stackChips = stackRows
    .map((r) => `<span class="chip violet">${escapeHtml(r.tech)}</span>`)
    .join('\n          ');

  const lane = modules
    .map((m) => `<div class="step"><b>${String(m.number).padStart(2, '0')}</b><strong>${escapeHtml(m.name)}</strong><span>${escapeHtml(m.subtitle)}</span></div>`)
    .join('\n          ');

  // Categorização Tier 1 — só cria box pra categoria com ≥1 risco (nunca
  // renderiza um .box vazio).
  const categorized = new Map();
  for (const risk of riskBullets) {
    const cat = categorizeRisk(risk.raw);
    if (!categorized.has(cat)) categorized.set(cat, []);
    categorized.get(cat).push(risk);
  }
  const categoryOrder = [...RISK_CATEGORIES.map((c) => c.name), DEFAULT_RISK_CATEGORY];
  const matrixBoxes = categoryOrder
    .filter((cat) => categorized.has(cat))
    .map((cat) => {
      const items = categorized.get(cat)
        .map((r) => `<li><strong>R${r.number} - ${escapeHtml(r.title)}:</strong> ${escapeHtml(r.description)}</li>`)
        .join('\n              ');
      return `<div class="box">\n              <h3>${escapeHtml(cat)}</h3>\n              <ul>\n              ${items}\n              </ul>\n            </div>`;
    })
    .join('\n            ');

  // Tier 2 — legenda de riscos críticos. Seção inteira omitida se nenhum
  // risco tiver marcador (não inventa destaque onde o brief não sinalizou).
  const criticalRisks = riskBullets.filter((r) => isRiskCritical(r.raw));
  const legendSection = criticalRisks.length === 0 ? '' : `
    <section class="grid">
      <div class="panel">
        <h2>Riscos críticos destacados</h2>
        <div class="legend">
          ${criticalRisks.map((r) => `<div class="mini"><strong>R${r.number} - ${escapeHtml(r.title)}</strong><p>${escapeHtml(r.description)}</p></div>`).join('\n          ')}
        </div>
      </div>
    </section>
`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(projectName)} - Infografico do Projeto</title>
  <style>${INFOGRAPHIC_CSS}</style>
</head>
<body>
  <main>
    <section class="hero">
      <div>
        <h1>${escapeHtml(projectName)}</h1>
        <p class="subtitle">${escapeHtml(domainSentence)}</p>
      </div>
      <aside class="stamp">
        <strong>Gerado a partir de</strong>
        <span>CLAUDE_CODE_BRIEF.md — branch complex (domínio regulado)</span>
      </aside>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Compliance obrigatório</h2>
        <div class="chips">
          ${complianceChips}
        </div>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Stack por camada</h2>
        <div class="chips">
          ${stackChips}
        </div>
      </div>
    </section>

    <section class="grid">
      <div class="panel soft">
        <h2>Pipeline de módulos</h2>
        <div class="lane">
          ${lane}
        </div>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Riscos específicos</h2>
        <div class="matrix">
            ${matrixBoxes}
        </div>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Arquitetura de componentes</h2>
        <pre class="ascii-arch">${escapeHtml(architectureAscii)}</pre>
      </div>
    </section>
${legendSection}
    <section class="footer">
      Gerado automaticamente a partir do CLAUDE_CODE_BRIEF.md — parser determinístico, zero chamada de LLM.
    </section>
  </main>
</body>
</html>`;
}

export {
  splitSections,
  parseStackTable,
  parseModules,
  parseRiskBullet,
  parseComplianceBullet,
  isRiskCritical,
  categorizeRisk,
  extractArchitectureAscii,
  normalizeForMatch,
};
