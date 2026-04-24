# arcanalytics
to the americas hackathon submission

## Backend

The FastAPI backend under `backend/` uses **Pydantic v2** for request validation and structured JSON responses (enums, nested models, and score bounds), so the compare API returns a consistent, typed `ComparisonResult` for the frontend.

**Logfire** (Pydantic Logfire) is supported for optional live observability: if `LOGFIRE_TOKEN` is set in the environment, the app configures Logfire and instruments FastAPI; without a token, the API runs normally with no Logfire calls required.

Run the API from the repo root: `pip install -r backend/requirements.txt` then `uvicorn backend.main:app --reload` (try `/docs` when it is up).
