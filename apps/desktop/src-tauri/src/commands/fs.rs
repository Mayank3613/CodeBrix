use std::fs;
use std::path::PathBuf;

/// Normalizes a file path for cross-platform compatibility.
///
/// On Windows, converts forward slashes to native backslashes.
/// On macOS/Linux, converts backslashes to forward slashes.
/// Handles spaces and non-ASCII characters transparently via Rust's
/// native PathBuf which uses OsString internally.
fn normalize_platform_path(raw_path: &str) -> PathBuf {
    // Replace backslashes with forward slashes for uniform handling,
    // then let PathBuf convert to the OS-native format.
    let uniform = raw_path.replace('\\', "/");
    PathBuf::from(uniform)
}

/// Validates that a file path does not contain null bytes or other
/// OS-specific hazards.
fn validate_path_safety(path: &str) -> Result<(), String> {
    if path.is_empty() {
        return Err("Path is empty".to_string());
    }
    if path.contains('\0') {
        return Err("Path contains null bytes".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    validate_path_safety(&path)?;
    let normalized = normalize_platform_path(&path);
    fs::read_to_string(&normalized)
        .map_err(|e| format!("Failed to read file at '{}': {}", normalized.display(), e))
}

#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    validate_path_safety(&path)?;
    let normalized = normalize_platform_path(&path);

    if let Some(parent) = normalized.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories for '{}': {}", normalized.display(), e))?;
        }
    }
    fs::write(&normalized, contents)
        .map_err(|e| format!("Failed to write file to '{}': {}", normalized.display(), e))
}

/// Lists .cbx project files in a given directory.
/// Returns paths normalized with forward slashes for cross-platform storage.
#[tauri::command]
pub fn list_cbx_files(directory: String) -> Result<Vec<String>, String> {
    validate_path_safety(&directory)?;
    let dir_path = normalize_platform_path(&directory);

    if !dir_path.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&dir_path)
        .map_err(|e| format!("Failed to read directory '{}': {}", dir_path.display(), e))?;

    let mut cbx_files = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext.to_string_lossy().to_lowercase() == "cbx" {
                    // Always store paths with forward slashes for portability
                    let portable = path.to_string_lossy().replace('\\', "/");
                    cbx_files.push(portable);
                }
            }
        }
    }

    Ok(cbx_files)
}

/// Resolves a path relative to the workspace root.
/// Useful for resolving data file references stored in .cbx projects.
#[tauri::command]
pub fn resolve_workspace_path(relative_path: String) -> Result<String, String> {
    validate_path_safety(&relative_path)?;

    let workspace = find_workspace_root()
        .ok_or_else(|| "Could not locate workspace root directory".to_string())?;

    let resolved = workspace.join(normalize_platform_path(&relative_path));

    if resolved.exists() {
        // Return portable forward-slash path
        Ok(resolved.to_string_lossy().replace('\\', "/"))
    } else {
        Err(format!(
            "Path does not exist: '{}' (resolved from workspace root '{}')",
            resolved.display(),
            workspace.display()
        ))
    }
}

fn find_workspace_root() -> Option<PathBuf> {
    let candidates = [".", "../..", "../../.."];
    for c in &candidates {
        let p = PathBuf::from(c);
        if p.join("pnpm-workspace.yaml").exists()
            || (p.join("package.json").exists() && p.join("libraries").exists())
        {
            if let Ok(canon) = p.canonicalize() {
                return Some(canon);
            }
            return Some(p);
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(mut cur) = exe_path.parent() {
            while let Some(parent) = cur.parent() {
                if parent.join("libraries").exists()
                    && (parent.join("pnpm-workspace.yaml").exists()
                        || parent.join("package.json").exists())
                {
                    return Some(parent.to_path_buf());
                }
                cur = parent;
            }
        }
    }
    None
}
