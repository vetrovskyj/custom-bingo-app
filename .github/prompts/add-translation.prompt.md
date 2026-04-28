---
description: "Add i18n translation keys. Use when adding any new user-facing text to the bingo app — adds the key to translations.js with both Czech and English values."
argument-hint: "Describe what text needs to be added (e.g. 'error message for duplicate invite code')"
agent: agent
tools: [read, edit, search]
---

You are adding a new i18n translation key to the Custom Bingo App.

## Task

$input

## Steps

1. Read `client/src/i18n/translations.js` to understand the existing key structure.
2. Choose a concise camelCase key name that fits the existing naming pattern.
3. Add the key to **both** the `cs` and `en` objects.
4. If the request came from a component, update that component to use `t('newKey')` instead of the hardcoded string.

## Rules

- Czech (`cs`) is the primary language — write natural Czech, not a literal translation
- English (`en`) should be natural English
- Never duplicate an existing key; search for it first
- Keep keys grouped by feature/page context (check how existing keys are grouped)
