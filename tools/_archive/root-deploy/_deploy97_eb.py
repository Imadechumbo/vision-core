"""Deploy §130 — PI Harness V3.0.0: binario Linux Go Core + fixes missionRoot

Alteracoes neste deploy vs v5.9.24-s129:
- bin/vision-core-linux (Linux amd64): compilado de go-core/cmd/vision-core/
  incluido no zip como bin/vision-core (nome esperado pelo EB: /var/app/bin/vision-core).
  Producao anteriormente retornava go_core_unavailable — agora executara o binario real.
- server.js: missionRoot corrigido — removido '..' que causava scan do Desktop inteiro
  em vez da raiz do projeto, gerando timeout de 30s no Go binary.
- backend/src/runtime/goRunner.js: --dry-run flag removido — binary nao suporta
  o sub-flag para o subcomando 'mission' (causava hang indefinido).

Zero mudanca em variáveis de ambiente.
"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.24-s129.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.28-s130d.zip'
SERVER_SRC = BACKEND / 'server.js'
GORUNNER   = BACKEND / 'src' / 'runtime' / 'goRunner.js'
LINUX_BIN  = ROOT / 'bin' / 'vision-core-linux'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.28-s130d.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.28-s130d-chmod-programatico'

# ── leitura dos arquivos novos ───────────────────────────────────────────────
print('Reading source files...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

with open(GORUNNER, encoding='utf-8') as f:
    new_gorunner = f.read().encode('utf-8')
print(f'  goRunner.js: {len(new_gorunner):,} bytes')

linux_bin_bytes = LINUX_BIN.read_bytes()
print(f'  vision-core-linux: {len(linux_bin_bytes):,} bytes')

# ── verificacoes de segurança ────────────────────────────────────────────────
assert b'missionRoot = path.resolve(process.env.VISION_PROJECT_ROOT || ROOT || process.cwd())' in new_server, \
    'ERROR: missionRoot fix not found in server.js (should NOT have ..'
assert b"// if (dryRun) missionArgs.push('--dry-run')" in new_gorunner, \
    'ERROR: --dry-run removal not found in goRunner.js'
assert b'process.env.VISION_PROJECT_ROOT || process.cwd()' in new_gorunner, \
    'ERROR: repoRoot fix not found in goRunner.js'
assert b'fs.chmodSync(candidate, 0o755)' in new_gorunner, \
    'ERROR: chmod programático não encontrado no goRunner.js'
assert b'archivistSearch' in new_server, \
    'ERROR: archivistSearch missing (regression §129)'
assert b'apply_patch_multi' in new_server, \
    'ERROR: apply_patch_multi missing (regression)'
assert b'sf_dry_run_real' in new_server, \
    'ERROR: sf_dry_run_real missing (regression)'
assert b'anti_stub' in new_server, \
    'ERROR: anti_stub missing (regression)'
assert len(linux_bin_bytes) > 10_000_000, \
    f'ERROR: Linux binary too small ({len(linux_bin_bytes)} bytes) — compile failed?'
print('  OK: §130 changes verified, no regressions')

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
            elif 'src/runtime/goRunner.js' in item.filename or item.filename == './src/runtime/goRunner.js':
                dst.writestr(item, new_gorunner)
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))
        # Adiciona o binario Linux como bin/vision-core (sem extensao — Linux)
        import zipfile as zf
        info = zf.ZipInfo('bin/vision-core')
        info.compress_type = zf.ZIP_DEFLATED
        info.external_attr = 0o755 << 16  # rwxr-xr-x
        dst.writestr(info, linux_bin_bytes)
        print(f'  Added: bin/vision-core ({len(linux_bin_bytes):,} bytes, Linux amd64)')
        # Hook predeploy: chmod +x no binario (EB nao honra permissoes do zip)
        chmod_script = b'#!/bin/bash\nchmod +x /var/app/current/bin/vision-core 2>/dev/null || true\nchmod +x /var/app/bin/vision-core 2>/dev/null || true\necho "[s130] go-core binary chmod +x applied"\n'
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
