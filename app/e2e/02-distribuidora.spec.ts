import { expect, test } from "@playwright/test";
import { escolherOpcao, ALERTA, entrar, FOTO_PNG, guardar, LOJA, marcarNoMapa, TEL } from "./ajuda";

/**
 * 02 · Admin e distribuidora
 * O admin prepara a plataforma (cidades e planos), a distribuidora se cadastra, o admin aprova,
 * e a loja monta planos mensais e catálogo (com foto, retornável, edição e exclusão).
 */
test.describe.serial("Admin e distribuidora", () => {
  test("admin: o celular de ADMIN_TELEFONES vira admin ao criar a conta", async ({ page }) => {
    await entrar(page, TEL.admin);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("navigation", { name: "Menu do admin" })).toBeVisible();
  });

  test("admin → Cidades: adicionar, desativar e excluir uma cidade", async ({ page, browser }) => {
    await entrar(page, TEL.admin);
    await page.goto("/admin/cidades");
    await expect(page.getByText("Canaã dos Carajás – PA")).toBeVisible();
    await expect(page.getByText("Parauapebas – PA")).toBeVisible();

    // Sem marcar o centro no mapa, não salva.
    const nova = page.locator("details", { hasText: "+ Nova cidade" });
    const abrirNova = () => nova.evaluate((d) => ((d as HTMLDetailsElement).open = true));
    await abrirNova();
    await nova.getByLabel("Cidade", { exact: true }).fill("Marabá");
    await nova.getByRole("button", { name: "Adicionar cidade" }).click();
    await expect(nova.locator(ALERTA)).toContainText("Marque o centro da cidade no mapa");

    await marcarNoMapa(page);
    await nova.getByRole("button", { name: "Adicionar cidade" }).click();
    await expect(page.getByText("Marabá – PA")).toBeVisible();

    // Nome repetido é recusado.
    await abrirNova();
    await nova.getByLabel("Cidade", { exact: true }).fill("Parauapebas");
    await marcarNoMapa(page);
    await nova.getByRole("button", { name: "Adicionar cidade" }).click();
    await expect(nova.locator(ALERTA)).toContainText("já está cadastrada");

    const cartao = page.locator("article", { hasText: "Marabá – PA" });
    await cartao.getByRole("button", { name: "Desativar" }).click();
    await expect(cartao.getByText("Desativada")).toBeVisible();

    // Cidade desativada some do site (visitante sem login).
    const visitante = await browser.newPage();
    await visitante.goto("/");
    await expect(visitante.getByText("Canaã dos Carajás · Parauapebas")).toBeVisible();
    await expect(visitante.getByText(/Marabá/)).toHaveCount(0);
    await visitante.close();

    // Sem ninguém cadastrado, pode excluir.
    await page.goto("/admin/cidades");
    await page.locator("article", { hasText: "Marabá – PA" }).getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Marabá – PA")).toHaveCount(0);
  });

  test("admin → Categorias: gelo e polpas separados; cria 'Cervejas' (tipo bebida alcoólica)", async ({ page }) => {
    await entrar(page, TEL.admin);
    // Ajustes reúne cidades, categorias e erros.
    await page.getByRole("navigation", { name: "Menu do admin" }).getByRole("link", { name: "Ajustes" }).click();
    await page.getByRole("link", { name: /Categorias do catálogo/ }).click();
    await expect(page).toHaveURL(/\/admin\/categorias$/);
    for (const nome of ["Água em galão 20 L", "Refrigerantes", "Gelo", "Polpas e açaí", "Bebidas alcoólicas", "Cascos"]) {
      await expect(page.locator("article", { hasText: nome }).first()).toBeVisible();
    }
    // Galão e casco são do sistema: sem desativar nem excluir.
    const galao = page.locator("article", { hasText: "Água em galão 20 L" });
    await expect(galao.getByText("Sistema")).toBeVisible();
    await expect(galao.getByRole("button", { name: "Desativar" })).toHaveCount(0);

    const nova = page.locator("details", { hasText: "+ Nova categoria" });
    await nova.evaluate((d) => ((d as HTMLDetailsElement).open = true));
    await nova.getByLabel("Nome que o cliente vê").fill("Cervejas");
    // Sem escolher o tipo, não cria.
    await nova.getByRole("button", { name: "Criar categoria" }).click();
    await expect(nova.locator(ALERTA)).toContainText("Escolha o tipo");
    await escolherOpcao(nova.getByLabel("Tipo (define as regras)"), /^Bebida alcoólica/);
    await nova.getByLabel("Ordem").fill("6");
    await nova.getByRole("button", { name: "Criar categoria" }).click();
    const cervejas = page.locator("article", { hasText: "Cervejas" });
    await expect(cervejas).toBeVisible();
    await expect(cervejas.getByText(/18\+ e documento na entrega/)).toBeVisible();

    // Nome repetido é recusado.
    await nova.evaluate((d) => ((d as HTMLDetailsElement).open = true));
    await nova.getByLabel("Nome que o cliente vê").fill("Gelo");
    await escolherOpcao(nova.getByLabel("Tipo (define as regras)"), /^Gelo/);
    await nova.getByRole("button", { name: "Criar categoria" }).click();
    await expect(nova.locator(ALERTA)).toContainText("Já existe a categoria Gelo");

    // Categoria de teste: cria, desativa e exclui (sem produtos).
    await nova.evaluate((d) => ((d as HTMLDetailsElement).open = true));
    await nova.getByLabel("Nome que o cliente vê").fill("Temporária");
    await escolherOpcao(nova.getByLabel("Tipo (define as regras)"), /^Acessório/);
    await nova.getByRole("button", { name: "Criar categoria" }).click();
    const temp = page.locator("article", { hasText: "Temporária" });
    await temp.getByRole("button", { name: "Desativar" }).click();
    await expect(temp.getByText("Desativada")).toBeVisible();
    await temp.getByRole("button", { name: "Excluir" }).click();
    await expect(page.locator("article", { hasText: "Temporária" })).toHaveCount(0);
  });

  test("admin → Planos: cria Essencial e Completo (só o Completo tem app próprio)", async ({ page, browser }) => {
    await entrar(page, TEL.admin);
    await page.goto("/admin/planos");
    await page.getByRole("button", { name: "Criar os planos Essencial e Completo" }).click();
    await expect(page.locator("article", { hasText: "Essencial" })).toBeVisible();
    await expect(page.locator("article", { hasText: "Completo" })).toBeVisible();
    // Agora o site mostra os planos para as distribuidoras.
    const visitante = await browser.newPage();
    await visitante.goto("/");
    await expect(visitante.getByText("Essencial").first()).toBeVisible();
    await expect(visitante.getByText("Completo").first()).toBeVisible();
    await visitante.close();
  });

  test("distribuidora: cria a conta pelo 'Sou distribuidora' e cai no cadastro da loja", async ({ page }) => {
    await entrar(page, TEL.loja, { para: "loja" });
    await expect(page).toHaveURL(/\/loja\/cadastro/);
    await expect(page.getByRole("heading", { name: "Cadastrar distribuidora" })).toBeVisible();
  });

  test("distribuidora: cadastro da loja valida e vai para análise", async ({ page }) => {
    await entrar(page, TEL.loja, { para: "loja" });
    await expect(page).toHaveURL(/\/loja\/cadastro/);
    await page.getByLabel("Nome da loja").fill(LOJA.nome);
    await page.getByLabel("CNPJ ou MEI").fill("12345678000199");
    await page.getByLabel("WhatsApp da loja").fill(TEL.loja);
    await page.getByLabel("Marcas de água que vende").fill("Cristal");
    // As cidades da lista são as ativas do painel.
    const cidade = page.locator("select[name=cidade]");
    await expect(cidade.locator("option")).toHaveText(["Canaã dos Carajás – PA", "Parauapebas – PA"]);
    await page.locator("input[name=bairro]").fill("Centro");
    await page.locator("input[name=logradouro]").fill("Av. dos Testes");
    await page.locator("input[name=numero]").fill("100");
    await page.getByLabel("Entrego até (km)").fill("10");
    await page.getByLabel("Taxa de entrega (R$)").fill("3");
    await page.getByLabel("Galão 20 L avulso (R$)").fill("12");
    await page.getByLabel("Casco vazio (R$)").fill("30");
    // Abre todos os dias (o teste não depende do dia da semana).
    await page.locator("label.chip", { hasText: "Dom" }).click();
    await page.getByLabel("Abre").fill("06:00");
    await page.getByLabel("Fecha").fill("22:00");
    await page.locator("label", { hasText: "Selo Fiscal de Controle" }).locator("input").check();
    await page.locator("label", { hasText: "Vendo bebidas alcoólicas" }).locator("input").check();
    await page.locator("label", { hasText: "Aceito os" }).locator("input").check();

    // Sem o ponto no mapa, recusa.
    await page.getByRole("button", { name: "Enviar cadastro para análise" }).click();
    await expect(page.locator(ALERTA)).toContainText("Marque o ponto no mapa");

    await marcarNoMapa(page);
    await page.getByRole("button", { name: "Enviar cadastro para análise" }).click();
    await expect(page).toHaveURL(/\/loja$/);
    await expect(page.getByText("Em análise")).toBeVisible();
  });

  test("admin → Lojas: aprova a loja e coloca no plano Completo (pago por 30 dias)", async ({ page }) => {
    await entrar(page, TEL.admin);
    await page.goto("/admin/lojas");
    const cartao = page.locator("article", { hasText: LOJA.nome });
    await expect(cartao).toBeVisible();
    await cartao.getByRole("button", { name: "Aprovar" }).click();
    await expect(cartao.getByRole("button", { name: "Aprovar" })).toHaveCount(0);

    await cartao.getByRole("button", { name: "Editar plano" }).click();
    await escolherOpcao(cartao.getByLabel("Plano"), /^Completo/);
    const daqui30 = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
    await cartao.getByLabel("Pago até").fill(daqui30);
    await cartao.getByRole("button", { name: "Salvar" }).click();
    await expect(cartao.getByText(/Salvo|salvo/)).toBeVisible();
  });

  test("distribuidora: Meu plano mostra o Completo e a agenda já funciona", async ({ page }) => {
    await entrar(page, TEL.loja);
    await expect(page).toHaveURL(/\/loja$/);
    await expect(page.getByText("Em análise")).toHaveCount(0);
    await page.goto("/loja/plano");
    await expect(page.getByText("Completo").first()).toBeVisible();
  });

  test("distribuidora → Planos: usa os planos mensais sugeridos", async ({ page }) => {
    await entrar(page, TEL.loja);
    await page.goto("/loja/planos");
    await page.getByRole("button", { name: "Usar planos sugeridos" }).click();
    // 8, 12, 16, 20, 24 e 32 galões, com 10% de desconto sobre o avulso (R$ 12,00).
    await expect(page.getByText(/galões\/mês · R\$/)).toHaveCount(6);
    await expect(page.getByText(/^8 galões\/mês · R\$\s86,00$/)).toBeVisible();
  });

  test("distribuidora → Catálogo: bebida retornável com foto", async ({ page }) => {
    await entrar(page, TEL.loja);
    await page.goto("/loja/produtos");
    const form = page.locator("form", { hasText: "Adicionar produto" });

    await form.locator("input[type=file]").setInputFiles(FOTO_PNG);
    await expect(form.getByRole("img", { name: "Foto do produto" })).toBeVisible();
    await form.getByLabel("Nome").fill("Refrigerante 2 L vidro");
    await form.getByLabel("Marca").fill("Coca-Cola");
    await form.getByLabel("Categoria").selectOption({ label: "Refrigerantes" });
    await form.getByLabel("Preço normal (R$)").fill("14");
    await form.getByLabel("Quantidade em estoque").fill("20");

    // Retornável: preço do líquido tem que ser menor que o normal.
    await form.getByLabel(/Retornável/).check();
    await form.getByLabel("Preço só do líquido (R$)").fill("15");
    await form.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(form.locator(ALERTA)).toContainText("menor que o preço normal");

    await form.getByLabel("Preço só do líquido (R$)").fill("9");
    await form.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(form.getByRole("status")).toContainText("Refrigerante 2 L vidro adicionado");

    const item = page.locator("li", { hasText: "Refrigerante 2 L vidro" });
    await expect(item.getByText("retornável · líquido R$ 9,00")).toBeVisible();
    // A foto é servida pela rota própria, com cache.
    const foto = item.getByRole("img", { name: "Refrigerante 2 L vidro" });
    await expect(foto).toHaveAttribute("src", /\/f\/produto\/[0-9a-f-]{36}\?v=/);
    const src = await foto.getAttribute("src");
    const r = await page.request.get(src!);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toBe("image/jpeg");
  });

  test("distribuidora → Catálogo: outros itens (gelo, polpa, cerveja 18+, acessório)", async ({ page }) => {
    await entrar(page, TEL.loja);
    await page.goto("/loja/produtos");
    const form = page.locator("form", { hasText: "Adicionar produto" });
    // As opções de categoria vêm do painel (inclusive a "Cervejas" que o admin acabou de criar).
    await expect(form.getByLabel("Categoria").locator("option", { hasText: "Cervejas" })).toHaveCount(1);
    for (const [nome, cat, preco] of [
      ["Gelo 5 kg", "Gelo", "10"],
      ["Polpa de acerola 1 kg", "Polpas e açaí", "12"],
      ["Cerveja lata 350 ml", "Cervejas", "5"],
      ["Copo descartável", "Acessórios", "2"],
    ] as const) {
      await form.getByLabel("Nome").fill(nome);
      await form.getByLabel("Categoria").selectOption({ label: cat });
      await form.getByLabel("Preço normal (R$)").fill(preco);
      await form.getByRole("button", { name: "Adicionar", exact: true }).click();
      await expect(form.getByRole("status")).toContainText(`${nome} adicionado`);
    }
    // A categoria "Cervejas" é do tipo bebida alcoólica: o produto já sai como 18+.
    await expect(page.locator("li", { hasText: "Cerveja lata 350 ml" }).getByText("18+")).toBeVisible();
    // Gelo e polpas em grupos separados no catálogo da loja.
    await expect(page.getByRole("heading", { name: "Gelo", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Polpas e açaí" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cervejas" })).toBeVisible();
  });

  test("distribuidora → Catálogo: editar nome/foto e excluir produto", async ({ page }) => {
    await entrar(page, TEL.loja);
    await page.goto("/loja/produtos");

    // Editar: troca o nome e põe foto no gelo.
    let item = page.locator("li", { hasText: "Gelo 5 kg" });
    await item.getByRole("button", { name: "Editar" }).click();
    await item.getByLabel("Nome").fill("Gelo em cubos 5 kg");
    await item.locator("input[type=file]").setInputFiles(FOTO_PNG);
    await item.getByRole("button", { name: "Salvar" }).click();
    item = page.locator("li", { hasText: "Gelo em cubos 5 kg" });
    await expect(item).toBeVisible();
    await expect(item.getByRole("img", { name: "Gelo em cubos 5 kg" })).toBeVisible();

    // Excluir pede confirmação; "Não" desiste.
    const copo = page.locator("li", { hasText: "Copo descartável" });
    await copo.getByRole("button", { name: "Editar" }).click();
    await copo.getByRole("button", { name: "Excluir produto" }).click();
    await copo.getByRole("button", { name: "Não" }).click();
    await expect(copo).toBeVisible();
    await copo.getByRole("button", { name: "Excluir produto" }).click();
    await copo.getByRole("button", { name: "Sim, excluir" }).click();
    await expect(page.locator("li", { hasText: "Copo descartável" })).toHaveCount(0);

    // Marcar em falta e voltar.
    const cerveja = page.locator("li", { hasText: "Cerveja lata 350 ml" });
    await cerveja.getByRole("button", { name: "Marcar em falta" }).click();
    await expect(cerveja.locator(".selo", { hasText: "em falta" })).toBeVisible();
    await cerveja.getByRole("button", { name: "Tenho de novo" }).click();
    await expect(cerveja.locator(".selo", { hasText: "em falta" })).toHaveCount(0);
  });

  test("distribuidora → Pagamentos: conecta a conta de teste do Mercado Pago", async ({ page }) => {
    await entrar(page, TEL.loja);
    await page.goto("/loja/pagamentos");
    await page.getByRole("button", { name: "Conectar conta de teste" }).click();
    await expect(page.getByRole("button", { name: /Desconectar/ })).toBeVisible();
  });

  test("distribuidora → Meu app: define o endereço do site da loja", async ({ page }) => {
    await entrar(page, TEL.loja);
    await page.goto("/loja/marca");
    const editar = page.getByRole("button", { name: /Editar/ }).first();
    if (await editar.isVisible()) await editar.click();
    await page.getByLabel(/Endereço/).first().fill(LOJA.slug);
    await page.getByRole("button", { name: "Salvar" }).first().click();
    await expect(page.getByText(/Salvo!/)).toBeVisible();
    guardar("slug", LOJA.slug);
  });
});
