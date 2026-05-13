import assert from 'node:assert/strict';
import test from 'node:test';

import { validate } from './lint-http-files.mjs';

test('accepts request lines with HTTP version suffixes', () => {
  assert.doesNotThrow(() => {
    validate('GET https://example.com/health HTTP/1.1\n', 'version.http');
  });
});

test('rejects script blocks that are not closed', () => {
  assert.throws(
    () =>
      validate(
        [
          'GET https://example.com/health',
          '',
          '> {%',
          "client.test('ok', () => {",
          '  client.assert(response.status === 200);',
        ].join('\n'),
        'unterminated.http',
      ),
    /unterminated\.http:3 script block is not closed/,
  );
});
