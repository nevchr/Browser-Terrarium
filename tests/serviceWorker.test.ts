import { afterEach, describe, expect, it, vi } from 'vitest';

function eventStub<T extends (...args: never[]) => void>() {
  return {
    addListener: vi.fn<(callback: T) => void>(),
    removeListener: vi.fn<(callback: T) => void>(),
  };
}

describe('background service worker permissions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('starts without the optional History API and attaches after permission is granted', async () => {
    let permissionAdded:
      | ((permissions: chrome.permissions.Permissions) => void)
      | undefined;

    const onPermissionAdded = eventStub<
      (permissions: chrome.permissions.Permissions) => void
    >();
    onPermissionAdded.addListener.mockImplementation((callback) => {
      permissionAdded = callback;
    });

    const mockChrome = {
      runtime: {
        lastError: undefined,
        onInstalled: eventStub<(details: chrome.runtime.InstalledDetails) => void>(),
        onStartup: eventStub<() => void>(),
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      },
      storage: {
        local: {
          get: vi.fn((_key: unknown, callback: (value: Record<string, unknown>) => void) =>
            callback({}),
          ),
          set: vi.fn((_value: unknown, callback?: () => void) => callback?.()),
          remove: vi.fn((_key: unknown, callback?: () => void) => callback?.()),
        },
        onChanged: eventStub<
          (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
        >(),
      },
      permissions: {
        onAdded: onPermissionAdded,
        onRemoved: eventStub<(permissions: chrome.permissions.Permissions) => void>(),
      },
      tabs: {
        onActivated: eventStub<(activeInfo: { tabId: number; windowId: number }) => void>(),
        onUpdated: eventStub<
          (tabId: number, changeInfo: Record<string, unknown>, tab: chrome.tabs.Tab) => void
        >(),
        onRemoved: eventStub<
          (tabId: number, removeInfo: { windowId: number; isWindowClosing: boolean }) => void
        >(),
        get: vi.fn(),
        query: vi.fn(),
        create: vi.fn(),
      },
      windows: {
        WINDOW_ID_NONE: -1,
        onFocusChanged: eventStub<(windowId: number) => void>(),
        getAll: vi.fn(async () => []),
      },
      alarms: {
        onAlarm: eventStub<(alarm: chrome.alarms.Alarm) => void>(),
        create: vi.fn(),
      },
    };

    vi.stubGlobal('chrome', mockChrome);
    await expect(import('../src/background/serviceWorker')).resolves.toBeDefined();
    expect(permissionAdded).toBeTypeOf('function');

    const onVisited = eventStub<(item: chrome.history.HistoryItem) => void>();
    Object.assign(mockChrome, { history: { onVisited } });
    permissionAdded?.({ permissions: ['history'] });

    expect(onVisited.addListener).toHaveBeenCalledOnce();
  });
});
