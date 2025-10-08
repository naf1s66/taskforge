import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { openApiDocument } from './openapi';

const outputPath = resolve(process.cwd(), '../../docs/openapi.json');

writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));
console.log('Wrote docs/openapi.json');
