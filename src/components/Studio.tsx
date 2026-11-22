import { useEffect, useState } from "react";
import { Check, ChevronDown, Cloud, CloudOff, Grid3X3, Redo2, Rocket, Save, Undo2 } from "lucide-react";
import { CanvasStage } from "./CanvasStage";
import { ToolPalette } from "./ToolPalette";
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { useSpectraStore } from "../store/useSpectraStore";
import { syncLiveOverlay } from "../services/desktop";

export function Studio() {
  const [published, setPublished] = useState(false);
  const staging = useSpectraStore((s) => s.staging);
  const live = useSpectraStore((s) => s.live);
  const history = useSpectraStore((s) => s.history);
  const future = useSpectraStore((s) => s.future);
  const undo = useSpectraStore((s) => s.undo);
  const redo = useSpectraStore((s) => s.redo);
  const publish = useSpectraStore((s) => s.publish);
  const duplicate = useSpectraStore((s) => s.duplicateSelected);
  const remove = useSpectraStore((s) => s.removeSelected);
  const gridEnabled = useSpectraStore((s) => s.gridEnabled);
  const snapEnabled = useSpectraStore((s) => s.snapEnabled);
  const setOption = useSpectraStore((s) => s.setCanvasOption);
  const status = useSpectraStore((s) => s.syncStatus);
  const markSaved = useSpectraStore((s) => s.markSaved);
  const dirty = staging.revision !== live.revision || staging.updatedAt !== live.updatedAt;

  useEffect(() => {
    const timer = setTimeout(markSaved, 650);
    return () => clearTimeout(timer);
  }, [staging.updatedAt, markSaved]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches("input, textarea, select")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") { event.preventDefault(); duplicate(); }
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); remove(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicate, remove]);

  const doPublish = async () => { const scene = publish(); await syncLiveOverlay(scene); setPublished(true); setTimeout(() => setPublished(false), 1600); };
  return <div className="studio-page">
    <header className="studio-toolbar"><div className="scene-select"><span className="status-dot online" /><div><small>ESCENA</small><strong>{staging.name}</strong></div><ChevronDown /></div><div className="toolbar-actions"><button disabled={!history.length} title="Deshacer (Ctrl+Z)" onClick={undo}><Undo2 /></button><button disabled={!future.length} title="Rehacer (Ctrl+Shift+Z)" onClick={redo}><Redo2 /></button><span className="toolbar-separator" /><button className={gridEnabled ? "active" : ""} onClick={() => setOption({ gridEnabled: !gridEnabled })}><Grid3X3 /> Grid</button><button className={snapEnabled ? "active" : ""} onClick={() => setOption({ snapEnabled: !snapEnabled })}>⊹ Snap</button></div><div className="publish-zone"><span className={`save-state ${status}`}>{status === "offline" ? <CloudOff /> : status === "saving" ? <Cloud /> : <Save />}{status === "saving" ? "Guardando…" : "Guardado"}</span><div className={`live-state ${dirty ? "dirty" : ""}`}><span /> LIVE</div><button className={`publish-button ${published ? "done" : ""}`} disabled={!dirty && !published} onClick={doPublish}>{published ? <><Check /> Publicado</> : <><Rocket /> Publicar</>}</button></div></header>
    <div className="studio-layout"><aside className="left-rail"><ToolPalette /><LayersPanel /></aside><main className="stage-column"><CanvasStage /><div className="canvas-footer"><span><kbd>Shift</kbd> multiselección</span><span><kbd>Ctrl D</kbd> duplicar</span><span><kbd>Del</kbd> eliminar</span></div></main><PropertiesPanel /></div>
  </div>;
}
