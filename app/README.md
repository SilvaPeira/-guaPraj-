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

1. ✅ Base: login por código, cadastro com pino no mapa, cadastro de loja, admin aprova lojas
2. ✅ Catálogo (galão + bebidas, álcool só para loja habilitada), planos e ajustes de horário
3. ✅ Simulador, lojas que atendem o endereço (raio de entrega ou retirada até 15 km) e plano sugerido
4. ✅ Pedido avulso, compra adicional e assinatura com agenda fixa (semanal, quinzenal ou mensal), ciência do dia/horário, pular, alterar, trocar de plano e cancelar
5. ✅ Agenda da loja por dia, status (também em lote), "não entregue" + reagendar, entregador, cascos com clientes, 18+ conferido na entrega
6. Pagamento (Pix, cartão, recorrência)
7. ✅ Avaliação de 1 a 5, financeiro da loja, contador de pedidos a confirmar · 🟡 avisos por WhatsApp prontos, falta ligar o provedor

## Site e app da loja (marca própria)

Cada distribuidora tem o seu site em `/l/<endereço>` (ex.: `/l/jm-beer`), com logo, cores e frase dela, que pode ser **instalado no celular como app** (PWA, sem Play Store/App Store). Instalado, aparece com o **nome e o ícone da loja**; o ÁguaPrajá só aparece discreto no rodapé ("feito com ÁguaPrajá").

- A loja configura tudo em **Painel → Meu app** (logo, cores, endereço, frase) e compartilha o link.
- Entrar pelo site da loja liga o tema dela no app inteiro (cookie `aguapraja_loja`) e esconde a lista de outras lojas.
- Ícones do app são gerados a partir da logo (`/l/<endereço>/icone/192`, `512`, `180`).
- Com o domínio próprio, dá para usar subdomínio por loja (ex.: `jmbeer.seudominio.com.br`).
