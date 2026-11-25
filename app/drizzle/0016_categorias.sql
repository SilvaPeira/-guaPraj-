CREATE TABLE "categorias_produto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tipo" "categoria_produto" NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"sistema" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categorias_produto_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "categoria_id" uuid;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_categorias_produto_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_produto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "categorias_produto" ("nome", "tipo", "ordem", "sistema") VALUES
  ('Água em galão 20 L', 'agua_galao', 0, true),
  ('Água', 'agua', 1, false),
  ('Refrigerantes', 'refrigerante', 2, false),
  ('Sucos e energéticos', 'suco', 3, false),
  ('Gelo', 'gelo', 4, false),
  ('Polpas e açaí', 'polpa', 5, false),
  ('Bebidas alcoólicas', 'alcoolica', 6, false),
  ('Acessórios', 'acessorio', 7, false),
  ('Cascos', 'casco', 8, true)
ON CONFLICT ("nome") DO NOTHING;
--> statement-breakpoint
UPDATE "produtos" p SET "categoria_id" = c."id" FROM "categorias_produto" c WHERE p."categoria_id" IS NULL AND c."tipo" = p."categoria";
