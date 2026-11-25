import { expect, test } from "@playwright/test";
import { ALERTA, entrar, SENHA, semServicosExternos, TEL } from "./ajuda";

/**
 * 05 · Login e segurança
 * Senha errada, bloqueio após 5 tentativas, recuperação por código e por link do admin,
 * e cada tipo de usuário só acessa a própria área.
 */
async function tentarSenha(page: import("@playwright/test").Page, telefone: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("Seu celular").fill(telefone);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test.describe.serial("Login e segurança", () => {
  test("senha curta e senhas diferentes são recusadas na criação", async ({ page }) => {
    await semServicosExternos(page);
    await page.goto("/entrar");
    await page.getByLabel("Seu celular").fill(TEL.bloqueio);
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Crie uma senha (mínimo 6)").fill("123");
    await page.getByLabel("Repita a senha").fill("123");
    // O navegador barra (minLength); força o envio para ver a regra do servidor também.
    await page.locator("form").evaluate((f: HTMLFormElement) => f.setAttribute("novalidate", ""));
    await page.getByRole("button", { name: "Criar conta e entrar" }).click();
    await expect(page.locator(ALERTA)).toBeVisible();

    await page.getByLabel("Crie uma senha (mínimo 6)").fill("abcdef12");
    await page.getByLabel("Repita a senha").fill("abcdef99");
    await page.getByRole("button", { name: "Criar conta e entrar" }).click();
    await expect(page.locator(ALERTA)).toContainText(/iguais|não conferem|diferentes/i);
  });

  test("celular inválido é recusado", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByLabel("Seu celular").fill("123");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.locator(ALERTA)).toContainText("DDD");
  });

  test("senha errada avisa; 5 erros bloqueiam por 15 minutos", async ({ page, context }) => {
    await entrar(page, TEL.bloqueio);
    await context.clearCookies();
    await tentarSenha(page, TEL.bloqueio, "errada-1");
    await expect(page.locator(ALERTA)).toBeVisible();
    for (let i = 2; i <= 5; i++) await tentarSenha(page, TEL.bloqueio, `errada-${i}`);
    // Mesmo com a senha certa, segue bloqueado.
    await tentarSenha(page, TEL.bloqueio, SENHA);
    await expect(page.locator(ALERTA)).toContainText(/bloque|15 min|minutos/i);
  });

  test("esqueci a senha: código (modo de teste na tela) e senha nova", async ({ page }) => {
    await semServicosExternos(page);
    await page.goto("/entrar");
    await page.getByLabel("Seu celular").fill(TEL.cliente2);
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Crie uma senha (mínimo 6)").fill(SENHA);
    await page.getByLabel("Repita a senha").fill(SENHA);
    await page.getByRole("button", { name: "Criar conta e entrar" }).click();
    await expect(page).toHaveURL(/\/cadastro/);
    await page.context().clearCookies();

    await page.goto("/entrar");
    await page.getByLabel("Seu celular").fill(TEL.cliente2);
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: /Esqueci a senha/ }).click();
    const codigo = await page.locator(".aviso-info b").innerText();
    expect(codigo).toMatch(/^\d{6}$/);
    await page.getByLabel("Código").fill(codigo);
    await page.getByLabel("Senha nova (mínimo 6)").fill("nova-senha-456");
    await page.getByLabel("Repita a senha nova").fill("nova-senha-456");
    await page.getByRole("button", { name: "Salvar senha e entrar" }).click();
    await expect(page).not.toHaveURL(/\/entrar/);

    await page.context().clearCookies();
    await entrar(page, TEL.cliente2, { senha: "nova-senha-456" });
  });

  test("admin gera link de senha nova para um usuário", async ({ page, browser }) => {
    await entrar(page, TEL.admin);
    await page.goto("/admin/usuarios");
    await page.getByText("Alguém esqueceu a senha?").click();
    await page.getByLabel("Celular da pessoa").fill(TEL.cliente2);
    await page.getByRole("button", { name: "Gerar link para nova senha" }).click();
    const campoLink = page.locator("input[readonly][value*='/entrar/nova-senha']");
    await expect(campoLink).toBeVisible();
    const url = (await campoLink.inputValue()).replace(/^https?:\/\/[^/]+/, "");
    expect(url).toContain(`tel=${TEL.cliente2}`);
    // Atalho para mandar pelo WhatsApp da pessoa.
    await expect(page.getByRole("link", { name: /WhatsApp/ }).first()).toHaveAttribute("href", /wa\.me/);

    const usarLink = async (senha: string) => {
      const p = await browser.newPage();
      await p.goto(url);
      await p.getByLabel("Senha nova (mínimo 6)").fill(senha);
      await p.getByLabel("Repita a senha nova").fill(senha);
      await p.getByRole("button", { name: "Salvar senha e entrar" }).click();
      return p;
    };
    const primeira = await usarLink("pelo-link-789");
    await expect(primeira).not.toHaveURL(/nova-senha/);
    await primeira.close();

    // O link é de uso único.
    const segunda = await usarLink("outra-vez-000");
    await expect(segunda.locator(ALERTA)).toBeVisible();
    await segunda.close();
  });

  test("cada um na sua área: cliente não abre admin nem loja; loja não abre admin", async ({ page, context }) => {
    await entrar(page, TEL.cliente);
    for (const rota of ["/admin", "/admin/lojas", "/loja", "/loja/produtos"]) {
      await page.goto(rota);
      await expect(page, `cliente não deveria ficar em ${rota}`).not.toHaveURL(new RegExp(`${rota}$`));
    }
    await context.clearCookies();
    await entrar(page, TEL.loja);
    for (const rota of ["/admin", "/admin/cidades"]) {
      await page.goto(rota);
      await expect(page, `loja não deveria ficar em ${rota}`).not.toHaveURL(new RegExp(`${rota}$`));
    }
  });

  test("Sair encerra a sessão", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/inicio");
    await page.getByRole("button", { name: "Sair" }).click();
    // Sair volta para o site; só então tenta abrir de novo a área do cliente.
    await expect(page).not.toHaveURL(/\/inicio/);
    await page.goto("/inicio");
    await expect(page).toHaveURL(/\/entrar/);
  });
});
