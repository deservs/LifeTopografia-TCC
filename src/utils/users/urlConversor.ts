import { env } from "../../lib/env";

export function getAvatarPublicUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const baseUrl = env.VITE_R2_PUBLIC_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}/${path.replace(/^\//, "")}` : undefined;
}
