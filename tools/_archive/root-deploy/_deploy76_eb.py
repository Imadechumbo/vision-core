"""
Deploy §76 server.js to Elastic Beanstalk.
Strategy: clone latest zip, replace server.js, upload to S3, create EB version, deploy.
"""
import zipfile, os, subprocess, sys
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v3.0.0-vision-api.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.7.0-s76.zip'
SERVER_SRC = BACKEND / 'server.js'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.7.0-s76.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.7.0-s76-unified-agent'

# ── 1. Read new server.js ──────────────────────────────────────────────────────
print('Reading updated server.js...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  server.js size: {len(new_server):,} bytes')

# Verify §76 is present
assert b'_intent76' in new_server, 'ERROR: §76 intent code not found in server.js'
assert b'spec/summary' in new_server, 'ERROR: §76 spec/summary not found in server.js'
assert b"mode === 'create'" in new_server, 'ERROR: §76 create mode not found in server.js'
print('  ✓ §76 fields confirmed (intent, spec/summary, create mode)')

# ── 2. Clone existing zip, replace server.js ──────────────────────────────────
print('Building new zip...')
import io
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src_zip:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst_zip:
        for item in src_zip.infolist():
            # Skip log files and .deploy marker
            if item.filename in ('server.stderr.log', 'server.stdout.log', '.deploy'):
                continue
            if item.filename == 'server.js':
                dst_zip.writestr(item.filename, new_server)
                print(f'  ✓ replaced server.js ({len(new_server):,} bytes)')
            else:
                dst_zip.writestr(item, src_zip.read(item.filename))

zip_bytes = buf.getvalue()
print(f'  New zip size: {len(zip_bytes):,} bytes')

# Write zip file
with open(NEW_ZIP, 'wb') as f:
    f.write(zip_bytes)
print(f'  Wrote: {NEW_ZIP}')

# ── 3. Upload to S3 ────────────────────────────────────────────────────────────
print(f'Uploading to s3://{S3_BUCKET}/{S3_KEY}...')
result = subprocess.run([
    'aws', 's3', 'cp', str(NEW_ZIP),
    f's3://{S3_BUCKET}/{S3_KEY}',
    '--region', REGION, '--no-verify-ssl'
], capture_output=True, text=True)
if result.returncode != 0:
    print('S3 upload FAILED:')
    print(result.stderr)
    sys.exit(1)
print('  ✓ Uploaded to S3')

# ── 4. Create EB application version ──────────────────────────────────────────
print(f'Creating EB version {VER_LABEL}...')
result = subprocess.run([
    'aws', 'elasticbeanstalk', 'create-application-version',
    '--application-name', APP_NAME,
    '--version-label', VER_LABEL,
    '--source-bundle', f'S3Bucket={S3_BUCKET},S3Key={S3_KEY}',
    '--region', REGION, '--no-verify-ssl',
    '--description', 'feat(§76): unified agent intent routing + create pipeline + spec/summary'
], capture_output=True, text=True)
if result.returncode != 0:
    print('Create version FAILED:')
    print(result.stderr)
    sys.exit(1)
print(f'  ✓ Version created: {VER_LABEL}')

# ── 5. Update EB environment ───────────────────────────────────────────────────
print(f'Deploying to {ENV_NAME}...')
result = subprocess.run([
    'aws', 'elasticbeanstalk', 'update-environment',
    '--application-name', APP_NAME,
    '--environment-name', ENV_NAME,
    '--version-label', VER_LABEL,
    '--region', REGION, '--no-verify-ssl'
], capture_output=True, text=True)
if result.returncode != 0:
    print('Update environment FAILED:')
    print(result.stderr)
    sys.exit(1)
print(f'  ✓ Environment update triggered')
print()
print('Deploy in progress. EB takes ~3-5 min to swap instances.')
print(f'Monitor: aws elasticbeanstalk describe-environments --environment-names {ENV_NAME} --no-verify-ssl')
