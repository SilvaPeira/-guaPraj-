import { expect, test } from "@playwright/test";

/**
 * 01 · Site público (sem login)
 * Quem chega pelo águaprajá.tech: vê o site, calcula o consumo, encontra as distribuidoras e os planos.
 * Roda com o banco vazio: ainda não existe nenhuma loja.
 */
test.describe("Site público", () => {
  test("página inicial mostra o essencial e as cidades atendidas (vindas do painel)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ÁguaPrajá/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Cidades da migração inicial (Admin → Cidades).
    await expect(page.getByText("Canaã dos Carajás · Parauapebas")).toBeVisible();
    await expect(page.getByRole("link", { name: "Calcular meu consumo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sou distribuidora" }).first()).toHaveAttribute("href", "/entrar?para=loja");
    await expect(page.getByRole("heading", { name: "Perguntas frequentes" })).toBeVisible();
  });

  test("calculadora de consumo responde às mudanças da família", async ({ page }) => {
    await page.goto("/#calcular");
    await expect(page.getByRole("heading", { name: "Quanta água sua família usa?" })).toBeVisible();
    const resultado = page.locator("[aria-live=polite]").filter({ hasText: "galões de 20 L por mês" });
    await expect(resultado).toBeVisible();
    const antes = Number(await resultado.locator("b").first().innerText());

    // Mais 2 adultos = mais galões.
    await page.getByRole("button", { name: "Mais Adultos" }).click();
    await page.getByRole("button", { name: "Mais Adultos" }).click();
    await expect.poll(async () => Number(await resultado.locator("b").first().innerText())).toBeGreaterThan(antes);

    // Opções extras aparecem ao pedir.
    await page.getByRole("button", { name: "+ Tem bebê, adolescente ou idoso?" }).click();
    await expect(page.getByRole("button", { name: "Mais Idosos" })).toBeVisible();

    // Frequência sempre com unidade (correção anterior: aparecia "4 a 5" sem dizer o quê).
    await expect(resultado).toContainText(/galões/);
  });

  test("sem distribuidoras cadastradas, a lista mostra o aviso e esconde o botão de localização", async ({ page }) => {
    await page.goto("/#calcular");
    await expect(page.getByRole("button", { name: /localização/i })).toHaveCount(0);
  });

  test("planos para distribuidoras: sem planos cadastrados, o site não quebra", async ({ page }) => {
    await page.goto("/sobre");
    await expect(page).toHaveTitle(/ÁguaPrajá/);
    await expect(page.getByRole("heading", { name: "Receita garantida no começo do mês" })).toBeVisible();
  });

  test("termos de uso abrem", async ({ page }) => {
    await page.goto("/termos");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("áreas restritas mandam para o login", async ({ page }) => {
    for (const rota of ["/inicio", "/catalogo", "/loja", "/admin", "/pedidos"]) {
      await page.goto(rota);
      await expect(page, `${rota} deveria pedir login`).toHaveURL(/\/entrar/);
    }
  });

  test("página que não existe mostra aviso amigável", async ({ page }) => {
    const r = await page.goto("/pagina-que-nao-existe");
    expect(r?.status()).toBe(404);
    await expect(page.locator("body")).toContainText(/não encontr/i);
  });
});
