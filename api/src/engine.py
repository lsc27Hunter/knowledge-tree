# Provide an existing SQLAlchemy engine, or create a new one.

from dataclasses import dataclass

from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from env import db_url, on_vercel

@dataclass
class EngineProvider:
  engine: AsyncEngine | None = None

  def get_engine(self):
    if self.engine is None:
      self.engine = _new_engine()
    return self.engine

_engine_provider = EngineProvider()

def get_engine():
  return _engine_provider.get_engine()
  
def _new_engine():
  if on_vercel:
    # Can't use connection pooling in Vercel's serverless environment.
    connect_args={
      "prepared_statement_cache_size": 0,
    }
    return create_async_engine(db_url, echo=True, connect_args=connect_args, poolclass=NullPool)
  else:
    return create_async_engine(db_url, echo=True)