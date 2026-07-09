//! Walks a directory tree and applies `CompiledRules` line by line, producing
//! already-masked `Finding`s. `RawMatch`/`raw_secret` never leaves this file
//! except into `mask()`/`dedup_hash()` — nothing un-masked is ever stored,
//! logged, or returned to a caller.

use std::path::{Path, PathBuf};

use crate::categories::CompiledRules;
use crate::event::Finding;
use crate::mask::{dedup_hash, mask};
use crate::policy::Policy;

/// Directories skipped by default — irrelevant to source secrets (build
/// output, dependency trees) or, in `.git`'s case, capable of producing
/// high-entropy false positives from packed binary objects that were never
/// meant to be read as text.
const DEFAULT_SKIP_DIRS: &[&str] = &[".git", "node_modules", "target", "dist", "build", ".next"];

pub fn scan(root: &Path, policy: &Policy) -> Result<Vec<Finding>, String> {
    let rules = CompiledRules::compile(policy.entropy().min_len, policy.entropy().min_bits);
    let mut findings = Vec::new();
    let mut files = Vec::new();
    collect_files(root, &mut files)?;

    for file in files {
        let relative = file
            .strip_prefix(root)
            .unwrap_or(&file)
            .to_string_lossy()
            .replace('\\', "/");

        if policy.is_path_allowlisted(&relative) {
            continue;
        }

        let text = match std::fs::read_to_string(&file) {
            Ok(t) => t,
            Err(_) => continue, // binary/unreadable file — out of scope for this phase
        };

        for (line_no, line) in text.lines().enumerate() {
            for raw in rules.scan_line(line) {
                if !policy.is_category_allowed(raw.category) {
                    continue;
                }
                let hash = dedup_hash(&raw.raw_secret);
                if policy.is_hash_allowlisted(&hash) {
                    continue;
                }
                findings.push(Finding {
                    category: raw.category.name().to_string(),
                    file: relative.clone(),
                    line: line_no + 1,
                    masked: mask(&raw.raw_secret),
                    hash,
                });
            }
        }
    }

    Ok(findings)
}

fn collect_files(root: &Path, out: &mut Vec<PathBuf>) -> Result<(), String> {
    let entries = std::fs::read_dir(root)
        .map_err(|e| format!("nao foi possivel ler diretorio {}: {e}", root.display()))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("erro lendo entrada de diretorio: {e}"))?;
        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|e| format!("erro lendo tipo de arquivo: {e}"))?;

        if file_type.is_dir() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if DEFAULT_SKIP_DIRS.contains(&name.as_ref()) {
                continue;
            }
            collect_files(&path, out)?;
        } else if file_type.is_file() {
            out.push(path);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("vc_secret_guard_test_{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn skips_default_ignored_directories() {
        let dir = temp_dir("skip_dirs");
        fs::create_dir_all(dir.join("node_modules")).unwrap();
        fs::write(
            dir.join("node_modules/leaked.txt"),
            "password: \"correcthorsebatterystaple\"",
        )
        .unwrap();
        fs::write(dir.join("real.txt"), "fn main() {}").unwrap();

        let policy = Policy::default();
        let findings = scan(&dir, &policy).unwrap();
        assert!(findings.is_empty());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn finds_secret_in_a_normal_file() {
        let dir = temp_dir("finds_secret");
        fs::write(
            dir.join("config.txt"),
            "password: \"correcthorsebatterystaple\"",
        )
        .unwrap();

        let policy = Policy::default();
        let findings = scan(&dir, &policy).unwrap();
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].category, "credential_field");
        assert_eq!(findings[0].line, 1);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn unreadable_binary_file_does_not_error_the_whole_scan() {
        let dir = temp_dir("binary_file");
        fs::write(dir.join("binary.bin"), [0xff, 0xfe, 0x00, 0x01, 0x02]).unwrap();
        fs::write(
            dir.join("clean.txt"),
            "password: \"correcthorsebatterystaple\"",
        )
        .unwrap();

        let policy = Policy::default();
        let findings = scan(&dir, &policy).unwrap();
        assert_eq!(findings.len(), 1);

        let _ = fs::remove_dir_all(&dir);
    }
}
