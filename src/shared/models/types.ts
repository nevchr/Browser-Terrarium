export const SITE_CATEGORIES = [
  'Social',
  'Video',
  'Music',
  'Development',
  'Education',
  'Shopping',
  'News',
  'Games',
  'Productivity',
  'Reference',
  'Other',
] as const;

export type SiteCategory = (typeof SITE_CATEGORIES)[number];

export interface DailyActivity {
  visits: number;
  activeTimeSeconds: number;
}

export interface SiteRecord {
  id: string;
  hostname: string;
  displayName?: string;
  firstVisitedAt: number;
  lastVisitedAt: number;
  totalVisits: number;
  activeTimeSeconds: number;
  lastGrowthUpdateAt: number;
  category: SiteCategory;
  plantSeed: number;
  createdAt: number;
  dailyActivity: Record<string, DailyActivity>;
}

export type LeafShape = 'round' | 'pointed' | 'fan' | 'heart' | 'needle';
export type StemShape = 'straight' | 'arching' | 'forked';

export interface PlantSpecies {
  name: string;
  leafShape: LeafShape;
  stemShape: StemShape;
  hue: number;
  accentHue: number;
  flowerChance: number;
  swayRate: number;
}

export interface PlantState {
  siteId: string;
  species: PlantSpecies;
  growthLevel: number;
  health: number;
  age: number;
  branchCount: number;
  leafCount: number;
  height: number;
  bloomLevel: number;
  dormant: boolean;
}

export type TerrariumViewMode = 'perspective' | 'flat';

export interface TerrariumSettings {
  trackActiveTime: boolean;
  trackNewSites: boolean;
  plantMotion: boolean;
  ambientParticles: boolean;
  seasonalEffects: boolean;
  storePageTitles: boolean;
  terrariumView: TerrariumViewMode;
}

export interface AppMeta {
  version: 1;
  onboardingComplete: boolean;
  lastDashboardOpenedAt?: number;
}

export interface TerrariumExport {
  version: 1;
  exportedAt: number;
  sites: SiteRecord[];
  settings: TerrariumSettings;
}

export type TimelineFilter = 'today' | '7days' | '30days' | 'all';
