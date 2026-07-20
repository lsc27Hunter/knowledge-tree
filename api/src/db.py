# Database connection and database session dependency injection.

from typing import Annotated
from fastapi import Depends
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from env import db_url, on_vercel

connect_args = {
  # Supabase poolers can fail with prepared statement reuse errors unless
  # asyncpg statement caching is disabled.
  "statement_cache_size": 0,
}

if on_vercel:
  # Can't use connection pooling in Vercel's serverless environment.
  engine = create_async_engine(db_url, echo=True, connect_args=connect_args, poolclass=NullPool)
else:
  engine = create_async_engine(db_url, echo=True, connect_args=connect_args)

async def get_session():
  async with AsyncSession(engine, expire_on_commit=False) as session:
    yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]