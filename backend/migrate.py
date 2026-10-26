"""Apply database/schema.sql, then ensure the organisation row the API saves under.

Render runs this from the repository root:

    python backend/migrate.py migrate

The script is safe to run again. Tables, indexes and the extension use
IF NOT EXISTS, views are replaced, and triggers are dropped before they
are recreated. Existing columns are left as they are.

/analyze-full saves under a fixed organisation id
(12345678-1234-5678-9abc-123456789abc). This script inserts that row so
the foreign key succeeds on a new database.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

import asyncpg

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "database" / "schema.sql"

# Must match the organisation_id hardcoded in backend/main.py.
DEFAULT_ORG_ID = "12345678-1234-5678-9abc-123456789abc"
DEFAULT_ORG_SLUG = "default"
DEFAULT_ORG_NAME = "Default"


def split_sql(script: str) -> list[str]:
    """Split a SQL script on semicolons, keeping dollar-quoted bodies intact."""
    statements: list[str] = []
    buf: list[str] = []
    i = 0
    n = len(script)
    dollar_tag: str | None = None
    in_single = False
    in_line = False
    in_block = False

    def flush() -> None:
        stmt = "".join(buf).strip()
        buf.clear()
        if _has_sql(stmt):
            statements.append(stmt)

    while i < n:
        ch = script[i]
        nxt = script[i + 1] if i + 1 < n else ""

        if in_line:
            buf.append(ch)
            if ch == "\n":
                in_line = False
            i += 1
            continue

        if in_block:
            buf.append(ch)
            if ch == "*" and nxt == "/":
                buf.append(nxt)
                i += 2
                in_block = False
            else:
                i += 1
            continue

        if dollar_tag is not None:
            if script.startswith(dollar_tag, i):
                buf.append(dollar_tag)
                i += len(dollar_tag)
                dollar_tag = None
            else:
                buf.append(ch)
                i += 1
            continue

        if in_single:
            buf.append(ch)
            if ch == "'":
                if nxt == "'":
                    buf.append(nxt)
                    i += 2
                    continue
                in_single = False
            i += 1
            continue

        if ch == "-" and nxt == "-":
            buf.append(ch)
            buf.append(nxt)
            i += 2
            in_line = True
            continue
        if ch == "/" and nxt == "*":
            buf.append(ch)
            buf.append(nxt)
            i += 2
            in_block = True
            continue
        if ch == "'":
            buf.append(ch)
            in_single = True
            i += 1
            continue
        if ch == "$":
            j = i + 1
            while j < n and (script[j].isalnum() or script[j] == "_"):
                j += 1
            if j < n and script[j] == "$":
                tag = script[i : j + 1]
                buf.append(tag)
                i = j + 1
                dollar_tag = tag
                continue

        if ch == ";":
            buf.append(ch)
            i += 1
            flush()
            continue

        buf.append(ch)
        i += 1

    flush()
    return statements


def _has_sql(stmt: str) -> bool:
    """True when stmt contains something other than comments and whitespace."""
    i = 0
    n = len(stmt)
    dollar_tag: str | None = None
    in_single = False
    while i < n:
        ch = stmt[i]
        nxt = stmt[i + 1] if i + 1 < n else ""
        if dollar_tag is not None:
            if stmt.startswith(dollar_tag, i):
                return True
            i += 1
            continue
        if in_single:
            return True
        if ch == "-" and nxt == "-":
            i = stmt.find("\n", i)
            if i < 0:
                return False
            continue
        if ch == "/" and nxt == "*":
            end = stmt.find("*/", i + 2)
            if end < 0:
                return False
            i = end + 2
            continue
        if ch in " \t\r\n;":
            i += 1
            continue
        return True
    return False


def _database_url() -> str:
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        raise SystemExit(
            "DATABASE_URL is not set. migrate.py needs a Postgres connection string."
        )
    if not url.startswith(("postgresql://", "postgres://")):
        raise SystemExit(
            "DATABASE_URL must start with postgresql:// or postgres://."
        )
    return url


async def apply_schema(conn: asyncpg.Connection) -> int:
    script = SCHEMA_PATH.read_text(encoding="utf-8")
    statements = split_sql(script)
    if not statements:
        raise SystemExit(f"No SQL statements found in {SCHEMA_PATH}")

    async with conn.transaction():
        for index, statement in enumerate(statements, start=1):
            try:
                await conn.execute(statement)
            except Exception as exc:
                preview = " ".join(statement.split())[:240]
                raise RuntimeError(
                    f"Statement {index}/{len(statements)} failed: {exc}\n{preview}"
                ) from exc

        await conn.execute(
            """
            INSERT INTO organizations (id, name, slug)
            VALUES ($1::uuid, $2, $3)
            ON CONFLICT (id) DO NOTHING
            """,
            DEFAULT_ORG_ID,
            DEFAULT_ORG_NAME,
            DEFAULT_ORG_SLUG,
        )
    return len(statements)


async def migrate() -> None:
    if not SCHEMA_PATH.is_file():
        raise SystemExit(f"Schema file not found: {SCHEMA_PATH}")

    try:
        conn = await asyncpg.connect(_database_url())
    except Exception as exc:
        raise SystemExit(f"Could not connect to Postgres: {exc}") from exc

    try:
        try:
            count = await apply_schema(conn)
        except RuntimeError as exc:
            raise SystemExit(str(exc)) from exc
        present = await conn.fetchval(
            "SELECT 1 FROM organizations WHERE id = $1::uuid",
            DEFAULT_ORG_ID,
        )
    finally:
        await conn.close()

    if not present:
        raise SystemExit(
            "Schema applied, but the default organisation row is missing."
        )
    print(f"Applied {count} statements from {SCHEMA_PATH.name}")
    print(f"Default organisation {DEFAULT_ORG_ID} is present")


def main(argv: list[str]) -> int:
    command = argv[1] if len(argv) > 1 else "migrate"
    if command in {"-h", "--help"}:
        print("usage: python backend/migrate.py migrate")
        return 0
    if command != "migrate":
        print(f"Unknown command {command!r}. usage: python backend/migrate.py migrate")
        return 2
    asyncio.run(migrate())
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
