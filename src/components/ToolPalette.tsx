import { Bell, Clock3, Code2, Gauge, Image, PlaySquare, Plus, Type, Vote, CircleDotDashed } from "lucide-react";
import { useSpectraStore } from "../store/useSpectraStore";
import type { ElementKind } from "../types";

const tools: { kind: ElementKind; label: string; icon: typeof Type }[] = [
  { kind: "text", label: "Texto", icon: Type }, { kind: "image", label: "Imagen", icon: Image },
  { kind: "video", label: "Vídeo", icon: PlaySquare }, { kind: "alert", label: "Alerta", icon: Bell },
  { kind: "timer", label: "Temporizador", icon: Clock3 }, { kind: "counter", label: "Contador", icon: Gauge },
  { kind: "poll", label: "Encuesta", icon: Vote }, { kind: "wheel", label: "Ruleta", icon: CircleDotDashed },
  { kind: "custom", label: "HTML", icon: Code2 },
];

export function ToolPalette() {
  const add = useSpectraStore((state) => state.addElement);
  return <div className="tool-palette"><div className="panel-heading"><span>AÑADIR</span><Plus size={14} /></div><div className="tool-grid">{tools.map(({ kind, label, icon: Icon }) => <button key={kind} onClick={() => add(kind)}><Icon /><span>{label}</span></button>)}</div></div>;
}
