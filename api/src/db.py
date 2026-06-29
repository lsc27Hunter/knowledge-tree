# Database connection and database session dependency injection.

from typing import Annotated
from fastapi import Depends
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from env import db_url, on_vercel

if on_vercel:
  # Can't use connection pooling in Vercel's serverless environment.
  connect_args={
    "prepared_statement_cache_size": 0,
  }
  engine = create_async_engine(db_url, echo=True, connect_args=connect_args, poolclass=NullPool)
else:
  engine = create_async_engine(db_url, echo=True)

async def get_session():
  async with AsyncSession(engine) as session:
    yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]