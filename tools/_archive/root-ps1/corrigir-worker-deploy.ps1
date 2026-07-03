# =============================================================
#  VISION CORE — CORRIGIR WORKER + COMPLETAR DEPLOY
#
#  Problema: workers.dev subdomain desabilitado no Cloudflare.
#  Solucao: habilitar no Dashboard (1 clique) ou adicionar rota.
#
#  Execute em: C:\Users\imadechumbo\Desktop\vision-core\
# =============================================================

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — CORRIGIR WORKER" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Problema detectado: x-deny-reason: host_not_allowed" -ForegroundColor Red
Write-Host "  O subdominio workers.dev esta desabilitado para este Worker." -ForegroundColor Yellow
Write-Host ""
Write-Host "  SOLUCAO — 3 passos no Cloudflare Dashboard:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Acesse: https://dash.cloudflare.com" -ForegroundColor White
Write-Host "     -> Workers & Pages" -ForegroundColor White
Write-Host "     -> visioncore-api-gateway" -ForegroundColor White
Write-Host "     -> Settings -> Domains & Routes" -ForegroundColor White
Write-Host ""
Write-Host "  2. Em 'workers.dev' habilite o toggle:" -ForegroundColor White
Write-Host "     [Enabled] workers.dev" -ForegroundColor Green
Write-Host "     (se ja estiver enabled, desabilite e habilite de novo)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Clique Save." -ForegroundColor White
Write-Host ""
Write-Host "  Abrindo Cloudflare Dashboard..." -ForegroundColor Yellow
Start-Process "https://dash.cloudflare.com/?to=/:account/workers/services/view/visioncore-api-gateway/production/settings/domains"
Write-Host ""
Read-Host "  Pressione ENTER depois de habilitar o workers.dev"
Write-Host ""

