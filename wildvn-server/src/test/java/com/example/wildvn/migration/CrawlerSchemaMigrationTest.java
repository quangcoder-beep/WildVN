package com.example.wildvn.migration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CrawlerSchemaMigrationTest {

    @Test
    void crawlerBootstrapIsOrderedBeforeTheExistingBaselineGuard() throws IOException {
        String bootstrap = resource("db/migration/beforeMigrate.sql");
        String guard = resource("db/migration/V2__baseline_crawler_schema.sql");

        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS taxonomy"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS species"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS ecosystems"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS academy_progress"));
        assertTrue(guard.contains("missing_tables"));
        assertFalse(bootstrap.matches("(?is).*\\b(DROP\\s+(TABLE|TYPE)|TRUNCATE|DELETE\\s+FROM)\\b.*"));
    }

    @Test
    void crawlerBootstrapContainsAllForeignKeyTargetsUsedBySpring() throws IOException {
        String bootstrap = resource("db/migration/beforeMigrate.sql");
        String usersMigration = resource("db/migration/V1__init_users.sql");

        assertTrue(usersMigration.contains("CREATE TABLE users"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS taxonomy"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS species"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS species_media"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS locations"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS species_locations"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS conservation_history"));
        assertTrue(bootstrap.contains("CREATE TABLE IF NOT EXISTS user_favorites"));
    }

    @Test
    void postMigrationBootstrapCoversTheRemainingSpringJpaTables() throws IOException {
        String postMigration = resource("db/migration/afterMigrate.sql");

        assertTrue(postMigration.contains("CREATE TABLE IF NOT EXISTS ranks"));
        assertTrue(postMigration.contains("CREATE TABLE IF NOT EXISTS user_sessions"));
        assertTrue(postMigration.contains("CREATE TABLE IF NOT EXISTS sync_failures"));
        assertTrue(postMigration.contains("CREATE TABLE IF NOT EXISTS search_suggestions_popularity"));
        assertTrue(postMigration.contains("CREATE TABLE IF NOT EXISTS user_affinities"));
        assertFalse(postMigration.matches("(?is).*\\b(DROP\\s+(TABLE|TYPE)|TRUNCATE|DELETE\\s+FROM)\\b.*"));
    }

    private String resource(String path) throws IOException {
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(path)) {
            assertTrue(input != null, "Missing migration resource: " + path);
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
