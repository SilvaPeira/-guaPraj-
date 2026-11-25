import Link from "next/link";
import type { ReactNode } from "react";
import { IconeGota } from "@/components/ui";
import { textoLimite, type PlanoApp } from "@/lib/planos-app";
import { linkWhatsApp } from "@/lib/telefone";

// Site público do ÁguaPrajá: apresenta o serviço para clientes e distribuidoras.

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

/** Quando o admin ainda não cadastrou planos, mostra os do documento. */
const PLANOS_PADRAO = [
  { id: "e", nome: "Essencial", precoCentavos: 4490, descricao: "Pedidos, assinaturas e pagamento pelo app (Pix e cartão).", limiteAssinantes: 100, limiteEntregadores: 3, pagamentoOnline: true, produtosExtras: true, appProprio: false },
  { id: "c", nome: "Completo", precoCentavos: 9990, descricao: "Tudo do Essencial, sem limites, e o app próprio com a marca da sua loja.", limiteAssinantes: null, limiteEntregadores: null, pagamentoOnline: true, produtosExtras: true, appProprio: true },
];

type PlanoVitrine = Pick<PlanoApp, "id" | "nome" | "precoCentavos" | "descricao" | "limiteAssinantes" | "limiteEntregadores" | "pagamentoOnline" | "produtosExtras" | "appProprio">;

