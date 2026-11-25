ALTER TABLE "itens_pedido" ADD COLUMN "troca_casco" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "itens_pedido" ADD COLUMN "preco_cheio_centavos" integer;--> statement-breakpoint
ALTER TABLE "itens_pedido" ADD COLUMN "cascos_faltaram" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "preco_liquido_centavos" integer;