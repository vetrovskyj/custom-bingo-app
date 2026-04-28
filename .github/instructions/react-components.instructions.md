---
description: "Use when creating or editing React components, pages, hooks, or context files in the client/src folder. Covers component structure, context usage, and UI patterns for this bingo app."
applyTo: "client/src/**/*.{jsx,js}"
---

# React Component Guidelines

## Component Rules

- Functional components only — no class components
- PascalCase filenames matching the component name
- Pages go in `client/src/pages/`, reusable UI in `client/src/components/`

## Required Patterns

```jsx
// ✅ Always use t() for displayed text
const { t } = useContext(LangContext);
<p>{t('someKey')}</p>

// ✅ Always use toast for feedback, never alert()
import toast from 'react-hot-toast';
toast.success(t('saved'));

// ✅ Always use the centralized axios instance
import api from '../api/axios';
const res = await api.get('/bingo');

// ✅ Auth state from context, never re-read localStorage manually
const { user, login, logout } = useContext(AuthContext);
```

## i18n

- All user-facing strings must be keys in `client/src/i18n/translations.js`
- Add both `cs` and `en` translations when adding a new key
- `t(key, { param: value })` supports interpolation

## Forms & Async

- Use `useState` for local form state
- Wrap async handlers in try/catch, show `toast.error()` on catch
- Disable submit buttons while loading to prevent double-submit

## Routing

- Route guards: `PrivateRoute` (requires auth), `PublicRoute` (redirects if logged in), `JoinRoute` (handles invite + unauth)
- Use `useNavigate` for programmatic navigation
