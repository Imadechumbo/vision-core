# Vision Core V5.0 — Validation Script
# Compila, testa e valida o criterio de aceite completo.
# Uso: .\scripts\validate-v5.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Bin = Join-Path $Root "bin\vision-core.exe"

Write-Host ""
Write-Host "=== VISION CORE V5.0 — VALIDATE ===" -ForegroundColor Cyan

# 1. Build
Write-Host "[1/3] Build..." -ForegroundColor Yellow
& "$Root\scripts\build-go-core.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

# 2. Self-test
Write-Host "[2/3] Self-test..." -ForegroundColor Yellow
$json = & $Bin mission --root "." --input "self-test" 2>&1
$result = $json | ConvertFrom-Json

$pass = $true
$checks = @{
    "engine = go-safe-core"          = ($result.engine -eq "go-safe-core")
    "version = 5.0.0-go-safe-core"   = ($result.version -eq "5.0.0-go-safe-core")
    "pass_gold = true"               = ($result.pass_gold -eq $true)
    "promotion_allowed = true"       = ($result.promotion_allowed -eq $true)
    "status = GOLD"                  = ($result.status -eq "GOLD")
    "rollback_ready = true"          = ($result.rollback_ready -eq $true)
    "mission_id presente"            = ($result.mission_id -ne "")
}

foreach ($check in $checks.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "      [OK] $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "      [FAIL] $($check.Key)" -ForegroundColor Red
        $pass = $false
    }
}

# 3. Resultado
Write-Host ""
if ($pass) {
    Write-Host "=== PASS GOLD V5.0 CONFIRMADO ===" -ForegroundColor Green
    Write-Host "Criterios de aceite: todos passaram." -ForegroundColor White
    exit 0
} else {
    Write-Host "=== FAIL — criterios nao atendidos ===" -ForegroundColor Red
    exit 1
}
