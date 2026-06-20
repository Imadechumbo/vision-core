"""Deploy §115 — apply_patch_multi ganha gatilho real no chat

Alteracoes neste deploy vs v5.9.13-s112:
- server.js: prompt de mode:fix ganha formato alternativo "files": [...]
  (FORMATO MULTI-ARQUIVO) para quando 2+ arquivos precisam de fix na
  mesma resposta; §53 multi-DIFF aponta para esse formato; ensureHermesJson
  (§34) tambem reconhece files[]
- fix bug pre-existente: _h49budgetMs (variavel nunca definida) causava
  ReferenceError quando TODOS os providers de IA falhavam simultaneamente
  — substituido por _h49timeout (variavel real, ja em scope)

So server.js mudou. vision-agent.js e agent-queue-db.js intocados.
"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.13-s112.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.14-s115.zip'
SERVER_SRC = BACKEND / 'server.js'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.14-s115.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.14-s115-apply-patch-multi-chat'

# ── leitura dos arquivos novos ───────────────────────────────────────────────
print('Reading source files...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

# ── verificacoes de segurança ────────────────────────────────────────────────
assert b'FORMATO MULTI-ARQUIVO' in new_server or b'files' in new_server, \
    'ERROR: multi-arquivo format not found in server.js'
assert b'_h49budgetMs' not in new_server, \
    'ERROR: _h49budgetMs still present in server.js (should be gone)'
assert b'_h49timeout' in new_server, \
    'ERROR: _h49timeout not found in server.js (fix not applied)'
assert b'agentQueueDB' in new_server, 'ERROR: agentQueueDB not found in server.js (regression)'
assert b'apply_patch_multi' in new_server, 'ERROR: apply_patch_multi missing (regression)'
assert b'sf_dry_run_real' in new_server, 'ERROR: sf_dry_run_real missing (regression)'
assert b'anti_stub' in new_server, 'ERROR: anti_stub missing (regression)'
assert b'_agentQueue' not in new_server, 'ERROR: stale _agentQueue found in server.js (regression)'
assert b'_agentResults' not in new_server, 'ERROR: stale _agentResults found in server.js (regression)'
print('  OK: §115 changes verified, no regressions')

# ── construção do novo zip ───────────────────────────────────────────────────
print('Building zip...')
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            if item.filename in ('server.js', './server.js'):
                dst.writestr(item, new_server)
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))

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
