"""Deploy — estende o diagrama Archify pro branch standard do SF (ver commit
8605654e). Base: vision-core-v5.9.69-tools-topology-fix.zip (ja tem
llm-cost.js + tools/ com a topologia corrigida). Esta mudanca toca 2
arquivos: server.js (1 bloco try/catch novo no branch standard) E
tools/project-architecture-diagram.mjs (conteudo mudou de verdade —
buildArchitectureIRFromFiles/finalizeArchitectureIR/etc — NAO É só
server.js desta vez, atencao pra nao esquecer de trocar os dois).

tools/project-infographic.mjs e tools/vendor/archify/** ficam como estao no
zip-base (nao tocados nesta mudanca).

Este script SO monta o zip e roda os asserts. Boot local (3 camadas) e
upload/deploy real sao passos separados, mesma disciplina do incidente
anterior — NUNCA sobe pro EB sem validar local primeiro."""
import zipfile, io
from pathlib import Path

REPO_ROOT  = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = REPO_ROOT / 'backend'
TOOLS      = REPO_ROOT / 'tools'
APP_VERS   = BACKEND / '.elasticbeanstalk/app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.69-tools-topology-fix.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.70-standard-branch-diagram.zip'
SERVER_SRC = BACKEND / 'server.js'
ARCHIFY_MODULE_SRC = TOOLS / 'project-architecture-diagram.mjs'

print('Reading server.js + tools/project-architecture-diagram.mjs...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
with open(ARCHIFY_MODULE_SRC, encoding='utf-8') as f:
    new_archify_module = f.read().encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')
print(f'  tools/project-architecture-diagram.mjs: {len(new_archify_module):,} bytes')

# Regressao: confirma que os fixes de deploys anteriores nao foram perdidos.
assert b'GROUNDING REAL' in new_server, 'ERROR: Hermes fine-tuning grounding block missing'
assert b"require('./llm-cost')" in new_server, 'ERROR: llm-cost require missing from server.js'
assert b'async function importToolsModule' in new_server, 'ERROR: importToolsModule helper missing'
assert b"importToolsModule('project-infographic.mjs')" in new_server, 'ERROR: infographic call site missing'
assert b"importToolsModule('project-architecture-diagram.mjs')" in new_server, 'ERROR: complex-branch diagram call site missing'
# Novo: wiring do branch standard.
assert b'appendProjectArchitectureDiagramFileFromFiles' in new_server, 'ERROR: standard-branch diagram wiring missing from server.js'
assert b'export function buildArchitectureIRFromFiles' in new_archify_module, 'ERROR: buildArchitectureIRFromFiles missing from module'
assert b'export function appendProjectArchitectureDiagramFileFromFiles' in new_archify_module, 'ERROR: appendProjectArchitectureDiagramFileFromFiles missing from module'
assert b'STANDARD_BRANCH_MARKERS' in new_archify_module, 'ERROR: STANDARD_BRANCH_MARKERS missing from module'
print('  OK: regression + standard-branch assertions pass')

print('Building zip...')
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']): continue
            if item.filename in ('server.js', './server.js'):
                dst.writestr(item, new_server)
                print(f'  Replaced: {item.filename}')
            elif item.filename in ('tools/project-architecture-diagram.mjs', './tools/project-architecture-diagram.mjs'):
                dst.writestr(item, new_archify_module)
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))
buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes -> {NEW_ZIP}')
