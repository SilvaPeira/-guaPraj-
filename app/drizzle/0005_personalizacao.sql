ALTER TABLE "lojas" ADD COLUMN "capa" text;--> statement-breakpoint
ALTER TABLE "lojas" ADD COLUMN "personalizacao" jsonb DEFAULT '{}'::jsonb NOT NULL;