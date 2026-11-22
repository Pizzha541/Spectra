mod updates;
use axum::{
    extract::State as AxumState,
    http::{header, HeaderMap, StatusCode},
    response::{Html, IntoResponse},
    routing::get,
    Json, Router,
};
use serde::Serialize;
use serde_json::{json, Value};
use std::{net::SocketAddr, sync::Arc};
use tauri::{Manager, State};
use tokio::{net::TcpListener, sync::RwLock};

const OVERLAY_ADDR: &str = "127.0.0.1:17777";

#[derive(Clone)]
struct OverlayState {
    live: Arc<RwLock<Value>>,
    media: Arc<RwLock<Value>>,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self {
            live: Arc::new(RwLock::new(json!({
                "width": 1920, "height": 1080, "background": "transparent", "elements": []
            }))),
            media: Arc::new(RwLock::new(json!({ "media": null, "volume": 0.7 }))),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlayStatus {
    running: bool,
    base_url: String,
}

#[tauri::command]
async fn set_live_state(state: State<'_, OverlayState>, scene: Value) -> Result<(), String> {
    if !scene.is_object() { return Err("El documento Live no es válido".into()); }
    *state.live.write().await = scene;
    Ok(())
}

#[tauri::command]
async fn set_media_state(state: State<'_, OverlayState>, media: Value, volume: f64) -> Result<(), String> {
    *state.media.write().await = json!({ "media": media, "volume": volume.clamp(0.0, 1.0) });
    Ok(())
}

#[tauri::command]
fn get_overlay_status() -> OverlayStatus {
    OverlayStatus { running: true, base_url: format!("http://{OVERLAY_ADDR}") }
}

fn secret_entry(key: &str) -> Result<keyring::Entry, String> {
    if key.len() > 80 || !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
        return Err("Nombre de secreto no válido".into());
    }
    keyring::Entry::new("com.spectra.desktop", key).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_secret(key: String, value: String) -> Result<(), String> {
    secret_entry(&key)?.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_secret(key: String) -> Result<String, String> {
    match secret_entry(&key)?.get_password() {
        Ok(value) => Ok(value),
        Err(keyring::Error::NoEntry) => Ok(String::new()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn delete_secret(key: String) -> Result<(), String> {
    match secret_entry(&key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

async fn live_json(AxumState(state): AxumState<OverlayState>) -> impl IntoResponse {
    let value = state.live.read().await.clone();
    let mut headers = HeaderMap::new();
    headers.insert(header::CACHE_CONTROL, "no-store".parse().unwrap());
    (headers, Json(value))
}

async fn media_json(AxumState(state): AxumState<OverlayState>) -> impl IntoResponse {
    let value = state.media.read().await.clone();
    let mut headers = HeaderMap::new();
    headers.insert(header::CACHE_CONTROL, "no-store".parse().unwrap());
    (headers, Json(value))
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "status": "ok", "service": "spectra-overlays" })))
}

async fn start_overlay_server(state: OverlayState) {
    let app = Router::new()
        .route("/", get(|| async { Html(include_str!("overlay.html")) }))
        .route("/overlay", get(|| async { Html(include_str!("overlay.html")) }))
        .route("/media", get(|| async { Html(include_str!("media.html")) }))
        .route("/api/live", get(live_json))
        .route("/api/media", get(media_json))
        .route("/health", get(health))
        .with_state(state);
    let address: SocketAddr = OVERLAY_ADDR.parse().expect("valid overlay address");
    match TcpListener::bind(address).await {
        Ok(listener) => {
            if let Err(error) = axum::serve(listener, app).await {
                tracing::error!(%error, "overlay server stopped");
            }
        }
        Err(error) => tracing::warn!(%error, "overlay server port unavailable"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .try_init()
        .ok();
    let overlay_state = OverlayState::default();
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(updates::Pending::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(overlay_state.clone())
        .setup(move |app| {
            let state = overlay_state.clone();
            tauri::async_runtime::spawn(start_overlay_server(state));
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("SPECTRA — Stream Control System");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            updates::check_release, updates::download_release, updates::install_release,
            set_live_state, set_media_state, get_overlay_status,
            save_secret, read_secret, delete_secret
        ])
        .run(tauri::generate_context!())
        .expect("error while running SPECTRA");
}
