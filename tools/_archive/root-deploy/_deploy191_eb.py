"""Deploy §191 — SF Professional Identity: prompts funcionais com governança, segurança e specs"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.58-s190.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.59-s191.zip'
SERVER_SRC = BACKEND / 'server.js'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.59-s191.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.59-s191-sf-professional-identity'

print('Reading server.js...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  size: {len(new_server):,} bytes')

# §191 assertions
assert b'mission-composer step ramifica' not in new_server  # just confirms we didn't copy comment
assert b'if (step === 1)' in new_server, 'ERROR: mission-composer step=1 branch missing'
assert b'step === 3' in new_server, 'ERROR: mission-composer step=3 branch missing'
assert b'step === 4' in new_server, 'ERROR: mission-composer step=4 branch missing'
assert b'OWASP Top 10 aplicado' in new_server, 'ERROR: OWASP in mission-composer missing'
assert b'LGPD' in new_server and b'PCI-DSS' in new_server, 'ERROR: compliance gates missing'
assert b'max_tokens: 2000' in new_server, 'ERROR: deploy-blueprint 2000 tokens missing'
assert b'CONTRATO DE API' in new_server, 'ERROR: API contract in deploy-blueprint missing'
assert b'OWASP-01' in new_server and b'LGPD-01' in new_server, 'ERROR: gold-gate security gates missing'
assert b'G11' in new_server and b'G15' in new_server, 'ERROR: gold-gate spec gates missing'
assert b'CAMADA 1' in new_server and b'CAMADA 2' in new_server and b'CAMADA 3' in new_server, 'ERROR: project-files 3 layers missing'
assert b'.semgrep/semgrep.yaml' in new_server, 'ERROR: semgrep in project-files missing'
assert b'docs/openapi.yaml' in new_server, 'ERROR: openapi in project-files missing'
assert b'docs/adr/0001-stack-decision.md' in new_server, 'ERROR: ADR in project-files missing'
assert b'USER node' in new_server, 'ERROR: Dockerfile USER node instruction missing'
print('  OK: §191 — all assertions pass')

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
print(f'OK - version: {VER_LABEL}')
