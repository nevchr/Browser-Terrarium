import { describe, expect, it } from 'vitest';
import { computeLayout } from '../src/dashboard/terrarium/layout';
import type { SiteRecord } from '../src/shared/models/types';
import { hashString } from '../src/shared/utils/hash';

const NOW = 1_800_000_000_000;

function makeSites(count: number): SiteRecord[] {
  return Array.from({ length: count }, (_, index) => {
    const hostname = `site-${index}.example`;
    return {
      id: hostname,
      hostname,
      firstVisitedAt: NOW - index * 1_000,
      lastVisitedAt: NOW - index * 10_000,
      totalVisits: 1 + (index % 200),
      activeTimeSeconds: index * 30,
      lastGrowthUpdateAt: NOW,
      category: 'Other',
      plantSeed: hashString(hostname),
      createdAt: NOW - index * 1_000,
      dailyActivity: {},
    };
  });
}

describe('terrarium layout', () => {
  it('keeps positions stable for unchanged data and viewport', () => {
    const sites = makeSites(80);
    const first = computeLayout(sites, 1_200, 700, NOW).map(({ site, x, y }) => ({ id: site.id, x, y }));
    const second = computeLayout([...sites].reverse(), 1_200, 700, NOW).map(({ site, x, y }) => ({ id: site.id, x, y }));
    expect(second).toEqual(first);
  });

  it('produces finite in-bounds placement data for 2,000 domains', () => {
    const layout = computeLayout(makeSites(2_000), 1_400, 800, NOW);
    expect(layout).toHaveLength(2_000);
    for (const entry of layout) {
      expect(Number.isFinite(entry.x)).toBe(true);
      expect(Number.isFinite(entry.y)).toBe(true);
      expect(entry.x).toBeGreaterThanOrEqual(0);
      expect(entry.x).toBeLessThanOrEqual(1_400);
      expect(entry.y).toBeGreaterThanOrEqual(0);
      expect(entry.y).toBeLessThanOrEqual(800);
    }
  });
});
