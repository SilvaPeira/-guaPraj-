"use client";

import { useMemo, useState } from "react";
import {
  simular,
  formatarReais,
  PRECO_GALAO_AVULSO,
  DESCONTO_PLANO,
  type Moradores,
} from "@/lib/simulador";
import { BEBIDAS, BEBIDA_ALCOOLICA, type BebidaId } from "@/lib/lead";
import { CIDADE, URL_PUBLICA, WHATSAPP_CONTATO } from "@/lib/config";

type Etapa = "simular" | "cadastro" | "pronto";

export default function Simulador() {
  const [etapa, setEtapa] = useState<Etapa>("simular");
  const [m, setM] = useState<Moradores>({ adultos: 2, criancas: 0, bebes: 0, adolescentes: 0, idosos: 0 });
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  const [calor, setCalor] = useState(true);
  const [cozinha, setCozinha] = useState(true);

  const r = useMemo(() => simular(m, { calor, cozinha }), [m, calor, cozinha]);
  const set = (k: keyof Moradores) => (v: number) => setM((x) => ({ ...x, [k]: v }));

  return (
    <>
    <header className="bg-floresta pb-16 pt-5 text-white">
      <div className="mx-auto max-w-xl px-4">
        <div className="flex items-center gap-2 font-titulo text-[22px] font-extrabold">
          <IconeGota tamanho={28} />
          ÁguaPrajá
        </div>
        <p className="mt-6 text-sm font-semibold text-hero-texto">{CIDADE}, PA</p>
        <h1 className="mt-1 text-[28px] font-bold leading-tight">
          Quantos galões de água sua família precisa?
        </h1>
        <p className="mt-3 text-base leading-relaxed text-hero-texto">
          Descubra em 10 segundos e receba água em casa, no dia e horário que você escolher.
        </p>
      </div>
    </header>
    <main className="relative mx-auto -mt-10 w-full max-w-xl px-4 pb-16">

      {etapa === "simular" && (
        <>
          <section className="cartao shadow-[0_6px_20px_rgba(14,59,44,.12)]" aria-labelledby="t-casa">
            <h2 id="t-casa" className="titulo-cartao">Quem mora na sua casa?</h2>
            <Contador rotulo="Adultos" dica="18 a 59 anos" valor={m.adultos} onChange={set("adultos")} />
            <Contador rotulo="Crianças" dica="até 13 anos" valor={m.criancas} onChange={set("criancas")} />
            {maisOpcoes ? (
              <>
                <Contador rotulo="Adolescentes" dica="14 a 17 anos" valor={m.adolescentes} onChange={set("adolescentes")} />
                <Contador rotulo="Idosos" dica="60 anos ou mais" valor={m.idosos} onChange={set("idosos")} />
                <Contador rotulo="Bebês" dica="até 1 ano" valor={m.bebes} onChange={set("bebes")} />
              </>
            ) : (
              <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-verde underline" onClick={() => setMaisOpcoes(true)}>
                + Tem bebê, adolescente ou idoso?
              </button>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <Chave ligado={cozinha} onChange={setCozinha} rotulo="Uso água de galão também para cozinhar e fazer café/suco" />
              <Chave ligado={calor} onChange={setCalor} rotulo="Considerar o calor da região (+20%)" />
            </div>
          </section>

          <section className="mt-4" aria-live="polite">
            {r ? (
              <>
                <div className="rounded-[22px] bg-rio-esc p-[18px] text-white">
                  <p className="text-xs font-semibold uppercase tracking-[.6px] text-rio-luz">Sua família precisa de</p>
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className="font-titulo text-[52px] font-extrabold leading-none">
                      {semanaTexto(r.galoesSemanaMin, r.galoesSemanaMax)}
                    </span>
                    <span className="font-titulo text-lg font-semibold">galões por semana</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
                    {Array.from({ length: Math.min(r.galoesSemanaMax, 14) }, (_, i) => (
                      <IconeGalao key={i} />
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Mini rotulo="por dia" valor={`${r.litrosDia.toLocaleString("pt-BR")} L`} />
                    <Mini rotulo="por semana" valor={`${r.litrosSemana} L`} />
                    <Mini rotulo="por mês" valor={`${r.galoesMes} galões`} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border-2 border-acai bg-acai-claro p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.6px] text-acai">Plano para sua família</p>
                    <p className="font-titulo text-xl font-bold text-tinta">{r.planoSugerido} galões/mês</p>
                    <p className="text-sm text-tinta-suave">
                      a partir de ~{formatarReais(r.precoPlanoEstimado)}/mês{" "}
                      <span className="whitespace-nowrap">(avulso ~{formatarReais(r.planoSugerido * PRECO_GALAO_AVULSO)})</span>
                    </p>
                    {r.excedente > 0 && (
                      <p className="mt-1 text-sm text-tinta-suave">+ cerca de {r.excedente} galões extras por mês.</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-acai px-2.5 py-1 text-xs font-semibold text-white">
                    −{Math.round(DESCONTO_PLANO * 100)}%
                  </span>
                </div>
                <button type="button" className="botao-principal mt-4" onClick={() => setEtapa("cadastro")}>
                  Quero receber água assim
                </button>
                <p className="mt-3 text-xs leading-relaxed text-tinta-suave">
                  Preço estimado; o valor final é definido pela distribuidora. Estimativa para pessoas saudáveis.
                  Gestantes, atletas, quem trabalha exposto ao calor e pessoas com problemas renais ou cardíacos
                  devem seguir orientação médica.
                </p>
              </>
            ) : (
              <p className="cartao text-base text-tinta">Informe quantas pessoas moram na casa para ver o resultado.</p>
            )}
          </section>
        </>
      )}

      {etapa === "cadastro" && r && (
        <Cadastro
          moradores={m}
          calor={calor}
          cozinha={cozinha}
          galoesMes={r.galoesMes}
          plano={r.planoSugerido}
          onVoltar={() => setEtapa("simular")}
          onPronto={() => setEtapa("pronto")}
        />
      )}

      {etapa === "pronto" && <Pronto />}
    </main>
    </>
  );
}

function semanaTexto(min: number, max: number) {
  return min === max ? String(min) : `${min} a ${max}`;
}

function Mini({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-2.5">
      <span className="block text-xs text-rio-luz">{rotulo}</span>
      <b className="block text-sm">{valor}</b>
    </div>
  );
}

function IconeGota({ tamanho = 24 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="#7fc8e3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 0 0 12 0C18 10.2 15.5 7 12 2.5z" />
    </svg>
  );
}

function IconeGalao() {
  return (
    <svg width="26" height="34" viewBox="0 0 24 30" fill="#7fc8e3" stroke="#bfe3f1" strokeWidth="1.5">
      <rect x="5" y="1" width="14" height="4" rx="1" />
      <path d="M4 7h16v19a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
    </svg>
  );
}

function Contador({ rotulo, dica, valor, onChange }: { rotulo: string; dica: string; valor: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-borda py-3 last:border-0">
      <div>
        <p className="text-lg font-semibold text-tinta">{rotulo}</p>
        <p className="text-sm text-tinta-suave">{dica}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="botao-redondo" aria-label={`Menos ${rotulo.toLowerCase()}`} disabled={valor <= 0} onClick={() => onChange(Math.max(0, valor - 1))}>
          −
        </button>
        <span className="w-7 text-center font-titulo text-[22px] font-bold tabular-nums text-tinta" aria-live="polite">{valor}</span>
        <button type="button" className="botao-redondo botao-mais" aria-label={`Mais ${rotulo.toLowerCase()}`} disabled={valor >= 20} onClick={() => onChange(Math.min(20, valor + 1))}>
          +
        </button>
      </div>
    </div>
  );
}

function Chave({ ligado, onChange, rotulo }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string }) {
  return (
    <label className="escolha items-start">
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-verde" checked={ligado} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-base text-tinta">{rotulo}</span>
    </label>
  );
}

function Opcoes<T extends string>({ nome, valor, onChange, opcoes }: { nome: string; valor: T | ""; onChange: (v: T) => void; opcoes: [T, string][] }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {opcoes.map(([v, texto]) => (
        <label key={v} className={`opcao ${valor === v ? "opcao-ativa" : ""}`}>
          <input type="radio" name={nome} value={v} className="sr-only" checked={valor === v} onChange={() => onChange(v)} />
          {texto}
        </label>
      ))}
    </div>
  );
}

function Cadastro(props: {
  moradores: Moradores;
  calor: boolean;
  cozinha: boolean;
  galoesMes: number;
  plano: number;
  onVoltar: () => void;
  onPronto: () => void;
}) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bairro, setBairro] = useState("");
  const [galoesSemanaHoje, setGaloesSemanaHoje] = useState("");
  const [precoGalaoHoje, setPrecoGalaoHoje] = useState("");
  const [comoCompra, setComoCompra] = useState<"" | "whatsapp" | "ligacao" | "busca_na_loja" | "outro">("");
  const [ficouSemAgua, setFicouSemAgua] = useState<"" | "nunca" | "as_vezes" | "sempre">("");
  const [assinaria, setAssinaria] = useState<"" | "sim" | "talvez" | "nao">("");
  const [pagamento, setPagamento] = useState<"" | "pix_mensal" | "cartao" | "na_entrega">("");
  const [horario, setHorario] = useState<"" | "manha" | "tarde" | "horario_exato" | "qualquer">("");
  const [bebidas, setBebidas] = useState<BebidaId[]>([]);
  const [maiorDe18, setMaiorDe18] = useState(false);
  const [consentimento, setConsentimento] = useState(false);
  const [armadilha, setArmadilha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const querAlcool = bebidas.includes(BEBIDA_ALCOOLICA);

  function alternarBebida(id: BebidaId) {
    setBebidas((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!assinaria) return setErro("Diga se você assinaria um plano.");
    if (querAlcool && !maiorDe18) return setErro("Para bebidas alcoólicas, confirme que você tem 18 anos ou mais.");
    if (!consentimento) return setErro("Para continuar, autorize o contato pelo WhatsApp.");
    setEnviando(true);
    try {
      const origem = new URLSearchParams(window.location.search).get("origem") ?? "";
      const res = await fetch("/api/interesse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, whatsapp, bairro,
          ...props.moradores,
          calor: props.calor, cozinha: props.cozinha,
          galoesMesSimulado: props.galoesMes, planoSugerido: props.plano,
          galoesSemanaHoje, precoGalaoHoje, comoCompra, ficouSemAgua,
          assinaria, pagamento, horario, bebidas, maiorDe18, consentimento,
          origem, site: armadilha,
        }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok || !dados.ok) throw new Error(dados.erro || "Não foi possível enviar. Tente de novo.");
      props.onPronto();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <button type="button" onClick={props.onVoltar} className="self-start text-sm font-semibold text-verde underline">
        ← Voltar ao simulador
      </button>

      <section className="cartao border-acai/20 bg-acai-claro shadow-[0_6px_20px_rgba(14,59,44,.12)]">
        <p className="text-base text-tinta">
          Seu plano recomendado: <b>{props.plano} galões/mês</b>. Estamos escolhendo as primeiras distribuidoras
          parceiras em {CIDADE}. Deixe seu contato e avisamos quando abrir no seu bairro.
        </p>
      </section>

      <section className="cartao flex flex-col gap-4">
        <h2 className="titulo-cartao">Seus dados</h2>
        <Campo rotulo="Seu nome">
          <input className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" required maxLength={80} />
        </Campo>
        <Campo rotulo="WhatsApp com DDD">
          <input className="entrada" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(94) 9 9999-9999" required maxLength={20} />
        </Campo>
        <Campo rotulo="Bairro">
          <input className="entrada" value={bairro} onChange={(e) => setBairro(e.target.value)} required maxLength={80} />
        </Campo>
        {/* armadilha para robôs: escondida de pessoas */}
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={armadilha} onChange={(e) => setArmadilha(e.target.value)} name="site" />
      </section>

      <section className="cartao flex flex-col gap-4">
        <h2 className="titulo-cartao">Como é hoje?</h2>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Galões por semana">
            <input className="entrada" value={galoesSemanaHoje} onChange={(e) => setGaloesSemanaHoje(e.target.value)} inputMode="numeric" placeholder="ex.: 3" maxLength={3} />
          </Campo>
          <Campo rotulo="Preço do galão (R$)">
            <input className="entrada" value={precoGalaoHoje} onChange={(e) => setPrecoGalaoHoje(e.target.value)} inputMode="decimal" placeholder="ex.: 15" maxLength={6} />
          </Campo>
        </div>
        <Pergunta texto="Como você compra hoje?">
          <Opcoes nome="comoCompra" valor={comoCompra} onChange={setComoCompra} opcoes={[["whatsapp", "WhatsApp"], ["ligacao", "Ligação"], ["busca_na_loja", "Busco na loja"], ["outro", "Outro"]]} />
        </Pergunta>
        <Pergunta texto="Já ficou sem água em casa esperando o galão?">
          <Opcoes nome="ficouSemAgua" valor={ficouSemAgua} onChange={setFicouSemAgua} opcoes={[["nunca", "Nunca"], ["as_vezes", "Às vezes"], ["sempre", "Sempre"]]} />
        </Pergunta>
      </section>

      <section className="cartao flex flex-col gap-4">
        <h2 className="titulo-cartao">O plano</h2>
        <Pergunta texto="Você assinaria um plano mensal com entrega no dia e horário que escolher, mais barato que o avulso?">
          <Opcoes nome="assinaria" valor={assinaria} onChange={setAssinaria} opcoes={[["sim", "Sim"], ["talvez", "Talvez"], ["nao", "Não"]]} />
        </Pergunta>
        <Pergunta texto="Como prefere pagar?">
          <Opcoes nome="pagamento" valor={pagamento} onChange={setPagamento} opcoes={[["pix_mensal", "Pix mensal"], ["cartao", "Cartão"], ["na_entrega", "Na entrega"]]} />
        </Pergunta>
        <Pergunta texto="Melhor horário para receber">
          <Opcoes nome="horario" valor={horario} onChange={setHorario} opcoes={[["manha", "Manhã"], ["tarde", "Tarde"], ["horario_exato", "Horário exato"], ["qualquer", "Tanto faz"]]} />
        </Pergunta>
      </section>

      <section className="cartao flex flex-col gap-3">
        <h2 className="titulo-cartao">Algo mais na mesma entrega?</h2>
        <p className="text-sm text-tinta-suave">Marque o que você gostaria de pedir junto com a água.</p>
        <div className="flex flex-col gap-2">
          {BEBIDAS.map((b) => (
            <label key={b.id} className="escolha items-center">
              <input type="checkbox" className="h-5 w-5 shrink-0 accent-verde" checked={bebidas.includes(b.id)} onChange={() => alternarBebida(b.id)} />
              <span className="text-base text-tinta">{b.nome}</span>
            </label>
          ))}
        </div>
        {querAlcool && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-terra bg-terra-claro p-3">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-verde" checked={maiorDe18} onChange={(e) => setMaiorDe18(e.target.checked)} />
            <span className="text-base text-tinta">
              Declaro que tenho <b>18 anos ou mais</b>. Na entrega de bebida alcoólica o entregador pedirá um documento com foto.
              Venda proibida para menores de 18 anos.
            </span>
          </label>
        )}
      </section>

      <label className="flex cursor-pointer items-start gap-3 px-1">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-verde" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
        <span className="text-sm text-tinta-suave">
          Autorizo o ÁguaPrajá a guardar estes dados e me chamar no WhatsApp sobre o serviço. Não compartilhamos seus
          dados e você pode pedir para apagar a qualquer momento.
        </span>
      </label>

      {erro && <p role="alert" className="rounded-xl bg-terra-claro p-3 text-base font-semibold text-terra-esc">{erro}</p>}

      <button type="submit" className="botao-principal" disabled={enviando}>
        {enviando ? "Enviando…" : "Quero ser avisado"}
      </button>
    </form>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-tinta">{rotulo}</span>
      {children}
    </label>
  );
}

function Pergunta({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-semibold text-tinta">{texto}</p>
      {children}
    </div>
  );
}

function Pronto() {
  const link = URL_PUBLICA || (typeof window !== "undefined" ? window.location.origin : "");
  const msg = `Descobri quantos galões de água minha família precisa por mês. Faz o teste também: ${link}`;
  return (
    <section className="cartao text-center shadow-[0_6px_20px_rgba(14,59,44,.12)]">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-verde-claro">
        <IconeCheck />
      </div>
      <h2 className="mt-4 text-2xl font-bold text-tinta">Pronto, recebemos!</h2>
      <p className="mt-2 text-base text-tinta-suave">
        Vamos te chamar no WhatsApp assim que o ÁguaPrajá abrir no seu bairro.
      </p>
      <a className="botao-principal mt-5" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
        Indicar para um vizinho
      </a>
      {WHATSAPP_CONTATO && (
        <a className="mt-3 block text-base font-semibold text-verde underline" href={`https://wa.me/${WHATSAPP_CONTATO}`} target="_blank" rel="noopener noreferrer">
          Falar com a gente no WhatsApp
        </a>
      )}
    </section>
  );
}

function IconeCheck() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1b6b47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
