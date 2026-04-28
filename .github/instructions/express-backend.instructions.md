---
description: "Use when creating or editing Express routes, Mongoose models, middleware, or any server-side code. Covers auth middleware, upload handling, error patterns, and CORS setup."
applyTo: "server/**/*.js"
---

# Express / Mongoose Backend Guidelines

## Route Structure

All routes must be grouped under:
- `/api/auth` — authentication (login, register, me, password reset)
- `/api/bingo` — game management

## Auth Middleware

Protect endpoints with `auth` middleware:

```js
const auth = require('../middleware/auth');
router.get('/protected', auth, async (req, res) => {
  // req.user is the authenticated user document
});
```

## File Uploads

Always use the `handleUpload` wrapper — never call `multer` middleware raw:

```js
const { handleUpload, upload } = require('../middleware/upload');

router.post('/upload', (req, res) => {
  handleUpload(upload.single('file'), req, res, async () => {
    // req.file is available here
  });
});
```

## Error Handling

```js
// Standard error response shape
res.status(400).json({ message: 'Descriptive error' });
res.status(500).json({ message: 'Server error' });

// Never leak stack traces to the client
try { ... } catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
}
```

## Mongoose Patterns

- Models: PascalCase in `server/models/` (e.g. `BingoGame`, `User`)
- Use `lean()` for read-only queries where possible
- `user.toJSON()` strips the `password` field — use it in auth responses
- Invite codes: `uuidv4().slice(0, 8).toUpperCase()`

## Security

- Never expose `password` or `__v` in responses
- Validate `req.body` fields before saving to DB
- CORS origin whitelist is managed via `ALLOWED_ORIGINS` env var — do not hardcode origins
