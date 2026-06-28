## Run
`npm run api`

`npm run client`

## Backend API
### Packages
- asyncpg - postgres database driver
- sqlalchemy - ORM
- sqlmodel - plugs data validation into sqlalchemy models
- alembic - migrations

### Adding a package
```
cd api
uv add <package>
```

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