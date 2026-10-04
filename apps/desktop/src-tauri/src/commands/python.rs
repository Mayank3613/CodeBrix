use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

static ACTIVE_EXECUTIONS: OnceLock<Mutex<HashMap<String, Child>>> = OnceLock::new();

#[derive(Clone, Serialize, Deserialize)]
pub struct PythonOutputEvent {
    pub execution_id: String,
    pub line: String,
    pub stream: String, // "stdout" | "stderr"
    pub timestamp: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PythonStatusEvent {
    pub execution_id: String,
    pub status: String, // "running" | "success" | "failed" | "stopped"
    pub timestamp: String,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PythonExitEvent {
    pub execution_id: String,
    pub exit_code: i32,
    pub success: bool,
    pub timestamp: String,
}

fn get_python_executable() -> String {
    let runtime_configs = [
        ".python-runtime.json",
        "../../.python-runtime.json",
        "../../../.python-runtime.json",
    ];
    for cfg_path in &runtime_configs {
        if let Ok(content) = std::fs::read_to_string(cfg_path) {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(p) = parsed.get("python").and_then(|v| v.as_str()) {
                    let pb = std::path::PathBuf::from(p);
                    if pb.exists() {
                        return p.to_string();
                    }
                }
            }
        }
    }

    if let Some(ref root) = find_workspace_root() {
        let venv_unix = root.join(".venv/bin/python");
        if venv_unix.exists() {
            return venv_unix.to_string_lossy().to_string();
        }
        let venv_win = root.join(".venv/Scripts/python.exe");
        if venv_win.exists() {
            return venv_win.to_string_lossy().to_string();
        }
    }

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
        "python".to_string()
    } else {
        "python3".to_string()
    }
}

fn find_workspace_root() -> Option<std::path::PathBuf> {
    let candidates = [
        ".",
        "../..",
        "../../..",
    ];
    for c in &candidates {
        let p = std::path::PathBuf::from(c);
        if p.join("pnpm-workspace.yaml").exists() || (p.join("package.json").exists() && p.join("libraries").exists()) {
            if let Ok(canon) = p.canonicalize() {
                return Some(canon);
            }
            return Some(p);
        }
    }
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(mut cur) = exe_path.parent() {
            while let Some(parent) = cur.parent() {
                if parent.join("libraries").exists() && (parent.join("pnpm-workspace.yaml").exists() || parent.join("package.json").exists()) {
                    return Some(parent.to_path_buf());
                }
                cur = parent;
            }
        }
    }
    None
}

fn now_iso() -> String {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => format!("ts:{}", d.as_millis()),
        Err(_) => "ts:0".to_string(),
    }
}

#[tauri::command]
pub fn run_python_script(app: AppHandle, script: String, execution_id: String) -> Result<(), String> {
    let executions = ACTIVE_EXECUTIONS.get_or_init(|| Mutex::new(HashMap::new()));

    let temp_dir = std::env::temp_dir();
    let script_file = temp_dir.join(format!("codebrix_run_{}.py", execution_id));
    std::fs::write(&script_file, &script)
        .map_err(|e| format!("Failed to write temporary python script: {}", e))?;

    let py_bin = get_python_executable();
    let root_opt = find_workspace_root();

    let mut cmd = Command::new(&py_bin);
    cmd.arg("-u")
        .arg(&script_file)
        .env("PYTHONUNBUFFERED", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(ref root) = root_opt {
        cmd.current_dir(root);
        let py_path_str = format!("{}:{}", root.display(), root.join("python").display());
        cmd.env("PYTHONPATH", py_path_str);
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn Python process ({}): {}", py_bin, e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    if let Ok(mut map) = executions.lock() {
        map.insert(execution_id.clone(), child);
    }

    let _ = app.emit(
        "python-status",
        PythonStatusEvent {
            execution_id: execution_id.clone(),
            status: "running".to_string(),
            timestamp: now_iso(),
            message: Some(format!("Started execution with {}", py_bin)),
        },
    );

    let app_stdout = app.clone();
    let eid_stdout = execution_id.clone();
    if let Some(out) = stdout {
        std::thread::spawn(move || {
            let reader = BufReader::new(out);
            for line in reader.lines().flatten() {
                let _ = app_stdout.emit(
                    "python-output",
                    PythonOutputEvent {
                        execution_id: eid_stdout.clone(),
                        line,
                        stream: "stdout".to_string(),
                        timestamp: now_iso(),
                    },
                );
            }
        });
    }

    let app_stderr = app.clone();
    let eid_stderr = execution_id.clone();
    if let Some(err) = stderr {
        std::thread::spawn(move || {
            let reader = BufReader::new(err);
            for line in reader.lines().flatten() {
                let _ = app_stderr.emit(
                    "python-output",
                    PythonOutputEvent {
                        execution_id: eid_stderr.clone(),
                        line,
                        stream: "stderr".to_string(),
                        timestamp: now_iso(),
                    },
                );
            }
        });
    }

    let app_monitor = app.clone();
    let eid_monitor = execution_id.clone();
    let script_file_cleanup = script_file.clone();
    std::thread::spawn(move || {
        let mut exit_code = -1;
        let mut success = false;

        loop {
            std::thread::sleep(std::time::Duration::from_millis(50));
            let mut finished = false;

            if let Some(executions) = ACTIVE_EXECUTIONS.get() {
                if let Ok(mut map) = executions.lock() {
                    if let Some(child) = map.get_mut(&eid_monitor) {
                        match child.try_wait() {
                            Ok(Some(status)) => {
                                exit_code = status.code().unwrap_or(if status.success() { 0 } else { 1 });
                                success = status.success();
                                finished = true;
                            }
                            Ok(None) => {}
                            Err(_) => {
                                finished = true;
                            }
                        }
                    } else {
                        return;
                    }

                    if finished {
                        map.remove(&eid_monitor);
                    }
                }
            }

            if finished {
                break;
            }
        }

        let _ = std::fs::remove_file(script_file_cleanup);

        let _ = app_monitor.emit(
            "python-status",
            PythonStatusEvent {
                execution_id: eid_monitor.clone(),
                status: if success { "success".to_string() } else { "failed".to_string() },
                timestamp: now_iso(),
                message: Some(format!("Process exited with code {}", exit_code)),
            },
        );

        let _ = app_monitor.emit(
            "python-exit",
            PythonExitEvent {
                execution_id: eid_monitor,
                exit_code,
                success,
                timestamp: now_iso(),
            },
        );
    });

    Ok(())
}

#[tauri::command]
pub fn stop_python_script(execution_id: String) -> Result<(), String> {
    if let Some(executions) = ACTIVE_EXECUTIONS.get() {
        if let Ok(mut map) = executions.lock() {
            if let Some(mut child) = map.remove(&execution_id) {
                let _ = child.kill();
                let _ = child.wait();
                return Ok(());
            }
        }
    }
    Ok(())
}
