//! vc-secret-guard — núcleo local de detecção de secrets do Vision Core.
//! Fase 1 (protótipo local): SOMENTE o comando `scan` é real. Ver
//! docs/VC_SECRET_GUARD_RUST_SPEC.md na raiz do repositório para o contrato
//! completo (motivação, fronteira com o go-core Aegis, plano de fases).
//!
//! `main.rs` é uma casca fina sobre `run()` — a lógica de CLI vive aqui para
//! que os testes de integração em `tests/` possam exercitar o mesmo caminho
//! de código do binário real sem precisar spawnar um subprocesso (sem
//! dependência extra tipo `assert_cmd`).

pub mod categories;
pub mod entropy;
pub mod event;
pub mod mask;
pub mod policy;
pub mod scanner;
pub mod stub;

use std::path::PathBuf;

use policy::Policy;

pub fn run(args: &[String]) -> i32 {
    let Some(command) = args.first() else {
        print_usage();
        return 2;
    };

    match command.as_str() {
        "scan" => run_scan(&args[1..]),
        "watch" => stub::stub("watch", "fase 3 (watch + evento JSON)"),
        "install-hooks" => stub::stub("install-hooks", "fase 2 (hooks locais)"),
        "report" => stub::stub("report", "fase 3 (le eventos emitidos pelo watch)"),
        "policy" => stub::stub("policy", "fase 1 parcial — scan ja usa --policy; subcomandos show/validate/init ainda nao"),
        "-h" | "--help" | "help" => {
            print_usage();
            0
        }
        other => {
            eprintln!("vc-secret-guard: comando desconhecido '{other}'.");
            print_usage();
            2
        }
    }
}

fn print_usage() {
    eprintln!(
        "vc-secret-guard scan [--path <dir>] [--format json|text] [--policy <file>]\n\
         vc-secret-guard watch|install-hooks|report|policy   (stubs — fase futura)\n\
         Ver docs/VC_SECRET_GUARD_RUST_SPEC.md para o contrato completo."
    );
}

struct ScanArgs {
    path: PathBuf,
    format: Format,
    policy_path: Option<PathBuf>,
}

enum Format {
    Text,
    Json,
}

fn parse_scan_args(args: &[String]) -> Result<ScanArgs, String> {
    let mut path = PathBuf::from(".");
    let mut format = Format::Text;
    let mut policy_path = None;

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--path" => {
                i += 1;
                path = PathBuf::from(args.get(i).ok_or("--path exige um valor")?);
            }
            "--format" => {
                i += 1;
                format = match args.get(i).map(String::as_str) {
                    Some("json") => Format::Json,
                    Some("text") => Format::Text,
                    other => return Err(format!("--format invalido: {other:?} (use json|text)")),
                };
            }
            "--policy" => {
                i += 1;
                policy_path = Some(PathBuf::from(
                    args.get(i).ok_or("--policy exige um valor")?,
                ));
            }
            other => return Err(format!("flag desconhecida: {other}")),
        }
        i += 1;
    }

    Ok(ScanArgs {
        path,
        format,
        policy_path,
    })
}

fn run_scan(args: &[String]) -> i32 {
    let scan_args = match parse_scan_args(args) {
        Ok(a) => a,
        Err(e) => {
            eprintln!("vc-secret-guard scan: {e}");
            return 2;
        }
    };

    let policy = match Policy::load(scan_args.policy_path.as_deref()) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("vc-secret-guard scan: {e}");
            return 2;
        }
    };

    let findings = match scanner::scan(&scan_args.path, &policy) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("vc-secret-guard scan: {e}");
            return 2;
        }
    };

    match scan_args.format {
        Format::Json => println!("{}", event::render_json(&findings)),
        Format::Text => println!("{}", event::render_human(&findings)),
    }

    if findings.is_empty() {
        0
    } else {
        1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_command_prints_usage_and_exits_two() {
        assert_eq!(run(&[]), 2);
    }

    #[test]
    fn unknown_command_exits_two() {
        assert_eq!(run(&["bogus".to_string()]), 2);
    }

    #[test]
    fn help_exits_zero() {
        assert_eq!(run(&["--help".to_string()]), 0);
    }

    #[test]
    fn watch_install_hooks_report_policy_are_stubs_exiting_two() {
        for cmd in ["watch", "install-hooks", "report", "policy"] {
            assert_eq!(run(&[cmd.to_string()]), 2, "comando {cmd} deveria ser stub");
        }
    }

    #[test]
    fn scan_on_clean_directory_exits_zero() {
        let dir = std::env::temp_dir().join("vc_secret_guard_run_test_clean");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("clean.txt"), "fn main() {}").unwrap();

        let code = run(&["scan".to_string(), "--path".to_string(), dir.to_string_lossy().to_string()]);
        assert_eq!(code, 0);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn scan_on_dirty_directory_exits_one() {
        let dir = std::env::temp_dir().join("vc_secret_guard_run_test_dirty");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("dirty.txt"), "password: \"correcthorsebatterystaple\"").unwrap();

        let code = run(&["scan".to_string(), "--path".to_string(), dir.to_string_lossy().to_string()]);
        assert_eq!(code, 1);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn scan_with_invalid_format_flag_exits_two_execution_error() {
        let code = run(&[
            "scan".to_string(),
            "--format".to_string(),
            "yaml".to_string(),
        ]);
        assert_eq!(code, 2);
    }

    #[test]
    fn scan_with_unreadable_policy_path_exits_two_execution_error() {
        let code = run(&[
            "scan".to_string(),
            "--policy".to_string(),
            "does/not/exist.toml".to_string(),
        ]);
        assert_eq!(code, 2);
    }
}
