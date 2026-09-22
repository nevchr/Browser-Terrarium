import type { PlantSpecies, PlantState, SiteCategory, SiteRecord } from '../models/types';
import { daysSince } from './date';
import { seededUnit } from './hash';

const ADJECTIVES = [
  'Glass',
  'Velvet',
  'Moon',
  'Copper',
  'Silver',
  'Wild',
  'Soft',
  'Ghost',
  'Amber',
  'Night',
  'Dew',
  'Quiet',
];

const NOUNS = [
  'Fern',
  'Ivy',
  'Moss',
  'Bloom',
  'Reed',
  'Sprout',
  'Vine',
  'Palm',
  'Grass',
  'Root',
  'Frond',
  'Clover',
];

const CATEGORY_HUES: Record<SiteCategory, number> = {
  Social: 135,
  Video: 103,
  Music: 165,
  Development: 147,
  Education: 92,
  Shopping: 78,
  News: 122,
  Games: 184,
  Productivity: 112,
  Reference: 151,
  Other: 126,
};

export function speciesName(seed: number): string {
  const adjective = ADJECTIVES[Math.floor(seededUnit(seed, 1) * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(seededUnit(seed, 2) * NOUNS.length)];
  return `${adjective} ${noun}`;
}

export function generateSpecies(seed: number, category: SiteCategory): PlantSpecies {
  const leafShapes: PlantSpecies['leafShape'][] = ['round', 'pointed', 'fan', 'heart', 'needle'];
  const stemShapes: PlantSpecies['stemShape'][] = ['straight', 'arching', 'forked'];
  const categoryLeaf: Partial<Record<SiteCategory, PlantSpecies['leafShape']>> = {
    Development: 'pointed',
    Music: 'heart',
    Video: 'fan',
    Education: 'needle',
    Social: 'round',
  };

  return {
    name: speciesName(seed),
    leafShape:
      categoryLeaf[category] ?? leafShapes[Math.floor(seededUnit(seed, 3) * leafShapes.length)],
    stemShape: stemShapes[Math.floor(seededUnit(seed, 4) * stemShapes.length)],
    hue: (CATEGORY_HUES[category] + Math.round(seededUnit(seed, 5) * 28 - 14) + 360) % 360,
    accentHue: Math.round(34 + seededUnit(seed, 6) * 38),
    flowerChance: 0.14 + seededUnit(seed, 7) * 0.56,
    swayRate: 0.45 + seededUnit(seed, 8) * 0.75,
  };
}

export function healthForLastVisit(lastVisitedAt: number, now = Date.now()): number {
  const days = daysSince(lastVisitedAt, now);
  if (days <= 1) return 1;
  if (days <= 7) return 1 - ((days - 1) / 6) * 0.16;
  if (days <= 30) return 0.84 - ((days - 7) / 23) * 0.34;
  if (days <= 90) return 0.5 - ((days - 30) / 60) * 0.27;
  return Math.max(0.16, 0.23 - (days - 90) * 0.0007);
}

export function growthForRecord(site: SiteRecord): number {
  const visits = Math.log1p(Math.max(0, site.totalVisits)) / Math.log(251);
  const active = Math.log1p(Math.max(0, site.activeTimeSeconds)) / Math.log(86_401);
  return Math.max(0.04, Math.min(1, visits * 0.64 + active * 0.36));
}

export function generatePlantState(site: SiteRecord, now = Date.now()): PlantState {
  const growthLevel = growthForRecord(site);
  const health = healthForLastVisit(site.lastVisitedAt, now);
  const species = generateSpecies(site.plantSeed, site.category);
  const branches = Math.floor(1 + growthLevel * 6 + seededUnit(site.plantSeed, 9) * 2);
  const leaves = Math.floor(2 + growthLevel * 20 + branches * 0.8);
  const bloomPotential = Math.max(0, (growthLevel - 0.42) / 0.58);

  return {
    siteId: site.id,
    species,
    growthLevel,
    health,
    age: Math.max(0, Math.floor(daysSince(site.firstVisitedAt, now))),
    branchCount: branches,
    leafCount: leaves,
    height: 24 + growthLevel * 88 + seededUnit(site.plantSeed, 10) * 14,
    bloomLevel: bloomPotential * species.flowerChance * health,
    dormant: health < 0.32,
  };
}
