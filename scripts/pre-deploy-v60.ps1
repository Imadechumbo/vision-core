$ErrorActionPreference = "Stop"

function Fail($message) {
  Write-Host "PRE DEPLOY V6.0 FAIL: $message"
  Write-Host "deploy_allowed=false"
  exit 1
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$branch = (git branch --show-current).Trim()
if ($branch -ne "main") {
  Fail "branch atual '$branch' diferente de main"
}

$wt = git status --porcelain
if ($wt) {
  Fail "working tree nao esta limpo"
}

$tagName = "v5.9-main-gold"
$localTag = git tag --list $tagName
$remoteTag = git ls-remote --tags origin "refs/tags/$tagName"
if (-not $localTag -and -not $remoteTag) {
  Fail "tag $tagName nao encontrada local/remota"
}

$validateScript = Join-Path $PSScriptRoot "validate-main-gold.ps1"
if (-not (Test-Path $validateScript)) {
  Fail "scripts/validate-main-gold.ps1 nao encontrado"
}

powershell -ExecutionPolicy Bypass -File $validateScript
if ($LASTEXITCODE -ne 0) {
  Fail "validate-main-gold.ps1 falhou"
}

Push-Location go-core
try {
  go build -o ../bin/vision-core.exe ./cmd/vision-core
  if ($LASTEXITCODE -ne 0) {
    Fail "compilacao do Go Core falhou"
  }
} finally {
  Pop-Location
}

node --check backend/server.js
if ($LASTEXITCODE -ne 0) {
  Fail "node --check backend/server.js falhou"
}

node --check backend/src/runtime/goRunner.js
if ($LASTEXITCODE -ne 0) {
  Fail "node --check backend/src/runtime/goRunner.js falhou"
}

$requiredWorkflows = @(
  ".github/workflows/pass-gold-v57.yml",
  ".github/workflows/visioncore.yml"
)

foreach ($wf in $requiredWorkflows) {
  if (-not (Test-Path (Join-Path $repoRoot $wf))) {
    Fail "workflow obrigatorio ausente: $wf"
  }
}

Write-Host "PRE DEPLOY V6.0 PASS"
Write-Host "deploy_allowed=true"
exit 0
