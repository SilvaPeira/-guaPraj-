import { expect, test, type Page } from "@playwright/test";
import { horarioAmanha, preencherEndereco, ALERTA, entrar, guardar, ler, LOJA, TEL } from "./ajuda";

/**
 * 03 · Cliente: cadastro, catálogo, pedido avulso e entrega
 * Ponta a ponta: o cliente acha a loja no Catálogo, pede bebida retornável + galão,
 * a loja confirma e entrega (faltou casco: cobra a diferença), o cliente vê e avalia.
 * Depois, um pedido pago online (Pix simulado).
 */

/** Cadastro do cliente (nome + endereço em Canaã, no mesmo ponto do mapa da loja). */
async function cadastrarCliente(page: Page, telefone: string, nome: string) {
  await entrar(page, telefone);
  await expect(page).toHaveURL(/\/cadastro/);
  await page.getByLabel("Seu nome").fill(nome);
  await preencherEndereco(page, { bairro: "Centro", rua: "Rua das Flores", numero: "45", referencia: "portão azul" });
  await page.locator("label", { hasText: "Li e aceito" }).locator("input").check();
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

test.describe.serial("Cliente: pedido avulso e entrega", () => {
  test("cadastro do cliente: termos obrigatórios e cidade da lista", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await expect(page).toHaveURL(/\/cadastro/);
    await page.getByLabel("Seu nome").fill("Maria Teste");
    await preencherEndereco(page, { bairro: "Centro", rua: "Rua das Flores" });
    // Sem aceitar os termos, não passa.
    await page.getByRole("button", { name: "Salvar e continuar" }).click();
    await expect(page.locator(ALERTA)).toContainText("termos");
  });

  test("cadastro completo leva ao Início (cidade sem 'PA' fixo)", async ({ page }) => {
    await cadastrarCliente(page, TEL.cliente, "Maria Teste");
    await expect(page.getByRole("heading", { name: "Olá, Maria!" })).toBeVisible();
    await expect(page.getByText("Canaã dos Carajás · Centro")).toBeVisible();
    await expect(page.getByText("Você ainda não tem um plano")).toBeVisible();
    // Convite para instalar o app ÁguaPrajá (some quando já está instalado).
    await expect(page.getByRole("button", { name: "Instalar o app ÁguaPrajá no celular" })).toBeVisible();
    // Menu de baixo com as 4 abas.
    const menu = page.getByRole("navigation", { name: "Menu" });
    for (const aba of ["Início", "Catálogo", "Pedidos", "Conta"]) await expect(menu.getByRole("link", { name: aba })).toBeVisible();
  });

  test("Catálogo: loja aparece com produtos em foto, sem precisar do simulador", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Catálogo" }).click();
    await expect(page).toHaveURL(/\/catalogo$/);
    const loja = page.locator("section", { hasText: LOJA.nome });
    await expect(loja).toBeVisible();
    await expect(loja.getByText("entrega R$ 3,00")).toBeVisible();
    // Produtos da loja (o excluído não aparece; o em falta voltou).
    await expect(loja.getByText("Refrigerante 2 L vidro")).toBeVisible();
    await expect(loja.getByText("retornável R$ 9,00")).toBeVisible();
    await expect(loja.getByText("Gelo em cubos 5 kg")).toBeVisible();
    await expect(loja.getByText("Copo descartável")).toHaveCount(0);
    await expect(loja.getByRole("img", { name: "Refrigerante 2 L vidro" })).toBeVisible();
  });

  test("Catálogo: busca sem acento e filtro por categoria", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/catalogo");
    await page.getByRole("searchbox", { name: "Buscar produto" }).fill("agua");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText(/produto(s)? para “agua”/)).toBeVisible();
    await expect(page.locator("li").filter({ hasText: "Galão de água 20 L" }).first()).toBeVisible();

    await page.goto("/catalogo?q=coca");
    await expect(page.getByText(/1 produto para “coca”/)).toBeVisible();

    // Categorias do painel, separadas: Gelo de um lado, Polpas e açaí do outro.
    await page.goto("/catalogo");
    const categorias = page.getByRole("navigation", { name: "Categorias" });
    await expect(categorias.getByRole("link", { name: "Polpas e açaí" })).toBeVisible();
    await expect(categorias.getByRole("link", { name: "Cervejas" })).toBeVisible();
    await categorias.getByRole("link", { name: "Gelo", exact: true }).click();
    await expect(page).toHaveURL(/g=[0-9a-f-]{36}/);
    await expect(page.getByText("Gelo em cubos 5 kg")).toBeVisible();
    await expect(page.getByText("Polpa de acerola 1 kg")).toHaveCount(0);
    await expect(page.getByText("Refrigerante 2 L vidro")).toHaveCount(0);
    await categorias.getByRole("link", { name: "Polpas e açaí" }).click();
    await expect(page.getByText("Polpa de acerola 1 kg")).toBeVisible();
    await expect(page.getByText("Gelo em cubos 5 kg")).toHaveCount(0);
    // A busca também acha pelo nome da categoria.
    await page.goto("/catalogo?q=cervejas");
    await expect(page.getByText("Cerveja lata 350 ml")).toBeVisible();

    await page.goto("/catalogo?q=nada-disso-existe");
    await expect(page.getByText("Nada encontrado.")).toBeVisible();
  });

  test("pedido avulso: produto tocado entra no carrinho; retornável mostra o aviso do casco", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto("/catalogo");
    await page.locator("section", { hasText: LOJA.nome }).getByRole("link", { name: /Refrigerante 2 L vidro/ }).click();
    await expect(page).toHaveURL(/\/pedir\/[0-9a-f-]{36}\?item=/);
    guardar("lojaId", page.url().match(/pedir\/([0-9a-f-]{36})/)![1]);

    await horarioAmanha(page);
    // Pagamento: precisa escolher QUANDO e COMO antes de confirmar.
    const botao = page.getByRole("button", { name: /Escolha quando pagar|Escolha como pagar|Confirmar pedido|Ir para o pagamento/ });
    await expect(botao).toHaveText("Escolha quando pagar");
    await expect(botao).toBeDisabled();
    await page.locator("label", { hasText: "Na entrega" }).click();
    await expect(botao).toHaveText("Escolha como pagar");
    // Na entrega: dinheiro, Pix ou cartão (maquininha).
    const meios = page.getByRole("group", { name: "Como vai pagar?" });
    await expect(meios.locator("label")).toHaveText(["Dinheiro", "Pix", "Cartão"]);
    await meios.locator("label", { hasText: "Cartão" }).click();
    await expect(page.getByText(/Na maquininha da loja/)).toBeVisible();
    await meios.locator("label", { hasText: "Dinheiro" }).click();
    await expect(page.getByLabel(/Troco para quanto/)).toBeVisible();

    // Veio com 1 refrigerante e 0 galão.
    const refri = page.locator("li", { hasText: "Refrigerante 2 L vidro" });
    await expect(refri.locator("[aria-live=polite]")).toHaveText("1");
    const total = page.getByRole("button", { name: /Confirmar pedido|Ir para o pagamento/ });
    // R$ 14,00 + entrega R$ 3,00.
    await expect(total).toContainText("R$ 17,00");

    // Retornável: preço do líquido e aviso para entregar o casco vazio.
    await refri.getByText("Retornável · R$ 9,00").click();
    await expect(refri.getByText(/entregue 1 casco\(s\) vazio\(s\)/)).toBeVisible();
    await expect(refri.getByText(/Se não tiver o casco, você paga o preço normal \(R\$\s14,00 cada\)/)).toBeVisible();
    await refri.getByRole("button", { name: "Mais Refrigerante 2 L vidro" }).click();
    await expect(refri.getByText(/entregue 2 casco\(s\)/)).toBeVisible();
    // 2 × R$ 9,00 + R$ 3,00.
    await expect(total).toContainText("R$ 21,00");

    // + 1 galão (R$ 12,00), trocando o casco.
    await page.getByRole("button", { name: "Mais galões" }).click();
    await expect(page.getByText("Tenho casco para trocar")).toBeVisible();
    await expect(total).toContainText("R$ 33,00");

    // Bebida alcoólica exige confirmar 18+.
    const cerveja = page.locator("li", { hasText: "Cerveja lata 350 ml" });
    await cerveja.getByRole("button", { name: "Mais Cerveja lata 350 ml" }).click();
    await expect(total).toBeDisabled();
    await page.locator("label", { hasText: /18 anos/ }).locator("input").check();
    await expect(total).toBeEnabled();
    await cerveja.getByRole("button", { name: "Menos Cerveja lata 350 ml" }).click();

    // Entrega, pagando na entrega.
    await page.locator("label", { hasText: "Entregar em casa" }).click();
    await horarioAmanha(page);
    const data = await page.locator("input[name=data]:checked").getAttribute("value");
    guardar("dataPedido", data!);
    // Troco menor que o total é recusado (e nada do que foi escolhido se perde).
    await page.getByLabel(/Troco para quanto/).fill("20");
    await page.getByRole("button", { name: "Confirmar pedido · R$ 33,00" }).click();
    await expect(page.locator(ALERTA)).toContainText("O troco precisa ser para um valor maior que o total");
    await expect(refri.locator("[aria-live=polite]")).toHaveText("2");
    await page.getByLabel(/Troco para quanto/).fill("50");
    await page.getByRole("button", { name: "Confirmar pedido · R$ 33,00" }).click();

    await expect(page).toHaveURL(/\/pedidos\/[0-9a-f-]{36}\?novo=1/);
    guardar("pedidoId", page.url().match(/pedidos\/([0-9a-f-]{36})/)![1]);
    await expect(page.getByText("R$ 33,00").first()).toBeVisible();
    await expect(page.getByText(/casco/i).first()).toBeVisible();
  });

  test("horários de hoje: nada que já passou; 'o quanto antes' soma a taxa no total", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto(`/pedir/${ler("lojaId")}`);
    const hoje = page.locator("label.chip", { hasText: /^Hoje/ });
    test.skip((await hoje.count()) === 0, "a loja já não aceita pedido para hoje neste horário");
    const agora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Belem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    const [h, m] = agora.split(":").map(Number);
    const minimo = h * 60 + m + 30;
    // Períodos oferecidos hoje começam pelo menos 30 min à frente.
    const manhaTarde = page.locator("label", { hasText: "Manhã ou tarde" });
    if (await manhaTarde.count()) {
      await manhaTarde.click();
      for (const rot of await page.locator("label.chip", { hasText: /^(Manhã|Tarde) \(/ }).allInnerTexts()) {
        const [hi, mi] = rot.match(/\((\d\d):(\d\d)/)!.slice(1).map(Number);
        expect(hi * 60 + mi, `período ${rot} já passou`).toBeGreaterThanOrEqual(minimo);
      }
    }
    // Com a loja aberta, "o quanto antes" é oferecido e a taxa de R$ 2,00 aparece no total.
    const imediato = page.locator("label", { hasText: "O quanto antes" });
    if (await imediato.count()) {
      await imediato.click();
      await expect(page.getByText("Horário especial")).toBeVisible();
      await expect(page.getByText(/Taxa extra para esse horário: R\$\s2,00/)).toBeVisible();
    }
  });

  test("loja: confirma, sai para entrega e conclui faltando 1 casco de refrigerante", async ({ page }) => {
    await entrar(page, TEL.loja);
    await page.goto(`/loja?data=${ler("dataPedido")}`);
    const cartao = page.locator("article", { hasText: "Maria Teste" });
    await expect(cartao).toBeVisible();
    await expect(cartao.getByText("Bebida retornável: receber 2 casco(s)")).toBeVisible();
    await expect(cartao.getByText("Recolher 1 casco(s)")).toBeVisible();
    // A loja vê como o cliente vai pagar.
    await expect(cartao.getByText(/Receber R\$\s33,00 · Dinheiro, troco para R\$\s50,00/)).toBeVisible();

    await cartao.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(cartao.getByText("Confirmado")).toBeVisible();
    await cartao.getByRole("button", { name: "Saiu para entrega" }).click();
    await expect(cartao.getByRole("button", { name: "Entregue", exact: true })).toBeVisible();
    await cartao.getByRole("button", { name: "Entregue", exact: true }).click();

    // Cliente só tinha 1 dos 2 cascos: cobra R$ 5,00 a mais (14 − 9).
    const casco = cartao.getByLabel(/Cascos de Refrigerante 2 L vidro.* recebidos/);
    await expect(cartao.getByText(/cobre R\$\s5,00 a mais/)).toBeVisible();
    await casco.fill("1");
    await cartao.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(cartao.getByText("Entregue", { exact: true }).first()).toBeVisible();
    await expect(cartao.getByText(/R\$\s38,00/)).toBeVisible();
  });

  test("cliente: vê a cobrança do casco que faltou e avalia a entrega", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto(`/pedidos/${ler("pedidoId")}`);
    await expect(page.getByText("1× casco não entregue (Refrigerante 2 L vidro · Coca-Cola)")).toBeVisible();
    await expect(page.getByText("R$ 38,00").first()).toBeVisible();

    await page.getByRole("radio", { name: "5 estrelas" }).click();
    await page.getByRole("button", { name: "Enviar avaliação" }).click();
    await expect(page.getByText("Sua avaliação: ★★★★★")).toBeVisible();
  });

  test("Pedidos: lista mostra o pedido entregue", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Pedidos" }).click();
    await expect(page.getByText(LOJA.nome).first()).toBeVisible();
    await expect(page.getByText("Entregue").first()).toBeVisible();
  });

  test("pedido pago online (Pix simulado) chega pago para a loja", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto(`/pedir/${ler("lojaId")}`);
    // Começa com 2 galões (R$ 24,00) + entrega R$ 3,00.
    await horarioAmanha(page);
    await page.locator("label", { hasText: "Pelo app, agora" }).click();
    // Pelo app: só Pix ou cartão.
    await expect(page.getByRole("group", { name: "Como vai pagar?" }).locator("label")).toHaveText(["Pix", "Cartão"]);
    await page.getByRole("group", { name: "Como vai pagar?" }).locator("label", { hasText: "Pix" }).click();
    await page.getByRole("button", { name: "Ir para o pagamento · R$ 27,00" }).click();
    await expect(page).toHaveURL(/\/pagamento-simulado\//);
    await page.getByRole("button", { name: /Pix/ }).click();
    await expect(page).toHaveURL(/\/pedidos\/[0-9a-f-]{36}/);
    await expect(page.getByText(/Pago|pago/).first()).toBeVisible();
  });

  test("pagamento recusado: pedido fica aguardando e o cliente vê o aviso certo", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto(`/pedir/${ler("lojaId")}`);
    await horarioAmanha(page);
    await page.locator("label", { hasText: "Pelo app, agora" }).click();
    await page.getByRole("group", { name: "Como vai pagar?" }).locator("label", { hasText: "Cartão" }).click();
    await page.getByRole("button", { name: /Ir para o pagamento/ }).click();
    await page.getByRole("button", { name: /Recusar|recusado/i }).click();
    await expect(page.getByText(/não foi aprovado|recusad|falhou/i).first()).toBeVisible();
    await expect(page.getByText("estamos confirmando")).toHaveCount(0);
  });

  test("cliente cancela um pedido que ainda não saiu", async ({ page }) => {
    await entrar(page, TEL.cliente);
    await page.goto(`/pedir/${ler("lojaId")}`);
    await horarioAmanha(page);
    await page.locator("label", { hasText: "Na entrega" }).click();
    await page.getByRole("group", { name: "Como vai pagar?" }).locator("label", { hasText: "Pix" }).click();
    await expect(page.getByText(/Ao confirmar, mostramos a chave Pix da loja/)).toBeVisible();
    await page.getByRole("button", { name: /Confirmar pedido/ }).click();
    // O cliente vê o que escolheu.
    await expect(page.getByText("A pagar na entrega")).toBeVisible();
    // Pix na entrega: chave da loja e "Pix copia e cola" com o valor do pedido.
    const pix = page.locator("section", { hasText: "Pague com Pix" });
    await expect(pix).toBeVisible();
    await expect(pix.getByText("11.222.333/0001-81")).toBeVisible();
    await expect(pix.getByText("Distribuidora E2E Ltda", { exact: true })).toBeVisible();
    const total = (await pix.locator("h2 + b").innerText()).replace(/[^\d,]/g, "").replace(",", ".");
    const copiaECola = await pix.locator("p.font-mono").innerText();
    expect(copiaECola).toContain("0014br.gov.bcb.pix011411222333000181");
    expect(copiaECola).toContain(`54${String(total.length).padStart(2, "0")}${total}`);
    await expect(pix.getByRole("button", { name: "Copiar Pix copia e cola" })).toBeVisible();
    await expect(pix.getByRole("img", { name: /QR code do Pix/ })).toBeVisible();
    await expect(page).toHaveURL(/\/pedidos\//);
    await page.getByRole("button", { name: "Cancelar pedido" }).click();
    await expect(page.getByText(/Cancelado/).first()).toBeVisible();
  });
});
