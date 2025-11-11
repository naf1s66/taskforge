import { createApp } from './app';

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set before starting the API server.');
}

const app = createApp({ jwtSecret });

app.listen(port, () => {
  console.log(`API on http://localhost:${port}`);
});
