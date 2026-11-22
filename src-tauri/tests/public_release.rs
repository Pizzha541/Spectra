use std::time::Duration;
use tauri::test::{mock_builder, mock_context, noop_assets};
use tauri_plugin_updater::UpdaterExt;

/// Exercises the native downloader and signature verifier against published assets.
/// The mock application reports version 0.1.0. Installation is deliberately separate.
#[test]
#[ignore = "requires a published Windows release and access to GitHub"]
fn verify_public_release() {
    let config: serde_json::Value =
        serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
    let version = config["version"].as_str().unwrap();
    let mut context = mock_context(noop_assets());
    context.config_mut().plugins = serde_json::from_value(config["plugins"].clone()).unwrap();
    let app = mock_builder()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .build(context)
        .unwrap();
    let endpoint =
        format!("https://github.com/Pizzha541/Spectra/releases/download/v{version}/latest.json");
    tauri::async_runtime::block_on(async {
        let update = app
            .updater_builder()
            .endpoints(vec![endpoint.parse().unwrap()])
            .unwrap()
            .timeout(Duration::from_secs(90))
            .build()
            .unwrap()
            .check()
            .await
            .unwrap()
            .expect("expected a newer public release");
        assert_eq!(update.version, version);
        let verified = update.download(|_, _| {}, || {}).await.unwrap();
        assert!(verified.starts_with(b"MZ"));
    });
}
