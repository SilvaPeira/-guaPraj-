CREATE TABLE "planos_app" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"preco_centavos" integer DEFAULT 0 NOT NULL,
	"descricao" text,
	"limite_assinantes" integer,
	"limite_entregadores" integer,
	"pagamento_online" boolean DEFAULT false NOT NULL,
	"produtos_extras" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lojas" ADD COLUMN "plano_app_id" uuid;--> statement-breakpoint
ALTER TABLE "lojas" ADD COLUMN "plano_app_pago_ate" date;