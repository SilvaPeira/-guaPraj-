import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { enviarWhatsApp } from "./mensagens";

const VALIDADE_MIN = 10;
const MAX_TENTATIVAS = 5;
const MAX_CODIGOS_POR_HORA = 5;

function hash(telefone: string, codigo: string) {
  const segredo = process.env.SESSION_SECRET ?? "dev-apenas-local-nao-usar-em-producao";
  return createHmac("sha256", segredo).update(`${telefone}:${codigo}`).digest("hex");
}

/** Mostra o código na tela? Só fora de produção ou em modo de teste explícito. */
export function otpVisivelNaTela() {
  return process.env.NODE_ENV !== "production" || process.env.OTP_MODO_TESTE === "1";
}

export async function solicitarCodigo(telefone: string): Promise<{ ok: true; codigoDev?: string } | { ok: false; erro: string }> {
  const db = await getDb();
  const umaHoraAtras = new Date(Date.now() - 3600_000);
  const recentes = await db
    .select({ id: schema.codigosLogin.id })
    .from(schema.codigosLogin)
    .where(and(eq(schema.codigosLogin.telefone, telefone), gt(schema.codigosLogin.criadoEm, umaHoraAtras)));
  if (recentes.length >= MAX_CODIGOS_POR_HORA) {
    return { ok: false, erro: "Muitos códigos pedidos. Tente de novo em 1 hora." };
  }

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(schema.codigosLogin).values({
    telefone,
    codigoHash: hash(telefone, codigo),
    expiraEm: new Date(Date.now() + VALIDADE_MIN * 60_000),
  });

  const envio = await enviarWhatsApp(telefone, `Seu código ÁguaPrajá é ${codigo}. Vale por ${VALIDADE_MIN} minutos.`);
  if (!envio.ok) return { ok: false, erro: envio.erro };
  return { ok: true, codigoDev: otpVisivelNaTela() ? codigo : undefined };
}

export async function verificarCodigo(telefone: string, codigo: string): Promise<boolean> {
  const db = await getDb();
  const [ultimo] = await db
    .select()
    .from(schema.codigosLogin)
    .where(
      and(
        eq(schema.codigosLogin.telefone, telefone),
        isNull(schema.codigosLogin.usadoEm),
        gt(schema.codigosLogin.expiraEm, new Date()),
      ),
    )
    .orderBy(desc(schema.codigosLogin.criadoEm))
    .limit(1);
  if (!ultimo || ultimo.tentativas >= MAX_TENTATIVAS) return false;

  const a = Buffer.from(ultimo.codigoHash, "hex");
  const b = Buffer.from(hash(telefone, codigo.trim()), "hex");
  const certo = a.length === b.length && timingSafeEqual(a, b);

  await db
    .update(schema.codigosLogin)
    .set(certo ? { usadoEm: new Date() } : { tentativas: ultimo.tentativas + 1 })
    .where(eq(schema.codigosLogin.id, ultimo.id));
  return certo;
}
