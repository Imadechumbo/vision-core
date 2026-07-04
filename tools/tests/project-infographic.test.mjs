#!/usr/bin/env node
/**
 * project-infographic — unit test (100% determinístico, zero tokens)
 *
 * 3 fixtures: (A) brief real (LegalTech, colado pelo usuário), (B) brief
 * sintético de um segundo domínio (fintech) pra provar que o parser
 * generaliza além de uma única amostra real, (C) brief no formato fallback
 * "## Projeto" pra confirmar degradação graciosa (retorna null).
 */

import {
  generateProjectInfographic,
  splitSections,
  parseStackTable,
  parseModules,
  parseRiskBullet,
  isRiskCritical,
  categorizeRisk,
} from '../project-infographic.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

// ---------------------------------------------------------------------------
// FIXTURE A — brief real (Prova Digital com Validade Jurídica), colado
// verbatim pelo usuário nesta sessão.
// ---------------------------------------------------------------------------
const BRIEF_LEGAL = `# CLAUDE CODE BRIEF

## DOMINIO E COMPLIANCE

**Dominio:** Prova Digital com Validade Jurídica (LegalTech / Prova Eletronica)

**Compliance Obrigatorio:**
- **LGPD (Lei 13.709/2018):** Tratamento de dados pessoais de titulares (usuarios) e de terceiros mencionados em provas. Exige consentimento explicito do titular para coleta, finalidade determinada, anonimizacao quando possivel, DPO, registro de operacoes. **Atencao:** para terceiros mencionados em provas (que nao sao o titular da conta e nunca consentiram), o consentimento do titular NAO e base legal valida — exige base legal distinta (Art. 7º, VI ou IX), ver R6 abaixo. Esta e a lacuna juridica mais critica do dominio.
- **ICP-Brasil (Infraestrutura de Chaves Publicas Brasileira):** Assinatura digital dos relatorios de prova com certificado A1 ou A3 (fisico ou via provedor de assinatura em nuvem credenciado) para garantir integridade, autoria e nao-repudio. O relatorio deve ser um PDF/A-2 assinado digitalmente, com carimbo de tempo RFC 3161 emitido por ACT credenciada (NTP isolado nao basta — ver R1).
- **Marco Civil da Internet (Lei 12.965/2014):** Neutralidade de rede, guarda de registros de acesso por 6 meses, inviolabilidade de comunicacoes.
- **Codigo de Processo Civil (Art. 369 e 411):** Provas digitais sao admitidas; a cadeia de custodia deve ser documentada e auditavel.
- **Resolucao CNJ 350/2020:** Padroes de autenticacao de documentos eletronicos no Judiciario.

**Riscos Especificos:**
- **R1 - Quebra de Cadeia de Custodia:** Se o hash do conteudo original nao for preservado ou se houver alteracao no armazenamento, a prova perde validade. Mitigacao: hash SHA-256 do conteudo bruto + carimbo de tempo RFC 3161 emitido por uma Autoridade de Carimbo do Tempo (ACT) credenciada ICP-Brasil + assinatura digital no momento da captura. Atencao: sincronizacao NTP do servidor NAO tem valor probatorio por si so.
- **R2 - Falsificacao de Evidencia:** Usuario pode tentar adulterar screenshot ou HTML antes do registro. Mitigacao: captura server-side headless (Puppeteer/Playwright) com registro de metadados.
- **R3 - Vazamento de Dados Sensiveis:** Provas podem conter dados pessoais de terceiros. Mitigacao: criptografia AES-256 em repouso, TLS 1.3 em transito, politica de retencao. Ver R6.
- **R4 - Impugnacao Judicial:** Nota sobre assinatura digital: token A3 fisico via PKCS#11 preso a um servidor e um ponto unico de falha operacional. Recomenda-se contratar um provedor de assinatura em nuvem credenciado ICP-Brasil (ex.: Soluti, Safeweb, BirdID) como caminho primario, mantendo o token A3 local apenas como fallback.
- **R5 - Indisponibilidade do Servico:** Mitigacao: arquitetura multi-AZ, backup diario, RTO < 1h, RPO < 15min.
- **R6 - Base Legal Insuficiente para Dados de Terceiros:** ATENÇÃO: Usar "consentimento explicito" como base legal unica para todo o sistema e juridicamente incorreto para terceiros. Mitigacao: tratar dados de terceiros sob base legal distinta — Art. 7º, VI ou IX da LGPD. Este e o ponto mais frágil do dominio inteiro e precisa de parecer juridico formal antes de producao.
- **R7 - Conflito com Termos de Uso de Plataformas:** A captura headless com cookies/credenciais de login em redes sociais tipicamente viola os Termos de Uso dessas plataformas. Mitigacao: aviso explicito e aceite registrado antes de qualquer captura autenticada.
- **R8 - Custo de Licenciamento do iText 7 (AGPL):** iText 7 e licenciado sob AGPL v3. Mitigacao: orcar a licenca comercial do iText OU avaliar migracao para Apache PDFBox.
- **R9 - Escalabilidade do Audit Log (Hash Chain):** Mitigacao: particionamento nativo do PostgreSQL por mes via pg_partman.

## STACK JUSTIFICADA

| Tecnologia | Camada | Justificativa |
|---|---|---|
| Java 21 + Spring Boot 3.4 | backend | Ecossistema maduro para compliance, suporte nativo a PKCS#11 para ICP-Brasil |
| Next.js 14 + React 18 + TypeScript | frontend | SSR para SEO, ISR para precos, CSR para dashboard |
| PostgreSQL 16 + pg_cron + pg_partman | dados | Suporte JSONB, particionamento nativo obrigatorio na tabela audit_log |
| Redis 7 (ElastiCache) | dados | Sessoes, rate limiting, fila de captura |
| Playwright (Java binding) | backend | Captura headless com suporte a autenticacao |
| TSA RFC 3161 (ICP-Brasil) | seguranca | Valor probatorio real de data/hora perante pericia judicial |
| PKCS#11 (A3) + Provedor de Assinatura em Nuvem ICP-Brasil | seguranca | Assinatura digital automatizada em escala |
| iText 7 (PDF/A-2) | backend | Suporte nativo a PDF/A-2 e assinatura PAdES |
| S3-compatible (MinIO ou AWS S3) | infra | Objetos imutaveis (WORM), versionamento |
| RabbitMQ | infra | Fila de captura com prioridade, DLQ |
| Prometheus + Grafana + Sentry | infra | Alertas de quebra de cadeia de custodia |
| GitHub Actions + Docker + Kubernetes (EKS) | infra | Imutabilidade de imagens, rollback automatico |

## ARQUITETURA DE COMPONENTES
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                              │
└──────────────────────────────────┬──────────────────────────────────────────┘

## MODULOS A IMPLEMENTAR

### M1 - Autenticacao e Cadastro
**Descricao:** Registro de usuario, login com JWT (RS256), MFA via TOTP, consentimento LGPD explicito.
**Dependencias:** PostgreSQL, Redis, Spring Security + Spring Mail.
**Criterio de Done:** Usuario consegue se registrar, logar, configurar MFA, dar consentimento LGPD.

### M2 - Captura de Prova
**Descricao:** Recebe URL e tipo de conteudo. Executa Playwright headless para capturar screenshot, HTML, metadados. Calcula hash SHA-256.
**Dependencias:** Playwright Java, RabbitMQ, S3 (MinIO), PostgreSQL, Redis.
**Criterio de Done:** Captura de pagina estatica retorna screenshot + HTML + metadados em < 10s.

### M3 - Geracao de Relatorio
**Descricao:** Consome fila do RabbitMQ, gera PDF/A-2 com screenshot, hash, QR Code, assinatura ICP-Brasil, carimbo RFC 3161.
**Dependencias:** iText 7, cliente TSA RFC 3161, RabbitMQ, S3, PostgreSQL.
**Criterio de Done:** PDF gerado em < 30s, assinado digitalmente valido.

### M4 - Dashboard do Usuario
**Descricao:** Lista de capturas, visualizacao de PDF inline, download, compartilhamento, historico de pagamentos.
**Dependencias:** Next.js 14, React 18, TailwindCSS, PDF.js, Chart.js.
**Criterio de Done:** Lista de capturas paginada com filtros.

### M5 - Pagina Institucional
**Descricao:** Home, Validade Juridica, FAQ, Precos, Blog, Contato.
**Dependencias:** Next.js 14, TailwindCSS, MDX.
**Criterio de Done:** Home carrega em < 2s.

### M6 - Pagamento e Planos
**Descricao:** Integracao Stripe/Asaas. Planos Gratuito/Profissional/Enterprise.
**Dependencias:** Stripe SDK, Asaas API, PostgreSQL, RabbitMQ.
**Criterio de Done:** Usuario pode assinar plano com cartao.

### M7 - Auditoria e Cadeia de Custodia
**Descricao:** Registro imutavel de operacoes com hash chain.
**Dependencias:** PostgreSQL (particionada via pg_partman), RabbitMQ.
**Criterio de Done:** Cada operacao registrada em < 1s.

### M8 - Verificacao de Prova
**Descricao:** Pagina publica de verificacao por hash.
**Dependencias:** Next.js (SSR), S3, PostgreSQL.
**Criterio de Done:** Pagina carrega em < 3s.

## SEQUENCIA DE COMANDOS CLAUDE CODE
[8 prompts, um por módulo, formato: claude "Implemente o modulo X..."]

## SPECS DE SEGURANCA
[OWASP mapeado, LGPD checklist, Semgrep rules]

## CRITERIOS DE PASS GOLD
[gates especificos]
`;

