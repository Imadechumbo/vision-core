#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Autonomous GitHub flow: push → PR → label → wait for checks → automerge → pull main.
  Requires gh CLI authenticated. Run install-gh.ps1 first if needed.

.PARAMETER Branch
  Branch to open PR for. Defaults to current branch.

.PARAMETER Base
  Base branch. Default: main.

.PARAMETER Label
  Label to apply for automerge. Default: vision-automerge.

.PARAMETER Title
  PR title. If omitted, uses last commit message subject.

.PARAMETER Body
  PR body. If omitted, gh --fill generates it.

.PARAMETER WatchTimeoutSeconds
  Max seconds to wait for checks to complete. Default: 600.

.PARAMETER SkipChecksWatch
  Skip waiting for checks (use when repo has no CI configured).

.PARAMETER DryRun
  Print actions but do not execute.

.EXAMPLE
  .\github-flow.ps1 -Branch feat/v164-release-audit-ledger -Title "feat(release): V16.4"
#>
param(
  [string]$Branch               = "",
  [string]$Base                 = "main",
  [string]$Label                = "vision-automerge",
  [string]$Title                = "",
  [string]$Body                 = "",
  [int]   $WatchTimeoutSeconds  = 600,
  [switch]$SkipChecksWatch,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Locate gh ────────────────────────────────────────────────────────
function Find-Gh {
  $paths = @("gh","C:\Program Files\GitHub CLI\gh.exe","C:\Users\$env:USERNAME\AppData\Local\Programs\GitHub CLI\gh.exe")
  foreach ($p in $paths) {
    try { return (Get-Command $p -ErrorAction Stop).Source } catch {}
  }
  return $null
}

$gh = Find-Gh
if (-not $gh) {
  Write-Error "[github-flow] gh CLI not found. Run tools\automation\install-gh.ps1 first."
  exit 1
}

function Invoke-Gh {
  param([string[]]$Args, [switch]$PassThru)
  Write-Host "[gh] $($Args -join ' ')"
  if ($DryRun) { Write-Host "[DRY-RUN] skipped"; return "" }
  if ($PassThru) {
    return & $gh @Args
  } else {
    & $gh @Args
    if ($LASTEXITCODE -ne 0) { throw "[github-flow] gh exited $LASTEXITCODE" }
  }
}

# ── Resolve branch ────────────────────────────────────────────────────
if (-not $Branch) {
  $Branch = git rev-parse --abbrev-ref HEAD 2>$null
  if (-not $Branch -or $Branch -eq "HEAD") {
    Write-Error "[github-flow] Cannot determine branch. Pass -Branch."
    exit 1
  }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════"
Write-Host " VISION CORE — AUTONOMOUS GITHUB FLOW"
Write-Host "═══════════════════════════════════════════"
Write-Host " Branch : $Branch"
Write-Host " Base   : $Base"
Write-Host " Label  : $Label"
if ($DryRun) { Write-Host " Mode   : DRY-RUN" }
Write-Host "═══════════════════════════════════════════"
Write-Host ""

# ── Step 1: Check auth ────────────────────────────────────────────────
Write-Host "[1/5] Checking gh auth..."
try {
  Invoke-Gh @("auth", "status")
} catch {
  Write-Error "[github-flow] Not authenticated. Run: gh auth login"
  exit 1
}

# ── Step 2: Create PR ─────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Creating PR $Branch → $Base ..."

# Check if PR already exists
$existingPr = ""
try {
  $existingPr = (& $gh pr view $Branch --json url --jq '.url' 2>$null)
} catch {}

$prUrl = ""
if ($existingPr -and $existingPr -match "^https://") {
  Write-Host "[github-flow] PR already exists: $existingPr"
  $prUrl = $existingPr
} else {
  $createArgs = @("pr", "create", "--base", $Base, "--head", $Branch)
  if ($Title)  { $createArgs += @("--title", $Title) }
  if ($Body)   { $createArgs += @("--body", $Body) }
  if (-not $Title -and -not $Body) { $createArgs += "--fill" }

  if ($DryRun) {
    Write-Host "[DRY-RUN] gh $($createArgs -join ' ')"
    $prUrl = "https://github.com/Imadechumbo/vision-core/pull/DRY-RUN"
  } else {
    $prUrl = (& $gh @createArgs 2>&1 | Select-Object -Last 1)
    if ($LASTEXITCODE -ne 0) {
      Write-Error "[github-flow] PR creation failed"
      exit 1
    }
  }
  Write-Host "[github-flow] PR created: $prUrl"
}

# ── Step 3: Apply label ───────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Applying label '$Label'..."
if (-not $DryRun) {
  try {
    # Ensure label exists in repo
    & $gh label create $Label --color "0075ca" --description "Trigger automerge workflow" 2>$null
  } catch {}
  Invoke-Gh @("pr", "edit", $Branch, "--add-label", $Label)
} else {
  Write-Host "[DRY-RUN] gh pr edit $Branch --add-label $Label"
}

# ── Step 4: Watch checks ──────────────────────────────────────────────
if (-not $SkipChecksWatch) {
  Write-Host ""
  Write-Host "[4/5] Watching checks (timeout: ${WatchTimeoutSeconds}s)..."
  if (-not $DryRun) {
    $deadline = (Get-Date).AddSeconds($WatchTimeoutSeconds)
    $allGreen = $false
    while ((Get-Date) -lt $deadline) {
      try {
        $checksJson = (& $gh pr checks $Branch --json name,state --jq '[.[] | {name:.name, state:.state}]' 2>$null)
        if ($checksJson) {
          $checks = $checksJson | ConvertFrom-Json -ErrorAction SilentlyContinue
          if ($checks -and $checks.Count -gt 0) {
            $pending  = @($checks | Where-Object { $_.state -eq 'PENDING' -or $_.state -eq 'IN_PROGRESS' -or $_.state -eq 'QUEUED' })
            $failing  = @($checks | Where-Object { $_.state -eq 'FAILURE' -or $_.state -eq 'ERROR' })
            if ($failing.Count -gt 0) {
              Write-Error "[github-flow] CHECK FAILURE detected: $($failing.name -join ', ')"
              exit 1
            }
            if ($pending.Count -eq 0) {
              Write-Host "[github-flow] All checks passed."
              $allGreen = $true
              break
            }
            Write-Host "[github-flow] Waiting... ($($pending.Count) pending)"
          } else {
            Write-Host "[github-flow] No checks found yet, waiting..."
          }
        }
      } catch {}
      Start-Sleep -Seconds 15
    }
    if (-not $allGreen) {
      Write-Host "[github-flow] WARNING: Checks timed out or no checks configured. Continuing..."
    }
  } else {
    Write-Host "[DRY-RUN] Would watch checks for $Branch"
  }
} else {
  Write-Host "[4/5] Skipping checks watch (--SkipChecksWatch)"
}

# ── Step 5: Wait for merge + pull main ───────────────────────────────
Write-Host ""
Write-Host "[5/5] Waiting for automerge + pulling main..."
if (-not $DryRun) {
  $deadline  = (Get-Date).AddSeconds(300)
  $merged    = $false
  while ((Get-Date) -lt $deadline) {
    try {
      $state = (& $gh pr view $Branch --json state --jq '.state' 2>$null)
      if ($state -eq "MERGED") {
        Write-Host "[github-flow] PR merged!"
        $merged = $true
        break
      }
      Write-Host "[github-flow] PR state: $state — waiting for automerge..."
    } catch {}
    Start-Sleep -Seconds 10
  }
  if (-not $merged) {
    Write-Host "[github-flow] WARNING: Automerge did not complete within 5 min."
    Write-Host "[github-flow] PR URL: $prUrl"
    Write-Host "[github-flow] Apply label '$Label' manually and wait."
  }

  # Pull main regardless
  Write-Host "[github-flow] Pulling main..."
  git checkout $Base
  git pull origin $Base
} else {
  Write-Host "[DRY-RUN] Would wait for merge then: git checkout $Base && git pull origin $Base"
}

Write-Host ""
Write-Host "[github-flow] Done: $Branch"
Write-Host "[github-flow] PR: $prUrl"
