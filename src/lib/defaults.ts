import type { CanvasElement, Collaborator, SceneDocument } from "../types";
import { newId } from "./id";

export const makeElement = (kind: CanvasElement["kind"], index = 0): CanvasElement => ({
  id: newId(kind),
  kind,
  name: `${kind[0].toUpperCase()}${kind.slice(1)}`,
  x: 160 + index * 24,
  y: 120 + index * 24,
  width: kind === "text" ? 420 : 360,
  height: kind === "text" ? 90 : 220,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  zIndex: index,
  content: kind === "text" ? "Tu stream, bajo control." : kind === "timer" ? "05:00" : kind === "counter" ? "0" : "https://",
  color: "#f6f7fb",
  background: kind === "text" ? "transparent" : "rgba(17, 20, 31, .88)",
  fontSize: kind === "text" ? 42 : 28,
  borderRadius: 16,
  animation: "none",
});

const welcome = makeElement("text", 0);
welcome.x = 112;
welcome.y = 92;
welcome.width = 680;
welcome.content = "SPECTRA // LIVE CONTROL";
welcome.fontSize = 48;

const alert = makeElement("alert", 1);
alert.x = 650;
alert.y = 700;
alert.width = 620;
alert.height = 150;
alert.content = "Nuevo seguidor";

export const initialScene: SceneDocument = {
  id: "scene_main",
  name: "Escena principal",
  width: 1920,
  height: 1080,
  background: "#080a10",
  elements: [welcome, alert],
  updatedAt: new Date().toISOString(),
  revision: 1,
};

export const initialCollaborators: Collaborator[] = [
  { id: "owner_local", email: "streamer@local", role: "owner", status: "active", online: true, lastSeen: new Date().toISOString() },
];
