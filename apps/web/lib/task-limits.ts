import { isValidNormalizedTagLabel, TAG_LABEL_MAX_LENGTH } from '@taskforge/shared';

export const TASK_TITLE_MAX_LENGTH = 160;
export const TASK_DESCRIPTION_MAX_LENGTH = 5_000;
export const TASK_TAGS_MAX_LENGTH = 10;
export const TASK_QUERY_MAX_LENGTH = 200;
export const TASK_BOARD_TARGET_INDEX_MAX = 1_000;
export const TASK_TAG_LABEL_MAX_LENGTH = TAG_LABEL_MAX_LENGTH;

export function isValidTaskTagLabel(label: string): boolean {
  return isValidNormalizedTagLabel(label);
}
