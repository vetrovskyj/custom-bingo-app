# Browser MCP Setup (VS Code + Playwright)

This project can expose a browser automation MCP server so GitHub Copilot can navigate and test the app directly.

## What this gives you

- Open and control a real browser session from chat
- Reproduce UI issues faster
- Collect screenshots, console messages, and network failures while debugging

## 1) Prerequisites

Install frontend dependencies and Playwright browser binaries:

```powershell
cd client
npm install
$env:PLAYWRIGHT_BROWSERS_PATH = "D:\custom-bingo-app\.cache\ms-playwright"
npx playwright install chromium
```

The MCP config in this repository already points Playwright to `D:/custom-bingo-app/.cache/ms-playwright` so browser binaries do not consume space on drive C.

## 2) MCP server config

The workspace already includes a VS Code MCP config at `.vscode/mcp.json` that starts Playwright MCP over stdio.

Server name: `playwright`

## 3) Run the app locally

Start backend and frontend in separate terminals.

Backend:

```powershell
cd server
npm install
node server.js
```

Frontend:

```powershell
cd client
npm run dev
```

Default local frontend URL is usually `http://localhost:5173`.

## 4) Reload VS Code

After creating or changing `.vscode/mcp.json`, reload VS Code window so the MCP server is discovered.

## 5) Example requests to use in chat

- "Open localhost:5173 and screenshot the login page"
- "Try logging in and tell me any console or network errors"
- "Create a bingo game and verify it appears on dashboard"

## Security notes

- Keep MCP local to your machine.
- Do not pass secrets through prompts.
- Playwright MCP is constrained to the workspace roots by default.

## Troubleshooting

- If browser launch fails, run `npx playwright install chromium` again in `client`.
- If you see ENOSPC / no space left on device, confirm that `PLAYWRIGHT_BROWSERS_PATH` points to a drive with enough free space.
- If MCP server does not appear, check JSON syntax in `.vscode/mcp.json` and reload the window.
- If app pages fail to load, verify backend is running and `client/.env` API base URL is correct.
