import { useMemo, useState } from "react";
import { Check, Link2, Pause, Play, SkipForward, Trash2, Volume2, X } from "lucide-react";
import { useSpectraStore } from "../store/useSpectraStore";
import { syncMediaOverlay } from "../services/desktop";

export function MediaShare() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const queue = useSpectraStore((s) => s.mediaQueue);
  const currentId = useSpectraStore((s) => s.currentMediaId);
  const volume = useSpectraStore((s) => s.mediaVolume);
  const add = useSpectraStore((s) => s.addMedia);
  const setStatus = useSpectraStore((s) => s.setMediaStatus);
  const play = useSpectraStore((s) => s.playMedia);
  const skip = useSpectraStore((s) => s.skipMedia);
  const remove = useSpectraStore((s) => s.removeMedia);
  const setVolume = useSpectraStore((s) => s.setMediaVolume);
  const current = useMemo(() => queue.find((item) => item.id === currentId) ?? null, [queue, currentId]);
  const sync = async () => syncMediaOverlay(useSpectraStore.getState().mediaQueue.find((item) => item.id === useSpectraStore.getState().currentMediaId) ?? null, useSpectraStore.getState().mediaVolume);
  return <section className="page media-page">
    <header className="page-header"><div><span className="eyebrow">CONTROL DE CONTENIDO</span><h1>Media Share</h1><p>Revisa solicitudes antes de enviarlas al overlay de OBS.</p></div><div className="overlay-chip"><span className="status-dot online" /> /media</div></header>
    <div className="media-layout">
      <div className="media-main panel">
        <h2>Añadir enlace</h2><form className="url-form" onSubmit={(e) => { e.preventDefault(); if (add(url)) { setUrl(""); setError(""); } else setError("Introduce una URL http/https válida"); }}><Link2 /><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube, Twitch, TikTok, Kick o archivo directo" /><button type="submit">Añadir</button></form>{error && <div className="form-error">{error}</div>}
        <div className="section-title"><h2>Cola</h2><span>{queue.filter((i) => !["rejected", "finished"].includes(i.status)).length} solicitudes</span></div>
        <div className="media-list">{queue.length === 0 && <div className="empty-state">La cola está vacía. Los enlaces enviados aparecerán aquí.</div>}{queue.map((item) => <article key={item.id} className={`media-item status-${item.status}`}><div className="platform-mark">{item.platform.slice(0, 2).toUpperCase()}</div><div className="media-copy"><strong>{item.title}</strong><span>{item.requester} · {item.platform} · {item.status}</span><small>{item.url}</small></div><div className="media-actions">{item.status === "pending" && <><button title="Aprobar" onClick={() => setStatus(item.id, "approved")}><Check /></button><button title="Rechazar" onClick={() => setStatus(item.id, "rejected")}><X /></button></>}{["approved", "paused"].includes(item.status) && <button className="primary" title="Reproducir" onClick={async () => { play(item.id); await sync(); }}><Play /></button>}{item.status === "playing" && <button title="Pausar" onClick={async () => { setStatus(item.id, "paused"); await sync(); }}><Pause /></button>}<button title="Eliminar" onClick={() => remove(item.id)}><Trash2 /></button></div></article>)}</div>
      </div>
      <aside className="now-playing panel"><span className="eyebrow">EN EMISIÓN</span><div className="media-preview">{current ? <><div className="platform-mark large">{current.platform.slice(0, 2).toUpperCase()}</div><strong>{current.title}</strong></> : <><Play size={40} /><span>Nada reproduciéndose</span></>}</div><div className="playback-controls"><button disabled={!current} onClick={async () => { skip(); await sync(); }}><SkipForward /> Saltar</button></div><label><span><Volume2 /> Volumen del overlay</span><strong>{Math.round(volume * 100)}%</strong><input type="range" min="0" max="1" step="0.05" value={volume} onChange={async (e) => { setVolume(Number(e.target.value)); await sync(); }} /></label><p className="hint">Algunas plataformas bloquean reproducción embebida o controles remotos. SPECTRA usa sus reproductores oficiales cuando están disponibles.</p></aside>
    </div>
  </section>;
}
