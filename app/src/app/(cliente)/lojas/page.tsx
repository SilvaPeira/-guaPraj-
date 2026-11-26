import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirCliente } from "@/lib/cliente";
import { mediasDasLojas, textoNota } from "@/lib/avaliacoes";
import { marcaAtual } from "@/lib/marca";
import { descontoPercentual, lojasQueAtendem, planoSugerido } from "@/lib/lojas-proximas";
import { simular } from "@/lib/simulador";
import { formatarKm } from "@/lib/geo";
import { formatarReais } from "@/lib/validacao";
import { Topo, Vazio } from "@/components/ui";
import { planoAtivoDoCliente } from "@/lib/assinaturas";

export const metadata: Metadata = { title: "Distribuidoras" };

export default async function Lojas({ searchParams }: PageProps<"/lojas">) {
  const { usuario, endereco } = await exigirCliente();
  const marca = await marcaAtual();
  if (marca) redirect(`/lojas/${marca.lojaId}`);
  if (!usuario.perfilFamilia) redirect("/simulador");
  const sp = await searchParams;
  const filtro = sp.filtro === "entrega" || sp.filtro === "retirada" ? sp.filtro : "todas";

  const r = simular(usuario.perfilFamilia, usuario.perfilFamilia);
  const galoesMes = r?.galoesMes ?? 0;
  // Quem já assina não recebe sugestão de plano: vê o próprio e, se precisar, troca em "Meu plano".
  const meuPlano = await planoAtivoDoCliente(usuario.id);
  let lojas = await lojasQueAtendem(endereco);
  const notas = await mediasDasLojas(lojas.map((l) => l.loja.id));
  if (filtro === "entrega") lojas = lojas.filter((l) => l.entregaAqui);
  if (filtro === "retirada") lojas = lojas.filter((l) => l.loja.fazRetirada);

  return (
    <>
      <Topo
        titulo={`Distribuidoras perto de você`}
        subtitulo={meuPlano ? `Sua família: ${galoesMes} galões/mês` : `Passo 2 de 3 · sua família: ${galoesMes} galões/mês`}
        voltar={meuPlano ? "/inicio" : "/simulador"}
      />
      <main className="conteudo">
        {meuPlano && (
          <Link href="/assinatura" className="block rounded-[var(--raio-cartao,20px)] bg-acai p-4 text-white">
            <span className="text-xs font-bold uppercase tracking-[.6px] text-[#e6d3ea]">Seu plano · {meuPlano.lojaNome}</span>
            <b className="block font-titulo text-lg">
              {meuPlano.galoesMes} galões/mês · {formatarReais(meuPlano.precoCentavos)}
            </b>
            <span className="text-sm">
              {galoesMes > meuPlano.galoesMes
                ? `Pelo consumo calculado, vocês precisam de ${galoesMes} por mês: dá para trocar de plano em Meu plano.`
                : galoesMes < meuPlano.galoesMes
                  ? `Pelo consumo calculado, ${galoesMes} por mês já bastam: dá para trocar para um plano menor em Meu plano.`
                  : "Seu plano cobre o consumo calculado da família."}
            </span>
          </Link>
        )}
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
          const plano = meuPlano ? null : planoSugerido(planos, galoesMes);
          const desconto = plano ? descontoPercentual(plano, precoGalaoCentavos) : 0;
          return (
            <article key={loja.id} className="cartao pilha">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[17px] font-bold">{loja.nome}</h2>
                  <p className="text-sm text-tinta-suave">
                    {loja.bairro} · {formatarKm(distanciaKm)}
                    {textoNota(notas.get(loja.id)) ? ` · ${textoNota(notas.get(loja.id))}` : ""}
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
                <div className="flex items-center justify-between gap-2 rounded-[var(--raio-cartao,14px)] bg-acai-claro p-3">
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
                {meuPlano ? "Ver produtos" : "Ver planos e produtos"}
              </Link>
            </article>
          );
        })}
      </main>
    </>
  );
}
