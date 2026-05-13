param(
  [switch]$FullJsCheck,
  [switch]$Push = $true,
  [string]$Branch = "main",
  [string]$CommitMessage = "refactor(frontend): continue v14 clean runtime ownership",
  [string]$Checkpoint = "tools/v14-refactor-checkpoint.ps1"
)

$ErrorActionPreference = "Stop"
$script:Log = New-Object System.Collections.Generic.List[string]
$script:Changed = $false
$script:Applied = New-Object System.Collections.Generic.List[string]
$script:Skipped = New-Object System.Collections.Generic.List[string]

function Add-Log([string]$msg) { [void]$script:Log.Add($msg) }
function Add-Applied([string]$msg) { [void]$script:Applied.Add($msg); Add-Log("APPLIED: " + $msg) }
function Add-Skipped([string]$msg) { [void]$script:Skipped.Add($msg); Add-Log("SKIPPED: " + $msg) }

function Finish([bool]$ok, [string]$msg) {
  Write-Host ""
  Write-Host "=== V14 TOTAL REFACTOR RUNNER SUMMARY ===" -ForegroundColor Cyan
  Write-Host ("RESULT: " + $(if ($ok) { "PASS" } else { "FAIL" }))
  Write-Host ("MESSAGE: " + $msg)
  Write-Host ("APPLIED_COUNT: " + $script:Applied.Count)
  foreach ($line in $script:Applied) { Write-Host ("  + " + $line) }
  Write-Host ("SKIPPED_COUNT: " + $script:Skipped.Count)
  foreach ($line in $script:Skipped) { Write-Host ("  - " + $line) }
  Write-Host "--- EXECUTION LOG ---"
  foreach ($line in $script:Log) { Write-Host $line }
  if ($ok) { Write-Host ("OK: " + $msg) -ForegroundColor Green }
  else { Write-Host ("FAIL: " + $msg) -ForegroundColor Red }
  Write-Host "=== END SUMMARY ===" -ForegroundColor Cyan
  if (-not $ok) { exit 1 }
}

function Run {
  param(
    [Parameter(Mandatory=$true)][string]$Cmd,
    [Parameter(ValueFromRemainingArguments=$true)][string[]]$CmdArgs
  )
  Add-Log("> " + $Cmd + " " + ($CmdArgs -join " "))
  $output = & $Cmd @CmdArgs 2>&1
  $code = $LASTEXITCODE
  if ($output) {
    foreach ($line in $output) {
      $text = [string]$line
      if ($text.Length -gt 500) { $text = $text.Substring(0, 500) + " ...[truncated]" }
      Add-Log("  " + $text)
    }
  }
  if ($code -ne 0) { Finish $false ($Cmd + " failed with exit code " + $code) }
  return $output
}

function Git { param([Parameter(ValueFromRemainingArguments=$true)][string[]]$GitArgs) return Run git @GitArgs }
function Node { param([Parameter(ValueFromRemainingArguments=$true)][string[]]$NodeArgs) return Run node @NodeArgs }
function RunPowerShell { param([Parameter(ValueFromRemainingArguments=$true)][string[]]$PSArgs) return Run powershell @PSArgs }

function Get-FileRaw([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  return Get-Content $Path -Raw
}

function Write-FileRaw([string]$Path, [string]$Content) {
  Set-Content -Path $Path -Value $Content -Encoding UTF8
  $script:Changed = $true
}

function Ensure-Adapter {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Marker,
    [Parameter(Mandatory=$true)][string]$Description,
    [Parameter(Mandatory=$true)][string]$Content
  )
  $current = Get-FileRaw $Path
  if ($null -eq $current) { Add-Skipped("missing file: " + $Path); return }
  if ($current.Contains($Marker)) { Add-Skipped($Description + " already delegated"); return }
  Write-FileRaw $Path $Content
  Add-Applied($Description)
}

function Assert-NoForbiddenRuntimeMarkers {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  $s = Get-Content $Path -Raw
  $forbidden = @("RUN_PATH", "STREAM_PATH", "new EventSource", "window.fetch =", "window.EventSource =", "pass_gold:true", "promotion_allowed:true")
  foreach ($f in $forbidden) {
    if ($s.Contains($f)) { Finish $false ("forbidden marker " + $f + " remains in " + $Path) }
  }
}

function Apply-PendingPatches {
  $v233Content = @'
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
  Ensure-Adapter -Path "frontend/assets/v233-realtime.js" -Marker "__V233_REALTIME_ADAPTER__" -Description "v233 realtime -> VisionRuntimeOwner adapter" -Content $v233Content
}

function Run-Validation {
  Node --check frontend/assets/v233-realtime.js | Out-Null
  if (-not (Test-Path $Checkpoint)) { Finish $false ("checkpoint runner not found: " + $Checkpoint) }
  $checkpointArgs = @("-ExecutionPolicy", "Bypass", "-File", $Checkpoint, "-Quiet")
  if ($FullJsCheck) { $checkpointArgs += "-FullJsCheck" }
  RunPowerShell @checkpointArgs | Out-Null
  Git diff --check | Out-Null
}

function Commit-And-Push {
  $status = Git status --porcelain
  if ($status -and $status.Count -gt 0) {
    Add-Log("GIT: committing changed files")
    Git add frontend docs tools .github | Out-Null
    Git commit -m $CommitMessage | Out-Null
    $script:Changed = $true
  } else {
    Add-Log("GIT: working tree clean, no commit needed")
  }

  if ($Push) {
    Add-Log("GIT: pushing and verifying remote HEAD")
    Git push origin $Branch | Out-Null
    Git fetch origin $Branch | Out-Null
    $local = (Git rev-parse HEAD | Select-Object -Last 1).Trim()
    $remote = (Git rev-parse "origin/$Branch" | Select-Object -Last 1).Trim()
    Add-Log("LOCAL_HEAD: " + $local)
    Add-Log("REMOTE_HEAD: " + $remote)
    if ($local -ne $remote) { Finish $false "remote HEAD does not match local HEAD" }
  }
}

try {
  Add-Log("MODE: resumable refactor runner")
  Add-Log("REPORTING: final summary only")
  Add-Log("BRANCH: " + $Branch)
  Add-Log("CHECKPOINT: " + $Checkpoint)

  Git pull --rebase origin $Branch | Out-Null
  Apply-PendingPatches

  Assert-NoForbiddenRuntimeMarkers "frontend/assets/v233-realtime.js"
  Run-Validation
  Commit-And-Push

  Finish $true "resumable refactor block completed"
} catch {
  Add-Log("EXCEPTION: " + $_.Exception.Message)
  Finish $false "resumable refactor block failed"
}
