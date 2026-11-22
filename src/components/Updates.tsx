import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { busy, checkUpdates, deferUpdate, downloadUpdate, installUpdate, setPreviewChannel, useUpdates } from "../services/updates";
import "./updates.css";

export function UpdateSettings() {
  const { phase, current, previews, error, offer } = useUpdates();
  return <section className="panel update-settings">
    <h2>Actualizaciones</h2>
    {current && <p>Versión instalada · {current}</p>}
    <label><input type="checkbox" checked={previews} disabled={busy(phase) || !isTauri()}
      onChange={e => setPreviewChannel(e.target.checked)} /> Incluir versiones preliminares</label>
    <button disabled={busy(phase) || !isTauri()} onClick={() => void checkUpdates(true)}>
      {phase === "checking" ? "Buscando…" : "Buscar actualizaciones"}
    </button>
    {offer && <button onClick={() => useUpdates.setState({visible: true})}>Ver versión {offer.version}</button>}
    <p role="status">{!isTauri() ? "Disponible en la aplicación de Windows." : error || (phase === "current" ? "Tienes la versión más reciente." : "")}</p>
  </section>;
}

export function UpdateNotice() {
  const { phase, visible, offer, current, error, progress } = useUpdates();
  useEffect(() => {
    void checkUpdates();
    const timer = window.setInterval(() => void checkUpdates(), 4 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!visible || !offer) return null;
  const mb = (bytes: number) => (bytes / 1048576).toFixed(1);
  return <aside className="panel update-notice" aria-label="Actualización de SPECTRA">
    <h2>Actualización disponible</h2>
    <p>Instalada {current} → Disponible {offer.version}</p>
    <div className="release-notes">{offer.notes || "El autor no incluyó notas para esta versión."}</div>
    {phase === "downloading" && <div role="status">
      <progress value={progress.total ? progress.received : undefined} max={progress.total || undefined}/>
      <p>{mb(progress.received)} MiB {progress.total ? " / " + mb(progress.total) + " MiB" : "descargados"}</p>
    </div>}
    {phase === "ready" && <p>Firma verificada. La instalación cerrará y volverá a abrir SPECTRA.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="update-actions">
      {phase === "available" && <button className="primary" onClick={downloadUpdate}>Actualizar ahora</button>}
      {phase === "ready" && <button className="primary" onClick={installUpdate}>Instalar y reiniciar</button>}
      {phase !== "installing" && <button onClick={deferUpdate}>Más tarde</button>}
    </div>
  </aside>;
}
