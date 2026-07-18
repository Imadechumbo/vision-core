#!/usr/bin/env node
/**
 * project-architecture-diagram.mjs
 *
 * Gera um diagrama de arquitetura (HTML autocontido, SVG) do PROJETO
 * ESPECIFICO a partir do mesmo CLAUDE_CODE_BRIEF.md que alimenta
 * project-infographic.mjs (branch complexity==='complex' — ver
 * backend/server.js). ADITIVO: nunca troca nada do infográfico existente,
 * é um artefato novo e separado (PROJETO_DIAGRAMA.html) entregue lado a
 * lado com PROJETO_INFOGRAFICO.html.
 *
 * Reusa splitSections/parseStackTable de project-infographic.mjs — mesmo
 * parser, mesmo contrato de formato do brief, zero duplicação.
 *
 * Determinístico por design (mesma decisão já validada no infográfico):
 * ZERO chamada de LLM. O IR (JSON IR do Archify — schemas/architecture em
 * tools/vendor/archify/) é construído programaticamente a partir das linhas
 * da tabela de stack já parseadas. Renderização em si roda como processo
 * filho (o renderer do Archify é um script CLI, não uma função pura
 * importável — ver tools/vendor/archify/README.md), com timeout e limpeza
 * de arquivos temporários — nunca pode travar nem sujar disco.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSections, parseStackTable, normalizeForMatch } from './project-infographic.mjs';
import { textUnits } from './vendor/archify/renderers/shared/utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RENDERER_PATH = path.join(__dirname, 'vendor', 'archify', 'renderers', 'architecture', 'render-architecture.mjs');
const DEFAULT_RENDER_TIMEOUT_MS = 12000;

// Vocabulario real do prompt do brief (backend/server.js, secao "STACK
// JUSTIFICADA": "frontend/backend/dados/infra/seguranca") mapeado pro enum
// fixo de 7 valores exigido pelo schema architecture do Archify
// (tools/vendor/archify/schemas/common.schema.json#componentType). Rotulo
// fora deste dicionario (mensageria, texto livre nao previsto no prompt,
// etc.) cai no default 'external' — nunca falha por rotulo desconhecido.
const LAYER_TO_COMPONENT_TYPE = {
  frontend: 'frontend',
  backend: 'backend',
  dados: 'database',
  infra: 'cloud',
  seguranca: 'security',
};
const DEFAULT_COMPONENT_TYPE = 'external';

export function mapLayerToComponentType(layer) {
  const key = normalizeForMatch(layer).trim();
  return LAYER_TO_COMPONENT_TYPE[key] || DEFAULT_COMPONENT_TYPE;
}

// IDs do Archify exigem ^[a-zA-Z][a-zA-Z0-9_-]*$ — nome de tecnologia real
// vem livre do LLM ("Node.js", "AWS S3", "PostgreSQL 15"), precisa de
// sanitizacao + desambiguacao deterministica de colisao.
function sanitizeId(label, index, seen) {
  let base = String(label || '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 40);
  if (!base || !/^[a-zA-Z]/.test(base)) base = `c${base}`;
  if (!base) base = `component${index}`;
  let id = base;
  let n = 2;
  while (seen.has(id)) { id = `${base}${n}`; n += 1; }
  seen.add(id);
  return id;
}

/**
 * buildArchitectureIR — funcao pura, zero I/O, zero LLM.
 *
 * @param {string} briefMarkdown — conteudo do CLAUDE_CODE_BRIEF.md.
 * @param {{name?: string}} projectMeta — nome do projeto.
 * @returns {object|null} JSON IR pronto pro schema "architecture" do
 *   Archify, ou `null` se o brief nao tiver secao de stack (degradacao
 *   graciosa, mesmo padrao do infografico).
 */
