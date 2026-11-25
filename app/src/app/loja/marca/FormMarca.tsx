"use client";

import { useActionState, useRef, useState } from "react";
import type { Personalizacao } from "@/db/schema";
import { CANTOS, FONTES, FUNDOS, PALETAS, temaDaLoja, type Cantos, type Fonte } from "@/lib/cores";
import { salvarMarca, type EstadoMarca } from "./actions";
import { prepararImagem } from "@/lib/imagem";
import { BotoesEdicao, useEdicao } from "@/components/Edicao";
import { enviarSemLimpar } from "@/lib/formulario";

type Props = {
  nome: string;
  slugInicial: string;
  descricao: string | null;
  corPrimaria: string;
  corEscura: string;
  personalizacao: Personalizacao;
  logoUrl: string | null;
  capaUrl: string | null;
  baseUrl: string;
};


function SeletorCor({ nome, rotulo, valor, onChange, dica }: { nome: string; rotulo: string; valor: string; onChange: (v: string) => void; dica?: string }) {
  return (
    <label className="campo">
      {rotulo}
      <span className="flex items-center gap-2">
        <input type="color" name={nome} value={valor} onChange={(e) => onChange(e.target.value)} className="h-12 w-16 flex-none cursor-pointer rounded-[var(--raio-campo,12px)] border border-borda2 bg-white p-1" />
        <span className="font-mono text-sm font-normal text-tinta-suave">{valor.toUpperCase()}</span>
      </span>
      {dica && <span className="text-xs font-normal text-tinta-suave">{dica}</span>}
    </label>
  );
}

