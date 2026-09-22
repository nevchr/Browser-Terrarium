import {
  ACTIVE_TIME_FLUSH_ALARM,
  ACTIVE_TIME_FLUSH_MINUTES,
  DEFAULT_META,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
} from '../shared/constants';
import type { SiteRecord, TerrariumSettings } from '../shared/models/types';
import {
  getMeta,
  getSettings,
  getSites,
  recordDailyActiveTime,
  recordDailyVisit,
  setSites,
} from '../shared/storage/storage';
import {
  categoryForHostname,
  displayNameForHostname,
  hostnameFromUrl,
} from '../shared/utils/domain';
import { hashString } from '../shared/utils/hash';

interface ActiveSession {
  tabId: number;
  hostname: string;
  lastFlushedAt: number;
}

let activeSession: ActiveSession | null = null;
let browserWindowFocused = false;
let focusedWindowId: number | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let historyListenerRegistered = false;

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

function createSite(
  hostname: string,
  timestamp: number,
  settings: TerrariumSettings,
  title?: string,
): SiteRecord {
  return {
    id: hostname,
    hostname,
    displayName: settings.storePageTitles && title ? title.slice(0, 200) : undefined,
    firstVisitedAt: timestamp,
    lastVisitedAt: timestamp,
    totalVisits: 0,
    activeTimeSeconds: 0,
    lastGrowthUpdateAt: timestamp,
    category: categoryForHostname(hostname),
    plantSeed: hashString(hostname),
    createdAt: timestamp,
    dailyActivity: {},
  };
}

async function recordVisit(url?: string, title?: string, timestamp = Date.now()): Promise<void> {
  const hostname = hostnameFromUrl(url);
  if (!hostname) return;

  await enqueueWrite(async () => {
    const [settings, sites] = await Promise.all([getSettings(), getSites()]);
    if (!settings.trackNewSites && !sites.some((site) => site.hostname === hostname)) return;

    const index = sites.findIndex((site) => site.hostname === hostname);
    const existing = index >= 0 ? sites[index] : createSite(hostname, timestamp, settings, title);
    const updated = recordDailyVisit(
      {
        ...existing,
        displayName:
          settings.storePageTitles && title ? title.slice(0, 200) : existing.displayName,
        lastVisitedAt: Math.max(existing.lastVisitedAt, timestamp),
        lastGrowthUpdateAt: timestamp,
        totalVisits: existing.totalVisits + 1,
      },
      timestamp,
    );

    if (index >= 0) sites[index] = updated;
    else sites.push(updated);
    await setSites(sites);
  });
}

async function flushActiveSession(now = Date.now()): Promise<void> {
  if (!activeSession) return;
  const session = activeSession;
  const elapsedSeconds = Math.min(300, Math.max(0, Math.floor((now - session.lastFlushedAt) / 1000)));
  activeSession = { ...session, lastFlushedAt: now };
  if (elapsedSeconds < 1) return;

  await enqueueWrite(async () => {
    const [settings, sites] = await Promise.all([getSettings(), getSites()]);
    if (!settings.trackActiveTime) return;
    const index = sites.findIndex((site) => site.hostname === session.hostname);
    if (index < 0) return;
    sites[index] = recordDailyActiveTime(
      {
        ...sites[index],
        activeTimeSeconds: sites[index].activeTimeSeconds + elapsedSeconds,
      },
      elapsedSeconds,
      now,
    );
    await setSites(sites);
  });
}

async function beginTimingTab(tab?: chrome.tabs.Tab): Promise<void> {
  if (
    !browserWindowFocused ||
    tab?.id === undefined ||
    tab.windowId !== focusedWindowId
  ) {
    activeSession = null;
    return;
  }
  const settings = await getSettings();
  const hostname = settings.trackActiveTime ? hostnameFromUrl(tab?.url) : null;
  activeSession = hostname ? { tabId: tab.id, hostname, lastFlushedAt: Date.now() } : null;
}

