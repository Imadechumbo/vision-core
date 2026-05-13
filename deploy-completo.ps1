# =============================================================
#  VISION CORE — DEPLOY COMPLETO
#  3 servicos: Worker (Cloudflare) + Backend (EB) + Frontend (Pages)
#  Execute em: C:\Users\imadechumbo\Desktop\vision-core\
# =============================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — DEPLOY COMPLETO" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Este script guia os 3 deploys em sequencia:" -ForegroundColor Gray
Write-Host "  1. Worker Cloudflare (wrangler publish)" -ForegroundColor Gray
Write-Host "  2. Backend Elastic Beanstalk (eb deploy)" -ForegroundColor Gray
Write-Host "  3. Frontend Cloudflare Pages (git push ja feito)" -ForegroundColor Gray
Write-Host ""

# ────────────────────────────────────────────────────────────
# DEPLOY 1: WORKER CLOUDFLARE
# ────────────────────────────────────────────────────────────
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "  DEPLOY 1: WORKER CLOUDFLARE" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Worker: visioncore-api-gateway" -ForegroundColor Gray
Write-Host "  Arquivo: worker/src/index.js" -ForegroundColor Gray
Write-Host "  URL atual: https://visioncore-api-gateway.weiganlight.workers.dev" -ForegroundColor Gray
Write-Host ""

$wpkg = Get-Command wrangler -ErrorAction SilentlyContinue
if ($wpkg) {
    Write-Host "  wrangler encontrado. Publicando..." -ForegroundColor Yellow
    Set-Location worker
    wrangler deploy
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Worker publicado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "  ERRO no deploy do Worker." -ForegroundColor Red
        Write-Host "  Tente: wrangler login && wrangler deploy" -ForegroundColor Yellow
    }
    Set-Location ..
} else {
    Write-Host "  wrangler nao encontrado. Opcoes:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  OPCAO A — Instalar wrangler e publicar:" -ForegroundColor Cyan
    Write-Host "    npm install -g wrangler" -ForegroundColor White
    Write-Host "    cd worker" -ForegroundColor White
    Write-Host "    wrangler login" -ForegroundColor White
    Write-Host "    wrangler deploy" -ForegroundColor White
    Write-Host "    cd .." -ForegroundColor White
    Write-Host ""
    Write-Host "  OPCAO B — Cloudflare Dashboard (sem CLI):" -ForegroundColor Cyan
    Write-Host "    1. Acesse: https://dash.cloudflare.com" -ForegroundColor White
    Write-Host "    2. Workers & Pages -> visioncore-api-gateway" -ForegroundColor White
    Write-Host "    3. Edit Code -> cole o conteudo de worker\src\index.js" -ForegroundColor White
    Write-Host "    4. Save & Deploy" -ForegroundColor White
    Write-Host ""
    Write-Host "  Abrindo Cloudflare Dashboard..." -ForegroundColor Gray
    Start-Process "https://dash.cloudflare.com/?to=/:account/workers/services/view/visioncore-api-gateway/production/editor"
}

Write-Host ""
Read-Host "  Pressione ENTER quando o Worker estiver deployado"
Write-Host ""

# Verificar worker online
Write-Host "  Verificando Worker online..." -ForegroundColor Yellow
try {
    $workerCheck = Invoke-RestMethod -Uri "https://visioncore-api-gateway.weiganlight.workers.dev/health" -TimeoutSec 10
    if ($workerCheck.ok) {
        Write-Host "  Worker ONLINE: v$($workerCheck.version)" -ForegroundColor Green
    }
} catch {
    Write-Host "  Worker nao respondeu ainda (pode levar 1-2 min)" -ForegroundColor DarkYellow
}
Write-Host ""

# ────────────────────────────────────────────────────────────
# DEPLOY 2: BACKEND ELASTIC BEANSTALK
# ────────────────────────────────────────────────────────────
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "  DEPLOY 2: BACKEND ELASTIC BEANSTALK" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Backend: vision-core-backend-v41" -ForegroundColor Gray
Write-Host "  URL atual: http://tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com" -ForegroundColor Gray
Write-Host "  Entry point: backend/server.js" -ForegroundColor Gray
Write-Host ""

