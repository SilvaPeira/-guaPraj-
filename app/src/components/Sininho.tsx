import Link from "next/link";

/** Sininho do topo: leva para /avisos e mostra quantos avisos ainda não foram vistos. */
export default function Sininho({ novos }: { novos: number }) {
  return (
    <Link
      href="/avisos"
      aria-label={novos ? `Avisos: ${novos} ${novos === 1 ? "novo" : "novos"}` : "Avisos"}
      className="relative flex size-11 items-center justify-center rounded-full text-hero-texto"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {novos > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-terra px-1 text-[11px] font-bold text-white" aria-hidden="true">
          {novos > 9 ? "9+" : novos}
        </span>
      )}
    </Link>
  );
}
