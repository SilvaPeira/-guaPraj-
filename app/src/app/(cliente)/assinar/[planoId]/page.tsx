import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { exigirCliente } from "@/lib/cliente";
import { distanciaKm, RAIO_RETIRADA_KM } from "@/lib/geo";
import { podeVender } from "@/lib/catalogo";
import { regrasParaCliente } from "@/lib/opcoes-pedido";
import { formatarReais } from "@/lib/validacao";
import { Topo, Vazio } from "@/components/ui";
import FormAgenda from "@/components/FormAgenda";
import { assinar } from "../../assinatura/actions";

export const metadata: Metadata = { title: "Assinar plano" };

export default async function Assinar({ params }: PageProps<"/assinar/[planoId]">) {
  const { planoId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(planoId)) notFound();
  const { usuario, endereco, db } = await exigirCliente();
  const [linha] = await db
    .select({ plano: schema.planos, loja: schema.lojas })
    .from(schema.planos)
    .innerJoin(schema.lojas, eq(schema.lojas.id, schema.planos.lojaId))
    .where(and(eq(schema.planos.id, planoId), eq(schema.planos.ativo, true), eq(schema.lojas.status, "aprovada")))
    .limit(1);
  if (!linha) notFound();
  const { plano, loja } = linha;

  const [ativa] = await db
    .select({ id: schema.assinaturas.id })
    .from(schema.assinaturas)
    .where(and(eq(schema.assinaturas.clienteId, usuario.id), inArray(schema.assinaturas.status, ["ativa", "pausada"])))
    .limit(1);

  const [casco] = await db
    .select()
    .from(schema.produtos)
    .where(and(eq(schema.produtos.lojaId, loja.id), eq(schema.produtos.categoria, "casco")))
    .limit(1);
  const km = distanciaKm(endereco, loja);
  const podeEntregar = loja.fazEntrega && km <= loja.raioKm;
  const podeRetirar = loja.fazRetirada && km <= RAIO_RETIRADA_KM;

  return (
    <>
      <Topo titulo={`Plano ${plano.galoesMes} ${plano.galoesMes === 1 ? "galão" : "galões"}/mês`} subtitulo={`Passo 3 de 3 · ${loja.nome}`} voltar={`/lojas/${loja.id}`} />
      <main className="conteudo">
        {ativa ? (
          <Vazio>
            <b className="block text-tinta">Você já tem um plano ativo.</b>
            <Link href="/assinatura" className="link-texto">
              Ver minha assinatura
            </Link>
          </Vazio>
        ) : !podeEntregar && !podeRetirar ? (
          <Vazio>Esta loja não atende o seu endereço.</Vazio>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-[18px] border-2 border-acai bg-acai-claro p-4">
              <div>
                <b className="font-titulo text-lg">{formatarReais(plano.precoCentavos)}/mês</b>
                <p className="text-sm text-tinta-suave">
                  {plano.galoesMes} {plano.galoesMes === 1 ? "galão" : "galões"} por mês · cancele quando quiser, sem multa
                </p>
              </div>
            </div>
            <FormAgenda
              acao={assinar}
              camposExtras={{ planoId: plano.id }}
              planoGaloes={plano.galoesMes}
              regras={regrasParaCliente(loja.regrasHorario)}
              diasLoja={loja.regrasHorario.dias}
              podeEntregar={podeEntregar}
              podeRetirar={podeRetirar}
              precoCascoCentavos={casco && podeVender(casco) ? casco.precoCentavos : null}
              textoBotao={`Assinar por ${formatarReais(plano.precoCentavos)}/mês`}
            />
            <p className="text-xs leading-relaxed text-tinta-suave">
              Pagamento: por enquanto a mensalidade é paga na primeira entrega de cada mês (Pix para a loja ou dinheiro). A cobrança automática
              por Pix chega em breve.
            </p>
          </>
        )}
      </main>
    </>
  );
}
