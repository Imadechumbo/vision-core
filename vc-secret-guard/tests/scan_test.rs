//! Integration tests against `tests/fixtures/` — see fixtures/README.md for
//! why every synthetic value planted there is safe to commit. These tests
//! call the library directly (no subprocess), avoiding an extra dependency
//! like `assert_cmd` for spawning the binary.

use std::path::Path;

use vc_secret_guard::event::{render_human, render_json};
use vc_secret_guard::policy::Policy;
use vc_secret_guard::scanner::scan;

fn fixtures_dir() -> &'static Path {
    Path::new("tests/fixtures")
}

#[test]
fn each_category_is_detected_in_its_dedicated_fixture() {
    let policy = Policy::load(None).unwrap();
    let findings = scan(fixtures_dir(), &policy).unwrap();

    for expected in [
        "provider_key_prefix",
        "bearer_token",
        "credential_field",
        "connection_string",
        "high_entropy_blob",
    ] {
        assert!(
            findings.iter().any(|f| f.category == expected),
            "categoria {expected} nao foi detectada em nenhuma fixture"
        );
    }
}

#[test]
fn clean_fixture_contributes_zero_findings() {
    let policy = Policy::load(None).unwrap();
    let findings = scan(fixtures_dir(), &policy).unwrap();
    assert!(
        !findings.iter().any(|f| f.file.ends_with("clean.txt")),
        "clean.txt nao deveria gerar nenhuma deteccao"
    );
}

#[test]
fn allowlisted_path_suppresses_detection_that_would_otherwise_fire() {
    let policy_no_allow = Policy::load(None).unwrap();
    let baseline = scan(fixtures_dir(), &policy_no_allow).unwrap();
    assert!(
        baseline.iter().any(|f| f.file.ends_with("allowlisted.txt")),
        "fixture allowlisted.txt precisa disparar deteccao SEM policy, \
         senao este teste nao prova nada"
    );

    let policy_with_allow =
        Policy::load(Some(Path::new("tests/fixtures/allowlist-policy.toml"))).unwrap();
    let allowed = scan(fixtures_dir(), &policy_with_allow).unwrap();
    assert!(
        !allowed.iter().any(|f| f.file.ends_with("allowlisted.txt")),
        "policy deveria suprimir allowlisted.txt mas nao suprimiu"
    );
}

/// O invariante mais importante da spec (§9.1): o valor bruto do secret
/// NUNCA aparece em nenhuma saida - nem no formato humano, nem no JSON.
#[test]
fn raw_secret_value_never_appears_in_any_output_format() {
    let policy = Policy::load(None).unwrap();
    let findings = scan(fixtures_dir(), &policy).unwrap();
    assert!(
        !findings.is_empty(),
        "precisa de findings para este teste ser significativo"
    );

    let human = render_human(&findings);
    let json = render_json(&findings);

    for raw_secret in known_raw_secrets_from_fixtures() {
        assert!(
            !human.contains(raw_secret),
            "valor bruto '{raw_secret}' vazou na saida humana"
        );
        assert!(
            !json.contains(raw_secret),
            "valor bruto '{raw_secret}' vazou na saida JSON"
        );
    }
}

/// Os valores sinteticos exatos plantados nas fixtures (ver
/// tests/fixtures/README.md para por que sao seguros). Mantidos aqui, fora
/// dos arquivos de fixture, apenas para o teste poder verificar que eles
/// NUNCA aparecem na saida - nunca para reconstrucao do dado a partir da
/// saida mascarada.
fn known_raw_secrets_from_fixtures() -> Vec<&'static str> {
    vec![
        "QjLxM82fWnE9pTr5uYaB0dGh3cKsVoIy",
        "zQ8mK2vX5nR9tL3wP7hJ4sD6fG1cB0aY",
        "correcthorsebatterystaple",
        "zzTestTokenNotReal99",
        "zK9mQ2xR7vT4wP8nL1sB6fH3cJ0aYdEgU5i",
        "N3xQ7pL2vR8tK5wJ9hF4sD6cG1bY0aZ",
    ]
}

#[test]
fn category_allowlist_suppresses_only_that_category() {
    let toml_text = r#"
        [allowlist]
        categories = ["high_entropy_blob"]
    "#;
    let dir = std::env::temp_dir().join("vc_secret_guard_category_allowlist_test");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(
        dir.join("mixed.txt"),
        "password: \"correcthorsebatterystaple\"\nstandalone = zK9mQ2xR7vT4wP8nL1sB6fH3cJ0aYdEgU5i\n",
    )
    .unwrap();

    let policy: Policy = toml::from_str(toml_text).unwrap();
    let findings = scan(&dir, &policy).unwrap();

    assert!(findings.iter().any(|f| f.category == "credential_field"));
    assert!(!findings.iter().any(|f| f.category == "high_entropy_blob"));

    let _ = std::fs::remove_dir_all(&dir);
}
