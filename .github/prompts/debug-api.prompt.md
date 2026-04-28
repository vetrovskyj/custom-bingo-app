---
description: "Debug an API issue or data flow problem. Use when something isn't working between the frontend and backend — traces the request from the React component through Axios to the Express route and DB."
argument-hint: "Describe the bug or broken behavior"
agent: agent
tools: [read, search, todo]
---

You are debugging a full-stack issue in the Custom Bingo App.

## Problem

$input

## Debugging Plan

Work through the stack top-to-bottom:

1. **React component**: Read the relevant page in `client/src/pages/`. Check that the Axios call uses the right method, URL, and body shape.
2. **Axios instance**: Confirm `client/src/api/axios.js` has the JWT interceptor configured correctly.
3. **Express route**: Read the matching handler in `server/routes/`. Check middleware order (`auth` before handler), body parsing, and response shape.
4. **Mongoose model**: Verify field names match what the route expects, and that validators won't silently reject data.
5. **Summarize**: Identify the exact root cause and suggest a minimal fix.

Do not suggest adding Socket.io or real-time features — this app is REST-only.
