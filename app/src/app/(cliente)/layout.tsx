import NavCliente from "@/components/NavCliente";
import { SeloAguaPraja } from "@/components/marca";
import { marcaAtual } from "@/lib/marca";

export default async function LayoutCliente({ children }: { children: React.ReactNode }) {
  const m = await marcaAtual();
  return (
    <>
      <div className="com-menu">
        {children}
        {/* No app da loja, a marca ÁguaPrajá aparece só aqui, bem discreta. */}
        {m && <SeloAguaPraja comFolgaDoMenu />}
      </div>
      <NavCliente />
    </>
  );
}
