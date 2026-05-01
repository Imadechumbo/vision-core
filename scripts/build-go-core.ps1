# Vision Core Go Safe Core — Build Script
# Uso: .\scripts\build-go-core.ps1
# Saída: bin\vision-core.exe

param(
    [switch]$SkipTests = $false,
    [string]$Output = "..\bin\vision-core.exe"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "=== VISION CORE GO SAFE CORE — BUILD ===" -ForegroundColor Cyan
Write-Host "Root: $Root" -ForegroundColor Gray

# 1. Entrar no go-core
$GoCoreDir = Join-Path $Root "go-core"
if (-not (Test-Path $GoCoreDir)) {
    Write-Host "[ERRO] go-core/ nao encontrado em $Root" -ForegroundColor Red
    exit 1
}
Set-Location $GoCoreDir
Write-Host "[1/4] Diretorio: $GoCoreDir" -ForegroundColor Gray

# 2. go mod tidy
Write-Host "[2/4] go mod tidy..." -ForegroundColor Yellow
go mod tidy
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] go mod tidy falhou" -ForegroundColor Red
    exit 1
}
Write-Host "      OK" -ForegroundColor Green

# 3. go test ./...
if (-not $SkipTests) {
    Write-Host "[3/4] go test ./..." -ForegroundColor Yellow
    go test ./...
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] testes falharam — build cancelado" -ForegroundColor Red
        exit 1
    }
    Write-Host "      OK - todos os testes passaram" -ForegroundColor Green
} else {
    Write-Host "[3/4] testes pulados (--SkipTests)" -ForegroundColor Gray
}

# 4. go build
Write-Host "[4/4] go build -o $Output .\cmd\vision-core..." -ForegroundColor Yellow
$BinDir = Join-Path $Root "bin"
if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
}
go build -o $Output .\cmd\vision-core
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] build falhou" -ForegroundColor Red
    exit 1
}

$BinPath = Join-Path $Root "bin\vision-core.exe"
$Size = (Get-Item $BinPath).Length / 1MB
Write-Host "      OK - $BinPath ($([math]::Round($Size,1)) MB)" -ForegroundColor Green

Write-Host ""
Write-Host "=== BUILD CONCLUIDO ===" -ForegroundColor Cyan
Write-Host "Binario: $BinPath" -ForegroundColor White
Write-Host ""
Write-Host "Teste rapido:" -ForegroundColor Gray
Write-Host "  ..\bin\vision-core.exe mission --root `".`" --input `"self-test`"" -ForegroundColor Gray
