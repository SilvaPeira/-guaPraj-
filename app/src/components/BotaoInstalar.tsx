"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const assinarNada = () => () => {};
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const jaInstalado = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** "Instalar app": no Android usa o pedido do Chrome; no iPhone mostra o passo a passo. */
export default function BotaoInstalar({ nome }: { nome: string }) {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ajudaIOS, setAjudaIOS] = useState(false);
  const ios = useSyncExternalStore(assinarNada, ehIOS, () => false);
  const instalado = useSyncExternalStore(assinarNada, jaInstalado, () => false);

  useEffect(() => {
    const pegar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", pegar);
    return () => window.removeEventListener("beforeinstallprompt", pegar);
  }, []);

  if (instalado || (!evento && !ios)) return null;

  return (
    <div className="pilha">
      <button
        type="button"
        className="botao-sec"
        onClick={async () => {
          if (evento) {
            await evento.prompt();
            setEvento(null);
          } else setAjudaIOS((v) => !v);
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        Instalar o app {nome} no celular
      </button>
      {ajudaIOS && (
        <ol className="aviso-info list-decimal pl-8 text-sm">
          <li>Toque no botão <b>Compartilhar</b> (o quadrado com a seta para cima) do Safari.</li>
          <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
          <li>Toque em <b>Adicionar</b>. O ícone da {nome} aparece junto dos seus apps.</li>
        </ol>
      )}
    </div>
  );
}
