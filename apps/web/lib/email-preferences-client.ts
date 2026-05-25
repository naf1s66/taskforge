import { z } from 'zod';

import { requestTaskforgeJson } from './tasks-client';

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
  const payload = await requestTaskforgeJson('v1/me', {
    method: 'GET',
    schema: MeResponseSchema,
  });
  return payload.emailPreference ?? { dailyDigestEnabled: false, dailyDigestTimezone: 'UTC' };
}

export async function updateEmailPreference(input: Pick<EmailPreference, 'dailyDigestEnabled'>): Promise<EmailPreference> {
  const response = await requestTaskforgeJson('v1/me/email-preferences', {
    method: 'PATCH',
    body: input,
    schema: UpdateResponseSchema,
  });
  return response.emailPreference;
}
