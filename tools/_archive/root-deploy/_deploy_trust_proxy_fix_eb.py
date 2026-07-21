"""Deploy — corrige isLoopbackRequest() pra usar trust proxy + req.ip em vez
de req.socket.remoteAddress (ver commit e6aa5e95). A v5.9.71 fechava a
brecha de quota anonima "no papel" mas o EB roda nginx como reverse proxy
local, entao req.socket.remoteAddress era sempre 127.0.0.1 pra qualquer
requisicao externa — confirmado ao vivo em producao (chamada real sem auth
rodou uma missao completa). Base: vision-core-v5.9.71-pro-quota-gate.zip.

So server.js muda nesta entrega — nenhum require novo (auditado: mesmo
conjunto de require('./x') do commit ja deployado, 6aa69379)."""
import zipfile, io
from pathlib import Path

REPO_ROOT  = Path('C:/Users/imadechumbo/Desktop/vision-core')
BACKEND    = REPO_ROOT / 'backend'
APP_VERS   = BACKEND / '.elasticbeanstalk/app_versions'
LATEST_ZIP = APP_VERS / 'vision-core-v5.9.71-pro-quota-gate.zip'
NEW_ZIP    = APP_VERS / 'vision-core-v5.9.72-trust-proxy-fix.zip'
SERVER_SRC = BACKEND / 'server.js'

print('Reading server.js...')
new_server = SERVER_SRC.read_text(encoding='utf-8').encode('utf-8')
print(f'  server.js: {len(new_server):,} bytes')

# Regressao: confirma que fixes/wiring de deploys anteriores nao foram perdidos.
assert b'GROUNDING REAL' in new_server, 'ERROR: Hermes fine-tuning grounding block missing'
assert b"require('./llm-cost')" in new_server, 'ERROR: llm-cost require missing'
assert b'async function importToolsModule' in new_server, 'ERROR: importToolsModule helper missing'
assert b"require('./user-plan')" in new_server, 'ERROR: user-plan require missing'
assert b"require('./mission-quota')" in new_server, 'ERROR: mission-quota require missing'
assert b"require('./github-quality-gate')" in new_server, 'ERROR: github-quality-gate require missing'
assert b'evaluateGithubQualityGate(' in new_server, 'ERROR: quality gate call site missing'
assert b"return res.status(401).json({ ok: false, error: 'not_authenticated', time: now() });" in new_server, 'ERROR: 401 not_authenticated response missing'

# Novo nesta entrega: trust proxy + req.ip.
assert b"app.set('trust proxy', 1);" in new_server, 'ERROR: trust proxy setting missing'
assert b'const ip = req.ip;' in new_server, 'ERROR: isLoopbackRequest not using req.ip'
assert b'req.socket && req.socket.remoteAddress' not in new_server, 'ERROR: old socket-based check still present'
print('  OK: regression + trust-proxy assertions pass')

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
