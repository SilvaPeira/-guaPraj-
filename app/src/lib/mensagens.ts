import "server-only";

// Envio de mensagens (WhatsApp/SMS). No MVP de desenvolvimento, só registra no
// console. Em produção, liga-se um provedor via WHATSAPP_PROVEDOR — ver README.

export type ResultadoEnvio = { ok: true; modo: "console" | "provedor" } | { ok: false; erro: string };

export async function enviarWhatsApp(telefone: string, texto: string): Promise<ResultadoEnvio> {
  const provedor = process.env.WHATSAPP_PROVEDOR;
  if (!provedor) {
    if (process.env.NODE_ENV === "production" && process.env.OTP_MODO_TESTE !== "1") {
      return { ok: false, erro: "Envio de mensagens ainda não configurado." };
    }
    console.info(`[whatsapp → ${telefone}] ${texto}`);
    return { ok: true, modo: "console" };
  }
  // Integração real entra na etapa de avisos (plano, etapa 7).
  return { ok: false, erro: `Provedor ${provedor} ainda não implementado.` };
}
