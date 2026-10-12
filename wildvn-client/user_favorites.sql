CREATE TABLE "user_favorites" (
    "user_id" VARCHAR(255) NOT NULL,
    "species_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("user_id", "species_id")
);

CREATE INDEX "idx_user_favorites_user_id" ON "user_favorites"("user_id");

ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;
