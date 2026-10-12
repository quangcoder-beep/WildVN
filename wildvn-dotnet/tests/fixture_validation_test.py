"""Source fixture checks; add --live for an explicitly configured disposable DB."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from urllib.parse import parse_qs, unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT.parent / "wildvn-server/src/main/resources/db/migration"
SCHEMA = ROOT / "tests/Fixtures/schema.sql"
ORDER = (
    "beforeMigrate.sql", "V0__postgres_extensions.sql", "V1__init_users.sql",
    "V2__baseline_crawler_schema.sql", "V3__academy_completed_expeditions.sql",
    "V4__chat_history.sql", "afterMigrate.sql",
)


class FixtureSourceTests(unittest.TestCase):
    def test_schema_contains_the_exact_runtime_bootstrap_in_order(self):
        schema = SCHEMA.read_text(encoding="utf-8")
        position = 0
        for name in ORDER:
            original = (MIGRATIONS / name).read_text(encoding="utf-8")
            offset = schema.find(original, position)
            self.assertGreaterEqual(offset, position, name)
            position = offset + len(original)
        self.assertNotIn("CREATE TABLE flyway_schema_history", schema)
        self.assertNotIn("CREATE TABLE spring_flyway_schema_history", schema)
        self.assertNotIn("__EFMigrationsHistory", schema)

    def test_restore_and_verify_require_an_explicit_fixture_connection(self):
        for script in ("restore-fixture.sh", "verify-fixture.sh"):
            with self.subTest(script=script):
                env = dict(os.environ)
                env.pop("WILDVN_FIXTURE_CONNECTION", None)
                result = subprocess.run(["bash", str(ROOT / "build" / script)],
                                        env=env, capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("WILDVN_FIXTURE_CONNECTION", result.stderr)

    def test_scripts_refuse_remote_or_non_fixture_databases_before_psql(self):
        for script in ("restore-fixture.sh", "verify-fixture.sh"):
            for uri in (
                "postgresql://remote.example/wildvn_fixture_test",
                "postgresql://127.0.0.1/wildvn",
                "postgresql://127.0.0.1/postgres",
                "postgresql://127.0.0.1/wildvn_fixture_test?host=remote.example",
                "postgresql://127.0.0.1/wildvn_fixture_test?service=production",
                "postgresql://user:synthetic-only@127.0.0.1:5432/wildvn_fixture_test?dbname=wildvn",
                "postgresql://user:synthetic-only@127.0.0.1:5432/wildvn_fixture_test#fragment",
                "postgresql://user:synthetic-only@localhost:5432/wildvn_fixture_test",
                "postgresql://user:synthetic-only@127.0.0.1:not-a-port/wildvn_fixture_test",
                "postgresql://user:synthetic-only@127.0.0.1:99999/wildvn_fixture_test",
                "postgresql://user:synthetic-only@127.0.0.1:5432/wildvn_fixture_../wildvn",
                "postgresql://user:synthetic-only@127.0.0.1:5432/%77ildvn_fixture_test",
                "postgresql://user:synthetic-only@127.0.0.1/wildvn_fixture_test",
                "postgresql://127.0.0.1:5432/wildvn_fixture_test",
                "postgresql://user:synthetic%0Aonly@127.0.0.1:5432/wildvn_fixture_test",
            ):
                with self.subTest(script=script, uri=uri), tempfile.TemporaryDirectory() as temporary:
                    marker = Path(temporary) / "psql-called"
                    fake = Path(temporary) / "psql"
                    fake.write_text(f"#!/bin/sh\ntouch '{marker}'\nexit 0\n", encoding="utf-8")
                    fake.chmod(0o755)
                    env = dict(os.environ, WILDVN_FIXTURE_CONNECTION=uri,
                               PATH=f"{temporary}:{os.environ['PATH']}")
                    result = subprocess.run(["bash", str(ROOT / "build" / script)],
                                            env=env, capture_output=True, text=True)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("Refused", result.stderr)
                    self.assertFalse(marker.exists(), "Unsafe input reached psql")
                    self.assertNotIn("synthetic-only", result.stdout + result.stderr)

    def test_check_connection_accepts_explicit_ipv4_and_ipv6_without_connecting(self):
        for host in ("127.0.0.1", "[::1]"):
            env = dict(os.environ, WILDVN_FIXTURE_CONNECTION=
                       f"postgresql://fixture:synthetic-only@{host}:5432/wildvn_fixture_test")
            result = subprocess.run(["bash", str(ROOT / "build/verify-fixture.sh"), "--check-connection"],
                                    env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertNotIn("synthetic-only", result.stdout + result.stderr)

    def test_environment_overrides_are_removed_before_any_pg_command(self):
        with tempfile.TemporaryDirectory() as temporary:
            marker = Path(temporary) / "pg-environment"
            fake = Path(temporary) / "psql"
            fake.write_text("#!/usr/bin/python3\nimport json, os\n"
                            f"open('{marker}', 'w').write(json.dumps({{k: v for k, v in os.environ.items() "
                            "if k.startswith('PG')}))\nprint('1')\n", encoding="utf-8")
            fake.chmod(0o755)
            env = dict(os.environ, WILDVN_FIXTURE_CONNECTION=
                       "postgresql://fixture:synthetic-only@127.0.0.1:6543/wildvn_fixture_test",
                       PATH=f"{temporary}:{os.environ['PATH']}", PGHOST="remote.example",
                       PGDATABASE="production", PGSERVICE="production", PGHOSTADDR="203.0.113.1",
                       PGOPTIONS="-c search_path=production", PGPASSFILE="/missing/private")
            result = subprocess.run(["bash", str(ROOT / "build/restore-fixture.sh")],
                                    env=env, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("empty", result.stderr)
            import json
            received = json.loads(marker.read_text(encoding="utf-8"))
            self.assertEqual(received["PGHOST"], "127.0.0.1")
            self.assertEqual(received["PGDATABASE"], "wildvn_fixture_test")
            self.assertEqual(received["PGPORT"], "6543")
            self.assertFalse(set(received) & {"PGSERVICE", "PGHOSTADDR", "PGOPTIONS"})
            self.assertEqual(received["PGPASSFILE"], os.devnull)


class FixtureDatabaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        connection = os.environ.get("WILDVN_FIXTURE_CONNECTION")
        if not connection:
            raise RuntimeError("--live requires WILDVN_FIXTURE_CONNECTION")
        uri = urlsplit(connection)
        query = parse_qs(uri.query)
        host = query.get("host", [uri.hostname or ""])[0]
        database = unquote(uri.path.lstrip("/"))
        # All script guards run first, including blocking query parameter overrides.
        preflight = subprocess.run(
            ["bash", str(ROOT / "build/verify-fixture.sh"), "--check-connection"],
            capture_output=True, text=True)
        if preflight.returncode:
            raise RuntimeError(preflight.stderr.strip())
        cls.pg_env = {key: value for key, value in os.environ.items()
                      if not key.startswith("PG")}
        cls.pg_env.update(PGHOST=host, PGDATABASE=database,
                          PGPORT=str(uri.port or query.get("port", [5432])[0]),
                          PGUSER=unquote(uri.username or query.get("user", [os.environ.get("USER", "")])[0]),
                          PGPASSWORD=unquote(uri.password or ""), PGCONNECT_TIMEOUT="5")

    def sql(self, statement, *, succeeds=True):
        result = subprocess.run(
            ["psql", "-X", "--no-password", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement],
            env=self.pg_env, capture_output=True, text=True)
        if succeeds:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, "Expected database constraint rejection")
        return result.stdout.strip()

    def test_seed_counts_and_no_fabricated_migration_history(self):
        expected = {
            "taxonomy": 2, "ecosystems": 2, "species": 4, "species_media": 3,
            "locations": 1, "species_locations": 1, "conservation_history": 1,
            "users": 3, "user_profiles": 1, "user_favorites": 2,
            "academy_progress": 2, "chat_sessions": 2, "chat_messages": 4,
            "ranks": 1, "user_sessions": 1, "sync_failures": 1,
            "search_suggestions_popularity": 1, "user_affinities": 1,
        }
        for table, count in expected.items():
            with self.subTest(table=table):
                self.assertEqual(self.sql(f"SELECT count(*) FROM {table}"), str(count))
        self.assertEqual(self.sql("SELECT to_regclass('public.flyway_schema_history') IS NULL"), "t")
        self.assertEqual(self.sql("SELECT to_regclass('public.spring_flyway_schema_history') IS NULL"), "t")
        self.assertEqual(self.sql("SELECT to_regclass('public.\"__EFMigrationsHistory\"') IS NULL"), "t")

    def test_postgresql_types_preserve_enum_array_jsonb_uuid_and_legacy_text(self):
        checks = {
            ("species", "id"): "uuid",
            ("species", "conservation_status"): "character varying(255)",
            ("species", "habitat_type"): '"HabitatType"[]',
            ("species", "source_references"): "jsonb",
            ("species", "gallery_urls"): "text",
            ("locations", "gallery_urls"): "jsonb",
            ("user_favorites", "user_id"): "character varying(255)",
            ("academy_progress", "user_id"): "character varying(255)",
            ("chat_sessions", "user_id"): "uuid",
            ("chat_sessions", "expires_at"): "timestamp with time zone",
            ("user_affinities", "score"): "numeric(5,4)",
        }
        for (table, column), kind in checks.items():
            with self.subTest(table=table, column=column):
                self.assertEqual(self.sql(
                    "SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a "
                    f"WHERE a.attrelid='public.{table}'::regclass AND a.attname='{column}'"), kind)
        self.assertEqual(self.sql("SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace "
                                  "WHERE t.typtype='e' AND n.nspname='public'"), "14")

    def test_published_soft_deleted_and_draft_species_have_distinct_rows(self):
        self.assertEqual(self.sql("SELECT count(*) FROM species WHERE publish_status='PUBLISHED' AND deleted_at IS NULL"), "2")
        self.assertEqual(self.sql("SELECT count(*) FROM species WHERE publish_status='DRAFT'"), "1")
        self.assertEqual(self.sql("SELECT count(*) FROM species WHERE deleted_at IS NOT NULL"), "1")
        self.assertEqual(self.sql("SELECT habitat_type::text FROM species WHERE slug='fixture-sao-la'"), "{TERRESTRIAL,CANOPY}")
        self.assertEqual(self.sql("SELECT jsonb_array_length(source_references) FROM species WHERE slug='fixture-sao-la'"), "1")
        self.assertEqual(self.sql("SELECT array_length(synonyms,1) FROM species WHERE slug='fixture-sao-la'"), "2")

    def test_legacy_username_keys_and_unicode_json_survive_restore(self):
        self.assertEqual(self.sql("SELECT count(*) FROM user_favorites f JOIN users u ON f.user_id=u.username"), "1")
        self.assertEqual(self.sql("SELECT count(*) FROM user_favorites WHERE user_id='fixture-legacy-unlinked'"), "1")
        self.assertEqual(self.sql("SELECT jsonb_array_length(completed_expeditions) FROM academy_progress WHERE user_id='fixture-reader'"), "1")
        self.assertEqual(self.sql("SELECT count(*) FROM chat_messages WHERE content LIKE '%Việt Nam%'"), "1")
        self.assertEqual(self.sql("SELECT count(DISTINCT type) FROM species_media"), "3")
        self.assertEqual(self.sql("SELECT count(*) FROM users WHERE password_hash LIKE '$argon2id$v=19$m=65536,t=3,p=1$%'"), "1")

    def test_real_foreign_keys_indexes_and_checks_are_retained(self):
        self.assertEqual(self.sql("SELECT count(*) FROM pg_constraint WHERE contype='f' "
                                 "AND connamespace='public'::regnamespace"), "12")
        self.assertEqual(self.sql("SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN "
                                 "('idx_species_taxonomy_status','idx_user_sessions_active',"
                                 "'idx_chat_sessions_expires_at','idx_taxonomy_unique_node')"), "4")
        self.assertEqual(self.sql("SELECT count(*) FROM pg_constraint WHERE contype='f' "
                                 "AND conrelid IN ('user_favorites'::regclass,'academy_progress'::regclass) "
                                 "AND confrelid='users'::regclass"), "0")
        self.sql("BEGIN; INSERT INTO species_media(species_id,type,url) VALUES "
                 "('ffffffff-ffff-ffff-ffff-ffffffffffff','IMAGE','https://example.invalid/no'); ROLLBACK;", succeeds=False)
        self.sql("BEGIN; INSERT INTO chat_messages(session_id,role,content) SELECT id,'system','rejected' "
                 "FROM chat_sessions LIMIT 1; ROLLBACK;", succeeds=False)
        self.sql("BEGIN; INSERT INTO user_favorites SELECT * FROM user_favorites LIMIT 1; ROLLBACK;", succeeds=False)

    def test_restore_refuses_this_nonempty_database_without_changing_data(self):
        before = self.sql("SELECT count(*) FROM species")
        result = subprocess.run(["bash", str(ROOT / "build/restore-fixture.sh")],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("empty", result.stderr)
        self.assertEqual(self.sql("SELECT count(*) FROM species"), before)


if __name__ == "__main__":
    live = "--live" in sys.argv
    if live:
        sys.argv.remove("--live")
    suite = unittest.TestLoader().loadTestsFromTestCase(FixtureSourceTests)
    if live:
        suite.addTests(unittest.TestLoader().loadTestsFromTestCase(FixtureDatabaseTests))
    sys.exit(not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful())
