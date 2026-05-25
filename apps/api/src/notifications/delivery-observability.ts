import { Prisma, type NotificationDeliveryStatus, type NotificationDeliveryType } from '@prisma/client';

import type { EmailSendResult } from '../email/types';

export type NotificationLogger = Pick<Console, 'error' | 'info'>;

export interface ClassifiedDeliveryFailure {
  code: string;
  message: string;
  retryable: boolean;
  providerMetadata: Prisma.JsonObject;
}

export interface DeliveryLogInput {
  notificationType: NotificationDeliveryType;
  userId: string;
  deliveryStatus: NotificationDeliveryStatus;
  provider: string;
  providerMessageId?: string | null;
  providerResponse?: Prisma.JsonObject | null;
  providerErrorCode?: string;
  retryable?: boolean;
}

export function sanitizeProviderResponse(value: EmailSendResult | void): Prisma.JsonObject | null {
  if (!value?.providerMetadata || typeof value.providerMetadata !== 'object') {
    return null;
  }

  const metadata: Prisma.JsonObject = {};
  for (const [metadataKey, metadataValue] of Object.entries(value.providerMetadata)) {
    if (isJsonPrimitive(metadataValue)) {
      metadata[metadataKey] = metadataValue;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

export function classifyDeliveryFailure(
  error: unknown,
  options: { code?: string; retryable?: boolean } = {},
): ClassifiedDeliveryFailure {
  const message = sanitizeFailureMessage(error);
  const name = error instanceof Error ? error.name : 'Error';
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const responseCode = readNumericField(record, ['responseCode', 'statusCode', 'status']);
  const providerCode = readStringField(record, ['code', 'command']);
  const lower = `${message} ${providerCode ?? ''} ${responseCode ?? ''}`.toLowerCase();

  const isQuota = /\bquota\b|daily limit|exceeded your sending limit|sending limit/.test(lower);
  const isRateLimit = responseCode === 429 || /\b429\b|rate limit|too many requests|throttl/.test(lower);
  const isAuth =
    responseCode === 401 ||
    responseCode === 403 ||
    responseCode === 535 ||
    /\bauth\b|invalid login|credential|unauthorized|forbidden|authentication failed/.test(lower);
  const isTemplate = /\btemplate\b|render|compile|invalid html|invalid content/.test(lower);
  const isRecipient =
    responseCode === 550 ||
    responseCode === 551 ||
    responseCode === 553 ||
    /\brecipient\b|mailbox unavailable|invalid recipient|user unknown|550 /.test(lower);
  const code = options.code ??
    (isQuota
      ? 'PROVIDER_QUOTA_EXHAUSTED'
      : isRateLimit
        ? 'PROVIDER_RATE_LIMITED'
        : isAuth
          ? 'PROVIDER_AUTH_FAILED'
          : isTemplate
            ? 'TEMPLATE_RENDER_FAILED'
            : isRecipient
              ? 'RECIPIENT_REJECTED'
              : 'PROVIDER_TRANSIENT_FAILURE');

  const providerMetadata: Prisma.JsonObject = {
    errorName: name,
    providerClassifiedCode: code,
    messageSnippet: message.slice(0, 200),
  };
  if (responseCode !== undefined) {
    providerMetadata.responseCode = responseCode;
  }
  if (providerCode) {
    providerMetadata.providerCode = providerCode.slice(0, 100);
  }

  return {
    code,
    message: message.slice(0, 500),
    retryable: options.retryable ?? (code === 'PROVIDER_TRANSIENT_FAILURE' || code === 'PROVIDER_RATE_LIMITED'),
    providerMetadata,
  };
}

export function logDeliveryFinished(logger: NotificationLogger, input: DeliveryLogInput): void {
  const payload: Record<string, unknown> = {
    notificationType: input.notificationType,
    userId: input.userId,
    deliveryStatus: input.deliveryStatus,
    provider: input.provider,
    providerMessageId: input.providerMessageId ?? null,
    providerResponse: input.providerResponse ?? null,
  };
  if (input.providerErrorCode) {
    payload.providerErrorCode = input.providerErrorCode;
  }
  if (input.retryable !== undefined) {
    payload.retryable = input.retryable;
  }

  if (input.deliveryStatus === 'FAILED') {
    logger.error('[notifications] Delivery attempt finished', payload);
    return;
  }

  logger.info('[notifications] Delivery attempt finished', payload);
}

function sanitizeFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').trim();
}

function readNumericField(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function readStringField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function isJsonPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}
