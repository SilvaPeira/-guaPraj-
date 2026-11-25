# ÁguaPrajá — App (MVP)

App do cliente, painel da distribuidora, tela do entregador e painel admin, em um único projeto Next.js (PWA).

## Rodar no computador

```bash
npm install
cp .env.example .env.local   # e coloque seu celular em ADMIN_TELEFONES
npm run dev                  # http://localhost:3000
```

Sem `DATABASE_URL`, o app usa um **Postgres embutido (PGlite)** salvo em `.data/pglite`, e as migrações rodam sozinhas.
Para zerar o banco local, apague a pasta `.data`.

No desenvolvimento, o **código de login aparece na tela** (modo de teste) e no terminal, porque o envio por WhatsApp ainda não está ligado.

## Banco de dados

- Esquema: `src/db/schema.ts`
- Nova migração depois de mudar o esquema: `npx drizzle-kit generate --name descricao`
- Produção: `DATABASE_URL` aponta para um Postgres (Neon via Vercel). Aplicar migrações: `npm run db:migrar`

## Quem é quem

| Papel | Como vira | Tela inicial |
|---|---|---|
| Cliente | Qualquer pessoa que entra pelo celular | `/inicio` |
| Loja | Cliente que preenche "Sou distribuidora" | `/loja` (fica *em análise* até o admin aprovar) |
| Entregador | Cadastrado pela loja (etapa 5) | `/entregas` |
| Admin | Celular listado em `ADMIN_TELEFONES` | `/admin` |

## Etapas do plano

1. ✅ Base: login por **celular + senha** (código pelo WhatsApp só para recuperar a senha, quando houver provedor; sem provedor, o admin gera um link de nova senha), cadastro com pino no mapa, cadastro de loja, admin aprova lojas
2. ✅ Catálogo (galão + bebidas, álcool só para loja habilitada), planos e ajustes de horário
3. ✅ Simulador, lojas que atendem o endereço (raio de entrega ou retirada até 15 km) e plano sugerido
4. ✅ Pedido avulso, compra adicional e assinatura com agenda fixa (semanal, quinzenal ou mensal), ciência do dia/horário, pular, alterar, trocar de plano e cancelar
5. ✅ Agenda da loja por dia, status (também em lote), "não entregue" + reagendar, entregador, cascos com clientes, 18+ conferido na entrega
6. ✅ Pagamento pelo app com **Mercado Pago** (Pix e cartão; dinheiro direto na conta da loja; taxa da plataforma por split opcional; confirmação automática; devolução automática ao cancelar) · 🟡 falta cadastrar as credenciais da aplicação Mercado Pago em produção · ⬜ cobrança recorrente automática (hoje a mensalidade do plano vira um pedido que o cliente paga pelo botão "Pagar agora")
7. ✅ Avaliação de 1 a 5, financeiro da loja, contador de pedidos a confirmar · 🟡 avisos por WhatsApp prontos, falta ligar o provedor

## Pagamento pelo app (Mercado Pago)

- A loja conecta a **própria conta** em **Financeiro → Receber pelo app** (OAuth do Mercado Pago; tokens guardados cifrados).
- O cliente escolhe **Pagar agora (Pix ou cartão)** ou **Na entrega**. Pedidos sem pagamento podem ser pagos depois pelo botão no pedido.
- O Mercado Pago avisa em `/api/mercadopago/webhook`; o app **sempre consulta o pagamento na API** antes de marcar "Pago".
- Pedido pago e cancelado (pelo cliente ou pela loja) → estorno automático.
- Sem credenciais em desenvolvimento, roda em **modo de teste** (`/pagamento-simulado/<pedido>`). Testes: `npm run test:pagamento`.
- Variáveis: `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`, `TAXA_PLATAFORMA_PERCENTUAL` (ver `.env.example`).

## Site e app da loja (marca própria)

Cada distribuidora tem o seu site em `/l/<endereço>` (ex.: `/l/jm-beer`), com logo, cores e frase dela, que pode ser **instalado no celular como app** (PWA, sem Play Store/App Store). Instalado, aparece com o **nome e o ícone da loja**; o ÁguaPrajá só aparece discreto no rodapé ("feito com ÁguaPrajá").

- A loja configura tudo em **Painel → Meu app** (logo, cores, endereço, frase) e compartilha o link.
- Entrar pelo site da loja liga o tema dela no app inteiro (cookie `aguapraja_loja`) e esconde a lista de outras lojas.
- Ícones do app são gerados a partir da logo (`/l/<endereço>/icone/192`, `512`, `180`).
- Com o domínio próprio, dá para usar subdomínio por loja (ex.: `jmbeer.seudominio.com.br`).

## Testes

**Unitários** (regras de negócio, banco em memória, segundos): `npm run test:unit`
— assinatura, pagamento, senha, planos do app, bebida retornável.

**Ponta a ponta** (navegador de verdade, ~4 min): `npm run test:e2e`
(gera o build) ou `npm run test:e2e:rapido` (usa o último build).
Sobe o app de produção na porta 3230 com banco PGlite descartável (`.data/pglite-e2e`)
e usa o Chrome instalado. Não toca no banco do dev nem no de produção.
Relatório com fotos e rastreio das falhas: `npx playwright show-report e2e-relatorio`.

| Arquivo | O que cobre |
|---|---|
| `e2e/01-site.spec.ts` | site público, calculadora, cidades vindas do painel, termos, rotas protegidas, página 404 |
| `e2e/02-distribuidora.spec.ts` | admin (cidades, planos do app, aprovar loja, plano Completo); cadastro da loja com validações (mapa, selo fiscal); planos mensais; catálogo (foto, retornável, 18+, editar, excluir, em falta); Mercado Pago de teste; endereço do site |
| `e2e/03-cliente-pedido.spec.ts` | cadastro do cliente; Catálogo (fotos, busca sem acento, categorias); pedido com retornável, galão, 18+ e totais; horários de hoje sem nada vencido; loja confirma/sai/entrega com casco faltando; cliente vê a cobrança e avalia; Pix simulado; pagamento recusado; cancelamento |
| `e2e/04-assinatura-e-app.spec.ts` | assinar plano mensal (com aceite), um plano por vez, cancelar; site próprio e instalação (só no Completo) |
| `e2e/05-login-seguranca.spec.ts` | senha fraca/diferente, celular inválido, bloqueio após 5 erros, "esqueci a senha", link do admin (uso único), cada perfil na sua área, sair |

## Avisos e notificações (sem WhatsApp)

Cada mudança de pedido (confirmado, saiu, entregue, pago, lembrete da véspera, pedido novo para a loja)
vira um **aviso no app** (`/avisos`, sininho no Início e na Agenda) e vai como **notificação** para os
aparelhos que tocaram em "Ligar avisos" — grátis, sem provedor. No iPhone, só com o app instalado.
Precisa de `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` (`npx web-push generate-vapid-keys`). Sem elas, fica só o aviso no app.
Com `WHATSAPP_PROVEDOR` configurado, o mesmo aviso também sai por WhatsApp.

## Conta e erros

- O cliente exclui a própria conta em **Conta → Excluir minha conta** (LGPD): apaga nome, celular, senha,
  endereço e avisos; pedidos antigos ficam com a loja, sem identificação. Precisa da senha, sem plano ativo e sem pedido em andamento.
- Erros do servidor ficam em **Admin → Erros** (30 dias, agrupados, sem o que vem depois do `?` no endereço).
