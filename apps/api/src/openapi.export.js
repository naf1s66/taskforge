import { writeFileSync } from 'node:fs';
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
writeFileSync('docs/openapi.json', JSON.stringify(spec, null, 2));
console.log('Wrote docs/openapi.json');
