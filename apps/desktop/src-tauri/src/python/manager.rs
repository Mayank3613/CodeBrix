use std::process::{Command, Stdio};

fn python_executable() -> &'static str {
    if cfg!(target_os = "windows") {
        "py"
    } else {
        "python3"
    }
}

pub fn start_python() {
    let child = Command::new(python_executable())
        .arg("../../../python/runner.py")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect(
            "Failed to start Python. Please run `pnpm setup` and ensure Python 3.11+ is installed.",
        );

    println!("Python started with PID: {}", child.id());
}