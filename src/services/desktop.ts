import { invoke, isTauri } from "@tauri-apps/api/core";
import type { MediaRequest, SceneDocument } from "../types";

export interface OverlayStatus { running: boolean; baseUrl: string }

export async function syncLiveOverlay(scene: SceneDocument): Promise<void> {
  if (!isTauri()) return;
  await invoke("set_live_state", { scene });
}

export async function syncMediaOverlay(current: MediaRequest | null, volume: number): Promise<void> {
  if (!isTauri()) return;
  await invoke("set_media_state", { media: current, volume });
}

export async function getOverlayStatus(): Promise<OverlayStatus> {
  if (!isTauri()) return { running: false, baseUrl: "http://127.0.0.1:17777" };
  return invoke("get_overlay_status");
}

export async function saveSecret(key: string, value: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("save_secret", { key, value });
}

export async function readSecret(key: string): Promise<string> {
  if (!isTauri()) return "";
  return invoke("read_secret", { key });
}

export async function deleteSecret(key: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("delete_secret", { key });
}
