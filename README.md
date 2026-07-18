## Run
```
npm run api
```
```
npm run client
```

## Generate bindings to the backend API
When you run the frontend, API bindings will be generated in `client/src/api`.

You can access them like this:
``` ts
import { createCard } from "./api";

async function addCard(deckId: number, question: string, answer: string) {
  const res = await createCard({
    path: {
      deckId,
    },
    body: {
      question,
      answer,
    },
  });
}
```

## Backend API
### Packages
- asyncpg - postgres database driver
- sqlalchemy - ORM
- alembic - migrations

### Adding a package
```
cd api
uv add <package>
```

### Testing
Backend tests will run on every push to GitHub.

To run tests locally, you must have Docker installed and running. Then:
```
cd api
uv run pytest
```

### Database (Supabase) connection

**Local `.env.local`** — use the **Session pooler** string (IPv4), not Direct connection:

```
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

Get it from Supabase Dashboard → **Connect** → **Session pooler** → URI.

Direct connection (`db.[project-ref].supabase.co`) is IPv6-only. On most home/campus Wi‑Fi you will get `getaddrinfo failed` — that is a network issue, not a bad password.

**Vercel prod** — keep the **Transaction pooler** string (port `6543`) in Vercel env vars.

### Run migrations
Run migrations locally:

```
cd api
uv run alembic upgrade head
```

Undo:

```
uv run alembic downgrade -1
```
You can delete an unwanted migration file after downgrading.

### Generate a new migration
```
cd api
uv run alembic revision --autogenerate -m <migration-name>
```
**Inspect the generated migration file in `api/alembic/versions` before running it.**

Migration files must be committed.

## Start both servers
Cmd/Ctrl + Shift + B to start both servers after adding this `.vscode/tasks.json`:

```jsonc
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start",
      "dependsOn": [
        "Client",
        "Api"
      ],

      // Allows Cmd/Ctrl + Shift + B shortcut.
      "group": {
        "kind": "build",
        "isDefault": true
      },
      
      "problemMatcher": []
    },
    {
      "label": "Client",
      "type": "shell",
      "command": "npm run client",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Api",
      "type": "shell",
      "command": "npm run api",
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
```

If the terminal process terminates, you can restart it with Cmd/Ctrl + Shift + R.