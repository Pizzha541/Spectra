import { useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { useSpectraStore } from "../store/useSpectraStore";
import type { SceneDocument } from "../types";

interface SceneRow { workspace_id: string; channel: "staging" | "live"; document: SceneDocument; revision: number; updated_at: string }

async function ensureWorkspace(user: User): Promise<string> {
  if (!supabase) throw new Error("Supabase no está configurado");
  const membership = await supabase.from("workspace_members").select("workspace_id").is("revoked_at", null).limit(1).maybeSingle();
  if (membership.error) throw membership.error;
  if (membership.data?.workspace_id) return membership.data.workspace_id;
  const created = await supabase.from("workspaces").insert({ owner_id: user.id, name: "Mi espacio SPECTRA" }).select("id").single();
  if (created.error) throw created.error;
  const joined = await supabase.from("workspace_members").insert({ workspace_id: created.data.id, user_id: user.id, role: "owner" });
  if (joined.error) throw joined.error;
  return created.data.id;
}

export function useCloudSync(authenticated: boolean) {
  const client = supabase;
  const staging = useSpectraStore((s) => s.staging);
  const live = useSpectraStore((s) => s.live);
  const applyRemote = useSpectraStore((s) => s.applyRemoteScene);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const hydrated = useRef(false);
  const lastStaging = useRef("");
  const lastLive = useRef("");

  useEffect(() => {
    if (!authenticated || !client) return;
    let cancelled = false;
    let channel: ReturnType<typeof client.channel> | undefined;
    (async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user || cancelled) return;
      const id = await ensureWorkspace(user);
      if (cancelled) return;
      setWorkspaceId(id); setUserId(user.id);
      const scenes = await client.from("scene_documents").select("workspace_id,channel,document,revision,updated_at").eq("workspace_id", id);
      if (scenes.error) throw scenes.error;
      for (const row of (scenes.data ?? []) as SceneRow[]) applyRemote(row.channel, row.document);
      hydrated.current = true;
      channel = client.channel(`workspace:${id}`).on("postgres_changes", { event: "*", schema: "public", table: "scene_documents", filter: `workspace_id=eq.${id}` }, (payload: RealtimePostgresChangesPayload<SceneRow>) => {
        const row = payload.new as SceneRow;
        if (row?.document && row.channel) applyRemote(row.channel, row.document);
      }).subscribe();
    })().catch((error) => { console.error("SPECTRA cloud sync", error); useSpectraStore.setState({ syncStatus: "offline" }); });
    return () => { cancelled = true; hydrated.current = false; if (channel) client.removeChannel(channel); };
  }, [authenticated, applyRemote]);

  useEffect(() => {
    if (!client || !workspaceId || !userId || !hydrated.current) return;
    const serialized = JSON.stringify(staging);
    if (serialized === lastStaging.current) return;
    const timer = setTimeout(async () => {
      const result = await client.from("scene_documents").upsert({ workspace_id: workspaceId, channel: "staging", document: staging, revision: staging.revision, updated_by: userId, updated_at: staging.updatedAt }, { onConflict: "workspace_id,channel" });
      if (result.error) useSpectraStore.setState({ syncStatus: "offline" }); else { lastStaging.current = serialized; useSpectraStore.setState({ syncStatus: "saved" }); }
    }, 1200);
    return () => clearTimeout(timer);
  }, [staging, workspaceId, userId]);

  useEffect(() => {
    if (!client || !workspaceId || !userId || !hydrated.current) return;
    const serialized = JSON.stringify(live);
    if (serialized === lastLive.current) return;
    const timer = setTimeout(async () => {
      const result = await client.from("scene_documents").upsert({ workspace_id: workspaceId, channel: "live", document: live, revision: live.revision, updated_by: userId, updated_at: live.updatedAt }, { onConflict: "workspace_id,channel" });
      if (!result.error) lastLive.current = serialized;
    }, 250);
    return () => clearTimeout(timer);
  }, [live, workspaceId, userId]);
}
