use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub accent: String,
    pub appearance: String,
    pub hand_font: bool,
    pub avatar: String,
    pub avatar_shape: String,
    pub nickname: String,
    pub login_art: String,
    pub login_arts: Option<Vec<LoginArtItem>>,
    pub carousel: String,
    pub interval: u32,
    pub art_order: String,
    #[serde(default)]
    pub dark_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginArtItem {
    pub id: String,
    pub name: Option<String>,
    pub slogan: Option<String>,
    #[serde(default)]
    pub custom: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            accent: "emerald".into(),
            appearance: "paper".into(),
            hand_font: false,
            avatar: "cat".into(),
            avatar_shape: "circle".into(),
            nickname: "Alex".into(),
            login_art: "anime".into(),
            login_arts: None,
            carousel: "auto".into(),
            interval: 6,
            art_order: "seq".into(),
            dark_mode: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteFileItem {
    pub id: String,
    pub path: String,
    pub name: String,
    pub title: String,
    pub kind: String, // "md", "html", "docx", "pptx", "pdf", "txt"
    pub is_folder: bool,
    pub children: Option<Vec<NoteFileItem>>,
    pub updated_at: Option<String>,
    pub public: bool,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub state: String, // "synced", "pending", "conflict", "no_remote"
    pub last_sync_time: Option<String>,
    pub pending_commits: u32,
    pub conflict_files: Vec<String>,
    #[serde(default)]
    pub has_origin: bool,
    #[serde(default)]
    pub remote_url: Option<String>,
    #[serde(default = "default_sync_branch")]
    pub branch: String,
}

fn default_sync_branch() -> String {
    "my-git-note".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncFileChange {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPreview {
    pub local_changes: Vec<SyncFileChange>,
    pub remote_changes: Vec<SyncFileChange>,
    pub possible_conflicts: Vec<String>,
    pub has_origin: bool,
    pub has_remote_branch: bool,
    #[serde(default)]
    pub remote_url: Option<String>,
    #[serde(default = "default_sync_branch")]
    pub branch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SavedCredential {
    pub provider: String,
    pub username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranchItem {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub is_protected: bool,
    pub commit_id: Option<String>,
    pub commit_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitEnvironmentStatus {
    pub is_installed: bool,
    pub version: Option<String>,
    pub binary_path: Option<String>,
    pub can_auto_install: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportFilesResult {
    pub success_count: usize,
    pub total_count: usize,
    pub imported_files: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportFolderResult {
    pub folder_name: String,
    pub rel_path: String,
    pub file_count: usize,
    pub folder_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoStorageUsage {
    pub repo_name: String,
    pub working_size_bytes: u64,
    pub git_size_bytes: u64,
    pub total_size_bytes: u64,
    pub total_size_formatted: String,
    pub file_count: usize,
    pub quota_bytes: u64,
    pub quota_formatted: String,
    pub usage_percentage: f32,
    pub health_status: String, // "healthy", "warning", "critical"
    pub remote_provider: String, // "gitee", "github", "local"
    pub remote_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataRootGroupInfo {
    pub name: String,
    pub display_name: String,
    pub provider: String,
    pub remote_url: Option<String>,
    pub total_size_bytes: u64,
    pub total_size_formatted: String,
    pub quota_bytes: u64,
    pub quota_formatted: String,
    pub usage_percentage: f32,
    pub health_status: String,
    pub file_count: usize,
    pub current_branch: String,
    pub last_sync_time: Option<String>,
    pub is_current: bool,
}