export function buildArchitectureIR(briefMarkdown, projectMeta = {}) {
  const sections = splitSections(briefMarkdown);
  const stackSection = sections['stack justificada'];
  if (!stackSection) return null;

  const stackRows = parseStackTable(stackSection).filter((r) => r.tech);
  if (!stackRows.length) return null;

  // SKILL.md do Archify recomenda ate 12 nos por diagrama architecture
  // antes de a legibilidade cair — mesmo limite aplicado aqui.
  const rows = stackRows.slice(0, 12);
  const seenIds = new Set();
  const components = rows.map((row, index) => {
    const sublabel = row.layer ? String(row.layer).slice(0, 40) : null;
    return {
      id: sanitizeId(row.tech, index, seenIds),
      type: mapLayerToComponentType(row.layer),
      label: String(row.tech).slice(0, 60),
      ...(sublabel ? { sublabel } : {}),
    };
  });

  // components.length é sempre >=1 aqui (early-return acima cobre 0 linhas),
  // então Math.min nunca zera — sem fallback morto.
  const cols = Math.min(components.length, 4);
  components.forEach((c, index) => {
    c.row = Math.floor(index / cols);
    c.col = index % cols;
  });

  // Largura de caixa uniforme (grid.mjs só aceita 1 cellW global pra grade
  // inteira), dimensionada pelo maior label real. Achado rodando um brief
  // realista (nomes de tecnologia como "Java 21 + Spring Boot 3.4" têm
  // ~25 caracteres): o default de 120px do renderer rejeita rótulo
  // qualquer um desses e faz o render inteiro falhar (best-effort evita o
  // crash, mas o diagrama nunca aparece — inútil na prática). Fórmula
  // (6.6px/unidade) e o padding de validação (+8) copiados de
  // validateArchitecture() em vendor/archify/renderers/architecture/
  // render-architecture.mjs — se essa constante mudar lá numa atualização
  // futura do vendoring, atualizar aqui também.
  const BOX_HEIGHT = 60; // mesmo default (layout.defaultH) do renderer vendorizado
  const boxWidth = Math.max(120, ...components.map((c) => Math.ceil(textUnits(c.label) * 6.6) + 16));
  components.forEach((c) => { c.size = [boxWidth, BOX_HEIGHT]; });

  // Topologia fixa "hub-and-spoke": backend (ou frontend, na ausencia) e o
  // hub que se conecta a cada outro componente. Nao tenta inferir fluxo de
  // dados real — e a mesma renuncia deliberada do infografico ("nunca
  // sintetiza narrativa que nao existe literalmente no brief"), aplicada
  // aqui a conexoes em vez de prosa.
  const hub = components.find((c) => c.type === 'backend')
    || components.find((c) => c.type === 'frontend')
    || components[0];
  const connections = components
    .filter((c) => c.id !== hub.id)
    .map((c) => ({ from: hub.id, to: c.id }));

  const projectName = String(projectMeta.name || 'Projeto').trim().slice(0, 120) || 'Projeto';

  return {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title: `${projectName} — Arquitetura` },
    layout: { mode: 'grid', cols, cellW: boxWidth, gapX: 30 },
    components,
    connections,
  };
}

/**
 * renderArchitectureDiagram — unico ponto do modulo com I/O (arquivo temp +
 * processo filho). Best-effort: qualquer falha (spawn, timeout, exit code,
 * arquivo de saida ausente) devolve `null` em vez de lancar — quem chama
 * decide degradar. Sempre limpa o diretorio temporario, sucesso ou falha.
 */
export function renderArchitectureDiagram(ir, options = {}) {
  if (!ir) return null;
  const rendererPath = options.rendererPath || DEFAULT_RENDERER_PATH;
  const timeoutMs = options.timeoutMs || DEFAULT_RENDER_TIMEOUT_MS;
  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-archify-'));
    const inputPath = path.join(tmpDir, 'ir.json');
    const outputPath = path.join(tmpDir, 'diagram.html');
    fs.writeFileSync(inputPath, JSON.stringify(ir));
    const result = spawnSync(process.execPath, [rendererPath, inputPath, outputPath], {
      timeout: timeoutMs,
      encoding: 'utf8',
    });
    if (result.error || result.status !== 0 || !fs.existsSync(outputPath)) return null;
    return fs.readFileSync(outputPath, 'utf8');
  } catch (_) {
    return null;
  } finally {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * appendProjectArchitectureDiagramFile — decisao de "quando anexar o
 * diagrama", isolada da rota Express (mesmo desenho de
 * appendProjectInfographicFile). Aditivo: sempre soma a PROJETO_DIAGRAMA.html
 * ao array, nunca remove nem altera PROJETO_INFOGRAFICO.html nem nenhum
 * outro arquivo. Best-effort em qualquer etapa (brief ausente, secao de
 * stack ausente, render falhando) — retorna `files` inalterado.
 */
export function appendProjectArchitectureDiagramFile(files, projectMeta = {}, options = {}) {
  const briefFile = (files || []).find((f) => f.name && f.name.includes('CLAUDE_CODE_BRIEF'));
  if (!briefFile) return files;
  const ir = buildArchitectureIR(briefFile.content, projectMeta);
  if (!ir) return files;
  const html = renderArchitectureDiagram(ir, options);
  if (!html) return files;
  return [...files, { name: 'PROJETO_DIAGRAMA.html', content: html }];
}
