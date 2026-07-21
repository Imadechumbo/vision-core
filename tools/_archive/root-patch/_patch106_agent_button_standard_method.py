#!/usr/bin/env python3
"""
_patch106_agent_button_standard_method.py — §106 Etapa A
Registra e verifica as mudanças feitas diretamente no bundle.

Padrão idempotente (mesmo que _patch105_agent_loop_closure.py):
  - Verifica que cada mudança esperada ESTÁ presente (assert-based)
  - Verifica que código removido NÃO está presente
  - Idempotente: rodar 2x dá o mesmo resultado

Mudanças desta etapa (todas em frontend/assets/vision-core-bundle.js):
  1. Nova função vcQueueApplyPatchViaAgent() — lógica compartilhada
  2. agentBtn.onclick em renderApplyFixPanel refatorado para usar a função compartilhada
  3. agentBtn106 adicionado em renderStandardMethodPanel — chama a mesma função
  4. btnRow.appendChild(agentBtn106) condicional no EXECUTAR MISSÃO panel

Backend (server.js) NÃO foi alterado — contrato do §105 já cobria tudo.
"""
import re, sys, os

ROOT    = os.path.dirname(os.path.abspath(__file__))
BUNDLE  = os.path.join(ROOT, 'frontend', 'assets', 'vision-core-bundle.js')

def load(path):
    with open(path, encoding='utf-8') as f:
        return f.read()

errors = []

def check(desc, cond):
    if not cond:
        errors.append(f'FAIL: {desc}')
        print(f'  ❌ {desc}')
    else:
        print(f'  ✅ {desc}')

print(f'\n§106 Patch Assert — {os.path.basename(BUNDLE)}\n')

src = load(BUNDLE)

# ── §106 mudança 1: função compartilhada existe ────────────────────────────
check(
    'vcQueueApplyPatchViaAgent definida exatamente 1 vez',
    src.count('function vcQueueApplyPatchViaAgent') == 1
)
check(
    'vcQueueApplyPatchViaAgent tem parâmetros (hermesObj, statusEl, onReset, onDone)',
    'function vcQueueApplyPatchViaAgent(hermesObj, statusEl, onReset, onDone)' in src
)
check(
    'Função compartilhada usa pollResult106 internamente',
    'pollResult106' in src
)

# ── §106 mudança 2: renderApplyFixPanel refatorado ─────────────────────────
check(
    'renderApplyFixPanel usa vcQueueApplyPatchViaAgent (call site com hermesObj)',
    'vcQueueApplyPatchViaAgent(hermesObj, statusEl,' in src
)
check(
    'pollResult105 removido do bundle (inline antigo eliminado)',
    'pollResult105' not in src
)

# ── §106 mudança 3: agentBtn106 em renderStandardMethodPanel ───────────────
check(
    'agentBtn106 declarado no bundle',
    'agentBtn106' in src
)
check(
    'renderStandardMethodPanel usa vcQueueApplyPatchViaAgent (call site com h)',
    'vcQueueApplyPatchViaAgent(h, statusEl,' in src
)
check(
    'botão "Aplicar no Vision Agent Local" no renderStandardMethodPanel',
    # Verifica no bloco do SMP especificamente
    'vcQueueApplyPatchViaAgent(h, statusEl,' in src
    and 'Aplicar no Vision Agent Local' in src[src.index('function renderStandardMethodPanel'):]
)

# ── §106 mudança 4: btnRow inclui agentBtn106 ──────────────────────────────
check(
    'btnRow.appendChild(agentBtn106) presente no bundle',
    'btnRow.appendChild(agentBtn106)' in src
)

# ── Regressão: §105 não quebrou ─────────────────────────────────────────────
check(
    'renderValidationPanel ainda definida (regressão §105)',
    'function renderValidationPanel' in src
)
check(
    'renderApplyFixPanel ainda definida (regressão §105)',
    'function renderApplyFixPanel' in src
)
check(
    'renderStandardMethodPanel ainda definida (regressão §105)',
    'function renderStandardMethodPanel' in src
)

# ── Backend intocado ────────────────────────────────────────────────────────
SERVER = os.path.join(ROOT, 'backend', 'server.js')
if os.path.exists(SERVER):
    server_src = load(SERVER)
    check(
        'backend/server.js não menciona agentBtn106 (backend intocado)',
        'agentBtn106' not in server_src
    )

print()
if errors:
    print(f'❌ {len(errors)} falha(s):')
    for e in errors: print(f'  {e}')
    sys.exit(1)
else:
    print(f'✅ Todos os asserts passaram — §106 Etapa A verificada.\n')
