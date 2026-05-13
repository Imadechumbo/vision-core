param(
  [switch]$FullJsCheck,
  [switch]$Push = $true,
  [string]$Branch = "main",
  [string]$CommitMessage = "refactor(frontend): continue v14 clean runtime ownership"
)

$ErrorActionPreference = "Stop"
$script:Log = @()
$script:Changed = $false

function Add-Log($msg) { $script:Log += $msg }

function Finish($ok, $msg) {
  Write-Host ""
  Write-Host "=== V14 TOTAL REFACTOR RUNNER SUMMARY ===" -ForegroundColor Cyan
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
  $out = & $Cmd @CmdArgs 2>&1
  $code = $LASTEXITCODE
  if ($out) { foreach ($line in $out) { Add-Log("  " + $line) } }
  if ($code -ne 0) { Finish $false ($Cmd + " failed with exit code " + $code) }
  return $out
}

function Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$GitArgs)
  return Run git @GitArgs
}

function Node {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$NodeArgs)
  return Run node @NodeArgs
}

function RunPowerShell {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$PSArgs)
  return Run powershell @PSArgs
}

try {
  Add-Log("MODE: resumable refactor runner")
  Add-Log("REPORTING: final summary only")
  Add-Log("BRANCH: " + $Branch)

  Git pull --rebase origin $Branch | Out-Null

  $v233 = "frontend/assets/v233-realtime.js"
  if (Test-Path $v233) {
    $current = Get-Content $v233 -Raw
    $alreadyAdapter = $current.Contains("__V233_REALTIME_ADAPTER__")
    if ($alreadyAdapter) {
      Add-Log("SKIP: v233 realtime already delegated")
    } else {
      Add-Log("PATCH: delegating v233 realtime to VisionRuntimeOwner")
      $content = @'
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
      Set-Content -Path $v233 -Value $content -Encoding UTF8
      $script:Changed = $true
    }
  } else {
    Add-Log("SKIP: v233 realtime file not found")
  }

  Node --check frontend/assets/v233-realtime.js | Out-Null

  $checkpointArgs = @("-ExecutionPolicy", "Bypass", "-File", "tools/v14-refactor-checkpoint.ps1", "-Quiet")
  if ($FullJsCheck) { $checkpointArgs += "-FullJsCheck" }
  RunPowerShell @checkpointArgs | Out-Null

  Git diff --check | Out-Null
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

  Finish $true "resumable refactor block completed"
} catch {
  Add-Log("EXCEPTION: " + $_.Exception.Message)
  Finish $false "resumable refactor block failed"
}
