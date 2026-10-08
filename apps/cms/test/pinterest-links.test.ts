import { expect, test } from 'vitest';
import { pinterestPin } from '../src/fields/validators.ts';

test('published pin links allow empty fields and regional Pinterest domains', () => {
  for (const value of [
    undefined,
    null,
    '',
    'https://www.pinterest.com/pin/123456789/',
    'https://ru.pinterest.com/pin/123456789/',
  ])
    expect(pinterestPin(value)).toBe(true);
});

test('published pin links reject profiles, creation links and other websites', () => {
  for (const value of [
    'https://www.pinterest.com/crochet_simplified/',
    'https://www.pinterest.com/pin/create/button/',
    'https://pinterest.com.example.com/pin/123/',
    'http://www.pinterest.com/pin/123/',
    'javascript:alert(1)',
  ])
    expect(pinterestPin(value)).not.toBe(true);
});
