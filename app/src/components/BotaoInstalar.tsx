"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Aparelho = "ios" | "android" | "computador";

const assinarNada = () => () => {};
const aparelho = (): Aparelho => {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "computador";
};
const jaInstalado = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/**
 * "Instalar app" (PWA): sem Play Store nem App Store.
 * Se o navegador oferece a instalação (Chrome/Edge no Android e no Windows), abre direto.
 * Se não oferece (iPhone, Samsung Internet, Firefox, ou o Chrome ainda não liberou), mostra o passo a passo do aparelho.
 * Já instalado: some.
 */
export default function BotaoInstalar({ nome }: { nome: string }) {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ajuda, setAjuda] = useState(false);
  const tipo = useSyncExternalStore(assinarNada, aparelho, () => "computador" as Aparelho);
  const instalado = useSyncExternalStore(assinarNada, jaInstalado, () => false);

  useEffect(() => {
    const pegar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const instalou = () => setEvento(null);
    window.addEventListener("beforeinstallprompt", pegar);
    window.addEventListener("appinstalled", instalou);
    return () => {
      window.removeEventListener("beforeinstallprompt", pegar);
      window.removeEventListener("appinstalled", instalou);
    };
  }, []);

  if (instalado) return null;

  return (
    <div className="pilha">
      <button
        type="button"
        className="botao-sec"
        aria-expanded={evento ? undefined : ajuda}
        onClick={async () => {
          if (evento) {
            await evento.prompt();
            setEvento(null);
          } else setAjuda((v) => !v);
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        Instalar o app {nome} {tipo === "computador" ? "no computador" : "no celular"}
      </button>
      {ajuda && !evento && (
        <ol className="aviso-info list-decimal pl-8 text-sm">
          {tipo === "ios" && (
            <>
              <li>
                Abra esta página no <b>Safari</b>.
              </li>
              <li>
                Toque no botão <b>Compartilhar</b> (o quadrado com a seta para cima).
              </li>
              <li>
                Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.
              </li>
            </>
          )}
          {tipo === "android" && (
            <>
              <li>
                Toque no menu <b>⋮</b> do navegador (no canto de cima).
              </li>
              <li>
                Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.
              </li>
              <li>
                Confirme. O ícone da {nome} aparece junto dos seus apps.
              </li>
            </>
          )}
          {tipo === "computador" && (
            <>
              <li>
                No <b>Chrome</b> ou no <b>Edge</b>, clique no ícone de instalar no fim da barra de endereço (um monitor com seta).
              </li>
              <li>
                Ou abra o menu <b>⋮</b> / <b>…</b> e escolha <b>Instalar {nome}</b> (no Edge: <b>Aplicativos → Instalar este site como aplicativo</b>).
              </li>
              <li>O app abre em janela própria e fica no menu Iniciar.</li>
            </>
          )}
        </ol>
      )}
    </div>
  );
}
