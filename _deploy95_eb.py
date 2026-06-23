"""Deploy §126 — OpenClaw real: patch strategist com callLLM

Alteracoes neste deploy vs v5.9.14-s115:
- server.js: /api/openclaw/orchestrate handler torna-se async;
  para decision='diagnose' (message/prompt/question), chama callLLM
  com system prompt de patch strategist e retorna plano JSON estruturado
  (mission_summary, tasks[], risk_level, pass_gold_required).
  Fallback local quando LLM indisponivel: plan=null, llm_provider='local'.
  Outros casos (zip, patch, mission_id) sem mudanca — so roteamento.

So server.js mudou. vision-agent.js e agent-queue-db.js intocados.
"""
import zipfile, subprocess, sys, io
from pathlib import Path

ROOT       = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk' / 'app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.14-s115.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.22-s126.zip'
SERVER_SRC = BACKEND / 'server.js'
S3_BUCKET  = 'elasticbeanstalk-us-east-1-374894298219'
S3_KEY     = 'vision-core-v5.9.22-s126.zip'
APP_NAME   = 'vision-core'
ENV_NAME   = 'vision-core-prod'
REGION     = 'us-east-1'
VER_LABEL  = 'v5.9.22-s126-openclaw-real'

# ── leitura dos arquivos novos ───────────────────────────────────────────────
print('Reading source files...')
with open(SERVER_SRC, encoding='utf-8') as f:
    new_server = f.read().encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

# ── verificacoes de segurança ────────────────────────────────────────────────
assert b'OpenClaw, the Patch Strategist' in new_server, \
    'ERROR: OpenClaw system prompt not found in server.js'
assert b'async (req, res) =>' in new_server, \
    'ERROR: openclaw handler is not async'
assert b"decision === 'diagnose'" in new_server, \
    'ERROR: diagnose branch not found in server.js'
assert b'pass_gold_required' in new_server, \
    'ERROR: pass_gold_required not found in OpenClaw prompt'
assert b'llm_provider' in new_server, \
    'ERROR: llm_provider field not found in server.js'
assert b'orchestration_real' in new_server, \
    'ERROR: orchestration_real not found (regression)'
assert b'agentQueueDB' in new_server, \
    'ERROR: agentQueueDB not found in server.js (regression)'
assert b'apply_patch_multi' in new_server, \
    'ERROR: apply_patch_multi missing (regression)'
assert b'sf_dry_run_real' in new_server, \
    'ERROR: sf_dry_run_real missing (regression)'
assert b'anti_stub' in new_server, \
    'ERROR: anti_stub missing (regression)'
print('  OK: §126 changes verified, no regressions')

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
