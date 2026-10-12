import os
import sys
import json
import time
import asyncio
import tempfile
import pytest
import httpx
from typing import List

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from harness.config import PHASE_NAMES, PROMPT_FILES, PROMPTS_DIR, OUTPUTS_DIR
from harness.output_store import OutputStore
from harness.mock_client import MockAPIClient
from harness.prompt_loader import load_system_prompt, load_all_prompts, substitute_variables
from harness.utils import count_tokens, compress_phase_output, build_historical_context, build_cumulative_context

BASE_URL = "http://127.0.0.1:8000"


# ============================================================================
# 1. HARNESS CORE UNIT TESTS
# ============================================================================

class TestHarnessCore:
    def test_all_prompts_exist_and_load(self):
        """Verify that all 13 prompts (0 to 12) exist and load properly."""
        sys_prompt = load_system_prompt()
        assert len(sys_prompt) > 50, "System prompt should be non-empty"

        prompts = load_all_prompts()
        assert len(prompts) == 13, f"Expected 13 prompts, found {len(prompts)}"
        for i in range(13):
            assert i in prompts, f"Prompt {i} missing"
            assert len(prompts[i].template) > 20, f"Prompt {i} template is suspiciously short"

    def test_substitute_variables(self):
        """Verify variable substitution handles present and missing variables safely."""
        template = "Hello {{USER_INPUT}}, previous was {{PREVIOUS_OUTPUT}}. Missing: {{MISSING_VAR}}."
        res = substitute_variables(template, {
            "USER_INPUT": "Drone Tech",
            "PREVIOUS_OUTPUT": "Phase 0 Output"
        })
        assert "Drone Tech" in res
        assert "Phase 0 Output" in res
        assert "{{MISSING_VAR}}" in res, "Unmatched variable placeholders should be preserved safely"

    def test_token_counting(self):
        """Verify token counter accurately approximates token sizes."""
        short_text = "Hello world"
        assert 1 <= count_tokens(short_text) <= 5

        long_text = "word " * 1000
        tokens = count_tokens(long_text)
        assert 900 <= tokens <= 1500

    def test_output_store_persistence(self):
        """Test OutputStore creation, writing, loading, and state saving."""
        with tempfile.TemporaryDirectory() as tmpdir:
            store = OutputStore(session_dir=tmpdir)
            assert os.path.exists(store.session_dir)

            # Test phase output saving
            test_data = {"phase": 0, "title": "Test Invention", "claims": ["Claim 1"]}
            store.save_phase_output(0, json.dumps(test_data), edited=False)

            loaded = store.load_phase_output(0)
            assert loaded is not None
            parsed = json.loads(loaded)
            assert parsed["title"] == "Test Invention"

            # Test cumulative and metadata
            store.rebuild_cumulative()
            assert store.load_cumulative() is not None

            store.save_session_state({
                "completed_phases": [0],
                "current_phase": 1,
                "provider": "mock"
            })
            meta = store.load_session_state()
            assert meta["current_phase"] == 1
            assert meta["provider"] == "mock"

    def test_mock_client_phase_coverage(self):
        """Verify MockAPIClient returns valid JSON for all 13 phases."""
        client = MockAPIClient()
        for phase in range(13):
            phase_name = PHASE_NAMES.get(phase, f"Phase {phase}")
            response = client.chat(
                system_prompt="system",
                user_prompt=f"This is Prompt {phase}: {phase_name}",
                json_mode=True
            )
            assert response is not None
            parsed = json.loads(response)
            assert isinstance(parsed, dict)
            assert parsed.get("phase") == phase or "phase" in parsed or "phase_name" in parsed


# ============================================================================
# 2. API ENDPOINT & BOUNDARY / RESILIENCE TESTS
# ============================================================================

