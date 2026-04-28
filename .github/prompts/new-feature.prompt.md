---
description: "Scaffold a complete new feature: server-side route + Mongoose updates + React page. Use when adding a new end-to-end feature to the bingo app."
argument-hint: "Describe the feature (e.g. 'allow players to react to bingo cards with emojis')"
agent: agent
tools: [read, edit, search, todo]
---

You are helping implement a full-stack feature in the Custom Bingo App (React 18 + Express 4 + MongoDB).

## Feature Request

$input

## Steps to Follow

1. **Read existing patterns first**: scan `server/routes/bingo.js` and one relevant page in `client/src/pages/` to understand naming and style conventions before writing anything.

2. **Server side**:
   - Add new route(s) to the appropriate file under `server/routes/`
   - Protect with `auth` middleware if the route requires login
   - Update Mongoose model(s) in `server/models/` if schema changes are needed
   - Use the `handleUpload` wrapper for any file-related routes

3. **Client side**:
   - Create or update the page component under `client/src/pages/`
   - Use the centralized Axios instance from `client/src/api/axios.js`
   - Use `toast` from `react-hot-toast` for all user feedback — no `alert()`
   - Use `t()` from `LangContext` for all user-facing strings; add missing keys to `client/src/i18n/translations.js` with both `cs` and `en` values
   - Wire the new page into `client/src/App.jsx` with the correct route guard (`PrivateRoute` / `PublicRoute` / `JoinRoute`)

4. **Final check**: verify there are no hardcoded strings and no direct `fetch` or raw `axios` calls.
