import { createApp } from './app';

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';

const app = createApp({ jwtSecret });

app.listen(port, () => {
  console.log(`API on http://localhost:${port}`);
});
