"""Deploy pos-recriacao EB — publica server.js atual + provider-vault-crypto.js + provider-vault-routing.js
(arquivos novos desde o ultimo zip local, vision-core-v5.9.61-s193.zip) no ambiente recriado (Node.js 24)."""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
BASE_ZIP   = BACKEND / '.elasticbeanstalk' / 'app_versions' / 'vision-core-v5.9.61-s193.zip'
NEW_ZIP    = BACKEND / '.elasticbeanstalk' / 'app_versions' / 'vision-core-v5.9.62-eb-recreate.zip'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.62-eb-recreate.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.62-eb-recreate-node24-vault-d'

NEW_FILES = ['server.js', 'provider-vault-crypto.js', 'provider-vault-routing.js']

print('Reading current backend files...')
contents = {}
for fname in NEW_FILES:
    p = BACKEND / fname
    contents[fname] = p.read_bytes()
    print(f'  {fname}: {len(contents[fname]):,} bytes')

assert b'resolveProviderKey' in contents['server.js'], 'ERROR: vault routing wiring missing from server.js'
assert b'/api/deploy/pages' in contents['server.js'], 'ERROR: §205 deploy endpoints missing from server.js'
print('  OK: assertions pass (vault wiring + §205 endpoints present)')

print('Building zip...')
buf = io.BytesIO()
with zipfile.ZipFile(BASE_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if item.filename in contents:
                continue  # replaced below
            dst.writestr(item, src.read(item.filename))
        for fname, data in contents.items():
            dst.writestr(fname, data)
            print(f'  Written: {fname}')
buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes')

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0 and 'already exists' not in r.stderr:
        print(f'FAILED:\n{r.stderr}'); sys.exit(1)
    print(r.stdout)

run(['aws', 's3', 'cp', str(NEW_ZIP), f's3://{S3_BUCKET}/{S3_KEY}', '--region', REGION, '--no-verify-ssl'])
print('Uploaded S3')
run(['aws', 'elasticbeanstalk', 'create-application-version', '--application-name', APP_NAME,
     '--version-label', VER_LABEL, '--source-bundle', f'S3Bucket={S3_BUCKET},S3Key={S3_KEY}',
     '--region', REGION, '--no-verify-ssl', '--auto-create-application'])
run(['aws', 'elasticbeanstalk', 'update-environment', '--environment-name', ENV_NAME,
     '--version-label', VER_LABEL, '--region', REGION, '--no-verify-ssl'])
print(f'OK - version: {VER_LABEL}')
