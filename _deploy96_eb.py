"""Deploy §129 — Archivist no loop de decisao: Hermes + OpenClaw

Alteracoes neste deploy vs v5.9.22-s126:
- server.js: funcoes internas archivistSearch() e archivistSave() criadas
  (acesso direto ao FS, sem HTTP, nunca bloqueiam o fluxo principal).
  /api/openclaw/orchestrate: busca Archivist antes do callLLM, salva plano depois.
  /api/chat (Hermes): busca Archivist antes do callHermes, salva resumo depois.
  Archivist eh sempre best-effort: erros logados com [Archivist] prefix, nunca propagados.

So server.js mudou. vision-agent.js, agent-queue-db.js e hermes-rca.js intocados.
"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.22-s126.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.24-s129.zip'
SERVER_SRC = BACKEND / 'server.js'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.24-s129.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.24-s129-archivist'

# ── leitura dos arquivos novos ───────────────────────────────────────────────
print('Reading source files...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

# ── verificacoes de segurança ────────────────────────────────────────────────
assert b'archivistSearch' in new_server, \
    'ERROR: archivistSearch not found in server.js'
assert b'archivistSave' in new_server, \
    'ERROR: archivistSave not found in server.js'
assert b'[Archivist] search failed' in new_server, \
    'ERROR: Archivist error guard not found'
assert b'[Archivist] save failed' in new_server, \
    'ERROR: Archivist save error guard not found'
assert b'hermes-' in new_server, \
    'ERROR: hermes- key prefix not found (archivist save after Hermes)'
assert b'openclaw-' in new_server, \
    'ERROR: openclaw- key prefix not found (archivist save after OpenClaw)'
assert b'_s129systemPrompt' in new_server, \
    'ERROR: _s129systemPrompt not found (Hermes archivist injection)'
assert b'_s129ocSystem' in new_server, \
    'ERROR: _s129ocSystem not found (OpenClaw archivist injection)'
# regressoes
assert b'OpenClaw, the Patch Strategist' in new_server, \
    'ERROR: OpenClaw system prompt missing (regression)'
assert b'agentQueueDB' in new_server, \
    'ERROR: agentQueueDB missing (regression)'
assert b'apply_patch_multi' in new_server, \
    'ERROR: apply_patch_multi missing (regression)'
assert b'sf_dry_run_real' in new_server, \
    'ERROR: sf_dry_run_real missing (regression)'
assert b'anti_stub' in new_server, \
    'ERROR: anti_stub missing (regression)'
print('  OK: §129 changes verified, no regressions')

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
            else:
                dst.writestr(item, src.read(item.filename))

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
