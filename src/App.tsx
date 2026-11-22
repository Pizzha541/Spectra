import { useEffect, useState } from "react";
import { Blocks, CircleUserRound, Clapperboard, LayoutDashboard, LogOut, RadioTower, Settings as SettingsIcon, Users, Wifi } from "lucide-react";
import { Studio } from "./components/Studio";
import { MediaShare } from "./components/MediaShare";
import { Collaboration } from "./components/Collaboration";
import { Settings } from "./components/Settings";
import { AuthDialog } from "./components/AuthDialog";
import { isSupabaseConfigured, supabase } from "./services/supabase";
import { syncLiveOverlay, syncMediaOverlay } from "./services/desktop";
import { useSpectraStore } from "./store/useSpectraStore";
import { useCloudSync } from "./services/useCloudSync";

type Page = "studio" | "media" | "collaboration" | "tools" | "settings";

const nav = [
  { id: "studio", label: "Estudio", icon: LayoutDashboard },
  { id: "media", label: "Media Share", icon: Clapperboard },
  { id: "collaboration", label: "Colaboración", icon: Users },
  { id: "tools", label: "Herramientas", icon: Blocks },
  { id: "settings", label: "Configuración", icon: SettingsIcon },
] as const;

export default function App() {
  const [page, setPage] = useState<Page>("studio");
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured);
  const live = useSpectraStore((s) => s.live);
  const queue = useSpectraStore((s) => s.mediaQueue);
  const currentId = useSpectraStore((s) => s.currentMediaId);
  const volume = useSpectraStore((s) => s.mediaVolume);
  useCloudSync(authenticated);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { syncLiveOverlay(live).catch(console.error); }, []); // initialize desktop server
  useEffect(() => { syncMediaOverlay(queue.find((m) => m.id === currentId) ?? null, volume).catch(console.error); }, [queue, currentId, volume]);
  if (!authenticated) return <AuthDialog onContinue={() => setAuthenticated(true)} />;
  const content = page === "studio" ? <Studio /> : page === "media" ? <MediaShare /> : page === "collaboration" ? <Collaboration /> : page === "settings" ? <Settings /> : <section className="page"><header className="page-header"><div><span className="eyebrow">ECOSISTEMA</span><h1>Herramientas</h1><p>Los widgets se añaden y configuran directamente desde el Estudio.</p></div></header><div className="feature-grid">{["Alertas", "Temporizadores", "Contadores", "Encuestas", "Ruletas", "HTML / CSS / JS"].map((item) => <button className="feature-card" key={item} onClick={() => setPage("studio")}><Blocks /><strong>{item}</strong><span>Abrir en Estudio →</span></button>)}</div></section>;
  return <div className="app-shell"><aside className="app-nav"><div className="brand"><div className="brand-mark"><RadioTower /></div><div><strong>SPECTRA</strong><span>CONTROL SYSTEM</span></div></div><nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}><Icon /><span>{label}</span>{id === "media" && queue.some((i) => i.status === "pending") && <b>{queue.filter((i) => i.status === "pending").length}</b>}</button>)}</nav><div className="nav-status"><div className="connection-row"><Wifi /><span><strong>Espacio local</strong><small>Sincronizado</small></span><i /></div><button className="profile-button"><CircleUserRound /><span><strong>Streamer</strong><small>Propietario</small></span></button>{isSupabaseConfigured && <button className="logout" onClick={() => supabase?.auth.signOut()}><LogOut /> Cerrar sesión</button>}</div></aside><main className="app-main">{content}</main></div>;
}
