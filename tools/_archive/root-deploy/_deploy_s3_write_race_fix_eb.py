"""Deploy -- 2 correcoes aprovadas do diagnostico de perda de dados via S3
(ver docs/CURRENT_STATE.md RISCOS CONHECIDOS, achado 2026-07-20):

Item 1: _s3PutAsync usava so Date.now() no nome do arquivo temp -- duas escritas
concorrentes pra stores DIFERENTES podiam colidir no mesmo milissegundo, subindo
o conteudo errado pra chave errada (achado real: chat-conversations.json continha
conteudo de operation-log.json). Fix: crypto.randomBytes(6) no sufixo do nome.

Item 2: AGENT_COSTS_DB e AUDIT_LOG_FILE gravavam no S3 mas nunca eram lidos de
volta no boot (fora da lista _s3LoadSync) -- historico resetava a cada restart,
garantido, nao so por corrida de timing. Fix: adicionados a lista existente.

Uma 3a corrida real foi encontrada (leitura-modificacao-escrita concorrente
perdendo registros na MESMA store) mas fica FORA de escopo desta entrega --
documentada em CURRENT_STATE.md, nao corrigida aqui (decisao explicita do usuario).

Base: vision-core-v5.9.76-agent-pairings-s3-fix.zip."""
import zipfile, io
from pathlib import Path

REPO_ROOT  = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = REPO_ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk/app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.76-agent-pairings-s3-fix.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.77-s3-write-race-fix.zip'
SERVER_SRC = BACKEND / 'server.js'

print('Reading server.js...')
new_server = SERVER_SRC.read_text(encoding='utf-8').encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

# Regressao: fixes de deploys anteriores nao foram perdidos.
assert b'GROUNDING REAL' in new_server, 'ERROR: Hermes fine-tuning grounding block missing'
assert b"app.set('trust proxy', 1);" in new_server, 'ERROR: trust proxy setting missing'
assert b'isSfRealExecutionAgentAllowed' in new_server, 'ERROR: SF allowlist gate missing'
assert b'const AGENT_PAIRINGS_DB' in new_server, 'ERROR: AGENT_PAIRINGS_DB const missing'
assert b'_s3LoadSync(AGENT_PAIRINGS_DB);' in new_server, 'ERROR: agentPairings S3 pull-before-boot missing'

# Novo nesta entrega.
assert b"'vc146_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex') + '.json'" in new_server, 'ERROR: temp filename entropy fix missing'
assert b'_s3LoadSync(AGENT_COSTS_DB);' in new_server, 'ERROR: AGENT_COSTS_DB not added to S3 boot-load list'
assert b'_s3LoadSync(AUDIT_LOG_FILE);' in new_server, 'ERROR: AUDIT_LOG_FILE not added to S3 boot-load list'
idx_load_costs = new_server.index(b'_s3LoadSync(AGENT_COSTS_DB);')
idx_load_audit = new_server.index(b'_s3LoadSync(AUDIT_LOG_FILE);')
idx_listen_block = new_server.index(b"console.log('[s3] \xc2\xa7146 startup load done');")
assert idx_load_costs < idx_listen_block and idx_load_audit < idx_listen_block, 'ERROR: new S3 loads not inside startup block'
print('  OK: regression + Item 1/Item 2 assertions pass')

print('Building zip...')
buf = io.BytesIO()
with zipfile.ZipFile(LATEST_ZIP, 'r') as src:
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if any(x in item.filename for x in ['.log', '.tmp', 'stderr', 'stdout']):
                continue
            if item.filename.lstrip('./') == 'server.js':
                dst.writestr(item, new_server)
                print(f'  Replaced: {item.filename}')
            else:
                dst.writestr(item, src.read(item.filename))
buf.seek(0)
NEW_ZIP.write_bytes(buf.read())
print(f'  OK: {NEW_ZIP.stat().st_size:,} bytes -> {NEW_ZIP}')
