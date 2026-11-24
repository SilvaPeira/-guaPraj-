import { and, count, eq, lte } from "drizzle-orm";
import NavLoja from "@/components/NavLoja";
import { getDb, schema } from "@/db";
import { usuarioAtual } from "@/lib/sessao";
import { agoraLocal, somarDias } from "@/lib/tempo";

export default async function LayoutLoja({ children }: LayoutProps<"/loja">) {
  const u = await usuarioAtual();
  let aConfirmar = 0;
  if (u?.papel === "loja") {
    const db = await getDb();
    const [l] = await db.select({ id: schema.lojas.id }).from(schema.lojas).where(eq(schema.lojas.donoId, u.id)).limit(1);
    if (l) {
      const [r] = await db
        .select({ n: count() })
        .from(schema.pedidos)
        // Só o que pede ação agora: hoje, amanhã e atrasados (entregas do plano são geradas semanas antes).
        .where(and(eq(schema.pedidos.lojaId, l.id), eq(schema.pedidos.status, "recebido"), lte(schema.pedidos.data, somarDias(agoraLocal().data, 1))));
      aConfirmar = r?.n ?? 0;
    }
  }
  return (
    <>
      {children}
      {u?.papel === "loja" && <NavLoja aConfirmar={aConfirmar} />}
    </>
  );
}
