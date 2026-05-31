import './env';

import { createApp } from './app';
import { getDigestJobConfig } from './config/digest';
import { getSmtpConfig } from './config/smtp';
import { NodemailerEmailAdapter } from './email/nodemailer-adapter';

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set before starting the API server.');
}

const smtpConfig = getSmtpConfig();
const emailAdapter = new NodemailerEmailAdapter(smtpConfig);
const digestJobConfig = getDigestJobConfig();

const app = createApp({
  jwtSecret,
  welcomeEmailAdapter: emailAdapter,
  digestEmailAdapter: emailAdapter,
  digestDailySendLimit: digestJobConfig.dailySendLimit,
  digestJobSecret: digestJobConfig.secret,
});

app.listen(port, () => {
  console.log(`API on http://localhost:${port}`);
});
