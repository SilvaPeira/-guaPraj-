"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/loja", rotulo: "Agenda", d: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" },
  { href: "/loja/produtos", rotulo: "Catálogo", d: "M3 9l1-5h16l1 5M3 9h18v11H3zM9 20v-6h6v6" },
  { href: "/loja/planos", rotulo: "Planos", d: "M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 0 0 12 0C18 10.2 15.5 7 12 2.5z" },
  { href: "/loja/marca", rotulo: "Meu app", d: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2" },
  { href: "/loja/ajustes", rotulo: "Ajustes", d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5L7 17M17 17l1.5 1.5M5.5 5.5L7 7" },
];

export default function NavLoja({ aConfirmar = 0 }: { aConfirmar?: number }) {
  const atual = usePathname();
  return (
    <nav className="menu-app print:hidden" aria-label="Menu da loja">
      <ul className="menu-app-lista grid-cols-5">
        <li className="menu-app-marca" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d6a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 0 0 12 0C18 10.2 15.5 7 12 2.5z" />
          </svg>
          ÁguaPrajá
        </li>
        {ITENS.map((i) => {
          const ativo = i.href === "/loja" ? atual === "/loja" : atual.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={ativo ? "page" : undefined}
                className={`menu-app-item ${ativo ? "text-verde" : "text-tinta-suave"}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={i.d} />
                </svg>
                <span className="relative">
                  {i.rotulo}
                  {i.href === "/loja" && aConfirmar > 0 && (
                    <span className="menu-app-contador" aria-label={`${aConfirmar} pedidos a confirmar`}>
                      {aConfirmar > 99 ? "99+" : aConfirmar}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
