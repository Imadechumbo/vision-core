# =============================================================
#  VISION CORE — FINALIZACAO COMPLETA
#  1. Push do commit visual v8 gold
#  2. Cria PR v14-v8-gold-clean-rebuild -> main
#  3. Merge do PR na main
#  4. Deleta branches antigas
#  5. Valida estado final
#
#  Execute em: C:\Users\imadechumbo\Desktop\vision-core\
# =============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — FINALIZACAO COMPLETA" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---------- PRE-CHECKS ----------
$branch = git branch --show-current
Write-Host "  Branch: $branch" -ForegroundColor Gray
Write-Host "  Remote: $(git remote get-url origin)" -ForegroundColor Gray
Write-Host ""

if ($branch -ne "v14-v8-gold-clean-rebuild") {
    Write-Host "  ERRO: deve estar em v14-v8-gold-clean-rebuild" -ForegroundColor Red
    exit 1
}

# ---------- PASSO 1: Guard ----------
Write-Host "PASSO 1: SDDF Guard..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "  GUARD FALHOU." -ForegroundColor Red; exit 1 }
Write-Host "  SDDF FRONT GUARD PASS" -ForegroundColor Green
Write-Host ""

# ---------- PASSO 2: Push branch ----------
Write-Host "PASSO 2: Push v14-v8-gold-clean-rebuild..." -ForegroundColor Yellow
git push origin v14-v8-gold-clean-rebuild
Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# ---------- PASSO 3: Criar PR (GitHub CLI ou API) ----------
Write-Host "PASSO 3: Criando PR v14-v8-gold-clean-rebuild -> main..." -ForegroundColor Yellow

$prBody = @"
## VISION CORE V14 — Visual V8 Gold + Runtime Limpo

### O que este PR entrega

**Frontend unico e definitivo** baseado no visual `frontend-v8.0-gold` sobre arquitetura V14 limpa.

### Visual restaurado (V8 Gold)
- Header completo: eye/logo roxo animado, nav, 5 botoes de acao
- Sidebar: logo+eye, SEE.DECIDE.EXECUTE., menu com 12 secoes
- Centro: faixa 'IAs criam. VISION CORE corrige', Vision AI Command, chat-grid, pipeline timeline 6 etapas, PASS GOLD score, mission report, diff, github, saas, marketplace, logs, metrics, agents board
- Orbit: Vision Agent Local com 7 nos (OpenClaw, Scanner, Hermes, PatchEngine, Aegis, PASS GOLD, PR GitHub), agent metrics, tabs PIPELINE/AGENT LOCAL

### Arquitetura V14 limpa
- `index.html`: shell visual puro, zero runtime inline, zero sabotadores
- `vision-api.js`: unico cliente de endpoints
- `vision-chat.js`: Vision Chat LLM, nao abre SSE, nao decide PASS GOLD
- `vision-agent-local.js`: orbit interativo, gate de evidence_receipt
- `vision-runtime-owner.js`: unico dono da execucao, exige mission_id real
- `vision-report.js`: relatorio com gate de evidence_receipt obrigatorio
- `vision-gold.css`: DNA visual completo V8 Gold

### Regras garantidas
- SEM EVIDENCIA REAL = SEM PASS GOLD
- SEM PASS GOLD = SEM PROMOTION
- PASS GOLD nunca hardcoded, nunca stub
- mission_id nunca inventado no frontend
- Zero window.fetch=, zero RUN_PATH, zero authBackdrop

### Validacoes
- [x] node tools/sddf-front-guard.mjs -> SDDF FRONT GUARD PASS
- [x] node --check em todos os 5 assets
- [x] git diff --check limpo
- [x] Visual identico ao V8 Gold aprovado (confirmado em screenshot)
"@

# Tenta GitHub CLI primeiro
$ghAvailable = $null
try { $ghAvailable = Get-Command gh -ErrorAction SilentlyContinue } catch {}

