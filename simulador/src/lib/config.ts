// Configurações públicas da página (podem ser trocadas por variáveis de ambiente).

export const CIDADE = "Canaã dos Carajás";

/** WhatsApp do ÁguaPrajá para contato (só dígitos, com 55 + DDD). Vazio = esconde o botão. */
export const WHATSAPP_CONTATO = process.env.NEXT_PUBLIC_WHATSAPP_CONTATO ?? "";

/** Endereço público da página, usado no botão "indicar um vizinho". */
export const URL_PUBLICA = process.env.NEXT_PUBLIC_URL_PUBLICA ?? "";
