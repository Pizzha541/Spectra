import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasElement, Collaborator, IntegrationConfig, MediaRequest, ObsConfig, SceneDocument } from "../types";
import { initialCollaborators, initialScene, makeElement } from "../lib/defaults";
import { detectPlatform, safeUrl } from "../lib/media";
import { newId } from "../lib/id";

type HistoryEntry = SceneDocument;

interface SpectraState {
  staging: SceneDocument;
  live: SceneDocument;
  selectedIds: string[];
  history: HistoryEntry[];
  future: HistoryEntry[];
  mediaQueue: MediaRequest[];
  currentMediaId: string | null;
  mediaVolume: number;
  collaborators: Collaborator[];
  obs: ObsConfig;
  integrations: IntegrationConfig;
  gridEnabled: boolean;
  snapEnabled: boolean;
  gridSize: number;
  syncStatus: "saved" | "saving" | "offline" | "conflict";
  addElement: (kind: CanvasElement["kind"]) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>, record?: boolean) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  select: (id: string | null, additive?: boolean) => void;
  reorder: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  setVisibility: (id: string) => void;
  setLocked: (id: string) => void;
  publish: () => SceneDocument;
  undo: () => void;
  redo: () => void;
  setCanvasOption: (patch: Partial<Pick<SpectraState, "gridEnabled" | "snapEnabled" | "gridSize">>) => void;
  addMedia: (url: string, title?: string) => boolean;
  setMediaStatus: (id: string, status: MediaRequest["status"]) => void;
  playMedia: (id: string) => void;
  skipMedia: () => void;
  removeMedia: (id: string) => void;
  setMediaVolume: (volume: number) => void;
  inviteCollaborator: (email: string) => void;
  revokeCollaborator: (id: string) => void;
  setObs: (patch: Partial<ObsConfig>) => void;
  setIntegration: (patch: Partial<IntegrationConfig>) => void;
  markSaved: () => void;
  applyRemoteScene: (channel: "staging" | "live", scene: SceneDocument) => void;
}

const cloneScene = (scene: SceneDocument): SceneDocument => structuredClone(scene);

const withRevision = (scene: SceneDocument): SceneDocument => ({
  ...scene,
  updatedAt: new Date().toISOString(),
  revision: scene.revision + 1,
});

