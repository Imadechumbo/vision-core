Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Write-Host "=== PASSO 1: Habilitando workers.dev ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Abrindo Cloudflare Dashboard..." -ForegroundColor Yellow
Start-Process "https://dash.cloudflare.com/?to=/:account/workers/services/view/visioncore-api-gateway/production/settings/domains"
Write-Host ""
Write-Host "No Dashboard:" -ForegroundColor White
Write-Host "  Workers & Pages -> visioncore-api-gateway -> Settings -> Domains & Routes" -ForegroundColor Gray
Write-Host "  Habilite o toggle 'workers.dev' -> Save" -ForegroundColor Green
Write-Host ""
Read-Host "ENTER quando habilitado"

Write-Host ""
Write-Host "=== PASSO 2: Criando ZIP do backend ===" -ForegroundColor Cyan

$tmp = ".\__bk_tmp"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Copy-Item -Path "backend" -Destination $tmp -Recurse
$nm = Join-Path $tmp "node_modules"
if (Test-Path $nm) { Remove-Item $nm -Recurse -Force }
$zip = ".\vision-core-backend-deploy.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$tmp\*" -DestinationPath $zip -Force
Remove-Item $tmp -Recurse -Force
$mb = [Math]::Round((Get-Item $zip).Length/1MB, 2)
Write-Host "ZIP criado: $zip ($mb MB)" -ForegroundColor Green

Write-Host ""
Write-Host "=== PASSO 3: Deploy backend no AWS ===" -ForegroundColor Cyan
Write-Host "Abrindo AWS Elastic Beanstalk..." -ForegroundColor Yellow
Start-Process "https://console.aws.amazon.com/elasticbeanstalk/home#/environments"
Write-Host ""
Write-Host "No Console AWS:" -ForegroundColor White
Write-Host "  tngh-aws-final-v2-env -> Upload and deploy" -ForegroundColor Gray
Write-Host "  Selecione: $((Get-Item $zip).FullName)" -ForegroundColor Green
Write-Host ""
Read-Host "ENTER quando backend deployado"

Write-Host ""
Write-Host "=== VERIFICACAO FINAL ===" -ForegroundColor Cyan
$checks = @(
    "https://visioncore-api-gateway.weiganlight.workers.dev/health",
    "https://visioncore-api-gateway.weiganlight.workers.dev/api/projects",
    "https://visioncore-api-gateway.weiganlight.workers.dev/api/pass-gold/score"
)
foreach ($url in $checks) {
    try {
        $r = Invoke-RestMethod -Uri $url -TimeoutSec 8
        if ($url -like "*pass-gold*") {
            $ok = -not $r.pass_gold
            Write-Host ("  [{0}] {1} — pass_gold={2}" -f $(if($ok){"OK"}else{"AVISO"}), $url.Split("/")[-1], $r.pass_gold) -ForegroundColor $(if($ok){"Green"}else{"Red"})
        } else {
            Write-Host "  [OK] $($url.Split('/')[-1])" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [FAIL] $($url.Split('/')[-1]) — $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host "Feito!" -ForegroundColor Green
