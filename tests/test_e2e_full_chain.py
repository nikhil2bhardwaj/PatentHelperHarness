import pytest
import httpx
import json

BASE_URL = "http://127.0.0.1:8000"

@pytest.mark.asyncio
async def test_full_13_phase_pipeline_chain():
    """Execute all 13 phases (0 to 12) sequentially, simulating end-to-end patent drafting."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        # 1. Start session
        res = await client.post("/api/sessions", json={
            "user_input": "An autonomous drone docking station with wireless inductive resonance charging and edge thermal monitoring",
            "mock": True
        })
        assert res.status_code == 200
        session_id = res.json()["session_id"]

        for phase in range(13):
            # Run phase
            run_res = await client.post(f"/api/sessions/{session_id}/run/{phase}", json={"referenced_phases": []})
            assert run_res.status_code == 200, f"Phase {phase} failed with {run_res.text}"
            data = run_res.json()
            assert "output" in data
            assert len(data["output"]) > 50

            # Approve review gate
            gate_res = await client.post(f"/api/sessions/{session_id}/gate", json={"action": "accept"})
            assert gate_res.status_code == 200
            gate_data = gate_res.json()
            assert gate_data["action"] == "accepted"
            if phase < 12:
                assert gate_data["next_phase"] == phase + 1
            else:
                assert gate_data["completed"] is True

        # 3. Verify cumulative output
        cum_res = await client.get(f"/api/sessions/{session_id}/cumulative")
        assert cum_res.status_code == 200
        cum_content = cum_res.json().get("content", "")
        assert len(cum_content) > 500, "Cumulative output should contain full multi-phase content"

        # 4. Verify exports
        md_export = await client.get(f"/api/sessions/{session_id}/phase/12/export?format=md")
        assert md_export.status_code == 200
        pdf_export = await client.get(f"/api/sessions/{session_id}/phase/12/export?format=pdf")
        assert pdf_export.status_code == 200
        docx_export = await client.get(f"/api/sessions/{session_id}/phase/12/export?format=docx")
        assert docx_export.status_code == 200
        assert docx_export.content.startswith(b"PK")
