import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { CATEGORIAS, podeVender } from "@/lib/catalogo";
import { distanciaKm, RAIO_RETIRADA_KM } from "@/lib/geo";
import { datasDisponiveis, regrasParaCliente } from "@/lib/opcoes-pedido";
import { Topo, Vazio } from "@/components/ui";
import FormPedido from "./FormPedido";

export const metadata: Metadata = { title: "Fazer pedido" };

export default async function Pedir({ params, searchParams }: PageProps<"/pedir/[lojaId]">) {
  const { lojaId } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(lojaId)) notFound();
  const { usuario, endereco, db } = await exigirCliente();
  const [loja] = await db.select().from(schema.lojas).where(and(eq(schema.lojas.id, lojaId), eq(schema.lojas.status, "aprovada"))).limit(1);
  if (!loja) notFound();

  // Compra adicional de assinante: galão pelo preço do plano.
  let assinaturaId: string | null = null;
  let precoGalaoPlano: number | null = null;
  if (typeof sp.assinatura === "string") {
    const [a] = await db
      .select({ id: schema.assinaturas.id, preco: schema.planos.precoCentavos, galoes: schema.planos.galoesMes })
      .from(schema.assinaturas)
      .innerJoin(schema.planos, eq(schema.planos.id, schema.assinaturas.planoId))
      .where(and(eq(schema.assinaturas.id, sp.assinatura), eq(schema.assinaturas.clienteId, usuario.id), eq(schema.assinaturas.lojaId, loja.id), eq(schema.assinaturas.status, "ativa")))
      .limit(1);
    if (a) {
      assinaturaId = a.id;
      precoGalaoPlano = Math.round(a.preco / a.galoes);
    }
  }

  const produtos = await db.select().from(schema.produtos).where(eq(schema.produtos.lojaId, loja.id)).orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome));
  const galao = produtos.find((p) => p.categoria === "agua_galao" && podeVender(p));
  const casco = produtos.find((p) => p.categoria === "casco" && podeVender(p));
  const extras = produtos
    .filter((p) => podeVender(p) && p.categoria !== "agua_galao" && p.categoria !== "casco" && (!p.alcoolico || loja.vendeAlcool))
    .map((p) => ({ id: p.id, nome: p.nome, marca: p.marca, grupo: CATEGORIAS[p.categoria].grupo, precoCentavos: p.precoCentavos, alcoolico: p.alcoolico, estoque: p.estoque }));

  const km = distanciaKm(endereco, loja);
  const podeEntregar = loja.fazEntrega && km <= loja.raioKm;
  const podeRetirar = loja.fazRetirada && km <= RAIO_RETIRADA_KM;
  const datas = datasDisponiveis(loja.regrasHorario);

  return (
    <>
      <Topo titulo={assinaturaId ? "Compra adicional" : "Pedido avulso"} subtitulo={loja.nome} voltar={assinaturaId ? "/assinatura" : `/lojas/${loja.id}`} />
      <main className="conteudo">
        {!galao && !extras.length ? (
          <Vazio>Esta loja está sem produtos disponíveis agora.</Vazio>
        ) : !podeEntregar && !podeRetirar ? (
          <Vazio>Esta loja não atende o seu endereço.</Vazio>
        ) : !datas.length ? (
          <Vazio>A loja não tem horários nos próximos dias.</Vazio>
        ) : (
          <FormPedido
            lojaId={loja.id}
            assinaturaId={assinaturaId}
            precoGalaoCentavos={precoGalaoPlano ?? galao?.precoCentavos ?? 0}
            precoCascoCentavos={casco?.precoCentavos ?? null}
            produtos={extras}
            podeEntregar={podeEntregar}
            podeRetirar={podeRetirar}
            taxaEntregaCentavos={loja.taxaEntregaCentavos}
            regras={regrasParaCliente(loja.regrasHorario)}
            datas={datas}
            galoesInicial={galao ? (assinaturaId ? 1 : 2) : 0}
          />
        )}
      </main>
    </>
  );
}
