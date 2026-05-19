import { createApp } from './app';
import { getSmtpConfig } from './config/smtp';
import { NodemailerEmailAdapter } from './email/nodemailer-adapter';

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set before starting the API server.');
}

const smtpConfig = getSmtpConfig();
const emailAdapter = new NodemailerEmailAdapter(smtpConfig);

const app = createApp({ jwtSecret, welcomeEmailAdapter: emailAdapter, digestEmailAdapter: emailAdapter });

app.listen(port, () => {
  console.log(`API on http://localhost:${port}`);
});
