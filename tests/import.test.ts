import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/shared/constants';
import { generateDemoSites } from '../src/shared/dev/generateDemoData';
import { makeExport, validateImport } from '../src/shared/storage/storage';

describe('terrarium data import', () => {
  it('accepts its own version 1 export format', () => {
    const exported = makeExport(generateDemoSites(30, 1_800_000_000_000), DEFAULT_SETTINGS);
    expect(validateImport(exported)).toEqual(exported);
  });

  it('rejects unrelated JSON', () => {
    expect(() => validateImport({ version: 2, history: [] })).toThrow(/version 1/i);
  });

  it('does not preserve unknown fields', () => {
    const exported = makeExport(generateDemoSites(30, 1_800_000_000_000), DEFAULT_SETTINGS);
    const candidate = {
      ...exported,
      execute: '<script>alert(1)</script>',
      sites: exported.sites.map((record) => ({ ...record, html: '<img onerror=alert(1)>' })),
    };
    const imported = validateImport(candidate);
    expect(imported).not.toHaveProperty('execute');
    expect(imported.sites[0]).not.toHaveProperty('html');
  });
});
