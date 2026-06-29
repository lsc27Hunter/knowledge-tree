# Environment variables, hosting platform, and other environment info.

import os

from dotenv import find_dotenv, load_dotenv

load_dotenv(dotenv_path=find_dotenv(filename='.env.local'))

db_url = os.environ['DATABASE_URL'].replace('://', '+asyncpg://', count=1)

# Environment variable defined by Vercel.
on_vercel = os.getenv('VERCEL') == '1'