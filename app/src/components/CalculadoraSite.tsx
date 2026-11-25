"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { simular, frequenciaTexto, type Moradores } from "@/lib/simulador";
import { distanciaKm, formatarKm, RAIO_RETIRADA_KM } from "@/lib/geo";
import type { LojaVitrine } from "@/lib/vitrine";

// Site público: calcula o consumo da família e mostra as distribuidoras logo abaixo.
// A localização é opcional e fica só no navegador (não é enviada a lugar nenhum).

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Ponto = { lat: number; lng: number };

export default function CalculadoraSite({ lojas }: { lojas: LojaVitrine[] }) {
  const [m, setM] = useState<Moradores>({ adultos: 2, criancas: 1, bebes: 0, adolescentes: 0, idosos: 0 });
  const [calor, setCalor] = useState(true);
  const [cozinha, setCozinha] = useState(true);
  const [mais, setMais] = useState(false);
  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [local, setLocal] = useState<"" | "buscando" | "negado">("");
  const r = useMemo(() => simular(m, { calor, cozinha }), [m, calor, cozinha]);
  const set = (k: keyof Moradores) => (v: number) => setM((x) => ({ ...x, [k]: Math.max(0, Math.min(20, v)) }));

  const pedirLocal = () => {
    if (!navigator.geolocation) return setLocal("negado");
    setLocal("buscando");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPonto({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocal("");
      },
      () => setLocal("negado"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  };

  const lista = useMemo(() => {
    const comDist = lojas.map((l) => {
      const km = ponto ? distanciaKm(ponto, l) : null;
      const entrega = km === null ? null : l.fazEntrega && km <= l.raioKm;
      const retirada = km === null ? null : l.fazRetirada && km <= RAIO_RETIRADA_KM;
      return { l, km, entrega, retirada };
    });
    if (!ponto) return comDist;
    return comDist.filter((x) => x.entrega || x.retirada).sort((a, b) => Number(b.entrega) - Number(a.entrega) || a.km! - b.km!);
  }, [lojas, ponto]);

  const galoes = r?.galoesMes ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Calculadora */}
      <div className="flex flex-col gap-4 rounded-3xl bg-fundo p-5 md:p-6">
        <h3 className="text-xl font-bold">Quem mora na sua casa?</h3>
        <Contador rotulo="Adultos" dica="18 a 59 anos" valor={m.adultos} onChange={set("adultos")} />
        <Contador rotulo="Crianças" dica="até 13 anos" valor={m.criancas} onChange={set("criancas")} />
        {mais ? (
          <>
            <Contador rotulo="Adolescentes" dica="14 a 17 anos" valor={m.adolescentes} onChange={set("adolescentes")} />
            <Contador rotulo="Idosos" dica="60 anos ou mais" valor={m.idosos} onChange={set("idosos")} />
            <Contador rotulo="Bebês" dica="até 1 ano" valor={m.bebes} onChange={set("bebes")} />
          </>
        ) : (
          <button type="button" className="self-start text-sm font-semibold text-verde underline" onClick={() => setMais(true)}>
            + Tem bebê, adolescente ou idoso?
          </button>
        )}
        <label className="flex items-start gap-3 rounded-2xl bg-white p-3">
          <input type="checkbox" checked={cozinha} onChange={(e) => setCozinha(e.target.checked)} className="mt-1 h-5 w-5 accent-verde" />
          <span>
            <b className="block">Uso a água do galão para cozinhar</b>
            <span className="text-sm text-tinta-suave">café, suco e comida</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-2xl bg-white p-3">
          <input type="checkbox" checked={calor} onChange={(e) => setCalor(e.target.checked)} className="mt-1 h-5 w-5 accent-verde" />
          <span>
            <b className="block">Considerar o calor da região</b>
            <span className="text-sm text-tinta-suave">a gente bebe mais no calor do Pará</span>
          </span>
        </label>

        {r ? (
          <div className="rounded-3xl bg-rio-esc p-5 text-white" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-rio-luz">Sua família precisa de</p>
            <p className="mt-1 flex items-baseline gap-2">
              <b className="font-titulo text-5xl font-extrabold leading-none">{r.galoesMes}</b>
              <span className="text-lg">galões de 20 L por mês</span>
            </p>
            <p className="mt-2 text-rio-luz">
              ≈ {r.litrosDia.toLocaleString("pt-BR")} L por dia · {frequenciaTexto(r.galoesMes)} galões
            </p>
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-4 text-tinta-suave">Adicione pelo menos uma pessoa.</p>
        )}
      </div>

      {/* Distribuidoras */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold">Distribuidoras disponíveis</h3>
          {!ponto && lojas.length > 0 && (
            <button type="button" onClick={pedirLocal} disabled={local === "buscando"} className="rounded-full border-2 border-verde px-4 py-2 text-sm font-bold text-verde">
              {local === "buscando" ? "Localizando…" : "📍 Ver quem entrega para mim"}
            </button>
          )}
        </div>
        {local === "negado" && <p className="text-sm text-terra-esc">Não conseguimos sua localização. Veja abaixo todas as distribuidoras e o bairro de cada uma.</p>}
        {ponto && (
          <p className="text-sm text-tinta-suave">
            Mostrando quem entrega ou tem retirada perto de você.{" "}
            <button type="button" className="font-semibold text-verde underline" onClick={() => setPonto(null)}>
              Ver todas
            </button>
          </p>
        )}

        {lista.length === 0 ? (
          <div className="rounded-3xl border border-borda p-6 text-center">
            <p className="font-semibold">{lojas.length === 0 ? "As primeiras distribuidoras estão chegando." : "Ainda não tem distribuidora atendendo o seu endereço."}</p>
            <p className="mt-1 text-sm text-tinta-suave">Cadastre-se e avisamos quando uma loja começar a entregar aí.</p>
            <Link href="/entrar" className="mt-4 inline-block rounded-full bg-verde px-5 py-3 font-bold text-white">
              Quero ser avisado
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {lista.slice(0, 20).map(({ l, km, entrega, retirada }) => {
              const plano = sugerir(l.planos, galoes);
              const avulsoMes = l.precoGalaoCentavos && galoes ? l.precoGalaoCentavos * galoes : null;
              const economia = plano && avulsoMes && plano.galoesMes >= galoes ? avulsoMes - plano.precoCentavos : 0;
              const ver = l.slug ? `/l/${l.slug}` : "/entrar";
              return (
                <li key={l.id} className="rounded-3xl border border-borda p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <b className="text-lg">{l.nome}</b>
                      <p className="text-sm text-tinta-suave">
                        {l.bairro}, {l.cidade}
                        {km !== null ? ` · ${formatarKm(km)}` : ""}
                        {l.nota ? ` · ${l.nota}` : ""}
                      </p>
                    </div>
                    {l.precoGalaoCentavos && (
                      <span className="text-right text-sm">
                        <b className="block">{brl(l.precoGalaoCentavos)}</b>
                        <span className="text-tinta-suave">galão avulso</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {entrega === true && <span className="rounded-full bg-verde-claro px-2 py-1 font-semibold text-verde">Entrega no seu endereço</span>}
                    {entrega === null && l.fazEntrega && <span className="rounded-full bg-verde-claro px-2 py-1 font-semibold text-verde">Entrega até {l.raioKm} km</span>}
                    {(retirada === true || (retirada === null && l.fazRetirada)) && <span className="rounded-full bg-rio-claro px-2 py-1 font-semibold text-rio-esc">Retirada na loja</span>}
                    {l.fazEntrega && l.taxaEntregaCentavos === 0 && <span className="rounded-full bg-fundo px-2 py-1 font-semibold">Entrega grátis</span>}
                  </div>
                  {plano && galoes > 0 && (
                    <div className="mt-3 rounded-2xl bg-fundo p-3 text-sm">
                      <span className="text-tinta-suave">Plano para você: </span>
                      <b>
                        {plano.galoesMes} galões por {brl(plano.precoCentavos)}/mês
                      </b>
                      {economia > 0 && <span className="text-verde"> · economia de {brl(economia)}</span>}
                      {plano.galoesMes < galoes && <span className="text-tinta-suave"> · o resto em compra adicional</span>}
                    </div>
                  )}
                  {!l.aceitaAssinantes && <p className="mt-2 text-xs text-tinta-suave">No momento só pedidos avulsos.</p>}
                  <div className="mt-3 flex gap-2">
                    <Link href={ver} className="flex-1 rounded-full bg-verde px-4 py-2.5 text-center font-bold text-white">
                      {l.aceitaAssinantes && plano ? "Assinar" : "Pedir"}
                    </Link>
                    {l.slug && (
                      <Link href={`/l/${l.slug}`} className="rounded-full border-2 border-verde px-4 py-2.5 text-center font-bold text-verde">
                        Ver loja
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Menor plano que cobre o consumo; se nenhum cobre, o maior. */
function sugerir(planos: LojaVitrine["planos"], galoes: number) {
  if (!planos.length || galoes <= 0) return null;
  return planos.find((p) => p.galoesMes >= galoes) ?? planos[planos.length - 1];
}

function Contador({ rotulo, dica, valor, onChange }: { rotulo: string; dica: string; valor: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <b className="block">{rotulo}</b>
        <span className="text-sm text-tinta-suave">{dica}</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Menos ${rotulo}`} disabled={valor <= 0} onClick={() => onChange(valor - 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-borda2 bg-white text-xl font-bold text-verde disabled:opacity-40">
          −
        </button>
        <b className="w-6 text-center font-titulo text-xl tabular-nums">{valor}</b>
        <button type="button" aria-label={`Mais ${rotulo}`} onClick={() => onChange(valor + 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-borda2 bg-white text-xl font-bold text-verde">
          +
        </button>
      </div>
    </div>
  );
}
