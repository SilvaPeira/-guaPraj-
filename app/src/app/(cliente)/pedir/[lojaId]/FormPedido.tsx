"use client";

import { useActionState, useState } from "react";
import EscolhaHorario, { type ValorHorario } from "@/components/EscolhaHorario";
import type { OpcaoData, RegrasCliente } from "@/lib/opcoes-pedido";
import { fazerPedido, type EstadoPedido } from "./actions";

export type ProdutoVenda = { id: string; nome: string; marca: string | null; grupo: string; precoCentavos: number; alcoolico: boolean; estoque: number | null };

type Props = {
  lojaId: string;
  assinaturaId: string | null;
  precoGalaoCentavos: number;
  precoCascoCentavos: number | null;
  produtos: ProdutoVenda[];
  podeEntregar: boolean;
  podeRetirar: boolean;
  taxaEntregaCentavos: number;
  regras: RegrasCliente;
  datas: OpcaoData[];
  galoesInicial: number;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FormPedido(p: Props) {
  const [estado, enviar, enviando] = useActionState<EstadoPedido, FormData>(fazerPedido, {});
  const [galoes, setGaloes] = useState(p.galoesInicial);
  const [qtd, setQtd] = useState<Record<string, number>>({});
  const [modo, setModo] = useState<"entrega" | "retirada">(p.podeEntregar ? "entrega" : "retirada");
  const [casco, setCasco] = useState<"tenho" | "comprar">("tenho");
  const [cascosComprar, setCascosComprar] = useState(1);
  const [horario, setHorario] = useState<ValorHorario | null>(null);
  const [maior18, setMaior18] = useState(false);

  const grupos = [...new Set(p.produtos.map((x) => x.grupo))];
  const temAlcool = p.produtos.some((x) => x.alcoolico && (qtd[x.id] ?? 0) > 0);
  const nCascos = casco === "comprar" ? Math.min(cascosComprar, galoes) : 0;
  const subtotal =
    galoes * p.precoGalaoCentavos + p.produtos.reduce((s, x) => s + (qtd[x.id] ?? 0) * x.precoCentavos, 0) + nCascos * (p.precoCascoCentavos ?? 0);
  const taxaEntrega = modo === "entrega" ? p.taxaEntregaCentavos : 0;
  const taxaHorario = modo === "entrega" && (horario?.tipo === "imediato" || horario?.tipo === "exato") ? p.regras.taxaExtraCentavos : 0;
  const total = subtotal + taxaEntrega + taxaHorario;
  const vazio = galoes === 0 && !Object.values(qtd).some((n) => n > 0);

  return (
    <form action={enviar} className="pilha">
      <input type="hidden" name="lojaId" value={p.lojaId} />
      {p.assinaturaId && <input type="hidden" name="assinaturaId" value={p.assinaturaId} />}

      <section className="cartao pilha">
        <div className="flex items-center justify-between gap-3">
          <div>
            <b className="text-base">Galão de água 20 L</b>
            <p className="text-sm text-tinta-suave">
              {brl(p.precoGalaoCentavos)} cada{p.assinaturaId ? " · preço do seu plano" : ""}
            </p>
          </div>
          <Passo valor={galoes} onChange={setGaloes} nome="galoes" rotulo="galões" max={30} />
        </div>
        {galoes > 0 && (
          <div className="pilha border-t border-borda pt-3">
            <span className="text-sm font-semibold">Vasilhame (casco)</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="escolha items-center p-2.5 text-sm">
                <input type="radio" name="casco" value="tenho" checked={casco === "tenho"} onChange={() => setCasco("tenho")} className="sr-only" />
                Tenho casco para trocar
              </label>
              {p.precoCascoCentavos !== null && (
                <label className="escolha items-center p-2.5 text-sm">
                  <input type="radio" name="casco" value="comprar" checked={casco === "comprar"} onChange={() => setCasco("comprar")} className="sr-only" />
                  Preciso comprar ({brl(p.precoCascoCentavos)})
                </label>
              )}
            </div>
            {casco === "comprar" && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Quantos cascos?</span>
                <Passo valor={Math.min(cascosComprar, galoes)} onChange={setCascosComprar} nome="cascosComprar" rotulo="cascos" max={galoes} min={1} />
              </div>
            )}
          </div>
        )}
      </section>

      {grupos.map((g) => (
        <section key={g} className="cartao">
          <h2 className="mb-1 font-bold">{g}</h2>
          <ul className="divide-y divide-borda">
            {p.produtos
              .filter((x) => x.grupo === g)
              .map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{x.nome}</p>
                    <p className="text-sm text-tinta-suave">
                      {brl(x.precoCentavos)}
                      {x.marca ? ` · ${x.marca}` : ""}
                      {x.alcoolico && <span className="selo selo-acai ml-1">18+</span>}
                      {x.estoque !== null && x.estoque <= 5 ? ` · restam ${x.estoque}` : ""}
                    </p>
                  </div>
                  <Passo valor={qtd[x.id] ?? 0} onChange={(n) => setQtd((q) => ({ ...q, [x.id]: n }))} nome={`item:${x.id}`} rotulo={x.nome} max={x.estoque ?? 50} />
                </li>
              ))}
          </ul>
        </section>
      ))}

      {temAlcool && (
        <label className="escolha items-start border-2 border-terra bg-terra-claro">
          <input type="checkbox" name="maior18" checked={maior18} onChange={(e) => setMaior18(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-verde" />
          <span className="text-sm">
            Declaro que tenho <b>18 anos ou mais</b>. O entregador vai pedir um documento com foto; sem documento, a bebida alcoólica não é entregue.
          </span>
        </label>
      )}

      <section className="cartao pilha">
        <h2 className="titulo-secao">Receber</h2>
        {p.podeEntregar && p.podeRetirar && (
          <div className="grid grid-cols-2 gap-2">
            <label className="escolha items-center p-2.5 text-sm font-semibold">
              <input type="radio" name="modo" value="entrega" checked={modo === "entrega"} onChange={() => setModo("entrega")} className="sr-only" />
              Entregar em casa
            </label>
            <label className="escolha items-center p-2.5 text-sm font-semibold">
              <input type="radio" name="modo" value="retirada" checked={modo === "retirada"} onChange={() => setModo("retirada")} className="sr-only" />
              Vou retirar
            </label>
          </div>
        )}
        {!(p.podeEntregar && p.podeRetirar) && <input type="hidden" name="modo" value={modo} />}
        {!p.podeEntregar && <p className="text-sm text-tinta-suave">Esta loja não entrega no seu endereço: o pedido é para retirar no balcão.</p>}
        <EscolhaHorario key={modo} regras={p.regras} datas={p.datas} ehEntrega={modo === "entrega"} onChange={setHorario} />
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Pagamento</h2>
        <p className="aviso-info text-sm">Por enquanto o pagamento é na entrega (Pix para a loja ou dinheiro). Pagar pelo app chega em breve.</p>
        <div className="flex justify-between text-sm">
          <span className="text-tinta-suave">Produtos</span>
          <b>{brl(subtotal)}</b>
        </div>
        {taxaEntrega > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-tinta-suave">Entrega</span>
            <b>{brl(taxaEntrega)}</b>
          </div>
        )}
        {taxaHorario > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-tinta-suave">Horário especial</span>
            <b>{brl(taxaHorario)}</b>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-borda pt-2">
          <b>Total</b>
          <b className="font-titulo text-xl">{brl(total)}</b>
        </div>
      </section>

      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      <button className="botao" disabled={enviando || vazio || (temAlcool && !maior18)}>
        {enviando ? "Enviando…" : `Confirmar pedido · ${brl(total)}`}
      </button>
    </form>
  );
}

function Passo({ valor, onChange, nome, rotulo, max = 50, min = 0 }: { valor: number; onChange: (n: number) => void; nome: string; rotulo: string; max?: number; min?: number }) {
  return (
    <div className="flex flex-none items-center gap-2">
      <input type="hidden" name={nome} value={valor} />
      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-borda2 bg-white text-lg font-bold text-verde disabled:opacity-40" aria-label={`Menos ${rotulo}`} disabled={valor <= min} onClick={() => onChange(valor - 1)}>
        −
      </button>
      <span className="w-6 text-center font-titulo text-lg font-bold tabular-nums" aria-live="polite">
        {valor}
      </span>
      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-verde bg-verde text-lg font-bold text-white disabled:opacity-40" aria-label={`Mais ${rotulo}`} disabled={valor >= max} onClick={() => onChange(valor + 1)}>
        +
      </button>
    </div>
  );
}