// ---------------------------------------------------------------------------
// FIXTURE B — segundo domínio (fintech), sintética, seguindo à risca o
// formato apertado na Fase A2. Prova que o parser generaliza além da única
// amostra real disponível — stack, riscos e módulos completamente
// diferentes (Python em vez de Java, 3 módulos em vez de 8).
// ---------------------------------------------------------------------------
const BRIEF_FINTECH = `# CLAUDE CODE BRIEF

## DOMINIO E COMPLIANCE

**Dominio:** Marketplace de Pagamentos Recorrentes (Fintech / Assinaturas)

**Compliance Obrigatorio:**
- **PCI-DSS (nivel 1):** Tokenizacao de cartao via gateway certificado, nunca armazenar PAN em texto claro.
- **LGPD (Lei 13.709/2018):** Dados financeiros de titulares tratados sob base legal de execucao de contrato.
- **Resolucao BACEN 4.658:** Politica de seguranca cibernetica para instituicoes de pagamento.

**Riscos Especificos:**
- **R1 - Fraude em Recorrencia:** Cartao cancelado apos primeira cobranca, tentativas de retry mascaram churn real. Mitigacao: webhook do gateway + reconciliacao diaria.
- **R2 - Vazamento de Token de Cartao:** SPOF caso a chave de criptografia do vault de tokens seja comprometida. Mitigacao: HSM dedicado, rotacao de chave trimestral.
- **R3 - Disputa e Chargeback:** Sem evidencia de consentimento de cobranca recorrente, o lojista perde a disputa. Mitigacao: hash do aceite de termos + carimbo de tempo no momento da assinatura do plano.

## STACK JUSTIFICADA

| Tecnologia | Camada | Justificativa |
|---|---|---|
| Python 3.12 + FastAPI | backend | Tipagem estatica leve, ecossistema maduro para integracao com gateways de pagamento |
| PostgreSQL 16 | dados | Suporte a transacoes ACID para reconciliacao financeira |
| Stripe SDK | backend | Tokenizacao PCI-DSS sem custodiar PAN |

## ARQUITETURA DE COMPONENTES
\`\`\`
[CLIENT] -> [API GATEWAY] -> [FASTAPI BACKEND] -> [POSTGRESQL]
\`\`\`

## MODULOS A IMPLEMENTAR

### M1 - Cadastro de Lojista
**Descricao:** Onboarding do lojista com validacao de CNPJ e conta bancaria.
**Dependencias:** PostgreSQL, Stripe Connect.
**Criterio de Done:** Lojista cadastrado consegue criar um plano de assinatura.

### M2 - Cobranca Recorrente
**Descricao:** Motor de cobranca mensal com retry automatico em caso de falha.
**Dependencias:** Stripe SDK, PostgreSQL, fila de jobs.
**Criterio de Done:** Cobranca recorrente executa automaticamente na data do ciclo.

### M3 - Painel de Reconciliacao
**Descricao:** Dashboard com status de cada cobranca e disputas abertas.
**Dependencias:** FastAPI, PostgreSQL.
**Criterio de Done:** Lojista visualiza status de todas as cobrancas do mes.

## SEQUENCIA DE COMANDOS CLAUDE CODE
[3 prompts]

## SPECS DE SEGURANCA
[PCI-DSS checklist]

## CRITERIOS DE PASS GOLD
[gates especificos]
`;

