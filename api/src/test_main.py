# https://fastapi.tiangolo.com/tutorial/testing
# https://fastapi.tiangolo.com/advanced/testing-dependencies
# https://fastapi.tiangolo.com/advanced/async-tests
# https://sqlmodel.tiangolo.com/tutorial/fastapi/tests

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from testcontainers.postgres import PostgresContainer

# Override environment variables to prevent crashing when env is imported.
os.environ["DATABASE_URL"] = "postgresql://"
os.environ["CLERK_SECRET_KEY"] = "test_clerk_secret_key"

from auth import get_current_user_id
from db import get_session
from main import app
from models import Base

user_id = "test_user_id"

# Tests

async def test_create_deck(client: AsyncClient):
  response = await client.post(
    "/api/decks",
    json={
      "name": "test name",
      "description": "test description",
      "cards": [
        {
          "question": "test question",
          "answer": "test answer",
        },
      ],
    },
  )
  data = response.json()

  assert response.status_code == 200
  assert data["name"] == "test name"
  assert data["description"] == "test description"
  assert data["id"] is not None

# Fixtures

# https://anyio.readthedocs.io/en/stable/testing.html#using-async-fixtures-with-higher-scopes
@pytest.fixture(scope="session")
def anyio_backend():
  return "asyncio"

# Initialize and connect to postgres running in Docker.
@pytest.fixture(name="engine", scope="session")
async def engine_fixture():
  with PostgresContainer("postgres:16", driver="asyncpg") as postgres:
    engine = create_async_engine(postgres.get_connection_url())
    async with engine.begin() as conn:
      await conn.run_sync(Base.metadata.create_all)
      
    yield engine

# Provide a session that rolls back database changes after each test.
# https://docs.sqlalchemy.org/en/21/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites
@pytest.fixture(name="session")
async def session_fixture(engine: AsyncEngine):
  async with engine.connect() as connection:
    transaction = await connection.begin()
    
    async with AsyncSession(
      bind=connection,
      join_transaction_mode="create_savepoint",

      # Ensure database model data sticks around even after committing so we
      # can check it in tests.
      expire_on_commit=False,
    ) as session:
      yield session
    
    await transaction.rollback()

@pytest.fixture(name="client")
async def client_fixture(session: AsyncSession):
  def get_session_override():
    return session

  def get_current_user_id_override():
    return user_id

  app.dependency_overrides[get_session] = get_session_override
  app.dependency_overrides[get_current_user_id] = get_current_user_id_override
  
  transport = ASGITransport(app=app)
  async with AsyncClient(transport=transport, base_url="http://test") as client:
    yield client
  
  app.dependency_overrides.clear()