export default function SiteAguaPraja({ planos, suporte }: { planos: PlanoVitrine[]; suporte: string | null }) {
  const vitrine = planos.length ? planos : PLANOS_PADRAO;
  // Destaque: o plano com app próprio (ou o segundo).
  const destaque = vitrine.find((p) => p.appProprio)?.id ?? (vitrine.length > 1 ? vitrine[1].id : null);
  return (
    <div className="bg-white">
      {/* Topo */}
      <header className="bg-floresta text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <span className="flex items-center gap-2 font-titulo text-xl font-extrabold">
            <IconeGota tamanho={26} />
            ÁguaPrajá
          </span>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <a href="#clientes" className="hidden hover:underline sm:inline">
              Para você
            </a>
            <a href="#distribuidoras" className="hidden hover:underline sm:inline">
              Para distribuidoras
            </a>
            <a href="#planos" className="hidden hover:underline sm:inline">
              Planos
            </a>
            <Link href="/entrar" className="rounded-full bg-white px-4 py-2 text-floresta">
              Entrar
            </Link>
          </nav>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 px-4 pb-16 pt-8 md:grid-cols-[1.2fr_1fr] md:items-center md:pt-14">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-sm text-hero-texto">Canaã dos Carajás · Parauapebas</p>
            <h1 className="text-[34px] font-extrabold leading-tight md:text-5xl">
              Água na sua porta,
              <br />
              no dia certo.
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-hero-texto">
              Assine um plano com a distribuidora do seu bairro, escolha o dia e o horário, e nunca mais fique sem galão. Bebidas e gelo vão na mesma entrega.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/entrar" className="rounded-full bg-white px-6 py-3.5 text-center font-bold text-floresta">
                Quero receber água
              </Link>
              <Link href="/entrar?para=loja" className="rounded-full border-2 border-white/60 px-6 py-3.5 text-center font-bold text-white">
                Sou distribuidora
              </Link>
            </div>
          </div>
          <div className="rounded-3xl bg-white/10 p-5">
            <div className="rounded-2xl bg-white p-4 text-tinta shadow-lg">
              <p className="text-sm text-tinta-suave">Seu plano</p>
              <p className="font-titulo text-2xl font-bold">12 galões/mês</p>
              <p className="mt-1 text-sm">Toda segunda e quinta, às 9h</p>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-verde-claro px-3 py-2 text-sm">
                <span>Próxima entrega</span>
                <b className="text-verde">Amanhã · 9h</b>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-rio-claro px-3 py-2 text-sm">
                <span>Família de 4 pessoas</span>
                <b className="text-rio-esc">≈ 10 L/dia</b>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Clientes */}
      <Secao id="clientes" chapeu="Para você" titulo="Simples como deve ser">
        <div className="grid gap-4 md:grid-cols-3">
          <Passo n={1} titulo="Calcule o consumo" texto="Diga quem mora na casa e o app mostra quantos galões vocês usam por mês." />
          <Passo n={2} titulo="Escolha a distribuidora" texto="Veja as lojas que entregam no seu endereço, com preço, plano e avaliação." />
          <Passo n={3} titulo="Receba no dia combinado" texto="Dia e horário fixos. Pode pular, mudar o dia ou pedir um galão extra quando quiser." />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Selo titulo="Sem ficar sem água" texto="Lembrete na véspera e entrega garantida no seu horário." />
          <Selo titulo="Pague como preferir" texto="Pix, cartão pelo app ou na entrega." />
          <Selo titulo="Lojas verificadas" texto="Água com selo fiscal do Pará e vasilhame dentro da validade." />
          <Selo titulo="Bebidas junto" texto="Refrigerante, gelo e polpas na mesma entrega (18+ para álcool)." />
        </div>
      </Secao>

      {/* Distribuidoras */}
      <section id="distribuidoras" className="bg-fundo">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="text-sm font-bold uppercase tracking-wide text-terra">Para distribuidoras</p>
          <h2 className="mt-1 text-3xl font-bold">Receita garantida no começo do mês</h2>
          <p className="mt-3 max-w-2xl text-lg text-tinta-suave">
            Troque o vaivém do WhatsApp por assinantes com dia e horário marcados. Uma loja com 100 assinantes de R$ 300 tem R$ 30 mil por mês previstos — e sabe exatamente
            quanto separar para cada dia.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Recurso titulo="Agenda do dia pronta" texto="Entregas por horário, com mapa, Waze e WhatsApp do cliente. Confirme tudo em lote." />
            <Recurso titulo="Assinaturas recorrentes" texto="O cliente escolhe o plano e a agenda; o app gera as entregas e a cobrança do mês." />
            <Recurso titulo="App próprio (plano Completo)" texto="Site com seu nome, logo e cores, só com a sua loja. O cliente instala no celular ou no computador, sem Play Store nem App Store." />
            <Recurso titulo="Pix e cartão" texto="O dinheiro cai direto na sua conta Mercado Pago. Pedido pago fica marcado sozinho." />
            <Recurso titulo="Controle de cascos" texto="Saiba quantos vasilhames estão com cada cliente." />
            <Recurso titulo="Financeiro e avaliações" texto="Recebido no mês, a receber, ticket médio e a nota dos seus clientes." />
          </div>
          <Link href="/entrar?para=loja" className="mt-8 inline-block rounded-full bg-verde px-6 py-3.5 font-bold text-white">
            Cadastrar minha distribuidora
          </Link>
        </div>
      </section>

      {/* Planos */}
      <Secao id="planos" chapeu="Planos para distribuidoras" titulo="Comece grátis. Cresça quando quiser.">
        <p className="-mt-3 mb-6 text-tinta-suave">Para o cliente, o ÁguaPrajá é sempre gratuito.</p>
        <div className={`grid gap-4 ${vitrine.length >= 3 ? "md:grid-cols-3" : vitrine.length === 2 ? "md:grid-cols-2" : ""}`}>
          {vitrine.map((p) => {
            const top = p.id === destaque;
            return (
              <article key={p.id} className={`flex flex-col rounded-3xl border-2 p-6 ${top ? "border-verde shadow-lg" : "border-borda"}`}>
                {top && <span className="mb-2 self-start rounded-full bg-verde px-3 py-1 text-xs font-bold text-white">{p.appProprio ? "Com app próprio" : "Mais escolhido"}</span>}
                <h3 className="text-xl font-bold">{p.nome}</h3>
                <p className="mt-2">
                  <b className="font-titulo text-4xl">{p.precoCentavos ? brl(p.precoCentavos) : "R$ 0"}</b>
                  <span className="text-tinta-suave">/mês</span>
                </p>
                {p.descricao && <p className="mt-2 text-sm text-tinta-suave">{p.descricao}</p>}
                <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
                  <Item>{textoLimite(p.limiteAssinantes, "assinante", "assinantes")}</Item>
                  <Item>{textoLimite(p.limiteEntregadores, "entregador", "entregadores")}</Item>
                  <Item>Pedidos avulsos, agenda e cascos</Item>
                  <Item off={!p.pagamentoOnline}>Cliente paga pelo app (Pix e cartão)</Item>
                  <Item off={!p.produtosExtras}>Bebidas, gelo e polpas no catálogo</Item>
                  <Item off={!p.appProprio}>App próprio com a marca da sua loja</Item>
                </ul>
                <Link href="/entrar?para=loja" className={`mt-6 rounded-full px-5 py-3 text-center font-bold ${top ? "bg-verde text-white" : "border-2 border-verde text-verde"}`}>
                  Começar
                </Link>
              </article>
            );
          })}
        </div>
      </Secao>

      {/* Perguntas */}
      <section className="bg-fundo">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-3xl font-bold">Perguntas frequentes</h2>
          <div className="mt-6 flex flex-col gap-3">
            <Pergunta p="Quanto custa para o cliente?" r="Nada. O cliente paga só a água e os produtos, pelo preço da distribuidora." />
            <Pergunta p="Posso mudar o dia ou pular uma entrega?" r="Sim. No app você pula uma entrega, muda o dia e o horário, troca de plano ou cancela quando quiser." />
            <Pergunta p="E se eu precisar de mais água no mês?" r="Peça um galão extra pelo app, pelo mesmo preço do seu plano." />
            <Pergunta p="Como a distribuidora recebe?" r="Na entrega (Pix ou dinheiro) ou pelo app com Pix e cartão, direto na conta Mercado Pago da loja." />
            <Pergunta p="Preciso instalar algo?" r="Não. O app abre no navegador do celular e pode ser instalado na tela inicial, sem loja de aplicativos." />
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="bg-floresta text-hero-texto">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 font-titulo text-lg font-extrabold text-white">
            <IconeGota tamanho={22} />
            ÁguaPrajá
          </span>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/termos" className="hover:underline">
              Termos e privacidade
            </Link>
            {suporte && (
              <a href={linkWhatsApp(suporte, "Olá! Quero saber mais sobre o ÁguaPrajá.")} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Fale conosco no WhatsApp
              </a>
            )}
            <Link href="/entrar" className="hover:underline">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Secao({ id, chapeu, titulo, children }: { id: string; chapeu: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id}>
      <div className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-sm font-bold uppercase tracking-wide text-rio">{chapeu}</p>
        <h2 className="mb-8 mt-1 text-3xl font-bold">{titulo}</h2>
        {children}
      </div>
    </section>
  );
}

