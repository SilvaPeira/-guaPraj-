import Link from "next/link";
import type { ReactNode } from "react";

export function IconeGota({ tamanho = 24, cor = "#7fc8e3" }: { tamanho?: number; cor?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 0 0 12 0C18 10.2 15.5 7 12 2.5z" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-titulo text-[22px] font-extrabold">
      <IconeGota tamanho={28} />
      ÁguaPrajá
    </span>
  );
}

/** Barra superior das telas internas (botão voltar + título). */
export function Topo({ titulo, subtitulo, voltar, acao }: { titulo: string; subtitulo?: string; voltar?: string; acao?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 pt-4">
      {voltar && (
        <Link href={voltar} aria-label="Voltar" className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-borda bg-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {subtitulo && <p className="truncate text-sm text-tinta-suave">{subtitulo}</p>}
        <h1 className="truncate text-xl font-bold">{titulo}</h1>
      </div>
      {acao}
    </header>
  );
}

/** Cabeçalho verde-floresta usado nas telas de entrada. */
export function Hero({ children }: { children: ReactNode }) {
  return (
    <header className="bg-floresta pb-16 pt-5 text-white">
      <div className="mx-auto max-w-xl px-4">{children}</div>
    </header>
  );
}

export function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="campo">
      {rotulo}
      {children}
      {dica && <span className="text-xs font-normal text-tinta-suave">{dica}</span>}
    </label>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="cartao py-8 text-center text-tinta-suave">{children}</div>;
}
