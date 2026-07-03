"""Deploy §107+§108 — memory layer no Hermes + painel de metricas com dados reais"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.8-s105.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.10-s107-s108.zip'
SERVER_SRC = BACKEND / 'server.js'
HERMES_SRC = BACKEND / 'hermes-rca.js'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.10-s107-s108.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.10-s107-s108-memory-observability'

print('Reading server.js...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  size: {len(new_server):,} bytes')

assert b'/api/metrics/memory' in new_server, 'ERROR: /api/metrics/memory route not found'
assert b'computeMemoryMetrics' in new_server, 'ERROR: computeMemoryMetrics import not found'
assert b'readLowConfidenceLog' in new_server, 'ERROR: readLowConfidenceLog import not found'
assert b'anti_stub' in new_server, 'ERROR: anti_stub missing'
print('  OK: §108 endpoint present')

print('Reading hermes-rca.js...')
with open(HERMES_SRC, encoding='utf-8') as f:
    new_hermes = f.read().encode('utf-8')
print(f'  size: {len(new_hermes):,} bytes')

assert b'tokenize' in new_hermes, 'ERROR: tokenize not found'
assert b'jaccardOverlap' in new_hermes, 'ERROR: jaccardOverlap not found'
assert b'findSimilarLowConfidenceCases' in new_hermes, 'ERROR: findSimilarLowConfidenceCases not found'
assert b'applyMemoryReordering' in new_hermes, 'ERROR: applyMemoryReordering not found'
assert b'computeMemoryMetrics' in new_hermes, 'ERROR: computeMemoryMetrics not found'
assert b'\xa772 Fase 2' in new_hermes or b'Fase 2' in new_hermes, 'ERROR: §72 Fase 2 comment not found'
print('  OK: §107 memory layer functions present')

print('Building zip...')
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']): continue
            if item.filename in ('server.js', './server.js'):
                dst.writestr(item, new_server)
                print(f'  Replaced: {item.filename}')
            elif item.filename in ('hermes-rca.js', './hermes-rca.js'):
                dst.writestr(item, new_hermes)
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))
buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes')

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0 and 'already exists' not in r.stderr:
        print(f'FAILED:\n{r.stderr}'); sys.exit(1)

run(['aws', 's3', 'cp', str(NEW_ZIP), f's3://{S3_BUCKET}/{S3_KEY}', '--region', REGION, '--no-verify-ssl'])
print('Uploaded S3')
run(['aws', 'elasticbeanstalk', 'create-application-version', '--application-name', APP_NAME,
     '--version-label', VER_LABEL, '--source-bundle', f'S3Bucket={S3_BUCKET},S3Key={S3_KEY}',
     '--region', REGION, '--no-verify-ssl', '--auto-create-application'])
run(['aws', 'elasticbeanstalk', 'update-environment', '--environment-name', ENV_NAME,
     '--version-label', VER_LABEL, '--region', REGION, '--no-verify-ssl'])
print(f'OK — version: {VER_LABEL}')
