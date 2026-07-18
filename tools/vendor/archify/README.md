# Archify (vendorizado) — arquitetura apenas

Origem: https://github.com/tt-a1i/archify — versao 2.11.0 (MIT, ver `LICENSE`
nesta pasta). Fork/rewrite de `Cocoon-AI/architecture-diagram-generator`.

Subconjunto vendorizado (só o suficiente pra renderizar `diagram_type:
"architecture"` — os outros 4 tipos do Archify, `workflow`/`sequence`/
`dataflow`/`lifecycle`, não foram copiados, sem uso hoje):

```
assets/template.html                       — modificado, ver abaixo
schemas/architecture.schema.json            — inalterado
schemas/common.schema.json                  — inalterado
renderers/architecture/render-architecture.mjs — inalterado
renderers/architecture/grid.mjs             — inalterado
renderers/shared/cli.mjs                    — inalterado
renderers/shared/utils.mjs                  — inalterado
renderers/shared/layout-report.mjs          — inalterado
renderers/shared/geometry.mjs               — inalterado
renderers/shared/validator.mjs              — inalterado
renderers/shared/generated-validators.mjs   — inalterado (validador AJV pré-compilado, sem dependência de rede)
```

## Modificação feita: `assets/template.html`

Removidos os 2 `<link>` (+ 1 `<noscript>`) que carregavam a fonte
"JetBrains Mono" via `fonts.googleapis.com`/`fonts.gstatic.com`. Artefato
gerado pelo Software Factory precisa ficar 100% visualizável offline — a
pilha de fallback do CSS (`ui-monospace, SFMono-Regular, Menlo, Consolas,
'DejaVu Sans Mono', ...`) já cobria isso, só a chamada de rede era o
problema. Confirmado visualmente (screenshot) que o texto continua legível
sem a fonte customizada.

## Por que vendorizado em vez de `npm install`

O pacote `archify` publicado no registro npm público é um projeto não
relacionado (v0.0.4). O `tt-a1i/archify` real é `"private": true` no
`package.json` — só é distribuído via clone/skill installer, não via
registro npm. Vendoring é a única forma de ter isso disponível no runtime
de produção (EB) sem depender de instalação de skill fora do repo.

## Consumido por

`tools/project-architecture-diagram.mjs` — chama
`renderers/architecture/render-architecture.mjs` como processo filho
(o renderer é um script CLI, não expõe função pura importável).