export const useSpectraStore = create<SpectraState>()(
  persist(
    (set, get) => ({
      staging: cloneScene(initialScene),
      live: cloneScene(initialScene),
      selectedIds: [],
      history: [],
      future: [],
      mediaQueue: [],
      currentMediaId: null,
      mediaVolume: 0.7,
      collaborators: initialCollaborators,
      obs: { url: "ws://127.0.0.1:4455", password: "", connected: false, studioMode: false, currentScene: "" },
      integrations: { twitchConnected: false, kickConnected: false, twitchChannel: "", kickChannel: "" },
      gridEnabled: true,
      snapEnabled: true,
      gridSize: 20,
      syncStatus: "saved",
      addElement: (kind) => set((state) => {
        const element = makeElement(kind, state.staging.elements.length);
        return {
          history: [...state.history.slice(-39), cloneScene(state.staging)], future: [],
          staging: withRevision({ ...state.staging, elements: [...state.staging.elements, element] }),
          selectedIds: [element.id], syncStatus: "saving",
        };
      }),
      updateElement: (id, patch, record = false) => set((state) => ({
        history: record ? [...state.history.slice(-39), cloneScene(state.staging)] : state.history,
        future: record ? [] : state.future,
        staging: withRevision({ ...state.staging, elements: state.staging.elements.map((el) => el.id === id ? { ...el, ...patch } : el) }),
        syncStatus: "saving",
      })),
      removeSelected: () => set((state) => state.selectedIds.length ? ({
        history: [...state.history.slice(-39), cloneScene(state.staging)], future: [],
        staging: withRevision({ ...state.staging, elements: state.staging.elements.filter((el) => !state.selectedIds.includes(el.id)) }),
        selectedIds: [], syncStatus: "saving",
      }) : state),
      duplicateSelected: () => set((state) => {
        const copies = state.staging.elements.filter((el) => state.selectedIds.includes(el.id)).map((el, i) => ({ ...el, id: newId(el.kind), name: `${el.name} copia`, x: el.x + 24, y: el.y + 24, zIndex: state.staging.elements.length + i }));
        if (!copies.length) return state;
        return { history: [...state.history.slice(-39), cloneScene(state.staging)], future: [], staging: withRevision({ ...state.staging, elements: [...state.staging.elements, ...copies] }), selectedIds: copies.map((el) => el.id), syncStatus: "saving" };
      }),
      select: (id, additive = false) => set((state) => {
        if (!id) return { selectedIds: [] };
        if (!additive) return { selectedIds: [id] };
        return { selectedIds: state.selectedIds.includes(id) ? state.selectedIds.filter((value) => value !== id) : [...state.selectedIds, id] };
      }),
      reorder: (id, direction) => set((state) => {
        const sorted = [...state.staging.elements].sort((a, b) => a.zIndex - b.zIndex);
        const index = sorted.findIndex((el) => el.id === id);
        if (index < 0) return state;
        const next = direction === "top" ? sorted.length - 1 : direction === "bottom" ? 0 : Math.max(0, Math.min(sorted.length - 1, index + (direction === "up" ? 1 : -1)));
        const [item] = sorted.splice(index, 1); sorted.splice(next, 0, item);
        const elements = sorted.map((el, zIndex) => ({ ...el, zIndex }));
        return { history: [...state.history.slice(-39), cloneScene(state.staging)], future: [], staging: withRevision({ ...state.staging, elements }), syncStatus: "saving" };
      }),
      setVisibility: (id) => { const el = get().staging.elements.find((item) => item.id === id); if (el) get().updateElement(id, { visible: !el.visible }, true); },
      setLocked: (id) => { const el = get().staging.elements.find((item) => item.id === id); if (el) get().updateElement(id, { locked: !el.locked }, true); },
      publish: () => {
        const live = { ...cloneScene(get().staging), updatedAt: new Date().toISOString() };
        set({ live, syncStatus: "saved" });
        return live;
      },
      undo: () => set((state) => {
        const previous = state.history.at(-1); if (!previous) return state;
        return { staging: cloneScene(previous), history: state.history.slice(0, -1), future: [cloneScene(state.staging), ...state.future.slice(0, 39)], selectedIds: [], syncStatus: "saving" };
      }),
      redo: () => set((state) => {
        const next = state.future[0]; if (!next) return state;
        return { staging: cloneScene(next), future: state.future.slice(1), history: [...state.history.slice(-39), cloneScene(state.staging)], selectedIds: [], syncStatus: "saving" };
      }),
      setCanvasOption: (patch) => set(patch),
      addMedia: (url, title) => {
        if (!safeUrl(url)) return false;
        set((state) => ({ mediaQueue: [...state.mediaQueue, { id: newId("media"), url, title: title?.trim() || url, requester: "Manual", platform: detectPlatform(url), status: "pending", createdAt: new Date().toISOString() }] }));
        return true;
      },
      setMediaStatus: (id, status) => set((state) => ({ mediaQueue: state.mediaQueue.map((item) => item.id === id ? { ...item, status } : item) })),
      playMedia: (id) => set((state) => ({ currentMediaId: id, mediaQueue: state.mediaQueue.map((item) => ({ ...item, status: item.id === id ? "playing" : item.status === "playing" ? "approved" : item.status })) })),
      skipMedia: () => set((state) => {
        const queue = state.mediaQueue.map((item) => item.id === state.currentMediaId ? { ...item, status: "finished" as const } : item);
        const next = queue.find((item) => item.status === "approved");
        return { currentMediaId: next?.id ?? null, mediaQueue: next ? queue.map((item) => item.id === next.id ? { ...item, status: "playing" as const } : item) : queue };
      }),
      removeMedia: (id) => set((state) => ({ mediaQueue: state.mediaQueue.filter((item) => item.id !== id), currentMediaId: state.currentMediaId === id ? null : state.currentMediaId })),
      setMediaVolume: (mediaVolume) => set({ mediaVolume }),
      inviteCollaborator: (email) => set((state) => ({ collaborators: [...state.collaborators, { id: newId("user"), email: email.trim().toLowerCase(), role: "moderator", status: "invited", online: false, lastSeen: new Date().toISOString() }] })),
      revokeCollaborator: (id) => set((state) => ({ collaborators: state.collaborators.map((item) => item.id === id ? { ...item, status: "revoked", online: false } : item) })),
      setObs: (patch) => set((state) => ({ obs: { ...state.obs, ...patch } })),
      setIntegration: (patch) => set((state) => ({ integrations: { ...state.integrations, ...patch } })),
      markSaved: () => set({ syncStatus: "saved" }),
      applyRemoteScene: (channel, scene) => set((state) => {
        const local = state[channel];
        if (new Date(scene.updatedAt).getTime() <= new Date(local.updatedAt).getTime()) return state;
        return channel === "staging"
          ? { staging: cloneScene(scene), selectedIds: [], history: [], future: [], syncStatus: "saved" }
          : { live: cloneScene(scene), syncStatus: "saved" };
      }),
    }),
    {
      name: "spectra-workspace-v1",
      partialize: (state) => ({ staging: state.staging, live: state.live, mediaQueue: state.mediaQueue, currentMediaId: state.currentMediaId, mediaVolume: state.mediaVolume, collaborators: state.collaborators, obs: { ...state.obs, password: "", connected: false }, integrations: state.integrations, gridEnabled: state.gridEnabled, snapEnabled: state.snapEnabled, gridSize: state.gridSize }),
    },
  ),
);
