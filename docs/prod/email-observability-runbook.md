# Production Email Observability Runbook

Use this runbook during the first production rollout of TaskForge welcome emails and daily digests.

## Daily Review

For each rollout day:

1. Confirm automated Resend alerts are delivering to the chosen monitored destination.
2. Review application logs for `[notifications] Delivery attempt finished`.
3. Review `NotificationDeliveryAttempt` rows for `FAILED` and `SKIPPED` statuses.
4. Compare TaskForge delivery history with Resend logs and quota state.
5. Keep scheduled digest sends disabled or pause them if repeated failures cannot be classified.

## Structured Log Fields

Delivery completion logs include:

- `notificationType`: `WELCOME` or `DAILY_DIGEST`
- `userId`: TaskForge user id
- `deliveryStatus`: `SENT`, `FAILED`, or `SKIPPED`
- `provider`: `smtp` for provider attempts, `system` for configured budget skips
- `providerMessageId`: provider message id when available
- `providerErrorCode`: classified failure code when a send fails
- `retryable`: true for transient/rate-limit failures, false for quota, auth, recipient, and template failures
- `providerResponse`: sanitized provider metadata only; do not log rendered email bodies

## Delivery Status Review

- `SENT`: provider accepted the send and the attempt has a terminal success record.
- `FAILED`: provider or template failure. Inspect `errorCode`, `errorMessage`, and `providerMetadata`.
- `SKIPPED`: no provider send was attempted for this delivery attempt. Inspect `errorCode` and `providerMetadata.skipReason`.
- `PENDING`: in-flight or interrupted attempt. Repeated `PENDING` rows need manual investigation before forcing retries.

## Failure Codes

- `PROVIDER_QUOTA_EXHAUSTED`: stop same-run sends, record later eligible digests as skipped, and wait for the next scheduled/manual run after quota recovers.
- `PROVIDER_RATE_LIMITED`: retryable in a later run after provider conditions recover.
- `PROVIDER_AUTH_FAILED`: check Resend SMTP credentials, sender/domain verification, and deployed secrets before retrying.
- `RECIPIENT_REJECTED`: inspect recipient deliverability without logging or copying rendered email content.
- `TEMPLATE_RENDER_FAILED`: fix the template or digest data path before retrying.
- `PROVIDER_TRANSIENT_FAILURE`: retryable in a later run; repeated transient failures should keep scheduled sends paused.
- `BUDGET_SKIPPED`: configured TaskForge send budget was exhausted before this digest could be sent.

## Post-Production Follow-Up

After the first production rollout:

- Decide whether daily human review is still needed or whether alert-only monitoring is enough.
- Review the default `EMAIL_DAILY_SEND_LIMIT` against actual Resend quota usage.
- Check whether `SKIPPED` and `FAILED` counts need an admin dashboard or exported report.
- Revisit whether a shared rate-limit store is needed if the API runs multiple instances.
