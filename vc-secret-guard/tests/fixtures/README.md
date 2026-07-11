# Fixtures — por que são seguras (regra anti-autoflagelo, spec §7)

Nenhum arquivo nesta pasta contém um secret real. Todo valor foi **escrito à
mão** especificamente para casar com a *forma* de uma categoria de detecção
(comprimento, charset, contexto) — nunca copiado, gerado a partir de, ou
derivado de uma credencial real de qualquer provedor, deste projeto ou de
qualquer outro.

Como cada valor foi escolhido para ser reconhecivelmente sintético:

| Fixture | Valor sintético | Por que é seguro |
|---|---|---|
| `provider_key_prefix.txt` | `sk-QjLxM82fWnE9pTr5uYaB0dGh3cKsVoIy` | Prefixo `sk-` casa com a *forma* curada de prefixo (achado de dogfood: `src/categories.rs::KNOWN_KEY_PREFIXES`), mas o corpo (`QjLxM82fWnE9pTr5uYaB0dGh3cKsVoIy`) é gerado à mão — não corresponde a nenhuma chave real emitida por nenhum provedor, não passa em nenhum checksum/formato real de nenhum serviço específico. Mesmo padrão de ofuscação já usado nos depoimentos pré-existentes de `frontend/about.html` (`sk-prod-abc123xyz789`). |
| `bearer_token.txt` | `zQ8mK2vX5nR9tL3wP7hJ4sD6fG1cB0aY` | String alfanumérica gerada à mão para casar com a forma "token longo" — nunca foi um token emitido por nenhum serviço. |
| `credential_field.txt` | `correcthorsebatterystaple` | É literalmente a senha de exemplo do webcomic xkcd #936 sobre segurança de senhas — a string de exemplo mais conhecida do mundo para "isto é um exemplo, não um segredo real". |
| `connection_string.txt` | `zzTestTokenNotReal99` sobre `example-git.invalid` | Auto-descritivo (`TestTokenNotReal`) e usa o TLD `.invalid`, reservado pela IANA (RFC 2606) especificamente para nunca resolver de verdade. |
| `high_entropy_blob.txt` | `zK9mQ2xR7vT4wP8nL1sB6fH3cJ0aYdEgU5i` | String alfanumérica gerada à mão, sem contexto de credencial ao redor (sem `bearer`, sem `://`, sem campo nomeado) — existe só para exercitar o cálculo de entropia de Shannon. |
| `allowlisted.txt` | `rk-N3xQ7pL2vR8tK5wJ9hF4sD6cG1bY0aZ` | Mesma lógica do `provider_key_prefix.txt` (prefixo curado, corpo sintético gerado à mão) — usada para provar que `allowlist-policy.toml` suprime a detecção por caminho de arquivo. |
| `clean.txt` | — | Código trivial sem nenhum padrão de credencial, usado para provar que um arquivo limpo não gera falso positivo. |
| `fallback_credential_literal.txt` | `zzFallbackNotReal01`, sobre `localStorage.getItem('vc_user_pw_demo') \|\| '...'` | Reproduz a *forma* do INCIDENTE-3 (`docs/CURRENT_STATE.md`) — literal usado como fallback de credencial via `\|\|` — nunca o valor real do incidente, que não aparece em nenhum arquivo deste crate. `vc_user_pw_demo`/`zzFallbackNotReal01` são nomes/valor escritos à mão só para casar com a forma (nome de variável com sinal de contexto `pw`, valor auto-descritivo `NotReal`). |

Nenhum destes valores jamais foi ou será um secret de produção deste ou de
qualquer outro projeto. `tests/scan_test.rs` verifica explicitamente que
**nenhum destes valores brutos aparece em nenhum formato de saída** (texto ou
JSON) — só a versão mascarada (`mask.rs`) — o mesmo invariante que valeria
para um secret real, testado aqui com dados descartáveis.
