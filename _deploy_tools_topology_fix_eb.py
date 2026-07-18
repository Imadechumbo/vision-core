"""Deploy — corrige a topologia do import() de tools/ pra funcionar de
verdade no zip achatado do EB (achado + adiado explicitamente na sessao
anterior, ver docs/CURRENT_STATE.md secao Software Factory). server.js ganhou
importToolsModule() (tenta '../tools/x' — layout local/dev — depois './tools/x'
— layout achatado do EB), e este deploy inclui SO os arquivos de tools/ que
sao realmente importados em runtime (server.js -> project-infographic.mjs,
project-architecture-diagram.mjs -> vendor/archify/**) — NUNCA a pasta
tools/ inteira, que e o diretorio geral de scripts do projeto (dezenas de
scripts de deploy antigos, nada disso pertence a producao).

Base: vision-core-v5.9.68-archify-diagram.zip (ja tem llm-cost.js incluido,
ver INCIDENTE 2026-07-18). Este script SO monta o zip e roda os asserts —
boot local e upload/deploy real sao passos separados, mesma disciplina do
incidente anterior."""
import zipfile, io
from pathlib import Path

REPO_ROOT    = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND      = REPO_ROOT / 'backend'
TOOLS        = REPO_ROOT / 'tools'
APP_VERS     = BACKEND / '.elasticbeanstalk/app_versions'
LATEST_ZIP   = APP_VERS / 'vision-core-v5.9.68-archify-diagram.zip'
NEW_ZIP      = APP_VERS / 'vision-core-v5.9.69-tools-topology-fix.zip'
SERVER_SRC   = BACKEND / 'server.js'

# Exatamente os arquivos que server.js/project-architecture-diagram.mjs
# importam em runtime — nada a mais.
TOOLS_FILES = [
    'project-infographic.mjs',
    'project-architecture-diagram.mjs',
    'vendor/archify/LICENSE',
    'vendor/archify/README.md',
    'vendor/archify/schemas/architecture.schema.json',
    'vendor/archify/schemas/common.schema.json',
    'vendor/archify/renderers/architecture/render-architecture.mjs',
    'vendor/archify/renderers/architecture/grid.mjs',
    'vendor/archify/renderers/shared/cli.mjs',
    'vendor/archify/renderers/shared/utils.mjs',
    'vendor/archify/renderers/shared/layout-report.mjs',
    'vendor/archify/renderers/shared/geometry.mjs',
    'vendor/archify/renderers/shared/validator.mjs',
    'vendor/archify/renderers/shared/generated-validators.mjs',
    'vendor/archify/assets/template.html',
]

print('Reading server.js...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

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
assert b"require('./llm-cost')" in new_server, 'ERROR: llm-cost require missing from server.js'
assert b'appendProjectInfographicFile' in new_server, 'ERROR: infographic wiring missing'
assert b'appendProjectArchitectureDiagramFile' in new_server, 'ERROR: archify diagram wiring missing'
# Novo: fix de topologia.
assert b'async function importToolsModule' in new_server, 'ERROR: importToolsModule helper missing'
assert b"importToolsModule('project-infographic.mjs')" in new_server, 'ERROR: infographic call site not using importToolsModule'
assert b"importToolsModule('project-architecture-diagram.mjs')" in new_server, 'ERROR: archify diagram call site not using importToolsModule'
print('  OK: regression + topology-fix assertions pass')

print('Reading tools/ files (allowlist only)...')
tools_payload = {}
for rel in TOOLS_FILES:
    p = TOOLS / rel
    if not p.exists():
        raise FileNotFoundError(f'Expected tools file missing locally: {p}')
    tools_payload['tools/' + rel] = p.read_bytes()
print(f'  {len(tools_payload)} files, {sum(len(v) for v in tools_payload.values()):,} bytes total')

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
        for arcname, content in tools_payload.items():
            dst.writestr(arcname, content)
            print(f'  Added: {arcname}')
buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes -> {NEW_ZIP}')