class TestAPIResilience:
    @pytest.mark.asyncio
    async def test_health_and_phases_endpoints(self):
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
            r = await client.get("/api/health")
            assert r.status_code == 200
            assert r.json().get("status") == "ok"

            r2 = await client.get("/api/phases")
            assert r2.status_code == 200
            data = r2.json()
            assert "phases" in data
            assert len(data["phases"]) == 13

    @pytest.mark.asyncio
    async def test_session_creation_edge_cases(self):
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
            # 1. Empty input
            r = await client.post("/api/sessions", json={"user_input": "", "mock": True})
            assert r.status_code == 200
            data = r.json()
            assert "session_id" in data

            # 2. Oversized input (100,000 characters)
            massive_input = "Extremely detailed technical description with claim scope. " * 1800
            r_massive = await client.post("/api/sessions", json={"user_input": massive_input, "mock": True})
            assert r_massive.status_code == 200
            assert "session_id" in r_massive.json()

            # 3. Unicode, emojis, and special chars
            unicode_input = "Patent for 🚀 Quantum-AI Holographic 晶体管 with <script>alert(1)</script> & '\"; --"
            r_unicode = await client.post("/api/sessions", json={"user_input": unicode_input, "mock": True})
            assert r_unicode.status_code == 200
            assert "session_id" in r_unicode.json()

    @pytest.mark.asyncio
    async def test_phase_execution_bounds_and_errors(self):
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
            # Create session
            s_res = await client.post("/api/sessions", json={"user_input": "Test idea", "mock": True})
            session_id = s_res.json()["session_id"]

            # Out of bounds: Phase -1
            r_neg = await client.post(f"/api/sessions/{session_id}/run/-1", json={"referenced_phases": []})
            assert r_neg.status_code in [400, 422, 500]

            # Out of bounds: Phase 99
            r_99 = await client.post(f"/api/sessions/{session_id}/run/99", json={"referenced_phases": []})
            assert r_99.status_code in [400, 404, 500]

            # Non-existent session ID
            r_fake = await client.post("/api/sessions/non-existent-session-id/run/0", json={"referenced_phases": []})
            assert r_fake.status_code == 404

    @pytest.mark.asyncio
    async def test_gate_action_validation(self):
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
            s_res = await client.post("/api/sessions", json={"user_input": "Gate test", "mock": True})
            session_id = s_res.json()["session_id"]

            # Run phase 0
            await client.post(f"/api/sessions/{session_id}/run/0", json={"referenced_phases": []})

            # Valid gate action: edit
            r_edit = await client.post(f"/api/sessions/{session_id}/gate", json={
                "action": "edit",
                "edited_content": json.dumps({"modified": True})
            })
            assert r_edit.status_code == 200
            assert r_edit.json()["action"] == "edited"

            # Valid gate action: feedback
            r_fb = await client.post(f"/api/sessions/{session_id}/gate", json={
                "action": "feedback",
                "feedback": "Make claims narrower"
            })
            assert r_fb.status_code == 200

            # Valid gate action: save exit
            r_exit = await client.post(f"/api/sessions/{session_id}/gate", json={"action": "exit"})
            assert r_exit.status_code == 200
            assert r_exit.json()["action"] == "saved"

    @pytest.mark.asyncio
    async def test_exports_all_formats_with_unicode(self):
        """Stress test export functionality for md, pdf, and docx formats."""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=20.0) as client:
            s_res = await client.post("/api/sessions", json={"user_input": "Export stress test", "mock": True})
            session_id = s_res.json()["session_id"]

            # Run Phase 0
            run_res = await client.post(f"/api/sessions/{session_id}/run/0", json={"referenced_phases": []})
            assert run_res.status_code == 200

            # Test Markdown export
            r_md = await client.get(f"/api/sessions/{session_id}/phase/0/export?format=md")
            assert r_md.status_code == 200
            assert len(r_md.content) > 50
            assert "text/markdown" in r_md.headers.get("content-type", "")

            # Test PDF export (including unicode bullet handling)
            r_pdf = await client.get(f"/api/sessions/{session_id}/phase/0/export?format=pdf")
            assert r_pdf.status_code == 200
            assert len(r_pdf.content) > 100
            assert r_pdf.content.startswith(b"%PDF"), "Must return valid PDF magic bytes"

            # Test DOCX export
            r_docx = await client.get(f"/api/sessions/{session_id}/phase/0/export?format=docx")
            assert r_docx.status_code == 200
            assert len(r_docx.content) > 200
            assert r_docx.content.startswith(b"PK"), "Must return valid ZIP/DOCX magic bytes"

    @pytest.mark.asyncio
    async def test_session_resume_security_and_traversal(self):
        """Verify path traversal attacks and non-existent directories are rejected."""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
            # Traversal attempt
            r_trav = await client.post("/api/sessions/resume", json={"session_dir": "../../../../windows/system32"})
            assert r_trav.status_code in [400, 404, 500]

            # Non-existent directory
            r_none = await client.post("/api/sessions/resume", json={"session_dir": "outputs/does_not_exist_99999"})
            assert r_none.status_code in [404, 500]


# ============================================================================
# 3. HIGH CONCURRENCY LOAD & STRESS TESTING
# ============================================================================

class TestHighConcurrencyStress:
    @pytest.mark.asyncio
    async def test_concurrent_sessions_and_phase_executions(self):
        """Simulate 20 concurrent users launching pipelines and advancing phases."""
        CONCURRENCY = 20
        print(f"\n[LOAD TEST] Launching {CONCURRENCY} concurrent client sessions...")

        start_time = time.time()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
            # 1. Concurrently spawn 20 sessions
            async def create_user_session(i: int):
                res = await client.post("/api/sessions", json={
                    "user_input": f"Concurrent Invention #{i}: High-throughput solid-state battery",
                    "mock": True
                })
                assert res.status_code == 200
                return res.json()["session_id"]

            session_ids = await asyncio.gather(*(create_user_session(i) for i in range(CONCURRENCY)))
            assert len(session_ids) == CONCURRENCY
            print(f"[LOAD TEST] Created {CONCURRENCY} sessions in {time.time() - start_time:.2f}s")

            # 2. Concurrently execute Phase 0 on all 20 sessions
            p0_start = time.time()
            async def run_phase_0(sid: str):
                res = await client.post(f"/api/sessions/{sid}/run/0", json={"referenced_phases": []})
                assert res.status_code == 200
                return res.json()

            results = await asyncio.gather(*(run_phase_0(sid) for sid in session_ids))
            assert len(results) == CONCURRENCY
            for res in results:
                assert "output" in res
                assert res.get("status") in ["awaiting_gate", "success", None]
            print(f"[LOAD TEST] Executed 20 Phase 0 runs concurrently in {time.time() - p0_start:.2f}s")

            # 3. Concurrently submit Gate Acceptance on all 20 sessions
            gate_start = time.time()
            async def accept_gate(sid: str):
                res = await client.post(f"/api/sessions/{sid}/gate", json={"action": "accept"})
                assert res.status_code == 200
                return res.json()

            gate_results = await asyncio.gather(*(accept_gate(sid) for sid in session_ids))
            assert len(gate_results) == CONCURRENCY
            for g in gate_results:
                assert g["next_phase"] == 1
            print(f"[LOAD TEST] Gated and advanced 20 sessions concurrently in {time.time() - gate_start:.2f}s")

            total_elapsed = time.time() - start_time
            reqs_total = CONCURRENCY * 3
            throughput = reqs_total / total_elapsed
            print(f"[LOAD TEST SUMMARY] Total: {reqs_total} requests in {total_elapsed:.2f}s ({throughput:.1f} req/s)")
            assert throughput > 1.0, "Throughput should be healthy under mock execution"
