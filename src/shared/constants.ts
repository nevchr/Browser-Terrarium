import type { AppMeta, TerrariumSettings } from './models/types';

export const STORAGE_KEYS = {
  sites: 'browserTerrarium.sites',
  settings: 'browserTerrarium.settings',
  meta: 'browserTerrarium.meta',
} as const;

export const DEFAULT_SETTINGS: TerrariumSettings = {
  trackActiveTime: true,
  trackNewSites: true,
  plantMotion: true,
  ambientParticles: true,
  seasonalEffects: true,
  storePageTitles: false,
};

export const DEFAULT_META: AppMeta = {
  version: 1,
  onboardingComplete: false,
};

export const MAX_DAILY_ACTIVITY_DAYS = 120;
export const ACTIVE_TIME_FLUSH_ALARM = 'browser-terrarium-active-time-flush';
export const ACTIVE_TIME_FLUSH_MINUTES = 0.5;
