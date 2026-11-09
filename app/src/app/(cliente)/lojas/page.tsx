import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirCliente } from "@/lib/cliente";
import { descontoPercentual, lojasQueAtendem, planoSugerido } from "@/lib/lojas-proximas";
import { simular } from "@/lib/simulador";
import { formatarKm } from "@/lib/geo";
import { formatarReais } from "@/lib/validacao";
import { Topo, Vazio } from "@/components/ui";

export const metadata: Metadata = { title: "Distribuidoras" };

export default async function Lojas({ searchParams }: PageProps<"/lojas">) {
  const { usuario, endereco } = await exigirCliente();
  if (!usuario.perfilFamilia) redirect("/simulador");
  const sp = await searchParams;
  const filtro = sp.filtro === "entrega" || sp.filtro === "retirada" ? sp.filtro : "todas";

  const r = simular(usuario.perfilFamilia, usuario.perfilFamilia);
  const galoesMes = r?.galoesMes ?? 0;
  let lojas = await lojasQueAtendem(endereco);
  if (filtro === "entrega") lojas = lojas.filter((l) => l.entregaAqui);
  if (filtro === "retirada") lojas = lojas.filter((l) => l.loja.fazRetirada);

  return (
    <>
      <Topo titulo={`Distribuidoras perto de você`} subtitulo={`Passo 2 de 3 · sua família: ${galoesMes} galões/mês`} voltar="/simulador" />
      <main className="conteudo">
        <nav className="flex flex-wrap gap-2" aria-label="Filtrar">
          {(
            [
              ["todas", "Todas"],
              ["entrega", "Entrega em casa"],
              ["retirada", "Retirada"],
            ] as const
          ).map(([v, t]) => (
            <Link
              key={v}
              href={v === "todas" ? "/lojas" : `/lojas?filtro=${v}`}
              aria-current={filtro === v ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold ${filtro === v ? "border-verde bg-verde text-white" : "border-borda2 bg-white"}`}
            >
              {t}
            </Link>
          ))}
        </nav>

        {lojas.length === 0 && (
          <Vazio>
            <b className="block text-tinta">Ainda não temos distribuidora atendendo {endereco.bairro}.</b>
            <span className="text-sm">Estamos chamando as lojas da cidade. Avisamos você no WhatsApp assim que alguma começar.</span>
          </Vazio>
        )}

        {lojas.map(({ loja, distanciaKm, entregaAqui, precoGalaoCentavos, planos }) => {
          const plano = planoSugerido(planos, galoesMes);
          const desconto = plano ? descontoPercentual(plano, precoGalaoCentavos) : 0;
          return (
            <article key={loja.id} className="cartao pilha">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[17px] font-bold">{loja.nome}</h2>
                  <p className="text-sm text-tinta-suave">
                    {loja.bairro} · {formatarKm(distanciaKm)}
                  </p>
                </div>
                {loja.seloFiscalDeclarado && <span className="selo selo-terra">Verificada</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entregaAqui ? (
                  <span className="selo selo-verde">{loja.taxaEntregaCentavos ? `Entrega ${formatarReais(loja.taxaEntregaCentavos)}` : "Entrega grátis"}</span>
                ) : loja.fazEntrega ? (
                  <span className="selo selo-cinza">Não entrega no seu endereço</span>
                ) : null}
                {loja.fazRetirada && <span className="selo selo-rio">Retirada no local</span>}
                {precoGalaoCentavos !== null && <span className="selo selo-cinza">Avulso {formatarReais(precoGalaoCentavos)}</span>}
                {loja.marcasAgua && <span className="selo selo-cinza">{loja.marcasAgua}</span>}
              </div>
              {plano && (
                <div className="flex items-center justify-between gap-2 rounded-[14px] bg-acai-claro p-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[.6px] text-acai">Plano para sua família</span>
                    <b className="block">
                      {plano.galoesMes} galões · {formatarReais(plano.precoCentavos)}/mês
                    </b>
                  </div>
                  {desconto > 0 && <span className="selo bg-acai text-white">−{desconto}%</span>}
                </div>
              )}
              <Link href={`/lojas/${loja.id}`} className="botao-peq w-full">
                Ver planos e produtos
              </Link>
            </article>
          );
        })}
      </main>
    </>
  );
}
