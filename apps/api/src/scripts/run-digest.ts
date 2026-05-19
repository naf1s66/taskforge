import { DailyDigestRunner } from '../notifications/daily-digest-runner';
import { NodemailerEmailAdapter } from '../email/nodemailer-adapter';
import { parseDailySendLimit } from '../config/digest';
import { getSmtpConfig } from '../config/smtp';
import { getPrismaClient } from '../prisma';

const digestDate = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const dryRun = process.argv.includes('--dry-run');
const sendLimit = parseDailySendLimit(process.env.EMAIL_DAILY_SEND_LIMIT, 100);

async function main() {
  const runner = new DailyDigestRunner({
    prisma: getPrismaClient(),
    emailAdapter: new NodemailerEmailAdapter(getSmtpConfig()),
  });

  const result = await runner.run({ digestDate, dryRun, sendLimit });
  console.log(JSON.stringify(result, null, 2));
}

void main();
