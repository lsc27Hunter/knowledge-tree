# Test fixtures.

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
os.environ["VAPID_PRIVATE_KEY"] = "test_vapid_private_key"
os.environ["NOTIFICATIONS_SECRET"] = "test_notifications_secret"

from auth import get_current_user_id
from db import get_session
from main import app
from models import Base
from routers.notifications import check_notifications_secret


user_id = "test_user_id"

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
async def client_fixture(session: AsyncSession, monkeypatch: pytest.MonkeyPatch):
  def get_session_override():
    return session

  def get_current_user_id_override():
    return user_id

  def check_notifications_secret_override():
    return None

  # Deck list/detail and friend profiles pull names from Clerk — stub in tests.
  def fake_clerk_profile(uid: str):
    return {
      "username": f"user_{uid}",
      "first_name": "Test",
      "last_name": "User",
      "image_url": f"https://example.com/{uid}.png",
    }

  monkeypatch.setattr("main.get_clerk_user_profile", fake_clerk_profile)
  monkeypatch.setattr("auth.get_clerk_user_profile", fake_clerk_profile)
  monkeypatch.setattr(
    "routers.friends.get_clerk_user_profile",
    fake_clerk_profile,
  )

  app.dependency_overrides[get_session] = get_session_override
  app.dependency_overrides[get_current_user_id] = get_current_user_id_override
  app.dependency_overrides[check_notifications_secret] = check_notifications_secret_override
  
  transport = ASGITransport(app=app)
  async with AsyncClient(transport=transport, base_url="http://test") as client:
    yield client
  
  app.dependency_overrides.clear()