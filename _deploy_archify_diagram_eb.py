"""Deploy — wiring do diagrama de arquitetura via Archify (aditivo ao
PROJETO_INFOGRAFICO.html) em /api/sf/project-files. Ver commit d30ace7d em
atomic-core-2x-hub-tuning (pushado). server.js + llm-cost.js (DECISION-032,
achado real: nunca tinha sido empacotado em nenhum zip deployado — causa raiz
do crash 100% 5xx da tentativa v5.9.67-archify-diagram, ver
docs/CURRENT_STATE.md secao INCIDENTES). tools/ (incl. tools/vendor/archify/)
CONTINUA fora deste deploy — mesmo motivo documentado antes: zip de producao e
flat, os imports dinamicos '../tools/project-*.mjs' seguem sendo no-op
silencioso best-effort ate correcao de topologia futura e separada.

Este script SO monta o zip e roda os asserts de regressao. A simulacao de
boot local e o upload/deploy real para o EB sao passos separados
(deliberado: nunca subir pro EB sem confirmar boot local primeiro)."""
import zipfile, io
from pathlib import Path

BACKEND      = Path('C:/Users/imadechumbo/Desktop/vision-core/backend')
APP_VERS     = BACKEND / '.elasticbeanstalk/app_versions'
LATEST_ZIP   = APP_VERS / 'vision-core-v5.9.66-chat-grounding-facts.zip'
NEW_ZIP      = APP_VERS / 'vision-core-v5.9.68-archify-diagram.zip'
SERVER_SRC   = BACKEND / 'server.js'
LLM_COST_SRC = BACKEND / 'llm-cost.js'

print('Reading server.js + llm-cost.js...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
with open(LLM_COST_SRC, encoding='utf-8') as f:
    new_llm_cost = f.read().encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')
print(f'  llm-cost.js: {len(new_llm_cost):,} bytes')

# Regressao: confirma que os fixes de deploys anteriores nao foram perdidos.
assert b'GROUNDING REAL' in new_server, 'ERROR: Hermes fine-tuning grounding block missing'
assert b'isHermesFineTuningQuestion' in new_server, 'ERROR: Hermes fine-tuning detector missing'
assert b'bundledDocPath' in new_server, 'ERROR: EB-bundle fallback path missing'
assert b'sanitizeMissionStages' in new_server, 'ERROR: sanitizeMissionStages missing'
assert b'MISSION_STAGE_STATUSES' in new_server, 'ERROR: stage status allowlist missing'
assert b"require('./vision-core-grounding')" in new_server, 'ERROR: vision-core-grounding require missing'
assert b'VISION_CORE_FACTS_BLOCK' in new_server, 'ERROR: facts block not wired into server.js'
assert b'isUnsafeToArchive' in new_server, 'ERROR: Archivist self-reinforcement gate missing'
assert b'R8. Perguntas sobre a identidade' in new_server, 'ERROR: R8 absolute rule missing'
assert b'const rawMessage = message;' in new_server, 'ERROR: raw-message capture (pre-mutation) missing'
# Novo: wiring do diagrama Archify (best-effort, aditivo ao infografico).
assert b'appendProjectInfographicFile' in new_server, 'ERROR: infographic wiring missing'
assert b'appendProjectArchitectureDiagramFile' in new_server, 'ERROR: archify diagram wiring missing'
assert b"import('../tools/project-architecture-diagram.mjs')" in new_server, 'ERROR: archify diagram import path missing'
# Fix do incidente: llm-cost.js precisa estar no require() E no zip.
assert b"require('./llm-cost')" in new_server, 'ERROR: llm-cost require missing from server.js'
print('  OK: regression + new archify-wiring + llm-cost fix assertions pass')

print('Building zip...')
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']): continue
            if item.filename in ('server.js', './server.js'):
                dst.writestr(item, new_server)
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))
        dst.writestr('llm-cost.js', new_llm_cost)
        print('  Added: llm-cost.js')
buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes -> {NEW_ZIP}')
