import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Conta excluída" };

export default function ContaExcluida() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="font-titulo text-2xl font-bold">Sua conta foi excluída</h1>
      <p className="text-tinta-suave">Apagamos os seus dados pessoais. Se quiser voltar, é só criar uma conta nova com o mesmo celular.</p>
      <Link href="/" className="botao">
        Ir para o início
      </Link>
    </main>
  );
}
