import { expect, test } from "@playwright/test";
import { escolherOpcao, ALERTA, entrar, ler, LOJA, TEL } from "./ajuda";

/**
 * 04 · Plano mensal e app próprio
 * O cliente assina com UMA distribuidora (e pode cancelar); avulso continua livre em qualquer uma.
 * O site próprio da loja (/l/<slug>) existe só no plano Completo.
 */
test.describe.serial("Plano mensal e app próprio", () => {
  test("cliente assina um plano mensal escolhendo dia e horário", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto(`/lojas/${ler("lojaId")}`);
    await expect(page.getByRole("heading", { name: "Planos mensais" })).toBeVisible();
    await page.getByRole("link", { name: /galões\/mês/ }).first().click();
    await expect(page).toHaveURL(/\/assinar\//);
    // Sem aceitar o resumo (frequência, dia, horário), o botão fica travado.
    const assinar = page.getByRole("button", { name: /Assinar por R\$/ });
    await expect(assinar).toBeDisabled();
    await page.locator("input[name=aceite]").check();
    await assinar.click();
    await expect(page).toHaveURL(/\/assinatura\?nova=1/);
  });

  test("com plano: Início, Catálogo e página da loja mostram onde é o plano", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/inicio");
    await expect(page.getByRole("link", { name: /Gerenciar: mudar horário/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Outras distribuidoras/ })).toBeVisible();

    await page.goto("/catalogo");
    await expect(page.getByText(`Seu plano mensal é com a ${LOJA.nome}`)).toBeVisible();
    const loja = page.locator("section", { hasText: LOJA.nome });
    await expect(loja.getByText("Seu plano")).toBeVisible();
    // Na loja do plano, o pedido vira compra adicional (galão pelo preço do plano).
    await expect(loja.getByRole("link", { name: "Compra adicional" })).toHaveAttribute("href", /assinatura=/);

    // Página da loja: mostra o plano dele, não a lista de planos para assinar.
    await page.goto(`/lojas/${ler("lojaId")}`);
    await expect(page.getByRole("link", { name: /Seu plano.*galões\/mês/ })).toHaveAttribute("href", "/assinatura");
    await expect(page.getByRole("heading", { name: "Planos mensais" })).toHaveCount(0);
    await expect(page.getByText("Sugerido")).toHaveCount(0);
  });

  test("assinante não recebe sugestão de planos: nem na loja, nem no site dela, nem no simulador", async ({ page }) => {
    await entrar(page, TEL.cliente);
    // Não dá para assinar de novo (o link direto também não oferece).
    await page.goto(`/lojas/${ler("lojaId")}`);
    await expect(page.locator(`a[href^="/assinar/"]`)).toHaveCount(0);

    // Simulador → distribuidoras: mostra o plano dele, sem "Plano para sua família" nas lojas.
    // (Antes do site da loja: abrir o site liga o modo "app próprio", que vai direto para a loja.)
    await page.goto("/lojas");
    if (page.url().includes("/simulador")) {
      await page.getByRole("button", { name: /Ver distribuidoras/ }).click();
    }
    await expect(page).toHaveURL(/\/lojas$/);
    await expect(page.getByRole("link", { name: /Seu plano · .*galões\/mês/ })).toBeVisible();
    await expect(page.getByText("Plano para sua família")).toHaveCount(0);

    // Site próprio da loja (logado): "Seu plano" e compra adicional, sem "Assinar um plano".
    await page.goto(`/l/${ler("slug")}`);
    await expect(page.getByRole("link", { name: /Seu plano.*Gerenciar meu plano/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Compra adicional (galão extra ou bebidas)" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Assinar um plano" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Planos mensais" })).toHaveCount(0);
    // A compra adicional sai pelo preço do plano.
    await page.getByRole("link", { name: "Compra adicional (galão extra ou bebidas)" }).click();
    await expect(page).toHaveURL(/\/pedir\/[0-9a-f-]{36}\?assinatura=/);
    await expect(page.getByText("preço do seu plano")).toBeVisible();
  });

  test("cliente cancela o plano (com confirmação)", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/assinatura");
    await page.getByText("Cancelar plano", { exact: true }).first().click();
    await page.getByRole("button", { name: "Cancelar plano" }).click();
    await expect(page.locator(ALERTA)).toContainText("Marque a confirmação");
    await page.locator("label", { hasText: "Quero cancelar meu plano." }).locator("input").check();
    await page.getByRole("button", { name: "Cancelar plano" }).click();
    await expect(page.getByText(/cancelad/i).first()).toBeVisible();
  });

  test("loja vê o assinante na agenda (entregas do plano)", async ({ page }) => {
    await entrar(page, TEL.loja);
    await page.goto("/loja/planos");
    await expect(page.getByText(/assinante/i).first()).toBeVisible();
  });

  test("site próprio da loja (plano Completo) abre com os produtos e o botão de instalar", async ({ page }) => {
    await page.goto(`/l/${ler("slug")}`);
    await expect(page.getByText(LOJA.nome).first()).toBeVisible();
    await expect(page.getByText("Refrigerante 2 L vidro")).toBeVisible();
    // Sem o pedido automático do navegador, o botão mostra o passo a passo do aparelho (aqui, Android).
    const instalar = page.getByRole("button", { name: /Instalar o app .* no celular/ });
    await expect(instalar).toBeVisible();
    await instalar.click();
    await expect(page.getByText(/Instalar app/).first()).toBeVisible();
    const manifesto = await page.request.get(`/l/${ler("slug")}/manifest.webmanifest`);
    expect(manifesto.status()).toBe(200);
  });

  test("sem o plano Completo, o site próprio fica fechado para o público", async ({ page, browser }) => {
    // Admin tira o plano da loja.
    await entrar(page, TEL.admin);
    await page.goto("/admin/lojas");
    const cartao = page.locator("article", { hasText: LOJA.nome });
    await cartao.getByRole("button", { name: "Editar plano" }).click();
    await escolherOpcao(cartao.locator("select[name=planoId]"), /^Essencial/);
    await cartao.getByRole("button", { name: "Salvar" }).click();
    await expect(cartao.getByText(/Salvo|salvo/)).toBeVisible();

    // O cartão mostra que o app próprio desligou.
    await expect(cartao.getByText("App próprio:")).toBeVisible();
    await expect(cartao.locator(".selo", { hasText: "desligado" })).toBeVisible();

    const anonimo = await browser.newPage();
    await anonimo.goto(`/l/${ler("slug")}`);
    await expect(anonimo).not.toHaveURL(new RegExp(`/l/${ler("slug")}`));
    await anonimo.close();

    // Um toque: volta para o Completo por 30 dias (os próximos testes dependem).
    await cartao.getByRole("button", { name: "Ativar Completo por 30 dias (com app próprio)" }).click();
    await expect(cartao.locator(".selo", { hasText: "ligado" })).toBeVisible();
    await expect(cartao.getByRole("link", { name: `/l/${ler("slug")}` })).toBeVisible();
    // O botão do plano atual some (para estender, é o "Recebi a mensalidade").
    await expect(cartao.getByRole("button", { name: /Ativar Completo/ })).toHaveCount(0);
  });

  test("com app próprio: a loja vê 'Seu app está no ar' e o cliente vê o convite para instalar", async ({ page, context }) => {
    await entrar(page, TEL.loja);
    await page.goto("/loja/marca");
    await expect(page.getByText("✓ Seu app está no ar (plano Completo)")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir meu app" })).toHaveAttribute("href", `/l/${ler("slug")}`);

    // QR code do app: na tela, para baixar (PNG) e no cartaz para imprimir.
    await expect(page.getByRole("img", { name: /QR code do app/ })).toBeVisible();
    const png = await page.request.get("/loja/marca/qr");
    expect(png.status()).toBe(200);
    expect(png.headers()["content-type"]).toBe("image/png");
    await page.goto("/loja/marca/cartaz");
    await expect(page.getByRole("heading", { name: LOJA.nome })).toBeVisible();
    await expect(page.getByText("Peça água e bebidas pelo nosso app")).toBeVisible();
    await expect(page.getByRole("img", { name: /QR code do app/ }).locator("svg")).toBeVisible();
    await expect(page.getByText(new RegExp(`/l/${ler("slug")}$`))).toBeVisible();
    await expect(page.getByRole("button", { name: "Imprimir" })).toBeVisible();

    await context.clearCookies();
    await entrar(page, TEL.cliente);
    await page.goto(`/lojas/${ler("lojaId")}`);
    await expect(page.getByText(`${LOJA.nome} tem app próprio`)).toBeVisible();
    await expect(page.getByRole("link", { name: /tem app próprio/ })).toHaveAttribute("href", `/l/${ler("slug")}`);
  });

  test("admin dá desconto e período grátis na mensalidade; a loja vê em Meu plano", async ({ page, browser }) => {
    await entrar(page, TEL.admin);
    await page.goto("/admin/lojas");
    const cartao = page.locator("article", { hasText: LOJA.nome });
    await cartao.getByText(/Desconto ou período grátis/).click();
    await cartao.getByLabel("Desconto (%)").fill("50");
    await expect(cartao.getByText(/Mensalidade: .*R\$\s49,95/)).toBeVisible();
    await cartao.getByRole("button", { name: "Salvar benefício" }).click();
    await expect(cartao.getByRole("status").filter({ hasText: "desconto de 50%" })).toBeVisible();
    await expect(cartao.getByText(/−50% · R\$\s49,95\/mês/)).toBeVisible();

    const loja = await browser.newPage();
    await entrar(loja, TEL.loja);
    await loja.goto("/loja/plano");
    await expect(loja.getByText("−50%")).toBeVisible();
    await expect(loja.getByText(/Sua mensalidade: R\$\s99,90 R\$\s49,95/)).toBeVisible();

    // Período grátis.
    const daqui10 = new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10);
    await cartao.getByLabel("Não cobrar até (grátis)").fill(daqui10);
    await cartao.getByRole("button", { name: "Salvar benefício" }).click();
    await expect(cartao.getByText(/Grátis até/).first()).toBeVisible();
    await loja.reload();
    await expect(loja.getByText("Cortesia do ÁguaPrajá")).toBeVisible();

    // Data no passado é recusada.
    await cartao.getByLabel("Não cobrar até (grátis)").fill("2020-01-01");
    await cartao.getByRole("button", { name: "Salvar benefício" }).click();
    await expect(cartao.locator(ALERTA)).toContainText("já passou");

    // Tira tudo: volta ao normal.
    await cartao.getByLabel("Desconto (%)").fill("");
    await cartao.getByLabel("Não cobrar até (grátis)").fill("");
    await cartao.getByRole("button", { name: "Salvar benefício" }).click();
    await expect(cartao.getByRole("status").filter({ hasText: "Benefícios removidos" })).toBeVisible();
    await loja.reload();
    await expect(loja.getByText("Cortesia do ÁguaPrajá")).toHaveCount(0);
    await loja.close();
  });
});
