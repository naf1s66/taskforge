# Dev Auth Bypass

This document describes the development-only auth bypass that keeps the TaskForge web app and API usable when the normal session bridge cookie cannot be minted locally.

## Current default

Right now the shared development examples enable the bypass by default:

- `infra/env/web.env.example`
- `infra/env/api.env.example`

That is intentional for the current stage of the project. We are still in development, and local setup should prioritize a working dashboard, task board, and task mutations over strict production auth parity.

## What it does

When `TF_DEV_BYPASS_AUTH=true` and `NODE_ENV` is not `production`:

1. The web app resolves the demo bypass user server-side.
2. It still tries the normal API session bridge first.
3. If the bridge succeeds, the app uses the normal `tf_session` cookie flow.
4. If the bridge fails, the web app mints a short-lived dev-only client token.
5. Browser task and board requests send that token in `x-taskforge-dev-bypass`.
6. The API accepts that token only when the same bypass mode is enabled on the API side.

This keeps the browser authenticated enough to use task endpoints even if:

- `SESSION_BRIDGE_SECRET` is missing locally
- the bridge endpoint is temporarily failing
- local auth infrastructure is only partially configured

## Required env vars

The bypass must be enabled on both apps, and both apps must share the same client secret.

### Web

```env
TF_DEV_BYPASS_AUTH=true
TF_DEV_BYPASS_CLIENT_SECRET=dev-bypass-client-secret
```

### API

```env
TF_DEV_BYPASS_AUTH=true
TF_DEV_BYPASS_CLIENT_SECRET=dev-bypass-client-secret
```

## Local development recommendation

For local Docker and local manual runs, keep these enabled for now:

- `TF_DEV_BYPASS_AUTH=true`
- matching `TF_DEV_BYPASS_CLIENT_SECRET` in web and API

You should still keep the normal bridge settings present as well:

- `SESSION_BRIDGE_SECRET`
- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`

That way the app prefers the real cookie path when available, but it does not become unusable when local auth wiring is incomplete.

## Production expectation

Production should not use this bypass.

For production:

- set `TF_DEV_BYPASS_AUTH=false` or leave it unset
- do not configure `TF_DEV_BYPASS_CLIENT_SECRET`
- rely on the real session bridge and `tf_session` cookie flow

That keeps the user-visible auth state aligned with a real usable API session.

## Why this split exists

Development and production have different goals.

- Development goal: keep engineers unblocked while auth infrastructure is still moving.
- Production goal: only show a user as signed in when the real API session path works end to end.

This bypass is meant to serve the first goal without weakening the second one.
