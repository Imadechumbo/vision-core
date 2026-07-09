//! Detection categories — implements literally the illustrative regex table
//! in docs/VC_SECRET_GUARD_RUST_SPEC.md §6. Regex shapes are generic
//! (comprimento/charset como exemplo), never a copy of a real provider's
//! exact rule or of any `AEGIS_SECRET_*` rule from go-core.

use regex::Regex;

use crate::entropy::looks_like_high_entropy_secret;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Category {
    ProviderKeyPrefix,
    BearerToken,
    CredentialField,
    ConnectionString,
    HighEntropyBlob,
    FallbackCredentialLiteral,
}

impl Category {
    pub fn name(self) -> &'static str {
        match self {
            Category::ProviderKeyPrefix => "provider_key_prefix",
            Category::BearerToken => "bearer_token",
            Category::CredentialField => "credential_field",
            Category::ConnectionString => "connection_string",
            Category::HighEntropyBlob => "high_entropy_blob",
            Category::FallbackCredentialLiteral => "fallback_credential_literal",
        }
    }
}

/// A single line-level match before masking is applied. `raw_secret` is the
/// specific slice that is the actual credential — never the whole line,
/// never surrounding field-name/scheme text — kept as small as possible
/// because everything downstream of this struct must mask it before it can
/// reach stdout/JSON/logs (see mask.rs).
pub struct RawMatch {
    pub category: Category,
    pub raw_secret: String,
}

pub struct CompiledRules {
    provider_key_prefix: Regex,
    bearer_token: Regex,
    credential_field: Regex,
    connection_string: Regex,
    fallback_or: Regex,
    fallback_nullish: Regex,
    fallback_ternary: Regex,
    fallback_default_param: Regex,
    credential_context: Regex,
    value_quoted: Regex,
    value_kv: Regex,
    entropy_min_len: usize,
    entropy_min_bits: f64,
}

/// Prefixos curados conhecidos por serem usados por chaves de API reais —
/// deliberadamente NÃO "qualquer prefixo de 2-5 letras minúsculas" (achado
/// de dogfood contra o próprio repo Vision Core: esse regex genérico demais
/// batia em "pos-renderApplyFixPanel", "snap-id-000...", etc. — nada a ver
/// com credencial). Alinhado ao texto original da spec §6 ("prefixos
/// CONHECIDOS", "tabela de prefixos") — não é lista fixa de secrets, é lista
/// de FORMATOS de prefixo conhecidos; nova entrada de provedor é uma linha
/// aqui, não uma regra nova.
const KNOWN_KEY_PREFIXES: &str = "sk|pk|ak|rk|gh|gl|xox";

/// Palavras de sinal de contexto de credencial usadas pela categoria
/// `fallback_credential_literal` (Fase 1.5, objetivo 1) — nome de
/// variavel/campo/funcao proximo contendo qualquer uma delas. Mesma lista
/// citada literalmente na autorizacao da fase.
const CREDENTIAL_CONTEXT_WORDS: &str = "pw|pass|token|secret|key|auth";

