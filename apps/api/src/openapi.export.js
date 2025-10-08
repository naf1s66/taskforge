import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const spec = {
  openapi: '3.0.3',
  info: { title: 'TaskForge API', version: '1.0.0' },
  paths: {
    '/api/taskforge/v1/tasks': { get: {}, post: {} },
    '/api/taskforge/v1/tasks/{id}': { patch: {}, delete: {} },
    '/api/taskforge/v1/tags': { get: {}, post: {} },
    '/api/taskforge/v1/me': { get: {} },
    '/api/taskforge/v1/health': { get: {} }
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputPath = resolve(__dirname, '../../..', 'docs', 'openapi.json');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(spec, null, 2));
console.log(`Wrote ${outputPath}`);
