import { expect, test } from "@playwright/test";
import { entrar, TEL } from "./ajuda";

/**
 * 06 · Avisos (sem WhatsApp)
 * Cada mudança de pedido vira um aviso no app (/avisos) para o cliente ou para a loja,
 * e vai como notificação para os aparelhos que ligaram os avisos.
 * Usa os pedidos criados nos arquivos 03 e 04.
 */
test.describe.serial("Avisos no app", () => {
  test("loja: cada pedido novo e o pagamento online viram aviso", async ({ page }) => {
    await entrar(page, TEL.loja);
    await expect(page.getByRole("link", { name: /Avisos: \d+ novos?/ })).toBeVisible();
    await page.getByRole("link", { name: /Avisos/ }).click();
    await expect(page).toHaveURL(/\/avisos$/);
    await expect(page.getByText(/Novo pedido #\d+/).first()).toBeVisible();
    await expect(page.getByText(/Maria Teste pediu para/).first()).toBeVisible();
    await expect(page.getByText(/Pago pelo app \(Pix/).first()).toBeVisible();
    // Tocar no aviso leva para a agenda do dia.
    await expect(page.getByRole("link", { name: /Novo pedido/ }).first()).toHaveAttribute("href", /^\/loja\?data=\d{4}-\d{2}-\d{2}$/);
  });

  test("cliente: confirmação, saída e entrega viram aviso com link para o pedido", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/inicio");
    await expect(page.getByRole("link", { name: /Avisos: \d+ novos?/ })).toBeVisible();
    await page.goto("/avisos");
    await expect(page.getByText(/seu pedido #\d+ está confirmado/).first()).toBeVisible();
    await expect(page.getByText(/saiu para entrega/).first()).toBeVisible();
    await expect(page.getByText(/entregue\. Como foi\? Avalie em 1 toque\./).first()).toBeVisible();
    await expect(page.getByText(/Recebemos o pagamento do pedido/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /está confirmado/ }).first()).toHaveAttribute("href", /^\/pedidos\/[0-9a-f-]{36}$/);
  });

  test("abrir os avisos marca tudo como visto (sininho zera)", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/inicio");
    await expect(page.getByRole("link", { name: "Avisos", exact: true })).toBeVisible();
  });

  test("convite para ligar os avisos no aparelho aparece no Início e na Agenda", async ({ page, context }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/inicio");
    await expect(page.getByText("Receber avisos neste aparelho")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ligar avisos" })).toBeVisible();
    await context.clearCookies();
    await entrar(page, TEL.loja);
    await expect(page.getByText(/Pedido novo, pagamento recebido/)).toBeVisible();
  });

  test("inscrição de aparelho: exige login e valida os dados", async ({ page, request }) => {
    const anonimo = await request.post("/api/push", { data: { endpoint: "https://exemplo.invalid/x", keys: { p256dh: "a", auth: "b" } } });
    expect(anonimo.status()).toBe(401);

    await entrar(page, TEL.cliente);
    const api = page.request;
    expect((await api.post("/api/push", { data: { endpoint: "http://inseguro/x" } })).status()).toBe(400);
    const ok = await api.post("/api/push", { data: { endpoint: "https://push.exemplo.invalid/e2e", keys: { p256dh: "BExemplo", auth: "segredo" } } });
    expect(ok.status()).toBe(200);
    // Repetir não duplica; desligar remove.
    expect((await api.post("/api/push", { data: { endpoint: "https://push.exemplo.invalid/e2e", keys: { p256dh: "BExemplo", auth: "segredo" } } })).status()).toBe(200);
    expect((await api.delete("/api/push", { data: { endpoint: "https://push.exemplo.invalid/e2e" } })).status()).toBe(200);
  });
});
