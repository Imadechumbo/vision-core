//! `Finding` is the only shape allowed to leave the scanner. It never carries
//! the raw secret value — `masked` is pre-masked by mask.rs, `hash` is a
//! non-reversible dedup key (mask.rs::dedup_hash). This is the invariant the
//! integration test `raw_secret_value_never_appears_in_any_output_format`
//! enforces end-to-end.
//!
//! The JSON shape here (`type/category/file/line/masked/hash`) is the same
//! event shape spec §8.2 designs for future `watch` JSONL output and a
//! future `server.js` consumer — kept stable on purpose.

use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct Finding {
    pub category: String,
    pub file: String,
    pub line: usize,
    pub masked: String,
    pub hash: String,
}

#[derive(Serialize)]
struct JsonEvent<'a> {
    #[serde(rename = "type")]
    event_type: &'static str,
    category: &'a str,
    file: &'a str,
    line: usize,
    masked: &'a str,
    hash: &'a str,
}

pub fn render_json(findings: &[Finding]) -> String {
    findings
        .iter()
        .map(|f| {
            let event = JsonEvent {
                event_type: "finding",
                category: &f.category,
                file: &f.file,
                line: f.line,
                masked: &f.masked,
                hash: &f.hash,
            };
            serde_json::to_string(&event).unwrap_or_else(|_| "{}".to_string())
        })
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn render_human(findings: &[Finding]) -> String {
    if findings.is_empty() {
        return "vc-secret-guard: nenhuma deteccao.".to_string();
    }

    let mut out = String::new();
    out.push_str(&format!(
        "{:<22} {:<45} {:>6}  {}\n",
        "CATEGORIA", "ARQUIVO", "LINHA", "TRECHO MASCARADO"
    ));
    for f in findings {
        out.push_str(&format!(
            "{:<22} {:<45} {:>6}  {}\n",
            f.category, f.file, f.line, f.masked
        ));
    }
    out.push_str(&format!(
        "\n{} deteccao(oes) encontrada(s).\n",
        findings.len()
    ));
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Finding {
        Finding {
            category: "credential_field".to_string(),
            file: "src/config.rs".to_string(),
            line: 12,
            masked: "AKIA***".to_string(),
            hash: "abc123def456".to_string(),
        }
    }

    #[test]
    fn json_output_is_valid_json_per_line() {
        let json = render_json(&[sample()]);
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["type"], "finding");
        assert_eq!(parsed["category"], "credential_field");
        assert_eq!(parsed["masked"], "AKIA***");
    }

    #[test]
    fn human_output_lists_category_file_and_masked_value() {
        let human = render_human(&[sample()]);
        assert!(human.contains("credential_field"));
        assert!(human.contains("src/config.rs"));
        assert!(human.contains("AKIA***"));
    }

    #[test]
    fn empty_findings_render_a_clean_message_not_an_empty_string() {
        assert!(render_human(&[]).contains("nenhuma"));
        assert_eq!(render_json(&[]), "");
    }
}
