import { NextResponse } from 'next/server';

import { getApiUrl } from '@/lib/env';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function getOptionalQueryValue(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key);
  return value === null ? undefined : value;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const digestJobSecret = process.env.DIGEST_JOB_SECRET?.trim();
  if (!digestJobSecret) {
    return NextResponse.json({ error: 'DIGEST_JOB_SECRET is not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const payload = {
    digestDate: url.searchParams.get('digestDate') ?? todayUtc(),
    digestHourUtc: getOptionalQueryValue(url.searchParams, 'digestHourUtc'),
    dryRun: url.searchParams.get('dryRun') === 'true' || url.searchParams.get('dryRun') === '1',
    sendLimit: getOptionalQueryValue(url.searchParams, 'sendLimit'),
  };

  const apiResponse = await fetch(getApiUrl('v1/jobs/digest'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-job-secret': digestJobSecret,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const body = await apiResponse.text();
  return new Response(body || '{}', {
    status: apiResponse.status,
    headers: {
      'content-type': apiResponse.headers.get('content-type') ?? 'application/json',
    },
  });
}
