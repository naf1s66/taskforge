import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv-flow';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

loadEnv({ path: apiRoot, silent: true });
