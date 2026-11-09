"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/inicio", rotulo: "Início", d: "M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", ativoEm: ["/inicio", "/assinatura", "/simulador", "/lojas", "/pedir", "/assinar"] },
  { href: "/pedidos", rotulo: "Pedidos", d: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11", ativoEm: ["/pedidos"] },
  { href: "/cadastro", rotulo: "Conta", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0", ativoEm: ["/cadastro"] },
];

export default function NavCliente() {
  const atual = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-borda bg-white" aria-label="Menu">
      <ul className="mx-auto grid h-[70px] max-w-xl grid-cols-3">
        {ITENS.map((i) => {
          const ativo = i.ativoEm.some((p) => atual.startsWith(p));
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold ${ativo ? "text-verde" : "text-tinta-suave"}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={i.d} />
                </svg>
                {i.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
