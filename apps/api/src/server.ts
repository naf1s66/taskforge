import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { router as taskRoutes } from './routes/tasks';
import { router as tagRoutes } from './routes/tags';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/api/taskforge/v1/health', (_req, res) => res.json({ ok: true }));

// Swagger (placeholder)
const openapi: any = { openapi: '3.0.3', info: { title: 'TaskForge API', version: '1.0.0' } };
app.use('/api/taskforge/docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.use(authMiddleware);
app.use('/api/taskforge/v1/tasks', taskRoutes);
app.use('/api/taskforge/v1/tags', tagRoutes);
app.get('/api/taskforge/v1/me', async (_req, res) => {
  res.json({ user: { id: 'demo', email: 'demo@example.com' } });
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
