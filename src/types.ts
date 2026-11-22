export type ElementKind = "text" | "image" | "video" | "alert" | "timer" | "counter" | "poll" | "wheel" | "custom";

export interface CanvasElement {
  id: string;
  kind: ElementKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  content: string;
  color: string;
  background: string;
  fontSize: number;
  borderRadius: number;
  animation: "none" | "fade" | "slide" | "pulse";
}

export interface SceneDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  elements: CanvasElement[];
  updatedAt: string;
  revision: number;
}

export type MediaStatus = "pending" | "approved" | "playing" | "paused" | "rejected" | "finished";

export interface MediaRequest {
  id: string;
  url: string;
  title: string;
  requester: string;
  platform: "youtube" | "twitch" | "tiktok" | "kick" | "direct";
  status: MediaStatus;
  createdAt: string;
}

export interface Collaborator {
  id: string;
  email: string;
  role: "owner" | "moderator";
  status: "active" | "invited" | "revoked";
  online: boolean;
  lastSeen: string;
}

export interface ObsConfig {
  url: string;
  password: string;
  connected: boolean;
  studioMode: boolean;
  currentScene: string;
}

export interface IntegrationConfig {
  twitchConnected: boolean;
  kickConnected: boolean;
  twitchChannel: string;
  kickChannel: string;
}
