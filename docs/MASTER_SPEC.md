# MASTER SPEC — Vision Core

**Documento raiz. Todo agente (Claude Code, Codex, OpenCode, Omnigent ou outro) começa aqui.**

> Versão: 1.0.0 · Criado: 2026-07-09 · Autor: Claude Code (Sonnet 5), tarefa de consolidação arquitetural
> Este arquivo não descreve funcionalidade — só ordena a leitura. Nenhuma linha de código foi alterada para produzir este documento e os 9 que ele referencia.

---

## Por que este documento existe

O Vision Core é construído por múltiplos agentes de IA revezando entre si (cada um até seu próprio limite de uso/contexto), sem gate humano por etapa — o usuário só valida no final. Isso só funciona se todo agente partir da mesma base factual. Antes desta consolidação, a "fonte da verdade" estava espalhada de forma inconsistente entre `CLAUDE.md` (o estado real, dia-a-dia, do produto em produção), `docs/CURRENT_HANDOFF.md` (o snapshot da última sessão) e dezenas de specs avulsas — algumas descrevendo o produto real, outras descrevendo um framework de governança interna diferente, com sobreposição de nomes (`Hermes`, `PASS GOLD`, `Software Factory` significavam coisas diferentes em arquivos diferentes). Ver `VISION_CORE_ARCHITECTURE.md` seção "Duas Camadas" para o mapa completo dessa distinção.

Estes 10 documentos (este + os 9 abaixo) são agora a **única fonte oficial de arquitetura e intenção de produto**. `CLAUDE.md` e `docs/CURRENT_HANDOFF.md` continuam existindo e continuam sendo lidos — mas para **estado operacional dia-a-dia** (o que a última sessão fez, o que está pendente agora), não para **arquitetura**. Se um documento de arquitetura e o `CLAUDE.md` divergirem sobre um fato de produto, o `CLAUDE.md`/`CURRENT_HANDOFF.md` vence para o *estado atual* (são atualizados a cada sessão); estes 10 documentos vencem para *intenção arquitetural e vocabulário* (não mudam a cada sessão, só quando há decisão de produto real).

---

## Ordem de leitura obrigatória

Nenhum agente deve alterar código antes de completar esta ordem:

```
1.  MASTER_SPEC.md                        ← você está aqui
2.  VISION_CORE_ARCHITECTURE.md           ← visão geral, as "Duas Camadas", pilares, fluxo
3.  VISION_CORE_NEXT_FRONTEND_SPEC.md     ← frontend ativo (única frente de UI em desenvolvimento)
4.  VISION_CORE_BACKEND_SPEC.md           ← backend Node.js + go-core safe core
5.  VC_SECRET_GUARD_RUST_SPEC.md          ← 4ª peça do stack (Rust, local, spec+protótipo)
6.  ATOMIC_CORE_SPEC.md                   ← identidade visual (widget, não motor de execução)
7.  SOFTWARE_FACTORY_SPEC.md              ← feature de produto (geração de projetos)
8.  UI_COMPONENT_LIBRARY.md               ← catálogo de componentes visuais do Next
9.  API_CONTRACT.md                       ← contrato de endpoints reais
10. ROADMAP.md                            ← fases futuras, o que é ideia vs. compromisso

Depois leia:
11. CLAUDE.md                             ← estado operacional vivo, protocolo de revezamento
12. docs/CURRENT_HANDOFF.md               ← o que a última sessão estava fazendo agora mesmo

Só então altere código.
```

**Por que essa ordem:** os 10 primeiros dão o mapa estável (o que o sistema É); os 2 últimos dão o estado do momento (o que está acontecendo AGORA). Ler na ordem inversa faz um agente confundir uma decisão de uma sessão específica com uma regra arquitetural permanente, ou vice-versa.

---

## Escopo desta consolidação

**Dentro do escopo:** os 9 arquivos listados abaixo, revisados/reescritos para eliminar contradição, marcar claramente o que é `EXISTENTE`/`EM IMPLEMENTAÇÃO`/`PLANEJADO`/`IDEIA FUTURA`, e referenciar-se cruzadamente.

**Fora do escopo (não tocado por esta tarefa):** nenhum código-fonte, nenhum frontend, nenhum backend, nenhum deploy, nenhuma produção. `CLAUDE.md` e `docs/CURRENT_HANDOFF.md` recebem só uma nota curta apontando para esta consolidação — o conteúdo operacional deles não foi reescrito. Os demais ~80 arquivos em `docs/` (specs de governança interna, recibos de evidência de stress-test, checklists datados) não foram reescritos — são referenciados onde relevante, nunca duplicados.

