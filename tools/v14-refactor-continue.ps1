param(
  [switch]$FullJsCheck,
  [switch]$Push = $true,
  [string]$Branch = "main",
  [string]$CommitMessage = "refactor(frontend): continue v14 clean runtime ownership",
  [string]$Checkpoint = "tools/v14-refactor-checkpoint.ps1"
)

$ErrorActionPreference = "Continue"
$Log = New-Object System.Collections.Generic.List[string]
$Applied = New-Object System.Collections.Generic.List[string]
$Skipped = New-Object System.Collections.Generic.List[string]

function AddLog([string]$msg) { [void]$Log.Add($msg) }
function AddApplied([string]$msg) { [void]$Applied.Add($msg); AddLog("APPLIED: " + $msg) }
function AddSkipped([string]$msg) { [void]$Skipped.Add($msg); AddLog("SKIPPED: " + $msg) }

function Summary([bool]$ok, [string]$msg) {
  Write-Host ""
  Write-Host "=== V14 TOTAL REFACTOR RUNNER SUMMARY ===" -ForegroundColor Cyan
  Write-Host ("RESULT: " + $(if ($ok) { "PASS" } else { "FAIL" }))
  Write-Host ("MESSAGE: " + $msg)
  Write-Host ("APPLIED_COUNT: " + $Applied.Count)
  foreach ($x in $Applied) { Write-Host ("  + " + $x) }
  Write-Host ("SKIPPED_COUNT: " + $Skipped.Count)
  foreach ($x in $Skipped) { Write-Host ("  - " + $x) }
  Write-Host "--- EXECUTION LOG ---"
  foreach ($x in $Log) { Write-Host $x }
  if ($ok) { Write-Host ("OK: " + $msg) -ForegroundColor Green } else { Write-Host ("FAIL: " + $msg) -ForegroundColor Red }
  Write-Host "=== END SUMMARY ===" -ForegroundColor Cyan
  if (-not $ok) { exit 1 }
}

function RunGit([string[]]$Args) {
  AddLog("> git " + ($Args -join " "))
  & git.exe @Args *> $null
  if ($LASTEXITCODE -ne 0) { Summary $false ("git failed: " + ($Args -join " ")) }
}

function RunNode([string[]]$Args) {
  AddLog("> node " + ($Args -join " "))
  & node.exe @Args *> $null
  if ($LASTEXITCODE -ne 0) { Summary $false ("node failed: " + ($Args -join " ")) }
}

function RunPS([string[]]$Args) {
  AddLog("> powershell " + ($Args -join " "))
  & powershell.exe @Args *> $null
  if ($LASTEXITCODE -ne 0) { Summary $false ("powershell failed: " + ($Args -join " ")) }
}

function EnsureAdapter([string]$Path, [string]$Marker, [string]$Description, [string]$Content) {
  if (-not (Test-Path $Path)) { AddSkipped("missing file: " + $Path); return }
  $current = Get-Content $Path -Raw
  if ($current.Contains($Marker)) { AddSkipped($Description + " already delegated"); return }
  Set-Content -Path $Path -Value $Content -Encoding UTF8
  AddApplied($Description)
}

function ApplyPendingPatches() {
  $v233 = @'
/* VISION CORE V2.3.3 - LEGACY REALTIME ADAPTER
 * V14 CLEAN: runtime execution and stream ownership belong to vision-runtime-owner.js.
 * This adapter keeps load compatibility only.
 */
(function(){
  'use strict';
  if (window.__V233_REALTIME_ADAPTER__) return;
  window.__V233_REALTIME_ADAPTER__ = true;

  function delegate() {
    if (window.VisionRuntimeOwner && typeof window.VisionRuntimeOwner.executeMission === 'function') {
      console.log('[V233] delegated to VisionRuntimeOwner clean owner');
      return true;
    }
    return false;
  }

  function boot() {
    if (delegate()) return;
    setTimeout(delegate, 300);
    setTimeout(delegate, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
'@
  EnsureAdapter "frontend/assets/v233-realtime.js" "__V233_REALTIME_ADAPTER__" "v233 realtime -> VisionRuntimeOwner adapter" $v233
}

function AssertNoForbidden([string]$Path) {
  if (-not (Test-Path $Path)) { return }
  $s = Get-Content $Path -Raw
  foreach ($f in @("RUN_PATH", "STREAM_PATH", "new EventSource", "window.fetch =", "window.EventSource =", "pass_gold:true", "promotion_allowed:true")) {
    if ($s.Contains($f)) { Summary $false ("forbidden marker remains in " + $Path + ": " + $f) }
  }
}

try {
  AddLog("MODE: stable resumable runner")
  AddLog("BRANCH: " + $Branch)
  AddLog("CHECKPOINT: " + $Checkpoint)

  RunGit @("pull", "--rebase", "origin", $Branch)
  ApplyPendingPatches
  AssertNoForbidden "frontend/assets/v233-realtime.js"

  RunNode @("--check", "frontend/assets/v233-realtime.js")

  if (-not (Test-Path $Checkpoint)) { Summary $false ("checkpoint runner not found: " + $Checkpoint) }
  $checkpointArgs = @("-ExecutionPolicy", "Bypass", "-File", $Checkpoint, "-Quiet")
  if ($FullJsCheck) { $checkpointArgs += "-FullJsCheck" }
  RunPS $checkpointArgs

  RunGit @("diff", "--check")

  $status = & git.exe status --porcelain
  if ($LASTEXITCODE -ne 0) { Summary $false "git status failed" }
  if ($status) {
    AddLog("GIT: committing changed files")
    RunGit @("add", "frontend", "docs", "tools", ".github")
    RunGit @("commit", "-m", $CommitMessage)
  } else {
    AddLog("GIT: working tree clean, no commit needed")
  }

  if ($Push) {
    RunGit @("push", "origin", $Branch)
    RunGit @("fetch", "origin", $Branch)
    $local = (& git.exe rev-parse HEAD).Trim()
    $remote = (& git.exe rev-parse "origin/$Branch").Trim()
    AddLog("LOCAL_HEAD: " + $local)
    AddLog("REMOTE_HEAD: " + $remote)
    if ($local -ne $remote) { Summary $false "remote HEAD does not match local HEAD" }
  }

  Summary $true "resumable refactor block completed"
} catch {
  AddLog("EXCEPTION: " + $_.Exception.Message)
  Summary $false "resumable refactor block failed"
}