// ---------------------------------------------------------------------------
// FIXTURE C — caminho fallback determinístico ("## Projeto"), documentado
// em server.js — dispara quando o LLM falha em usar ===FILE:=== ou a
// chamada erra/dá timeout. Estruturalmente diferente, sem nenhuma das
// seções ricas (DOMINIO E COMPLIANCE / STACK JUSTIFICADA / MODULOS A
// IMPLEMENTAR).
// ---------------------------------------------------------------------------
const BRIEF_FALLBACK = `# CLAUDE CODE BRIEF

## Projeto
Sistema de gestao de prontuarios medicos com assinatura digital.

## Contexto Acumulado
(sem contexto dos steps — rodar Auto-Pilot primeiro)

## Stack (step1)
(executar step 1 para analise de dominio)

## Blueprint (step2)
(executar step 2 para blueprint tecnico)

## Proximos Passos
Execute o Auto-Pilot completo antes de gerar o brief final.
`;

console.log('\n[Suite A] generateProjectInfographic — fixture real (LegalTech)');
const htmlLegal = generateProjectInfographic(BRIEF_LEGAL, { name: 'Prova Digital com Validade Juridica' });

assert(typeof htmlLegal === 'string' && htmlLegal.length > 0, '[A-01] retorna HTML não-vazio pro brief real');
assert(htmlLegal.includes('Prova Digital com Validade Jurídica (LegalTech / Prova Eletronica)'),
  '[A-02] subtítulo do hero contém a sentença de **Dominio:** extraída');

