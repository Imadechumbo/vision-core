# Vision Core — Clean Artifacts
# Remove artefatos de build sem apagar código-fonte.
# Uso: .\scripts\clean-artifacts.ps1

$Root = Split-Path -Parent $PSScriptRoot

Write-Host "=== CLEAN ARTIFACTS ===" -ForegroundColor Yellow

# Remover binários
$BinDir = Join-Path $Root "bin"
if (Test-Path $BinDir) {
    Get-ChildItem $BinDir -File | Remove-Item -Force
    Write-Host "[OK] bin/ limpo" -ForegroundColor Green
}

# Remover snapshots de teste
$SnapDirs = Get-ChildItem $Root -Recurse -Directory -Filter ".vision-snapshots" -ErrorAction SilentlyContinue
foreach ($d in $SnapDirs) {
    Remove-Item $d.FullName -Recurse -Force
    Write-Host "[OK] removido: $($d.FullName)" -ForegroundColor Green
}

# Remover cache Go
$GoCoreDir = Join-Path $Root "go-core"
if (Test-Path $GoCoreDir) {
    Set-Location $GoCoreDir
    go clean -cache -testcache 2>$null
    Write-Host "[OK] go cache limpo" -ForegroundColor Green
}

Write-Host "=== CLEAN CONCLUIDO ===" -ForegroundColor Cyan
