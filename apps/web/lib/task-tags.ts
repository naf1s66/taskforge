import { isValidTaskTagLabel, TASK_TAGS_MAX_LENGTH } from './task-limits';

export function sanitizeTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function sanitizeValidTaskTags(tags: string[] | undefined): string[] {
  return sanitizeTags(tags)
    .filter(isValidTaskTagLabel);
}

export function sanitizeTaskInputTags(tags: string[] | undefined): string[] {
  return sanitizeValidTaskTags(tags).slice(0, TASK_TAGS_MAX_LENGTH);
}
