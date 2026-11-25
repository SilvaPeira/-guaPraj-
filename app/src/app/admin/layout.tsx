import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import NavAdmin from "@/components/NavAdmin";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  await exigirUsuario(["admin"]);
  const db = await getDb();
  const [r] = await db.select({ n: count() }).from(schema.lojas).where(eq(schema.lojas.status, "pendente"));
  return (
    <>
      {children}
      <NavAdmin emAnalise={r?.n ?? 0} />
    </>
  );
}
