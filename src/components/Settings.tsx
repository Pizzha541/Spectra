import { UpdateSettings } from "./Updates";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Eye, EyeOff, KeyRound, Link2, Radio, Server, Unplug, Wifi } from "lucide-react";
import { useSpectraStore } from "../store/useSpectraStore";
import { obsClient } from "../services/obs";
import { deleteSecret, getOverlayStatus, readSecret, saveSecret, type OverlayStatus } from "../services/desktop";
import { isSupabaseConfigured } from "../services/supabase";

export function Settings() {
  const obs = useSpectraStore((s) => s.obs);
  const setObs = useSpectraStore((s) => s.setObs);
  const integrations = useSpectraStore((s) => s.integrations);
  const setIntegration = useSpectraStore((s) => s.setIntegration);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [obsError, setObsError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [overlay, setOverlay] = useState<OverlayStatus>({ running: false, baseUrl: "http://127.0.0.1:17777" });

  useEffect(() => { getOverlayStatus().then(setOverlay).catch(() => undefined); readSecret("obs_password").then(setPassword).catch(() => undefined); }, []);
  const connectObs = async () => {
    setConnecting(true); setObsError("");
    try { const result = await obsClient.connect(obs.url, password); await saveSecret("obs_password", password); setObs({ connected: true, currentScene: result.currentScene, studioMode: result.studioMode }); }
    catch (error) { setObs({ connected: false }); setObsError(error instanceof Error ? error.message : "No se pudo conectar con OBS"); }
    finally { setConnecting(false); }
  };
  const disconnectObs = async () => { await obsClient.disconnect().catch(() => undefined); setObs({ connected: false, currentScene: "" }); };
  const copy = (value: string) => navigator.clipboard.writeText(value);
  return <section className="page"><header className="page-header"><div><span className="eyebrow">CONEXIONES Y SISTEMA</span><h1>Configuración</h1><p>Conecta OBS y servicios externos sin guardar secretos en el código.</p></div></header>
    <div className="settings-grid">
      <UpdateSettings />
      <div className="panel settings-card"><div className="card-title"><div className="service-icon obs-icon">OBS</div><div><h2>OBS Studio</h2><span className={obs.connected ? "success" : "muted"}>{obs.connected ? `Conectado · ${obs.currentScene}` : "WebSocket 5.x"}</span></div></div>
        <label>Servidor WebSocket<input value={obs.url} onChange={(e) => setObs({ url: e.target.value })} /></label><label>Contraseña<div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña configurada en OBS" /><button onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>{obsError && <div className="form-error">{obsError}</div>}<div className="button-row wide">{obs.connected ? <button className="danger-outline" onClick={disconnectObs}><Unplug /> Desconectar</button> : <button className="primary" disabled={connecting} onClick={connectObs}><Wifi /> {connecting ? "Conectando…" : "Conectar"}</button>}<button onClick={async () => { await deleteSecret("obs_password"); setPassword(""); }}><KeyRound /> Borrar clave</button></div>
      </div>
      <div className="panel settings-card"><div className="card-title"><div className="service-icon"><Server /></div><div><h2>Overlays locales</h2><span className={overlay.running ? "success" : "muted"}>{overlay.running ? "Servidor activo" : "Disponible en la app de escritorio"}</span></div></div><p className="muted">Añade estas URLs como fuentes de navegador de 1920×1080 en OBS.</p>{[{ label: "Escena Live", path: "/overlay" }, { label: "Media Share", path: "/media" }].map((item) => <div className="copy-field" key={item.path}><div><small>{item.label}</small><code>{overlay.baseUrl}{item.path}</code></div><button onClick={() => copy(`${overlay.baseUrl}${item.path}`)}><Copy /></button></div>)}</div>
      <div className="panel settings-card"><div className="card-title"><div className="service-icon twitch">T</div><div><h2>Twitch</h2><span className={integrations.twitchConnected ? "success" : "muted"}>{integrations.twitchConnected ? "Configurado" : "No conectado"}</span></div></div><label>Canal<input value={integrations.twitchChannel} onChange={(e) => setIntegration({ twitchChannel: e.target.value })} placeholder="nombre_de_canal" /></label><button className="primary" onClick={() => setIntegration({ twitchConnected: Boolean(integrations.twitchChannel) })}><Link2 /> Guardar canal</button><p className="hint">OAuth requiere registrar una app en Twitch Developers y configurar su Client ID.</p></div>
      <div className="panel settings-card"><div className="card-title"><div className="service-icon kick">K</div><div><h2>Kick</h2><span className={integrations.kickConnected ? "success" : "muted"}>{integrations.kickConnected ? "Configurado" : "No conectado"}</span></div></div><label>Canal<input value={integrations.kickChannel} onChange={(e) => setIntegration({ kickChannel: e.target.value })} placeholder="nombre_de_canal" /></label><button className="primary" onClick={() => setIntegration({ kickConnected: Boolean(integrations.kickChannel) })}><Link2 /> Guardar canal</button><p className="hint">Las funciones quedan limitadas a los endpoints oficiales disponibles para tu aplicación.</p></div>
      <div className="panel settings-card full"><div className="card-title"><div className="service-icon"><Radio /></div><div><h2>Supabase</h2><span className={isSupabaseConfigured ? "success" : "muted"}>{isSupabaseConfigured ? "Configurado" : "Modo local"}</span></div></div><div className="health-row"><CheckCircle2 /><div><strong>{isSupabaseConfigured ? "Sincronización en la nube habilitada" : "La aplicación funciona localmente"}</strong><span>{isSupabaseConfigured ? "Autenticación, realtime y RLS disponibles." : "Copia .env.example a .env.local y añade URL + anon key para colaboración remota."}</span></div></div></div>
    </div>
  </section>;
}