function EnviarImagem({
  rotulo,
  dica,
  previa,
  onArquivo,
  onRemover,
  erro,
}: {
  rotulo: string;
  dica: string;
  previa: string | null;
  onArquivo: (f: File) => void;
  onRemover: () => void;
  erro: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="pilha">
      <b className="text-sm">{rotulo}</b>
      <p className="text-xs text-tinta-suave">{dica}</p>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArquivo(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="botao-peq" onClick={() => ref.current?.click()}>
          {previa ? "Trocar" : "Enviar imagem"}
        </button>
        {previa && (
          <button type="button" className="botao-peq-sec" onClick={onRemover}>
            Remover
          </button>
        )}
      </div>
      {erro && <p role="alert" className="aviso-erro text-sm">{erro}</p>}
    </div>
  );
}

/** "Cancelar" recria o formulário a partir do que está salvo (desfaz cores, imagens e textos). */
export default function FormMarca(p: Props) {
  const [versao, setVersao] = useState(0);
  return <FormMarcaInterno key={versao} {...p} aoCancelar={() => setVersao((v) => v + 1)} />;
}

function FormMarcaInterno(p: Props & { aoCancelar: () => void }) {
  const ini = p.personalizacao;
  const [estado, enviar, enviando] = useActionState<EstadoMarca, FormData>(salvarMarca, {});
  const edicao = useEdicao(estado);
  const ed = { ...edicao, cancelar: p.aoCancelar };
  const [slug, setSlug] = useState(p.slugInicial);
  const [primaria, setPrimaria] = useState(p.corPrimaria);
  const [escura, setEscura] = useState(p.corEscura);
  const [destaque, setDestaque] = useState(ini.corDestaque ?? "#4b1e52");
  const [fundo, setFundo] = useState(ini.corFundo ?? "#f4f7f3");
  const [iconeAuto, setIconeAuto] = useState(!ini.corIcone);
  const [corIcone, setCorIcone] = useState(ini.corIcone ?? "#ffffff");
  const [fonte, setFonte] = useState<Fonte>(ini.fonte ?? "sora");
  const [cantos, setCantos] = useState<Cantos>(ini.cantos ?? "arredondado");
  const [titulo, setTitulo] = useState(ini.titulo ?? "");
  const [nomeCurto, setNomeCurto] = useState(ini.nomeCurto ?? "");
  const [logo, setLogo] = useState("");
  const [capa, setCapa] = useState("");
  const [removerLogo, setRemoverLogo] = useState(false);
  const [removerCapa, setRemoverCapa] = useState(false);
  const [erroLogo, setErroLogo] = useState("");
  const [erroCapa, setErroCapa] = useState("");

  const previaLogo = removerLogo ? null : logo || p.logoUrl;
  const previaCapa = removerCapa ? null : capa || p.capaUrl;
  const tema = temaDaLoja({ corPrimaria: primaria, corEscura: escura, corDestaque: destaque, corFundo: fundo, fonte, cantos });
  const fundoIcone = !iconeAuto ? corIcone : previaLogo ? "#ffffff" : tema["--color-floresta"];
  const slugLimpo = slug
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "");
  const nomeIcone = nomeCurto || p.nome.replace(/^(distribuidora|dep[oó]sito)\s+/i, "");

  async function receber(f: File, tipo: "logo" | "capa") {
    const setErro = tipo === "logo" ? setErroLogo : setErroCapa;
    setErro("");
    if (f.size > 12_000_000) return setErro("Imagem muito grande (máx. 12 MB).");
    try {
      if (tipo === "logo") {
        setLogo(await prepararImagem(f, 512, "image/png"));
        setRemoverLogo(false);
      } else {
        setCapa(await prepararImagem(f, 1280, "image/jpeg"));
        setRemoverCapa(false);
      }
    } catch {
      setErro("Não conseguimos abrir essa imagem. Tente outra.");
    }
  }

  return (
    <form onSubmit={enviarSemLimpar(enviar)} className="pilha">
      <input type="hidden" name="logo" value={logo} />
      <input type="hidden" name="capa" value={capa} />
      <input type="hidden" name="remover_logo" value={removerLogo ? "1" : ""} />
      <input type="hidden" name="remover_capa" value={removerCapa ? "1" : ""} />
      <input type="hidden" name="fonte" value={fonte} />
      <input type="hidden" name="cantos" value={cantos} />

      {/* ── Prévia ao vivo ── */}
      <section className="sticky top-0 z-10 -mx-4 bg-fundo/95 px-4 pb-2 pt-1 backdrop-blur" aria-label="Prévia do app">
        <div className="flex items-end gap-3">
          <div className="flex-1 overflow-hidden border border-borda shadow-md" style={{ ...(tema as React.CSSProperties), borderRadius: 22 }}>
            <div
              className="bg-floresta bg-cover bg-center px-3 pb-4 pt-3 text-white"
              style={previaCapa ? { backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, var(--color-floresta) 55%, transparent), var(--color-floresta)), url(${previaCapa})` } : undefined}
            >
              <div className="flex items-center gap-2">
                {previaLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previaLogo} alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-0.5" />
                )}
                <b className="truncate font-titulo text-sm">{p.nome}</b>
              </div>
              <p className="mt-2 font-titulo text-[15px] font-bold leading-tight">{titulo || "Água na sua porta, no dia certo."}</p>
            </div>
            <div className="flex flex-col gap-1.5 bg-fundo p-2.5">
              <div className="flex items-center justify-between border-2 border-acai bg-acai-claro px-2.5 py-1.5 text-xs" style={{ borderRadius: "var(--raio-cartao)" }}>
                <b>20 galões/mês</b>
                <span className="rounded-full bg-acai px-1.5 py-0.5 text-[10px] text-white">Sugerido</span>
              </div>
              <span className="flex min-h-9 items-center justify-center bg-verde text-xs font-bold text-white" style={{ borderRadius: "var(--raio-botao)" }}>
                Assinar um plano
              </span>
              <p className="text-center text-[9px] text-tinta-suave/70">feito com ÁguaPrajá</p>
            </div>
          </div>
          <div className="flex w-20 flex-none flex-col items-center gap-1 pb-1" aria-label="Ícone no celular">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] shadow-md" style={{ background: fundoIcone }}>
              {previaLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previaLogo} alt="" className="h-12 w-12 object-contain" />
              ) : (
                <span className="text-xl font-extrabold text-white">{nomeIcone.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="w-full truncate text-center text-[11px]">{nomeIcone.slice(0, 12)}</span>
          </div>
        </div>
      </section>

      {!ed.editando && <BotoesEdicao ed={ed} textoEditar="Editar a cara do meu app" />}
      <fieldset disabled={!ed.editando} className="pilha">
      {/* ── Imagens ── */}
      <section className="cartao pilha">
        <h2 className="titulo-secao">Logo e capa</h2>
        <EnviarImagem
          rotulo="Logo"
          dica="PNG ou JPG. Vira o ícone do app no celular do cliente."
          previa={previaLogo}
          erro={erroLogo}
          onArquivo={(f) => receber(f, "logo")}
          onRemover={() => {
            setLogo("");
            setRemoverLogo(true);
          }}
        />
        <div className="border-t border-borda" />
        <EnviarImagem
          rotulo="Imagem de capa (opcional)"
          dica="Foto da loja, do caminhão ou dos produtos. Fica no topo do site, com a cor do topo por cima."
          previa={previaCapa}
          erro={erroCapa}
          onArquivo={(f) => receber(f, "capa")}
          onRemover={() => {
            setCapa("");
            setRemoverCapa(true);
          }}
        />
      </section>

      {/* ── Cores ── */}
      <section className="cartao pilha">
        <h2 className="titulo-secao">Cores do app</h2>
        <p className="text-sm text-tinta-suave">Comece por uma combinação pronta e ajuste cada cor como quiser.</p>
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
          <SeletorCor nome="corPrimaria" rotulo="Botões" valor={primaria} onChange={setPrimaria} />
          <SeletorCor nome="corEscura" rotulo="Topo e barra do celular" valor={escura} onChange={setEscura} />
          <SeletorCor nome="corDestaque" rotulo="Destaques" valor={destaque} onChange={setDestaque} dica="Plano sugerido, resultado do simulador." />
          <div className="campo">
            Fundo das telas
            <div className="flex flex-wrap gap-1.5">
              {FUNDOS.map((f) => (
                <button key={f} type="button" aria-label={`Fundo ${f}`} onClick={() => setFundo(f)} className={`h-9 w-9 rounded-lg border ${fundo === f ? "border-2 border-tinta" : "border-borda2"}`} style={{ background: f }} />
              ))}
              <input type="color" name="corFundo" value={fundo} onChange={(e) => setFundo(e.target.value)} aria-label="Outra cor de fundo" className="h-9 w-9 cursor-pointer rounded-lg border border-borda2 bg-white p-0.5" />
            </div>
          </div>
        </div>
        <div className="pilha border-t border-borda pt-3">
          <b className="text-sm">Fundo do ícone no celular</b>
          <label className="escolha items-center p-2.5 text-sm">
            <input type="checkbox" name="iconeAuto" checked={iconeAuto} onChange={(e) => setIconeAuto(e.target.checked)} className="h-5 w-5 shrink-0 accent-verde" />
            Automático (branco com logo; cor do topo sem logo)
          </label>
          {!iconeAuto && <SeletorCor nome="corIcone" rotulo="Cor do fundo do ícone" valor={corIcone} onChange={setCorIcone} />}
        </div>
        <p className="text-xs text-tinta-suave">Cores muito claras nos botões e no topo são escurecidas automaticamente para o texto branco continuar legível. O fundo é sempre clarinho.</p>
      </section>

      {/* ── Estilo ── */}
      <section className="cartao pilha">
        <h2 className="titulo-secao">Estilo</h2>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Fonte dos títulos</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(FONTES) as Fonte[]).map((k) => (
              <button key={k} type="button" onClick={() => setFonte(k)} className={`rounded-xl border p-2.5 text-left ${fonte === k ? "border-2 border-tinta" : "border-borda2"}`} style={{ fontFamily: `var(${FONTES[k].variavel})` }}>
                <span className="block text-lg font-bold">Água pra já</span>
                <span className="text-xs text-tinta-suave" style={{ fontFamily: "var(--font-inter)" }}>
                  {FONTES[k].nome}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Cantos</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CANTOS) as Cantos[]).map((k) => (
              <button key={k} type="button" onClick={() => setCantos(k)} className={`flex flex-col items-center gap-1.5 border p-2.5 text-sm ${cantos === k ? "border-2 border-tinta" : "border-borda2"}`} style={{ borderRadius: CANTOS[k].botao }}>
                <span className="h-6 w-12 bg-verde" style={{ borderRadius: CANTOS[k].botao, ...(tema as React.CSSProperties) }} />
                {CANTOS[k].nome}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      {/* ── Textos ── */}
      <section className="cartao pilha">
        <h2 className="titulo-secao">Textos</h2>
        <label className="campo">
          Título do topo
          <input className="entrada" name="titulo" maxLength={70} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Água na sua porta, no dia certo." />
        </label>
        <label className="campo">
          Frase de apresentação
          <textarea className="entrada min-h-20 py-2" name="descricao" maxLength={200} defaultValue={p.descricao ?? ""} placeholder="Ex.: Água mineral, cerveja gelada e gelo com entrega rápida no Novo Brasil." />
        </label>
        <label className="campo">
          Nome embaixo do ícone (até 12 letras)
          <input className="entrada" name="nomeCurto" maxLength={12} value={nomeCurto} onChange={(e) => setNomeCurto(e.target.value)} placeholder={p.nome.slice(0, 12)} />
        </label>
      </section>

      {/* ── Endereço e contatos ── */}
      <section className="cartao pilha">
        <h2 className="titulo-secao">Endereço e contatos</h2>
        <label className="campo">
          Endereço do seu site
          <div className="flex items-center overflow-hidden rounded-[var(--raio-campo,12px)] border border-borda2 bg-white focus-within:outline-3 focus-within:outline-gota">
            <span className="flex-none pl-3 text-sm text-tinta-suave">{p.baseUrl}/l/</span>
            <input className="min-h-12 w-full bg-transparent px-1 text-base font-normal outline-none" name="slug" value={slugLimpo} onChange={(e) => setSlug(e.target.value)} maxLength={40} required />
          </div>
        </label>
        <label className="campo">
          Instagram
          <input className="entrada" name="instagram" maxLength={40} defaultValue={ini.instagram ? `@${ini.instagram}` : ""} placeholder="@sualoja" />
        </label>
        <label className="escolha items-center p-2.5 text-sm">
          <input type="checkbox" name="mostrarWhatsapp" defaultChecked={ini.mostrarWhatsapp !== false} className="h-5 w-5 shrink-0 accent-verde" />
          Mostrar botão de WhatsApp da loja no site
        </label>
      </section>

      </fieldset>
      {estado.erro && <p role="alert" className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p role="status" className="aviso-ok">{estado.ok}</p>}
      {ed.editando && <BotoesEdicao ed={ed} salvando={enviando} textoSalvar="Salvar a cara do meu app" />}
    </form>
  );
}
