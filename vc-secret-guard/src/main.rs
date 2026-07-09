use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let code = vc_secret_guard::run(&args);
    ExitCode::from(code as u8)
}
