ALTER TYPE "public"."forma_pagamento" ADD VALUE 'online';--> statement-breakpoint
CREATE TABLE "contas_mercado_pago" (
	"loja_id" uuid PRIMARY KEY NOT NULL,
	"mp_user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"public_key" text,
	"expira_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "pagamento_id" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "pagamento_meio" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "pago_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contas_mercado_pago" ADD CONSTRAINT "contas_mercado_pago_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE cascade ON UPDATE no action;