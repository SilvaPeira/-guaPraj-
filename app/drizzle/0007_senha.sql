ALTER TABLE "usuarios" ADD COLUMN "senha_hash" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "falhas_senha" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "bloqueado_ate" timestamp with time zone;