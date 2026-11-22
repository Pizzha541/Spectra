import { Eye, EyeOff, GripVertical, Lock, Unlock } from "lucide-react";
import { useSpectraStore } from "../store/useSpectraStore";

export function LayersPanel() {
  const elements = useSpectraStore((state) => state.staging.elements);
  const selected = useSpectraStore((state) => state.selectedIds);
  const select = useSpectraStore((state) => state.select);
  const toggleVisible = useSpectraStore((state) => state.setVisibility);
  const toggleLocked = useSpectraStore((state) => state.setLocked);
  return <div className="layers-panel">
    <div className="panel-heading"><span>CAPAS</span><span>{elements.length}</span></div>
    <div className="layer-list">{[...elements].sort((a, b) => b.zIndex - a.zIndex).map((el) => <div key={el.id} className={`layer-row ${selected.includes(el.id) ? "active" : ""}`} onClick={(e) => select(el.id, e.shiftKey)}>
      <GripVertical className="grip" /><span className="layer-icon">{el.kind.slice(0, 1).toUpperCase()}</span><span className="layer-name">{el.name}</span>
      <button onClick={(e) => { e.stopPropagation(); toggleVisible(el.id); }}>{el.visible ? <Eye /> : <EyeOff />}</button>
      <button onClick={(e) => { e.stopPropagation(); toggleLocked(el.id); }}>{el.locked ? <Lock /> : <Unlock />}</button>
    </div>)}</div>
  </div>;
}
