"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/loja", rotulo: "Agenda", d: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" },
  { href: "/loja/produtos", rotulo: "Catálogo", d: "M3 9l1-5h16l1 5M3 9h18v11H3zM9 20v-6h6v6" },
  { href: "/loja/planos", rotulo: "Planos", d: "M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 0 0 12 0C18 10.2 15.5 7 12 2.5z" },
  { href: "/loja/ajustes", rotulo: "Ajustes", d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5L7 17M17 17l1.5 1.5M5.5 5.5L7 7" },
];

export default function NavLoja() {
  const atual = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-borda bg-white" aria-label="Menu da loja">
      <ul className="mx-auto grid h-[70px] max-w-xl grid-cols-4">
        {ITENS.map((i) => {
          const ativo = i.href === "/loja" ? atual === "/loja" : atual.startsWith(i.href);
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
