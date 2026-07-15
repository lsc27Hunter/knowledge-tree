# Database connection and database session dependency injection.

from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from engine import get_engine

async def get_session():
  engine = get_engine()
  async with AsyncSession(engine) as session:
    yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]