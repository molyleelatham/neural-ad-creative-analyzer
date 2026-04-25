# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "pydantic-ai>=1.87.0",
#     "python-dotenv>=1.0.1",
# ]
# ///
from datetime import date
from pathlib import Path

import logfire
from dotenv import load_dotenv
from pydantic import BaseModel
from pydantic_ai import Agent

load_dotenv(Path(__file__).resolve().parent / ".env")

logfire.configure(service_name='pai-pydantic-simple', send_to_logfire='if-token-present')
logfire.instrument_pydantic_ai()


class Person(BaseModel):
    name: str
    dob: date
    city: str


agent = Agent(
    'gateway/openai:gpt-4.1',
    output_type=Person,
    instructions='Extract information about the person',
)
result = agent.run_sync("Samuel lived in London and was born on Jan 28th '87")
logfire.info(f'{result.output=}')