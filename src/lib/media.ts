import type { MediaRequest } from "../types";

export function detectPlatform(url: string): MediaRequest["platform"] {
  const host = safeUrl(url)?.hostname.toLowerCase() ?? "";
  if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
  if (host.includes("twitch.tv")) return "twitch";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("kick.com")) return "kick";
  return "direct";
}

export function safeUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed : null;
  } catch {
    return null;
  }
}

export function toEmbedUrl(value: string): string | null {
  const parsed = safeUrl(value);
  if (!parsed) return null;
  const platform = detectPlatform(value);
  if (platform === "youtube") {
    let id = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v");
    if (!id && parsed.pathname.startsWith("/shorts/")) id = parsed.pathname.split("/")[2];
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&enablejsapi=1` : null;
  }
  if (platform === "twitch") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] === "videos" && segments[1]) {
      return `https://player.twitch.tv/?video=${encodeURIComponent(segments[1])}&parent=localhost&autoplay=true`;
    }
    if (segments[0]) return `https://player.twitch.tv/?channel=${encodeURIComponent(segments[0])}&parent=localhost&autoplay=true`;
  }
  return value;
}
