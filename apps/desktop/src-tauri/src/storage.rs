use std::fs;
use std::path::{Path, PathBuf};
use crate::models::{NoteFileItem, Settings};

pub fn get_app_dir() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("./"));
    let app_dir = base.join("mg-node");
    if !app_dir.exists() {
        let _ = fs::create_dir_all(&app_dir);
    }
    app_dir
}

pub fn get_repos_dir() -> PathBuf {
    let repos_dir = get_app_dir().join("repos");
    if !repos_dir.exists() {
        let _ = fs::create_dir_all(&repos_dir);
    }
    repos_dir
}

pub fn load_settings() -> Settings {
    let settings_path = get_app_dir().join("settings.json");
    if settings_path.exists() {
        if let Ok(content) = fs::read_to_string(&settings_path) {
            if let Ok(settings) = serde_json::from_str::<Settings>(&content) {
                return settings;
            }
        }
    }
    Settings::default()
}

pub fn save_settings(settings: &Settings) -> Result<(), String> {
    let settings_path = get_app_dir().join("settings.json");
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&settings_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn scan_notebooks_tree(repo_path: &Path) -> Result<Vec<NoteFileItem>, String> {
    let notebooks_dir = repo_path.join("notebooks");
    if !notebooks_dir.exists() {
        // If notebooks directory does not exist, create it with default categories
        let _ = fs::create_dir_all(notebooks_dir.join("后端开发"));
        let _ = fs::create_dir_all(notebooks_dir.join("前端工程"));
        let _ = fs::create_dir_all(notebooks_dir.join("收集笔记"));
        
        // Seed an initial note if empty
        let initial_note = notebooks_dir.join("后端开发").join("Redis-缓存穿透的三种解法.md");
        if !initial_note.exists() {
            let sample = r#"---
id: 01JBX7Q8K2M3N4P5R6S7T8V9W0
title: Redis 缓存穿透的三种解法
tags: [redis, 后端开发]
public: true
created: 2026-11-01T10:20:00+08:00
updated: 2026-11-03T14:05:00+08:00
view_mode: split
---

# Redis 缓存穿透的三种解法

缓存穿透是指查询一个**根本不存在的数据**，由于缓存层不命中，请求直接打到存储层。

> [!NOTE] 核心危害
> 如果黑客恶意发起海量不存在 key 的请求，可能导致后端数据库瞬间宕机。

## 常见解法对比

1. **缓存空对象 (Null Cache)**
   - 优点：实现极简，业务代码侵入小。
   - 缺点：占用额外的缓存内存；数据如果被真实插入，可能存在短暂数据不一致（需设置短 TTL）。

2. **布隆过滤器 (Bloom Filter)**
   - 原理：在访问缓存前通过 BitMap 与多个 Hash 函数预先判断 Key 是否一定不存在。
   - 优点：内存占用极低，拦截率高。
   - 缺点：存在一定的误判率（False Positive），且删除元素相对复杂（可考虑 Counting Bloom Filter）。

3. **接口请求频控与校验**
   - 在 API 网关层做参数基础格式拦截，过滤非法格式请求。
"#;
            let _ = fs::write(initial_note, sample);
        }
    }

    fn read_dir_recursive(dir: &Path, rel_prefix: &str) -> Vec<NoteFileItem> {
        let mut items = Vec::new();
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if file_name.starts_with('.') || file_name == "_folder.json" {
                    continue;
                }
                let is_dir = path.is_dir();
                let rel_path = if rel_prefix.is_empty() {
                    file_name.clone()
                } else {
                    format!("{}/{}", rel_prefix, file_name)
                };

                if is_dir {
                    let children = read_dir_recursive(&path, &rel_path);
                    items.push(NoteFileItem {
                        id: rel_path.clone(),
                        path: rel_path.clone(),
                        name: file_name.clone(),
                        title: file_name,
                        kind: "folder".into(),
                        is_folder: true,
                        children: Some(children),
                        updated_at: None,
                        public: false,
                        tags: vec![],
                    });
                } else {
                    let ext = path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
                    let kind = match ext.as_str() {
                        "md" => "md",
                        "html" | "htm" => "html",
                        "docx" => "docx",
                        "pptx" => "pptx",
                        "pdf" => "pdf",
                        "txt" => "txt",
                        _ => "other",
                    };
                    if kind != "other" {
                        // Read simple front-matter or title
                        let mut title = file_name.clone();
                        let mut public = false;
                        let tags = Vec::new();
                        if ext == "md" {
                            if let Ok(content) = fs::read_to_string(&path) {
                                for line in content.lines().take(10) {
                                    if line.starts_with("title:") {
                                        title = line.trim_start_matches("title:").trim().to_string();
                                    } else if line.starts_with("public: true") {
                                        public = true;
                                    }
                                }
                            }
                        }
                        items.push(NoteFileItem {
                            id: rel_path.clone(),
                            path: rel_path.clone(),
                            name: file_name,
                            title,
                            kind: kind.into(),
                            is_folder: false,
                            children: None,
                            updated_at: Some("刚刚".into()),
                            public,
                            tags,
                        });
                    }
                }
            }
        }
        items
    }

    Ok(read_dir_recursive(&notebooks_dir, ""))
}

pub fn open_external(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let status = Command::new("open")
            .arg(path)
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("Failed to launch external application".into());
        }
    }
    Ok(())
}
