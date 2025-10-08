import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { OpenAPIV3_1 } from 'openapi-types';
import swaggerUi from 'swagger-ui-express';

import { authMiddleware } from './middleware/auth';
import { router as tagRoutes } from './routes/tags';
import { router as taskRoutes } from './routes/tasks';

const app = express();
const port = Number.parseInt(process.env.PORT ?? '4000', 10);

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/api/taskforge/v1/health', (_req, res) => res.json({ ok: true }));

const openapi: OpenAPIV3_1.Document = {
  openapi: '3.0.3',
  info: { title: 'TaskForge API', version: '1.0.0' },
  paths: {},
  components: {},
};
app.use('/api/taskforge/docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.use(authMiddleware);
app.use('/api/taskforge/v1/tasks', taskRoutes);
app.use('/api/taskforge/v1/tags', tagRoutes);
app.get('/api/taskforge/v1/me', (_req, res) => {
  res.json({ user: { id: 'demo', email: 'demo@example.com' } });
});

app.listen(port, () => {
  console.log(`API on http://localhost:${port}`);
});
