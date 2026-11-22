import { useEffect, useRef, useState } from "react";
import { useSpectraStore } from "../store/useSpectraStore";
import { CanvasElementView } from "./CanvasElementView";

export function CanvasStage() {
  const staging = useSpectraStore((state) => state.staging);
  const select = useSpectraStore((state) => state.select);
  const gridEnabled = useSpectraStore((state) => state.gridEnabled);
  const gridSize = useSpectraStore((state) => state.gridSize);
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.55);

  useEffect(() => {
    const measure = () => {
      if (!host.current) return;
      const rect = host.current.getBoundingClientRect();
      setScale(Math.min((rect.width - 80) / staging.width, (rect.height - 80) / staging.height, 1));
    };
    measure();
    const observer = new ResizeObserver(measure); if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [staging.width, staging.height]);

  return <div ref={host} className="canvas-host" onPointerDown={() => select(null)}>
    <div className="canvas-meta"><span>{staging.width} × {staging.height}</span><span>{Math.round(scale * 100)}%</span></div>
    <div className="canvas-scale" style={{ width: staging.width * scale, height: staging.height * scale }}>
      <div className={`canvas ${gridEnabled ? "has-grid" : ""}`} style={{ width: staging.width, height: staging.height, backgroundColor: staging.background, backgroundSize: `${gridSize}px ${gridSize}px`, transform: `scale(${scale})` }}>
        {[...staging.elements].sort((a, b) => a.zIndex - b.zIndex).map((element) => <CanvasElementView key={element.id} element={element} scale={scale} />)}
      </div>
    </div>
  </div>;
}
