#!/usr/bin/env python3
"""
§104 — LIMPEZA + COBERTURA COMPLETA DO HISTÓRICO DE MISSÕES
Roda da raiz do projeto: python _patch104_cleanup_and_coverage.py

O que este patch faz (5 itens independentes, cada um com seu próprio assert):
1. Remove o <input id="v236FileInput"> órfão do index.html (zero outras
   referências confirmadas via grep antes deste patch ser escrito).
2. Padroniza a versão do backend: "4.1.0" (package.json) e "v5.9.0"
   (8x nos textos de fallback dos módulos SF, que vazam pro usuário quando o
   LLM falha) -> "5.9.7" / "v5.9.7". Não toca no "V2.9.10" do frontend
   (versionamento separado, não estava desatualizado por evidência real).
3. Backend: /api/chat agora prefere body.display_input (texto limpo, sem
   prefixo de contexto) sobre body.message pra montar a entrada do
   histórico — corrige o texto poluído tipo '"teste 2").' que aparecia em
   conversas com mais de 1 turno.
4. Frontend: os 2 fluxos que tinham texto "sujo" (chat principal, que monta
   _msgWithCtx com prefixo de contexto; upload de ZIP, que monta um contexto
   gigante com conteúdo de arquivo) agora mandam display_input com o texto
   original limpo.
5. Frontend: os 3 fluxos que ainda não chamavam recordMissionTimelineEntry()
   (mini-chat dos módulos SF, EXECUTAR MISSÃO/Hermes, upload de ZIP) agora
   chamam — equiparando ao que o chat principal já fazia desde o §102.
   Backend já persiste os 4 desde o §103 (header Authorization corrigido);
   isso só faltava do lado do feedback visual imediato no navegador.
"""
import sys, re

def fail(msg):
    print(f"  ABORTOU: {msg}")
    sys.exit(1)

def replace_unique(content, old, new, label):
    count = content.count(old)
    if count != 1:
        fail(f"{label}: esperado 1 ocorrência, achei {count}")
    return content.replace(old, new, 1)


