import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const HTTP_DIR = path.resolve(process.cwd(), 'tests');
const METHOD_PATTERN = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+$/;

function validate(content, file) {
  const lines = content.split(/\r?\n/);
  let inBody = false;
  let inScript = false;
  let hasRequest = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (line === '###') {
      inBody = false;
      continue;
    }

    if (!line || line.startsWith('#') || line.startsWith('@')) {
      continue;
    }

    if (line.startsWith('> {%')) {
      inScript = true;
      continue;
    }

    if (inScript) {
      if (line.startsWith('%}')) {
        inScript = false;
      }
      continue;
    }

    if (METHOD_PATTERN.test(line)) {
      hasRequest = true;
      inBody = false;
      continue;
    }

    if (/^[A-Za-z0-9-]+:\s*.+$/.test(line)) {
      continue;
    }

    if (line.startsWith('{') || line.startsWith('[') || inBody) {
      inBody = true;
      continue;
    }

    throw new Error(`${file}:${i + 1} invalid HTTP entry syntax: ${line}`);
  }

  if (!hasRequest) {
    throw new Error(`${file}: no request lines found`);
  }
}

const files = (await readdir(HTTP_DIR)).filter((name) => name.endsWith('.http'));
for (const file of files) {
  const content = await readFile(path.join(HTTP_DIR, file), 'utf8');
  validate(content, file);
}

console.log(`Validated ${files.length} HTTP files in ${HTTP_DIR}`);
