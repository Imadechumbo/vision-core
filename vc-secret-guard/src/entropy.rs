//! Shannon entropy over a string, backing the `high_entropy_blob` category —
//! the safety net for credential formats not covered by the named regex
//! categories (spec §6).

use std::collections::HashMap;

pub fn shannon_entropy(s: &str) -> f64 {
    if s.is_empty() {
        return 0.0;
    }
    let mut counts: HashMap<char, u32> = HashMap::new();
    for c in s.chars() {
        *counts.entry(c).or_insert(0) += 1;
    }
    let len = s.chars().count() as f64;
    counts
        .values()
        .map(|&count| {
            let p = count as f64 / len;
            -p * p.log2()
        })
        .sum()
}

/// True if the token "looks like" a credential blob: long enough, high
/// entropy, and mixes character classes (a long plain word or URL host
/// rarely mixes upper+lower+digit within the same token). Fase 1.5,
/// objective 2: also rejects tokens that look like a source-code identifier
/// (see `looks_like_code_identifier`) — achado do dogfood da Fase 1:
/// identificadores camelCase/snake_case longos (`passGoldCandidateFromResult`)
/// batiam nesse calculo sem serem secrets.
pub fn looks_like_high_entropy_secret(token: &str, min_len: usize, min_bits: f64) -> bool {
    if token.chars().count() < min_len {
        return false;
    }
    if looks_like_code_identifier(token) {
        return false;
    }
    let has_upper = token.chars().any(|c| c.is_ascii_uppercase());
    let has_lower = token.chars().any(|c| c.is_ascii_lowercase());
    let has_digit = token.chars().any(|c| c.is_ascii_digit());
    let class_count = [has_upper, has_lower, has_digit]
        .iter()
        .filter(|b| **b)
        .count();
    class_count >= 2 && shannon_entropy(token) >= min_bits
}

/// True if `token` reads as a code identifier rather than a random blob:
/// zero digits, and splits (on `_`/`-`/camelCase boundaries) into >=2
/// alphabetic "word-shaped" segments. A real mixed-charset secret almost
/// always has a digit somewhere, which short-circuits this to `false`
/// immediately — a token with digits is never treated as an identifier,
/// regardless of shape.
///
/// Segments of 5+ chars must contain a vowel (`y` counts — "sync"/"try"/
/// "by") — the trait a pronounceable word/identifier segment has and a
/// random consonant run doesn't. Segments up to 4 chars are accepted
/// without a vowel: short abbreviation segments (`Id`, `Db`, `Ok`, `Btn`,
/// `Pkg`, `Tpl`, `Cfg`, and this project's own `vc` prefix —
/// `vcPromptPreviewClose`/`vcGenerateMissionBtn` et al.) are exactly the
/// length range where "needs a vowel" stops being a reliable signal — this
/// isn't a rule about any one prefix or word, just abbreviation length.
pub fn looks_like_code_identifier(token: &str) -> bool {
    if token.chars().any(|c| c.is_ascii_digit()) {
        return false;
    }
    let segments = split_identifier_segments(token);
    segments.len() >= 2
        && segments.iter().all(|seg| {
            let chars: Vec<char> = seg.chars().collect();
            if chars.len() < 2 || !chars.iter().all(|c| c.is_ascii_alphabetic()) {
                return false;
            }
            if chars.len() <= 4 {
                return true;
            }
            chars
                .iter()
                .any(|c| matches!(c.to_ascii_lowercase(), 'a' | 'e' | 'i' | 'o' | 'u' | 'y'))
        })
}

/// Splits on `_`/`-` and on lowercase->uppercase transitions (camelCase /
/// PascalCase word boundaries) — e.g. `passGoldCandidateFromResult` ->
/// ["pass", "Gold", "Candidate", "From", "Result"].
fn split_identifier_segments(token: &str) -> Vec<String> {
    let chars: Vec<char> = token.chars().collect();
    let mut segments = Vec::new();
    let mut current = String::new();

    for (i, &c) in chars.iter().enumerate() {
        if c == '_' || c == '-' {
            if !current.is_empty() {
                segments.push(std::mem::take(&mut current));
            }
            continue;
        }
        if i > 0 && c.is_ascii_uppercase() && chars[i - 1].is_ascii_lowercase() && !current.is_empty() {
            segments.push(std::mem::take(&mut current));
        }
        current.push(c);
    }
    if !current.is_empty() {
        segments.push(current);
    }
    segments
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uniform_repeated_char_has_zero_entropy() {
        assert_eq!(shannon_entropy("aaaaaaaaaa"), 0.0);
    }

    #[test]
    fn random_looking_token_has_high_entropy() {
        let e = shannon_entropy("aZ9kQ3mR7pL1xW5v");
        assert!(e > 3.0, "expected high entropy, got {e}");
    }

    #[test]
    fn short_tokens_never_flagged_regardless_of_entropy() {
        assert!(!looks_like_high_entropy_secret("aZ9k", 20, 3.5));
    }

    #[test]
    fn single_character_class_not_flagged_even_if_long_and_high_entropy() {
        // 30 distinct lowercase letters in non-repeating order: high entropy,
        // but only one character class present — should not flag.
        assert!(!looks_like_high_entropy_secret(
            "abcdefghijklmnopqrstuvwxyzabcd",
            20,
            3.5
        ));
    }

    #[test]
    fn mixed_class_long_token_is_flagged() {
        assert!(looks_like_high_entropy_secret(
            "aZ9kQ3mR7pL1xW5vT2nB8cF4",
            20,
            3.5
        ));
    }

    /// Achado do dogfood (Fase 1): identificador de funcao camelCase real do
    /// proprio repo (`backend/server.js`) batia no calculo de entropia sem
    /// ser secret. Trava de regressao para o objetivo 2 da Fase 1.5.
    #[test]
    fn camel_case_identifier_without_digits_is_not_flagged_even_if_long_and_mixed_case() {
        assert!(!looks_like_high_entropy_secret(
            "passGoldCandidateFromResult",
            20,
            3.5
        ));
    }

    #[test]
    fn snake_case_identifier_is_not_flagged() {
        assert!(!looks_like_high_entropy_secret(
            "normalize_evidence_receipt_value",
            20,
            3.5
        ));
    }

    #[test]
    fn pascal_case_identifier_is_not_flagged() {
        assert!(!looks_like_high_entropy_secret(
            "ProviderVaultRoutingTable",
            20,
            3.5
        ));
    }

    /// A presenca de UM digito basta para nunca tratar como identificador —
    /// um secret real quase sempre tem digito em algum lugar, entao isso
    /// nunca deve suprimir um achado real so por "parecer" camelCase.
    #[test]
    fn any_digit_present_defeats_the_identifier_penalty_even_if_shape_is_camel_case_ish() {
        assert!(looks_like_high_entropy_secret(
            "aZ9kQ3mR7pL1xW5vT2nB8cF4Gh6",
            20,
            3.5
        ));
        assert!(!looks_like_code_identifier("aZ9kQ3mR7pL1xW5vT2nB8cF4Gh6"));
    }

    #[test]
    fn single_run_on_word_without_case_boundaries_is_not_treated_as_identifier() {
        // Only one segment (no underscore/camelCase boundary) -> doesn't
        // qualify as identifier-shaped even without digits; still subject
        // to the normal class_count>=2 rule (this one has only lowercase,
        // so it was already excluded before this feature existed).
        assert!(!looks_like_code_identifier("lowercaseonlyrun"));
    }
}
