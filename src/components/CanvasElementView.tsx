import { useEffect, useRef } from "react";
import Moveable from "react-moveable";
import type { CanvasElement } from "../types";
import { useSpectraStore } from "../store/useSpectraStore";
import { Bell, Clock3, Gauge, Image as ImageIcon, Play, Vote } from "lucide-react";

interface Props { element: CanvasElement; scale: number }

export function CanvasElementView({ element, scale }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const selected = useSpectraStore((state) => state.selectedIds.includes(element.id));
  const select = useSpectraStore((state) => state.select);
  const update = useSpectraStore((state) => state.updateElement);
  const snap = useSpectraStore((state) => state.snapEnabled);
  const grid = useSpectraStore((state) => state.gridSize);
  const position = (value: number) => snap ? Math.round(value / grid) * grid : value;

  useEffect(() => {
    if (ref.current) ref.current.style.transform = `translate(${element.x}px, ${element.y}px) rotate(${element.rotation}deg)`;
  }, [element.x, element.y, element.rotation]);

  const content = () => {
    if (element.kind === "image") return element.content.startsWith("http") ? <img src={element.content} alt={element.name} draggable={false} /> : <div className="placeholder"><ImageIcon /> Pega una URL de imagen</div>;
    if (element.kind === "video") return <div className="placeholder"><Play /> Fuente de vídeo</div>;
    if (element.kind === "alert") return <div className="widget-content"><Bell /><div><small>ALERTA</small><strong>{element.content}</strong></div></div>;
    if (element.kind === "timer") return <div className="widget-content"><Clock3 /><strong>{element.content}</strong></div>;
    if (element.kind === "counter") return <div className="widget-content"><Gauge /><strong>{element.content}</strong></div>;
    if (element.kind === "poll") return <div className="widget-content"><Vote /><div><small>ENCUESTA</small><strong>{element.content}</strong></div></div>;
    if (element.kind === "wheel") return <div className="wheel-preview">SPECTRA</div>;
    if (element.kind === "custom") return <iframe className="custom-preview" title={element.name} sandbox="allow-scripts" srcDoc={element.content} />;
    return <span>{element.content}</span>;
  };

  if (!element.visible) return null;
  return <>
    <div
      ref={ref}
      data-element-id={element.id}
      className={`canvas-element type-${element.kind} anim-${element.animation} ${selected ? "selected" : ""}`}
      style={{
        width: element.width, height: element.height, opacity: element.opacity,
        color: element.color, background: element.background, fontSize: element.fontSize,
        borderRadius: element.borderRadius, zIndex: element.zIndex,
      }}
      onPointerDown={(event) => { event.stopPropagation(); select(element.id, event.shiftKey); }}
    >{content()}</div>
    {selected && !element.locked && <Moveable
      target={ref}
      draggable
      resizable
      rotatable
      origin={false}
      throttleDrag={1 / scale}
      throttleResize={1 / scale}
      onDragStart={() => update(element.id, {}, true)}
      onDrag={({ beforeTranslate }) => {
        const x = position(beforeTranslate[0] / scale);
        const y = position(beforeTranslate[1] / scale);
        if (ref.current) ref.current.style.transform = `translate(${x}px, ${y}px) rotate(${element.rotation}deg)`;
      }}
      onDragEnd={({ lastEvent }) => lastEvent && update(element.id, { x: position(lastEvent.beforeTranslate[0] / scale), y: position(lastEvent.beforeTranslate[1] / scale) })}
      onResizeStart={() => update(element.id, {}, true)}
      onResize={({ width, height, drag }) => {
        if (!ref.current) return;
        ref.current.style.width = `${width / scale}px`; ref.current.style.height = `${height / scale}px`;
        ref.current.style.transform = `translate(${drag.beforeTranslate[0] / scale}px, ${drag.beforeTranslate[1] / scale}px) rotate(${element.rotation}deg)`;
      }}
      onResizeEnd={({ lastEvent }) => lastEvent && update(element.id, { width: Math.max(40, lastEvent.width / scale), height: Math.max(30, lastEvent.height / scale), x: position(lastEvent.drag.beforeTranslate[0] / scale), y: position(lastEvent.drag.beforeTranslate[1] / scale) })}
      onRotateStart={() => update(element.id, {}, true)}
      onRotate={({ rotation }) => { if (ref.current) ref.current.style.transform = `translate(${element.x}px, ${element.y}px) rotate(${rotation}deg)`; }}
      onRotateEnd={({ lastEvent }) => lastEvent && update(element.id, { rotation: Math.round(lastEvent.rotation) })}
    />}
  </>;
}
