"""Source-backed, offline migration contract checks (never calls WildVN APIs)."""
import json
from pathlib import Path
import re
import unittest


MIGRATION = Path(__file__).resolve().parents[1]
REPOSITORY = MIGRATION.parent
SERVER = REPOSITORY / "wildvn-server/src/main/java/com/example/wildvn"


class ContractSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = json.loads((MIGRATION / "tests/Fixtures/api-contracts.json").read_text())

    def test_every_existing_page_has_a_source_and_explicit_runtime_status(self):
        actual = {str(path.relative_to(REPOSITORY)) for path in (REPOSITORY / "wildvn-client/app").rglob("page.tsx")}
        pages = self.snapshot["pages"]
        self.assertEqual(actual, {page["source"] for page in pages})
        self.assertEqual(len(actual), len(pages))
        for page in pages:
            self.assertIn(page["runtime_status"], ["đã xác minh", "chưa xác minh", "placeholder"])
            self.assertTrue(page["data_source"])
            self.assertTrue(page["access"])
            self.assertTrue(page["source_paths"])

    def test_placeholder_and_flashcard_states_are_not_invented_features(self):
        pages = {page["route"]: page for page in self.snapshot["pages"]}
        for route in ["/forgot-password", "/reset-password", "/academy/expeditions/{slug}"]:
            self.assertEqual("placeholder", pages[route]["runtime_status"])
        self.assertEqual("flashcard", pages["/academy/arena"]["capability"])
        self.assertFalse(self.snapshot["capabilities"]["quiz"]["implemented"])
        self.assertFalse(self.snapshot["capabilities"]["ml_service"]["implementation_in_repository"])

    def test_all_spring_controller_endpoints_have_samples(self):
        actual = set()
        for source in SERVER.rglob("*Controller.java"):
            code = source.read_text()
            base = re.search(r'@RequestMapping\("([^"]+)"\)', code)
            if not base:
                continue
            for method, arguments in re.findall(r"@(Get|Post|Delete|Put|Patch)Mapping(?:\(([^\n]*)\))?", code):
                suffix = re.search(r'"([^"]+)"', arguments)
                actual.add((method.upper(), base[1] + (suffix[1] if suffix else "")))
        endpoints = self.snapshot["endpoints"]
        self.assertEqual(actual, {(item["method"], item["path"]) for item in endpoints})
        self.assertEqual(len(actual), len(endpoints))
        for endpoint in endpoints:
            self.assertIn(endpoint["response"]["status"], [200, 201, 204])
            self.assertEqual(endpoint["method"], endpoint["request"]["method"])
            self.assertTrue(endpoint["source_paths"])
            self.assertEqual("source-derived; runtime unverified", endpoint["evidence"])

    def test_references_exist_and_inventory_links_every_page(self):
        inventory = (MIGRATION / "docs/feature-inventory.md").read_text()
        contracts = (MIGRATION / "docs/api-contracts.md").read_text()
        for group in ["pages", "endpoints"]:
            for item in self.snapshot[group]:
                for source in item["source_paths"]:
                    self.assertTrue((REPOSITORY / source).is_file(), source)
        for page in self.snapshot["pages"]:
            self.assertIn(page["source"], inventory)
        for marker in ["AuthResponse", "ApiResponse", "ErrorResponse", "text/event-stream", "XSRF-TOKEN", "chưa xác minh"]:
            self.assertIn(marker, contracts)

    def test_response_families_keep_auth_error_sse_and_envelope_separate(self):
        by_path = {(e["method"], e["path"]): e for e in self.snapshot["endpoints"]}
        login = by_path[("POST", "/api/auth/login")]["response"]
        self.assertEqual("auth", login["family"])
        self.assertNotIn("success", login["body"])
        self.assertIsNone(login["body"]["accessToken"])
        self.assertIsNone(login["body"]["refreshToken"])
        self.assertIsNone(by_path[("POST", "/api/auth/logout")]["response"]["body"])
        sse = by_path[("POST", "/api/chat/stream")]["response"]
        self.assertEqual("text/event-stream", sse["content_type"])
        self.assertEqual(["token", "done"], [event["event"] for event in sse["events"]])
        self.assertNotIn("success", sse["events"][1]["data"])
        for error in self.snapshot["errors"]:
            if error["family"] == "error":
                self.assertEqual({"timestamp", "status", "error", "message", "path"}, set(error["body"]))
                self.assertNotIn("success", error["body"])

    def test_visibility_policies_preserve_source_specific_rules(self):
        visibility = self.snapshot["visibility"]
        self.assertEqual(False, visibility["species_catalog"]["requires_published"])
        self.assertEqual(True, visibility["species_catalog"]["excludes_deleted"])
        self.assertEqual(True, visibility["academy_sync"]["requires_published"])
        self.assertEqual(False, visibility["ecosystem_detail_species"]["excludes_deleted"])
        self.assertEqual({"DRAFT", "PUBLISHED", "DELETED"}, {row["state"] for row in visibility["synthetic_cases"]})

    def test_search_get_side_effects_and_toggle_retry_are_explicit(self):
        endpoints = {(e["method"], e["path"]): e for e in self.snapshot["endpoints"]}
        for path in ["/api/search", "/api/search/semantic", "/api/search/hybrid"]:
            self.assertIn("trackSearch", endpoints[("GET", path)]["side_effects"])
            self.assertFalse(endpoints[("GET", path)]["safe_to_replay"])
        self.assertFalse(endpoints[("POST", "/api/favorites")]["safe_to_replay"])

    def test_fixtures_are_synthetic_and_do_not_contain_credentials(self):
        self.assertEqual("synthetic/source-derived; not production captures", self.snapshot["provenance"])
        serialized = json.dumps(self.snapshot)
        self.assertNotRegex(serialized, r"AIza[0-9A-Za-z_-]{20,}|-----BEGIN .*PRIVATE KEY|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.")
        self.assertNotRegex(serialized, r'"(?:client_secret|clientSecret|signingKey)"\s*:')
        self.assertEqual("wildvn-auth-token", self.snapshot["auth"]["cookie"]["name"])
        self.assertEqual("X-XSRF-TOKEN", self.snapshot["auth"]["csrf"]["header"])
        self.assertEqual(["/api/auth/**"], self.snapshot["auth"]["csrf"]["exemptions"])

    def test_dto_field_snapshots_match_java_declarations(self):
        for name, dto in self.snapshot["dtos"].items():
            code = (REPOSITORY / dto["source"]).read_text()
            if "public record " in code:
                fields = re.search(r"public record \w+\((.*?)\)\s*\{", code, re.S)[1]
                actual = set(re.findall(r"\b(\w+)\s*(?:,|$)", fields.strip()))
            else:
                # AuthResponse contains a nested profile; snapshot the nested DTO separately.
                if name == "AuthResponse":
                    code = code.split("public static class UserProfileDto")[0]
                elif name == "UserProfileDto":
                    code = code.split("public static class UserProfileDto")[1]
                actual = set(re.findall(r"private\s+[\w<>\[\], ?]+\s+(\w+)\s*;", code))
            self.assertEqual(actual, set(dto["fields"]), name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
