-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "TaxonomyRank" AS ENUM ('KINGDOM', 'PHYLUM', 'CLASS', 'ORDER', 'FAMILY', 'GENUS');

-- CreateEnum
CREATE TYPE "ConservationStatus" AS ENUM ('EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('PROVINCE', 'ECO_REGION', 'NATIONAL_PARK');

-- CreateEnum
CREATE TYPE "DistributionType" AS ENUM ('NATIVE', 'ENDEMIC', 'INVASIVE');

-- CreateEnum
CREATE TYPE "VnRedListStatus" AS ENUM ('EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE');

-- CreateEnum
CREATE TYPE "CitesAppendix" AS ENUM ('I', 'II', 'III', 'NONE');

-- CreateEnum
CREATE TYPE "VnDecreeStatus" AS ENUM ('GROUP_IA', 'GROUP_IB', 'GROUP_IIA', 'GROUP_IIB', 'NONE');

-- CreateEnum
CREATE TYPE "DietType" AS ENUM ('CARNIVORE', 'HERBIVORE', 'OMNIVORE', 'INSECTIVORE');

-- CreateEnum
CREATE TYPE "HabitatType" AS ENUM ('TERRESTRIAL', 'FRESHWATER', 'MARINE', 'CANOPY');

-- CreateEnum
CREATE TYPE "ActivityPattern" AS ENUM ('DIURNAL', 'NOCTURNAL', 'CREPUSCULAR');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "taxonomy" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parent_id" UUID,
    "rank" "TaxonomyRank" NOT NULL,
    "scientific_name" VARCHAR(255) NOT NULL,
    "name_vn" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "taxonomy_id" UUID NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "scientific_name" VARCHAR(255) NOT NULL,
    "name_vn" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255),
    "author_citation" VARCHAR(255),
    "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "identification_desc" TEXT,
    "biology_desc" TEXT,
    "threats_desc" TEXT,
    "conservation_desc" TEXT,
    "diet_type" "DietType",
    "habitat_type" "HabitatType"[] DEFAULT ARRAY[]::"HabitatType"[],
    "activity_pattern" "ActivityPattern",
    "conservation_status" "ConservationStatus" NOT NULL,
    "vn_redlist_status" "VnRedListStatus",
    "cites_appendix" "CitesAppendix" DEFAULT 'NONE',
    "vn_decree_status" "VnDecreeStatus" DEFAULT 'NONE',
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "source_references" JSONB DEFAULT '[]',
    "embedding_vector" vector(768),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species_media" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "species_id" UUID NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "species_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "type" "LocationType" NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species_locations" (
    "species_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "distribution_type" "DistributionType" NOT NULL DEFAULT 'NATIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "species_locations_pkey" PRIMARY KEY ("species_id","location_id")
);

-- CreateTable
CREATE TABLE "conservation_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "species_id" UUID NOT NULL,
    "old_status" "ConservationStatus",
    "new_status" "ConservationStatus" NOT NULL,
    "changed_at" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conservation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "user_id" VARCHAR(255) NOT NULL,
    "species_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("user_id","species_id")
);

-- CreateTable
CREATE TABLE "academy_progress" (
    "user_id" VARCHAR(255) NOT NULL,
    "rp_points" INTEGER NOT NULL DEFAULT 0,
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "unlocked_species" JSONB NOT NULL DEFAULT '[]',
    "last_active_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "academy_progress_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "idx_taxonomy_parent_id" ON "taxonomy"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_taxonomy_unique_node" ON "taxonomy"("parent_id", "scientific_name", "rank");

-- CreateIndex
CREATE INDEX "idx_species_taxonomy_status" ON "species"("taxonomy_id", "conservation_status");

-- CreateIndex
CREATE INDEX "idx_species_created_at_desc" ON "species"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_species_media_species_id" ON "species_media"("species_id");

-- CreateIndex
CREATE INDEX "idx_species_locations_lookup" ON "species_locations"("location_id", "species_id");

-- CreateIndex
CREATE INDEX "idx_conservation_history_species" ON "conservation_history"("species_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_favorites_user_id" ON "user_favorites"("user_id");

-- AddForeignKey
ALTER TABLE "taxonomy" ADD CONSTRAINT "taxonomy_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "taxonomy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species" ADD CONSTRAINT "species_taxonomy_id_fkey" FOREIGN KEY ("taxonomy_id") REFERENCES "taxonomy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species_media" ADD CONSTRAINT "species_media_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species_locations" ADD CONSTRAINT "species_locations_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species_locations" ADD CONSTRAINT "species_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conservation_history" ADD CONSTRAINT "conservation_history_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;
