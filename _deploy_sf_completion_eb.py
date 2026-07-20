"""Deploy -- bundles the 3 backend fixes left undeployed after v5.9.77
(ver docs/CURRENT_STATE.md, "so faltam as 2 PARADAS OBRIGATORIAS"):

1. atomicStoreUpdate() (838f618a) -- serializes read-modify-write per store,
   closing the concurrent lost-update race on USERS_DB/PROJECTS_DB/etc.
   server.js only.

2. S3 restart-durability for sfExecutionIntents + agent-queue.sqlite (9ef0aeb6)
   -- same pattern already proven for agentPairings, extended to the SF
   execution path so a real EB restart doesn't drop in-flight intents/queue.
   server.js + agent-queue-db.js.

3. Deterministic content-risk gate (49fcc1ab) -- scanFileContentRisk() makes
   the pre-execution Ponytail Audit gate genuinely reject hardcoded secrets /
   dangerous commands in SF-generated content, instead of approving by
   construction. server.js + sf-real-execution.js.

No new npm dependencies (only child_process/os, both Node builtins).
Base: vision-core-v5.9.77-s3-write-race-fix.zip (already has sf-real-execution.js
and agent-queue-db.js packaged from an earlier deploy -- confirmed via
zipfile.namelist() before writing this script)."""
import zipfile, io
from pathlib import Path

REPO_ROOT  = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = REPO_ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk/app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.77-s3-write-race-fix.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.78-sf-completion.zip'

FILES = {
    'server.js': (BACKEND / 'server.js').read_text(encoding='utf-8').encode('utf-8'),
    'sf-real-execution.js': (BACKEND / 'sf-real-execution.js').read_text(encoding='utf-8').encode('utf-8'),
    'agent-queue-db.js': (BACKEND / 'agent-queue-db.js').read_text(encoding='utf-8').encode('utf-8'),
}
for name, buf in FILES.items():
    print(f'  {name}: {len(buf):,} bytes')

server_js = FILES['server.js']
sf_real = FILES['sf-real-execution.js']
queue_db = FILES['agent-queue-db.js']

# Regressao: fixes de deploys anteriores nao foram perdidos.
assert b'GROUNDING REAL' in server_js, 'ERROR: Hermes fine-tuning grounding block missing'
assert b"app.set('trust proxy', 1);" in server_js, 'ERROR: trust proxy setting missing'
assert b'isSfRealExecutionAgentAllowed' in server_js, 'ERROR: SF allowlist gate missing'
assert b'_s3LoadSync(AGENT_PAIRINGS_DB);' in server_js, 'ERROR: agentPairings S3 pull-before-boot missing'
assert b"'vc146_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex') + '.json'" in server_js, 'ERROR: temp filename entropy fix missing'
assert b'_s3LoadSync(AGENT_COSTS_DB);' in server_js, 'ERROR: AGENT_COSTS_DB S3 boot-load missing'
assert b'_s3LoadSync(AUDIT_LOG_FILE);' in server_js, 'ERROR: AUDIT_LOG_FILE S3 boot-load missing'

# Novo nesta entrega -- item 1 (atomicStoreUpdate).
assert b'function atomicStoreUpdate(' in server_js, 'ERROR: atomicStoreUpdate missing'
assert b'_storeWriteQueues' in server_js, 'ERROR: per-store write queue missing'

# Novo nesta entrega -- item 2 (S3 durability sfExecutionIntents/agent-queue.sqlite).
assert b'_s3LoadSync(SF_EXECUTION_INTENTS_DB);' in server_js, 'ERROR: sfExecutionIntents S3 pull-before-boot missing'
assert b'function syncSfExecutionIntentsToS3(' in server_js, 'ERROR: syncSfExecutionIntentsToS3 missing'
assert b'_s3LoadRawSync' in server_js and b'_s3PutRawAsync' in server_js, 'ERROR: binary-safe S3 helpers missing'
assert b'setSyncHook' in queue_db, 'ERROR: agent-queue-db.js setSyncHook missing'
assert b'.setSyncHook(' in server_js, 'ERROR: server.js does not wire setSyncHook'

# Novo nesta entrega -- item 3 (deterministic content-risk gate).
assert b'function scanFileContentRisk(' in sf_real, 'ERROR: scanFileContentRisk missing'
assert b'contains_hardcoded_secret' in sf_real, 'ERROR: contains_hardcoded_secret claim missing'
assert b'contains_dangerous_command' in sf_real, 'ERROR: contains_dangerous_command claim missing'
assert b'contentRisk.ok' in server_js, 'ERROR: runSfDeterministicAudit does not read content_risk'

print('  OK: regression + item 1/2/3 assertions pass')

print('Building zip...')
buf = io.BytesIO()
replaced = set()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            base = item.filename.lstrip('./')
            if base in FILES:
                dst.writestr(item, FILES[base])
                replaced.add(base)
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))
buf.seek(0)
missing = set(FILES) - replaced
assert not missing, f'ERROR: files not found in base zip to replace: {missing}'
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes -> {NEW_ZIP}')
