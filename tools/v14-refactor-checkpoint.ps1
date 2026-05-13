param(
  [switch]$Push,
  [switch]$FullJsCheck,
  [switch]$Quiet,
  [string]$CommitMessage = "",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$script:Report = @()

function Add-Report($msg) {
  $script:Report += $msg
}

function Step($msg) {
  if (-not $Quiet) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
  }
  Add-Report("STEP: " + $msg)
}

function Ok($msg) {
  if (-not $Quiet) { Write-Host "OK: $msg" -ForegroundColor Green }
  Add-Report("OK: " + $msg)
}

function Fail($msg) {
  Write-Host "FAIL: $msg" -ForegroundColor Red
  Add-Report("FAIL: " + $msg)
  Write-FinalSummary
  exit 1
}

function Write-FinalSummary() {
  Write-Host ""
  Write-Host "=== V14 REFACTOR CHECKPOINT SUMMARY ===" -ForegroundColor Cyan
  foreach ($line in $script:Report) { Write-Host $line }
  Write-Host "=== END SUMMARY ===" -ForegroundColor Cyan
}

function Run {
  param(
    [Parameter(Mandatory=$true)][string]$Cmd,
    [Parameter(ValueFromRemainingArguments=$true)][string[]]$CmdArgs
  )
  if (-not $Quiet) { Write-Host ("> " + $Cmd + " " + ($CmdArgs -join " ")) -ForegroundColor DarkGray }
  & $Cmd @CmdArgs
  if ($LASTEXITCODE -ne 0) {
    Fail ($Cmd + " failed with exit code " + $LASTEXITCODE)
  }
}

function Get-GitOutput {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$GitArgs)
  $out = & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    Fail ("git " + ($GitArgs -join " ") + " failed")
  }
  return ($out -join "`n")
}

function Assert-CleanOrCommitReady() {
  $status = Get-GitOutput status --porcelain
  if ([string]::IsNullOrWhiteSpace($status)) {
    Ok "working tree clean"
    return
  }

  if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    if (-not $Quiet) { Write-Host $status -ForegroundColor Yellow }
    Fail "working tree has changes and no -CommitMessage was provided"
  }

  Step "Committing local changes"
  Run git add frontend docs tools .github
  Run git commit -m $CommitMessage
}

function Test-FileExists($path) {
  if (-not (Test-Path $path)) {
    Fail "required file not found: $path"
  }
}

function Test-ForbiddenLiteral($path, $pattern, $label) {
  if (-not (Test-Path $path)) { return }
  $match = Select-String -Path $path -Pattern $pattern -SimpleMatch -ErrorAction SilentlyContinue
  if ($match) {
    Fail "$label found in $path"
  }
}

function Test-CleanOwners() {
  Step "Checking clean owner files"
  $required = @(
    "frontend/assets/vision-api.js",
    "frontend/assets/vision-chat.js",
    "frontend/assets/vision-agent-local.js",
    "frontend/assets/vision-runtime-owner.js",
    "frontend/assets/vision-report.js",
    "tools/sddf-front-guard.mjs"
  )
  foreach ($f in $required) { Test-FileExists $f }
  Ok "required clean owner files exist"

  Test-ForbiddenLiteral "frontend/assets/vision-chat.js" "/api/run-live" "runtime endpoint in chat owner"
  Test-ForbiddenLiteral "frontend/assets/vision-chat.js" "EventSource" "SSE in chat owner"
  Test-ForbiddenLiteral "frontend/assets/vision-chat.js" "pass_gold:true" "fake PASS GOLD in chat owner"
  Test-ForbiddenLiteral "frontend/assets/vision-report.js" "pass_gold:true" "fake PASS GOLD in report owner"
  Test-ForbiddenLiteral "frontend/assets/vision-agent-local.js" "`$0." "fake dollar metrics in agent local owner"
  Test-ForbiddenLiteral "frontend/assets/vision-agent-local.js" "Benchmark" "fake benchmark metric in agent local owner"
  Test-ForbiddenLiteral "frontend/assets/vision-api.js" "window.fetch =" "fetch monkeypatch in API owner"
  Ok "clean owner forbidden checks passed"
}

