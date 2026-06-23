"""Deploy §132 — Pipeline E2E: Go Core recompilado com fixture dirSkip

Alteracoes neste deploy vs v5.9.28-s130d:
- bin/vision-core-linux: recompilado com _fixture_stress + _archive adicionados ao
  dirSkip do AEGIS scanner — evita violations blocking de arquivos de teste/fixture.
  go-core/internal/security/secrets/secrets.go: dirSkip expandido.
  go-core/internal/security/types/types.go: ClassifySourceContext reconhece
  _fixture_stress como SourceContextTestFixture.
- Sem mudanca em server.js, goRunner.js ou variaveis de ambiente.

Zero mudanca em variaveis de ambiente.
"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.28-s130d.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.29-s132.zip'
LINUX_BIN  = ROOT / 'bin' / 'vision-core-linux'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.29-s132.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.29-s132-e2e-pipeline'

print('Reading Linux binary...')
with open(LINUX_BIN, 'rb') as f:
    linux_bin_bytes = f.read()
print(f'  vision-core-linux: {len(linux_bin_bytes):,} bytes')

print('Building zip...')
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            # Skip old binary — will replace below
            if item.filename in ('bin/vision-core', './bin/vision-core'):
                continue
            dst.writestr(item, src.read(item.filename))

        # Replace Linux binary with newly compiled version (fixture dirSkip)
        import zipfile as zf
        info = zf.ZipInfo('bin/vision-core')
        info.compress_type = zf.ZIP_DEFLATED
        info.external_attr = 0o755 << 16  # rwxr-xr-x
        dst.writestr(info, linux_bin_bytes)
        print(f'  Replaced: bin/vision-core ({len(linux_bin_bytes):,} bytes, Linux amd64 §132)')

        # chmod hook (preserve from §130)
        chmod_script = b'#!/bin/bash\nchmod +x /var/app/current/bin/vision-core 2>/dev/null || true\nchmod +x /var/app/bin/vision-core 2>/dev/null || true\necho "[s132] go-core binary chmod +x applied"\n'
        hook_info = zf.ZipInfo('.platform/hooks/predeploy/01_chmod_gocore.sh')
        hook_info.compress_type = zf.ZIP_DEFLATED
        hook_info.external_attr = 0o755 << 16
        dst.writestr(hook_info, chmod_script)
        print(f'  Added: .platform/hooks/predeploy/01_chmod_gocore.sh')

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
