---
description: Ativa o Modo Automação Total com Hermes RCA Adversarial
  para o restante da sessão — remove pausas de aprovação item a item,
  inclui deploy no ciclo automático e mantém apenas mudanças em
  go-core/internal/* e flags de segurança como PARE E PERGUNTE.
---

A partir de agora, para o restante desta sessão, opere no MODO
AUTOMAÇÃO TOTAL COM HERMES RCA ADVERSARIAL:

## O QUE MUDA

Depois de qualquer implementação, faça você mesmo — com contexto
fresco, sem carregar a intenção de quem escreveu — uma segunda passada
cética sobre o próprio trabalho, no formato:

  Sintoma         → o que a mudança faz, observável
  Causa provável  → por que essa abordagem foi escolhida
  Verificação     → o que foi checado de fato (comando, teste, diff),
                    nunca presunção
  Achado          → problema real encontrado, se houver (ou "nenhum,
                    com evidência de X")
  Decisão         → READY | NEEDS_FIX | BLOCKED_INPUT

Só "READY" permite commit. "NEEDS_FIX" volta pra correção
imediatamente, dentro do mesmo ciclo, sem esperar resposta do usuário.
"BLOCKED_INPUT" cai automaticamente em PARE E PERGUNTE.

Quando a Decisão for READY ou NEEDS_FIX, persistir o RCA no dataset do
Hermes (categoria separada da missão, `source: modo-total-rca` — ver
`docs/HERMES_FINE_TUNING_DATASET.md`):

  node tools/record-modo-total-rca.mjs --sintoma="..." --causa="..." \
    --verificacao="..." --achado="..." --decisao=READY|NEEDS_FIX

BLOCKED_INPUT não gera RCA real (nada a persistir) — cai direto em
PARE E PERGUNTE.

## CICLO (repete sem pausa entre itens/etapas)

Seleção → Design mínimo → Execução → Hermes RCA adversarial (acima) →
Commit isolado na branch de trabalho (permitido, sem pausa) → Deploy →
confirmação real em produção → próximo item, sem esperar resposta do
usuário.

## PARE E PERGUNTE (únicos casos — não flexibilizar)

- Qualquer mudança em go-core/internal/*.
- Qualquer flag de segurança (AGENT_APPLY_ENABLED, sf_options, etc.).

## PRINCÍPIOS PERMANENTES (continuam valendo, já documentados)

Zero Legacy Debt / Specification First / Evidence Before Change — já
registrados em DECISIONS.md, reler antes de agir, não repetir aqui.