// Compliance — 5 chips, todos os termos em negrito
['LGPD (Lei 13.709/2018)', 'ICP-Brasil (Infraestrutura de Chaves Publicas Brasileira)',
 'Marco Civil da Internet (Lei 12.965/2014)', 'Codigo de Processo Civil (Art. 369 e 411)',
 'Resolucao CNJ 350/2020'].forEach((term) => {
  assert(htmlLegal.includes(term), `[A-03] chip de compliance presente: "${term}"`);
});

// Stack — 12 tecnologias, todas presentes
['Java 21 + Spring Boot 3.4', 'Next.js 14 + React 18 + TypeScript', 'PostgreSQL 16 + pg_cron + pg_partman',
 'Redis 7 (ElastiCache)', 'Playwright (Java binding)', 'TSA RFC 3161 (ICP-Brasil)',
 'PKCS#11 (A3) + Provedor de Assinatura em Nuvem ICP-Brasil', 'iText 7 (PDF/A-2)',
 'S3-compatible (MinIO ou AWS S3)', 'RabbitMQ', 'Prometheus + Grafana + Sentry',
 'GitHub Actions + Docker + Kubernetes (EKS)'].forEach((tech) => {
  assert(htmlLegal.includes(tech), `[A-04] chip de stack presente: "${tech}"`);
});

// Teste negativo explícito — nenhuma tecnologia fora do brief real
assert(!htmlLegal.includes('Python'), '[A-05] "Python" NAO aparece (brief real usa só Java) — teste negativo');
assert(!htmlLegal.includes('FastAPI'), '[A-05b] "FastAPI" NAO aparece (não está no brief real)');
assert(!htmlLegal.includes('SaaS Fullstack') && !htmlLegal.includes('CLI Tool'),
  '[A-06] catálogo universal (tipos de projeto) NAO vaza pro infográfico do projeto');

// Módulos — 8, em ordem, com subtítulo truncado a 5 palavras
assert(htmlLegal.includes('>01<') && htmlLegal.includes('Autenticacao e Cadastro'),
  '[A-07] M1 presente com número 01 e nome correto');
assert(htmlLegal.includes('>08<') && htmlLegal.includes('Verificacao de Prova'),
  '[A-08] M8 presente com número 08 e nome correto');
assert(htmlLegal.includes('Registro de usuario, login com…'),
  '[A-09] subtítulo do M1 truncado a 5 palavras + reticências');

// Riscos críticos — só R1 e R6 (normalizado), nunca R4 (SPOF em prosa, sem marcador)
assert(htmlLegal.includes('Riscos críticos destacados'), '[A-10] seção de legenda presente (há riscos críticos)');
assert(/R1\s*-\s*Quebra de Cadeia de Custodia/.test(htmlLegal), '[A-11] R1 aparece na legenda (marcador "Atencao:" normalizado)');
assert(/R6\s*-\s*Base Legal Insuficiente/.test(htmlLegal), '[A-12] R6 aparece na legenda (marcador "ATENÇÃO:"/"ponto mais frágil")');
const legendSectionMatch = htmlLegal.match(/Riscos críticos destacados[\s\S]*?<\/section>/);
assert(legendSectionMatch && !/R4\s*-\s*Impugnacao Judicial/.test(legendSectionMatch[0]),
  '[A-13] R4 NAO aparece na legenda (SPOF descrito em prosa, sem marcador explícito — não inventa destaque)');

