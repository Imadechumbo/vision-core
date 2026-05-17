#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Fallback: opens GitHub compare URL in the browser so the user can create the PR manually.

.PARAMETER Branch
  The feature branch to compare against main.

.PARAMETER Title
  Optional PR title to display.

.EXAMPLE
  .\open-pr.ps1 -Branch feat/v164-release-audit-ledger -Title "feat(release): V16.4"
#>
param(
  [Parameter(Mandatory=$false)][string]$Branch = "",
  [Parameter(Mandatory=$false)][string]$Title  = ""
)

Set-StrictMode -Version Latest

if (-not $Branch) {
  $Branch = git rev-parse --abbrev-ref HEAD 2>$null
}
if (-not $Branch -or $Branch -eq "HEAD") {
  Write-Error "Could not determine branch name. Pass -Branch explicitly."
  exit 1
}

$repo = "Imadechumbo/vision-core"
$url  = "https://github.com/$repo/compare/main...$Branch"

Write-Host "[open-pr] Branch : $Branch"
if ($Title) { Write-Host "[open-pr] Title  : $Title" }
Write-Host "[open-pr] URL    : $url"
Write-Host "[open-pr] Opening browser..."

Start-Process $url
