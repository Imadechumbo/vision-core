"""Deploy §151 — scrypt passwords — v5.9.42-s151"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.41-s150.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.42-s151.zip'
SERVER_SRC = BACKEND / 'server.js'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.42-s151.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.42-s151-scrypt-passwords'

print('Reading server.js...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  size: {len(new_server):,} bytes')

assert b'scryptSync' in new_server,              "ERROR: scryptSync not found"
assert b'$scrypt$' in new_server,               "ERROR: $scrypt$ prefix not found"
assert b'_hashPasswordLegacy' in new_server,    "ERROR: legacy hash compat not found"
assert b"startsWith('$scrypt$')" in new_server, "ERROR: scrypt detection not found"
assert b'hash migrado para scrypt' in new_server,"ERROR: auto-migration not found"
print('  OK: scryptSync + $scrypt$ prefix + legacy compat + auto-migration present')

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
