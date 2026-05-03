$ErrorActionPreference = "Stop"

Write-Host "[V5.8 MAIN] Checking Git status..."
git status --short

Write-Host "[V5.8 MAIN] Cleaning Go caches..."
Push-Location go-core
try {
  go clean -cache -testcache

  Write-Host "[V5.8 MAIN] Running go test ./..."
  go test ./...

  Write-Host "[V5.8 MAIN] Building vision-core.exe..."
  go build -o ../bin/vision-core.exe ./cmd/vision-core
} finally {
  Pop-Location
}

Write-Host "[V5.8 MAIN] Checking Node syntax..."
node --check backend/server.js
node --check backend/src/runtime/goRunner.js

Write-Host "[V5.8 MAIN] Running PASS GOLD mission..."
$result = & .\bin\vision-core.exe mission --root "." --input "CORS origin blocked"
$resultText = $result | Out-String
Write-Host $resultText

$json = $resultText | ConvertFrom-Json

if ($json.status -ne "GOLD") { throw "status is not GOLD" }
if (-not $json.pass_gold) { throw "pass_gold is not true" }
if ($json.engine -ne "go-safe-core") { throw "engine is not go-safe-core" }
if (-not $json.hermes_enabled) { throw "hermes_enabled is not true" }
if (-not $json.transaction_mode) { throw "transaction_mode is not true" }

Write-Host "MAIN GOLD VALIDATED"
Write-Host "status GOLD"
Write-Host "pass_gold true"
