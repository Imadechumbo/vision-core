# Vision Agent Desktop — Build Script para Windows
# Não requer privilégios de administrador

Write-Host "=== Vision Agent Desktop Build ===" -ForegroundColor Cyan

# Step 1: Build unpacked (sem winCodeSign, sem symlinks)
Write-Host "`n[1/3] Gerando app desempacotado..." -ForegroundColor Yellow
npx electron-builder --win --dir --x64
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO no build." -ForegroundColor Red
    exit 1
}

# Step 2: Verificar se gerou
$unpackedDir = "dist\win-unpacked"
if (-not (Test-Path $unpackedDir)) {
    Write-Host "ERRO: $unpackedDir não encontrado." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] App gerado em: $unpackedDir" -ForegroundColor Green

# Step 3: Criar launcher .bat na raiz do dist
Write-Host "`n[2/3] Criando launcher..." -ForegroundColor Yellow
$launcher = @"
@echo off
cd "%~dp0win-unpacked"
start "" "Vision Agent.exe"
"@
$launcher | Out-File -FilePath "dist\VisionAgent.bat" -Encoding ASCII

# Step 4: Criar ZIP distribuível
Write-Host "`n[3/3] Criando pacote ZIP..." -ForegroundColor Yellow
$zipPath = "dist\VisionAgentDesktop-win-x64.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path "dist\win-unpacked", "dist\VisionAgent.bat" -DestinationPath $zipPath
Write-Host "[OK] Pacote criado: $zipPath" -ForegroundColor Green

Write-Host "`n=== BUILD CONCLUÍDO ===" -ForegroundColor Cyan
Write-Host "Para usar: extraia VisionAgentDesktop-win-x64.zip e execute VisionAgent.bat" -ForegroundColor White
Write-Host "Ou: abra dist\win-unpacked\Vision Agent.exe diretamente" -ForegroundColor White
