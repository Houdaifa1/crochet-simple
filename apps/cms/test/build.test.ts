import { describe, expect, it } from 'vitest';
import { siteDomains } from '../src/publish/build.ts';

describe('site domains', () => {
  it('keeps www on a bare domain, so it is never detached by a deploy', () => {
    expect(siteDomains('https://crochetsimplified.com')).toEqual([
      'crochetsimplified.com',
      'www.crochetsimplified.com',
    ]);
  });

  it('adds nothing to a subdomain', () => {
    expect(siteDomains('https://crochet.example.dev/')).toEqual(['crochet.example.dev']);
  });
});
