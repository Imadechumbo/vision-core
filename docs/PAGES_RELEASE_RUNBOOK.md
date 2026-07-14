# Pages — preparação, ensaio e rollback

Este runbook implementa DECISION-028. Os blocos marcados **EXTERNO** alteram Cloudflare Pages e só podem ser executados numa tarefa que autorize explicitamente o ensaio/deploy aplicável. Nunca usar `main`, `master` ou `production` como branch de preview.

## Pré-condições

- `git status --short` vazio e commit esperado conferido.
- TEST-002/003/004 aprovados e `npm run test:pages-package` verde.
- Dois diretórios imutáveis disponíveis: candidato RC e predecessor aprovado. O predecessor é o pacote arquivado, nunca um rebuild.
- Cada diretório contém `deployment-manifest.json`; seu `package_sha256` foi registrado na evidência.
- Credencial Cloudflare com escopo Pages mínimo, fora de arquivos/logs.
- Nome de preview único definido em `PREVIEW_BRANCH`; guard obrigatório: `case "$PREVIEW_BRANCH" in main|master|production|'') exit 1;; esac`.

## Preparação local — não publica

```bash
set -euo pipefail
RC_DIR=/tmp/vision-pages-rc
node tools/build-pages-package.mjs "$RC_DIR"
npm run test:pages-package
node -e "const m=require(process.argv[1]); console.log(m.package_sha256)" "$RC_DIR/deployment-manifest.json"
```

Copiar o predecessor já arquivado para `PREVIOUS_DIR` e registrar, antes do ensaio: commit RC, hash do pacote RC, hash do predecessor, operador, aprovador, horário e nome da branch de preview.

## Ensaio em preview — EXTERNO

```bash
set -euo pipefail
: "${PREVIEW_BRANCH:?defina uma branch de preview única}"
case "$PREVIEW_BRANCH" in main|master|production|'') echo "target proibido" >&2; exit 1;; esac
npx wrangler pages deploy "$RC_DIR" --project-name visioncoreai --branch "$PREVIEW_BRANCH" --commit-dirty=true
```

Capturar a URL retornada e a URL estável da branch. Executar smoke sem escrita sobre `/`, `/landing.html`, `/about.html`, `/vision-core-next.html`, CSS/JS Next e `deployment-manifest.json`; comparar o hash do manifesto servido ao esperado. Depois executar o smoke UI crítico aprovado com dados controlados e guardar status, tempos e correlation IDs sem tokens/PII.

## Reversão ensaiada — EXTERNO

Como a Cloudflare não aceita deployments de preview como alvo do rollback nativo, o ensaio republica o diretório predecessor na mesma branch de preview:

```bash
npx wrangler pages deploy "$PREVIOUS_DIR" --project-name visioncoreai --branch "$PREVIEW_BRANCH" --commit-dirty=true
```

Repetir os smokes e confirmar que o alias da branch serve o hash predecessor. Registrar duração desde o início da reversão até o último smoke verde. Não apagar evidência nem o pacote predecessor.

## Produção — somente após REL-002 e ADR-007

O cutover não faz parte do OPS-001. Em produção, DECISION-028 permite apenas o artefato RC certificado e rollback para deployment de produção anterior ou republicação do pacote predecessor arquivado. Acionar rollback nos thresholds da decisão; falta de telemetria é falha.

## Evidência mínima

- Autoridade, operador, timestamps e target explícito.
- Commit e `package_sha256` de RC/predecessor.
- URLs/deployment IDs e saída redigida dos comandos.
- Dois conjuntos de smoke (RC e predecessor), tempos e correlation IDs.
- Resultado final `Succeeded`, `Rolled Back` ou `Failed`, sem exceção oral.

Referências oficiais verificadas em 2026-07-14: [Wrangler `pages deploy`](https://developers.cloudflare.com/workers/wrangler/commands/pages/#pages-deploy) e [limites de rollback de Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/).
