import type { DailyDigestQueryResult } from '../notifications/digest-query-service';

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

export interface DailyDigestTemplateInput {
  recipientEmail: string;
  digestDate: string;
  digest: DailyDigestQueryResult;
}

export function renderDailyDigestTemplate(input: DailyDigestTemplateInput) {
  const totalTasks = input.digest.totalTasksConsidered;
  const subject = `Your TaskForge daily digest for ${input.digestDate}`;
  const text = [
    `Hi ${input.recipientEmail},`,
    `You have ${totalTasks} task${totalTasks === 1 ? '' : 's'} in your digest for ${input.digestDate}.`,
    ...input.digest.groups.flatMap(group => [
      '',
      `${group.label}: ${group.total}`,
      ...group.tasks.map(task => {
        const due = task.dueDate ? ` due ${task.dueDate.slice(0, 10)}` : '';
        const tags = task.tags.length > 0 ? ` [${task.tags.join(', ')}]` : '';
        return `- ${task.title} (${task.status}, ${task.priority})${due}${tags}`;
      }),
    ]),
  ].join('\n');

  const htmlGroups = input.digest.groups
    .map(group => {
      const tasks = group.tasks
        .map(task => {
          const due = task.dueDate ? ` due ${escapeHtml(task.dueDate.slice(0, 10))}` : '';
          const tags = task.tags.length > 0 ? ` [${escapeHtml(task.tags.join(', '))}]` : '';
          return `<li>${escapeHtml(task.title)} (${escapeHtml(task.status)}, ${escapeHtml(task.priority)})${due}${tags}</li>`;
        })
        .join('');
      return `<li><strong>${escapeHtml(group.label)}</strong>: ${group.total}<ul>${tasks}</ul></li>`;
    })
    .join('');

  const html = `<p>Hi ${escapeHtml(input.recipientEmail)},</p><p>You have <strong>${totalTasks}</strong> task${totalTasks === 1 ? '' : 's'} in your digest for ${escapeHtml(input.digestDate)}.</p><ul>${htmlGroups}</ul>`;

  return { subject, text, html };
}
