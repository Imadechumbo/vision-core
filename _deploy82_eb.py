"""
Deploy §82 server.js to Elastic Beanstalk.
Strategy: clone latest zip (v5.8.0-s80), replace server.js, upload to S3, create EB version, deploy.
"""
import zipfile, os, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.8.0-s80.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.8.2-s82.zip'
SERVER_SRC = BACKEND / 'server.js'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.8.2-s82.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.8.2-s82-sf-modules-key-rotation'

# ── 1. Read new server.js ──────────────────────────────────────────────────────
print('Reading updated server.js...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  server.js size: {len(new_server):,} bytes')

# Verify §82 is present
assert b'SF_GENERATORS' in new_server, 'ERROR: SF_GENERATORS not found in server.js'
assert b'resolveApiKey' in new_server, 'ERROR: resolveApiKey not found in server.js'
assert b'/api/sf/' in new_server, 'ERROR: /api/sf/ routes not found in server.js'
print('  OK: s82 fields confirmed (SF_GENERATORS, resolveApiKey, /api/sf/)')

# ── 2. Clone existing zip, replace server.js ──────────────────────────────────
print('Building new zip...')
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src_zip:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst_zip:
        for item in src_zip.infolist():
            # Skip logs and temp files
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            if item.filename in ('server.js', './server.js'):
                dst_zip.writestr(item, new_server)
                print(f'  Replaced: {item.filename} ({len(new_server):,} bytes)')
            else:
                dst_zip.writestr(item, src_zip.read(item.filename))

buf.seek(0)
with open(NEW_ZIP, 'wb') as f:
    f.write(buf.read())
print(f'  OK New zip: {NEW_ZIP} ({NEW_ZIP.stat().st_size:,} bytes)')

# ── 3. Upload to S3 ────────────────────────────────────────────────────────────
print(f'Uploading to s3://{S3_BUCKET}/{S3_KEY}...')
r = subprocess.run([
    'aws', 's3', 'cp', str(NEW_ZIP),
    f's3://{S3_BUCKET}/{S3_KEY}',
    '--region', REGION, '--no-verify-ssl'
], capture_output=True, text=True)
if r.returncode != 0:
    print(f'  S3 upload FAILED:\n{r.stderr}'); sys.exit(1)
print(f'  OK Uploaded')

# ── 4. Create application version ─────────────────────────────────────────────
print(f'Creating EB version {VER_LABEL}...')
r = subprocess.run([
    'aws', 'elasticbeanstalk', 'create-application-version',
    '--application-name', APP_NAME,
    '--version-label', VER_LABEL,
    '--source-bundle', f'S3Bucket={S3_BUCKET},S3Key={S3_KEY}',
    '--region', REGION, '--no-verify-ssl',
    '--auto-create-application'
], capture_output=True, text=True)
if r.returncode != 0 and 'already exists' not in r.stderr:
    print(f'  create-application-version FAILED:\n{r.stderr}'); sys.exit(1)
print(f'  OK Version {VER_LABEL} ready')

# ── 5. Deploy ─────────────────────────────────────────────────────────────────
print(f'Deploying to {ENV_NAME}...')
r = subprocess.run([
    'aws', 'elasticbeanstalk', 'update-environment',
    '--application-name', APP_NAME,
    '--environment-name', ENV_NAME,
    '--version-label', VER_LABEL,
    '--region', REGION, '--no-verify-ssl'
], capture_output=True, text=True)
if r.returncode != 0:
    print(f'  update-environment FAILED:\n{r.stderr}'); sys.exit(1)
print(f'  OK Deploy started')
print(f'\nMonitor: aws elasticbeanstalk describe-environments --environment-names {ENV_NAME} --no-verify-ssl')
print(f'Version: {VER_LABEL}')
