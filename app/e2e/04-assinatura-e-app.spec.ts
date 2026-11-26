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

    await page.goto(`/lojas/${ler("lojaId")}`);
    await expect(page.getByText("Seu plano mensal é com esta distribuidora.")).toBeVisible();
  });

  test("não dá para ter dois planos ao mesmo tempo", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto(`/lojas/${ler("lojaId")}`);
    // Os planos levam para "Meu plano" em vez de assinar de novo.
    await expect(page.getByRole("link", { name: /galões\/mês/ }).first()).toHaveAttribute("href", "/assinatura");
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

    const anonimo = await browser.newPage();
    await anonimo.goto(`/l/${ler("slug")}`);
    await expect(anonimo).not.toHaveURL(new RegExp(`/l/${ler("slug")}`));
    await anonimo.close();

    // Volta para o Completo (os próximos testes dependem).
    await cartao.getByRole("button", { name: "Editar plano" }).click();
    await escolherOpcao(cartao.locator("select[name=planoId]"), /^Completo/);
    await cartao.getByRole("button", { name: "Salvar" }).click();
    await expect(cartao.getByText(/Salvo|salvo/)).toBeVisible();
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
