"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/admin", rotulo: "Início", d: "M3 11l9-8 9 8M5 10v10h14V10" },
  { href: "/admin/lojas", rotulo: "Lojas", d: "M3 9l1-5h16l1 5M3 9h18v11H3zM9 20v-6h6v6" },
  { href: "/admin/planos", rotulo: "Planos", d: "M4 4h16v16H4zM4 9h16M9 9v11" },
  { href: "/admin/ajustes", rotulo: "Ajustes", d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5L7 17M17 17l1.5 1.5M5.5 5.5L7 7", tambem: ["/admin/cidades", "/admin/categorias", "/admin/erros"] },
  { href: "/admin/usuarios", rotulo: "Usuários", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" },
  { href: "/admin/pedidos", rotulo: "Pedidos", d: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
];

export default function NavAdmin({ emAnalise = 0 }: { emAnalise?: number }) {
  const atual = usePathname();
  return (
    <nav className="menu-app" aria-label="Menu do admin">
      <ul className="menu-app-lista grid-cols-6">
        <li className="menu-app-marca" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d6a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 0 0 12 0C18 10.2 15.5 7 12 2.5z" />
          </svg>
          ÁguaPrajá
        </li>
        {ITENS.map((i) => {
          const ativo = i.href === "/admin" ? atual === "/admin" : atual.startsWith(i.href) || (("tambem" in i && i.tambem?.some((p) => atual.startsWith(p))) ?? false);
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
                  {i.href === "/admin/lojas" && emAnalise > 0 && (
                    <span className="menu-app-contador" aria-label={`${emAnalise} lojas em análise`}>
                      {emAnalise}
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
