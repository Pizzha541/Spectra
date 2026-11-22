use reqwest::Url;
use semver::Version;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::{ipc::Channel, AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};
use tokio::sync::Mutex;

const API: &str = "https://api.github.com/repos/Pizzha541/Spectra/releases";
const ASSETS: &str = "https://github.com/Pizzha541/Spectra/releases/download";

#[derive(Default)]
pub struct Pending(Mutex<Option<Package>>);

struct Package {
    update: Update,
    verified: Option<Vec<u8>>,
}

#[derive(Deserialize)]
struct Release {
    tag_name: String,
    draft: bool,
    prerelease: bool,
    body: Option<String>,
}

impl Release {
    fn eligible(&self, current: &Version, previews: bool) -> Option<Version> {
        let v = Version::parse(self.tag_name.strip_prefix('v')?).ok()?;
        (!self.draft
            && v.cmp_precedence(current).is_gt()
            && (previews || (!self.prerelease && v.pre.is_empty())))
        .then_some(v)
    }
}

#[derive(Serialize)]
pub struct Offer {
    version: String,
    notes: String,
}

#[tauri::command]
pub async fn check_release(
    app: AppHandle,
    state: State<'_, Pending>,
    previews: bool,
) -> Result<Option<Offer>, String> {
    let mut slot = state.0.lock().await;
    let client = reqwest::Client::builder()
        .user_agent("SPECTRA-desktop")
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(err)?;
    let mut best: Option<(Version, Release)> = None;
    for page in 1.. {
        let releases: Vec<Release> = client
            .get(format!("{API}?per_page=100&page={page}"))
            .send()
            .await
            .map_err(err)?
            .error_for_status()
            .map_err(err)?
            .json()
            .await
            .map_err(err)?;
        let last = releases.len() < 100;
        for release in releases {
            if let Some(v) = release.eligible(&app.package_info().version, previews) {
                if best
                    .as_ref()
                    .is_none_or(|(old, _)| v.cmp_precedence(old).is_gt())
                {
                    best = Some((v, release));
                }
            }
        }
        if last {
            break;
        }
    }
    let Some((version, release)) = best else {
        *slot = None;
        return Ok(None);
    };
    let prefix = format!("{ASSETS}/{}/", release.tag_name);
    let endpoint = Url::parse(&format!("{prefix}latest.json")).map_err(err)?;
    let update = app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(err)?
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(err)?
        .check()
        .await
        .map_err(err)?
        .ok_or("El manifiesto de la release no ofrece esta versión.")?;
    if update.version != version.to_string() || !update.download_url.as_str().starts_with(&prefix) {
        return Err("El paquete no coincide con la release oficial.".into());
    }
    let offer = Offer {
        version: update.version.clone(),
        notes: release.body.unwrap_or_default(),
    };
    *slot = Some(Package {
        update,
        verified: None,
    });
    Ok(Some(offer))
}

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

#[derive(Clone, Serialize)]
pub struct Progress {
    received: u64,
    total: Option<u64>,
}

#[tauri::command]
pub async fn download_release(
    state: State<'_, Pending>,
    version: String,
    progress: Channel<Progress>,
) -> Result<(), String> {
    let mut slot = state.0.lock().await;
    let package = slot
        .as_mut()
        .filter(|p| p.update.version == version)
        .ok_or("Vuelve a buscar la versión.")?;
    let mut received = 0;
    package.verified = Some(
        package
            .update
            .download(
                |chunk, total| {
                    received += chunk as u64;
                    let _ = progress.send(Progress { received, total });
                },
                || {},
            )
            .await
            .map_err(err)?,
    );
    Ok(())
}

#[tauri::command]
pub async fn install_release(state: State<'_, Pending>, version: String) -> Result<(), String> {
    let slot = state.0.lock().await;
    let package = slot
        .as_ref()
        .filter(|p| p.update.version == version)
        .ok_or("Busca la versión de nuevo.")?;
    package
        .update
        .install(
            package
                .verified
                .as_ref()
                .ok_or("Descarga pendiente de verificación.")?,
        )
        .map_err(err)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn release_policy() {
        let current = Version::new(1, 0, 0);
        for (tag, draft, prerelease, expected_stable, expected_preview) in [
            ("v1.0.1", false, false, true, true),
            ("v2.0.0-beta.1", false, false, false, true),
            ("v2.0.0", false, true, false, true),
            ("v2.0.0", true, false, false, false),
            ("v1.0.0+other", false, false, false, false),
            ("v0.9.0", false, false, false, false),
            ("unversioned", false, false, false, false),
        ] {
            let r = Release {
                tag_name: tag.into(),
                draft,
                prerelease,
                body: None,
            };
            assert_eq!(r.eligible(&current, false).is_some(), expected_stable);
            assert_eq!(r.eligible(&current, true).is_some(), expected_preview);
        }
    }
}
