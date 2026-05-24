"""
HTTP integration tests using FastAPI's TestClient (requires httpx).
Run with: python -m pytest tests/test_api.py -v
or: python tests/test_api.py

Requires: pip install httpx (added to backend/requirements.txt)
"""
import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

try:
    from fastapi.testclient import TestClient
    import httpx  # noqa: F401 — just verify it's installed
except ImportError:
    print("ERROR: httpx not installed. Run:")
    print("  PIP_NO_PROXY='*' pip3 install httpx")
    sys.exit(1)

# Use a fresh in-memory SQLite DB for tests so tests don't touch vibeplan.db
os.environ["VIBEPLAN_TEST_DB"] = "sqlite+aiosqlite:///:memory:"

from backend.main import app

client = TestClient(app, raise_server_exceptions=True)


class TestHealthEndpoint(unittest.TestCase):

    def test_health_returns_ok(self):
        r = client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"status": "ok"})


class TestActivitiesEndpoint(unittest.TestCase):

    def test_returns_200(self):
        r = client.get("/api/activities")
        self.assertEqual(r.status_code, 200)

    def test_returns_list(self):
        r = client.get("/api/activities")
        data = r.json()
        self.assertIsInstance(data, list)

    def test_returns_at_least_75_activities(self):
        r = client.get("/api/activities")
        self.assertGreaterEqual(len(r.json()), 75)

    def test_each_activity_has_required_fields(self):
        r = client.get("/api/activities")
        required = {"id", "title", "summary", "vibes", "estimatedCostMin",
                    "estimatedCostMax", "timeNeeded", "distanceType"}
        for a in r.json():
            for field in required:
                self.assertIn(field, a, f"Activity missing field: {field}")

    def test_ids_are_unique(self):
        r = client.get("/api/activities")
        ids = [a["id"] for a in r.json()]
        self.assertEqual(len(ids), len(set(ids)))


class TestRankEndpoint(unittest.TestCase):

    def test_returns_3_results(self):
        r = client.post("/api/rank", json={"prompt": "chill night"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 3)

    def test_each_result_has_activity_score_reason(self):
        r = client.post("/api/rank", json={"prompt": "adventure $20"})
        for item in r.json():
            self.assertIn("activity", item)
            self.assertIn("score", item)
            self.assertIn("rankingReason", item)

    def test_results_sorted_by_score_descending(self):
        r = client.post("/api/rank", json={"prompt": "chill $15 within 20 min"})
        scores = [item["score"] for item in r.json()]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_budget_prompt_returns_cheap_activities(self):
        r = client.post("/api/rank", json={"prompt": "free stuff no money"})
        top = r.json()[0]
        self.assertLessEqual(top["activity"]["estimatedCostMin"], 5)

    def test_empty_prompt_returns_400_or_results(self):
        # Either empty prompt is handled gracefully or returns results
        r = client.post("/api/rank", json={"prompt": ""})
        self.assertIn(r.status_code, [200, 400, 422])

    def test_missing_prompt_field_returns_422(self):
        r = client.post("/api/rank", json={})
        self.assertEqual(r.status_code, 422)


class TestGroupEndpoints(unittest.TestCase):

    def _create_group(self, prompt: str = "chill tonight $15") -> dict:
        r = client.post("/api/groups", json={"prompt": prompt})
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def test_create_group_returns_200(self):
        r = client.post("/api/groups", json={"prompt": "chill night"})
        self.assertEqual(r.status_code, 200)

    def test_create_group_returns_vp_code(self):
        group = self._create_group()
        self.assertRegex(group["code"], r"^VP-\d{4}$")

    def test_create_group_returns_top_activities(self):
        group = self._create_group()
        self.assertEqual(len(group["topActivities"]), 3)

    def test_create_group_starts_with_no_votes(self):
        group = self._create_group()
        self.assertEqual(group["votes"], [])

    def test_get_group_returns_same_group(self):
        group = self._create_group()
        r = client.get(f"/api/groups/{group['code']}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["code"], group["code"])

    def test_get_nonexistent_group_returns_404(self):
        r = client.get("/api/groups/VP-0000")
        self.assertEqual(r.status_code, 404)

    def test_add_constraint_updates_group(self):
        group = self._create_group()
        r = client.post(f"/api/groups/{group['code']}/constraints", json={
            "memberId": "user-1", "name": "Alice",
            "maxBudget": 10, "maxDistanceMinutes": 15,
        })
        self.assertEqual(r.status_code, 200)
        updated = r.json()
        self.assertEqual(len(updated["constraints"]), 1)
        self.assertEqual(updated["constraints"][0]["name"], "Alice")

    def test_vote_records_and_returns_winning_id(self):
        group = self._create_group()
        winning_activity_id = group["topActivities"][0]["activity"]["id"]
        r = client.post(f"/api/groups/{group['code']}/vote", json={
            "memberId": "user-1",
            "activityId": winning_activity_id,
        })
        self.assertEqual(r.status_code, 200)
        updated = r.json()
        self.assertEqual(updated["winningActivityId"], winning_activity_id)

    def test_vote_upserts_existing_vote(self):
        group = self._create_group()
        acts = group["topActivities"]
        code = group["code"]
        # Vote for first activity
        client.post(f"/api/groups/{code}/vote", json={
            "memberId": "user-1", "activityId": acts[0]["activity"]["id"]
        })
        # Change vote to second activity
        r = client.post(f"/api/groups/{code}/vote", json={
            "memberId": "user-1", "activityId": acts[1]["activity"]["id"]
        })
        updated = r.json()
        self.assertEqual(len(updated["votes"]), 1)  # still only one vote
        self.assertEqual(updated["votes"][0]["activityId"], acts[1]["activity"]["id"])

    def test_improve_plan_without_vote_returns_400(self):
        group = self._create_group()
        r = client.post(f"/api/groups/{group['code']}/improve")
        self.assertEqual(r.status_code, 400)

    def test_improve_plan_after_vote_returns_plan(self):
        group = self._create_group()
        code = group["code"]
        winning_id = group["topActivities"][0]["activity"]["id"]
        client.post(f"/api/groups/{code}/vote", json={
            "memberId": "user-1", "activityId": winning_id,
        })
        r = client.post(f"/api/groups/{code}/improve")
        self.assertEqual(r.status_code, 200)
        plan = r.json()
        self.assertIn("activityTitle", plan)
        self.assertIn("polishedPlan", plan)
        self.assertIn("nearbyOptions", plan)
        self.assertIn("backupPlan", plan)

    def test_missing_prompt_returns_422(self):
        r = client.post("/api/groups", json={})
        self.assertEqual(r.status_code, 422)


if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(suite)

    print("\n" + "=" * 60)
    if result.wasSuccessful():
        print(f"✓ ALL {result.testsRun} HTTP TESTS PASSED — logs are clean")
    else:
        print(f"✗ {len(result.failures)} FAILURES, {len(result.errors)} ERRORS out of {result.testsRun} tests")
        for test, tb in result.failures + result.errors:
            print(f"\nFAILED: {test}")
            print(tb)
    print("=" * 60)
    sys.exit(0 if result.wasSuccessful() else 1)
