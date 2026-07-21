"""Deploy — Fases A/B/C do Tier PRO (schema de plano, quota por plano,
Quality Gate do GitHub) + dataset RCA do modo-total + fix da brecha de
quota anonima, todos acumulados desde o ultimo deploy real (8605654e,
v5.9.70-standard-branch-diagram). Base: vision-core-v5.9.70-standard-
branch-diagram.zip.

Esta mudanca troca server.js E hermes-dataset.js (conteudo mudou) E
ADICIONA 3 arquivos que NUNCA estiveram em nenhum zip-base anterior:
user-plan.js, mission-quota.js, github-quality-gate.js — server.js tem
require('./user-plan'), require('./mission-quota') e
require('./github-quality-gate') sincronos, sem try/catch. Sem esses 3
arquivos no zip, o boot quebra com MODULE_NOT_FOUND — mesma classe do
INCIDENTE 2026-07-18 (llm-cost.js). Auditoria de todo require('./x') de
server.js contra o namelist() do zip-base feita ANTES deste script
(confirmado: os 3 arquivos abaixo sao os unicos gaps; hermes-dataset.js
ja existia no zip-base, so o conteudo mudou).

Este script SO monta o zip e roda os asserts. Boot local (3 camadas) e
upload/deploy real sao passos separados — NUNCA sobe pro EB sem validar
local primeiro."""
import zipfile, io
from pathlib import Path

REPO_ROOT  = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = REPO_ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk/app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.70-standard-branch-diagram.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.71-pro-quota-gate.zip'

SERVER_SRC       = BACKEND / 'server.js'
HERMES_DS_SRC    = BACKEND / 'hermes-dataset.js'
USER_PLAN_SRC    = BACKEND / 'user-plan.js'
MISSION_QUOTA_SRC = BACKEND / 'mission-quota.js'
QUALITY_GATE_SRC = BACKEND / 'github-quality-gate.js'

print('Reading changed/new backend files...')
new_server       = SERVER_SRC.read_text(encoding='utf-8').encode('utf-8')
new_hermes_ds    = HERMES_DS_SRC.read_text(encoding='utf-8').encode('utf-8')
new_user_plan    = USER_PLAN_SRC.read_text(encoding='utf-8').encode('utf-8')
new_mission_quota = MISSION_QUOTA_SRC.read_text(encoding='utf-8').encode('utf-8')
new_quality_gate = QUALITY_GATE_SRC.read_text(encoding='utf-8').encode('utf-8')
for label, data in [
    ('server.js', new_server), ('hermes-dataset.js', new_hermes_ds),
    ('user-plan.js (NEW)', new_user_plan), ('mission-quota.js (NEW)', new_mission_quota),
    ('github-quality-gate.js (NEW)', new_quality_gate),
]:
    print(f'  {label}: {len(data):,} bytes')

# Regressao: confirma que fixes/wiring de deploys anteriores nao foram perdidos.
assert b'GROUNDING REAL' in new_server, 'ERROR: Hermes fine-tuning grounding block missing'
assert b"require('./llm-cost')" in new_server, 'ERROR: llm-cost require missing from server.js'
assert b'async function importToolsModule' in new_server, 'ERROR: importToolsModule helper missing'
assert b"importToolsModule('project-architecture-diagram.mjs')" in new_server, 'ERROR: complex-branch diagram call site missing'
assert b'appendProjectArchitectureDiagramFileFromFiles' in new_server, 'ERROR: standard-branch diagram wiring missing'

# Novo nesta entrega: Fases A/B/C do Tier PRO + fix da brecha anonima.
assert b"require('./user-plan')" in new_server, 'ERROR: user-plan require missing from server.js'
assert b"require('./mission-quota')" in new_server, 'ERROR: mission-quota require missing from server.js'
assert b"require('./github-quality-gate')" in new_server, 'ERROR: github-quality-gate require missing from server.js'
assert b'evaluateGithubQualityGate(' in new_server, 'ERROR: quality gate call site missing from server.js'
assert b'function isLoopbackRequest' in new_server, 'ERROR: isLoopbackRequest guard missing from server.js'
assert b"if (isLoopbackRequest(req)) return next();" in new_server, 'ERROR: loopback carve-out missing from checkMissionQuota'
assert b"return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });" in new_server, 'ERROR: 401 not_authenticated response missing from checkMissionQuota'
assert b'function appendModoTotalRca' in new_hermes_ds, 'ERROR: appendModoTotalRca missing from hermes-dataset.js'
assert b'function normalizeUserPlan' in new_user_plan, 'ERROR: normalizeUserPlan missing from user-plan.js'
assert b'function missionQuota' in new_mission_quota, 'ERROR: missionQuota missing from mission-quota.js'
assert b'function evaluateGithubQualityGate' in new_quality_gate, 'ERROR: evaluateGithubQualityGate missing from github-quality-gate.js'
print('  OK: regression + Fase A/B/C + quota-fix assertions pass')

print('Building zip...')
REPLACE = {
    'server.js': new_server,
    'hermes-dataset.js': new_hermes_ds,
}
NEW_ENTRIES = {
    'user-plan.js': new_user_plan,
    'mission-quota.js': new_mission_quota,
    'github-quality-gate.js': new_quality_gate,
}
replaced = set()
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            key = item.filename.lstrip('./')
            if key in REPLACE:
                dst.writestr(item, REPLACE[key])
                replaced.add(key)
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))
        assert replaced == set(REPLACE), f'ERROR: nem todos os arquivos a substituir foram encontrados no zip-base: faltou {set(REPLACE) - replaced}'
        for name, data in NEW_ENTRIES.items():
            dst.writestr(name, data)
            print(f'  Added (new): {name}')
buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes -> {NEW_ZIP}')
