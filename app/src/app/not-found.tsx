import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="font-titulo text-2xl font-bold">Página não encontrada</h1>
      <p className="text-tinta-suave">O endereço pode ter mudado ou o link está incompleto.</p>
      <Link href="/" className="botao">
        Voltar para o início
      </Link>
    </main>
  );
}
