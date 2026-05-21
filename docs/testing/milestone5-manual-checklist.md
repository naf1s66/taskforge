# Milestone 5 Manual Checklist

Use this checklist before enabling real email sends in any shared environment.

- [ ] MailHog receives local welcome emails.
- [ ] Digest dry run reports attempted, sent, skipped, failed, and skip reason counts.
- [ ] Digest dry run does not create `NotificationDelivery` or `NotificationDeliveryAttempt` records.
- [ ] Protected API job endpoint rejects missing or incorrect `DIGEST_JOB_SECRET`.
- [ ] Web cron proxy rejects missing or incorrect `CRON_SECRET`.
- [ ] Users with disabled digest preferences, unverified email, placeholder email domains, or off-hour preferences are skipped.
- [ ] Re-running the same digest date does not send duplicate emails to users with `SENT` or `PENDING` attempts.
- [ ] Budget exhaustion reports `budgetSkipped` and does not exceed the configured send limit.
- [ ] First production schedule is confirmed with a dry run before real sends are enabled.
