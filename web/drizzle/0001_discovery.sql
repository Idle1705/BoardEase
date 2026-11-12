CREATE TYPE "public"."availability_result" AS ENUM('available', 'unavailable', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."building_kind" AS ENUM('dormitory', 'boarding_house', 'apartment_building', 'condominium', 'house', 'mixed_use', 'other');--> statement-breakpoint
CREATE TYPE "public"."check_method" AS ENUM('tenancy_records', 'owner_confirmed', 'partner_feed', 'message_to_advertiser', 'link_check', 'moderator_review');--> statement-breakpoint
CREATE TYPE "public"."claim_role" AS ENUM('owner', 'manager');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('pending', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."directory_status" AS ENUM('unverified', 'active', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."external_status" AS ENUM('pending_review', 'published', 'stale', 'removed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."permission_basis" AS ENUM('own_platform', 'open_licence', 'partner_agreement', 'advertiser_consent');--> statement-breakpoint
CREATE TYPE "public"."rental_term" AS ENUM('monthly', 'short_term', 'both');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('open', 'matched', 'closed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('first_party', 'open_data', 'partner_feed', 'advertiser_submitted', 'developer');--> statement-breakpoint
CREATE TABLE "availability_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"room_id" uuid,
	"external_listing_id" uuid,
	"result" "availability_result" NOT NULL,
	"free_beds" integer,
	"method" "check_method" NOT NULL,
	"checked_by" text,
	"note" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_checks_one_subject" CHECK (num_nonnulls("availability_checks"."listing_id", "availability_checks"."room_id", "availability_checks"."external_listing_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "building_follows" (
	"user_id" text NOT NULL,
	"building_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "building_follows_user_id_building_id_pk" PRIMARY KEY("user_id","building_id")
);
--> statement-breakpoint
CREATE TABLE "buildings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_ref" text,
	"name" text NOT NULL,
	"kind" "building_kind" NOT NULL,
	"street" text,
	"district" text NOT NULL,
	"city" text DEFAULT 'Davao City' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"status" "directory_status" DEFAULT 'unverified' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buildings_lat_range" CHECK ("buildings"."lat" between -90 and 90),
	CONSTRAINT "buildings_lng_range" CHECK ("buildings"."lng" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE "external_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"building_id" uuid,
	"normalized_url" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"property_type" text NOT NULL,
	"rental_term" "rental_term" DEFAULT 'monthly' NOT NULL,
	"advertised_price_cents" integer,
	"bedrooms" integer,
	"bedspaces" integer,
	"furnished" boolean,
	"district" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"submitted_by" text,
	"status" "external_status" DEFAULT 'pending_review' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_listings_price_positive" CHECK ("external_listings"."advertised_price_cents" is null or "external_listings"."advertised_price_cents" > 0),
	CONSTRAINT "external_listings_published_checked" CHECK ("external_listings"."status" <> 'published' or "external_listings"."last_checked_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "property_building_links" (
	"property_id" uuid PRIMARY KEY NOT NULL,
	"building_id" uuid NOT NULL,
	"claim_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"claimant_id" text NOT NULL,
	"role" "claim_role" NOT NULL,
	"scope" text NOT NULL,
	"evidence_keys" text[] NOT NULL,
	"evidence_note" text,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "property_claims_has_evidence" CHECK (cardinality("property_claims"."evidence_keys") >= 1),
	CONSTRAINT "property_claims_decision" CHECK ("property_claims"."status" in ('pending','withdrawn') or ("property_claims"."reviewed_by" is not null and "property_claims"."decided_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "renter_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"renter_id" text NOT NULL,
	"district" text NOT NULL,
	"max_budget_cents" integer NOT NULL,
	"property_type" text NOT NULL,
	"rental_term" "rental_term" DEFAULT 'monthly' NOT NULL,
	"move_in" date NOT NULL,
	"amenities" text[] DEFAULT '{}'::text[] NOT NULL,
	"note" text,
	"status" "request_status" DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "renter_requests_budget_positive" CHECK ("renter_requests"."max_budget_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "request_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"listing_id" uuid,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"kind" "source_kind" NOT NULL,
	"basis" "permission_basis" NOT NULL,
	"licence" text NOT NULL,
	"attribution" text NOT NULL,
	"homepage" text,
	"automated_access_allowed" boolean DEFAULT false NOT NULL,
	"storage_allowed" boolean DEFAULT false NOT NULL,
	"photos_allowed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "rental_term" "rental_term" DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "bedrooms" integer;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "external_listing_id" uuid;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "building_id" uuid;--> statement-breakpoint
ALTER TABLE "availability_checks" ADD CONSTRAINT "availability_checks_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_checks" ADD CONSTRAINT "availability_checks_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_checks" ADD CONSTRAINT "availability_checks_external_listing_id_external_listings_id_fk" FOREIGN KEY ("external_listing_id") REFERENCES "public"."external_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_checks" ADD CONSTRAINT "availability_checks_checked_by_profiles_user_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_follows" ADD CONSTRAINT "building_follows_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_follows" ADD CONSTRAINT "building_follows_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_reviewed_by_profiles_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_listings" ADD CONSTRAINT "external_listings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_listings" ADD CONSTRAINT "external_listings_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_listings" ADD CONSTRAINT "external_listings_submitted_by_profiles_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_building_links" ADD CONSTRAINT "property_building_links_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_building_links" ADD CONSTRAINT "property_building_links_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_building_links" ADD CONSTRAINT "property_building_links_claim_id_property_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."property_claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_claims" ADD CONSTRAINT "property_claims_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_claims" ADD CONSTRAINT "property_claims_claimant_id_profiles_user_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_claims" ADD CONSTRAINT "property_claims_reviewed_by_profiles_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renter_requests" ADD CONSTRAINT "renter_requests_renter_id_profiles_user_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_response_id_request_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."request_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_sender_id_profiles_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_request_id_renter_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."renter_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_owner_id_profiles_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_responses" ADD CONSTRAINT "request_responses_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_checks_external_idx" ON "availability_checks" USING btree ("external_listing_id","checked_at");--> statement-breakpoint
CREATE INDEX "availability_checks_listing_idx" ON "availability_checks" USING btree ("listing_id","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "buildings_source_ref_uq" ON "buildings" USING btree ("source_id","external_ref");--> statement-breakpoint
CREATE INDEX "buildings_district_idx" ON "buildings" USING btree ("district","status");--> statement-breakpoint
CREATE UNIQUE INDEX "external_listings_url_uq" ON "external_listings" USING btree ("normalized_url");--> statement-breakpoint
CREATE INDEX "external_listings_public_idx" ON "external_listings" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "property_claims_one_open" ON "property_claims" USING btree ("building_id","claimant_id","scope") WHERE "property_claims"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "property_claims_queue_idx" ON "property_claims" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "renter_requests_open_idx" ON "renter_requests" USING btree ("status","district");--> statement-breakpoint
CREATE INDEX "request_messages_thread_idx" ON "request_messages" USING btree ("response_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "request_responses_one_per_owner" ON "request_responses" USING btree ("request_id","owner_id");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_external_listing_id_external_listings_id_fk" FOREIGN KEY ("external_listing_id") REFERENCES "public"."external_listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE set null ON UPDATE no action;