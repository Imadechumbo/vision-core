//! `.vc-secret-guard.toml` parsing — the allowlist configuration. Format is
//! documented in README.md. Kept intentionally small (paths / categories /
//! hashes) — see spec §6 "Allowlist configurável".

use serde::Deserialize;
use std::path::Path;

use crate::categories::Category;

#[derive(Debug, Deserialize, Default)]
pub struct Policy {
    #[serde(default)]
    allowlist: Allowlist,
    #[serde(default)]
    entropy: EntropyConfig,
}

#[derive(Debug, Deserialize, Default)]
struct Allowlist {
    #[serde(default)]
    paths: Vec<String>,
    #[serde(default)]
    categories: Vec<String>,
    #[serde(default)]
    hashes: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct EntropyConfig {
    #[serde(default = "default_min_len")]
    pub min_len: usize,
    #[serde(default = "default_min_bits")]
    pub min_bits: f64,
}

fn default_min_len() -> usize {
    20
}

fn default_min_bits() -> f64 {
    3.5
}

impl Default for EntropyConfig {
    fn default() -> Self {
        EntropyConfig {
            min_len: default_min_len(),
            min_bits: default_min_bits(),
        }
    }
}

impl Policy {
    pub fn load(path: Option<&Path>) -> Result<Policy, String> {
        match path {
            None => Ok(Policy::default()),
            Some(p) => {
                let text = std::fs::read_to_string(p)
                    .map_err(|e| format!("nao foi possivel ler policy {}: {e}", p.display()))?;
                toml::from_str(&text)
                    .map_err(|e| format!("policy invalida em {}: {e}", p.display()))
            }
        }
    }

    pub fn is_category_allowed(&self, category: Category) -> bool {
        !self
            .allowlist
            .categories
            .iter()
            .any(|c| c == category.name())
    }

    pub fn is_path_allowlisted(&self, relative_path: &str) -> bool {
        self.allowlist
            .paths
            .iter()
            .any(|pattern| glob_match(pattern, relative_path))
    }

    pub fn is_hash_allowlisted(&self, hash: &str) -> bool {
        self.allowlist.hashes.iter().any(|h| h == hash)
    }

    pub fn entropy(&self) -> &EntropyConfig {
        &self.entropy
    }
}

/// Minimal glob: `*` matches anything (including nothing) at that position.
/// No `**` recursion, no `?` single-char wildcard — kept to the smallest
/// thing that satisfies the spec's documented allowlist shapes (e.g.
/// `"tests/fixtures/*"`, `"docs/*.md"`). A dedicated `glob` crate was
/// deliberately not added for this — see README.md dependency rationale.
fn glob_match(pattern: &str, text: &str) -> bool {
    let pattern = pattern.replace('\\', "/");
    let text = text.replace('\\', "/");
    let parts: Vec<&str> = pattern.split('*').collect();

    if parts.len() == 1 {
        return pattern == text;
    }

    let mut pos = 0usize;
    for (i, part) in parts.iter().enumerate() {
        if part.is_empty() {
            continue;
        }
        match text[pos..].find(part) {
            Some(found) => {
                if i == 0 && found != 0 {
                    return false;
                }
                pos += found + part.len();
            }
            None => return false,
        }
    }

    if let Some(last) = parts.last() {
        if !last.is_empty() && !text.ends_with(last) {
            return false;
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn glob_star_matches_suffix() {
        assert!(glob_match("tests/fixtures/*", "tests/fixtures/clean.txt"));
        assert!(!glob_match("tests/fixtures/*", "src/main.rs"));
    }

    #[test]
    fn glob_star_matches_extension() {
        assert!(glob_match("docs/*.md", "docs/readme.md"));
        assert!(!glob_match("docs/*.md", "docs/readme.txt"));
    }

    #[test]
    fn glob_exact_match_without_wildcard() {
        assert!(glob_match("Cargo.toml", "Cargo.toml"));
        assert!(!glob_match("Cargo.toml", "cargo.toml"));
    }

    #[test]
    fn empty_policy_allows_everything() {
        let policy = Policy::default();
        assert!(policy.is_category_allowed(Category::ProviderKeyPrefix));
        assert!(!policy.is_path_allowlisted("any/path.txt"));
        assert!(!policy.is_hash_allowlisted("deadbeefcafe"));
    }

    #[test]
    fn parses_toml_with_all_three_allowlist_kinds() {
        let toml_text = r#"
            [allowlist]
            paths = ["tests/fixtures/*"]
            categories = ["high_entropy_blob"]
            hashes = ["abc123def456"]
        "#;
        let policy: Policy = toml::from_str(toml_text).unwrap();
        assert!(policy.is_path_allowlisted("tests/fixtures/x.txt"));
        assert!(!policy.is_category_allowed(Category::HighEntropyBlob));
        assert!(policy.is_category_allowed(Category::BearerToken));
        assert!(policy.is_hash_allowlisted("abc123def456"));
    }
}