# Verificar worker
Write-Host "  Verificando Worker..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $res = Invoke-RestMethod `
        -Uri "https://visioncore-api-gateway.weiganlight.workers.dev/health" `
        -TimeoutSec 10
    if ($res.ok) {
        Write-Host "  [OK] Worker ONLINE — versao $($res.version)" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Worker respondeu mas sem ok:true" -ForegroundColor Yellow
        Write-Host "  Resposta: $($res | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [FAIL] Worker ainda offline: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Aguarde 1 minuto e teste manualmente:" -ForegroundColor Yellow
    Write-Host "  curl https://visioncore-api-gateway.weiganlight.workers.dev/health" -ForegroundColor Gray
}
Write-Host ""

# ────────────────────────────────────────────────────────────
# BACKEND ZIP para upload manual
# ────────────────────────────────────────────────────────────
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "  BACKEND — ZIP PARA DEPLOY NO ELASTIC BEANSTALK" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""

$zipPath = ".\vision-core-backend-deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Copiar backend sem node_modules
$tmpDir = ".\__bk_tmp"
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
Copy-Item -Path "backend\*" -Destination $tmpDir -Recurse -Force
$nmPath = Join-Path $tmpDir "node_modules"
if (Test-Path $nmPath) { Remove-Item $nmPath -Recurse -Force }

# Criar ZIP
Compress-Archive -Path "$tmpDir\*" -DestinationPath $zipPath -Force
Remove-Item $tmpDir -Recurse -Force

$sizeMB = [Math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "  ZIP criado: $zipPath ($sizeMB MB)" -ForegroundColor Green
Write-Host ""
Write-Host "  Para deployar no Elastic Beanstalk:" -ForegroundColor Cyan
Write-Host "  1. https://console.aws.amazon.com/elasticbeanstalk" -ForegroundColor White
Write-Host "  2. Ambiente: tngh-aws-final-v2-env" -ForegroundColor White
Write-Host "  3. Upload and deploy -> selecione $zipPath" -ForegroundColor White
Write-Host "  4. Aguarde ~3 min ate ficar verde (Health: Ok)" -ForegroundColor White
Write-Host ""
Write-Host "  VARIAVEIS DE AMBIENTE necessarias no EB:" -ForegroundColor Yellow
Write-Host "  JWT_SECRET          = (gere com: openssl rand -hex 32)" -ForegroundColor Gray
Write-Host "  PORT                = 8080" -ForegroundColor Gray
Write-Host "  NODE_ENV            = production" -ForegroundColor Gray
Write-Host "  VISION_PROJECT_ROOT = /var/app/current" -ForegroundColor Gray
Write-Host ""
Write-Host "  Como adicionar env vars no EB:" -ForegroundColor Cyan
Write-Host "  Console AWS -> EB -> seu ambiente -> Configuration" -ForegroundColor White
Write-Host "  -> Software -> Environment properties" -ForegroundColor White
Write-Host ""

$openAws = Read-Host "  Abrir AWS Console? (s/N)"
if ($openAws -match "^[Ss]$") {
    Start-Process "https://console.aws.amazon.com/elasticbeanstalk/home#/environments"
}
Write-Host ""
Read-Host "  Pressione ENTER quando o Backend estiver deployado"
Write-Host ""

# ────────────────────────────────────────────────────────────
# FRONTEND — verificar Cloudflare Pages
# ────────────────────────────────────────────────────────────
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "  FRONTEND — CLOUDFLARE PAGES" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  O codigo V14 Gold ja esta na main do GitHub." -ForegroundColor Green
Write-Host "  Cloudflare Pages faz deploy automatico no push." -ForegroundColor Green
Write-Host ""
Write-Host "  Configuracao obrigatoria no Pages:" -ForegroundColor Cyan
Write-Host "  Repositorio  : Imadechumbo/vision-core" -ForegroundColor White
Write-Host "  Branch       : main" -ForegroundColor White
Write-Host "  Build cmd    : (deixar vazio)" -ForegroundColor White
Write-Host "  Output dir   : frontend" -ForegroundColor White
Write-Host ""
Write-Host "  IMPORTANTE — _redirects ja configurado:" -ForegroundColor Yellow
Write-Host "  /api/* -> https://visioncore-api-gateway.weiganlight.workers.dev/api/:splat" -ForegroundColor Gray
Write-Host "  (todas as chamadas /api/ vao direto para o Worker)" -ForegroundColor Gray
Write-Host ""

$openPages = Read-Host "  Abrir Cloudflare Pages? (s/N)"
if ($openPages -match "^[Ss]$") {
    Start-Process "https://dash.cloudflare.com/?to=/:account/pages"
}
Write-Host ""
Read-Host "  Pressione ENTER quando o Frontend estiver deployado"
Write-Host ""

# ────────────────────────────────────────────────────────────
# VERIFICACAO FINAL
# ────────────────────────────────────────────────────────────
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  VERIFICACAO FINAL END-TO-END" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

$checks = @(
    @{ url = "https://visioncore-api-gateway.weiganlight.workers.dev/health";      label = "Worker health" },
    @{ url = "https://visioncore-api-gateway.weiganlight.workers.dev/api/projects";label = "API projects" },
    @{ url = "https://visioncore-api-gateway.weiganlight.workers.dev/api/workers/status"; label = "API workers" },
    @{ url = "https://visioncore-api-gateway.weiganlight.workers.dev/api/pass-gold/score"; label = "PASS GOLD score (deve ser false sem evidence)" }
)

foreach ($c in $checks) {
    try {
        $r = Invoke-RestMethod -Uri $c.url -TimeoutSec 10
        $label = $c.label
        if ($label -like "*pass-gold*") {
            $status = if (-not $r.pass_gold) { "[OK - BLOQUEADO corretamente]" } else { "[AVISO - retornou GOLD sem evidence]" }
            $color  = if (-not $r.pass_gold) { "Green" } else { "Red" }
            Write-Host "  $status $label" -ForegroundColor $color
        } else {
            Write-Host "  [OK] $label" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [FAIL] $($c.label) — $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "  Testando POST /api/copilot..." -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod `
        -Uri "https://visioncore-api-gateway.weiganlight.workers.dev/api/copilot" `
        -Method POST -ContentType "application/json" `
        -Body '{"message":"Vision Core V14 health check","context":{}}' `
        -TimeoutSec 15
    Write-Host "  [OK] POST /api/copilot — resposta: $($r.answer | Select-Object -First 80)" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] POST /api/copilot — $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  VISION CORE V14 GOLD — SISTEMA PRONTO" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  : https://visioncoreai.pages.dev" -ForegroundColor Cyan
Write-Host "  Worker    : https://visioncore-api-gateway.weiganlight.workers.dev" -ForegroundColor Cyan
Write-Host "  Backend   : http://tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Teste rapido do frontend local:" -ForegroundColor Yellow
Write-Host "  cd frontend && python -m http.server 5500" -ForegroundColor White
Write-Host "  Abra: http://localhost:5500" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
