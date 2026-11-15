ALTER TABLE "lojas" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "lojas" ADD COLUMN "logo" text;--> statement-breakpoint
ALTER TABLE "lojas" ADD COLUMN "cor_primaria" text DEFAULT '#1b6b47' NOT NULL;--> statement-breakpoint
ALTER TABLE "lojas" ADD COLUMN "cor_escura" text DEFAULT '#0e3b2c' NOT NULL;--> statement-breakpoint
ALTER TABLE "lojas" ADD COLUMN "descricao" text;--> statement-breakpoint
ALTER TABLE "lojas" ADD CONSTRAINT "lojas_slug_unique" UNIQUE("slug");