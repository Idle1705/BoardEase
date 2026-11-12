CREATE TYPE "public"."inquiry_kind" AS ENUM('question', 'viewing');--> statement-breakpoint
ALTER TYPE "public"."listing_status" ADD VALUE 'submitted' BEFORE 'published';--> statement-breakpoint
ALTER TYPE "public"."listing_status" ADD VALUE 'approved' BEFORE 'published';--> statement-breakpoint
ALTER TYPE "public"."listing_status" ADD VALUE 'rejected' BEFORE 'published';--> statement-breakpoint
CREATE TABLE "inquiry_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_messages_length" CHECK (char_length("inquiry_messages"."body") between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "listing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "inquiries_renter_idx";--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "room_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "monthly_price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "bathroom" SET DEFAULT 'shared';--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "kind" "inquiry_kind" DEFAULT 'question' NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "room_id" uuid;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "renter_phone" char(11);--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "owner_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD COLUMN "room_id" uuid;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD COLUMN "byte_size" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "property_id" uuid;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "show_phone" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "availability_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "taken_manual" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_sender_id_profiles_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_actor_id_profiles_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiry_messages_thread_idx" ON "inquiry_messages" USING btree ("inquiry_id","created_at");--> statement-breakpoint
CREATE INDEX "listing_events_listing_idx" ON "listing_events" USING btree ("listing_id","created_at");--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_owner_id_profiles_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_reviewed_by_profiles_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_photos_key_uq" ON "listing_photos" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_property_uq" ON "listings" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "inquiries_renter_idx" ON "inquiries" USING btree ("renter_id","created_at");--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_message_length" CHECK (char_length("inquiries"."message") between 10 and 1000);--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_renter_phone_digits" CHECK ("inquiries"."renter_phone" is null or "inquiries"."renter_phone" ~ '^09[0-9]{9}$');--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_not_self" CHECK ("inquiries"."owner_id" <> "inquiries"."renter_id");--> statement-breakpoint
-- Backfill: rows published before 0002 count as confirmed when they were published (main had none)
UPDATE "listings" SET "published_at" = coalesce("published_at", now()), "availability_confirmed_at" = coalesce("published_at", now()) WHERE "status" = 'published' AND "availability_confirmed_at" IS NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_published_confirmed" CHECK ("listings"."status"::text <> 'published' or ("listings"."availability_confirmed_at" is not null and "listings"."published_at" is not null));--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_reviewed_has_reviewer" CHECK ("listings"."status"::text not in ('approved', 'rejected') or "listings"."reviewed_by" is not null);--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_taken_manual_range" CHECK ("rooms"."taken_manual" >= 0 and "rooms"."taken_manual" <= "rooms"."capacity");