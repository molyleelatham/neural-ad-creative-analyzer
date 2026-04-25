"""Lightweight connection test for Modal + Logfire.

No GPU, no TribeV2, no large downloads — just verifies:
  1. Modal can run a remote function and return a result
  2. Logfire receives a trace from inside the Modal container
  3. HuggingFace secret is accessible

Usage:
  modal run test_connections.py
"""

import modal

app = modal.App("test-connections")

image = modal.Image.debian_slim(python_version="3.11").pip_install([
    "logfire[fastapi]",
    "fastapi",
    "pydantic>=2",
])


@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("huggingface-secret"),
        modal.Secret.from_name("logfire-secret"),
    ],
    timeout=60,
)
def test_all():
    import os

    results = {}

    # ── 1. Modal is working (if you see this, it is) ─────────────────
    results["modal"] = "ok"
    print("[1/3] Modal: ok (this code is running on a remote container)")

    # ── 2. HuggingFace secret ─────────────────────────────────────────
    hf_token = os.environ.get("HUGGING_FACE_HUB_TOKEN", "")
    if hf_token:
        results["huggingface"] = f"ok (token starts with {hf_token[:6]}...)"
        print(f"[2/3] HuggingFace: ok (token: {hf_token[:6]}...)")
    else:
        results["huggingface"] = "MISSING — run: modal secret create huggingface-secret HUGGING_FACE_HUB_TOKEN=hf_..."
        print(f"[2/3] HuggingFace: MISSING")

    # ── 3. Logfire ────────────────────────────────────────────────────
    logfire_token = os.environ.get("LOGFIRE_TOKEN", "")
    if logfire_token:
        try:
            import logfire
            logfire.configure(token=logfire_token)
            logfire.instrument_pydantic()

            # Send a test span
            with logfire.span("test_connection", source="modal_container"):
                logfire.info("hello from Modal", test=True, status="connected")

            # Test Pydantic tracing — this validation will appear in Logfire
            from pydantic import BaseModel, Field

            class TestModel(BaseModel):
                name: str
                score: float = Field(ge=0, le=100)

            m = TestModel(name="connection_test", score=42.0)
            logfire.info("pydantic validation traced", model=m.model_dump())

            results["logfire"] = "ok (span + pydantic trace sent — check your dashboard)"
            print(f"[3/3] Logfire: ok — check your dashboard for 'test_connection' span")
        except Exception as e:
            results["logfire"] = f"ERROR: {e}"
            print(f"[3/3] Logfire: ERROR — {e}")
    else:
        results["logfire"] = "MISSING — run: modal secret create logfire-secret LOGFIRE_TOKEN=..."
        print(f"[3/3] Logfire: MISSING (no LOGFIRE_TOKEN)")

    print()
    return results


@app.local_entrypoint()
def main():
    print("Testing connections to Modal + Logfire + HuggingFace...")
    print("=" * 55)
    print()

    results = test_all.remote()

    print()
    print("=" * 55)
    print("RESULTS:")
    for k, v in results.items():
        status = "PASS" if v.startswith("ok") else "FAIL"
        print(f"  [{status}] {k}: {v}")
