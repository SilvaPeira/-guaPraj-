import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { conferirHash } from "./senha";

export class ErroConta extends Error {}

const EM_ANDAMENTO = ["recebido", "confirmado", "separacao", "saiu", "pronto_retirada"] as const;

/**
 * O cliente exclui a própria conta (LGPD, art. 18): apaga nome, celular, senha, endereços,
 * avisos e aparelhos de notificação. Os pedidos antigos continuam com a loja (nota fiscal,
 * financeiro), mas sem dados que identifiquem a pessoa. O celular fica livre para uma conta nova.
 *
 * Não deixa excluir com pedido em andamento ou plano mensal ativo/pausado (para ninguém ficar
 * sem a entrega já combinada nem a loja sem saber para quem entregar).
 */
export async function excluirConta(usuarioId: string, senha: string): Promise<void> {
  const db = await getDb();
  const [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, usuarioId)).limit(1);
  if (!u || u.excluidoEm) throw new ErroConta("Conta não encontrada.");
  if (u.papel !== "cliente") throw new ErroConta("Contas de loja, entregador ou admin são encerradas pelo suporte.");
  if (!u.senhaHash || !(await conferirHash(senha, u.senhaHash))) throw new ErroConta("Senha errada.");

  const [plano] = await db
    .select({ id: schema.assinaturas.id })
    .from(schema.assinaturas)
    .where(and(eq(schema.assinaturas.clienteId, u.id), inArray(schema.assinaturas.status, ["ativa", "pausada"])))
    .limit(1);
  if (plano) throw new ErroConta("Cancele o seu plano mensal antes de excluir a conta (Início → Meu plano → Cancelar plano).");
  const [pedido] = await db
    .select({ numero: schema.pedidos.numero })
    .from(schema.pedidos)
    .where(and(eq(schema.pedidos.clienteId, u.id), inArray(schema.pedidos.status, [...EM_ANDAMENTO])))
    .limit(1);
  if (pedido) throw new ErroConta(`Você tem o pedido #${pedido.numero} em andamento. Espere a entrega (ou cancele o pedido) e tente de novo.`);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.usuarios)
      .set({
        nome: null,
        // Único e fora do formato de celular: libera o número para uma conta nova.
        telefone: `excluido:${u.id}`,
        senhaHash: null,
        perfilFamilia: null,
        falhasSenha: 0,
        bloqueadoAte: null,
        excluidoEm: new Date(),
      })
      .where(eq(schema.usuarios.id, u.id));
    // Endereço: pedidos antigos apontam para ele, então fica só o bairro e a cidade (sem rua, número e ponto no mapa).
    await tx
      .update(schema.enderecos)
      .set({ logradouro: "(removido)", numero: null, complemento: null, referencia: null, lat: 0, lng: 0 })
      .where(eq(schema.enderecos.usuarioId, u.id));
    await tx.delete(schema.avisos).where(eq(schema.avisos.usuarioId, u.id));
    await tx.delete(schema.inscricoesPush).where(eq(schema.inscricoesPush.usuarioId, u.id));
    await tx.delete(schema.codigosLogin).where(eq(schema.codigosLogin.telefone, u.telefone));
  });
}
