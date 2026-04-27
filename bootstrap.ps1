param(
  [switch]$Rebuild,
  [switch]$SkipLiveSelfTest
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "`nVISION CORE — Bootstrap Windows" -ForegroundColor Cyan
Write-Host "Runtime: Docker + Node 20 + Redis + API`n"

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Comando obrigatório não encontrado: $name"
  }
}

Assert-Command "docker"

$composeVersion = docker compose version 2>$null
if (-not $composeVersion) {
  throw "Docker Compose v2 não encontrado. Atualize o Docker Desktop."
}

$buildFlag = @()
if ($Rebuild) { $buildFlag = @("--build") }

Write-Host "Subindo Redis + API..." -ForegroundColor Yellow
docker compose up -d @buildFlag

Write-Host "Aguardando healthcheck da API..." -ForegroundColor Yellow
$healthOk = $false
for ($i = 1; $i -le 40; $i++) {
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:8787/api/health" -TimeoutSec 3
    if ($r.ok -eq $true) {
      $healthOk = $true
      Write-Host "API online: $($r.service) $($r.version)" -ForegroundColor Green
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $healthOk) {
  docker compose logs --tail=120 api
  throw "API não passou no healthcheck em http://localhost:8787/api/health"
}

Write-Host "Executando boot-check dentro do container..." -ForegroundColor Yellow
docker compose exec -T api npm run boot-check

if (-not $SkipLiveSelfTest) {
  Write-Host "Validando SSE + polling self-test..." -ForegroundColor Yellow
  docker compose exec -T api npm run self-test:live
}

Write-Host "`nPASSOU: ambiente VISION CORE operacional." -ForegroundColor Green
Write-Host "API: http://localhost:8787/api/health"
Write-Host "Contratos: http://localhost:8787/api/runtime/contracts"