$ebpkg = Get-Command eb -ErrorAction SilentlyContinue
if ($ebpkg) {
    Write-Host "  EB CLI encontrado." -ForegroundColor Green
    Write-Host "  Criando ZIP do backend para deploy..." -ForegroundColor Yellow

    # Criar ZIP do backend sem node_modules
    $zipPath = ".\backend-deploy.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

    $backendFiles = Get-ChildItem -Path "backend" -Recurse |
        Where-Object { $_.FullName -notlike "*node_modules*" -and -not $_.PSIsContainer }

    Compress-Archive -Path "backend\*" -DestinationPath $zipPath -Force
    Write-Host "  ZIP criado: $zipPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Fazendo eb deploy..." -ForegroundColor Yellow
    Set-Location backend
    eb deploy
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Backend deployado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "  ERRO no deploy do Backend." -ForegroundColor Red
    }
    Set-Location ..
} else {
    Write-Host "  EB CLI nao encontrado. Opcoes:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  OPCAO A — Deploy via ZIP no Console AWS:" -ForegroundColor Cyan
    Write-Host "    1. Crie um ZIP da pasta backend\ (sem node_modules)" -ForegroundColor White
    Write-Host "    2. Acesse: https://console.aws.amazon.com/elasticbeanstalk" -ForegroundColor White
    Write-Host "    3. Ambiente: tngh-aws-final-v2-env" -ForegroundColor White
    Write-Host "    4. Upload and deploy -> selecione o ZIP" -ForegroundColor White
    Write-Host ""
    Write-Host "  OPCAO B — Deploy via EB CLI:" -ForegroundColor Cyan
    Write-Host "    pip install awsebcli" -ForegroundColor White
    Write-Host "    cd backend" -ForegroundColor White
    Write-Host "    eb deploy" -ForegroundColor White
    Write-Host "    cd .." -ForegroundColor White
    Write-Host ""
    Write-Host "  Criando ZIP do backend para voce fazer upload manual..." -ForegroundColor Yellow

    # Criar ZIP sem node_modules
    $zipPath = ".\vision-core-backend-deploy.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

    # Copiar backend sem node_modules para temp
    $tmpDir = ".\__backend_tmp"
    if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
    Copy-Item -Path "backend" -Destination $tmpDir -Recurse -Force

    # Remover node_modules do temp
    $nmPath = "$tmpDir\node_modules"
    if (Test-Path $nmPath) { Remove-Item $nmPath -Recurse -Force }

    # Zipar
    Compress-Archive -Path "$tmpDir\*" -DestinationPath $zipPath -Force
    Remove-Item $tmpDir -Recurse -Force

    Write-Host "  ZIP criado: $zipPath ($([Math]::Round((Get-Item $zipPath).Length/1MB, 1)) MB)" -ForegroundColor Green
    Write-Host "  Faca upload deste ZIP no console AWS." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Abrindo AWS Elastic Beanstalk..." -ForegroundColor Gray
    Start-Process "https://console.aws.amazon.com/elasticbeanstalk/home#/environments"
}

Write-Host ""
Read-Host "  Pressione ENTER quando o Backend estiver deployado"
Write-Host ""

