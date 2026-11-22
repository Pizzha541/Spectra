import { AlignCenter, ArrowDown, ArrowUp, Copy, Eye, EyeOff, Lock, Trash2, Unlock } from "lucide-react";
import { useSpectraStore } from "../store/useSpectraStore";
import type { CanvasElement } from "../types";

export function PropertiesPanel() {
  const staging = useSpectraStore((state) => state.staging);
  const ids = useSpectraStore((state) => state.selectedIds);
  const update = useSpectraStore((state) => state.updateElement);
  const remove = useSpectraStore((state) => state.removeSelected);
  const duplicate = useSpectraStore((state) => state.duplicateSelected);
  const reorder = useSpectraStore((state) => state.reorder);
  const selected = staging.elements.find((el) => ids[0] === el.id);

  if (!selected) return <aside className="properties-panel empty-panel"><div className="panel-heading">PROPIEDADES</div><AlignCenter size={30} /><p>Selecciona un elemento para editar su posición, contenido y apariencia.</p></aside>;

  const number = (key: keyof CanvasElement, value: string) => update(selected.id, { [key]: Number(value) }, true);
  return <aside className="properties-panel">
    <div className="panel-heading"><span>PROPIEDADES</span><span className="kind-badge">{selected.kind}</span></div>
    <label>Nombre<input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value }, true)} /></label>
    <label>Contenido{selected.kind === "custom" ? <textarea rows={5} value={selected.content} onChange={(e) => update(selected.id, { content: e.target.value }, true)} /> : <textarea rows={3} value={selected.content} onChange={(e) => update(selected.id, { content: e.target.value }, true)} />}</label>
    <div className="field-grid">
      <label>X<input type="number" value={Math.round(selected.x)} onChange={(e) => number("x", e.target.value)} /></label>
      <label>Y<input type="number" value={Math.round(selected.y)} onChange={(e) => number("y", e.target.value)} /></label>
      <label>Ancho<input type="number" min="40" value={Math.round(selected.width)} onChange={(e) => number("width", e.target.value)} /></label>
      <label>Alto<input type="number" min="30" value={Math.round(selected.height)} onChange={(e) => number("height", e.target.value)} /></label>
      <label>Rotación<input type="number" value={Math.round(selected.rotation)} onChange={(e) => number("rotation", e.target.value)} /></label>
      <label>Radio<input type="number" min="0" value={selected.borderRadius} onChange={(e) => number("borderRadius", e.target.value)} /></label>
    </div>
    <label>Opacidad <span>{Math.round(selected.opacity * 100)}%</span><input type="range" min="0" max="1" step="0.05" value={selected.opacity} onChange={(e) => number("opacity", e.target.value)} /></label>
    <div className="field-grid">
      <label>Texto<input type="color" value={selected.color} onChange={(e) => update(selected.id, { color: e.target.value }, true)} /></label>
      <label>Fondo<input type="color" value={selected.background.startsWith("#") ? selected.background : "#11141f"} onChange={(e) => update(selected.id, { background: e.target.value }, true)} /></label>
    </div>
    <label>Animación<select value={selected.animation} onChange={(e) => update(selected.id, { animation: e.target.value as CanvasElement["animation"] }, true)}><option value="none">Ninguna</option><option value="fade">Aparecer</option><option value="slide">Deslizar</option><option value="pulse">Pulso</option></select></label>
    <div className="button-row">
      <button title="Subir capa" onClick={() => reorder(selected.id, "up")}><ArrowUp /></button>
      <button title="Bajar capa" onClick={() => reorder(selected.id, "down")}><ArrowDown /></button>
      <button title="Duplicar" onClick={duplicate}><Copy /></button>
      <button title="Mostrar/ocultar" onClick={() => update(selected.id, { visible: !selected.visible }, true)}>{selected.visible ? <Eye /> : <EyeOff />}</button>
      <button title="Bloquear" onClick={() => update(selected.id, { locked: !selected.locked }, true)}>{selected.locked ? <Lock /> : <Unlock />}</button>
      <button className="danger" title="Eliminar" onClick={remove}><Trash2 /></button>
    </div>
  </aside>;
}
