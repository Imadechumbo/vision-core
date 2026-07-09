# vc-secret-guard

Núcleo local de detecção de secrets/vazamentos do Vision Core, escrito em
Rust. **Fase 1 (protótipo local)** — só o comando `scan` é real; `watch`,
`install-hooks`, `report` e `policy` são stubs deliberados (imprimem
"planejado" e saem com código 2, nunca fingem sucesso).

Contrato completo, motivação, e a fronteira com o `go-core` Aegis:
`../docs/VC_SECRET_GUARD_RUST_SPEC.md` (raiz do repositório).

Este crate é **independente** — não faz parte de nenhum workspace
compartilhado com outra peça do Vision Core (Node `server.js`, `go-core`,
frontend Next). Nenhuma dependência de rede, nenhum I/O além de ler arquivos
do disco local.

---

## Dependências — cada uma justificada

| Crate | Por que está aqui | Por que NÃO foi evitada com uma alternativa hand-rolled |
|---|---|---|
| `regex` | As 4 categorias baseadas em regex (`provider_key_prefix`, `bearer_token`, `credential_field`, `connection_string`) — ver spec §6. | A própria spec (§4) já justifica esta escolha: "ecossistema maduro para regex de alta performance (`regex` crate, engine compilada, sem backtracking catastrófico)". Hand-rolar um matcher de padrões equivalente seria mais código, mais risco de bug, e divergiria do design já aprovado na Fase 0. |
| `serde` (+ `derive`) | Serialização/desserialização estruturada — usado por `serde_json` (eventos) e `toml` (policy). | Compartilhado pelas duas dependências abaixo — não é um custo adicional isolado. |
| `serde_json` | Formato `--json` do `scan` e o evento JSON que a spec (§8.2) já desenha como contrato futuro para `server.js`/Next. | Hand-rolar um serializador JSON exigiria escrever escaping de string à mão — risco real de bug de escaping numa ferramenta de segurança cuja saída pode ser consumida por outro processo. `serde_json` é o padrão de fato do ecossistema Rust para isso. |
| `toml` | Parsing de `.vc-secret-guard.toml` (allowlist configurável — spec §6). | TOML tem regras de quoting/comentário não-triviais; hand-rolar um parser parcial arriscaria interpretar mal um arquivo de configuração que decide o que é suprimido — errado exatamente onde teria mais custo. |

**Deliberadamente NÃO usadas** (evitadas para manter dependências mínimas,
per instrução da Fase 1):

- `clap` (ou qualquer parser de CLI) — a superfície de comandos é pequena e
  fixa (5 subcomandos, poucas flags conhecidas). Um parser manual em
  `lib.rs::parse_scan_args` é ~30 linhas e não precisa de dependência.
- `walkdir` — a varredura recursiva de diretório é uma função pequena
  (`scanner.rs::collect_files`) usando só `std::fs`.
- `glob` — o allowlist por caminho só precisa de `*` como wildcard simples
  (sem `**` recursivo, sem `?`). `policy.rs::glob_match` é uma função
  pequena e testada; se um caso de uso real exigir glob completo, essa é
  a hora de trocar por uma dependência de verdade — não antes.
- `sha2` (ou qualquer hash criptográfico) — o hash de deduplicação
  (`mask.rs::dedup_hash`) não precisa de resistência a colisão
  criptográfica (spec §9.1: "útil só para deduplicação/allowlist por
  hash — nunca reversível ao valor original"). FNV-1a de ~10 linhas
  resolve isso sem puxar uma dependência de criptografia para uma
  ferramenta que já lida com dados sensíveis — menos superfície, não mais.
- `assert_cmd` / `predicates` — os testes de integração (`tests/scan_test.rs`)
  chamam a biblioteca diretamente (`vc_secret_guard::scanner::scan`, etc.)
  em vez de spawnar o binário como subprocesso, porque `src/main.rs` é uma
  casca fina sobre `src/lib.rs::run()`.

---

## Formato de `.vc-secret-guard.toml` (policy/allowlist)

```toml
[allowlist]
# Arquivos inteiros ignorados. "*" é wildcard simples (sem "**").
paths = ["tests/fixtures/*", "docs/*.md"]

# Categorias inteiras desligadas (nomes de src/categories.rs::Category::name()).
categories = ["high_entropy_blob"]

# Achados individuais suprimidos por hash de deduplicação (nunca o valor
# real — ver a saída --json de um scan anterior para pegar o campo "hash").
hashes = ["a1b2c3d4e5f6"]

[entropy]
# Ambos opcionais — defaults documentados em src/policy.rs.
min_len = 20
min_bits = 3.5
```

Todas as seções e campos são opcionais — um arquivo vazio ou ausente
(`--policy` não passado) equivale a nenhum allowlist e aos defaults de
entropia.

---

## Uso (Fase 1)

```
vc-secret-guard scan [--path <dir>] [--format json|text] [--policy <file>]
```

- `--path <dir>` — default `.` (diretório atual).
- `--format text` (default) — tabela legível por humano.
- `--format json` — um evento JSON por linha (JSONL), mesmo shape que a
  spec §8.2 desenha para a integração futura com `server.js`/Next.
- `--policy <file>` — caminho para o `.vc-secret-guard.toml`.

Exit codes: `0` = limpo, `1` = detecções encontradas, `2` = erro de execução
(base para o fail-closed dos hooks de git na Fase 2, ainda não
implementados).

**Nenhum output deste binário — texto, JSON, log, ou mensagem de erro —
contém o valor bruto de um secret detectado.** Só categoria, arquivo, linha,
e no máximo um trecho mascarado (`mask.rs`: primeiros 4 caracteres + `***`).

---

## Rodando os testes

```
cargo test
```

Cobertura: cada categoria detecta em sua fixture dedicada
(`tests/fixtures/`), allowlist por caminho/categoria suprime corretamente,
arquivo limpo retorna zero achados, e — o teste mais importante —
`raw_secret_value_never_appears_in_any_output_format` prova que nenhum valor
bruto sintético plantado nas fixtures aparece em nenhuma saída, texto ou
JSON.

**Nota sobre CI:** o CI existente do repositório (Playwright/Node) não tem
toolchain Rust configurado nesta fase — `cargo test` roda hoje só
localmente. Ver `docs/CURRENT_HANDOFF.md` para o registro dessa pendência
(não é uma gambiarra silenciosa: está documentada, não escondida).
