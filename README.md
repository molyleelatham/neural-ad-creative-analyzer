# arcanalytics
to the americas hackathon submission

## Backend

The FastAPI backend under `backend/` uses **Pydantic v2** for request validation and structured JSON responses (enums, nested models, and score bounds), so the compare API returns a consistent, typed `ComparisonResult` for the frontend.

**Logfire** (Pydantic Logfire) is supported for optional live observability: if `LOGFIRE_TOKEN` is set in the environment, the app configures Logfire and instruments FastAPI; without a token, the API runs normally with no Logfire calls required.

**Pydantic AI** (optional): `/compare` can call a small agent for validated `explanation` and `recommendations` when you set **`OPENAI_API_KEY`** (OpenAI) and/or **`GOOGLE_API_KEY`** (Gemini via [AI Studio](https://aistudio.google.com/apikey)). If `PYDANTIC_AI_MODEL` is unset, defaults are `openai:gpt-4o-mini` when only OpenAI is configured, or `google-gla:gemini-2.0-flash` when `GOOGLE_API_KEY` is set (override full id with `PYDANTIC_AI_MODEL`, or set `GEMINI_MODEL` for a Gemini-only default string). Mock scores stay as-is until you replace the agents. With `LOGFIRE_TOKEN` set, Logfire also instruments Pydantic AI alongside FastAPI.

Run the API from the repo root: `pip install -r backend/requirements.txt` then `uvicorn backend.main:app --reload` (try `/docs` when it is up).

Optional secrets: create **`.env`** in the **repo root** (next to `README.md`) or in **`backend/.env`**. If both exist, `backend/.env` wins for duplicate keys. Gitignored. Examples: `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_MODEL`, `PYDANTIC_AI_MODEL`, `LOGFIRE_TOKEN`. Loaded on startup before the rest of the app imports.

If Gemini narrative “does nothing” (responses still look like short templates), watch the **uvicorn terminal**: failed LLM runs log `Pydantic AI narrative skipped …` with the error (e.g. invalid key, model name, or quota).