// Categorização de risco — Dados pessoais / Cadeia de custódia / Operação e negócio
assert(htmlLegal.includes('Dados pessoais') && htmlLegal.includes('Cadeia de custódia/integridade')
  && htmlLegal.includes('Operação e negócio'), '[A-14] as 3 categorias de risco presentes na matriz');

// Arquitetura — ASCII literal preservado dentro de <pre>
assert(htmlLegal.includes('<pre class="ascii-arch">') && htmlLegal.includes('CLIENT (Browser)'),
  '[A-15] diagrama ASCII renderizado literalmente dentro de <pre>');

console.log('\n[Suite B] generateProjectInfographic — segundo domínio (fintech, sintética)');
const htmlFintech = generateProjectInfographic(BRIEF_FINTECH, { name: 'Marketplace de Pagamentos Recorrentes' });

assert(typeof htmlFintech === 'string' && htmlFintech.length > 0, '[B-01] retorna HTML não-vazio pro segundo domínio');
assert(htmlFintech.includes('Python 3.12 + FastAPI'), '[B-02] stack do fintech presente (Python)');
assert(!htmlFintech.includes('Java 21'), '[B-03] "Java 21" NAO aparece (não está neste brief) — teste negativo cruzado');
assert(!htmlFintech.includes('Playwright'), '[B-04] "Playwright" (do brief LEGAL) NAO vaza pro infográfico do FINTECH — sem estado entre chamadas');
assert(htmlFintech.includes('Cadastro de Lojista') && htmlFintech.includes('Painel de Reconciliacao'),
  '[B-05] os 3 módulos do fintech presentes (M1 e M3)');
// R2 do fintech usa a sigla "SPOF" literalmente -> deve aparecer na legenda
assert(/Riscos críticos destacados[\s\S]*R2\s*-\s*Vazamento de Token/.test(htmlFintech),
  '[B-06] R2 (usa "SPOF" literal) aparece na legenda do fintech');

console.log('\n[Suite C] generateProjectInfographic — fallback "## Projeto" → degradação graciosa');
const htmlFallback = generateProjectInfographic(BRIEF_FALLBACK, { name: 'Prontuarios Medicos' });
assert(htmlFallback === null, '[C-01] retorna null pro brief fallback (sem seções ricas) — não inventa infográfico vazio');

console.log('\n[Suite D] helpers — parsing isolado (unidade)');
const sections = splitSections(BRIEF_LEGAL);
assert(Object.keys(sections).includes('dominio e compliance'), '[D-01] splitSections reconhece header com acento normalizado');
assert(!sections['modulos a implementar'].includes('## STACK'), '[D-02] seção de módulos não vaza conteúdo de outra seção');

const stackRows = parseStackTable(sections['stack justificada']);
assert(stackRows.length === 12, '[D-03] parseStackTable extrai as 12 linhas de tecnologia (não conta header/separador)');

const modules = parseModules(sections['modulos a implementar']);
assert(modules.length === 8 && modules[0].number === 1 && modules[7].number === 8,
  '[D-04] parseModules extrai 8 módulos numerados 1..8 em ordem');

const r6 = parseRiskBullet('**R6 - Base Legal Insuficiente para Dados de Terceiros:** ATENÇÃO: texto');
assert(r6 && r6.number === 6 && r6.title === 'Base Legal Insuficiente para Dados de Terceiros',
  '[D-05] parseRiskBullet extrai número e título corretamente');

assert(isRiskCritical('Atencao: sem acento') === true, '[D-06] isRiskCritical normaliza acento antes de comparar (Atencao: sem acento)');
assert(isRiskCritical('ATENÇÃO: com acento') === true, '[D-07] isRiskCritical reconhece a forma com acento também');
assert(isRiskCritical('nada de especial aqui') === false, '[D-08] isRiskCritical não dispara sem marcador');

assert(categorizeRisk('problema de hash e dados de terceiros') === 'Dados pessoais',
  '[D-09] categorizeRisk desempata a favor de "Dados pessoais" quando ambas as categorias batem');

console.log(`\nproject-infographic: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