function Test-PiHarnessContract() {
  Step "Checking PI HARNESS and octagon contract"
  $agent = Get-Content "frontend/assets/vision-agent-local.js" -Raw
  $required = @(
    "pi_harness",
    "PI HARNESS",
    "top: '18.2%'",
    "left: '18.2%'",
    "var OCTAGON",
    "var ORDER",
    "var STAGE_MAP",
    "L0-L9"
  )
  foreach ($item in $required) {
    if ($agent.IndexOf($item) -lt 0) { Fail "PI/orbit contract marker missing: $item" }
  }
  Ok "PI HARNESS + octagon markers present"
}

function Test-LegacyAdapters() {
  Step "Checking legacy metrics adapters"
  $v231 = "frontend/assets/v231-backend-agents.js"
  $v35 = "frontend/assets/vision-v35-telemetry.js"
  if (Test-Path $v231) {
    $s = Get-Content $v231 -Raw
    if ($s.IndexOf("refreshReadOnlyBoards") -lt 0) { Fail "v231 is not delegating to VisionAgentLocal" }
    if ($s.IndexOf("`$0.163") -ge 0 -or $s.IndexOf("Benchmark") -ge 0) { Fail "v231 still contains fake metrics" }
  }
  if (Test-Path $v35) {
    $s = Get-Content $v35 -Raw
    if ($s.IndexOf("refreshReadOnlyBoards") -lt 0) { Fail "v35 is not delegating to VisionAgentLocal" }
    if ($s.IndexOf("pass_gold_rate") -ge 0 -or $s.IndexOf("fillMetrics") -ge 0) { Fail "v35 still owns telemetry metrics" }
  }
  Ok "legacy metric adapters are delegated"
}

function Test-Syntax() {
  Step "Running syntax checks"
  $critical = @(
    "frontend/assets/vision-api.js",
    "frontend/assets/vision-chat.js",
    "frontend/assets/vision-agent-local.js",
    "frontend/assets/vision-runtime-owner.js",
    "frontend/assets/vision-report.js",
    "frontend/assets/v231-backend-agents.js",
    "frontend/assets/vision-v35-telemetry.js",
    "frontend/assets/vision-v34-enterprise.js",
    "frontend/assets/vision-v44-runtime-consistency.js",
    "tools/sddf-front-guard.mjs"
  )
  foreach ($f in $critical) {
    if (Test-Path $f) { Run node --check $f }
  }

  if ($FullJsCheck) {
    Step "Running full frontend/assets JS syntax check"
    Get-ChildItem "frontend/assets" -Filter "*.js" | ForEach-Object {
      Run node --check $_.FullName
    }
  }
  Ok "syntax checks passed"
}

function Test-Guard() {
  Step "Running SDDF front guard"
  Run node tools/sddf-front-guard.mjs
  Ok "SDDF front guard passed"
}

function Test-GitIntegrity() {
  Step "Running git integrity checks"
  Run git diff --check
  Ok "git diff --check passed"
}

function Sync-GitHub() {
  Step "Syncing with GitHub"
  Run git fetch origin $Branch
  $local = Get-GitOutput rev-parse HEAD
  $remote = Get-GitOutput rev-parse "origin/$Branch"
  Add-Report("local HEAD: " + $local)
  Add-Report("origin/" + $Branch + ": " + $remote)
  if (-not $Quiet) {
    Write-Host ("local HEAD:  " + $local)
    Write-Host ("origin/" + $Branch + ": " + $remote)
  }

  if ($Push) {
    Assert-CleanOrCommitReady
    Step "Pushing to GitHub"
    Run git push origin $Branch
    Run git fetch origin $Branch
    $local = Get-GitOutput rev-parse HEAD
    $remote = Get-GitOutput rev-parse "origin/$Branch"
    if ($local.Trim() -ne $remote.Trim()) {
      Fail ("GitHub confirmation failed: local HEAD differs from origin/" + $Branch)
    }
    Ok ("GitHub confirmed: origin/" + $Branch + " equals local HEAD " + $local)
  }
}

Step "VISION CORE V14 + PI HARNESS checkpoint"
Run git branch --show-current
Run git status --short

Test-CleanOwners
Test-PiHarnessContract
Test-LegacyAdapters
Test-Syntax
Test-Guard
Test-GitIntegrity
Sync-GitHub

Step "Checkpoint complete"
Ok "V14 refactor checkpoint passed"
Add-Report("Next safe phase: Fase 4 - Chat clean ownership")
Write-FinalSummary