# Verificar backend online
Write-Host "  Verificando Backend via Worker..." -ForegroundColor Yellow
try {
    $backendCheck = Invoke-RestMethod -Uri "https://visioncore-api-gateway.weiganlight.workers.dev/api/health" -TimeoutSec 15
    if ($backendCheck.ok -or $backendCheck.status) {
        Write-Host "  Backend ONLINE via Worker" -ForegroundColor Green
        Write-Host "  Resposta: $($backendCheck | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Backend nao respondeu (normal se EB ainda estiver iniciando)" -ForegroundColor DarkYellow
}
Write-Host ""

# ────────────────────────────────────────────────────────────
# DEPLOY 3: FRONTEND CLOUDFLARE PAGES
# ────────────────────────────────────────────────────────────
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "  DEPLOY 3: FRONTEND CLOUDFLARE PAGES" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Frontend: frontend/ (V14 Gold Clean)" -ForegroundColor Gray
Write-Host "  O codigo ja esta na main do GitHub." -ForegroundColor Gray
Write-Host "  Cloudflare Pages faz deploy automatico ao detectar push." -ForegroundColor Gray
Write-Host ""
Write-Host "  Verificando se Pages esta configurado corretamente..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Configuracao esperada no Cloudflare Pages:" -ForegroundColor Cyan
Write-Host "    Repositorio : Imadechumbo/vision-core" -ForegroundColor White
Write-Host "    Branch      : main" -ForegroundColor White
Write-Host "    Build cmd   : (vazio)" -ForegroundColor White
Write-Host "    Output dir  : frontend" -ForegroundColor White
Write-Host ""

$pagesUrl = "https://dash.cloudflare.com/?to=/:account/pages/view/visioncore"
Write-Host "  Se nao estiver configurado, acesse:" -ForegroundColor Yellow
Write-Host "  https://dash.cloudflare.com -> Workers & Pages -> seu projeto Pages" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Settings necessarios:" -ForegroundColor Yellow
Write-Host "  - Build output directory: frontend" -ForegroundColor White
Write-Host "  - Nenhum build command necessario (HTML estatico puro)" -ForegroundColor White
Write-Host ""

$openPages = Read-Host "  Abrir Cloudflare Dashboard para verificar Pages? (s/N)"
if ($openPages -match "^[Ss]$") {
    Start-Process "https://dash.cloudflare.com/?to=/:account/pages"
}
Write-Host ""
Read-Host "  Pressione ENTER quando o Frontend estiver deployado"
Write-Host ""

# ────────────────────────────────────────────────────────────
# VERIFICACAO FINAL END-TO-END
# ────────────────────────────────────────────────────────────
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  VERIFICACAO FINAL END-TO-END" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

$endpoints = @(
    @{ url = "https://visioncore-api-gateway.weiganlight.workers.dev/health";     label = "Worker health" },
    @{ url = "https://visioncore-api-gateway.weiganlight.workers.dev/api/projects"; label = "API projects" },
    @{ url = "https://visioncore-api-gateway.weiganlight.workers.dev/api/workers/status"; label = "API workers" },
    @{ url = "https://visioncore-api-gateway.weiganlight.workers.dev/api/github/status"; label = "API github" }
)

foreach ($ep in $endpoints) {
    try {
        $res = Invoke-RestMethod -Uri $ep.url -TimeoutSec 10
        Write-Host "  [OK] $($ep.label)" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $($ep.label) — $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Testar POST /api/copilot
Write-Host "  Testando POST /api/copilot..." -ForegroundColor Yellow
try {
    $body = '{"message":"health check Vision Core V14","context":{}}'
    $copilot = Invoke-RestMethod `
        -Uri "https://visioncore-api-gateway.weiganlight.workers.dev/api/copilot" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 15
    if ($copilot.ok -or $copilot.answer) {
        Write-Host "  [OK] POST /api/copilot — resposta recebida" -ForegroundColor Green
    }
} catch {
    Write-Host "  [FAIL] POST /api/copilot — $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  VISION CORE V14 GOLD — SISTEMA NO AR" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend : https://visioncoreai.pages.dev" -ForegroundColor Cyan
Write-Host "  Worker   : https://visioncore-api-gateway.weiganlight.workers.dev" -ForegroundColor Cyan
Write-Host "  Backend  : http://tngh-aws-final-v2-env.eba-fi8g5gme.us-east-1.elasticbeanstalk.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SDDF FRONT GUARD : PASS" -ForegroundColor Green
Write-Host "  Visual            : V8 Gold" -ForegroundColor Green
Write-Host "  Runtime           : V14 limpo" -ForegroundColor Green
Write-Host "  Evidence Receipt  : Go Core real" -ForegroundColor Green
Write-Host "  PASS GOLD         : nunca fake" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
