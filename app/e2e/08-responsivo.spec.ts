import { expect, test, type Browser, type Page } from "@playwright/test";
import path from "node:path";
import { entrar, ler, TEL } from "./ajuda";

/**
 * 08 · Celular e computador
 * Cada tela principal, nos dois tamanhos: nada pode passar da largura da tela (sem rolagem
 * para o lado) e o menu fica embaixo no celular e na lateral no computador.
 * Salva uma foto de cada tela em e2e-resultados/telas/ para conferir o visual.
 */
const TAMANHOS = {
  celular: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  computador: {
    viewport: { width: 1366, height: 768 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  },
} as const;
type Tamanho = keyof typeof TAMANHOS;

const PASTA = path.join(__dirname, "..", "e2e-resultados", "telas");

async function contexto(browser: Browser, t: Tamanho) {
  return browser.newContext({ ...TAMANHOS[t], locale: "pt-BR", timezoneId: "America/Belem" });
}

/** Abre a tela, confere a largura e o menu, e tira a foto. */
async function conferir(page: Page, t: Tamanho, nome: string, rota: string, menu?: string) {
  await page.goto(rota);
  await page.waitForLoadState("networkidle").catch(() => {});
  const larguras = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, tela: window.innerWidth }));
  expect(larguras.pagina, `${nome} (${t}): conteúdo passa da largura da tela`).toBeLessThanOrEqual(larguras.tela + 1);
  if (menu) {
    const nav = page.getByRole("navigation", { name: menu, exact: true });
    await expect(nav, `${nome} (${t}): menu`).toBeVisible();
    const caixa = (await nav.boundingBox())!;
    if (t === "computador") {
      // Menu lateral: colado à esquerda, da altura da tela.
      expect(caixa.x, `${nome}: menu lateral à esquerda`).toBeLessThanOrEqual(1);
      expect(caixa.height, `${nome}: menu lateral na altura da tela`).toBeGreaterThan(600);
      expect(caixa.width, `${nome}: menu lateral estreito`).toBeLessThan(300);
    } else {
      // Menu embaixo, na largura toda.
      expect(caixa.y + caixa.height, `${nome}: menu embaixo`).toBeGreaterThan(TAMANHOS.celular.viewport.height - 2);
      expect(caixa.width).toBeGreaterThan(TAMANHOS.celular.viewport.width - 2);
    }
  }
  await page.screenshot({ path: path.join(PASTA, `${t}-${nome}.png`), fullPage: true });
}

for (const t of Object.keys(TAMANHOS) as Tamanho[]) {
  test.describe(`Telas no ${t}`, () => {
    test(`visitante (${t})`, async ({ browser }) => {
      const ctx = await contexto(browser, t);
      const page = await ctx.newPage();
      await conferir(page, t, "site", "/");
      await conferir(page, t, "entrar", "/entrar");
      await conferir(page, t, "site-da-loja", `/l/${ler("slug")}`);
      await ctx.close();
    });

    test(`cliente (${t})`, async ({ browser }) => {
      const ctx = await contexto(browser, t);
      const page = await ctx.newPage();
      await entrar(page, TEL.cliente);
      await conferir(page, t, "inicio", "/inicio", "Menu");
      // O botão de instalar fala do aparelho certo.
      await expect(page.getByRole("button", { name: `Instalar o app ÁguaPrajá no ${t === "computador" ? "computador" : "celular"}` })).toBeVisible();
      await conferir(page, t, "catalogo", "/catalogo", "Menu");
      await conferir(page, t, "catalogo-busca", "/catalogo?q=a", "Menu");
      await conferir(page, t, "loja", `/lojas/${ler("lojaId")}`, "Menu");
      await conferir(page, t, "pedir", `/pedir/${ler("lojaId")}`, "Menu");
      await conferir(page, t, "pedidos", "/pedidos", "Menu");
      await conferir(page, t, "pedido", `/pedidos/${ler("pedidoId")}`, "Menu");
      await conferir(page, t, "conta", "/cadastro", "Menu");
      await conferir(page, t, "avisos", "/avisos", "Menu");
      await ctx.close();
    });

    test(`distribuidora (${t})`, async ({ browser }) => {
      const ctx = await contexto(browser, t);
      const page = await ctx.newPage();
      await entrar(page, TEL.loja);
      await conferir(page, t, "loja-agenda", `/loja?data=${ler("dataPedido")}`, "Menu da loja");
      await conferir(page, t, "loja-catalogo", "/loja/produtos", "Menu da loja");
      await conferir(page, t, "loja-planos", "/loja/planos", "Menu da loja");
      await conferir(page, t, "loja-meu-app", "/loja/marca", "Menu da loja");
      await conferir(page, t, "loja-pagamentos", "/loja/pagamentos", "Menu da loja");
      await conferir(page, t, "loja-ajustes", "/loja/ajustes", "Menu da loja");
      await conferir(page, t, "loja-cartaz", "/loja/marca/cartaz");
      await ctx.close();
    });

    test(`admin (${t})`, async ({ browser }) => {
      const ctx = await contexto(browser, t);
      const page = await ctx.newPage();
      await entrar(page, TEL.admin);
      await conferir(page, t, "admin", "/admin", "Menu do admin");
      await conferir(page, t, "admin-lojas", "/admin/lojas", "Menu do admin");
      await conferir(page, t, "admin-planos", "/admin/planos", "Menu do admin");
      await conferir(page, t, "admin-categorias", "/admin/categorias", "Menu do admin");
      await conferir(page, t, "admin-usuarios", "/admin/usuarios", "Menu do admin");
      await ctx.close();
    });
  });
}
