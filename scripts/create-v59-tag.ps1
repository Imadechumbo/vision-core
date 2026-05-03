$ErrorActionPreference = "Stop"

$tag = "v5.9-main-gold"
$message = "VISION CORE V5.9 - Main Gold + Controlled Deploy"

$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
  throw "Branch atual nao e main. Atual: $currentBranch"
}

$status = git status --short
if ($status) {
  throw "Working tree nao esta limpo. Commit as alteracoes antes de criar tag.`n$status"
}

Write-Host "[V5.9] Validando MAIN GOLD..."
powershell -ExecutionPolicy Bypass -File .\scripts\validate-main-gold.ps1

$existing = git tag --list $tag
if ($existing -eq $tag) {
  throw "Tag $tag ja existe localmente."
}

git tag -a $tag -m $message

Write-Host "Tag criada localmente: $tag"
Write-Host "Nenhum push foi feito."
Write-Host "Para publicar a tag:"
Write-Host "git push origin $tag"
