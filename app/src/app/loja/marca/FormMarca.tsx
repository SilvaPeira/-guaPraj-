"use client";

import { useActionState, useRef, useState } from "react";
import { PALETAS, variaveisTema } from "@/lib/cores";
import { salvarMarca, type EstadoMarca } from "./actions";

type Props = {
  nome: string;
  slugInicial: string;
  descricao: string | null;
  corPrimaria: string;
  corEscura: string;
  logoUrl: string | null;
  baseUrl: string;
};

/** Reduz a imagem para no máximo 512×512 e devolve PNG (data URL). */
async function prepararLogo(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("imagem"));
      i.src = url;
    });
    const escala = Math.min(1, 512 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * escala));
    const h = Math.max(1, Math.round(img.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function FormMarca(p: Props) {
  const [estado, enviar, enviando] = useActionState<EstadoMarca, FormData>(salvarMarca, {});
  const [slug, setSlug] = useState(p.slugInicial);
  const [primaria, setPrimaria] = useState(p.corPrimaria);
  const [escura, setEscura] = useState(p.corEscura);
  const [logo, setLogo] = useState<string>("");
  const [remover, setRemover] = useState(false);
  const [erroLogo, setErroLogo] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);
  const previa = remover ? null : logo || p.logoUrl;
  const slugLimpo = slug
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "");

  return (
    <form action={enviar} className="pilha">
      <input type="hidden" name="logo" value={logo} />
      <input type="hidden" name="removerLogo" value={remover ? "1" : ""} />

      {/* Prévia de como fica no celular */}
      <section className="overflow-hidden rounded-[20px] border border-borda" style={variaveisTema(primaria, escura) as React.CSSProperties} aria-label="Prévia">
        <div className="bg-floresta px-4 pb-6 pt-4 text-white">
          <div className="flex items-center gap-2.5">
            {previa && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previa} alt="" className="h-12 w-12 rounded-xl bg-white object-contain p-0.5" />
            )}
            <b className="truncate font-titulo text-xl">{p.nome}</b>
          </div>
          <p className="mt-3 text-sm text-hero-texto">Água na sua porta, no dia certo.</p>
        </div>
        <div className="flex flex-col gap-2 bg-fundo p-3">
          <span className="botao pointer-events-none">Assinar um plano</span>
          <p className="text-center text-[11px] text-tinta-suave/70">feito com ÁguaPrajá</p>
        </div>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Logo</h2>
        <p className="text-sm text-tinta-suave">Use a logo da loja (PNG ou JPG). Ela vira o ícone do app no celular do cliente.</p>
        <input
          ref={arquivo}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            setErroLogo("");
            if (!f) return;
            if (f.size > 8_000_000) return setErroLogo("Imagem muito grande (máx. 8 MB).");
            try {
              setLogo(await prepararLogo(f));
              setRemover(false);
            } catch {
              setErroLogo("Não conseguimos abrir essa imagem. Tente outra.");
            }
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="botao-peq" onClick={() => arquivo.current?.click()}>
            {previa ? "Trocar logo" : "Enviar logo"}
          </button>
          {previa && (
            <button
              type="button"
              className="botao-peq-sec"
              onClick={() => {
                setLogo("");
                setRemover(true);
              }}
            >
              Remover
            </button>
          )}
        </div>
        {erroLogo && <p role="alert" className="aviso-erro text-sm">{erroLogo}</p>}
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Cores</h2>
        <div className="grid grid-cols-2 gap-2">
          {PALETAS.map((c) => (
            <button
              key={c.nome}
              type="button"
              onClick={() => {
                setPrimaria(c.primaria);
                setEscura(c.escura);
              }}
              className={`flex items-center gap-2 rounded-xl border p-2 text-left text-sm ${primaria === c.primaria && escura === c.escura ? "border-2 border-tinta" : "border-borda2"}`}
            >
              <span className="flex flex-none overflow-hidden rounded-lg">
                <span className="h-7 w-5" style={{ background: c.escura }} />
                <span className="h-7 w-5" style={{ background: c.primaria }} />
              </span>
              {c.nome}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="campo">
            Cor dos botões
            <input type="color" name="corPrimaria" value={primaria} onChange={(e) => setPrimaria(e.target.value)} className="h-12 w-full cursor-pointer rounded-xl border border-borda2 bg-white p-1" />
          </label>
          <label className="campo">
            Cor do topo
            <input type="color" name="corEscura" value={escura} onChange={(e) => setEscura(e.target.value)} className="h-12 w-full cursor-pointer rounded-xl border border-borda2 bg-white p-1" />
          </label>
        </div>
        <p className="text-xs text-tinta-suave">Cores muito claras são escurecidas automaticamente para o texto branco continuar legível.</p>
      </section>

      <section className="cartao pilha">
        <h2 className="titulo-secao">Endereço e apresentação</h2>
        <label className="campo">
          Endereço do seu site
          <div className="flex items-center overflow-hidden rounded-xl border border-borda2 bg-white focus-within:outline-3 focus-within:outline-gota">
            <span className="flex-none pl-3 text-sm text-tinta-suave">{p.baseUrl}/l/</span>
            <input className="min-h-12 w-full bg-transparent px-1 text-base font-normal outline-none" name="slug" value={slugLimpo} onChange={(e) => setSlug(e.target.value)} maxLength={40} required />
          </div>
        </label>
        <label className="campo">
          Frase de apresentação
          <textarea
            className="entrada min-h-20 py-2"
            name="descricao"
            maxLength={200}
            defaultValue={p.descricao ?? ""}
            placeholder="Ex.: Água mineral, cerveja gelada e gás com entrega rápida no Novo Brasil."
          />
        </label>
      </section>

      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p role="status" className="aviso-ok">{estado.ok}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
