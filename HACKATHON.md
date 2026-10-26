# ArcAnalytics at the Unicorn Mafia to the Americas hackathon

**Shortlisted.**

This is the write-up of the submission. For how the code is laid out, how to run it, and what is still unfinished, see [README.md](README.md).

## The event

The project was entered in the Unicorn Mafia to the Americas hackathon, and it was shortlisted.

The repository does not record the venue, the track, or what "shortlisted" meant in the judging. Commit times below are the timestamps on the commits (UK time, BST). They are not an official event schedule, and they do not say when judging closed.

The first commit, on 22 April 2026, was a two-line README. It called the project arcanalytics and described it as a "to the americas" hackathon submission. Almost everything else landed between the evening of 24 April and the afternoon of 26 April 2026.

## What was submitted

ArcAnalytics took one or two ad creatives, a campaign objective and an audience, and returned a read on the visual parts before media spend. By the last commit on 26 April the repository had:

- **`POST /analyze-full`**, which runs SAM3 segmentation through Roboflow and TribeV2 brain-response scoring on Modal in parallel. If TribeV2 does not answer, the visual result still returns, with a warning.
- **Pillar scoring.** Detected segments are scored into pillars with the weights in `backend/weightings.csv`. Negative weights count as penalties. The campaign objective does not change those weights. It chooses which of the mock scores is treated as the objective score, and that score is what names the winner.
- **An analyse page** with a side-by-side comparison, pillar timeline and brain visualisation, and a dashboard page.
- **Postgres storage** for an analysis and its variants, wired to Render as `arcanalytics-backend`, `arcanalytics-frontend` and `arcanalytics-db`.
- **A written summary**, from a template, or from Pydantic AI when an OpenAI or Gemini key is set.

Two limits were already true that weekend, and they are still true. The purchase, engagement, virality and clarity scores come from a SHA-256 of the file name, and the named winner is picked from those scores. Brain-response numbers exist only when TribeV2 answers. There was no measured accuracy to quote.

The live demo is not recorded in the repository, so this page does not describe what was shown.

## What the commits show

| When (UK) | What landed |
|---|---|
| 22 April, 22:48 | Moly Leelatham: initial README |
| 24 April, 23:55 to 25 April, 12:51 | Joshua Tite: FastAPI skeleton with mock agents and `/compare`, a practice Next.js frontend, Pydantic AI narrative |
| 25 April, 15:30 to 23:43 | Moly: TribeV2 test setup, the `arcanalytics` submodule and Modal deployment, ad scoring, neuromarketing pillars, and a leaky-integrator scorer in `app/scoring/bayesian_scorer.py`. Joshua: Roboflow segmentation and analysis UX (18:24) |
| 26 April, 02:10 to 05:09 | Joshua merged pull request #1 (`feat/practice-frontend`). Moly: SAM3 and TribeV2 in one pipeline, Render config, CORS |
| 26 April, 06:26 to 09:22 | Moly: frontend redesign, Postgres integration, dashboard, build fixes. Cleanup commits removed `modal_app.py` (08:14) and then `app/scoring/bayesian_scorer.py` together with `backend/migrate.py` (08:59) |
| 26 April, 09:31 to 12:35 | Moly: comparison UI, model-status tracking, export and retrieval routes, pillar layout, crash fixes, a working Modal URL |
| 26 April, 16:48 to 17:15 | Moly: Modal and SAM3 pre-warming, database error handling, pillar mapping fixes |
| 27 April, 15:27 | Afterwards. Joshua deleted the example environment file |
| 15 May, 20:58 | Afterwards. `AGENTS.md` added |

## Limits at submission

- No automated tests, apart from the manual database script `test_db_connection.py`.
- No accuracy evaluation and no labelled dataset. The older README's "94%+" line was not backed by code, and it has been removed.
- `/compare`, and the visual scores on `/analyze-full`, use mock neural features from a hash of the file name. TribeV2 is the only source of brain-response data, and only through `/analyze-full`.
- The Bayesian-style chart on the analyse page is calculated in the frontend.
- `render.yaml` already ran `python backend/migrate.py migrate`, but `backend/migrate.py` was not in the repository, so a fresh Render build failed. That script is now in the tree and applies `database/schema.sql`. See the README.
- TribeV2's Modal service lives in the private `arcanalytics` submodule (`molyleelatham/arcanalytic`). There is no `.gitmodules` file, so other people cannot reproduce brain scoring from this repository alone.
- A deployment guide, `HACKATHON_DEPLOY.md`, shipped with the event repo. It used the old clone URL `github.com/molyleelatham/arcanalytics` (that name still redirects here), asked for Python 3.14, and described endpoints the API does not serve. The accurate run and deploy steps are in the README. That guide has been removed so this file is the only hackathon write-up.
