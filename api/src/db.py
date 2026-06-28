from typing import Annotated
from fastapi import Depends
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from env import db_url, on_vercel

if on_vercel:
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