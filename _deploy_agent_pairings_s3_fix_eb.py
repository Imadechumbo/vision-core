"""Deploy — corrige a persistencia de agentPairings: v5.9.75 gravava/lia só em
disco local, mas o log da instancia confirmou que TODA atualizacao de ambiente
(inclusive so de env var) faz "Renaming /var/app/staging/ to /var/app/current/",
descartando qualquer arquivo criado em runtime que nao passe pelo ciclo S3.
USERS_DB sobrevive porque `_s3LoadSync(USERS_DB)` roda antes de app.listen();
agentPairings e module-level (lido uma unica vez, nao por request), entao precisa
do mesmo pull ANTES do Map ser construido. Confirmado ao vivo: o pareamento do
v5.9.75 nao sobreviveu ao proximo restart do EB (achado real, 2026-07-20).
Base: vision-core-v5.9.75-agent-pairings-persist.zip.

So server.js muda — nenhum require novo (_s3LoadSync ja existe e ja e usado por
USERS_DB/PROJECTS_DB/etc, so um novo call site)."""
import zipfile, io
from pathlib import Path

REPO_ROOT  = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = REPO_ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk/app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.75-agent-pairings-persist.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.76-agent-pairings-s3-fix.zip'
SERVER_SRC = BACKEND / 'server.js'

print('Reading server.js...')
new_server = SERVER_SRC.read_text(encoding='utf-8').encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

# Regressao: confirma que fixes/wiring de deploys anteriores nao foram perdidos.
assert b'GROUNDING REAL' in new_server, 'ERROR: Hermes fine-tuning grounding block missing'
assert b"require('./llm-cost')" in new_server, 'ERROR: llm-cost require missing'
assert b"app.set('trust proxy', 1);" in new_server, 'ERROR: trust proxy setting missing'
assert b'isSfRealExecutionAgentAllowed' in new_server, 'ERROR: SF allowlist gate missing'
assert b'const AGENT_PAIRINGS_DB' in new_server, 'ERROR: AGENT_PAIRINGS_DB const missing'
assert b"new Map(Object.entries(readJsonFile(AGENT_PAIRINGS_DB, {})))" in new_server, 'ERROR: agentPairings no longer loads from disk on boot'
assert b'writeAndSyncS3(AGENT_PAIRINGS_DB, Object.fromEntries(agentPairings))' in new_server, 'ERROR: /api/agent/register no longer persists pairing'

# Novo nesta entrega: pull do S3 ANTES do Map ser construido (a causa raiz real do v5.9.75).
assert b'_s3LoadSync(AGENT_PAIRINGS_DB);' in new_server, 'ERROR: missing S3 pull-before-boot for agentPairings'
idx_load = new_server.index(b'_s3LoadSync(AGENT_PAIRINGS_DB);')
idx_map  = new_server.index(b'const agentPairings = new Map')
assert idx_load < idx_map, 'ERROR: S3 pull must run before the agentPairings Map is constructed'
print('  OK: regression + S3-pull-ordering assertions pass')

print('Building zip...')
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            if item.filename.lstrip('./') == 'server.js':
                dst.writestr(item, new_server)
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))
buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes -> {NEW_ZIP}')
