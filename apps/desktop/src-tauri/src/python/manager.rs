use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};

static PYTHON_PROCESS: OnceLock<Mutex<Option<Child>>> = OnceLock::new();

fn get_python_executable() -> String {
    let venv_candidates = [
        ".venv/bin/python",
        "../../.venv/bin/python",
        "../../../.venv/bin/python",
        ".venv/Scripts/python.exe",
        "../../.venv/Scripts/python.exe",
        "../../../.venv/Scripts/python.exe",
    ];

    for candidate in &venv_candidates {
        let p = std::path::PathBuf::from(candidate);
        if p.exists() {
            return p.to_string_lossy().to_string();
        }
    }

    if cfg!(target_os = "windows") {
        if Command::new("py").arg("--version").output().is_ok() {
            "py".to_string()
        } else {
            "python".to_string()
        }
    } else {
        "python3".to_string()
    }
}

fn find_runner_script() -> std::path::PathBuf {
    let candidates = [
        "python/runner.py",
        "../../python/runner.py",
        "../../../python/runner.py",
    ];

    for candidate in &candidates {
        let path = std::path::PathBuf::from(candidate);
        if path.exists() {
            return path;
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates_exe = [
                exe_dir.join("../../../python/runner.py"),
                exe_dir.join("../../../../python/runner.py"),
                exe_dir.join("../../../../../python/runner.py"),
                exe_dir.join("python/runner.py"),
            ];
            for path in &candidates_exe {
                if path.exists() {
                    return path.clone();
                }
            }
        }
    }

    std::path::PathBuf::from("../../../python/runner.py")
}

pub fn start_python() {
    let runner_path = find_runner_script();
    let py_bin = get_python_executable();
    let spawn_result = Command::new(&py_bin)
        .arg("-u")
        .arg(&runner_path)
        .env("PYTHONUNBUFFERED", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn();

    let mut child = match spawn_result {
        Ok(c) => c,
        Err(e) => {
            eprintln!(
                "[Warning] Could not start background Python ({}) for {}: {}. App will continue, run `pnpm setup` to install Python dependencies.",
                py_bin, runner_path.display(), e
            );
            return;
        }
    };

    println!("Python started with PID: {}", child.id());

    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line) => println!("[Python] {}", line),
                    Err(e) => {
                        eprintln!("[Python stdout error] {}", e);
                        break;
                    }
                }
            }
        });
    }

    let global_child = PYTHON_PROCESS.get_or_init(|| Mutex::new(None));
    if let Ok(mut lock) = global_child.lock() {
        *lock = Some(child);
    }
}

pub fn stop_python() {
    if let Some(global_child) = PYTHON_PROCESS.get() {
        if let Ok(mut lock) = global_child.lock() {
            if let Some(mut child) = lock.take() {
                let _ = child.kill();
                let _ = child.wait();
                println!("Python process stopped.");
            }
        }
    }
}