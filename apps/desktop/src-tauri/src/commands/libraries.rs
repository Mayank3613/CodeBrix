use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredLibraryInfo {
    pub name: String,
    pub version: String,
    pub description: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub blocks: Vec<String>,
    pub path: String,
    pub manifest_path: String,
    pub is_valid: bool,
    #[serde(default)]
    pub error: Option<String>,
}

fn find_libraries_dir() -> Option<PathBuf> {
    let candidates = [
        "libraries",
        "../../libraries",
        "../../../libraries",
    ];
    for c in &candidates {
        let p = PathBuf::from(c);
        if p.exists() && p.is_dir() {
            return Some(p);
        }
    }
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates_exe = [
                exe_dir.join("../../../libraries"),
                exe_dir.join("../../../../libraries"),
                exe_dir.join("../../../../../libraries"),
            ];
            for p in &candidates_exe {
                if p.exists() && p.is_dir() {
                    return Some(p.clone());
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn list_libraries(custom_path: Option<String>) -> Result<Vec<DiscoveredLibraryInfo>, String> {
    let lib_dir = match custom_path {
        Some(p) => PathBuf::from(p),
        None => find_libraries_dir().unwrap_or_else(|| PathBuf::from("libraries")),
    };

    if !lib_dir.exists() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();
    let entries = fs::read_dir(&lib_dir).map_err(|e| format!("Failed to read directory {:?}: {}", lib_dir, e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let manifest_file = path.join("library.json");
            if manifest_file.exists() {
                match fs::read_to_string(&manifest_file) {
                    Ok(content) => {
                        match serde_json::from_str::<serde_json::Value>(&content) {
                            Ok(val) => {
                                let name = val.get("name").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
                                let version = val.get("version").and_then(|v| v.as_str()).unwrap_or("0.0.0").to_string();
                                let description = val.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let author = val.get("author").and_then(|v| v.as_str()).map(|s| s.to_string());
                                let blocks = val.get("blocks")
                                    .and_then(|v| v.as_array())
                                    .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
                                    .unwrap_or_default();

                                results.push(DiscoveredLibraryInfo {
                                    name,
                                    version,
                                    description,
                                    author,
                                    blocks,
                                    path: path.to_string_lossy().to_string(),
                                    manifest_path: manifest_file.to_string_lossy().to_string(),
                                    is_valid: true,
                                    error: None,
                                });
                            }
                            Err(e) => {
                                results.push(DiscoveredLibraryInfo {
                                    name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                                    version: "0.0.0".to_string(),
                                    description: "Invalid library.json".to_string(),
                                    author: None,
                                    blocks: Vec::new(),
                                    path: path.to_string_lossy().to_string(),
                                    manifest_path: manifest_file.to_string_lossy().to_string(),
                                    is_valid: false,
                                    error: Some(format!("Invalid JSON: {}", e)),
                                });
                            }
                        }
                    }
                    Err(e) => {
                        results.push(DiscoveredLibraryInfo {
                            name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                            version: "0.0.0".to_string(),
                            description: "Unreadable library.json".to_string(),
                            author: None,
                            blocks: Vec::new(),
                            path: path.to_string_lossy().to_string(),
                            manifest_path: manifest_file.to_string_lossy().to_string(),
                            is_valid: false,
                            error: Some(format!("Failed to read: {}", e)),
                        });
                    }
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn read_library_manifest(manifest_path: String) -> Result<String, String> {
    fs::read_to_string(&manifest_path).map_err(|e| format!("Failed to read manifest at '{}': {}", manifest_path, e))
}
