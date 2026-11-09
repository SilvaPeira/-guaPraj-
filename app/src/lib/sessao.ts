import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const COOKIE = "aguapraja_sessao";
const DURACAO_DIAS = 60;

function chave() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET não configurada");
    return new TextEncoder().encode("dev-apenas-local-nao-usar-em-producao");
  }
  return new TextEncoder().encode(s);
}

export async function criarSessao(usuarioId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuarioId)
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_DIAS}d`)
    .sign(chave());
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_DIAS * 24 * 3600,
  });
}

export async function encerrarSessao() {
  const c = await cookies();
  c.delete(COOKIE);
}

async function usuarioIdDaSessao(): Promise<string | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type Usuario = typeof schema.usuarios.$inferSelect;

export async function usuarioAtual(): Promise<Usuario | null> {
  const uid = await usuarioIdDaSessao();
  if (!uid) return null;
  const db = await getDb();
  const [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, uid)).limit(1);
  return u ?? null;
}

/** Exige login; opcionalmente exige um papel. */
export async function exigirUsuario(papeis?: Usuario["papel"][]): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  if (papeis && !papeis.includes(u.papel)) redirect("/");
  return u;
}

export const NOME_COOKIE_SESSAO = COOKIE;