---

## Índice dos 9 documentos

| # | Documento | O que cobre | Estado predominante |
|---|---|---|---|
| 1 | [`VISION_CORE_ARCHITECTURE.md`](./VISION_CORE_ARCHITECTURE.md) | Missão, pilares, as "Duas Camadas" (produto vs. governança interna), fluxo operacional, segurança, deploy, boas práticas | EXISTENTE (produto) + EXISTENTE não-integrado (governança) |
| 2 | [`VISION_CORE_NEXT_FRONTEND_SPEC.md`](./VISION_CORE_NEXT_FRONTEND_SPEC.md) | Interface operacional paralela (chat/app, não landing/dashboard) | EM IMPLEMENTAÇÃO ativa |
| 3 | [`VISION_CORE_BACKEND_SPEC.md`](./VISION_CORE_BACKEND_SPEC.md) | `backend/server.js` (Node.js/Express) + `go-core` (Go safe core) + Worker gateway | EXISTENTE |
| 4 | [`VC_SECRET_GUARD_RUST_SPEC.md`](./VC_SECRET_GUARD_RUST_SPEC.md) | Núcleo local de detecção de segredos (Rust) | EM IMPLEMENTAÇÃO (Fase 1.5/6 fechada) |
| 5 | [`ATOMIC_CORE_SPEC.md`](./ATOMIC_CORE_SPEC.md) | Widget de identidade visual (SVG/CSS, agentes orbitando) | EXISTENTE |
| 6 | [`SOFTWARE_FACTORY_SPEC.md`](./SOFTWARE_FACTORY_SPEC.md) | Feature de geração de projetos (Auto-Pilot/Modo Avançado) | EXISTENTE (simulação) |
| 7 | [`UI_COMPONENT_LIBRARY.md`](./UI_COMPONENT_LIBRARY.md) | Catálogo de componentes visuais reutilizáveis do Next | EXISTENTE (documentação de código já escrito) |
| 8 | [`API_CONTRACT.md`](./API_CONTRACT.md) | Contrato de endpoints reais do backend | EXISTENTE |
| 9 | [`ROADMAP.md`](./ROADMAP.md) | Fases futuras por prioridade/risco/dependência | PLANEJADO / IDEIA FUTURA |

---

## Convenção de estado (obrigatória em todo documento desta série)

| Marca | Significado |
|---|---|
| **EXISTENTE** | Código real, rodando, verificado por leitura direta do arquivo-fonte nesta consolidação (não por memória de sessão anterior). |
| **EM IMPLEMENTAÇÃO** | Parte existe e roda, parte está sendo construída agora — fronteira exata declarada no texto. |
| **PLANEJADO** | Decisão de produto tomada, spec escrita, zero ou quase zero código. Tem número de fase/prioridade. |
| **IDEIA FUTURA** | Registrado para não perder a ideia, sem compromisso de quando ou se será feito. |

Nenhum documento desta série usa essas quatro palavras para nada além de descrever o estado real de uma funcionalidade — nunca como floreio.

---

## Regras que valem para toda a série de 10 documentos

1. Nenhum documento pode contradizer outro. Onde dois arquivos pré-existentes descreviam a mesma palavra (`Hermes`, `PASS GOLD`, `Software Factory`) com significados diferentes, a série usa qualificadores explícitos (`Hermes (produto)` vs. `Hermes (metodologia)`) — ver `VISION_CORE_ARCHITECTURE.md`.
2. Nenhum documento inventa um endpoint, arquivo ou comportamento que não foi confirmado por leitura direta do código-fonte ou de uma spec já existente e citada.
3. Toda alteração real de arquitetura (não esta consolidação, uma futura) atualiza o(s) documento(s) relevante(s) desta série **e** registra em `docs/CURRENT_HANDOFF.md` que a arquitetura mudou — os dois não podem divergir por mais de uma sessão.
4. Gates de segurança (`AGENT_APPLY_ENABLED`, `SESSION_SECRET`, etc.) são de propriedade do `CLAUDE.md`/`CURRENT_HANDOFF.md` (estado operacional) — esta série de documentos os descreve, mas não é onde a aprovação humana para mudá-los fica registrada.

---

## Controle de versão

| Versão | Data | Mudança |
|---|---|---|
| 1.0.0 | 2026-07-09 | Criação inicial da série de 10 documentos, consolidando ~90 arquivos pré-existentes em `docs/` + `CLAUDE.md` + `README.md` numa arquitetura única e sem contradição. |
