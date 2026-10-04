use std::fs;
use std::path::Path;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file at '{}': {}", path, e))
}

#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories for '{}': {}", path, e))?;
        }
    }
    fs::write(&path, contents).map_err(|e| format!("Failed to write file to '{}': {}", path, e))
}