function Passo({ n, titulo, texto }: { n: number; titulo: string; texto: string }) {
  return (
    <div className="rounded-3xl bg-fundo p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-verde font-titulo font-bold text-white">{n}</span>
      <h3 className="mt-4 text-lg font-bold">{titulo}</h3>
      <p className="mt-1 text-tinta-suave">{texto}</p>
    </div>
  );
}

function Selo({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-borda p-4">
      <Check />
      <div>
        <b>{titulo}</b>
        <p className="text-sm text-tinta-suave">{texto}</p>
      </div>
    </div>
  );
}

function Recurso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold">{titulo}</h3>
      <p className="mt-1 text-tinta-suave">{texto}</p>
    </div>
  );
}

function Item({ children, off = false }: { children: ReactNode; off?: boolean }) {
  return (
    <li className={`flex items-start gap-2 ${off ? "text-tinta-suave line-through decoration-1 opacity-60" : ""}`}>
      {off ? <span className="mt-0.5 h-5 w-5 flex-none text-center">–</span> : <Check />}
      {children}
    </li>
  );
}

function Check() {
  return (
    <svg className="mt-0.5 flex-none text-verde" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Pergunta({ p, r }: { p: string; r: string }) {
  return (
    <details className="rounded-2xl bg-white p-4">
      <summary className="cursor-pointer font-semibold">{p}</summary>
      <p className="mt-2 text-tinta-suave">{r}</p>
    </details>
  );
}
