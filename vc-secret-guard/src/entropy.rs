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
/// rarely mixes upper+lower+digit within the same token).
pub fn looks_like_high_entropy_secret(token: &str, min_len: usize, min_bits: f64) -> bool {
    if token.chars().count() < min_len {
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
}
