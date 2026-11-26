"use client";

import { useActionState, useState } from "react";
import EscolhaHorario, { valorInicialPedido, type ValorHorario } from "@/components/EscolhaHorario";
import type { OpcaoData, RegrasCliente } from "@/lib/opcoes-pedido";
import { fazerPedido, type EstadoPedido } from "./actions";
import FotoProduto from "@/components/FotoProduto";
import { enviarSemLimpar } from "@/lib/formulario";

export type ProdutoVenda = {
  id: string;
  nome: string;
  marca: string | null;
  grupo: string;
  /** Ordem da categoria (Admin → Categorias). */
  ordemGrupo: number;
  precoCentavos: number;
  /** Preço só do líquido quando o cliente entrega o casco vazio (retornável). */
  precoLiquidoCentavos: number | null;
  alcoolico: boolean;
  estoque: number | null;
  categoria: string;
  fotoUrl: string | null;
};

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
  galaoFotoUrl?: string | null;
  /** Produto tocado no catálogo: já entra com 1 no carrinho. */
  itemInicial?: string | null;
  /** Galões de saldo do plano (sem custo) — só na compra adicional. */
  saldoGaloes?: number;
  /** A loja recebe Pix/cartão pelo app (Mercado Pago conectado). */
  pagaOnline: boolean;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FormPedido(p: Props) {
  const [estado, enviar, enviando] = useActionState<EstadoPedido, FormData>(fazerPedido, {});
  const [galoes, setGaloes] = useState(p.galoesInicial);
  const [qtd, setQtd] = useState<Record<string, number>>(() => (p.itemInicial ? { [p.itemInicial]: 1 } : {}));
  /** Produtos que o cliente escolheu como retornável (vai entregar o casco vazio). */
  const [ret, setRet] = useState<Record<string, boolean>>({});
  const precoDe = (x: ProdutoVenda) => (ret[x.id] && x.precoLiquidoCentavos !== null ? x.precoLiquidoCentavos : x.precoCentavos);
  const [modo, setModo] = useState<"entrega" | "retirada">(p.podeEntregar ? "entrega" : "retirada");
  const [casco, setCasco] = useState<"tenho" | "comprar">("tenho");
  const [cascosComprar, setCascosComprar] = useState(1);
  // O horário escolhido vale para o modo em que foi escolhido; trocar entrega/retirada volta ao padrão daquele modo.
  const [escolha, setEscolha] = useState<{ modo: "entrega" | "retirada"; v: ValorHorario } | null>(null);
  const horario = escolha?.modo === modo ? escolha.v : valorInicialPedido(p.regras, p.datas, modo === "entrega");
  const [maior18, setMaior18] = useState(false);
  // Pagamento: QUANDO (pelo app ou na entrega/retirada) e COMO (dinheiro, Pix ou cartão). O cliente escolhe os dois.
  const [pagamento, setPagamento] = useState<"online" | "na_entrega" | null>(p.pagaOnline ? null : "na_entrega");
  const [meio, setMeio] = useState<"dinheiro" | "pix" | "cartao" | null>(null);
  const [troco, setTroco] = useState("");

  const grupos = [...new Set([...p.produtos].sort((a, b) => a.ordemGrupo - b.ordemGrupo).map((x) => x.grupo))];
  const temAlcool = p.produtos.some((x) => x.alcoolico && (qtd[x.id] ?? 0) > 0);
  const nCascos = casco === "comprar" ? Math.min(cascosComprar, galoes) : 0;
  const gratis = Math.min(galoes, p.saldoGaloes ?? 0);
  const subtotal =
    (galoes - gratis) * p.precoGalaoCentavos + p.produtos.reduce((s, x) => s + (qtd[x.id] ?? 0) * precoDe(x), 0) + nCascos * (p.precoCascoCentavos ?? 0);
  const taxaEntrega = modo === "entrega" ? p.taxaEntregaCentavos : 0;
  const taxaHorario = modo === "entrega" && (horario?.tipo === "imediato" || horario?.tipo === "exato") ? p.regras.taxaExtraCentavos : 0;
  const total = subtotal + taxaEntrega + taxaHorario;
  const vazio = galoes === 0 && !Object.values(qtd).some((n) => n > 0);
  // Com algo a pagar, precisa escolher quando e como.
  const falta = total > 0 && (!pagamento || !meio);

  return (
    <form onSubmit={enviarSemLimpar(enviar)} className="pilha">
      <input type="hidden" name="lojaId" value={p.lojaId} />
      {p.assinaturaId && <input type="hidden" name="assinaturaId" value={p.assinaturaId} />}

      <section className="cartao pilha">
        <div className="flex items-center justify-between gap-3">
          <FotoProduto url={p.galaoFotoUrl ?? null} categoria="agua_galao" nome="Galão de água 20 L" />
          <div className="min-w-0 flex-1">
            <b className="text-base">Galão de água 20 L</b>
            <p className="text-sm text-tinta-suave">
              {brl(p.precoGalaoCentavos)} cada{p.assinaturaId ? " · preço do seu plano" : ""}
            </p>
            {(p.saldoGaloes ?? 0) > 0 && (
              <p className="text-sm font-semibold text-verde">
                {gratis} de {p.saldoGaloes} do seu saldo, sem custo
              </p>
            )}
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
                <li key={x.id} className="flex flex-col gap-2 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <FotoProduto url={x.fotoUrl} categoria={x.categoria} nome={x.nome} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">{x.nome}</p>
                      <p className="text-sm text-tinta-suave">
                        {brl(precoDe(x))}
                        {x.marca ? ` · ${x.marca}` : ""}
                        {x.alcoolico && <span className="selo selo-acai ml-1">18+</span>}
                        {x.estoque !== null && x.estoque <= 5 ? ` · restam ${x.estoque}` : ""}
                      </p>
                    </div>
                    <Passo valor={qtd[x.id] ?? 0} onChange={(n) => setQtd((q) => ({ ...q, [x.id]: n }))} nome={`item:${x.id}`} rotulo={x.nome} max={x.estoque ?? 50} />
                  </div>
                  {x.precoLiquidoCentavos !== null && (
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={`Como comprar ${x.nome}`}>
                      <label className="escolha flex-col items-start p-2 text-sm">
                        <input type="radio" checked={!ret[x.id]} onChange={() => setRet((r) => ({ ...r, [x.id]: false }))} className="sr-only" />
                        <b>Normal · {brl(x.precoCentavos)}</b>
                        <span className="text-xs text-tinta-suave">com o casco</span>
                      </label>
                      <label className="escolha flex-col items-start p-2 text-sm">
                        <input type="radio" checked={!!ret[x.id]} onChange={() => setRet((r) => ({ ...r, [x.id]: true }))} className="sr-only" />
                        <b>Retornável · {brl(x.precoLiquidoCentavos)}</b>
                        <span className="text-xs text-tinta-suave">entrego o casco vazio</span>
                      </label>
                    </div>
                  )}
                  {ret[x.id] && x.precoLiquidoCentavos !== null && <input type="hidden" name={`ret:${x.id}`} value="1" />}
                  {ret[x.id] && x.precoLiquidoCentavos !== null && (
                    <p className="aviso-info text-sm">
                      Retornável: {modo === "entrega" ? "entregue" : "leve"} <b>{Math.max(1, qtd[x.id] ?? 0)} casco(s) vazio(s)</b> de {x.nome} no momento{" "}
                      {modo === "entrega" ? "da entrega" : "da retirada"}. Se não tiver o casco, você paga o preço normal ({brl(x.precoCentavos)} cada).
                    </p>
                  )}
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
        <EscolhaHorario key={modo} regras={p.regras} datas={p.datas} ehEntrega={modo === "entrega"} onChange={(v) => setEscolha({ modo, v })} />
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Pagamento</h2>
        {total > 0 && (
          <>
            {p.pagaOnline ? (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Quando pagar?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["online", "Pelo app, agora", "Pix ou cartão"],
                      ["na_entrega", modo === "entrega" ? "Na entrega" : "Na retirada", "dinheiro, Pix ou cartão"],
                    ] as const
                  ).map(([v, titulo, sub]) => (
                    <label key={v} className="escolha flex-col items-start p-2.5 text-sm">
                      <input
                        type="radio"
                        name="pagamento"
                        value={v}
                        checked={pagamento === v}
                        onChange={() => {
                          setPagamento(v);
                          if (v === "online" && meio === "dinheiro") setMeio(null);
                        }}
                        className="sr-only"
                      />
                      <b className="block">{titulo}</b>
                      <span className="text-xs text-tinta-suave">{sub}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <>
                <input type="hidden" name="pagamento" value="na_entrega" />
                <p className="text-sm text-tinta-suave">Pagamento {modo === "entrega" ? "na entrega" : "na retirada"}, direto para a loja.</p>
              </>
            )}
            {pagamento && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Como vai pagar?</legend>
                <div className={`grid gap-2 ${pagamento === "online" ? "grid-cols-2" : "grid-cols-3"}`}>
                  {(pagamento === "online"
                    ? ([
                        ["pix", "Pix"],
                        ["cartao", "Cartão"],
                      ] as const)
                    : ([
                        ["dinheiro", "Dinheiro"],
                        ["pix", "Pix"],
                        ["cartao", "Cartão"],
                      ] as const)
                  ).map(([v, t]) => (
                    <label key={v} className="escolha items-center justify-center p-2.5 text-sm font-semibold">
                      <input type="radio" name="meio" value={v} checked={meio === v} onChange={() => setMeio(v)} className="sr-only" />
                      {t}
                    </label>
                  ))}
                </div>
                {pagamento === "na_entrega" && meio === "cartao" && (
                  <p className="mt-2 text-xs text-tinta-suave">Na maquininha da loja (débito ou crédito), {modo === "entrega" ? "na entrega" : "na retirada"}.</p>
                )}
                {pagamento === "na_entrega" && meio === "pix" && (
                  <p className="mt-2 text-xs text-tinta-suave">Pix direto para a loja, {modo === "entrega" ? "na entrega" : "na retirada"}.</p>
                )}
                {meio === "dinheiro" && (
                  <label className="campo mt-2">
                    Precisa de troco? Troco para quanto (R$)
                    <input className="entrada" name="troco" inputMode="decimal" placeholder={`Ex.: ${brl(Math.ceil(total / 5000) * 5000).replace("R$", "").trim()} — deixe vazio se não precisar`} value={troco} onChange={(e) => setTroco(e.target.value)} />
                  </label>
                )}
              </fieldset>
            )}
          </>
        )}
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
      <button className="botao" disabled={enviando || vazio || (temAlcool && !maior18) || falta}>
        {enviando
          ? "Enviando…"
          : falta
            ? !pagamento
              ? "Escolha quando pagar"
              : "Escolha como pagar"
            : pagamento === "online"
              ? `Ir para o pagamento · ${brl(total)}`
              : `Confirmar pedido · ${brl(total)}`}
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
