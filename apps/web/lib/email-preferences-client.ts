import { z } from 'zod';

import { getApiUrl } from './env';

const EmailPreferenceSchema = z.object({
  dailyDigestEnabled: z.boolean(),
  dailyDigestTimezone: z.string().min(1),
});

const MeResponseSchema = z.object({
  user: z.object({ id: z.string().uuid(), email: z.string().nullable() }).nullable(),
  emailPreference: EmailPreferenceSchema.optional(),
});

const UpdateResponseSchema = z.object({
  emailPreference: EmailPreferenceSchema,
});

export type EmailPreference = z.infer<typeof EmailPreferenceSchema>;

export async function getEmailPreference(): Promise<EmailPreference> {
  const response = await fetch(getApiUrl('v1/me'), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch email preferences.');
  }

  const payload = MeResponseSchema.parse(await response.json());
  return payload.emailPreference ?? { dailyDigestEnabled: false, dailyDigestTimezone: 'UTC' };
}

export async function updateEmailPreference(input: Pick<EmailPreference, 'dailyDigestEnabled'>): Promise<EmailPreference> {
  const response = await fetch(getApiUrl('v1/me/email-preferences'), {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to update email preferences.');
  }

  return UpdateResponseSchema.parse(await response.json()).emailPreference;
}
