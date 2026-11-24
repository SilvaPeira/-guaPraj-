import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Login por celular + senha (não depende de WhatsApp).
// O código pelo WhatsApp continua existindo para "esqueci a senha" quando houver provedor.

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

export const SENHA_MINIMA = 6;
const MAX_FALHAS = 5;
const BLOQUEIO_MIN = 15;

export function validarSenhaNova(senha: string, confirmacao: string): string | null {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (senha.length > 200) return "Senha longa demais.";
  if (/^(\d)\1+$/.test(senha) || ["123456", "1234567", "12345678", "654321", "senha123", "abcdef"].includes(senha.toLowerCase())) {
    return "Essa senha é fácil demais de adivinhar. Escolha outra.";
  }
  if (senha !== confirmacao) return "As duas senhas não são iguais.";
  return null;
}

export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const h = await scrypt(senha, sal, 64);
  return `scrypt$${sal.toString("base64url")}$${h.toString("base64url")}`;
}

export async function conferirHash(senha: string, guardado: string): Promise<boolean> {
  const [tipo, sal, h] = guardado.split("$");
  if (tipo !== "scrypt" || !sal || !h) return false;
  const esperado = Buffer.from(h, "base64url");
  const obtido = await scrypt(senha, Buffer.from(sal, "base64url"), esperado.length);
  return timingSafeEqual(esperado, obtido);
}

export type Usuario = typeof schema.usuarios.$inferSelect;

/** Confere a senha com bloqueio de 15 min após 5 erros seguidos. */
export async function entrarComSenha(u: Usuario, senha: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (u.bloqueadoAte && u.bloqueadoAte > new Date()) {
    const min = Math.ceil((u.bloqueadoAte.getTime() - Date.now()) / 60_000);
    return { ok: false, erro: `Muitas tentativas erradas. Tente de novo em ${min} min.` };
  }
  const db = await getDb();
  const certo = !!u.senhaHash && (await conferirHash(senha, u.senhaHash));
  if (certo) {
    if (u.falhasSenha) await db.update(schema.usuarios).set({ falhasSenha: 0, bloqueadoAte: null }).where(eq(schema.usuarios.id, u.id));
    return { ok: true };
  }
  const falhas = u.falhasSenha + 1;
  const bloqueia = falhas >= MAX_FALHAS;
  await db
    .update(schema.usuarios)
    .set({ falhasSenha: bloqueia ? 0 : falhas, bloqueadoAte: bloqueia ? new Date(Date.now() + BLOQUEIO_MIN * 60_000) : null })
    .where(eq(schema.usuarios.id, u.id));
  return { ok: false, erro: bloqueia ? `Senha errada. Por segurança, aguarde ${BLOQUEIO_MIN} min para tentar de novo.` : "Senha errada." };
}

export async function definirSenha(usuarioId: string, senha: string): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.usuarios)
    .set({ senhaHash: await gerarHash(senha), falhasSenha: 0, bloqueadoAte: null })
    .where(eq(schema.usuarios.id, usuarioId));
}
