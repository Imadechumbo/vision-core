"""Deploy §112 — Etapa F: fila SQLite persistente via sql.js

Alteracoes neste deploy vs v5.9.12-s111:
- server.js: 6 call-sites migrados de _agentQueue[]/_agentResults{} para
  agentQueueDB.*; app.listen agora aguarda await agentQueueDB.init(DB_ROOT)
- agent-queue-db.js: NOVO modulo SQLite via sql.js (WASM, sem native build)
- package.json: sql.js ^1.x adicionado como dependency
- package-lock.json: atualizado com sql.js

O zip anterior NAO inclui node_modules — o EB roda npm install a partir do
package.json durante o deploy. Com sql.js no package.json, o npm install do
EB vai instalar o sql.js (incluindo o .wasm) automaticamente. Nenhuma acao
adicional necessaria para cobrir o .wasm.
"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.12-s111.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.13-s112.zip'
SERVER_SRC = BACKEND / 'server.js'
AGENT_DB_SRC = BACKEND / 'agent-queue-db.js'
PKG_SRC    = BACKEND / 'package.json'
PKG_LOCK_SRC = BACKEND / 'package-lock.json'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.13-s112.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.13-s112-sqlite-queue'

# ── leitura dos arquivos novos ───────────────────────────────────────────────
print('Reading source files...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

with open(AGENT_DB_SRC, encoding='utf-8') as f:
    new_agent_db = f.read().encode('utf-8')
print(f'  agent-queue-db.js: {len(new_agent_db):,} bytes')

with open(PKG_SRC, encoding='utf-8') as f:
    new_pkg = f.read().encode('utf-8')
print(f'  package.json: {len(new_pkg):,} bytes')

with open(PKG_LOCK_SRC, encoding='utf-8') as f:
    new_pkg_lock = f.read().encode('utf-8')
print(f'  package-lock.json: {len(new_pkg_lock):,} bytes')

# ── verificacoes de segurança ────────────────────────────────────────────────
assert b'agentQueueDB' in new_server, 'ERROR: agentQueueDB not found in server.js'
assert b'agent-queue-db' in new_server, "ERROR: require('./agent-queue-db') not found"
assert b'await agentQueueDB.init(' in new_server, 'ERROR: async init missing in server.js'
assert b'apply_patch_multi' in new_server, 'ERROR: apply_patch_multi missing (regression check)'
assert b'sf_dry_run_real' in new_server, 'ERROR: sf_dry_run_real missing (regression check)'
assert b'anti_stub' in new_server, 'ERROR: anti_stub missing'
assert b'_agentQueue' not in new_server, 'ERROR: stale _agentQueue found in server.js'
assert b'_agentResults' not in new_server, 'ERROR: stale _agentResults found in server.js'
print('  OK: §112 agentQueueDB present, no stale in-memory refs')

assert b'sql.js' in new_agent_db or b'initSqlJs' in new_agent_db, \
    'ERROR: sql.js/initSqlJs not found in agent-queue-db.js'
assert b'module.exports' in new_agent_db, 'ERROR: module.exports missing in agent-queue-db.js'
print('  OK: agent-queue-db.js looks correct')

assert b'sql.js' in new_pkg, 'ERROR: sql.js not found in package.json'
print('  OK: package.json contains sql.js dependency')

# ── construção do novo zip ───────────────────────────────────────────────────
print('Building zip...')
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        replaced = set()
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            if item.filename in ('server.js', './server.js'):
                dst.writestr(item, new_server)
                replaced.add('server.js')
                print(f'  Replaced: {item.filename}')
            elif item.filename in ('package.json', './package.json'):
                dst.writestr(item, new_pkg)
                replaced.add('package.json')
                print(f'  Replaced: {item.filename}')
            elif item.filename in ('package-lock.json', './package-lock.json'):
                dst.writestr(item, new_pkg_lock)
                replaced.add('package-lock.json')
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))
        # adicionar agent-queue-db.js (novo, nao existia no zip anterior)
        dst.writestr('agent-queue-db.js', new_agent_db)
        print('  Added: agent-queue-db.js (new file)')
        # garantir que package-lock.json foi substituido (pode nao existir no zip anterior)
        if 'package-lock.json' not in replaced:
            dst.writestr('package-lock.json', new_pkg_lock)
            print('  Added: package-lock.json (was missing from previous zip)')

buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes -> {NEW_ZIP}')

# ── upload + deploy ──────────────────────────────────────────────────────────
def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0 and 'already exists' not in r.stderr:
        print(f'FAILED:\n{r.stderr}'); sys.exit(1)

print('Uploading to S3...')
run(['aws', 's3', 'cp', str(NEW_ZIP), f's3://{S3_BUCKET}/{S3_KEY}',
     '--region', REGION, '--no-verify-ssl'])
print('  Uploaded')

print('Creating EB application version...')
run(['aws', 'elasticbeanstalk', 'create-application-version',
     '--application-name', APP_NAME,
     '--version-label', VER_LABEL,
     '--source-bundle', f'S3Bucket={S3_BUCKET},S3Key={S3_KEY}',
     '--region', REGION, '--no-verify-ssl', '--auto-create-application'])
print('  Created')

print('Updating EB environment...')
run(['aws', 'elasticbeanstalk', 'update-environment',
     '--environment-name', ENV_NAME,
     '--version-label', VER_LABEL,
     '--region', REGION, '--no-verify-ssl'])
print(f'  OK — version: {VER_LABEL}')
print('Deploy triggered. Monitor: https://us-east-1.console.aws.amazon.com/elasticbeanstalk/')
