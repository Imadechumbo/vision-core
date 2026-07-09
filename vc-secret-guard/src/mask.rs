//! Masking + dedup hashing. This is the ONLY module allowed to turn a raw
//! secret value into something that leaves the process (stdout/JSON/logs).
//! See docs/VC_SECRET_GUARD_RUST_SPEC.md §9.1: the guard NEVER transmits the
//! full value, in any output format.

/// Mask a raw matched secret value: first 4 chars kept, rest replaced with
/// "***". Values of 4 chars or fewer are masked completely (never reveal a
/// value too short for "first 4 chars" to be a meaningful truncation).
pub fn mask(raw: &str) -> String {
    let chars: Vec<char> = raw.chars().collect();
    if chars.len() <= 4 {
        "***".to_string()
    } else {
        let prefix: String = chars[..4].iter().collect();
        format!("{prefix}***")
    }
}

/// Non-cryptographic FNV-1a 64-bit hash, truncated to 12 hex chars. Used only
/// for dedup/allowlist-by-hash matching — never reversible to the original
/// value. Collision resistance is not a security requirement here (spec §9.1:
/// "hash truncado do valor, útil só para dedup/allowlist por hash — nunca
/// reversível ao valor original"), so a cryptographic hash crate (sha2) is
/// deliberately not a dependency of this crate.
pub fn dedup_hash(raw: &str) -> String {
    const FNV_OFFSET: u64 = 0xcbf29ce484222325;
    const FNV_PRIME: u64 = 0x100000001b3;
    let mut hash = FNV_OFFSET;
    for byte in raw.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    format!("{:012x}", hash & 0xffff_ffff_ffff)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_keep_first_four_chars_only() {
        assert_eq!(mask("AKIAABCDEFGH1234567890"), "AKIA***");
    }

    #[test]
    fn masks_short_values_completely() {
        assert_eq!(mask("abc"), "***");
        assert_eq!(mask("abcd"), "***");
    }

    #[test]
    fn mask_never_contains_more_than_the_first_four_chars_of_input() {
        let raw = "supersecretvalue1234567890";
        let masked = mask(raw);
        assert!(!masked.contains(&raw[5..]));
    }

    #[test]
    fn dedup_hash_is_deterministic_and_not_the_raw_value() {
        let h1 = dedup_hash("some-secret-value");
        let h2 = dedup_hash("some-secret-value");
        assert_eq!(h1, h2);
        assert_ne!(h1, "some-secret-value");
        assert_eq!(h1.len(), 12);
    }

    #[test]
    fn dedup_hash_differs_for_different_inputs() {
        assert_ne!(dedup_hash("value-a"), dedup_hash("value-b"));
    }
}
