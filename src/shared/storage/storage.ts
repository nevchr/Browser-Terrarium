import {
  DEFAULT_META,
  DEFAULT_SETTINGS,
  MAX_DAILY_ACTIVITY_DAYS,
  STORAGE_KEYS,
} from '../constants';
import type {
  AppMeta,
  SiteRecord,
  TerrariumExport,
  TerrariumSettings,
} from '../models/types';
import { SITE_CATEGORIES } from '../models/types';
import { localDayKey } from '../utils/date';

function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(result[key] as T | undefined);
    });
  });
}

function storageSet(values: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

export async function getSites(): Promise<SiteRecord[]> {
  return (await storageGet<SiteRecord[]>(STORAGE_KEYS.sites)) ?? [];
}

export async function setSites(sites: SiteRecord[]): Promise<void> {
  await storageSet({ [STORAGE_KEYS.sites]: sites });
}

export async function getSettings(): Promise<TerrariumSettings> {
  const saved = await storageGet<Partial<TerrariumSettings>>(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function setSettings(settings: TerrariumSettings): Promise<void> {
  await storageSet({ [STORAGE_KEYS.settings]: settings });
}

export async function updateSettings(
  patch: Partial<TerrariumSettings>,
): Promise<TerrariumSettings> {
  const settings = { ...(await getSettings()), ...patch };
  await setSettings(settings);
  return settings;
}

export async function getMeta(): Promise<AppMeta> {
  const saved = await storageGet<Partial<AppMeta>>(STORAGE_KEYS.meta);
  return { ...DEFAULT_META, ...saved, version: 1 };
}

export async function updateMeta(patch: Partial<AppMeta>): Promise<AppMeta> {
  const meta = { ...(await getMeta()), ...patch, version: 1 as const };
  await storageSet({ [STORAGE_KEYS.meta]: meta });
  return meta;
}

export async function resetTerrarium(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.remove(Object.values(STORAGE_KEYS), () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
  await storageSet({
    [STORAGE_KEYS.settings]: DEFAULT_SETTINGS,
    [STORAGE_KEYS.meta]: { ...DEFAULT_META, onboardingComplete: true },
  });
}

export function pruneDailyActivity(site: SiteRecord): SiteRecord {
  const entries = Object.entries(site.dailyActivity).sort(([a], [b]) => b.localeCompare(a));
  return {
    ...site,
    dailyActivity: Object.fromEntries(entries.slice(0, MAX_DAILY_ACTIVITY_DAYS)),
  };
}

export function recordDailyVisit(site: SiteRecord, timestamp: number): SiteRecord {
  const key = localDayKey(timestamp);
  const current = site.dailyActivity[key] ?? { visits: 0, activeTimeSeconds: 0 };
  return pruneDailyActivity({
    ...site,
    dailyActivity: {
      ...site.dailyActivity,
      [key]: { ...current, visits: current.visits + 1 },
    },
  });
}

export function recordDailyActiveTime(
  site: SiteRecord,
  seconds: number,
  timestamp: number,
): SiteRecord {
  const key = localDayKey(timestamp);
  const current = site.dailyActivity[key] ?? { visits: 0, activeTimeSeconds: 0 };
  return pruneDailyActivity({
    ...site,
    dailyActivity: {
      ...site.dailyActivity,
      [key]: {
        ...current,
        activeTimeSeconds: current.activeTimeSeconds + Math.max(0, seconds),
      },
    },
  });
}

export function makeExport(
  sites: SiteRecord[],
  settings: TerrariumSettings,
): TerrariumExport {
  return { version: 1, exportedAt: Date.now(), sites, settings };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateImport(value: unknown): TerrariumExport {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.sites)) {
    throw new Error('This is not a Browser Terrarium version 1 export.');
  }
  if (value.sites.length > 10_000) {
    throw new Error('This export contains too many plants.');
  }

  const sites = value.sites.map((candidate, index): SiteRecord => {
    if (!isObject(candidate)) throw new Error(`Plant ${index + 1} is invalid.`);
    const hostname = typeof candidate.hostname === 'string' ? candidate.hostname : '';
    const category = SITE_CATEGORIES.includes(candidate.category as never)
      ? (candidate.category as SiteRecord['category'])
      : 'Other';
    const number = (key: keyof SiteRecord) => {
      const field = candidate[key];
      if (typeof field !== 'number' || !Number.isFinite(field) || field < 0) {
        throw new Error(`Plant ${index + 1} has an invalid ${String(key)} value.`);
      }
      return field;
    };

    if (!hostname || hostname.length > 253 || !hostname.includes('.')) {
      throw new Error(`Plant ${index + 1} has an invalid hostname.`);
    }

    const dailyActivity: SiteRecord['dailyActivity'] = {};
    if (isObject(candidate.dailyActivity)) {
      for (const [key, activity] of Object.entries(candidate.dailyActivity).slice(0, 120)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !isObject(activity)) continue;
        const visits = typeof activity.visits === 'number' ? Math.max(0, activity.visits) : 0;
        const activeTimeSeconds =
          typeof activity.activeTimeSeconds === 'number'
            ? Math.max(0, activity.activeTimeSeconds)
            : 0;
        dailyActivity[key] = { visits, activeTimeSeconds };
      }
    }

    return {
      id: typeof candidate.id === 'string' ? candidate.id.slice(0, 300) : hostname,
      hostname: hostname.slice(0, 253),
      displayName:
        typeof candidate.displayName === 'string' ? candidate.displayName.slice(0, 200) : undefined,
      firstVisitedAt: number('firstVisitedAt'),
      lastVisitedAt: number('lastVisitedAt'),
      totalVisits: number('totalVisits'),
      activeTimeSeconds: number('activeTimeSeconds'),
      lastGrowthUpdateAt: number('lastGrowthUpdateAt'),
      category,
      plantSeed: number('plantSeed'),
      createdAt: number('createdAt'),
      dailyActivity,
    };
  });

  const incomingSettings = isObject(value.settings) ? value.settings : {};
  const settings: TerrariumSettings = { ...DEFAULT_SETTINGS };
  const booleanKeys = [
    'trackActiveTime',
    'trackNewSites',
    'plantMotion',
    'ambientParticles',
    'seasonalEffects',
    'storePageTitles',
  ] as const;
  for (const key of booleanKeys) {
    if (typeof incomingSettings[key] === 'boolean') {
      settings[key] = incomingSettings[key];
    }
  }
  if (
    incomingSettings.terrariumView === 'perspective' ||
    incomingSettings.terrariumView === 'flat'
  ) {
    settings.terrariumView = incomingSettings.terrariumView;
  }

  return {
    version: 1,
    exportedAt:
      typeof value.exportedAt === 'number' && Number.isFinite(value.exportedAt)
        ? value.exportedAt
        : Date.now(),
    sites,
    settings,
  };
}
