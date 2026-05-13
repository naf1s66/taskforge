import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const HTTP_DIR = path.resolve(scriptDir, '..', 'apps', 'api', 'tests');
const METHOD_PATTERN = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+(?:\s+HTTP\/\d(?:\.\d)?)?$/;

export function validate(content, file) {
  const lines = content.split(/\r?\n/);
  let inBody = false;
  let inScript = false;
  let scriptStartLine = 0;
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
      scriptStartLine = i + 1;
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

  if (inScript) {
    throw new Error(`${file}:${scriptStartLine} script block is not closed`);
  }
}

async function main() {
  const files = (await readdir(HTTP_DIR)).filter((name) => name.endsWith('.http'));
  for (const file of files) {
    const content = await readFile(path.join(HTTP_DIR, file), 'utf8');
    validate(content, file);
  }

  console.log(`Validated ${files.length} HTTP files in ${HTTP_DIR}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
