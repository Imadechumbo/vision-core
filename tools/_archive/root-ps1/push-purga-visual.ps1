Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — PUSH PURGA VISUAL" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Branch: $(git branch --show-current)" -ForegroundColor Gray
Write-Host ""

# Pull e push da branch de saneamento
git pull origin main --rebase 2>$null
git push origin chore/purge-wrong-visual-references

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  Branch publicada." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Proximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Merge desta branch na main:" -ForegroundColor White
    Write-Host "     git checkout main && git merge chore/purge-wrong-visual-references && git push origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Verificar golden source:" -ForegroundColor White
    Write-Host "     cd frontend/_golden_visual/v8gold-PURO" -ForegroundColor Gray
    Write-Host "     python -m http.server 5500" -ForegroundColor Gray
    Write-Host "     Confirmar que http://localhost:5500 e o visual correto" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. So entao: etapa de limpeza de runtime" -ForegroundColor White
    Write-Host "     (substituir runtimes legados pelos V14 limpos)" -ForegroundColor Gray
} else {
    Write-Host "  ERRO no push." -ForegroundColor Red
}
Write-Host ""
