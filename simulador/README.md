# ÁguaPrajá — Simulador (fase de validação)

Página para validar a ideia em **Canaã dos Carajás**. A família informa quem mora na casa, vê quantos galões
precisa e qual plano combina com ela. Depois deixa o contato, conta como compra água hoje, diz se assinaria
um plano e quais bebidas pediria junto. As respostas vão para uma **Planilha Google**.

## Rodar no computador

```bash
npm install
npm run dev          # abre em http://localhost:3000
npm run test:simulador   # confere o simulador com a tabela do documento
```

Sem planilha configurada, em desenvolvimento os cadastros vão para `data/leads.jsonl`.

## Ligar na planilha

1. Siga as instruções no topo de `planilha/apps-script.gs`.
2. Copie `.env.example` para `.env.local` e preencha `PLANILHA_WEBHOOK_URL` e `PLANILHA_SEGREDO`.

## Publicar (Vercel, grátis)

1. Suba esta pasta para um repositório no GitHub.
2. Em vercel.com, use "Add New Project" e importe o repositório.
3. Em *Environment Variables*, cadastre as variáveis do `.env.example`.
4. Depois do deploy, coloque a URL final em `NEXT_PUBLIC_URL_PUBLICA` e faça um novo deploy.

Em produção, **sem** `PLANILHA_WEBHOOK_URL` o formulário mostra erro, para nenhum cadastro se perder sem você saber.

## Medir de onde vêm os cadastros

Acrescente `?origem=` no link e cada cadastro chega com essa marca na coluna "Origem":

- `https://seu-site/?origem=qr-galao-cristal`: etiqueta QR no galão da loja Cristal
- `https://seu-site/?origem=grupo-bairro-centro`: link postado no grupo do bairro
- `https://seu-site/?origem=panfleto`

## Onde mexer

| O quê | Arquivo |
|---|---|
| Litros por pessoa, calor, cozinha, planos, preço de referência do galão | `src/lib/simulador.ts` |
| Lista de bebidas e campos do formulário | `src/lib/lead.ts` |
| Cidade, WhatsApp de contato | `src/lib/config.ts` e variáveis de ambiente |
| Textos e telas | `src/app/Simulador.tsx` |
| Cores | `src/app/globals.css` |

## Regras já implementadas

- Fórmula da seção 4 do documento. Os 6 casos da "tabela pronta" são conferidos por `npm run test:simulador`.
- Bebida alcoólica só é registrada se a pessoa declarar ter **18 anos ou mais**. A tela bloqueia o envio e o servidor também descarta o item sem a declaração.
- Consentimento LGPD obrigatório e campo-armadilha contra robôs.
- O preço mostrado é estimativa: R$ 15 o galão avulso e 10% de desconto no plano, conforme `src/lib/simulador.ts`. **Ajuste depois das entrevistas.**
