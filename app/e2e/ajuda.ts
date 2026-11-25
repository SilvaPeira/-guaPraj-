import { expect, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Peças comuns dos testes ponta a ponta.
 * Os celulares são fictícios (não existem) e o banco é descartável: tudo some ao fim da execução.
 */
export const SENHA = "senha-e2e-123";

/** Mensagens de erro do app (role=alert), sem o anúncio de rota escondido do Next. */
export const ALERTA = "[role=alert]:not(#__next-route-announcer__)";

export const TEL = {
  admin: "94911110000", // está em ADMIN_TELEFONES no playwright.config.ts
  loja: "94922220000",
  cliente: "94933330000",
  cliente2: "94944440000",
  bloqueio: "94955550000",
} as const;

export const LOJA = { nome: "Distribuidora E2E", slug: "distribuidora-e2e" };

/** Foto de teste (PNG 1×1): passa pelo recorte e redução no navegador como uma foto real. */
export const FOTO_PNG = {
  name: "produto.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
};

/** Mapa e busca de endereço usam serviços externos: nos testes, ficam desligados (o clique no mapa continua funcionando). */
export async function semServicosExternos(page: Page) {
  await page.route(/tile\.openstreetmap\.org|nominatim\.openstreetmap\.org/, (r) => r.abort());
}

/**
 * Entra com celular e senha. Se o celular ainda não tem conta, cria (com a mesma senha).
 * `para: "loja"` = entrada pelo "Sou distribuidora".
 */
export async function entrar(page: Page, telefone: string, opcoes: { para?: "loja"; senha?: string } = {}) {
  const senha = opcoes.senha ?? SENHA;
  await semServicosExternos(page);
  await page.goto(opcoes.para ? `/entrar?para=${opcoes.para}` : "/entrar");
  await page.getByLabel("Seu celular").fill(telefone);
  await page.getByRole("button", { name: "Continuar" }).click();
  const criar = page.getByLabel("Crie uma senha (mínimo 6)");
  const entrarComSenha = page.getByLabel("Senha", { exact: true });
  await expect(criar.or(entrarComSenha)).toBeVisible();
  if (await criar.isVisible()) {
    await criar.fill(senha);
    await page.getByLabel("Repita a senha").fill(senha);
    await page.getByRole("button", { name: "Criar conta e entrar" }).click();
  } else {
    await entrarComSenha.fill(senha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }
  await expect(page).not.toHaveURL(/\/entrar/);
}

/** Marca o ponto no mapa (clique no mapa = pino ali). Dois cliques no mesmo lugar dão a mesma coordenada. */
export async function marcarNoMapa(page: Page, deslocamento = { x: 160, y: 130 }) {
  const mapa = page.locator(".leaflet-container").filter({ visible: true }).first();
  await expect(mapa).toBeVisible();
  // Espera o Leaflet montar o pino antes de clicar.
  await expect(mapa.locator(".leaflet-marker-icon")).toHaveCount(1);
  await mapa.click({ position: deslocamento });
}

/** Valor em reais como aparece na tela (R$ 12,00), para comparar textos. */
export const brl = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Guarda dados entre arquivos de teste (ex.: id da loja, data do pedido).
 * Fica em e2e-resultados/, que é apagado a cada execução.
 */
const ARQ_ESTADO = path.join(__dirname, "..", "e2e-resultados", "estado-e2e.json");
export function guardar(chave: string, valor: string) {
  const atual = lerTudo();
  atual[chave] = valor;
  fs.mkdirSync(path.dirname(ARQ_ESTADO), { recursive: true });
  fs.writeFileSync(ARQ_ESTADO, JSON.stringify(atual, null, 2));
}
export function ler(chave: string): string {
  const v = lerTudo()[chave];
  if (!v) throw new Error(`Estado "${chave}" não existe: rode os testes anteriores (npm run test:e2e roda todos em ordem).`);
  return v;
}
function lerTudo(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(ARQ_ESTADO, "utf8"));
  } catch {
    return {};
  }
}

/** Escolhe a opção de um <select> pelo texto (ex.: /Completo/), sem depender do espaço especial do "R$". */
export async function escolherOpcao(select: Locator, texto: RegExp) {
  const valor = await select.locator("option").filter({ hasText: texto }).first().getAttribute("value");
  await select.selectOption(valor ?? "");
}

/** Preenche os campos de endereço (cliente e loja) e marca o ponto no mapa. */
export async function preencherEndereco(
  page: Page,
  e: { cidade?: string; bairro: string; rua: string; numero?: string; referencia?: string },
) {
  await page.locator("select[name=cidade]").selectOption(e.cidade ?? "Canaã dos Carajás");
  await page.locator("input[name=bairro]").fill(e.bairro);
  await page.locator("input[name=logradouro]").fill(e.rua);
  if (e.numero) await page.locator("input[name=numero]").fill(e.numero);
  if (e.referencia) await page.locator("input[name=referencia]").fill(e.referencia);
  await marcarNoMapa(page);
}

/** Marca o pedido para amanhã, manhã ou tarde (sem taxa de horário especial e sem depender da hora do teste). */
export async function horarioAmanha(page: Page) {
  await page.locator("label.chip", { hasText: /^Amanhã/ }).click();
  await page.locator("label", { hasText: "Manhã ou tarde" }).click();
  await page.locator("label.chip", { hasText: /^Manhã \(/ }).click();
}
