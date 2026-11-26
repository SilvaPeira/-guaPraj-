"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/inicio", rotulo: "Início", d: "M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", ativoEm: ["/inicio", "/assinatura", "/simulador", "/assinar"] },
  { href: "/catalogo", rotulo: "Catálogo", d: "M3 7h18l-1.5 12a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2zM8 7a4 4 0 0 1 8 0", ativoEm: ["/catalogo", "/lojas", "/pedir"] },
  { href: "/pedidos", rotulo: "Pedidos", d: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11", ativoEm: ["/pedidos"] },
  { href: "/cadastro", rotulo: "Conta", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0", ativoEm: ["/cadastro"] },
];

export default function NavCliente() {
  const atual = usePathname();
  return (
    <nav className="menu-app" aria-label="Menu">
      <ul className="menu-app-lista grid-cols-4">
        <li className="menu-app-marca" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d6a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 0 0 12 0C18 10.2 15.5 7 12 2.5z" />
          </svg>
          ÁguaPrajá
        </li>
        {ITENS.map((i) => {
          const ativo = i.ativoEm.some((p) => atual.startsWith(p));
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
                {i.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
