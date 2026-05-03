$ErrorActionPreference = "Stop"

$tag = "v5.9-main-gold"

$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
  throw "Deploy bloqueado: branch atual nao e main."
}

$status = git status --short
if ($status) {
  throw "Deploy bloqueado: working tree sujo.`n$status"
}

$existing = git tag --list $tag
if ($existing -ne $tag) {
  throw "Deploy bloqueado: tag $tag nao existe localmente."
}

powershell -ExecutionPolicy Bypass -File .\scripts\validate-main-gold.ps1

Write-Host "PRE-DEPLOY CHECK PASS"
Write-Host "Tag: $tag"
Write-Host "Branch: main"
Write-Host "PASS GOLD confirmado"
