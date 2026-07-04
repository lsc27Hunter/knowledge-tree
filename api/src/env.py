# Environment variables, hosting platform, and other environment info.

import os

from dotenv import find_dotenv, load_dotenv

load_dotenv(dotenv_path=find_dotenv(filename='.env.local'))

# Local dev: use Supabase "Session pooler" URI (IPv4). Direct db.*.supabase.co is IPv6-only.
# Vercel prod: use "Transaction pooler" URI (port 6543) in the Vercel env vars.
db_url = os.environ['DATABASE_URL'].replace('://', '+asyncpg://', count=1)

# Supabase requires SSL on direct connections.
if 'ssl=' not in db_url:
  separator = '&' if '?' in db_url else '?'
  db_url = f'{db_url}{separator}ssl=require'

clerk_secret_key = os.environ['CLERK_SECRET_KEY']

# Comma-separated list of allowed frontend origins (Clerk azp claim).
_clerk_parties = os.getenv('CLERK_AUTHORIZED_PARTIES', 'http://localhost:5173')
clerk_authorized_parties = [party.strip() for party in _clerk_parties.split(',') if party.strip()]

# Environment variable defined by Vercel.
on_vercel = os.getenv('VERCEL') == '1'