impl CompiledRules {
    pub fn compile(entropy_min_len: usize, entropy_min_bits: f64) -> CompiledRules {
        CompiledRules {
            // shape: known short prefix + "-" + long alphanumeric body.
            provider_key_prefix: Regex::new(&format!(
                r"\b(?:{KNOWN_KEY_PREFIXES})-[A-Za-z0-9]{{20,60}}\b"
            ))
            .unwrap(),
            // shape: "Authorization: Bearer <token>" — token captured alone.
            bearer_token: Regex::new(r"(?i)authorization:\s*bearer\s+([A-Za-z0-9\-_.]{20,})")
                .unwrap(),
            // shape: password|secret|token|api_key|private_key = "literal value"
            // (never process.env.X / os.Getenv / $env:X — those aren't quoted
            // string literals, so this regex structurally never matches them).
            credential_field: Regex::new(
                r#"(?i)\b(?:password|secret|token|api_?key|private_?key)\b\s*[:=]\s*["']([^"'\s]{8,})["']"#,
            )
            .unwrap(),
            // shape: scheme://user:pass@host — only the password segment is
            // captured (the class of leak from the GitLab incident, spec §1).
            connection_string: Regex::new(r"\b[a-z]+://[^:\s/]+:([^@\s/]+)@[^\s/]+").unwrap(),
            // INCIDENTE-3 shape (`x.getItem(...) || 'literal'`) — literal in
            // `||`/`??`/ternary-else fallback position. These three require
            // `credential_context` to also match somewhere on the line (see
            // scan_line) — none of them carries its own context, unlike
            // `fallback_default_param` below.
            fallback_or: Regex::new(r#"\|\|\s*["']([^"'\s]{4,})["']"#).unwrap(),
            fallback_nullish: Regex::new(r#"\?\?\s*["']([^"'\s]{4,})["']"#).unwrap(),
            // `\s+` right after the lone `?` is what disambiguates a ternary
            // from `??` (nullish coalescing has no space between the two
            // `?` chars) — the regex crate has no lookahead to express this
            // more directly.
            fallback_ternary: Regex::new(r#"\?\s+[^:?]*:\s*["']([^"'\s]{4,})["']"#).unwrap(),
            // shape: `<ident containing a context word> = "literal"` — the
            // identifier itself carries the context, so this one is
            // self-contained (no separate credential_context check needed).
            fallback_default_param: Regex::new(&format!(
                r#"(?i)\b(\w*(?:{CREDENTIAL_CONTEXT_WORDS})\w*)\s*=\s*["']([^"'\s]{{4,}})["']"#
            ))
            .unwrap(),
            credential_context: Regex::new(&format!(
                r"(?i)\b\w*(?:{CREDENTIAL_CONTEXT_WORDS})\w*\b"
            ))
            .unwrap(),
            // Fase 1.5, objetivo 2: `high_entropy_blob` so considera token em
            // "posicao de VALOR" — dentro de string literal, ou lado direito
            // de `=`/`:` — nunca identificador solto (nome de funcao/
            // variavel/propriedade em posicao de definicao/chamada nunca
            // bate em nenhum dos dois).
            value_quoted: Regex::new(r#"["']([^"'\n]{4,})["']"#).unwrap(),
            value_kv: Regex::new(r"[:=]\s*([A-Za-z0-9._\-]{4,})").unwrap(),
            entropy_min_len,
            entropy_min_bits,
        }
    }

    /// Runs every category against a single line, returns raw matches found.
    /// Caller (scanner.rs) is responsible for masking before this ever
    /// reaches stdout/JSON/logs — this function's return value is the last
    /// place in the codebase where an un-masked secret legally exists.
    pub fn scan_line(&self, line: &str) -> Vec<RawMatch> {
        let mut matches = Vec::new();

        if let Some(m) = self.provider_key_prefix.find(line) {
            matches.push(RawMatch {
                category: Category::ProviderKeyPrefix,
                raw_secret: m.as_str().to_string(),
            });
        }
        if let Some(caps) = self.bearer_token.captures(line) {
            matches.push(RawMatch {
                category: Category::BearerToken,
                raw_secret: caps[1].to_string(),
            });
        }
        if let Some(caps) = self.credential_field.captures(line) {
            matches.push(RawMatch {
                category: Category::CredentialField,
                raw_secret: caps[1].to_string(),
            });
        }
        if let Some(caps) = self.connection_string.captures(line) {
            let password = &caps[1];
            // achado de dogfood: `${GITLAB_TOKEN}`/`$VAR`/`%VAR%` sao
            // interpolacao de variavel de ambiente/CI, nunca um literal
            // hardcoded (mesmo principio ja aplicado a credential_field
            // pra process.env.X/os.Getenv/$env:X).
            if !looks_like_variable_reference(password) {
                matches.push(RawMatch {
                    category: Category::ConnectionString,
                    raw_secret: password.to_string(),
                });
            }
        }

        // fallback_credential_literal (Fase 1.5, objetivo 1) — INCIDENTE-3
        // shape. `||`/`??`/ternario-else exigem sinal de contexto em
        // qualquer lugar da linha; o parametro-default carrega o proprio
        // sinal no identificador (self-contained).
        //
        // Achado de dogfood: checar a linha crua inteira falso-positivava
        // pesado em valores de string tipo 'PASS_GOLD'/'PASS' (constantes de
        // status do proprio projeto) so porque contem a substring "pass" —
        // nada a ver com credencial. O sinal de contexto so pode vir de
        // CODIGO (nome de variavel/campo/funcao), nunca do CONTEUDO de uma
        // string — por isso o contexto e checado contra a linha com o
        // interior de toda string literal apagado.
        let context_line = strip_quoted_content(line);
        if self.credential_context.is_match(&context_line) {
            if let Some(caps) = self.fallback_or.captures(line) {
                matches.push(RawMatch {
                    category: Category::FallbackCredentialLiteral,
                    raw_secret: caps[1].to_string(),
                });
            }
            if let Some(caps) = self.fallback_nullish.captures(line) {
                matches.push(RawMatch {
                    category: Category::FallbackCredentialLiteral,
                    raw_secret: caps[1].to_string(),
                });
            }
            if let Some(caps) = self.fallback_ternary.captures(line) {
                matches.push(RawMatch {
                    category: Category::FallbackCredentialLiteral,
                    raw_secret: caps[1].to_string(),
                });
            }
        }
        if let Some(caps) = self.fallback_default_param.captures(line) {
            matches.push(RawMatch {
                category: Category::FallbackCredentialLiteral,
                raw_secret: caps[2].to_string(),
            });
        }

        for region in self.value_position_regions(line) {
            for token in region.split(|c: char| !c.is_ascii_alphanumeric()) {
                if looks_like_high_entropy_secret(token, self.entropy_min_len, self.entropy_min_bits)
                {
                    matches.push(RawMatch {
                        category: Category::HighEntropyBlob,
                        raw_secret: token.to_string(),
                    });
                }
            }
        }

        matches
    }

    /// Substrings da linha que estao em "posicao de VALOR" — conteudo de
    /// string literal, ou o que vem depois de `=`/`:` (atribuicao/campo,
    /// aspeado ou nao — cobre tanto JS/TS quanto `CHAVE=valor` de arquivo
    /// `.env`). Um identificador puro (nome de funcao/variavel/propriedade
    /// em posicao de definicao ou chamada) nunca cai em nenhuma das duas
    /// formas.
    fn value_position_regions<'a>(&self, line: &'a str) -> Vec<&'a str> {
        let mut regions = Vec::new();
        for caps in self.value_quoted.captures_iter(line) {
            if let Some(m) = caps.get(1) {
                regions.push(m.as_str());
            }
        }
        for caps in self.value_kv.captures_iter(line) {
            if let Some(m) = caps.get(1) {
                regions.push(m.as_str());
            }
        }
        regions
    }
}

/// Replaces the interior of every quoted string with spaces, so
/// `credential_context` only ever matches identifiers/keywords in actual
/// code — never text that happens to live inside a string *value* (the
/// `'PASS_GOLD'` false-positive class found in dogfood, spec Fase 1.5
/// objetivo 1). Quote character itself is preserved so this doesn't shift
/// byte offsets in a way that would matter for `is_match` (only used for
/// a boolean context check, never for capture positions).
fn strip_quoted_content(line: &str) -> String {
    let mut out = String::with_capacity(line.len());
    let mut in_quote: Option<char> = None;
    for c in line.chars() {
        match in_quote {
            None => {
                // backtick included: JS template literals are extremely
                // common in this codebase (server.js). A `${expr}`
                // sub-expression inside one is technically live code, but
                // tracking that nested boundary is more machinery than a
                // line-level heuristic warrants here — blanking the whole
                // template literal errs toward fewer false positives
                // (the goal of this objective), never toward missing a
                // real bare-identifier context signal elsewhere on the line.
                if c == '"' || c == '\'' || c == '`' {
                    in_quote = Some(c);
                }
                out.push(c);
            }
            Some(q) => {
                if c == q {
                    in_quote = None;
                    out.push(c);
                } else {
                    out.push(' ');
                }
            }
        }
    }
    out
}

/// True for `${VAR}`, `$VAR`, `%VAR%` — CI/shell variable interpolation,
/// never a hardcoded literal. Same exclusion principle as
/// `credential_field`'s requirement of a quoted string literal.
fn looks_like_variable_reference(s: &str) -> bool {
    (s.starts_with("${") && s.ends_with('}'))
        || (s.starts_with('$') && s[1..].chars().all(|c| c.is_ascii_alphanumeric() || c == '_'))
        || (s.starts_with('%') && s.ends_with('%') && s.len() > 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rules() -> CompiledRules {
        CompiledRules::compile(20, 3.5)
    }

    #[test]
    fn provider_key_prefix_detects_shape() {
        let hits = rules().scan_line("const key = \"sk-QjLxM82fWnE9pTr5uYaB0dGh3cKsVoIy\";");
        assert!(hits
            .iter()
            .any(|m| m.category == Category::ProviderKeyPrefix));
    }

    /// Achado de dogfood contra o proprio repo Vision Core: o regex generico
    /// original ("qualquer prefixo de 2-5 letras minusculas + hifen")
    /// disparava em identificadores de codigo comuns sem nenhuma relacao com
    /// credencial. Trava de regressao contra esse achado especifico.
    #[test]
    fn provider_key_prefix_does_not_flag_arbitrary_hyphenated_identifiers() {
        let hits = rules().scan_line("Injetado em: pos-renderApplyFixPanel e pos-renderOther");
        assert!(!hits
            .iter()
            .any(|m| m.category == Category::ProviderKeyPrefix));

        let hits2 = rules().scan_line("snapshot_id: 'snap-id-000000000000000000000000'");
        assert!(!hits2
            .iter()
            .any(|m| m.category == Category::ProviderKeyPrefix));
    }

    #[test]
    fn bearer_token_detects_and_captures_only_the_token() {
        let hits = rules().scan_line("Authorization: Bearer zQ8mK2vX5nR9tL3wP7hJ4sD6fG1cB0aY");
        let hit = hits
            .iter()
            .find(|m| m.category == Category::BearerToken)
            .unwrap();
        assert_eq!(hit.raw_secret, "zQ8mK2vX5nR9tL3wP7hJ4sD6fG1cB0aY");
        assert!(!hit.raw_secret.to_lowercase().contains("authorization"));
    }

    #[test]
    fn credential_field_ignores_env_var_reference() {
        let hits = rules().scan_line("api_key = process.env.API_KEY");
        assert!(!hits
            .iter()
            .any(|m| m.category == Category::CredentialField));
    }

    #[test]
    fn credential_field_detects_literal_string_value() {
        let hits = rules().scan_line("password: \"correcthorsebatterystaple\"");
        assert!(hits
            .iter()
            .any(|m| m.category == Category::CredentialField));
    }

    #[test]
    fn connection_string_captures_only_the_password_segment() {
        let hits = rules().scan_line(
            "remote = https://demo-user:zzTestTokenNotReal99@example-git.invalid/org/repo.git",
        );
        let hit = hits
            .iter()
            .find(|m| m.category == Category::ConnectionString)
            .unwrap();
        assert_eq!(hit.raw_secret, "zzTestTokenNotReal99");
        assert!(!hit.raw_secret.contains("demo-user"));
    }

    /// Achado de dogfood: `.github/workflows/mirror-to-gitlab.yml` tinha
    /// `"https://oauth2:${GITLAB_TOKEN}@gitlab.com/..."` — interpolacao de
    /// variavel de CI (populada de um secret real do GitHub Actions em
    /// runtime), nunca um literal hardcoded no arquivo. Trava de regressao.
    #[test]
    fn connection_string_ignores_shell_and_ci_variable_interpolation() {
        let hits = rules()
            .scan_line("\"https://oauth2:${GITLAB_TOKEN}@gitlab.com/org/repo.git\"");
        assert!(!hits
            .iter()
            .any(|m| m.category == Category::ConnectionString));

        let hits2 = rules().scan_line("https://user:$DB_PASSWORD@localhost/db");
        assert!(!hits2
            .iter()
            .any(|m| m.category == Category::ConnectionString));

        let hits3 = rules().scan_line("https://user:%DB_PASSWORD%@localhost/db");
        assert!(!hits3
            .iter()
            .any(|m| m.category == Category::ConnectionString));
    }

    #[test]
    fn clean_line_has_no_matches() {
        let hits = rules().scan_line("fn main() { println!(\"hello\"); }");
        assert!(hits.is_empty());
    }

    // ---- fallback_credential_literal (Fase 1.5, objetivo 1) ----

    #[test]
    fn fallback_credential_literal_detects_or_fallback_with_credential_context() {
        let hits = rules().scan_line(
            "const pw = localStorage.getItem('vc_user_pw_demo') || 'zzFallbackNotReal01';",
        );
        let hit = hits
            .iter()
            .find(|m| m.category == Category::FallbackCredentialLiteral)
            .expect("deveria detectar fallback || com contexto de credencial");
        assert_eq!(hit.raw_secret, "zzFallbackNotReal01");
    }

    #[test]
    fn fallback_credential_literal_detects_nullish_coalescing_with_context() {
        let hits =
            rules().scan_line("const token = maybeToken ?? 'zzNullishFallbackNotReal02';");
        assert!(hits
            .iter()
            .any(|m| m.category == Category::FallbackCredentialLiteral
                && m.raw_secret == "zzNullishFallbackNotReal02"));
    }

    #[test]
    fn fallback_credential_literal_detects_ternary_else_branch_with_context() {
        let hits = rules().scan_line(
            "const secretValue = hasOverride ? overrideValue : 'zzTernaryFallbackNotReal03';",
        );
        assert!(hits
            .iter()
            .any(|m| m.category == Category::FallbackCredentialLiteral
                && m.raw_secret == "zzTernaryFallbackNotReal03"));
    }

    #[test]
    fn fallback_credential_literal_detects_default_parameter_assignment() {
        let hits = rules()
            .scan_line("function loginFallback(authToken = 'zzDefaultParamNotReal04') {");
        assert!(hits
            .iter()
            .any(|m| m.category == Category::FallbackCredentialLiteral
                && m.raw_secret == "zzDefaultParamNotReal04"));
    }

    /// Instrucao explicita da autorizacao da Fase 1.5: a mesma forma (`||
    /// 'literal'`) sem NENHUM sinal de contexto de credencial na linha nao
    /// pode gerar finding.
    #[test]
    fn fallback_credential_literal_requires_context_or_fallback_without_credential_signal_is_not_flagged(
    ) {
        let hits = rules().scan_line("retry || 'default'");
        assert!(!hits
            .iter()
            .any(|m| m.category == Category::FallbackCredentialLiteral));
    }

    /// Achado real de dogfood (`backend/server.js`, varias linhas): um
    /// ternario tipo `status: x ? 'PASS_GOLD' : 'DONE'` disparava falso
    /// positivo porque a STRING 'PASS_GOLD' contem a substring "pass" —
    /// nada a ver com credencial (e' o nome do gate de validacao do
    /// proprio produto). O sinal de contexto so pode vir de codigo (nome
    /// de variavel/campo), nunca do conteudo de uma string. Trava de
    /// regressao — nem `cond`/`state` (as unicas coisas fora de aspas)
    /// contem nenhuma palavra de contexto.
    #[test]
    fn fallback_credential_literal_ignores_context_word_found_only_inside_a_string_value() {
        let hits = rules().scan_line("const state = cond ? 'PASS_GOLD' : 'DONE';");
        assert!(!hits
            .iter()
            .any(|m| m.category == Category::FallbackCredentialLiteral));
    }

    // ---- entropy value-position restriction (Fase 1.5, objetivo 2) ----

    /// Achado real do dogfood da Fase 1: identificador de funcao camelCase
    /// em posicao de DEFINICAO (nunca de valor) nao deve virar
    /// high_entropy_blob so por aparecer numa linha comprida.
    #[test]
    fn bare_identifier_in_definition_position_is_never_entropy_flagged() {
        let hits =
            rules().scan_line("function passGoldCandidateFromResultAndEvidence(receipt) {");
        assert!(!hits.iter().any(|m| m.category == Category::HighEntropyBlob));
    }

    /// O mesmo identificador em posicao de VALOR (ex.: referencia de funcao
    /// atribuida a uma propriedade) ainda e suprimido — pelo penalizador de
    /// forma de identificador (entropy.rs), nao pela posicao.
    #[test]
    fn identifier_shaped_value_in_value_position_is_still_not_entropy_flagged() {
        let hits = rules().scan_line("handler: passGoldCandidateFromResultAndEvidence,");
        assert!(!hits.iter().any(|m| m.category == Category::HighEntropyBlob));
    }

    /// Um blob de verdade (com digitos, sem forma de identificador) em
    /// posicao de valor continua detectado normalmente.
    #[test]
    fn real_looking_blob_in_value_position_is_still_entropy_flagged() {
        let hits = rules().scan_line("standalone = zK9mQ2xR7vT4wP8nL1sB6fH3cJ0aYdEgU5i");
        assert!(hits.iter().any(|m| m.category == Category::HighEntropyBlob));
    }
}
