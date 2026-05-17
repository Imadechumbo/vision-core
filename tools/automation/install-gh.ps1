#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Installs GitHub CLI (gh) automatically on Windows.
  Tries: winget → scoop → direct MSI download.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Find-Gh {
  $paths = @(
    "gh",
    "C:\Program Files\GitHub CLI\gh.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Programs\GitHub CLI\gh.exe",
    "C:\ProgramData\chocolatey\bin\gh.exe",
    "C:\Users\$env:USERNAME\scoop\shims\gh.exe"
  )
  foreach ($p in $paths) {
    try { $c = Get-Command $p -ErrorAction Stop; return $c.Source } catch {}
  }
  return $null
}

# Already installed?
$existing = Find-Gh
if ($existing) {
  Write-Host "[install-gh] Already installed: $existing"
  & $existing --version
  exit 0
}

Write-Host "[install-gh] gh CLI not found. Attempting installation..."

# --- Try winget ---
try {
  $wg = Get-Command winget -ErrorAction Stop
  Write-Host "[install-gh] Using winget..."
  & winget install --id GitHub.cli --silent --accept-source-agreements --accept-package-agreements
  # Refresh PATH
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $found = Find-Gh
  if ($found) {
    Write-Host "[install-gh] Installed via winget: $found"
    & $found --version
    exit 0
  }
} catch {
  Write-Host "[install-gh] winget not available or failed: $_"
}

# --- Try scoop ---
try {
  $sc = Get-Command scoop -ErrorAction Stop
  Write-Host "[install-gh] Using scoop..."
  & scoop install gh
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $found = Find-Gh
  if ($found) {
    Write-Host "[install-gh] Installed via scoop: $found"
    & $found --version
    exit 0
  }
} catch {
  Write-Host "[install-gh] scoop not available or failed: $_"
}

# --- Try choco ---
try {
  $ch = Get-Command choco -ErrorAction Stop
  Write-Host "[install-gh] Using choco..."
  & choco install gh -y
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $found = Find-Gh
  if ($found) {
    Write-Host "[install-gh] Installed via choco: $found"
    & $found --version
    exit 0
  }
} catch {
  Write-Host "[install-gh] choco not available or failed: $_"
}

# --- Direct MSI download via GitHub API ---
Write-Host "[install-gh] Trying direct MSI download via GitHub API..."
try {
  $apiResp = Invoke-RestMethod -Uri "https://api.github.com/repos/cli/cli/releases/latest" -UseBasicParsing
  $asset   = $apiResp.assets | Where-Object { $_.name -match "windows_amd64\.msi$" } | Select-Object -First 1
  if (-not $asset) { throw "No MSI asset found in latest release" }
  $msiUrl  = $asset.browser_download_url
  $msiPath = "$env:TEMP\$($asset.name)"
  Write-Host "[install-gh] Downloading: $msiUrl"
  Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
  Write-Host "[install-gh] Running installer (requires elevation)..."
  Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /quiet /norestart" -Wait -Verb RunAs
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  $found = Find-Gh
  if ($found) {
    Write-Host "[install-gh] Installed via MSI: $found"
    & $found --version
    exit 0
  }
} catch {
  Write-Host "[install-gh] MSI download/install failed: $_"
}

Write-Error "[install-gh] FAILED: Could not install gh via any method. Install manually from https://cli.github.com/"
exit 1
