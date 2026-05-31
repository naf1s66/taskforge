# Dev Auth Bypass

This document describes the development-only auth bypass that keeps the TaskForge web app and API usable when the normal session bridge cookie cannot be minted locally.

## Current default

The shared development examples keep the bypass disabled by default:

- `infra/env/web.env.example`
- `infra/env/api.env.example`

That default keeps local Docker aligned with the normal session bridge path. We are still in development, so the bypass remains available when local auth wiring blocks the dashboard, task board, or task mutations.

The bypass is also intended for short-lived Codex Cloud PR previews so automation can open the app and attach screenshots after code changes. It should not be treated as a staging or production authentication mode.

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

For local Docker and local manual runs, prefer the normal session bridge path first. If local auth wiring is incomplete, enable these together in both apps:

- `TF_DEV_BYPASS_AUTH=true`
- matching `TF_DEV_BYPASS_CLIENT_SECRET` in web and API

You should still keep the normal bridge settings present as well:

- `SESSION_BRIDGE_SECRET`
- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`

That way the app can remain usable when local auth wiring is incomplete without making bypass mode the default path.

## Production expectation

Production should not use this bypass.

For production:

- set `TF_DEV_BYPASS_AUTH=false` or leave it unset
- do not configure `TF_DEV_BYPASS_CLIENT_SECRET`
- rely on the real session bridge and `tf_session` cookie flow

That keeps the user-visible auth state aligned with a real usable API session.

## Why this split exists

Development and production have different goals.

- Development and preview goal: keep engineers and Codex Cloud screenshot automation unblocked while auth infrastructure is still moving.
- Production goal: only show a user as signed in when the real API session path works end to end.

This bypass is meant to serve the first goal without weakening the second one.
