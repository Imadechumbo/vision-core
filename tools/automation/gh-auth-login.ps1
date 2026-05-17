#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Authenticates gh CLI against GitHub.

  Two modes:
    1. Token mode (non-interactive): pass -Token <PAT>
       Token needs scopes: repo, workflow (for PR creation + label)

    2. Browser mode (interactive): run with no args.
       Launches gh auth login which opens browser for OAuth.

.EXAMPLE
  # Interactive (opens browser):
  .\gh-auth-login.ps1

  # Token (non-interactive, use in CI):
  .\gh-auth-login.ps1 -Token "ghp_xxxxxxxxxxxx"
#>
param(
  [string]$Token = "",
  [string]$Hostname = "github.com"
)

Set-StrictMode -Version Latest

$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

# Already authed?
$status = (& $gh auth status 2>&1)
if ($LASTEXITCODE -eq 0) {
  Write-Host "[gh-auth] Already authenticated."
  & $gh auth status
  exit 0
}

if ($Token) {
  Write-Host "[gh-auth] Logging in with token..."
  $Token | & $gh auth login --hostname $Hostname --with-token
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[gh-auth] Authenticated via token."
    & $gh auth status
  } else {
    Write-Error "[gh-auth] Token login failed."
    exit 1
  }
} else {
  Write-Host "[gh-auth] Starting interactive browser login..."
  Write-Host "[gh-auth] This will open a browser for GitHub OAuth."
  & $gh auth login --hostname $Hostname --git-protocol https --web
}
