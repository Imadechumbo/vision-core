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
}

impl Category {
    pub fn name(self) -> &'static str {
        match self {
            Category::ProviderKeyPrefix => "provider_key_prefix",
            Category::BearerToken => "bearer_token",
            Category::CredentialField => "credential_field",
            Category::ConnectionString => "connection_string",
            Category::HighEntropyBlob => "high_entropy_blob",
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
        for token in line.split(|c: char| !c.is_ascii_alphanumeric()) {
            if looks_like_high_entropy_secret(token, self.entropy_min_len, self.entropy_min_bits) {
                matches.push(RawMatch {
                    category: Category::HighEntropyBlob,
                    raw_secret: token.to_string(),
                });
            }
        }

        matches
    }
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
}
