import { create } from "zustand";
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";

interface Offer { version: string; notes: string }
interface Progress { received: number; total: number | null }
type Phase = "idle" | "checking" | "available" | "current" | "downloading" | "ready" | "installing";
const preference = "spectra.preview-releases";

export const useUpdates = create(() => ({
  phase: "idle" as Phase,
  current: "",
  offer: null as Offer | null,
  progress: { received: 0, total: null } as Progress,
  previews: localStorage.getItem(preference) === "true",
  visible: false,
  deferred: "",
  error: "",
}));

const set = useUpdates.setState;
const state = useUpdates.getState;
export const busy = (phase: Phase) => ["checking", "downloading", "installing"].includes(phase);

export async function checkUpdates(manual = false) {
  const previous = state();
  if (!isTauri() || busy(previous.phase)) return;
  if (previous.phase === "ready") {
    if (manual) set({ visible: true });
    return;
  }
  set({ phase: "checking", error: "" });
  try {
    set({ current: await getVersion() });
    const offer = await invoke<Offer | null>("check_release", { previews: previous.previews });
    set({
      offer, phase: offer ? "available" : "current",
      visible: !!offer && (manual || offer.version !== state().deferred),
    });
  } catch {
    set({ phase: previous.phase, error: "No se pudo consultar la release en GitHub. Puedes volver a intentarlo." });
  }
}

export function setPreviewChannel(previews: boolean) {
  if (busy(state().phase)) return;
  localStorage.setItem(preference, String(previews));
  set({ previews, offer: null, phase: "idle", deferred: "", visible: false });
  void checkUpdates(true);
}

export function deferUpdate() {
  set({ visible: false, deferred: state().offer?.version ?? "" });
}

export async function downloadUpdate() {
  const { phase, offer } = state();
  if (phase !== "available" || !offer) return;
  set({ phase: "downloading", error: "", progress: { received: 0, total: null } });
  const progress = new Channel<Progress>();
  progress.onmessage = (value) => set({ progress: value });
  try {
    await invoke("download_release", { version: offer.version, progress });
    set({ phase: "ready" });
  } catch {
    set({ phase: "available", error: "La descarga o la verificación de firma falló. Puedes reintentar." });
  }
}

export async function installUpdate() {
  const { phase, offer } = state();
  if (phase !== "ready" || !offer) return;
  set({ phase: "installing", error: "" });
  try {
    await invoke("install_release", { version: offer.version });
  } catch {
    set({ phase: "ready", error: "Windows no pudo iniciar la instalación." });
  }
}
