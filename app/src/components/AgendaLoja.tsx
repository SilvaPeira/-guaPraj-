"use client";

import { useActionState, useState } from "react";
import { mudarStatusAcao, reagendarAcao, type EstadoOperacao } from "@/app/loja/operacao-actions";
import { COR_STATUS, ORIGEM, ROTULO_STATUS, proximosStatus, type StatusPedido } from "@/lib/status";
import { enviarSemLimpar } from "@/lib/formulario";

export type CartaoPedido = {
  id: string;
  numero: number;
  status: StatusPedido;
  origem: "avulso" | "plano" | "extra";
  modo: "entrega" | "retirada";
  tipoHorario: "imediato" | "exato" | "janela" | "periodo";
  horaInicio: string;
  horaFim: string;
  totalCentavos: number;
  statusPagamento: string;
  meio: string | null;
  pagoPeloApp: boolean;
  cascosTroca: number;
  cascosComprados: number;
  temAlcool: boolean;
  motivo: string | null;
  codigoRetirada: string | null;
  galoes: number;
  clienteNome: string;
  clienteTelefone: string;
  endereco: { linha: string; bairro: string; referencia: string | null; lat: number; lng: number } | null;
  itens: { id: string; nome: string; qtd: number; trocaCasco: boolean; diferencaCentavos: number; cascosFaltaram: number }[];
  atrasado: boolean;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const horario = (p: CartaoPedido) => (p.tipoHorario === "imediato" ? `o quanto antes (até ${p.horaFim})` : p.horaInicio === p.horaFim ? `às ${p.horaInicio}` : `${p.horaInicio}–${p.horaFim}`);
const ROTULO_ACAO: Partial<Record<StatusPedido, string>> = {
  confirmado: "Confirmar",
  separacao: "Separando",
  saiu: "Saiu para entrega",
  pronto_retirada: "Pronto p/ retirada",
};
const FILTROS = [
  ["todos", "Todos"],
  ["confirmar", "A confirmar"],
  ["entrega", "Entregas"],
  ["retirada", "Retiradas"],
  ["feitos", "Concluídos"],
] as const;
const FINAIS: StatusPedido[] = ["entregue", "retirado", "nao_entregue", "cancelado"];

export default function AgendaLoja({ pedidos, ehDono, amanha }: { pedidos: CartaoPedido[]; ehDono: boolean; amanha: string }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number][0]>("todos");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [estadoLote, enviarLote, enviandoLote] = useActionState<EstadoOperacao, FormData>(mudarStatusAcao, {});

  const visiveis = pedidos.filter((p) =>
    filtro === "confirmar" ? p.status === "recebido" : filtro === "entrega" ? p.modo === "entrega" && !FINAIS.includes(p.status) : filtro === "retirada" ? p.modo === "retirada" && !FINAIS.includes(p.status) : filtro === "feitos" ? FINAIS.includes(p.status) : true,
  );
  const selecionados = pedidos.filter((p) => sel.has(p.id));
  // Ações em lote possíveis para TODOS os selecionados.
  const acoesLote = (["confirmado", "saiu", "pronto_retirada"] as StatusPedido[]).filter(
    (s) => (ehDono || s === "saiu") && selecionados.length > 0 && selecionados.every((p) => proximosStatus(p.status, p.modo).includes(s)),
  );
  const alternar = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="pilha">
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filtrar pedidos">
        {FILTROS.map(([v, t]) => (
          <button key={v} type="button" onClick={() => setFiltro(v)} aria-pressed={filtro === v} className={`chip flex-none ${filtro === v ? "border-verde bg-verde text-white" : ""}`}>
            {t}
          </button>
        ))}
      </nav>

      {selecionados.length > 0 && (
        <form onSubmit={enviarSemLimpar(enviarLote)} className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-[var(--raio-cartao,20px)] border border-borda bg-white p-3 shadow-md">
          {selecionados.map((p) => (
            <input key={p.id} type="hidden" name="pedidoId" value={p.id} />
          ))}
          <b className="mr-auto text-sm">{selecionados.length} selecionado(s)</b>
          {acoesLote.map((s) => (
            <button key={s} name="novo" value={s} className="botao-peq" disabled={enviandoLote}>
              {ROTULO_ACAO[s]}
            </button>
          ))}
          {acoesLote.length === 0 && <span className="text-xs text-tinta-suave">Sem ação em comum para esses pedidos.</span>}
          <button type="button" className="botao-peq-sec" onClick={() => setSel(new Set())}>
            Limpar
          </button>
          {estadoLote.erro && <p className="aviso-erro w-full text-sm">{estadoLote.erro}</p>}
          {estadoLote.ok && <p className="aviso-ok w-full text-sm">{estadoLote.ok}</p>}
        </form>
      )}

      {visiveis.length === 0 && <div className="cartao py-8 text-center text-tinta-suave">Nada por aqui.</div>}
      {visiveis.map((p) => (
        <Cartao key={p.id} p={p} ehDono={ehDono} marcado={sel.has(p.id)} onMarcar={() => alternar(p.id)} amanha={amanha} />
      ))}
    </div>
  );
}

