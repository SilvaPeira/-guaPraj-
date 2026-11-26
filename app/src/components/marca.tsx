import type { Marca } from "@/lib/marca";

/** Logo da loja no cabeçalho (ou as iniciais, se ela não enviou logo). */
export function LogoLoja({ marca, tamanho = 40 }: { marca: Pick<Marca, "slug" | "nome" | "temLogo">; tamanho?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {marca.temLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/l/${marca.slug}/logo`} alt="" width={tamanho} height={tamanho} className="flex-none rounded-xl bg-white object-contain p-0.5" style={{ width: tamanho, height: tamanho }} />
      ) : null}
      <span className="truncate font-titulo text-[20px] font-extrabold">{marca.nome}</span>
    </span>
  );
}

/** Assinatura discreta do ÁguaPrajá no rodapé dos sites das lojas. */
export function SeloAguaPraja({ comFolgaDoMenu = false }: { comFolgaDoMenu?: boolean }) {
  return (
    <footer className={`flex items-center justify-center gap-1 pt-2 text-[11px] text-tinta-suave/70 ${comFolgaDoMenu ? "pb-[86px] lg:pb-5" : "pb-5"}`}>
      <span>feito com</span>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1d6a8a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 0 0 12 0C18 10.2 15.5 7 12 2.5z" />
      </svg>
      <span className="font-semibold">ÁguaPrajá</span>
    </footer>
  );
}
