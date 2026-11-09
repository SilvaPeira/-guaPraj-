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
4. Pedido avulso e assinatura, com horário imediato, exato, janela ou período
5. Agenda da loja, status em lote, entregador, cascos
6. Pagamento (Pix, cartão, recorrência)
7. Avisos por WhatsApp, avaliação, financeiro e controle de 18+ na entrega
