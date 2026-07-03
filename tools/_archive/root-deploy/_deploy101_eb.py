"""Deploy §135 — PatchEngine: aplica fix.after em arquivos reais

Alteracoes neste deploy vs v5.9.31-s134:
- backend/server.js:
  POST /api/security/apply-fix — nova rota:
  (1) recebe { violation: {file, line, rule_id}, fix: {after, suggestion}, project_root? }
  (2) resolve caminho seguro (path traversal → 403)
  (3) lê arquivo real do filesystem
  (4) faz backup automático (.bak-s135-TIMESTAMP)
  (5) substitui linha violadora pelo fix.after
  (6) retorna { before, after, diff_preview, backup_created }
  Proteções: traversal blocked (403), file not found (404), line out of range (400)

Zero mudança em goRunner.js, Go Core binary ou frontend bundle
(bundle só recebe botão APLICAR FIX — ver frontend/assets/vision-core-bundle.js)

NOTA: ZIP armazena backend files SEM prefixo 'backend/' — lição aprendida no §134.
"""
import zipfile, io, subprocess, sys
from pathlib import Path

ROOT      = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND   = ROOT / 'backend'
APP_VERS  = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.31-s134.zip'
NEW_ZIP   = APP_VERS / 'vision-core-v5.9.32-s135.zip'
LINUX_BIN = ROOT / 'bin' / 'vision-core-linux'
S3_BUCKET = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY    = 'vision-core-v5.9.32-s135.zip'
APP_NAME  = 'vision-core'
ENV_NAME  = 'vision-core-prod'
REGION    = 'us-east-1'
VER_LABEL = 'v5.9.32-s135-patchengine-apply'

# ZIP-internal paths (NO 'backend/' prefix — EB ZIP stores at root level)
UPDATES = {
    'server.js': ROOT / 'backend' / 'server.js',
}

print('Reading Linux binary...')
with open(LINUX_BIN, 'rb') as f:
    linux_bin_bytes = f.read()
print(f'  vision-core-linux: {len(linux_bin_bytes):,} bytes')

print('Reading updated files...')
updates_content = {}
for zip_path, local_path in UPDATES.items():
    with open(local_path, 'rb') as f:
        updates_content[zip_path] = f.read()
    print(f'  {zip_path}: {len(updates_content[zip_path]):,} bytes')

print('Building zip...')
buf = io.BytesIO()
import zipfile as zf
with zf.ZipFile(LATEST_ZIP, 'r') as src:
    with zf.ZipFile(buf, 'w', zf.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            norm = item.filename.lstrip('./')
            if norm in updates_content:
                print(f'  Skipping old: {item.filename}')
                continue
            if item.filename in ('bin/vision-core', './bin/vision-core'):
                continue
            dst.writestr(item, src.read(item.filename))

        for zip_path, content in updates_content.items():
            info = zf.ZipInfo(zip_path)
            info.compress_type = zf.ZIP_DEFLATED
            dst.writestr(info, content)
            print(f'  Updated: {zip_path} ({len(content):,} bytes, §135)')

        info2 = zf.ZipInfo('bin/vision-core')
        info2.compress_type = zf.ZIP_DEFLATED
        info2.external_attr = 0o755 << 16
        dst.writestr(info2, linux_bin_bytes)
        print(f'  Kept: bin/vision-core ({len(linux_bin_bytes):,} bytes)')

        hook_info = zf.ZipInfo('.platform/hooks/predeploy/01_chmod_gocore.sh')
        hook_info.compress_type = zf.ZIP_DEFLATED
        hook_info.external_attr = 0o755 << 16
        dst.writestr(hook_info, b'#!/bin/bash\nchmod +x /var/app/current/bin/vision-core 2>/dev/null || true\necho "[s135] chmod done"\n')

buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes -> {NEW_ZIP}')

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
print('Deploy triggered.')
