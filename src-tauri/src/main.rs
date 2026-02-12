// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Bookmark {
    id: String,
    title: String,
    url: Option<String>,
    date_added: Option<u64>,
    date_modified: Option<u64>,
    description: Option<String>,
    children: Option<Vec<Bookmark>>,
    parent_id: Option<String>,
    index: Option<u32>,
}

#[tauri::command]
fn read_firefox_bookmarks(profile_path: String) -> Result<Vec<Bookmark>, String> {
    // Firefox uses SQLite (places.sqlite)
    let db_path = PathBuf::from(&profile_path).join("places.sqlite");
    if !db_path.exists() {
        return Err(format!("Firefox places.sqlite not found: {}", db_path.display()));
    }

    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, title, url, dateAdded, lastModified, description, parent, position 
         FROM moz_bookmarks 
         WHERE type = 1 OR type = 2
         ORDER BY parent, position"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let bookmark_iter = stmt.query_map([], |row| {
        Ok(Bookmark {
            id: row.get::<_, i64>(0)?.to_string(),
            title: row.get::<_, String>(1)?,
            url: row.get::<_, Option<String>>(2)?,
            date_added: row.get::<_, Option<i64>>(3)?.map(|v| v as u64),
            date_modified: row.get::<_, Option<i64>>(4)?.map(|v| v as u64),
            description: row.get::<_, Option<String>>(5)?,
            children: None,
            parent_id: row.get::<_, Option<i64>>(6)?.map(|v| v.to_string()),
            index: row.get::<_, Option<i32>>(7)?.map(|v| v as u32),
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let mut bookmarks = Vec::new();
    for bookmark in bookmark_iter {
        bookmarks.push(bookmark.map_err(|e| format!("Error reading bookmark: {}", e))?);
    }

    // Build tree structure
    build_bookmark_tree(&mut bookmarks);

    Ok(bookmarks)
}

fn build_bookmark_tree(bookmarks: &mut Vec<Bookmark>) {
    // Group by parent_id
    let mut by_parent: std::collections::HashMap<String, Vec<Bookmark>> = std::collections::HashMap::new();
    let mut root_bookmarks = Vec::new();

    for bookmark in bookmarks.drain(..) {
        if let Some(parent_id) = &bookmark.parent_id {
            by_parent.entry(parent_id.clone()).or_insert_with(Vec::new).push(bookmark);
        } else {
            root_bookmarks.push(bookmark);
        }
    }

    // Recursively build children
    fn add_children(bookmark: &mut Bookmark, by_parent: &std::collections::HashMap<String, Vec<Bookmark>>) {
        if let Some(children) = by_parent.get(&bookmark.id) {
            let mut children_vec = children.clone();
            for child in children_vec.iter_mut() {
                add_children(child, by_parent);
            }
            bookmark.children = Some(children_vec);
        }
    }

    for bookmark in &mut root_bookmarks {
        add_children(bookmark, &by_parent);
    }

    *bookmarks = root_bookmarks;
}

#[tauri::command]
fn read_chrome_bookmarks(profile_path: String) -> Result<Vec<Bookmark>, String> {
    let path = PathBuf::from(&profile_path);
    if !path.exists() {
        return Err(format!("Bookmarks file not found: {}", profile_path));
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read bookmarks file: {}", e))?;

    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let roots = json
        .get("roots")
        .ok_or("Missing 'roots' key in bookmarks file")?;

    let mut bookmarks = Vec::new();
    if let Some(bookmark_bar) = roots.get("bookmark_bar") {
        if let Ok(bookmark) = parse_chrome_bookmark(bookmark_bar, "bookmark_bar".to_string()) {
            bookmarks.push(bookmark);
        }
    }
    if let Some(other) = roots.get("other") {
        if let Ok(bookmark) = parse_chrome_bookmark(other, "other".to_string()) {
            bookmarks.push(bookmark);
        }
    }
    if let Some(synced) = roots.get("synced") {
        if let Ok(bookmark) = parse_chrome_bookmark(synced, "synced".to_string()) {
            bookmarks.push(bookmark);
        }
    }

    Ok(bookmarks)
}

fn parse_chrome_bookmark(value: &serde_json::Value, id: String) -> Result<Bookmark, String> {
    let title = value
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let url = value.get("url").and_then(|v| v.as_str()).map(|s| s.to_string());

    let date_added = value
        .get("date_added")
        .and_then(|v| {
            if let Some(s) = v.as_str() {
                s.parse::<u64>().ok()
            } else if let Some(n) = v.as_u64() {
                Some(n)
            } else {
                None
            }
        });

    let date_modified = value
        .get("date_modified")
        .and_then(|v| {
            if let Some(s) = v.as_str() {
                s.parse::<u64>().ok()
            } else if let Some(n) = v.as_u64() {
                Some(n)
            } else {
                None
            }
        });

    let children = value.get("children").and_then(|v| {
        if let Some(arr) = v.as_array() {
            let mut parsed = Vec::new();
            for (idx, child) in arr.iter().enumerate() {
                let child_id = format!("{}-{}", id, idx);
                if let Ok(bookmark) = parse_chrome_bookmark(child, child_id.clone()) {
                    parsed.push(bookmark);
                }
            }
            Some(parsed)
        } else {
            None
        }
    });

    Ok(Bookmark {
        id,
        title,
        url,
        date_added,
        date_modified,
        description: None,
        children,
        parent_id: None,
        index: None,
    })
}

#[tauri::command]
fn read_edge_bookmarks(profile_path: String) -> Result<Vec<Bookmark>, String> {
    // Edge uses the same format as Chrome
    read_chrome_bookmarks(profile_path)
}

use tauri::Manager;
use tauri::window::WindowBuilder;

#[tauri::command]
async fn create_validation_window(app: tauri::AppHandle) -> Result<(), String> {
    let _window = WindowBuilder::new(&app, "validation")
        .title("Bookmark Validation")
        .inner_size(1000f64, 700f64)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn create_chat_window(app: tauri::AppHandle) -> Result<(), String> {
    let _window = WindowBuilder::new(&app, "chat")
        .title("AI Chat - Bookmark Analysis")
        .inner_size(1200f64, 800f64)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
struct AppSettings {
    #[serde(default, rename = "openRouterApiKey")]
    open_router_api_key: Option<String>,
    #[serde(default, rename = "openaiApiKey")]
    openai_api_key: Option<String>,
    #[serde(default, rename = "claudeApiKey")]
    claude_api_key: Option<String>,
    #[serde(default, rename = "grokApiKey")]
    grok_api_key: Option<String>,
    #[serde(default, rename = "geminiApiKey")]
    gemini_api_key: Option<String>,
    #[serde(default, rename = "groqApiKey")]
    groq_api_key: Option<String>,
    #[serde(default, rename = "kimiApiKey")]
    kimi_api_key: Option<String>,
    #[serde(default, rename = "defaultProvider")]
    default_provider: Option<String>,
}

#[tauri::command]
fn load_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let app_dir = app.path().app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;
    
    let settings_path = app_dir.join("settings.json");
    
    if !settings_path.exists() {
        return Ok(AppSettings {
            open_router_api_key: None,
            openai_api_key: None,
            claude_api_key: None,
            grok_api_key: None,
            gemini_api_key: None,
            groq_api_key: None,
            kimi_api_key: None,
            default_provider: None,
        });
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let settings: AppSettings = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    Ok(settings)
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let app_dir = app.path().app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;
    
    // Create directory if it doesn't exist
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;

    let settings_path = app_dir.join("settings.json");
    
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, content)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_firefox_bookmarks,
            read_chrome_bookmarks,
            read_edge_bookmarks,
            create_validation_window,
            create_chat_window,
            load_settings,
            save_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

