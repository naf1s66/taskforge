import { isValidNormalizedTagLabel, TAG_LABEL_MAX_LENGTH } from '@taskforge/shared';
import { z } from 'zod';

export const TagLabelSchema = z
  .string()
  .trim()
  .min(1)
  .refine(label => isValidNormalizedTagLabel(label), {
    message: `Tag label must be ${TAG_LABEL_MAX_LENGTH} characters or fewer after normalization`,
  });

export const CreateTagSchema = z.object({
  label: TagLabelSchema,
}).strict();
