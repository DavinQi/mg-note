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
    pub state: String, // "synced", "syncing", "conflict", "offline"
    pub last_sync_time: Option<String>,
    pub pending_commits: u32,
    pub conflict_files: Vec<String>,
}
