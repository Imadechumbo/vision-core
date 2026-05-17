#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Opens all pending vision-core PRs (V16.4 → V20.0) via gh CLI or browser fallback.
  Applies vision-automerge label to each.
  Merges in sequence: waits for each to merge before continuing.

.PARAMETER Mode
  "auto"    — uses gh CLI (requires auth). Full autopilot.
  "browser" — opens browser compare URLs for manual PR creation.
  "labels"  — applies vision-automerge label to existing open PRs only.

.PARAMETER SkipChecksWatch
  Skip watching checks (useful when no CI is configured).

.EXAMPLE
  .\autopilot-prs.ps1 -Mode auto -SkipChecksWatch
  .\autopilot-prs.ps1 -Mode browser
#>
param(
  [ValidateSet("auto","browser","labels")]
  [string]$Mode                = "auto",
  [switch]$SkipChecksWatch,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

$repo   = "Imadechumbo/vision-core"
$base   = "main"
$label  = "vision-automerge"
$flow   = Join-Path $PSScriptRoot "github-flow.ps1"
$openPr = Join-Path $PSScriptRoot "open-pr.ps1"

# Ordered list — merge in sequence
$prs = @(
  @{ branch = "feat/v164-release-audit-ledger";        title = "feat(release): add append-only release audit ledger V16.4" },
  @{ branch = "feat/v170-evidence-chain-validator";    title = "feat(release): add release evidence chain validator V17.0" },
  @{ branch = "feat/v180-pipeline-orchestrator";       title = "feat(release): add release pipeline orchestrator V18.0" },
  @{ branch = "feat/v190-policy-enforcer";             title = "feat(release): add release policy enforcer V19.0" },
  @{ branch = "feat/v200-release-readiness-report";    title = "feat(release): add release readiness report V20.0" }
)

function Ensure-Label {
  try {
    & $gh label create $label --repo $repo --color "0075ca" --description "Trigger automerge workflow" 2>$null
  } catch {}
}

function Get-PrState([string]$branch) {
  try {
    $state = (& $gh pr view $branch --repo $repo --json state --jq '.state' 2>$null)
    return $state
  } catch { return "UNKNOWN" }
}

function Wait-ForMerge([string]$branch, [int]$timeoutSec = 600) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    $state = Get-PrState $branch
    if ($state -eq "MERGED") { return $true }
    Write-Host "  [wait] PR state: $state"
    Start-Sleep -Seconds 15
  }
  return $false
}

# ── BROWSER MODE ─────────────────────────────────────────────────────
if ($Mode -eq "browser") {
  Write-Host ""
  Write-Host "=== BROWSER MODE — opening compare URLs ==="
  Write-Host "Create each PR, then apply label: $label"
  Write-Host ""
  foreach ($pr in $prs) {
    $url = "https://github.com/$repo/compare/$base...$($pr.branch)"
    Write-Host "Branch: $($pr.branch)"
    Write-Host "Title : $($pr.title)"
    Write-Host "URL   : $url"
    Write-Host ""
    if (-not $DryRun) {
      Start-Process $url
      Start-Sleep -Seconds 2
    }
  }
  Write-Host "After creating PRs, re-run with: -Mode labels"
  exit 0
}

# ── LABELS MODE ───────────────────────────────────────────────────────
if ($Mode -eq "labels") {
  Write-Host ""
  Write-Host "=== LABELS MODE — applying $label to open PRs ==="
  Ensure-Label
  foreach ($pr in $prs) {
    $state = Get-PrState $pr.branch
    if ($state -eq "OPEN") {
      Write-Host "  Labeling: $($pr.branch)"
      if (-not $DryRun) {
        & $gh pr edit $pr.branch --repo $repo --add-label $label 2>&1
      } else {
        Write-Host "  [DRY-RUN] gh pr edit $($pr.branch) --add-label $label"
      }
    } elseif ($state -eq "MERGED") {
      Write-Host "  Already merged: $($pr.branch)"
    } else {
      Write-Host "  State=$state (PR not open): $($pr.branch)"
    }
  }
  exit 0
}

# ── AUTO MODE ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════"
Write-Host " VISION CORE — AUTOPILOT V16.4 → V20.0"
Write-Host "═══════════════════════════════════════════════════"

# Auth check
$authStatus = (& $gh auth status 2>&1)
if ($LASTEXITCODE -ne 0) {
  Write-Error "Not authenticated. Run: tools\automation\gh-auth-login.ps1"
  exit 1
}

Ensure-Label

foreach ($pr in $prs) {
  $branch = $pr.branch
  $title  = $pr.title

  Write-Host ""
  Write-Host "── $branch ──"

  # Skip if already merged
  $state = Get-PrState $branch
  if ($state -eq "MERGED") {
    Write-Host "  Already merged, skipping."
    continue
  }

  # Create PR if not open
  if ($state -ne "OPEN") {
    Write-Host "  Creating PR: $title"
    $createArgs = @("pr", "create", "--repo", $repo, "--base", $base, "--head", $branch, "--title", $title, "--body", "Automated PR from vision-core autopilot pipeline.")
    if ($DryRun) {
      Write-Host "  [DRY-RUN] gh $($createArgs -join ' ')"
    } else {
      $out = (& $gh @createArgs 2>&1)
      Write-Host "  $out"
      if ($LASTEXITCODE -ne 0) {
        Write-Error "  PR create failed for $branch"
        exit 1
      }
    }
  } else {
    Write-Host "  PR already open."
  }

  # Apply label
  Write-Host "  Applying label: $label"
  if (-not $DryRun) {
    & $gh pr edit $branch --repo $repo --add-label $label 2>&1 | Out-Null
  }

  # Watch checks
  if (-not $SkipChecksWatch) {
    Write-Host "  Watching checks..."
    if (-not $DryRun) {
      try {
        & $gh pr checks $branch --repo $repo --watch --fail-fast 2>&1
        if ($LASTEXITCODE -ne 0) {
          Write-Error "  CHECK FAILURE on $branch — stopping autopilot."
          exit 1
        }
      } catch {
        Write-Host "  No checks configured or checks timed out — continuing."
      }
    }
  }

  # Wait for automerge
  Write-Host "  Waiting for automerge..."
  if (-not $DryRun) {
    $merged = Wait-ForMerge $branch 600
    if ($merged) {
      Write-Host "  Merged!"
      # Pull main
      git checkout $base 2>&1 | Out-Null
      git pull origin $base 2>&1 | Out-Null
      Write-Host "  Pulled main."
    } else {
      Write-Host "  WARNING: Automerge timed out for $branch."
      Write-Host "  Merge manually, then re-run to continue."
      exit 1
    }
  }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════"
Write-Host " AUTOPILOT COMPLETE — V16.4 through V20.0 merged"
Write-Host "═══════════════════════════════════════════════════"
