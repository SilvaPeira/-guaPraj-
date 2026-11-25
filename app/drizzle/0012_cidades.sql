CREATE TABLE "cidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"uf" text DEFAULT 'PA' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cidades_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
INSERT INTO "cidades" ("nome", "uf", "lat", "lng", "ativa", "ordem") VALUES
  ('Canaã dos Carajás', 'PA', -6.4966, -49.8783, true, 0),
  ('Parauapebas', 'PA', -6.0675, -49.9022, true, 1)
ON CONFLICT ("nome") DO NOTHING;
