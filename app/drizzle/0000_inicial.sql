CREATE TYPE "public"."categoria_produto" AS ENUM('agua_galao', 'agua', 'refrigerante', 'suco', 'gelo', 'polpa', 'alcoolica', 'acessorio', 'casco');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento" AS ENUM('pix', 'cartao', 'na_entrega', 'plano');--> statement-breakpoint
CREATE TYPE "public"."modo_entrega" AS ENUM('entrega', 'retirada');--> statement-breakpoint
CREATE TYPE "public"."papel" AS ENUM('cliente', 'loja', 'entregador', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status_assinatura" AS ENUM('ativa', 'pausada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."status_loja" AS ENUM('pendente', 'aprovada', 'suspensa');--> statement-breakpoint
CREATE TYPE "public"."status_pagamento" AS ENUM('pendente', 'pago', 'falhou', 'estornado');--> statement-breakpoint
CREATE TYPE "public"."status_pedido" AS ENUM('recebido', 'confirmado', 'separacao', 'saiu', 'entregue', 'pronto_retirada', 'retirado', 'nao_entregue', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_horario" AS ENUM('imediato', 'exato', 'janela', 'periodo');--> statement-breakpoint
CREATE TABLE "assinaturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"plano_id" uuid NOT NULL,
	"endereco_id" uuid,
	"modo" "modo_entrega" NOT NULL,
	"agenda" jsonb NOT NULL,
	"status" "status_assinatura" DEFAULT 'ativa' NOT NULL,
	"saldo_acumulado" integer DEFAULT 0 NOT NULL,
	"ciclo_inicio" date NOT NULL,
	"forma_pagamento" "forma_pagamento" NOT NULL,
	"pulos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codigos_login" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telefone" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"tentativas" smallint DEFAULT 0 NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enderecos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"apelido" text DEFAULT 'Casa' NOT NULL,
	"logradouro" text NOT NULL,
	"numero" text,
	"complemento" text,
	"bairro" text NOT NULL,
	"cidade" text NOT NULL,
	"referencia" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"padrao" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entregadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loja_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos_pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"status" "status_pedido" NOT NULL,
	"por_usuario_id" uuid,
	"nota" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"produto_id" uuid,
	"nome" text NOT NULL,
	"qtd" integer NOT NULL,
	"preco_unit_centavos" integer NOT NULL,
	"alcoolico" boolean DEFAULT false NOT NULL,
	"retornavel" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lojas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dono_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"documento" text NOT NULL,
	"telefone" text NOT NULL,
	"endereco" text NOT NULL,
	"bairro" text NOT NULL,
	"cidade" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"raio_km" double precision DEFAULT 5 NOT NULL,
	"marcas_agua" text,
	"faz_entrega" boolean DEFAULT true NOT NULL,
	"faz_retirada" boolean DEFAULT true NOT NULL,
	"taxa_entrega_centavos" integer DEFAULT 0 NOT NULL,
	"regras_horario" jsonb NOT NULL,
	"vende_alcool" boolean DEFAULT false NOT NULL,
	"selo_fiscal_declarado" boolean DEFAULT false NOT NULL,
	"status" "status_loja" DEFAULT 'pendente' NOT NULL,
	"observacao_admin" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimentos_casco" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loja_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"pedido_id" uuid,
	"delta" integer NOT NULL,
	"nota" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" serial NOT NULL,
	"cliente_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"assinatura_id" uuid,
	"endereco_id" uuid,
	"modo" "modo_entrega" NOT NULL,
	"tipo_horario" "tipo_horario" NOT NULL,
	"data" date NOT NULL,
	"hora_inicio" text NOT NULL,
	"hora_fim" text NOT NULL,
	"status" "status_pedido" DEFAULT 'recebido' NOT NULL,
	"subtotal_centavos" integer NOT NULL,
	"taxa_entrega_centavos" integer DEFAULT 0 NOT NULL,
	"taxa_horario_centavos" integer DEFAULT 0 NOT NULL,
	"total_centavos" integer NOT NULL,
	"forma_pagamento" "forma_pagamento" NOT NULL,
	"status_pagamento" "status_pagamento" DEFAULT 'pendente' NOT NULL,
	"cascos_troca" integer DEFAULT 0 NOT NULL,
	"cascos_comprados" integer DEFAULT 0 NOT NULL,
	"tem_alcool" boolean DEFAULT false NOT NULL,
	"documento_conferido" boolean DEFAULT false NOT NULL,
	"codigo_retirada" text,
	"motivo" text,
	"nota" smallint,
	"comentario" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loja_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"galoes_mes" integer NOT NULL,
	"preco_centavos" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loja_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"categoria" "categoria_produto" NOT NULL,
	"retornavel" boolean DEFAULT false NOT NULL,
	"alcoolico" boolean DEFAULT false NOT NULL,
	"preco_centavos" integer NOT NULL,
	"disponivel" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telefone" text NOT NULL,
	"nome" text,
	"papel" "papel" DEFAULT 'cliente' NOT NULL,
	"perfil_familia" jsonb,
	"declarou_18" boolean DEFAULT false NOT NULL,
	"aceitou_termos_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_cliente_id_usuarios_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_plano_id_planos_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."planos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_endereco_id_enderecos_id_fk" FOREIGN KEY ("endereco_id") REFERENCES "public"."enderecos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entregadores" ADD CONSTRAINT "entregadores_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entregadores" ADD CONSTRAINT "entregadores_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_pedido" ADD CONSTRAINT "eventos_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_pedido" ADD CONSTRAINT "eventos_pedido_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lojas" ADD CONSTRAINT "lojas_dono_id_usuarios_id_fk" FOREIGN KEY ("dono_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_casco" ADD CONSTRAINT "movimentos_casco_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_casco" ADD CONSTRAINT "movimentos_casco_cliente_id_usuarios_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_casco" ADD CONSTRAINT "movimentos_casco_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_usuarios_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_assinatura_id_assinaturas_id_fk" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_endereco_id_enderecos_id_fk" FOREIGN KEY ("endereco_id") REFERENCES "public"."enderecos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planos" ADD CONSTRAINT "planos_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planos" ADD CONSTRAINT "planos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigos_login_tel_idx" ON "codigos_login" USING btree ("telefone");--> statement-breakpoint
CREATE UNIQUE INDEX "entregadores_loja_usuario_idx" ON "entregadores" USING btree ("loja_id","usuario_id");--> statement-breakpoint
CREATE INDEX "pedidos_loja_data_idx" ON "pedidos" USING btree ("loja_id","data");--> statement-breakpoint
CREATE INDEX "pedidos_cliente_idx" ON "pedidos" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_telefone_idx" ON "usuarios" USING btree ("telefone");