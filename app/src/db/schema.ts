// Modelo de dados do ÁguaPrajá (MVP completo — seção 6 do plano).
// Valores em dinheiro sempre em centavos (inteiro).
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();

export const papel = pgEnum("papel", ["cliente", "loja", "entregador", "admin"]);
export const statusLoja = pgEnum("status_loja", ["pendente", "aprovada", "suspensa"]);
export const categoriaProduto = pgEnum("categoria_produto", [
  "agua_galao",
  "agua",
  "refrigerante",
  "suco",
  "gelo",
  "polpa",
  "alcoolica",
  "acessorio",
  "casco",
]);
export const modoEntrega = pgEnum("modo_entrega", ["entrega", "retirada"]);
export const tipoHorario = pgEnum("tipo_horario", ["imediato", "exato", "janela", "periodo"]);
export const statusPedido = pgEnum("status_pedido", [
  "recebido",
  "confirmado",
  "separacao",
  "saiu",
  "entregue",
  "pronto_retirada",
  "retirado",
  "nao_entregue",
  "cancelado",
]);
export const formaPagamento = pgEnum("forma_pagamento", ["pix", "cartao", "na_entrega", "plano"]);
export const statusPagamento = pgEnum("status_pagamento", ["pendente", "pago", "falhou", "estornado"]);
export const statusAssinatura = pgEnum("status_assinatura", ["ativa", "pausada", "cancelada"]);

/** Família — usada pelo simulador. */
export type PerfilFamilia = {
  adultos: number;
  criancas: number;
  bebes: number;
  adolescentes: number;
  idosos: number;
  calor: boolean;
  cozinha: boolean;
};

