# Checklist: documento "ÁguaPrajá — Análise da ideia de negócio" × app

Legenda: ✅ feito · 🟡 parcial · ⬜ falta · ↔️ mudou por decisão do dono

Atualizado em: 17/11/2026

## Seção 6 — MVP (tabela)

| Área | O que o documento pede | Situação |
|---|---|---|
| Cadastro | Login por código no celular | 🟡 Código funciona; **envio pelo WhatsApp/SMS ainda não** (código aparece na tela em teste) — etapa 7 |
| Cadastro | Endereço + ponto de referência + pino no mapa (GPS ou manual) | ✅ |
| Simulador | Adultos + crianças, calor e cozinha; plano sugerido | ✅ (+ bebês, adolescentes, idosos) |
| Pedidos | Avulso e plano mensal; entrega ou retirada | ✅ |
| Pedidos | Horário imediato, exato, janela ou período, conforme regras da loja | ✅ |
| Status do pedido | Linha do tempo para o cliente | ✅ |
| Status do pedido | Loja atualiza com 1 toque, em lote; aviso a cada mudança | ⬜ Etapa 5 (loja) / etapa 7 (avisos) |
| Ajustes do plano | Pular semana | ✅ |
| Ajustes do plano | Pedido extra | ✅ (usa o saldo primeiro, depois preço do plano) |
| Ajustes do plano | Pausar | ✅ |
| Ajustes do plano | Cancelar | ✅ |
| Pagamento | Pix e cartão; Pix Automático/cartão recorrente | ⬜ Etapa 6 — hoje tudo é **pago na entrega** |
| Avisos | WhatsApp/SMS na véspera e quando sai para entrega | ⬜ Etapa 7 |
| Loja – cadastro | Área de entrega, taxa, entrega/retirada, planos e preços, opções de horário | ✅ (área por **raio em km**; por bairros ⬜) |
| Loja – operação | Agenda do dia por horário e bairro; "abrir no mapa"; atualizar status; cascos | ⬜ Etapa 5 |
| Loja – financeiro | Assinantes ativos, recebido no mês, pendentes | ⬜ Etapa 7 |
| Avaliação | Nota de 1 a 5 após a entrega | ⬜ Etapa 7 |
| Produtos | Só água em galão (bebidas depois) | ↔️ Bebidas (inclusive alcoólicas com 18+) já no MVP |

## Seção 5 — Regras do plano

| Regra | Situação |
|---|---|
| Plano em galões por mês, cobrança mensal adiantada | 🟡 Mensalidade cobrada na **1ª entrega de cada mês** (na entrega, até a etapa 6) |
| Saldo visível ("12 de 20 este mês") | ✅ |
| Galões não usados acumulam até um limite | ✅ Limite definido pela loja (padrão 4) |
| Cliente não estava em casa → nova tentativa / retirada | ⬜ Etapa 5 |
| Pular semana até a véspera, sem custo | ✅ |
| Cancelamento sem multa, vale até o fim do mês pago | ✅ |
| Galão extra pelo preço do plano | ✅ |
| Casco: troca 1 por 1; sem casco, cobra no 1º pedido | ✅ |
| Desconto do plano 5–15% sobre o avulso | ✅ Mostrado como dica para a loja; ↔️ loja define preço livre |

## Seção 3 — Status, horários e mapa

| Item | Situação |
|---|---|
| Status: recebido → confirmado → saiu → entregue / pronto → retirado | 🟡 Modelo pronto; loja muda status na etapa 5 |
| Lembrete à loja se não confirmar | ⬜ Etapa 7 |
| Capacidade por janela e "próximos horários livres" | 🟡 Bloqueia janela lotada; sugestão automática de horário livre ⬜ |
| Alerta na agenda de pedido perto de atrasar | ⬜ Etapa 5 |
| Permissão de localização só na tela do mapa; LGPD | ✅ |

## Seção 7 — Receita da plataforma

| Item | Situação |
|---|---|
| Mensalidade da loja (Grátis / R$ 99 / R$ 199) | ⬜ |
| Gateway com subconta por loja + split (Asaas e alternativas) | ⬜ Etapa 6 |

## Seções 8 e 10 — Confiança e riscos

| Item | Situação |
|---|---|
| Só lojas com selo fiscal do Pará | 🟡 Declaração obrigatória + aprovação manual no admin |
| Venda de álcool só para 18+ | ✅ Declaração no pedido; ⬜ "documento conferido" pelo entregador (etapa 5) |
| Termos de uso e privacidade | 🟡 Rascunho — revisar com advogado/contador |

## Além do documento (pedidos do dono)

- ✅ Planos livres (ex.: 3 galões por R$ 30)
- ✅ Frequência semanal / quinzenal / mensal com **ciência obrigatória** do dia e horário
- ✅ Marca e estoque no catálogo
- ✅ Site e app instalável com a **marca de cada distribuidora** (selo ÁguaPrajá discreto)

## Testes automáticos

- `simulador/`: `npm run test:simulador` — tabela da seção 4
- `app/`: `npm run test:assinatura` — mensalidade, galão além do plano, saldo, pausa, cascos
