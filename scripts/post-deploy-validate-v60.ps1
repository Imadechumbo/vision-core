param(
  [Parameter(Mandatory = $true)]
  [string]$BackendUrl,

  [Parameter(Mandatory = $true)]
  [string]$FrontendUrl
)

$ErrorActionPreference = "Stop"

function Fail($message) {
  Write-Host "POST DEPLOY V6.0 FAIL: $message"
  Write-Host "release_observable=false"
  exit 1
}

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Uri,
    [string]$Body = $null
  )

  $params = @{
    Method = $Method
    Uri = $Uri
    TimeoutSec = 30
  }

  if ($Body) {
    $params["ContentType"] = "application/json"
    $params["Body"] = $Body
  }

  return Invoke-RestMethod @params
}

$backendBase = $BackendUrl.TrimEnd("/")
$frontendBase = $FrontendUrl.TrimEnd("/")

try {
  $null = Invoke-JsonRequest -Method "GET" -Uri "$backendBase/api/health"
} catch {
  Fail "/api/health indisponivel em $backendBase"
}

try {
  $null = Invoke-JsonRequest -Method "GET" -Uri "$backendBase/api/go-core/health"
} catch {
  Fail "/api/go-core/health indisponivel em $backendBase"
}

$payload = @{ input = "CORS origin blocked" } | ConvertTo-Json

try {
  $runLive = Invoke-JsonRequest -Method "POST" -Uri "$backendBase/api/run-live" -Body $payload
} catch {
  Fail "POST /api/run-live falhou em $backendBase"
}

$responseText = $runLive | ConvertTo-Json -Depth 20

if ($responseText -notmatch '"pass_gold"\s*:\s*true') {
  Fail "run-live nao contem pass_gold=true"
}
if ($responseText -notmatch '"engine"\s*:\s*"go-safe-core"') {
  Fail "run-live nao contem engine=go-safe-core"
}
if ($responseText -notmatch '"hermes_enabled"\s*:\s*true') {
  Fail "run-live nao contem hermes_enabled=true"
}
if ($responseText -notmatch '"transaction_mode"\s*:\s*true') {
  Fail "run-live nao contem transaction_mode=true"
}

try {
  $frontResp = Invoke-WebRequest -Uri $frontendBase -Method GET -TimeoutSec 30
  if ($frontResp.StatusCode -ne 200) {
    Fail "frontend retornou HTTP $($frontResp.StatusCode)"
  }
} catch {
  Fail "frontend indisponivel em $frontendBase"
}

Write-Host "POST DEPLOY V6.0 PASS"
Write-Host "release_observable=true"
exit 0
