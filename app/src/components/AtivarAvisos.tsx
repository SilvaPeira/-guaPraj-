"use client";

import { useEffect, useState } from "react";

type Situacao = "carregando" | "sem-suporte" | "iphone-instalar" | "bloqueado" | "ligado" | "desligado";

/** Chave pública VAPID (base64url) → bytes, como o PushManager pede. */
function chaveEmBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

async function lerSituacao(): Promise<Situacao> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return ehIphone() && !instalado() ? "iphone-instalar" : "sem-suporte";
  }
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  return inscricao ? "ligado" : "desligado";
}

/**
 * "Receber avisos neste aparelho": notificação de pedido confirmado, saiu para entrega, novo pedido (loja)…
 * Grátis, sem WhatsApp. No iPhone só funciona com o app instalado na tela de início.
 */
export default function AtivarAvisos({
  chavePublica,
  compacto = false,
  para = "cliente",
  soConvite = false,
}: {
  chavePublica: string | null;
  compacto?: boolean;
  para?: "cliente" | "loja";
  /** Só aparece enquanto os avisos estão desligados (para o Início não ficar poluído). */
  soConvite?: boolean;
}) {
  const [situacao, setSituacao] = useState<Situacao>("carregando");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    lerSituacao().then((s) => vivo && setSituacao(s));
    return () => {
      vivo = false;
    };
  }, []);

  if (!chavePublica || situacao === "carregando") return null;

  async function ligar() {
    setErro("");
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setSituacao(permissao === "denied" ? "bloqueado" : "desligado");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(chavePublica!) });
      const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inscricao.toJSON()) });
      if (!r.ok) throw new Error("servidor");
      setSituacao("ligado");
    } catch {
      setErro("Não deu para ligar os avisos agora. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const inscricao = await reg?.pushManager.getSubscription();
      if (inscricao) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: inscricao.endpoint }) });
        await inscricao.unsubscribe();
      }
      setSituacao("desligado");
    } finally {
      setOcupado(false);
    }
  }

  if (soConvite && situacao !== "desligado") return null;
  const caixa = compacto ? "pilha" : "cartao pilha";
  if (situacao === "ligado") {
    return (
      <div className={`${caixa} text-sm`}>
        <p>
          <b className="text-verde">✓ Avisos ligados neste aparelho.</b> Você recebe a notificação mesmo com o app fechado.
        </p>
        <button type="button" className="self-start text-sm font-semibold text-tinta-suave underline" onClick={desligar} disabled={ocupado}>
          Desligar avisos neste aparelho
        </button>
      </div>
    );
  }
  if (situacao === "bloqueado") {
    return (
      <p className={`${caixa} aviso-info text-sm`}>
        Os avisos estão bloqueados neste navegador. Para ligar, toque no cadeado ao lado do endereço do site → <b>Notificações</b> → <b>Permitir</b>.
      </p>
    );
  }
  if (situacao === "iphone-instalar") {
    return (
      <p className={`${caixa} aviso-info text-sm`}>
        No iPhone, os avisos chegam com o app instalado: no Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, abra pelo ícone e ligue os avisos aqui.
      </p>
    );
  }
  if (situacao === "sem-suporte") return null;
  return (
    <div className={caixa}>
      <div>
        <b className="block">Receber avisos neste aparelho</b>
        <span className="text-sm text-tinta-suave">
          {para === "loja"
            ? "Pedido novo, pagamento recebido e pedidos de amanhã para confirmar. Grátis, sem precisar de WhatsApp."
            : "Pedido confirmado, saiu para entrega, lembrete da véspera. Grátis, sem precisar de WhatsApp."}
        </span>
      </div>
      {erro && (
        <p role="alert" className="aviso-erro text-sm">
          {erro}
        </p>
      )}
      <button type="button" className="botao-peq self-start" onClick={ligar} disabled={ocupado}>
        {ocupado ? "Ligando…" : "Ligar avisos"}
      </button>
    </div>
  );
}
