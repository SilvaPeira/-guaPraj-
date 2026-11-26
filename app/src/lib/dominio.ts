/**
 * O domínio águaprajá.tech tem acentos; na internet ele é guardado no formato técnico
 * "xn--guapraj-gwah.tech" (punycode). Os navegadores e o WhatsApp aceitam os dois.
 * Para pessoas lerem (links copiados, mensagens, cartaz), mostramos sempre a forma com acento.
 */
const TECNICO = "xn--guapraj-gwah.tech";
const LEGIVEL = "águaprajá.tech";

/** "https://xn--guapraj-gwah.tech/l/loja" → "https://águaprajá.tech/l/loja" (o link continua funcionando). */
export function urlLegivel(url: string): string {
  return url.split(TECNICO).join(LEGIVEL);
}

/** "https://xn--guapraj-gwah.tech/l/loja" → "águaprajá.tech/l/loja" (para mostrar, sem o https). */
export function linkCurto(url: string): string {
  return urlLegivel(url).replace(/^https?:\/\//, "").replace(/\/$/, "");
}
