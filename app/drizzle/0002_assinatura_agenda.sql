CREATE TYPE "public"."origem_pedido" AS ENUM('avulso', 'plano', 'extra');--> statement-breakpoint
ALTER TABLE "assinaturas" ADD COLUMN "aceite_texto" text;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD COLUMN "aceite_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD COLUMN "plano_proximo_id" uuid;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD COLUMN "cancelada_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD COLUMN "valida_ate" date;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "origem" "origem_pedido" DEFAULT 'avulso' NOT NULL;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_plano_proximo_id_planos_id_fk" FOREIGN KEY ("plano_proximo_id") REFERENCES "public"."planos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_plano_dia_idx" ON "pedidos" USING btree ("assinatura_id","data") WHERE "pedidos"."origem" = 'plano';