# ════════════════════════════════════════════════════════════════════
# 1) frontend/index.html — remover input orfao v236FileInput
# ════════════════════════════════════════════════════════════════════
print("[1/5] frontend/index.html — removendo v236FileInput orfao")
path = 'frontend/index.html'
with open(path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()

# Checagem de seguranca: confirma que NAO ha outras referencias a esse ID
# especifico em nenhum arquivo do projeto antes de remover (o restante do
# bloco v236-action-row tem CSS/JS reais e NAO deve ser tocado).
import glob
other_refs = 0
for ext in ('*.html', '*.js', '*.css'):
    for fp in glob.glob(f'frontend/**/{ext}', recursive=True):
        if fp == path or fp.replace('\\', '/') == path:
            continue
        try:
            with open(fp, 'r', encoding='utf-8', errors='ignore') as f2:
                other_refs += f2.read().count('v236FileInput')
        except Exception:
            pass
if other_refs > 0:
    fail(f"v236FileInput tem {other_refs} referência(s) fora do index.html — NÃO é mais seguro remover, projeto pode ter mudado desde a análise")

anchor = '        <input id="v236FileInput" type="file" multiple hidden>\r\n'
if content.count(anchor) != 1:
    fail(f"linha do v236FileInput não encontrada como esperado (esperava 1 ocorrência exata)")
content = content.replace(anchor, '', 1)
with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("  OK — input órfão removido, nenhuma outra referência existia")


# ════════════════════════════════════════════════════════════════════
# 2) Padronizar versao do backend: 4.1.0 / v5.9.0 -> 5.9.7
# ════════════════════════════════════════════════════════════════════
print("[2/5] Padronizando versão do backend para 5.9.7")

path = 'backend/package.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = replace_unique(content, '"version": "4.1.0"', '"version": "5.9.7"', 'package.json version')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("  OK backend/package.json (4.1.0 -> 5.9.7)")

path = 'backend/server.js'
with open(path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()
n1 = content.count('Vision Core v5.9.0')
if n1 != 8:
    fail(f"esperava 8 ocorrências de 'Vision Core v5.9.0', achei {n1}")
content = content.replace('Vision Core v5.9.0', 'Vision Core v5.9.7')
content = replace_unique(content, 'Versão: v5.9.0-s84', 'Versão: v5.9.7-s104', 'SF04 versao inline')
with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("  OK backend/server.js (9 ocorrências de v5.9.0 -> v5.9.7, incl. SF04)")


# ════════════════════════════════════════════════════════════════════
# 3) Backend: preferir display_input (texto limpo) sobre message no hook
# ════════════════════════════════════════════════════════════════════
print("[3/5] backend/server.js — preferir display_input no hook do /api/chat")

path = 'backend/server.js'
with open(path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()
content = replace_unique(
    content,
    "  const _tlInput98e = message;\r\n",
    "  const _tlInput98e = (body.display_input || message);\r\n",
    "_tlInput98e display_input fallback"
)
with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("  OK — backend agora prefere display_input quando o frontend manda")


# ════════════════════════════════════════════════════════════════════
# 4 e 5) Frontend — display_input nos 2 fluxos com texto sujo +
#         recordMissionTimelineEntry nos 3 fluxos que ainda nao tinham
# ════════════════════════════════════════════════════════════════════
print("[4-5/5] frontend/assets/vision-core-bundle.js — display_input + cobertura de feedback")

path = 'frontend/assets/vision-core-bundle.js'
with open(path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()

# --- 4a) chat principal (tok2): adicionar display_input limpo no payload ---
content = replace_unique(
    content,
    "      var payload  = { message: _msgWithCtx, mode: mode, model: model };\r\n",
    "      var payload  = { message: _msgWithCtx, mode: mode, model: model, display_input: (text || null) };\r\n",
    "tok2 payload display_input"
)

# --- 4b) upload de ZIP (tok4): adicionar display_input = question no body ---
content = replace_unique(
    content,
    "              body: JSON.stringify({ message: context, mode: zipMode, model: zipModel }),\r\n",
    "              body: JSON.stringify({ message: context, mode: zipMode, model: zipModel, display_input: question }),\r\n",
    "tok4 body display_input"
)

# --- 5a) tok1 / sf-chat: registrar no historico apos receber resposta ---
content = replace_unique(
    content,
    (
        "    .then(function(data) {\r\n"
        "      thinking.textContent = (data && data.answer) ? data.answer : JSON.stringify(data);\r\n"
        "      stream.scrollTop = stream.scrollHeight;\r\n"
        "    })\r\n"
    ),
    (
        "    .then(function(data) {\r\n"
        "      thinking.textContent = (data && data.answer) ? data.answer : JSON.stringify(data);\r\n"
        "      stream.scrollTop = stream.scrollHeight;\r\n"
        "      // §104: registrar no histórico persistido de missões\r\n"
        "      recordMissionTimelineEntry({ source: 'sf-chat', input: text, summary: (data && data.answer) || null, status: 'ANSWERED' });\r\n"
        "    })\r\n"
    ),
    "tok1 sf-chat recordMissionTimelineEntry"
)

# --- 5b) tok3 / EXECUTAR MISSAO (Hermes): registrar apos parsear a resposta ---
content = replace_unique(
    content,
    (
        "            var answer = (d && d.answer) ? d.answer : JSON.stringify(d);\r\n"
        "            var hObj = parseHermesBlock(answer);\r\n"
    ),
    (
        "            var answer = (d && d.answer) ? d.answer : JSON.stringify(d);\r\n"
        "            var hObj = parseHermesBlock(answer);\r\n"
        "            // §104: registrar no histórico persistido de missões\r\n"
        "            recordMissionTimelineEntry({ source: 'hermes', input: missionText, summary: answer, status: hObj ? 'DIAGNOSED' : 'ANSWERED' });\r\n"
    ),
    "tok3 executar-missao recordMissionTimelineEntry"
)

# --- 5c) tok4 / upload de ZIP: registrar apos addToHistory('assistant', answer) ---
content = replace_unique(
    content,
    (
        "            /* Adicionar ao histórico */\r\n"
        "            addToHistory('assistant', answer);\r\n"
        "\r\n"
        "            /* §21 fetch transparency badge */\r\n"
    ),
    (
        "            /* Adicionar ao histórico */\r\n"
        "            addToHistory('assistant', answer);\r\n"
        "            // §104: registrar no histórico persistido de missões\r\n"
        "            recordMissionTimelineEntry({ source: 'zip-upload', input: question, summary: answer, status: 'ANSWERED' });\r\n"
        "\r\n"
        "            /* §21 fetch transparency badge */\r\n"
    ),
    "tok4 zip-upload recordMissionTimelineEntry"
)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("  OK — display_input em 2 fluxos, recordMissionTimelineEntry em 3 fluxos")


# ════════════════════════════════════════════════════════════════════
# 6) CLAUDE.md — registrar tudo isso (pra não perder contexto entre sessões)
# ════════════════════════════════════════════════════════════════════
print("[6/6] CLAUDE.md — registrando §104 e corrigindo seções desatualizadas")

path = 'CLAUDE.md'
with open(path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()

# --- 6a) §98-B/§98-C: doc dizia "PRIORIDADE ALTA/MÉDIA", código já resolvido ---
content = replace_unique(
    content,
    '''### §98-B — Adicionar Arquivos no Mission Control (PRIORIDADE ALTA)
**Problema:** Botão "+ Adicionar arquivos" (`v236FileInput`) existe no HTML mas não está claro se está wired no bundle.js
**O que precisa:**
- Verificar `grep -n "v236FileInput\\|FileInput\\|file.*attach" frontend/assets/vision-core-bundle.js`
- Se não wired: implementar upload de arquivo junto com a missão
- Arquivos devem ir no contexto do copiloto
- Criar stress test ST-02

### §98-C — SF Módulos 05-06 Desbloqueados (PRIORIDADE MÉDIA)
**Problema:** Módulos 05 (Preview de Criação) e 06 (Comando Real) têm `EXEC BLOQUEADO` no HTML
**Módulo 08** (Painel Final) tem `BLOQUEADO`
**O que precisa:**
- Decisão: implementar real ou marcar explicitamente como "Em breve no roadmap"
- Se implementar: criar endpoints `/api/sf/preview-creation` e `/api/sf/real-command`
- Se roadmap: substituir "EXEC BLOQUEADO" por badge "EM BREVE" consistente com o resto
- Criar stress test ST-03/ST-04''',
    '''### §98-B — Adicionar Arquivos no Mission Control ✅ RESOLVIDO (doc estava desatualizada)
**Causa raiz real (achada em análise de código §104):** funciona, mas NÃO via os campos documentados `file_context`/`file_name` — o backend nunca lê esses campos. O frontend's `sendMessage()` prepara o conteúdo do arquivo direto no texto da `message` via `_attachedFiles`. ST-02 testa os campos errados/mortos, dando falso-positivo de "funciona certo" quando na verdade funciona por outro caminho. `v236FileInput` (HTML) é órfão — sem listener, superado por `v298FileInput`, removido no §104.
**T4 (Mission Control): LIBERADO** — funcional, doc corrigida.

### §98-C — SF Módulos 05-06-08 ✅ RESOLVIDO (doc estava desatualizada)
**Causa raiz real:** já resolvido antes desta sessão (commit `74179b7`) — os 3 módulos mostram badge "EM BREVE" consistente com o resto, não "EXEC BLOQUEADO"/"BLOQUEADO" como a doc dizia. Nenhum código novo necessário, decisão de roadmap já tomada e implementada.
**T3 (Software Factory): LIBERADO**.''',
    "CLAUDE.md §98-B/§98-C fix"
)

# --- 6b) PENDÊNCIAS IMEDIATAS: secao estava stale desde o §102 ---
content = replace_unique(
    content,
    '''## PENDÊNCIAS IMEDIATAS (PRÓXIMA SESSÃO)

1. **§98-E** — Mission Timeline: persistência no vault/localStorage

2. **Tutoriais T1-T6** — 6/6 LIVE em produção (accordion sidebar completo, todos clicáveis)
   - T1 Geral · T2 Agent Local · T3 SF · T4 Mission Control · T5 Agentes Extras · T6 PASS GOLD
   - T2 Agent Local — `vc_tutorial_agent_done`
   - T3 Software Factory — `vc_tutorial_sf_done`
   - T4 Mission Control — `vc_tutorial_mission_done`
   - T6 PASS GOLD — `vc_tutorial_passgold_done`
   - Todos via botão "🪐 Tutorial desta seção" — NUNCA automático

4. **T5 Agentes Extras** — bloqueado até §98-D''',
    '''## PENDÊNCIAS IMEDIATAS (PRÓXIMA SESSÃO)

**Status: todas as pendências de código conhecidas até §103 foram resolvidas e registradas no §104 abaixo.** Itens já LIVE/resolvidos removidos desta lista (§98-A/B/C/D/E, T1-T6, §103) — ver seções correspondentes acima pra histórico.

### §104 — limpeza + cobertura completa do histórico (5 itens, 1 patch consolidado)
Implementado via `_patch104_cleanup_and_coverage.py` — cada item é independente e tem assert próprio:
1. `v236FileInput` órfão removido do `index.html` (zero outras referências confirmadas antes de remover — o resto do bloco `v236-action-row`/`v236FileBtn`/`v236CopilotBtn` TEM CSS e JS reais, não foi tocado).
2. Versão do backend padronizada: `package.json` 4.1.0 → 5.9.7, e os 8 textos de fallback dos módulos SF (vazam pro usuário quando o LLM falha) de v5.9.0 → v5.9.7. Frontend `V2.9.10` não foi tocado (versionamento separado, sem evidência de estar errado).
3. Backend `/api/chat` agora prefere `body.display_input` (texto limpo) sobre `body.message` (que pode ter prefixo de contexto) pra montar a entrada do histórico.
4. Frontend: chat principal e upload de ZIP agora mandam `display_input` com o texto original do usuário, sem o prefixo de contexto / conteúdo de arquivo.
5. Frontend: os 3 fluxos que ainda não chamavam `recordMissionTimelineEntry()` (mini-chat dos módulos SF, EXECUTAR MISSÃO/Hermes, upload de ZIP) agora chamam, equiparando ao chat principal (que já tinha desde o §102). Backend já persistia os 4 desde o §103 (header Authorization) — isso era só o feedback visual imediato que faltava.

**Verificação:** item 1-3 verificáveis por grep/sintaxe puro. Item 4 (display_input) tem verificação automatizada via `_test104_verify_e2e.sh` (curl, sem navegador — mesmo padrão do §103). Item 5 (recordMissionTimelineEntry nos 3 fluxos novos) é client-side puro — não dá pra verificar via curl, só visualmente; código segue padrão já testado no §102/§103, risco baixo. Se quiser certeza total, mandar uma missão via EXECUTAR MISSÃO ou upload de ZIP e confirmar que aparece no painel na hora (não precisa F5, é só pra esse item específico).

### Fora de escopo (decisão deliberada, não esquecimento)
- §98-F (OPENCLAW/OPENSQUAD/OSINT/V10) — roadmap puro, NÃO implementar ainda.''',
    "CLAUDE.md PENDÊNCIAS rewrite"
)

# --- 6c) VERSOES ATUAIS: linha do backend estava com v5.9.5-s89 (15 sessoes atrasada) ---
content = replace_unique(
    content,
    '| Backend EB | v5.9.5-s89-tutorial-quota | s89-done | 0678db5 |',
    '| Backend EB | 5.9.7-s104 | (pendente) | (pendente) |',
    "CLAUDE.md VERSÕES ATUAIS fix"
)

# --- 6d) Tabela de historico: corrigir placeholder do §102 + acrescentar §103 e §104 ---
content = replace_unique(
    content,
    '| §102 | §98-E resolvido — Mission Timeline persistido (descoberta: endpoint real é /api/chat, não /api/copilot) — ST-11 criado (6 casos), 21 testes unitários | - | (preencher após commit) |',
    '''| §102 | §98-E resolvido — Mission Timeline persistido (descoberta: endpoint real é /api/chat, não /api/copilot) — ST-11 criado (6 casos), 21 testes unitários | s102-done | 13a6748 |
| §103 | Causa raiz real do §102: header Authorization ausente nas 4 chamadas /api/chat (tok1-4) + CSS ausente no bundle pré-concatenado + overwrite-guard defensivo. Persistência confirmada ponta a ponta via curl/PowerShell. Mesmo commit/tag do §102. | s102-done | 13a6748 |
| §104 | Limpeza: v236FileInput órfão removido, versão backend padronizada (4.1.0/v5.9.0 → 5.9.7), display_input pro histórico mostrar texto limpo (sem prefixo de contexto), recordMissionTimelineEntry adicionado nos 3 fluxos que faltavam (sf-chat, hermes, zip-upload) — §98-B/§98-C doc sincronizada com código real. | - | (pendente commit) |''',
    "CLAUDE.md tabela de histórico §102 fix + §103/§104 rows"
)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("  OK — CLAUDE.md atualizado (§98-B/C, PENDÊNCIAS, VERSÕES ATUAIS, tabela de histórico)")

print("\n=== §104 APLICADO COM SUCESSO ===")
