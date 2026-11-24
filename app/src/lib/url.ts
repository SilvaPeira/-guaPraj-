import "server-only";
import { headers } from "next/headers";

/** Endereço público do app: APP_URL, ou o host da própria requisição (desenvolvimento/preview). */
export async function urlBase(): Promise<string> {
  const fixo = process.env.APP_URL;
  if (fixo) return fixo.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
