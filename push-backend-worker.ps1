# VISION CORE — PUSH WORKER + BACKEND FIX
# Execute em: C:\Users\imadechumbo\Desktop\vision-core\

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — PUSH WORKER + BACKEND" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Branch: $(git branch --show-current)" -ForegroundColor Gray
Write-Host ""

Write-Host "Commits a enviar:" -ForegroundColor Yellow
git log --oneline origin/main..HEAD
Write-Host ""

Write-Host "SDDF Guard..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "  GUARD FALHOU." -ForegroundColor Red; exit 1 }
Write-Host ""

Write-Host "Syntax checks..." -ForegroundColor Yellow
node --check worker\src\index.js    && Write-Host "  worker OK"  -ForegroundColor Green
node --check backend\server.js      && Write-Host "  backend OK" -ForegroundColor Green
node --check backend\src\runtime\goRunner.js && Write-Host "  goRunner OK" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Push para origin/main? (s/N)"
if ($confirm -match "^[Ss]$") {
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host "  SUCESSO! Worker + Backend publicados." -ForegroundColor Green
        Write-Host ""
        Write-Host "  Contratos alinhados com SPEC V14:" -ForegroundColor Cyan
        Write-Host "  - Worker v3.2: CORS local, mission_id obrigatorio no SSE" -ForegroundColor Cyan
        Write-Host "  - Backend: POST /api/run-live retorna mission_id garantido" -ForegroundColor Cyan
        Write-Host "  - Backend SSE: emite step/gate/done (V14 Runtime Owner)" -ForegroundColor Cyan
        Write-Host "  - evidence_receipt real derivado do Go Core" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Proximos passos:" -ForegroundColor Yellow
        Write-Host "  1. Deploy Worker no Cloudflare Dashboard" -ForegroundColor Yellow
        Write-Host "  2. Deploy Backend no Elastic Beanstalk" -ForegroundColor Yellow
        Write-Host "  3. Deploy Frontend no Cloudflare Pages" -ForegroundColor Yellow
        Write-Host "==================================================" -ForegroundColor Green
    } else {
        Write-Host "  ERRO no push." -ForegroundColor Red
    }
} else {
    Write-Host "  Push cancelado." -ForegroundColor Gray
}
Write-Host ""
