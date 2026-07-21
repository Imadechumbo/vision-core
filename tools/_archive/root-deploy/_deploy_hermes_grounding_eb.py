"""Deploy — Hermes fine-tuning grounding fix in /api/chat (anti-hallucination)"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.63-hermes-dataset-trio.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.64b-hermes-grounding-fix.zip'
SERVER_SRC = BACKEND / 'server.js'
DOC_SRC    = ROOT / 'docs' / 'HERMES_FINE_TUNING_DATASET.md'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.64b-hermes-grounding-fix.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.64b-hermes-grounding-fix'

print('Reading server.js...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  size: {len(new_server):,} bytes')

assert b'GROUNDING REAL' in new_server, 'ERROR: grounding block missing'
assert b'isHermesFineTuningQuestion' in new_server, 'ERROR: detector missing'
assert b'HERMES_FINE_TUNING_DATASET.md' in new_server, 'ERROR: real doc read missing'
assert b'bundledDocPath' in new_server, 'ERROR: EB-bundle fallback path missing (achado real 2026-07-14)'
print('  OK: grounding-fix assertions pass')

print('Reading real doc (docs/HERMES_FINE_TUNING_DATASET.md)...')
with open(DOC_SRC, encoding='utf-8') as f:
    doc_bytes = f.read().encode('utf-8')
print(f'  size: {len(doc_bytes):,} bytes')

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
        # Achado real (2026-07-14): o zip deployado é so o conteudo de
        # backend/ (sem docs/ irmao) -- empacota uma copia do doc real aqui
        # pra o fallback bundledDocPath em server.js encontrar em producao.
        dst.writestr('docs/HERMES_FINE_TUNING_DATASET.md', doc_bytes)
        print('  Added: docs/HERMES_FINE_TUNING_DATASET.md (bundled copy)')
buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes')

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0 and 'already exists' not in r.stderr:
        print(f'FAILED:\n{r.stderr}'); sys.exit(1)
    return r

run(['aws', 's3', 'cp', str(NEW_ZIP), f's3://{S3_BUCKET}/{S3_KEY}', '--region', REGION, '--no-verify-ssl'])
print('Uploaded S3')

run(['aws', 'elasticbeanstalk', 'create-application-version',
     '--application-name', APP_NAME,
     '--version-label', VER_LABEL,
     '--source-bundle', f'S3Bucket={S3_BUCKET},S3Key={S3_KEY}',
     '--region', REGION, '--no-verify-ssl'])
print('Created application version')

run(['aws', 'elasticbeanstalk', 'update-environment',
     '--environment-name', ENV_NAME,
     '--version-label', VER_LABEL,
     '--region', REGION, '--no-verify-ssl'])
print(f'OK - deploying version: {VER_LABEL}')
