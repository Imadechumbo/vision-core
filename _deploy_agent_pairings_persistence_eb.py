"""Deploy — persiste agentPairings em disco (data/agent-pairings.json), corrigindo
o ciclo em que qualquer restart do EB apagava pareamentos ativos do Vision Agent
Local e forcava re-registro com agent_id novo, nunca convergindo com
SF_REAL_EXECUTION_ALLOWED_AGENTS (achado real durante o 1o teste supervisionado,
2026-07-20, commit d524d257). Base: vision-core-v5.9.74-sf-agent-allowlist.zip
(ja contem a allowlist server-side deployada como v118).

So server.js muda nesta entrega — nenhum require novo (aditivo: so agentPairings
passa a carregar/gravar via readJsonFile/writeAndSyncS3, ja usados por USERS_DB)."""
import zipfile, io
from pathlib import Path

REPO_ROOT  = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = REPO_ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk/app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.74-sf-agent-allowlist.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.75-agent-pairings-persist.zip'
SERVER_SRC = BACKEND / 'server.js'

print('Reading server.js...')
new_server = SERVER_SRC.read_text(encoding='utf-8').encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

# Regressao: confirma que fixes/wiring de deploys anteriores nao foram perdidos.
assert b'GROUNDING REAL' in new_server, 'ERROR: Hermes fine-tuning grounding block missing'
assert b"require('./llm-cost')" in new_server, 'ERROR: llm-cost require missing'
assert b'async function importToolsModule' in new_server, 'ERROR: importToolsModule helper missing'
assert b"require('./user-plan')" in new_server, 'ERROR: user-plan require missing'
assert b"require('./mission-quota')" in new_server, 'ERROR: mission-quota require missing'
assert b"require('./github-quality-gate')" in new_server, 'ERROR: github-quality-gate require missing'
assert b"app.set('trust proxy', 1);" in new_server, 'ERROR: trust proxy setting missing'
assert b'isSfRealExecutionAgentAllowed' in new_server, 'ERROR: SF allowlist gate missing'
assert b'sf_real_execution_agent_not_allowed' in new_server, 'ERROR: allowlist denial response missing'

# Novo nesta entrega: persistencia de agentPairings.
assert b'const AGENT_PAIRINGS_DB' in new_server, 'ERROR: AGENT_PAIRINGS_DB const missing'
assert b"new Map(Object.entries(readJsonFile(AGENT_PAIRINGS_DB, {})))" in new_server, 'ERROR: agentPairings no longer loads from disk on boot'
assert b'writeAndSyncS3(AGENT_PAIRINGS_DB, Object.fromEntries(agentPairings))' in new_server, 'ERROR: /api/agent/register no longer persists pairing'
print('  OK: regression + persistence assertions pass')

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
