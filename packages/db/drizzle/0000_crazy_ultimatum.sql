CREATE TYPE "public"."ertesites_csatorna" AS ENUM('sms', 'email');--> statement-breakpoint
CREATE TYPE "public"."ertesites_statusz" AS ENUM('naplozva', 'kikuldve', 'sikertelen');--> statement-breakpoint
CREATE TYPE "public"."felhasznalo_szerep" AS ENUM('tulaj', 'recepcio', 'szerelo');--> statement-breakpoint
CREATE TYPE "public"."idopont_statusz" AS ENUM('fuggoben', 'megerositve', 'lemondva', 'megtortent');--> statement-breakpoint
CREATE TYPE "public"."idopont_tipus" AS ENUM('foglalas', 'emlekezteto');--> statement-breakpoint
CREATE TYPE "public"."license_plan" AS ENUM('starter', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."munkalap_statusz" AS ENUM('felvett', 'folyamatban', 'kesz', 'lezart');--> statement-breakpoint
CREATE TYPE "public"."munkalap_tetel_tipus" AS ENUM('munka', 'alkatresz');--> statement-breakpoint
CREATE TYPE "public"."munkalap_tipus" AS ENUM('arajanlat', 'munka');--> statement-breakpoint
CREATE TYPE "public"."tenant_allapot" AS ENUM('demo', 'aktiv', 'lejart');--> statement-breakpoint
CREATE TYPE "public"."ugyfel_tipus" AS ENUM('maganszemely', 'ceg');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alkatreszek" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cikkszam" text NOT NULL,
	"megnevezes" text NOT NULL,
	"beszerzesi_ar" numeric(12, 2) NOT NULL,
	"eladasi_ar" numeric(12, 2) NOT NULL,
	"keszlet_mennyiseg" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ertesitesek" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ugyfel_id" uuid NOT NULL,
	"csatorna" "ertesites_csatorna" NOT NULL,
	"tipus" text NOT NULL,
	"kuldve" timestamp with time zone DEFAULT now() NOT NULL,
	"statusz" "ertesites_statusz" DEFAULT 'naplozva' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "felhasznalok" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nev" text NOT NULL,
	"email" text NOT NULL,
	"jelszo_hash" text NOT NULL,
	"szerep" "felhasznalo_szerep" DEFAULT 'recepcio' NOT NULL,
	CONSTRAINT "felhasznalok_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "idopontok" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"jarmu_id" uuid NOT NULL,
	"ugyfel_id" uuid NOT NULL,
	"idopont" timestamp with time zone NOT NULL,
	"tipus" "idopont_tipus" DEFAULT 'foglalas' NOT NULL,
	"statusz" "idopont_statusz" DEFAULT 'fuggoben' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jarmuvek" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ugyfel_id" uuid NOT NULL,
	"rendszam" text NOT NULL,
	"alvazszam" text,
	"gyartmany" text NOT NULL,
	"tipus" text NOT NULL,
	"evjarat" integer,
	"km_ora" integer,
	"muszaki_lejarat" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"license_key_hash" text NOT NULL,
	"plan" "license_plan" NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"kiadva" timestamp with time zone NOT NULL,
	"lejar" timestamp with time zone NOT NULL,
	"aktivalva" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "munkalap_tetelek" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"munkalap_id" uuid NOT NULL,
	"tipus" "munkalap_tetel_tipus" NOT NULL,
	"megnevezes" text NOT NULL,
	"mennyiseg" numeric(10, 2) NOT NULL,
	"egysegar" numeric(12, 2) NOT NULL,
	"afa_kulcs" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "munkalapok" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"jarmu_id" uuid NOT NULL,
	"ugyfel_id" uuid NOT NULL,
	"statusz" "munkalap_statusz" DEFAULT 'felvett' NOT NULL,
	"felvetel_datum" timestamp with time zone DEFAULT now() NOT NULL,
	"hibaleiras" text NOT NULL,
	"szerelo_id" uuid,
	"tipus" "munkalap_tipus" DEFAULT 'munka' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "szamlak" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"munkalap_id" uuid NOT NULL,
	"kulso_szamla_id" text NOT NULL,
	"szamlaszam" text NOT NULL,
	"brutto" numeric(12, 2) NOT NULL,
	"afa" numeric(12, 2) NOT NULL,
	"fizetve" boolean DEFAULT false NOT NULL,
	"kelt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nev" text NOT NULL,
	"allapot" "tenant_allapot" DEFAULT 'demo' NOT NULL,
	"letrehozva" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ugyfelek" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nev" text NOT NULL,
	"tipus" "ugyfel_tipus" DEFAULT 'maganszemely' NOT NULL,
	"adoszam" text,
	"cim" text,
	"telefon" text,
	"email" text,
	"gdpr_hozzajarulas" boolean DEFAULT false NOT NULL,
	"letrehozva" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alkatreszek" ADD CONSTRAINT "alkatreszek_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ertesitesek" ADD CONSTRAINT "ertesitesek_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ertesitesek" ADD CONSTRAINT "ertesitesek_ugyfel_id_ugyfelek_id_fk" FOREIGN KEY ("ugyfel_id") REFERENCES "public"."ugyfelek"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "felhasznalok" ADD CONSTRAINT "felhasznalok_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idopontok" ADD CONSTRAINT "idopontok_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idopontok" ADD CONSTRAINT "idopontok_jarmu_id_jarmuvek_id_fk" FOREIGN KEY ("jarmu_id") REFERENCES "public"."jarmuvek"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idopontok" ADD CONSTRAINT "idopontok_ugyfel_id_ugyfelek_id_fk" FOREIGN KEY ("ugyfel_id") REFERENCES "public"."ugyfelek"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jarmuvek" ADD CONSTRAINT "jarmuvek_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jarmuvek" ADD CONSTRAINT "jarmuvek_ugyfel_id_ugyfelek_id_fk" FOREIGN KEY ("ugyfel_id") REFERENCES "public"."ugyfelek"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "licenses" ADD CONSTRAINT "licenses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "munkalap_tetelek" ADD CONSTRAINT "munkalap_tetelek_munkalap_id_munkalapok_id_fk" FOREIGN KEY ("munkalap_id") REFERENCES "public"."munkalapok"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "munkalapok" ADD CONSTRAINT "munkalapok_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "munkalapok" ADD CONSTRAINT "munkalapok_jarmu_id_jarmuvek_id_fk" FOREIGN KEY ("jarmu_id") REFERENCES "public"."jarmuvek"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "munkalapok" ADD CONSTRAINT "munkalapok_ugyfel_id_ugyfelek_id_fk" FOREIGN KEY ("ugyfel_id") REFERENCES "public"."ugyfelek"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "munkalapok" ADD CONSTRAINT "munkalapok_szerelo_id_felhasznalok_id_fk" FOREIGN KEY ("szerelo_id") REFERENCES "public"."felhasznalok"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "szamlak" ADD CONSTRAINT "szamlak_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "szamlak" ADD CONSTRAINT "szamlak_munkalap_id_munkalapok_id_fk" FOREIGN KEY ("munkalap_id") REFERENCES "public"."munkalapok"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ugyfelek" ADD CONSTRAINT "ugyfelek_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