function Cartao({ p, ehDono, marcado, onMarcar, amanha }: { p: CartaoPedido; ehDono: boolean; marcado: boolean; onMarcar: () => void; amanha: string }) {
  const [painel, setPainel] = useState<null | "concluir" | "falhou" | "cancelar" | "reagendar">(null);
  const [estado, enviar, enviando] = useActionState<EstadoOperacao, FormData>(mudarStatusAcao, {});
  const [estadoR, enviarR, enviandoR] = useActionState<EstadoOperacao, FormData>(reagendarAcao, {});
  const proximos = proximosStatus(p.status, p.modo).filter((s) => ehDono || ["saiu", "entregue", "nao_entregue"].includes(s));
  // "Não entregue" volta para a agenda só pelo "Reagendar" (com nova data).
  const simples = proximos.filter((s) => s in ROTULO_ACAO && p.status !== "nao_entregue");
  const final = FINAIS.includes(p.status);
  const mapa = p.endereco ? `https://www.google.com/maps/dir/?api=1&destination=${p.endereco.lat},${p.endereco.lng}` : null;
  const waze = p.endereco ? `https://waze.com/ul?ll=${p.endereco.lat},${p.endereco.lng}&navigate=yes` : null;
  const whats = `https://wa.me/55${p.clienteTelefone}?text=${encodeURIComponent(`Olá, ${p.clienteNome.split(" ")[0]}! Sobre seu pedido #${p.numero}.`)}`;

  return (
    <article className={`cartao pilha ${final ? "opacity-70" : ""} ${p.atrasado ? "border-2 border-terra" : ""}`}>
      <div className="flex items-start gap-3">
        {!final && <input type="checkbox" checked={marcado} onChange={onMarcar} aria-label={`Selecionar pedido ${p.numero}`} className="mt-1 h-5 w-5 shrink-0 accent-verde" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <b className="font-titulo text-base">{horario(p)}</b>
            <span className={`selo ${COR_STATUS[p.status]}`}>{ROTULO_STATUS[p.status]}</span>
            {p.atrasado && <span className="selo selo-terra">Atrasado</span>}
          </div>
          <p className="text-sm">
            <b>{p.clienteNome}</b> · #{p.numero} · {ORIGEM[p.origem]} · {p.modo === "entrega" ? "Entrega" : "Retirada"}
          </p>
          {p.endereco && (
            <p className="text-sm text-tinta-suave">
              {p.endereco.linha} — <b className="text-tinta">{p.endereco.bairro}</b>
              {p.endereco.referencia ? ` · Ref.: ${p.endereco.referencia}` : ""}
            </p>
          )}
        </div>
      </div>

      <ul className="text-sm">
        {p.itens.map((i, k) => (
          <li key={k}>
            {i.qtd}× {i.nome}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {p.cascosTroca > 0 && <span className="selo selo-rio">Recolher {p.cascosTroca} casco(s)</span>}
        {p.itens.some((i) => i.trocaCasco) && (
          <span className="selo selo-rio">Bebida retornável: receber {p.itens.filter((i) => i.trocaCasco).reduce((t, i) => t + i.qtd, 0)} casco(s)</span>
        )}
        {p.cascosComprados > 0 && <span className="selo selo-cinza">{p.cascosComprados} casco(s) vendido(s)</span>}
        {p.temAlcool && <span className="selo selo-acai">18+: conferir documento</span>}
        {p.totalCentavos > 0 && (
          <span className={`selo ${p.statusPagamento === "pago" ? "selo-verde" : "selo-terra"}`}>
            {p.statusPagamento === "pago"
              ? `Pago ${brl(p.totalCentavos)}${p.meio ? ` · ${p.meio}` : ""}`
              : p.pagoPeloApp
                ? `Aguardando pagamento no app ${brl(p.totalCentavos)}`
                : `Receber ${brl(p.totalCentavos)}${p.meio ? ` · ${p.meio}` : ""}`}
          </span>
        )}
        {p.codigoRetirada && !final && <span className="selo selo-cinza">Código {p.codigoRetirada}</span>}
      </div>
      {p.motivo && <p className="text-sm text-terra-esc">{p.motivo}</p>}

      {/* Atalhos de contato e mapa */}
      <div className="flex flex-wrap gap-2">
        {mapa && p.modo === "entrega" && !final && (
          <>
            <a className="botao-peq-sec" href={mapa} target="_blank" rel="noopener noreferrer">
              Abrir no mapa
            </a>
            <a className="botao-peq-sec" href={waze!} target="_blank" rel="noopener noreferrer">
              Waze
            </a>
          </>
        )}
        {p.clienteTelefone && (
          <a className="botao-peq-sec" href={whats} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        )}
      </div>

      {/* Ações de status */}
      {!final || p.status === "nao_entregue" ? (
        <div className="flex flex-wrap gap-2 border-t border-borda pt-3">
          {simples.map((s) => (
            <form key={s} onSubmit={enviarSemLimpar(enviar)}>
              <input type="hidden" name="pedidoId" value={p.id} />
              <button name="novo" value={s} className="botao-peq" disabled={enviando}>
                {ROTULO_ACAO[s]}
              </button>
            </form>
          ))}
          {(proximos.includes("entregue") || proximos.includes("retirado")) && (
            <button type="button" className="botao-peq" onClick={() => setPainel(painel === "concluir" ? null : "concluir")}>
              {p.modo === "entrega" ? "Entregue" : "Retirado"}
            </button>
          )}
          {proximos.includes("nao_entregue") && (
            <button type="button" className="botao-peq-sec" onClick={() => setPainel(painel === "falhou" ? null : "falhou")}>
              Não {p.modo === "entrega" ? "entregue" : "retirado"}
            </button>
          )}
          {p.status === "nao_entregue" && ehDono && (
            <button type="button" className="botao-peq" onClick={() => setPainel(painel === "reagendar" ? null : "reagendar")}>
              Reagendar
            </button>
          )}
          {proximos.includes("cancelado") && (
            <button type="button" className="botao-peq-perigo" onClick={() => setPainel(painel === "cancelar" ? null : "cancelar")}>
              Cancelar
            </button>
          )}
        </div>
      ) : null}

      {painel === "concluir" && !final && (
        <form onSubmit={enviarSemLimpar(enviar)} className="pilha rounded-[var(--raio-campo,12px)] bg-verde-claro p-3">
          <input type="hidden" name="pedidoId" value={p.id} />
          <input type="hidden" name="novo" value={p.modo === "entrega" ? "entregue" : "retirado"} />
          {p.itens
            .filter((i) => i.trocaCasco)
            .map((i) => (
              <label key={i.id} className="campo">
                Cascos de {i.nome.replace(/ \(retornável\)$/, "")} recebidos (de {i.qtd})
                <input className="entrada" type="number" name={`cascoBebida:${i.id}`} min={0} max={i.qtd} defaultValue={i.qtd} />
                <span className="text-xs font-normal text-tinta-suave">Cada casco que faltar: cobre {brl(i.diferencaCentavos)} a mais na hora (preço normal).</span>
              </label>
            ))}
          {p.cascosTroca > 0 && (
            <label className="campo">
              Cascos vazios recolhidos (de {p.cascosTroca})
              <input className="entrada" type="number" name="cascosRecolhidos" min={0} max={p.cascosTroca} defaultValue={p.cascosTroca} />
            </label>
          )}
          {p.modo === "retirada" && p.codigoRetirada && (
            <label className="campo">
              Código que o cliente informou
              <input className="entrada" name="codigoRetirada" inputMode="numeric" maxLength={4} required />
            </label>
          )}
          {p.temAlcool && (
            <label className="escolha items-start bg-white">
              <input type="checkbox" name="documentoConferido" required className="mt-1 h-5 w-5 shrink-0 accent-verde" />
              <span className="text-sm">Conferi o documento com foto: o cliente tem 18 anos ou mais.</span>
            </label>
          )}
          {p.totalCentavos > 0 && p.statusPagamento !== "pago" && (
            <fieldset className="flex flex-wrap gap-2 text-sm">
              <legend className="mb-1 font-semibold">Recebeu {brl(p.totalCentavos)}?</legend>
              <label className="chip">
                <input type="radio" name="pagamentoRecebido" value="sim" defaultChecked className="sr-only" />
                Sim, recebi
              </label>
              <label className="chip">
                <input type="radio" name="pagamentoRecebido" value="nao" className="sr-only" />
                Ainda não
              </label>
            </fieldset>
          )}
          <button className="botao-peq" disabled={enviando}>
            Confirmar {p.modo === "entrega" ? "entrega" : "retirada"}
          </button>
        </form>
      )}

      {painel === "falhou" && !final && (
        <form onSubmit={enviarSemLimpar(enviar)} className="pilha rounded-[var(--raio-campo,12px)] bg-terra-claro p-3">
          <input type="hidden" name="pedidoId" value={p.id} />
          <input type="hidden" name="novo" value="nao_entregue" />
          <label className="campo">
            O que aconteceu?
            <select className="entrada" name="motivo" defaultValue="Cliente não estava em casa">
              <option>Cliente não estava em casa</option>
              <option>Endereço não encontrado</option>
              <option>Cliente não veio retirar</option>
              <option>Cliente recusou</option>
              <option>Sem documento (bebida alcoólica)</option>
            </select>
          </label>
          <button className="botao-peq" disabled={enviando}>
            Registrar
          </button>
          <p className="text-xs text-tinta-suave">Depois você pode reagendar para outro dia.</p>
        </form>
      )}

      {painel === "reagendar" && p.status === "nao_entregue" && (
        <form onSubmit={enviarSemLimpar(enviarR)} className="pilha rounded-[var(--raio-campo,12px)] bg-rio-claro p-3">
          <input type="hidden" name="pedidoId" value={p.id} />
          <label className="campo">
            Nova data
            <input className="entrada" type="date" name="data" defaultValue={amanha} required />
          </label>
          <button className="botao-peq" disabled={enviandoR}>
            Reagendar
          </button>
          {estadoR.erro && <p className="aviso-erro text-sm">{estadoR.erro}</p>}
          {estadoR.ok && <p className="aviso-ok text-sm">{estadoR.ok}</p>}
        </form>
      )}

      {painel === "cancelar" && !final && (
        <form onSubmit={enviarSemLimpar(enviar)} className="pilha rounded-[var(--raio-campo,12px)] bg-terra-claro p-3">
          <input type="hidden" name="pedidoId" value={p.id} />
          <input type="hidden" name="novo" value="cancelado" />
          <label className="campo">
            Motivo (o cliente vê)
            <select className="entrada" name="motivo" defaultValue="Sem estoque">
              <option>Sem estoque</option>
              <option>Fora da área de entrega</option>
              <option>Pedido duplicado</option>
              <option>Cliente pediu para cancelar</option>
            </select>
          </label>
          <button className="botao-peq-perigo" disabled={enviando}>
            Cancelar pedido
          </button>
        </form>
      )}

      {estado.erro && <p role="alert" className="aviso-erro text-sm">{estado.erro}</p>}
    </article>
  );
}
