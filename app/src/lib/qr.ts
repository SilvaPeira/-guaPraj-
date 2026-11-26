import "server-only";
import QRCode from "qrcode";

/**
 * QR code do app da loja (para o cartaz na parede e o balcão).
 * Correção de erro "M": continua lendo mesmo com o papel um pouco amassado ou sujo.
 */
export async function qrSvg(texto: string, cor = "#0e3b2c"): Promise<string> {
  return QRCode.toString(texto, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: cor, light: "#ffffff" } });
}

export async function qrPng(texto: string, lado = 1024, cor = "#0e3b2c"): Promise<Buffer> {
  return QRCode.toBuffer(texto, { type: "png", errorCorrectionLevel: "M", margin: 2, width: lado, color: { dark: cor, light: "#ffffff" } });
}

/** Endereço público do app da loja. Usa o domínio oficial (APP_URL) para o QR funcionar em qualquer celular. */
export function linkDoApp(slug: string, base: string): string {
  const raiz = (process.env.APP_URL || base).replace(/\/$/, "");
  return `${raiz}/l/${slug}`;
}

/** águaprajá.tech/l/loja — como mostrar o endereço no cartaz (com acento, sem https). */
export { linkCurto as linkBonito } from "./dominio";
