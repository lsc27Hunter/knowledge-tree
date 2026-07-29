import asyncio
import sys

from httpx import AsyncClient

from env import notifications_secret

async def main():
  try:
    base_url = sys.argv[1]
  except IndexError:
    print("error: expected API base URL as command-line argument")
    exit()
  async with AsyncClient(base_url=base_url) as client:
    res = await client.post(
      url="/api/notifications/send",
      headers={
        "Authorization": f"Bearer {notifications_secret}"
      },
    )
    body = res.json()
    print("Sent:", body["sent"])
    print("Expired or invalid subscriptions:", body["expiredOrInvalid"])

if __name__ == "__main__":
  asyncio.run(main())