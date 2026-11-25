CREATE TABLE "erros_servidor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mensagem" text NOT NULL,
	"rota" text NOT NULL,
	"metodo" text,
	"tipo" text,
	"digest" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "erros_criado_idx" ON "erros_servidor" USING btree ("criado_em");