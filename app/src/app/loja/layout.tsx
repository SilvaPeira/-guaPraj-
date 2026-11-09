import NavLoja from "@/components/NavLoja";
import { usuarioAtual } from "@/lib/sessao";

export default async function LayoutLoja({ children }: LayoutProps<"/loja">) {
  const u = await usuarioAtual();
  return (
    <>
      {children}
      {u?.papel === "loja" && <NavLoja />}
    </>
  );
}
