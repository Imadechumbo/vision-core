#!/usr/bin/env node
/**
 * project-architecture-diagram — unit test (mapeamento determinístico +
 * caminho de erro best-effort + 1 render real de ponta a ponta via Archify
 * vendorizado). Mesmo padrão de tools/tests/project-infographic.test.mjs.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mapLayerToComponentType,
  buildArchitectureIR,
  buildArchitectureIRFromFiles,
  renderArchitectureDiagram,
  appendProjectArchitectureDiagramFile,
  appendProjectArchitectureDiagramFileFromFiles,
} from '../project-architecture-diagram.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const BRIEF_WITH_STACK = `# CLAUDE CODE BRIEF

## DOMINIO E COMPLIANCE

**Dominio:** Sistema de teste

## STACK JUSTIFICADA

| Tecnologia | Camada | Justificativa |
|---|---|---|
| React | frontend | UI |
| Express | backend | API |
| PostgreSQL | dados | Persistencia |
| AWS S3 | infra | Storage de arquivos |
| JWT/Helmet | seguranca | Autenticacao |
| Kafka | mensageria | Fila de eventos (rotulo fora do dicionario conhecido) |

## MODULOS A IMPLEMENTAR

### M1 - Auth
**Descricao:** Login e registro.
`;

const BRIEF_FALLBACK = `# CLAUDE CODE BRIEF

## Projeto
Descricao livre, sem secoes ricas.
`;

console.log('[Suite A] mapLayerToComponentType — vocabulario PT do brief -> enum do Archify');

assert(mapLayerToComponentType('frontend') === 'frontend', '[A-01] frontend -> frontend');
assert(mapLayerToComponentType('backend') === 'backend', '[A-02] backend -> backend');
assert(mapLayerToComponentType('dados') === 'database', '[A-03] dados -> database');
assert(mapLayerToComponentType('infra') === 'cloud', '[A-04] infra -> cloud');
assert(mapLayerToComponentType('seguranca') === 'security', '[A-05] seguranca (sem cedilha) -> security');
assert(mapLayerToComponentType('Segurança') === 'security', '[A-06] Segurança (com cedilha/maiuscula) -> security, normaliza acento+caixa');
assert(mapLayerToComponentType('mensageria') === 'external', '[A-07] rotulo fora do dicionario -> default "external"');
assert(mapLayerToComponentType('') === 'external', '[A-08] rotulo vazio -> default "external", nunca lança');
assert(mapLayerToComponentType(undefined) === 'external', '[A-09] rotulo undefined -> default "external", nunca lança');

console.log('\n[Suite B] buildArchitectureIR — função pura, zero I/O, zero LLM');

const ir = buildArchitectureIR(BRIEF_WITH_STACK, { name: 'Projeto Teste' });
assert(ir !== null, '[B-01] brief com STACK JUSTIFICADA produz IR não-nulo');
assert(ir.schema_version === 1 && ir.diagram_type === 'architecture', '[B-02] schema_version/diagram_type corretos');
assert(ir.meta.title.includes('Projeto Teste'), '[B-03] título usa o nome do projeto');
assert(ir.components.length === 6, '[B-04] 6 linhas da tabela de stack -> 6 componentes');
assert(ir.components.every((c) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(c.id)), '[B-05] todo id de componente bate o padrão exigido pelo schema (^[a-zA-Z][a-zA-Z0-9_-]*$)');
assert(new Set(ir.components.map((c) => c.id)).size === 6, '[B-06] nenhum id colidiu (dedupe determinístico)');
assert(ir.components.find((c) => c.label === 'AWS S3').type === 'cloud', '[B-07] linha "infra" mapeada pro componentType "cloud"');
assert(ir.components.find((c) => c.label === 'Kafka').type === 'external', '[B-08] rótulo "mensageria" (fora do dicionário) cai no default "external"');
assert(ir.components.every((c) => Number.isInteger(c.row) && Number.isInteger(c.col)), '[B-09] todo componente tem row/col — obrigatório no schema quando layout.mode é grid');
const hub = ir.components.find((c) => c.type === 'backend');
assert(ir.connections.length === 5 && ir.connections.every((cn) => cn.from === hub.id), '[B-10] topologia hub-and-spoke: backend é o hub, 1 conexão por componente restante');
assert(ir.components.every((c) => Array.isArray(c.size) && c.size[0] > 0 && c.size[1] > 0), '[B-10b] todo componente recebe size explícito (renderer não tem auto-fit de caixa)');

const irNoStack = buildArchitectureIR(BRIEF_FALLBACK, { name: 'X' });
assert(irNoStack === null, '[B-11] brief sem seção STACK JUSTIFICADA -> null (degradação graciosa, mesmo padrão do infográfico)');

const irManyRows = buildArchitectureIR(
  BRIEF_WITH_STACK.replace(
    '| Kafka | mensageria | Fila de eventos (rotulo fora do dicionario conhecido) |',
    Array.from({ length: 10 }, (_, i) => `| Tech${i} | backend | dep ${i} |`).join('\n')
  ),
  { name: 'Muitos' }
);
assert(irManyRows.components.length === 12, '[B-12] mais de 12 linhas na tabela -> trunca em 12 (limite do SKILL.md do Archify)');

// Regressão real: um brief com nomes de tecnologia curtos (React, Express)
// nunca aciona a checagem de largura de label do renderer vendorizado
// (default 120px). Rodando um brief realista (LegalTech, achado nesta
// sessão) — "Java 21 + Spring Boot 3.4" (~25 caracteres) — o render
// FALHAVA (best-effort escondia o erro, mas o diagrama nunca aparecia).
// Fixture abaixo reproduz exatamente esses rótulos longos.
const BRIEF_LONG_LABELS = `# CLAUDE CODE BRIEF

## STACK JUSTIFICADA

| Tecnologia | Camada | Justificativa |
|---|---|---|
| Java 21 + Spring Boot 3.4 | backend | Ecossistema maduro para compliance |
| Next.js 14 + React 18 | frontend | SSR para SEO, dashboard |
| PostgreSQL 16 | dados | JSONB, particionamento |
| Redis 7 | dados | Sessoes, rate limiting |
| TSA RFC 3161 | seguranca | Carimbo de tempo ICP-Brasil |
| S3-compatible | infra | Objetos imutaveis WORM |
| RabbitMQ | infra | Fila de captura |
| Prometheus + Grafana | infra | Observabilidade |
`;
const irLongLabels = buildArchitectureIR(BRIEF_LONG_LABELS, { name: 'Prova Digital com Validade Juridica' });
assert(irLongLabels.components.every((c) => c.size[0] >= Math.ceil(c.label.length * 6.6) + 8),
  '[B-13] caixa dimensionada cobre o label mais longo — sem essa checagem, rótulos reais como "Java 21 + Spring Boot 3.4" quebravam o render');

console.log('\n[Suite C] renderArchitectureDiagram — best-effort, timeout, sem lixo em disco');

const rendererPath = path.join(__dirname, '..', 'vendor', 'archify', 'renderers', 'architecture', 'render-architecture.mjs');
const html = renderArchitectureDiagram(ir, { rendererPath });
assert(typeof html === 'string' && html.includes('<svg'), '[C-01] render real via processo filho produz HTML com <svg>');
assert(html.includes('Projeto Teste'), '[C-02] título do projeto aparece no HTML renderizado');
assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html), '[C-03] HTML vendorizado não carrega fonte externa (removida do template)');

assert(renderArchitectureDiagram(null) === null, '[C-04] IR nulo -> null sem tentar renderizar (evita spawn desnecessário)');

const htmlLongLabels = renderArchitectureDiagram(irLongLabels, { rendererPath });
assert(typeof htmlLongLabels === 'string' && htmlLongLabels.includes('<svg'),
  '[C-04b] render real do brief LegalTech (8 componentes, labels longos) produz HTML válido — regressão do bug real encontrado nesta sessão');
assert(htmlLongLabels.includes('Java 21 + Spring Boot 3.4'), '[C-04c] label completo (não truncado) aparece no SVG renderizado');

const brokenRendererPath = path.join(__dirname, 'this-renderer-does-not-exist.mjs');
assert(renderArchitectureDiagram(ir, { rendererPath: brokenRendererPath }) === null,
  '[C-05] renderer inexistente -> null, não lança (best-effort real, não só na teoria)');

assert(renderArchitectureDiagram(ir, { rendererPath, timeoutMs: 1 }) === null,
  '[C-06] timeout absurdamente curto (1ms) -> null, não trava nem lança');

console.log('\n[Suite D] appendProjectArchitectureDiagramFile — aditivo, nunca substitui, nunca derruba a entrega');

const filesWithStack = [
  { name: 'CLAUDE_CODE_BRIEF.md', content: BRIEF_WITH_STACK },
  { name: 'PROJETO_INFOGRAFICO.html', content: '<html>infografico existente, intocado</html>' },
];
const resultOk = appendProjectArchitectureDiagramFile(filesWithStack, { name: 'Projeto Teste' }, { rendererPath });
assert(resultOk.length === filesWithStack.length + 1, '[D-01] anexa exatamente 1 arquivo novo');
assert(resultOk.some((f) => f.name === 'PROJETO_DIAGRAMA.html'), '[D-02] arquivo novo se chama PROJETO_DIAGRAMA.html');
assert(resultOk.some((f) => f.name === 'PROJETO_INFOGRAFICO.html' && f.content.includes('intocado')), '[D-03] PROJETO_INFOGRAFICO.html permanece byte-a-byte igual — aditivo, não substitutivo');
assert(filesWithStack.length === 2, '[D-04] array de entrada não é mutado in-place');

const resultBrokenRenderer = appendProjectArchitectureDiagramFile(filesWithStack, { name: 'X' }, { rendererPath: brokenRendererPath });
assert(resultBrokenRenderer === filesWithStack, '[D-05] render falhando -> entrega segue sem o diagrama (mesma referência de array, sem cópia desnecessária)');

const filesFallback = [{ name: 'CLAUDE_CODE_BRIEF.md', content: BRIEF_FALLBACK }];
const resultFallback = appendProjectArchitectureDiagramFile(filesFallback, { name: 'Y' }, { rendererPath });
assert(resultFallback === filesFallback, '[D-06] brief sem stack -> inalterado');

const filesNoBrief = [{ name: 'docs/adr/0001-stack-decision.md', content: '# ADR' }];
const resultNoBrief = appendProjectArchitectureDiagramFile(filesNoBrief, { name: 'Z' }, { rendererPath });
assert(resultNoBrief === filesNoBrief, '[D-07] nenhum CLAUDE_CODE_BRIEF.md -> inalterado, não quebra');

console.log('\n[Suite E] buildArchitectureIRFromFiles — branch standard (sem brief, infere por caminho de arquivo)');

// Formato PROMPT1 (12 arquivos, backend/server.js) — caminhos exatos do prompt.
const FILES_PROMPT1 = [
  { name: 'src/index.js', content: 'x' },
  { name: 'src/config/env.js', content: 'x' },
  { name: 'src/routes/auth.js', content: 'x' },
  { name: 'src/middleware/auth.js', content: 'x' },
  { name: 'src/models/user.js', content: 'x' },
  { name: 'Dockerfile', content: 'x' },
  { name: '.env.example', content: 'x' },
  { name: 'public/index.html', content: 'x' },
  { name: 'public/js/app.js', content: 'x' },
  { name: 'README.md', content: 'x' },
  { name: 'docs/openapi.yaml', content: 'x' },
  { name: 'docs/SECURITY.md', content: 'x' },
];
const irPrompt1 = buildArchitectureIRFromFiles(FILES_PROMPT1, { name: 'App Prompt1' });
assert(irPrompt1 !== null, '[E-01] formato PROMPT1 (12 arquivos) produz IR não-nulo');
assert(irPrompt1.components.length === 4, '[E-02] 4 componentes: frontend/backend/security/infra (Dockerfile presente)');
assert(irPrompt1.components.some((c) => c.type === 'cloud' && c.label === 'Docker'), '[E-03] Dockerfile presente -> componente "cloud" (infra)');
assert(irPrompt1.components.every((c) => Array.isArray(c.size)), '[E-04] mesma finalização (grid/size/hub) do branch complex é reaplicada');

// Formato PROMPT2 (fallback, 6 arquivos) — sem Dockerfile, com package.json.
const FILES_PROMPT2 = [
  { name: 'package.json', content: 'x' },
  { name: 'src/index.js', content: 'x' },
  { name: 'src/routes/auth.js', content: 'x' },
  { name: 'src/middleware/auth.js', content: 'x' },
  { name: 'public/index.html', content: 'x' },
  { name: 'README.md', content: 'x' },
];
const irPrompt2 = buildArchitectureIRFromFiles(FILES_PROMPT2, { name: 'App Prompt2' });
assert(irPrompt2 !== null, '[E-05] formato PROMPT2 (fallback, 6 arquivos) produz IR não-nulo');
assert(irPrompt2.components.length === 3, '[E-06] 3 componentes: frontend/backend/security — sem Dockerfile, sem infra');
assert(!irPrompt2.components.some((c) => c.id === 'infra'), '[E-07] Dockerfile ausente -> nenhum componente infra (nunca inventa)');
assert(irPrompt2.components.filter((c) => c.id === 'backend').length === 1,
  '[E-08] package.json + src/index.js ambos presentes -> 1 único componente backend, não duplica caixa');

const irEmpty = buildArchitectureIRFromFiles([{ name: 'random-file.txt', content: 'x' }], { name: 'X' });
assert(irEmpty === null, '[E-09] nenhum caminho-marcador conhecido -> null (degradação graciosa)');

console.log('\n[Suite F] appendProjectArchitectureDiagramFileFromFiles — branch standard, aditivo, best-effort');

const resultStandard = appendProjectArchitectureDiagramFileFromFiles(FILES_PROMPT1, { name: 'App Prompt1' }, { rendererPath });
assert(resultStandard.length === FILES_PROMPT1.length + 1, '[F-01] anexa exatamente 1 arquivo novo');
assert(resultStandard.some((f) => f.name === 'PROJETO_DIAGRAMA.html'), '[F-02] arquivo novo se chama PROJETO_DIAGRAMA.html (mesmo nome do branch complex)');
const diagramStandard = resultStandard.find((f) => f.name === 'PROJETO_DIAGRAMA.html');
assert(diagramStandard.content.includes('<svg'), '[F-03] render real via processo filho produz HTML com <svg>');
assert(FILES_PROMPT1.length === 12, '[F-04] array de entrada não é mutado in-place');

const resultStandardNoMarkers = appendProjectArchitectureDiagramFileFromFiles(
  [{ name: 'random-file.txt', content: 'x' }], { name: 'X' }, { rendererPath }
);
assert(resultStandardNoMarkers.length === 1 && resultStandardNoMarkers[0].name === 'random-file.txt',
  '[F-05] nenhum marcador conhecido -> inalterado, não quebra');

const resultStandardBrokenRenderer = appendProjectArchitectureDiagramFileFromFiles(
  FILES_PROMPT1, { name: 'X' }, { rendererPath: brokenRendererPath }
);
assert(resultStandardBrokenRenderer === FILES_PROMPT1, '[F-06] render falhando -> entrega segue sem o diagrama (best-effort real)');

console.log(`\nproject-architecture-diagram: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
