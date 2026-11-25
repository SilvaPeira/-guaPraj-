import { expect, test } from "@playwright/test";
import { ALERTA, entrar, preencherEndereco, SENHA, TEL } from "./ajuda";

/**
 * 07 · Conta do cliente (LGPD)
 * Opções da conta e exclusão: com pedido em andamento não deixa; com senha errada não deixa;
 * depois de excluir, a sessão cai e o celular fica livre para uma conta nova.
 */
const NOVO = "94966660000";

test.describe.serial("Conta do cliente", () => {
  test("Conta mostra avisos, cadastro de loja e termos", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/cadastro");
    const opcoes = page.getByRole("navigation", { name: "Mais opções da conta" });
    await expect(opcoes.getByRole("link", { name: /Avisos e notificações/ })).toHaveAttribute("href", "/avisos");
    await expect(opcoes.getByRole("link", { name: /cadastrar minha loja/ })).toHaveAttribute("href", "/loja/cadastro");
    await expect(opcoes.getByRole("link", { name: /Termos de uso/ })).toHaveAttribute("href", "/termos");
  });

  test("com pedido em andamento, a exclusão é recusada e explica o porquê", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/cadastro");
    await page.getByText("Excluir minha conta", { exact: true }).click();
    await page.getByLabel("Sua senha").fill(SENHA);
    await page.locator("label", { hasText: "não pode ser desfeita" }).locator("input").check();
    await page.getByRole("button", { name: "Excluir minha conta definitivamente" }).click();
    await expect(page.locator(ALERTA)).toContainText(/pedido #\d+ em andamento/);
  });

  test("cliente sem pendências exclui a conta; a sessão cai e o celular fica livre", async ({ page, context }) => {
    // Conta nova, com cadastro completo.
    await entrar(page, NOVO);
    await page.getByLabel("Seu nome").fill("Pessoa Que Sai");
    await preencherEndereco(page, { bairro: "Centro", rua: "Rua do Teste" });
    await page.locator("label", { hasText: "Li e aceito" }).locator("input").check();
    await page.getByRole("button", { name: "Salvar e continuar" }).click();
    await expect(page).toHaveURL(/\/inicio/);

    await page.goto("/cadastro");
    await page.getByText("Excluir minha conta", { exact: true }).click();
    // Sem confirmar, não exclui.
    await page.getByLabel("Sua senha").fill(SENHA);
    await page.getByRole("button", { name: "Excluir minha conta definitivamente" }).click();
    await expect(page.locator(ALERTA)).toContainText("não dá para desfazer");
    // Senha errada, não exclui (e não apaga o que foi digitado).
    await page.locator("label", { hasText: "não pode ser desfeita" }).locator("input").check();
    await page.getByLabel("Sua senha").fill("senha-errada");
    await page.getByRole("button", { name: "Excluir minha conta definitivamente" }).click();
    await expect(page.locator(ALERTA)).toContainText("Senha errada");
    await expect(page.locator("label", { hasText: "não pode ser desfeita" }).locator("input")).toBeChecked();

    await page.getByLabel("Sua senha").fill(SENHA);
    await page.getByRole("button", { name: "Excluir minha conta definitivamente" }).click();
    await expect(page).toHaveURL(/\/conta-excluida$/);
    await expect(page.getByRole("heading", { name: "Sua conta foi excluída" })).toBeVisible();

    // A sessão não vale mais.
    await page.goto("/inicio");
    await expect(page).toHaveURL(/\/entrar/);

    // O mesmo celular cria uma conta nova do zero.
    await context.clearCookies();
    await page.goto("/entrar");
    await page.getByLabel("Seu celular").fill(NOVO);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByLabel("Crie uma senha (mínimo 6)")).toBeVisible();
  });

  test("admin → Erros do servidor abre (lista vazia ou agrupada)", async ({ page }) => {
    await entrar(page, TEL.admin);
    await page.goto("/admin/erros");
    await expect(page.getByRole("heading", { name: "Erros do servidor" })).toBeVisible();
    await expect(page.getByText("Nenhum erro registrado.").or(page.locator("article").first())).toBeVisible();
  });

  test("conta de loja não tem a exclusão pelo app (é pelo suporte)", async ({ page }) => {
    await entrar(page, TEL.loja);
    await page.goto("/cadastro");
    await expect(page.getByText("Excluir minha conta", { exact: true })).toHaveCount(0);
  });
});