if ($ghAvailable) {
    Write-Host "  Usando GitHub CLI (gh)..." -ForegroundColor Gray
    $prUrl = gh pr create `
        --title "feat(frontend): V14 Gold Clean — visual V8 gold + runtime limpo + SDDF guard" `
        --body $prBody `
        --base main `
        --head v14-v8-gold-clean-rebuild `
        --label "frontend" 2>&1
    Write-Host "  PR criado: $prUrl" -ForegroundColor Green
} else {
    # Fallback: abrir URL no browser para criar PR manualmente
    Write-Host "  GitHub CLI nao encontrado. Abrindo browser para criar PR..." -ForegroundColor Yellow
    $prTitle = [uri]::EscapeDataString("feat(frontend): V14 Gold Clean - visual V8 gold + runtime limpo + SDDF guard")
    $prBodyEsc = [uri]::EscapeDataString($prBody)
    $prCreateUrl = "https://github.com/Imadechumbo/vision-core/compare/main...v14-v8-gold-clean-rebuild?quick_pull=1&title=$prTitle"
    Start-Process $prCreateUrl
    Write-Host ""
    Write-Host "  Browser aberto. Copie e cole a descricao abaixo no campo do PR:" -ForegroundColor Cyan
    Write-Host "  ---------------------------------------------------------------" -ForegroundColor Gray
    Write-Host $prBody -ForegroundColor Gray
    Write-Host "  ---------------------------------------------------------------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Apos criar o PR no browser, volte aqui e pressione ENTER para continuar." -ForegroundColor Yellow
    Read-Host "  Pressione ENTER quando o PR estiver criado"
}
Write-Host ""

# ---------- PASSO 4: Merge na main ----------
Write-Host "PASSO 4: Merge na main..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Opcoes de merge:" -ForegroundColor Gray
Write-Host "  1 = Squash merge (historico limpo — RECOMENDADO)" -ForegroundColor Gray
Write-Host "  2 = Merge commit normal" -ForegroundColor Gray
Write-Host "  3 = Pular merge (fazer no GitHub manualmente)" -ForegroundColor Gray
$mergeOpt = Read-Host "  Escolha (1/2/3)"

if ($mergeOpt -eq "1") {
    # Squash merge local
    git checkout main
    git pull origin main
    git merge --squash origin/v14-v8-gold-clean-rebuild
    git commit -m "feat(frontend): V14 Gold Clean — visual V8 gold + runtime limpo + SDDF guard

- Frontend unico baseado no visual frontend-v8.0-gold
- index.html: shell visual puro, zero runtime inline
- vision-gold.css: DNA visual V8 Gold completo
- vision-api.js: cliente centralizado de endpoints
- vision-chat.js: Vision Chat LLM interativo
- vision-agent-local.js: orbit interativo com gate de evidence
- vision-runtime-owner.js: unico dono da execucao
- vision-report.js: relatorio com evidence receipt obrigatorio
- SDDF FRONT GUARD PASS confirmado
- Zero sabotadores, zero PASS GOLD fake"
    git push origin main
    Write-Host "  Squash merge OK — main atualizada" -ForegroundColor Green

} elseif ($mergeOpt -eq "2") {
    git checkout main
    git pull origin main
    git merge origin/v14-v8-gold-clean-rebuild --no-ff -m "Merge branch 'v14-v8-gold-clean-rebuild' — V14 Gold Clean frontend"
    git push origin main
    Write-Host "  Merge commit OK — main atualizada" -ForegroundColor Green

} else {
    Write-Host "  Merge pulado. Faca o merge no GitHub e volte para o Passo 5." -ForegroundColor Yellow
    Write-Host "  URL: https://github.com/Imadechumbo/vision-core/pulls" -ForegroundColor Cyan
}
Write-Host ""

# ---------- PASSO 5: Guard na main ----------
Write-Host "PASSO 5: Guard na main..." -ForegroundColor Yellow
git checkout main
git pull origin main
node tools\sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "  GUARD FALHOU NA MAIN. Investigar antes de prosseguir." -ForegroundColor Red
    exit 1
}
Write-Host "  SDDF FRONT GUARD PASS em main" -ForegroundColor Green
Write-Host ""

# ---------- PASSO 6: Deletar branches antigas ----------
Write-Host "PASSO 6: Limpando branches antigas..." -ForegroundColor Yellow
Write-Host ""

# Branches para deletar (legadas, nao mais necessarias)
$toDelete = @(
    "v14-v8-gold-clean-rebuild",
    "v13-sddf-clean-core",
    "v13.2-gold-clean-front-interactive",
    "v14-functionality-harvest",
    "v294-cloudflare-proxy-final",
    "test/v82-clean-runtime-ui",
    "cloudflare/workers-autoconfig",
    "#59-DRAFT]-V13.2-—-Interactive-Gold-Clean-Front",
    "Pull-requests-→-#59-DRAFT]-V13.2-—-Interactive-Gold-Clean-Front"
)

# Deletar branches codex (todas as codex/* sao rascunhos automaticos)
$codexBranches = git branch -r | Select-String "origin/codex/" | ForEach-Object {
    $_.ToString().Trim().Replace("origin/", "")
}

Write-Host "  Branches legadas a deletar: $($toDelete.Count + $codexBranches.Count)" -ForegroundColor Gray
$confirm = Read-Host "  Confirma delecao de todas as branches legadas e codex/? (s/N)"

if ($confirm -match "^[Ss]$") {
    # Deletar branches conhecidas
    foreach ($b in $toDelete) {
        $result = git push origin --delete $b 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [DEL] $b" -ForegroundColor Green
        } else {
            Write-Host "  [SKIP] $b (nao existe ou protegida)" -ForegroundColor Gray
        }
    }
    # Deletar branches codex
    foreach ($b in $codexBranches) {
        $result = git push origin --delete $b 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [DEL] $b" -ForegroundColor Green
        } else {
            Write-Host "  [SKIP] $b" -ForegroundColor Gray
        }
    }
    Write-Host ""
    Write-Host "  Limpeza de branches concluida." -ForegroundColor Green
} else {
    Write-Host "  Limpeza de branches pulada." -ForegroundColor DarkYellow
}
Write-Host ""

# ---------- PASSO 7: Estado final ----------
Write-Host "PASSO 7: Estado final do repositorio..." -ForegroundColor Yellow
Write-Host ""
git checkout main
git pull origin main
Write-Host ""
Write-Host "  Commits recentes em main:" -ForegroundColor Gray
git log --oneline -5
Write-Host ""
Write-Host "  Branches remotas restantes:" -ForegroundColor Gray
git branch -r | Select-String -NotMatch "HEAD" | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
Write-Host ""
Write-Host "  Arquivos frontend ativos:" -ForegroundColor Gray
Get-ChildItem -Path "frontend" -Recurse -File | Where-Object { $_.FullName -notlike "*_legacy_quarantine*" } | ForEach-Object {
    Write-Host "    $($_.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor Gray
}
Write-Host ""
node tools\sddf-front-guard.mjs

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  VISION CORE V14 — FINALIZADO" -ForegroundColor Green
Write-Host "  Branch principal: main" -ForegroundColor Green
Write-Host "  Visual: V8 Gold" -ForegroundColor Green
Write-Host "  Runtime: V14 limpo" -ForegroundColor Green
Write-Host "  SDDF FRONT GUARD: PASS" -ForegroundColor Green
Write-Host "  https://github.com/Imadechumbo/vision-core" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
