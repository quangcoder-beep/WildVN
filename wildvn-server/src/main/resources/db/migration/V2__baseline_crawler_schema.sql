-- Immutable baseline guard for the crawler schema already provisioned in PostgreSQL.
-- The imported database is the source of truth for existing rows; this migration
-- deliberately performs no DROP/ALTER/DELETE. It only prevents a Spring deploy
-- from silently starting against a partial schema.
DO $$
DECLARE
    missing_tables text[];
BEGIN
    SELECT ARRAY(
        SELECT required.table_name
        FROM (VALUES
            ('taxonomy'),
            ('species'),
            ('species_media'),
            ('locations'),
            ('species_locations'),
            ('conservation_history'),
            ('ecosystems'),
            ('user_favorites'),
            ('academy_progress')
        ) AS required(table_name)
        WHERE to_regclass('public.' || required.table_name) IS NULL
    ) INTO missing_tables;

    IF cardinality(missing_tables) > 0 THEN
        RAISE EXCEPTION
            'WildVN crawler schema baseline is incomplete; missing tables: %',
            array_to_string(missing_tables, ', ');
    END IF;
END $$;
