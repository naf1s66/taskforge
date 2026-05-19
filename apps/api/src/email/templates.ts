export interface WelcomeTemplateInput {
  appName: string;
  recipientEmail: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderWelcomeTemplate(input: WelcomeTemplateInput) {
  const subject = `Welcome to ${input.appName}`;
  const text = `Welcome to ${input.appName}, ${input.recipientEmail}. Your account is ready.`;
  const html = `<p>Welcome to <strong>${escapeHtml(input.appName)}</strong>, ${escapeHtml(input.recipientEmail)}.</p><p>Your account is ready.</p>`;

  return { subject, text, html };
}


import type { DailyDigestQueryResult } from '../notifications/digest-query-service';

export interface DailyDigestTemplateInput {
  recipientEmail: string;
  digestDate: string;
  digest: DailyDigestQueryResult;
}

export function renderDailyDigestTemplate(input: DailyDigestTemplateInput) {
  const totalItems = input.digest.groups.reduce((sum, group) => sum + group.total, 0);
  const subject = `Your TaskForge daily digest for ${input.digestDate}`;
  const text = [
    `Hi ${input.recipientEmail},`,
    `You have ${totalItems} digest items for ${input.digestDate}.`,
    ...input.digest.groups.map(group => `- ${group.label}: ${group.total}`),
  ].join("\n");

  const htmlGroups = input.digest.groups
    .map(group => `<li><strong>${escapeHtml(group.label)}</strong>: ${group.total}</li>`)
    .join();

  const html = `<p>Hi ${escapeHtml(input.recipientEmail)},</p><p>You have <strong>${totalItems}</strong> digest items for ${escapeHtml(input.digestDate)}.</p><ul>${htmlGroups}</ul>`;

  return { subject, text, html };
}
