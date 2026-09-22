import { describe, expect, it } from 'vitest';
import { generateDemoSites } from '../src/shared/dev/generateDemoData';
import type { SiteRecord } from '../src/shared/models/types';
import { hostnameFromUrl, normalizeHostname } from '../src/shared/utils/domain';
import { hashString } from '../src/shared/utils/hash';
import {
  generatePlantState,
  generateSpecies,
  growthForRecord,
  healthForLastVisit,
} from '../src/shared/utils/plant';

const NOW = new Date('2026-09-22T16:00:00-04:00').getTime();

function site(overrides: Partial<SiteRecord> = {}): SiteRecord {
  return {
    id: 'github.com',
    hostname: 'github.com',
    firstVisitedAt: NOW - 30 * 86_400_000,
    lastVisitedAt: NOW,
    totalVisits: 1,
    activeTimeSeconds: 60,
    lastGrowthUpdateAt: NOW,
    category: 'Development',
    plantSeed: hashString('github.com'),
    createdAt: NOW - 30 * 86_400_000,
    dailyActivity: {},
    ...overrides,
  };
}

describe('deterministic identity', () => {
  it('returns the same seed for the same hostname', () => {
    expect(hashString('github.com')).toBe(hashString('github.com'));
    expect(hashString('github.com')).not.toBe(hashString('gitlab.com'));
  });

  it('returns the same species traits for the same seed', () => {
    const seed = hashString('github.com');
    expect(generateSpecies(seed, 'Development')).toEqual(generateSpecies(seed, 'Development'));
  });

  it('returns the same full plant state for unchanged data and time', () => {
    expect(generatePlantState(site(), NOW)).toEqual(generatePlantState(site(), NOW));
  });
});

describe('domain normalization', () => {
  it.each([
    ['www.youtube.com', 'youtube.com'],
    ['m.youtube.com', 'youtube.com'],
    ['https://www.youtube.com/watch?v=private', 'youtube.com'],
    ['news.example.co.uk', 'example.co.uk'],
    ['docs.google.com', 'docs.google.com'],
    ['developer.mozilla.org', 'developer.mozilla.org'],
    ['192.168.1.25', '192.168.1.25'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeHostname(input)).toBe(expected);
  });

  it('ignores browser and local URLs', () => {
    expect(hostnameFromUrl('chrome://extensions')).toBeNull();
    expect(hostnameFromUrl('file:///C:/secret.txt')).toBeNull();
    expect(hostnameFromUrl('about:blank')).toBeNull();
  });
});

describe('growth and health rules', () => {
  it('never reduces growth when visits increase', () => {
    let previous = 0;
    for (const visits of [1, 2, 5, 20, 100, 1_000, 10_000]) {
      const growth = growthForRecord(site({ totalVisits: visits }));
      expect(growth).toBeGreaterThanOrEqual(previous);
      previous = growth;
    }
  });

  it('never reduces growth when active time increases', () => {
    let previous = 0;
    for (const activeTimeSeconds of [0, 60, 600, 3_600, 36_000, 360_000]) {
      const growth = growthForRecord(site({ activeTimeSeconds }));
      expect(growth).toBeGreaterThanOrEqual(previous);
      previous = growth;
    }
  });

  it('reduces health as a visit becomes older', () => {
    const ages = [0, 2, 8, 31, 91].map((days) =>
      healthForLastVisit(NOW - days * 86_400_000, NOW),
    );
    expect(ages).toEqual([...ages].sort((a, b) => b - a));
  });

  it('recovers a dormant plant after a return visit', () => {
    const dormant = generatePlantState(site({ lastVisitedAt: NOW - 120 * 86_400_000 }), NOW);
    const returned = generatePlantState(site({ lastVisitedAt: NOW }), NOW);
    expect(dormant.dormant).toBe(true);
    expect(returned.dormant).toBe(false);
    expect(returned.health).toBeGreaterThan(dormant.health);
  });
});

describe('development data', () => {
  it('creates at least 30 varied deterministic records', () => {
    const records = generateDemoSites(44, NOW);
    expect(records.length).toBeGreaterThanOrEqual(30);
    expect(new Set(records.map((record) => record.category)).size).toBeGreaterThan(5);
    expect(generateDemoSites(44, NOW)).toEqual(records);
  });
});
