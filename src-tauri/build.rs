fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        // Integration-test executables need the same common controls as the application.
        println!("cargo:rustc-link-arg-tests=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg-tests=/MANIFESTINPUT:{}/tests/windows.manifest", env!("CARGO_MANIFEST_DIR"));
    }
    tauri_build::build()
}
