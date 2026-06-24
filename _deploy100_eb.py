"""Deploy §134 — Fix automático L3 + Report de violations no frontend

Alteracoes neste deploy vs v5.9.30-s133:
- backend/server.js:
  (1) VIOLATION_FIX_PROMPTS map + generateViolationFixes() — prompts especificos
      por rule_id (AEGIS_SECRET_009/010, AEGIS_CRYPTO, AEGIS_INJECTION, AEGIS_EXPOSURE)
      com fallback generico para outros rule_ids.
  (2) POST /api/security/suggest-fixes — nova rota, aceita violations[], chama Hermes,
      retorna sugestoes de patch (fix.after, fix.env_var, fix.suggestion).
  (3) /api/run-live: apos runGoMission(), se security_violations.length > 0,
      chama generateViolationFixes() e adiciona security_fix_suggestions no response.
      Always best-effort — nunca bloqueia o fluxo.
- backend/src/runtime/goRunner.js:
  - normalizeGoResult() agora passa security_violations, security_blocking_violations,
    security_report_only_violations, security_total_violations do Go Core para o response.
    Antes esses campos eram ignorados pelo normalizador.
- frontend/assets/vision-core-bundle.js:
  - renderSecurityViolations(violations, fixSuggestions) — novo componente que exibe
    painel de violations AEGIS com sugestoes Hermes no Mission Control.
  - Injetado em 2 pontos: pos-renderApplyFixPanel e pos-renderStandardMethodPanel.

Zero mudanca no Go Core binary (nao recompilado — scanner ja estava ok do s133).
"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.30-s133.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.31-s134.zip'
LINUX_BIN  = ROOT / 'bin' / 'vision-core-linux'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.31-s134.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.31-s134-security-fixes-ui'

# Files to update in the zip (relative path inside zip -> local path)
# IMPORTANT: EB ZIP stores backend files WITHOUT 'backend/' prefix at root level.
# server.js in ZIP = server.js (not backend/server.js)
# src/runtime/goRunner.js in ZIP = src/runtime/goRunner.js (not backend/src/...)
UPDATES = {
    'server.js':                    ROOT / 'backend' / 'server.js',
    'src/runtime/goRunner.js':      ROOT / 'backend' / 'src' / 'runtime' / 'goRunner.js',
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
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            # Skip files we are replacing
            norm = item.filename.lstrip('./')
            if norm in updates_content:
                continue
            if item.filename in ('bin/vision-core', './bin/vision-core'):
                continue
            dst.writestr(item, src.read(item.filename))

        import zipfile as zf

        # Write updated backend files
        for zip_path, content in updates_content.items():
            info = zf.ZipInfo(zip_path)
            info.compress_type = zf.ZIP_DEFLATED
            dst.writestr(info, content)
            print(f'  Updated: {zip_path} ({len(content):,} bytes, §134)')

        # Keep Linux binary
        info = zf.ZipInfo('bin/vision-core')
        info.compress_type = zf.ZIP_DEFLATED
        info.external_attr = 0o755 << 16
        dst.writestr(info, linux_bin_bytes)
        print(f'  Kept: bin/vision-core ({len(linux_bin_bytes):,} bytes, from s133)')

        chmod_script = b'#!/bin/bash\nchmod +x /var/app/current/bin/vision-core 2>/dev/null || true\nchmod +x /var/app/bin/vision-core 2>/dev/null || true\necho "[s134] go-core binary chmod +x applied"\n'
        hook_info = zf.ZipInfo('.platform/hooks/predeploy/01_chmod_gocore.sh')
        hook_info.compress_type = zf.ZIP_DEFLATED
        hook_info.external_attr = 0o755 << 16
        dst.writestr(hook_info, chmod_script)
        print(f'  Added: .platform/hooks/predeploy/01_chmod_gocore.sh')

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