async function switchToTab(tab?: chrome.tabs.Tab): Promise<void> {
  await flushActiveSession();
  activeSession = null;
  await beginTimingTab(tab);
}

async function startFromCurrentTab(): Promise<void> {
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  const focusedWindow = windows.find((window) => window.focused);
  browserWindowFocused = Boolean(focusedWindow);
  focusedWindowId = focusedWindow?.id ?? null;
  const activeTab = focusedWindow?.tabs?.find((tab) => tab.active);
  await beginTimingTab(activeTab);
}

function handleHistoryVisit(item: chrome.history.HistoryItem): void {
  void recordVisit(item.url, item.title, item.lastVisitTime ?? Date.now());
}

function registerHistoryListenerIfAvailable(): void {
  const visitedEvent = chrome.history?.onVisited;
  if (!visitedEvent || historyListenerRegistered) return;
  visitedEvent.addListener(handleHistoryVisit);
  historyListenerRegistered = true;
}

function forgetHistoryListener(): void {
  const visitedEvent = chrome.history?.onVisited;
  if (visitedEvent && historyListenerRegistered) {
    visitedEvent.removeListener(handleHistoryVisit);
  }
  historyListenerRegistered = false;
}

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    const existing = await chrome.storage.local.get([
      STORAGE_KEYS.settings,
      STORAGE_KEYS.meta,
      STORAGE_KEYS.sites,
    ]);
    await chrome.storage.local.set({
      [STORAGE_KEYS.settings]: existing[STORAGE_KEYS.settings] ?? DEFAULT_SETTINGS,
      [STORAGE_KEYS.meta]: existing[STORAGE_KEYS.meta] ?? DEFAULT_META,
      [STORAGE_KEYS.sites]: existing[STORAGE_KEYS.sites] ?? [],
    });
    if (details.reason === 'install' && !(await getMeta()).onboardingComplete) {
      await chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    }
    await chrome.alarms.create(ACTIVE_TIME_FLUSH_ALARM, {
      periodInMinutes: ACTIVE_TIME_FLUSH_MINUTES,
    });
    await startFromCurrentTab();
  })();
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.alarms.create(ACTIVE_TIME_FLUSH_ALARM, {
    periodInMinutes: ACTIVE_TIME_FLUSH_MINUTES,
  });
  void startFromCurrentTab();
});

chrome.permissions.onAdded.addListener((permissions) => {
  if (permissions.permissions?.includes('history')) {
    registerHistoryListenerIfAvailable();
  }
});

chrome.permissions.onRemoved.addListener((permissions) => {
  if (permissions.permissions?.includes('history')) {
    forgetHistoryListener();
  }
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  if (windowId !== focusedWindowId) return;
  void chrome.tabs.get(tabId).then(switchToTab);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (
    tab.active &&
    tab.windowId === focusedWindowId &&
    (changeInfo.url || changeInfo.status === 'complete')
  ) {
    void switchToTab(tab);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeSession?.tabId !== tabId) return;
  void flushActiveSession().then(() => {
    activeSession = null;
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  void (async () => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      browserWindowFocused = false;
      focusedWindowId = null;
      await flushActiveSession();
      activeSession = null;
      return;
    }
    browserWindowFocused = true;
    focusedWindowId = windowId;
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    await switchToTab(tab);
  })();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ACTIVE_TIME_FLUSH_ALARM && browserWindowFocused) {
    void flushActiveSession();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes[STORAGE_KEYS.settings]) return;
  const settings = changes[STORAGE_KEYS.settings].newValue as TerrariumSettings | undefined;
  if (!settings?.trackActiveTime) {
    void flushActiveSession().then(() => {
      activeSession = null;
    });
  } else if (!activeSession) {
    void startFromCurrentTab();
  }
});

void startFromCurrentTab();
registerHistoryListenerIfAvailable();
