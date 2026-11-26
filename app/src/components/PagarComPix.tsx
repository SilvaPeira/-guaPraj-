import { chaveLegivel, pixCopiaECola } from "@/lib/pix";
import { qrSvg } from "@/lib/qr";
import { formatarReais } from "@/lib/validacao";
import Copiar from "./Copiar";

/**
 * Cliente escolheu Pix para pagar na entrega/retirada: mostra a chave da loja e o
 * "Pix copia e cola" com o valor do pedido (e o QR, para quem paga por outro celular).
 */
export default async function PagarComPix(p: {
  chave: string;
  tipo: string;
  nome: string;
  cidade: string;
  valorCentavos: number;
  numeroPedido: number;
  modo: "entrega" | "retirada";
}) {
  const copiaECola = pixCopiaECola({ chave: p.chave, nome: p.nome, cidade: p.cidade, valorCentavos: p.valorCentavos, identificador: `PEDIDO${p.numeroPedido}` });
  const qr = await qrSvg(copiaECola, "#000000");
  const legivel = chaveLegivel(p.tipo, p.chave);
  return (
    <section className="cartao-elevado pilha border-2 border-verde" aria-labelledby="pix-titulo">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="pix-titulo" className="titulo-secao">
          Pague com Pix
        </h2>
        <b className="font-titulo text-xl">{formatarReais(p.valorCentavos)}</b>
      </div>
      <p className="text-sm text-tinta-suave">
        Pode pagar agora ou {p.modo === "entrega" ? "na hora da entrega" : "na retirada"}. Mostre o comprovante para {p.modo === "entrega" ? "o entregador" : "a loja"}.
      </p>

      <div className="pilha rounded-xl bg-fundo p-3">
        <span className="text-xs font-bold uppercase tracking-[.6px] text-tinta-suave">Pix copia e cola (já com o valor)</span>
        <p className="break-all font-mono text-xs">{copiaECola}</p>
        <Copiar texto={copiaECola} rotulo="Copiar Pix copia e cola" />
        <span className="text-xs text-tinta-suave">No app do banco: Pix → “Pix copia e cola” → cole e confirme.</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="pilha min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-[.6px] text-tinta-suave">Ou pela chave</span>
          <b className="break-all text-[15px]">{legivel}</b>
          <span className="text-sm text-tinta-suave">{p.nome}</span>
          <Copiar texto={p.chave} rotulo="Copiar chave" classe="botao-peq-sec self-start" />
        </div>
        <div
          className="size-28 flex-none rounded-lg bg-white p-1"
          role="img"
          aria-label="QR code do Pix com o valor do pedido"
          // SVG gerado no servidor (biblioteca qrcode) a partir do Pix copia e cola.
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      </div>
    </section>
  );
}
