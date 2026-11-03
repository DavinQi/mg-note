use git2::{IndexAddOption, Repository, Signature, StatusOptions};
use std::path::Path;
use crate::models::SyncStatus;

pub fn open_or_init_repo(path: &Path) -> Result<Repository, String> {
    if path.join(".git").exists() {
        Repository::open(path).map_err(|e| e.to_string())
    } else {
        Repository::init(path).map_err(|e| e.to_string())
    }
}

pub fn get_sync_status(repo: &Repository) -> Result<SyncStatus, String> {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let mut pending_commits = 0;
    let mut conflict_files = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        if status.is_conflicted() {
            if let Some(path) = entry.path() {
                conflict_files.push(path.to_string());
            }
        } else if status.is_wt_new() || status.is_wt_modified() || status.is_index_new() || status.is_index_modified() {
            pending_commits += 1;
        }
    }

    let state = if !conflict_files.is_empty() {
        "conflict"
    } else if pending_commits > 0 {
        "pending"
    } else {
        "synced"
    };

    Ok(SyncStatus {
        state: state.to_string(),
        last_sync_time: Some(chrono::Local::now().format("%H:%M").to_string()),
        pending_commits,
        conflict_files,
    })
}

pub fn commit_all(repo: &Repository, message: &str) -> Result<String, String> {
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;

    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    let sig = Signature::now("mg-node", "mgnode@local").map_err(|e| e.to_string())?;

    let parent_commit = match repo.head() {
        Ok(head) => {
            let target = head.target().ok_or("Cannot resolve HEAD target")?;
            Some(repo.find_commit(target).map_err(|e| e.to_string())?)
        }
        Err(_) => None,
    };

    let parents = match &parent_commit {
        Some(c) => vec![c],
        None => vec![],
    };

    let commit_id = repo
        .commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)
        .map_err(|e| e.to_string())?;

    Ok(commit_id.to_string())
}
