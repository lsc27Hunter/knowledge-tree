## Run
```
npm run api
```
```
npm run client
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

### Migrations
Generate a migration:
```
cd api
uv run alembic revision --autogenerate -m <migration-name>
```
Be sure to inspect the generated migration file in `api/alembic/versions`.
Then apply the migration:
```
uv run alembic upgrade head
```
Or undo:
```
uv run alembic downgrade -1
```
After undoing a migration, you can delete the migration file.

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