export const usuarios = pgTable(
  "usuarios",
  {
    id: id(),
    telefone: text("telefone").notNull(), // só dígitos, com DDD (sem 55)
    nome: text("nome"),
    papel: papel("papel").notNull().default("cliente"),
    perfilFamilia: jsonb("perfil_familia").$type<PerfilFamilia>(),
    declarou18: boolean("declarou_18").notNull().default(false),
    aceitouTermosEm: timestamp("aceitou_termos_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("usuarios_telefone_idx").on(t.telefone)],
);

export const codigosLogin = pgTable(
  "codigos_login",
  {
    id: id(),
    telefone: text("telefone").notNull(),
    codigoHash: text("codigo_hash").notNull(),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    tentativas: smallint("tentativas").notNull().default(0),
    usadoEm: timestamp("usado_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [index("codigos_login_tel_idx").on(t.telefone)],
);

export const enderecos = pgTable("enderecos", {
  id: id(),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  apelido: text("apelido").notNull().default("Casa"),
  logradouro: text("logradouro").notNull(),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro").notNull(),
  cidade: text("cidade").notNull(),
  referencia: text("referencia"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  padrao: boolean("padrao").notNull().default(true),
  criadoEm: criadoEm(),
});

/** Regras de horário de entrega definidas pela loja (seção 3 — opções de horário). */
export type RegrasHorario = {
  abre: string; // "07:00"
  fecha: string; // "19:00"
  dias: number[]; // 0=dom … 6=sáb
  aceitaImediato: boolean;
  prazoImediatoMin: number;
  aceitaExato: boolean;
  janelaMinimaMin: number;
  capacidadePorJanela: number;
  taxaExtraCentavos: number; // imediato / horário exato
};

export const lojas = pgTable("lojas", {
  id: id(),
  donoId: uuid("dono_id").notNull().references(() => usuarios.id),
  nome: text("nome").notNull(),
  documento: text("documento").notNull(), // CNPJ ou MEI
  telefone: text("telefone").notNull(),
  endereco: text("endereco").notNull(),
  bairro: text("bairro").notNull(),
  cidade: text("cidade").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  raioKm: doublePrecision("raio_km").notNull().default(5),
  marcasAgua: text("marcas_agua"),
  fazEntrega: boolean("faz_entrega").notNull().default(true),
  fazRetirada: boolean("faz_retirada").notNull().default(true),
  taxaEntregaCentavos: integer("taxa_entrega_centavos").notNull().default(0),
  regrasHorario: jsonb("regras_horario").$type<RegrasHorario>().notNull(),
  vendeAlcool: boolean("vende_alcool").notNull().default(false),
  seloFiscalDeclarado: boolean("selo_fiscal_declarado").notNull().default(false),
  status: statusLoja("status").notNull().default("pendente"),
  observacaoAdmin: text("observacao_admin"),
  criadoEm: criadoEm(),
});

export const entregadores = pgTable(
  "entregadores",
  {
    id: id(),
    lojaId: uuid("loja_id").notNull().references(() => lojas.id, { onDelete: "cascade" }),
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("entregadores_loja_usuario_idx").on(t.lojaId, t.usuarioId)],
);

export const produtos = pgTable("produtos", {
  id: id(),
  lojaId: uuid("loja_id").notNull().references(() => lojas.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  categoria: categoriaProduto("categoria").notNull(),
  /** Retornável = tem casco (galão 20 L). */
  retornavel: boolean("retornavel").notNull().default(false),
  alcoolico: boolean("alcoolico").notNull().default(false),
  precoCentavos: integer("preco_centavos").notNull(),
  disponivel: boolean("disponivel").notNull().default(true),
  ordem: integer("ordem").notNull().default(0),
  criadoEm: criadoEm(),
});

export const planos = pgTable("planos", {
  id: id(),
  lojaId: uuid("loja_id").notNull().references(() => lojas.id, { onDelete: "cascade" }),
  produtoId: uuid("produto_id").notNull().references(() => produtos.id),
  galoesMes: integer("galoes_mes").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: criadoEm(),
});

/** Uma entrega fixa da semana dentro do plano. */
export type EntregaSemanal = {
  dia: number; // 0=dom … 6=sáb
  qtd: number;
  tipoHorario: "exato" | "janela" | "periodo";
  inicio: string; // "10:00"
  fim: string; // "10:30" (igual ao início se exato)
};

export const assinaturas = pgTable("assinaturas", {
  id: id(),
  clienteId: uuid("cliente_id").notNull().references(() => usuarios.id),
  lojaId: uuid("loja_id").notNull().references(() => lojas.id),
  planoId: uuid("plano_id").notNull().references(() => planos.id),
  enderecoId: uuid("endereco_id").references(() => enderecos.id),
  modo: modoEntrega("modo").notNull(),
  agenda: jsonb("agenda").$type<EntregaSemanal[]>().notNull(),
  status: statusAssinatura("status").notNull().default("ativa"),
  saldoAcumulado: integer("saldo_acumulado").notNull().default(0),
  cicloInicio: date("ciclo_inicio").notNull(),
  formaPagamento: formaPagamento("forma_pagamento").notNull(),
  pulos: jsonb("pulos").$type<string[]>().notNull().default([]), // datas "AAAA-MM-DD"
  criadoEm: criadoEm(),
});

export const pedidos = pgTable(
  "pedidos",
  {
    id: id(),
    numero: serial("numero").notNull(),
    clienteId: uuid("cliente_id").notNull().references(() => usuarios.id),
    lojaId: uuid("loja_id").notNull().references(() => lojas.id),
    assinaturaId: uuid("assinatura_id").references(() => assinaturas.id),
    enderecoId: uuid("endereco_id").references(() => enderecos.id),
    modo: modoEntrega("modo").notNull(),
    tipoHorario: tipoHorario("tipo_horario").notNull(),
    data: date("data").notNull(),
    horaInicio: text("hora_inicio").notNull(),
    horaFim: text("hora_fim").notNull(),
    status: statusPedido("status").notNull().default("recebido"),
    subtotalCentavos: integer("subtotal_centavos").notNull(),
    taxaEntregaCentavos: integer("taxa_entrega_centavos").notNull().default(0),
    taxaHorarioCentavos: integer("taxa_horario_centavos").notNull().default(0),
    totalCentavos: integer("total_centavos").notNull(),
    formaPagamento: formaPagamento("forma_pagamento").notNull(),
    statusPagamento: statusPagamento("status_pagamento").notNull().default("pendente"),
    cascosTroca: integer("cascos_troca").notNull().default(0),
    cascosComprados: integer("cascos_comprados").notNull().default(0),
    temAlcool: boolean("tem_alcool").notNull().default(false),
    documentoConferido: boolean("documento_conferido").notNull().default(false),
    codigoRetirada: text("codigo_retirada"),
    motivo: text("motivo"),
    nota: smallint("nota"),
    comentario: text("comentario"),
    criadoEm: criadoEm(),
  },
  (t) => [index("pedidos_loja_data_idx").on(t.lojaId, t.data), index("pedidos_cliente_idx").on(t.clienteId)],
);

export const itensPedido = pgTable("itens_pedido", {
  id: id(),
  pedidoId: uuid("pedido_id").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
  produtoId: uuid("produto_id").references(() => produtos.id),
  nome: text("nome").notNull(),
  qtd: integer("qtd").notNull(),
  precoUnitCentavos: integer("preco_unit_centavos").notNull(),
  alcoolico: boolean("alcoolico").notNull().default(false),
  retornavel: boolean("retornavel").notNull().default(false),
});

/** Linha do tempo do pedido (seção 3 — status). */
export const eventosPedido = pgTable("eventos_pedido", {
  id: id(),
  pedidoId: uuid("pedido_id").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
  status: statusPedido("status").notNull(),
  porUsuarioId: uuid("por_usuario_id").references(() => usuarios.id),
  nota: text("nota"),
  criadoEm: criadoEm(),
});

/** Movimento de vasilhames: + cliente ficou com casco da loja, − devolveu. */
export const movimentosCasco = pgTable("movimentos_casco", {
  id: id(),
  lojaId: uuid("loja_id").notNull().references(() => lojas.id),
  clienteId: uuid("cliente_id").notNull().references(() => usuarios.id),
  pedidoId: uuid("pedido_id").references(() => pedidos.id),
  delta: integer("delta").notNull(),
  nota: text("nota"),
  criadoEm: criadoEm(),
});
