import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants';
import { generateDemoSites } from '../shared/dev/generateDemoData';
import type { SiteRecord, TerrariumSettings, TimelineFilter } from '../shared/models/types';
import {
  getSettings,
  getMeta,
  getSites,
  makeExport,
  resetTerrarium,
  setSettings,
  setSites,
  updateMeta,
  updateSettings,
  validateImport,
} from '../shared/storage/storage';
import { localDayKey } from '../shared/utils/date';
import { ConfirmReset } from './components/ConfirmReset';
import { EmptyGarden } from './components/EmptyGarden';
import { PlantDetail } from './components/PlantDetail';
import { SettingsPanel } from './components/SettingsPanel';
import { StatsPanel } from './components/StatsPanel';
import { TerrariumCanvas } from './components/TerrariumCanvas';

const FILTERS: Array<{ value: TimelineFilter; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: '7 Days' },
  { value: '30days', label: '30 Days' },
  { value: 'all', label: 'All Time' },
];

type Panel = 'settings' | 'stats' | null;

export function App() {
  const [sites, setSiteState] = useState<SiteRecord[]>([]);
  const [settings, setSettingsState] = useState<TerrariumSettings | null>(null);
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [showReset, setShowReset] = useState(false);
  const [historyAllowed, setHistoryAllowed] = useState(false);
  const [growingIds, setGrowingIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const demoEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
  const extensionApiAvailable = typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);

  useEffect(() => {
    if (!extensionApiAvailable) {
      const demoSites = generateDemoSites();
      const previewMode = new URLSearchParams(window.location.search).get('preview');
      setSiteState(previewMode === 'single' ? demoSites.slice(0, 1) : demoSites);
      setSettingsState(DEFAULT_SETTINGS);
      setHistoryAllowed(true);
      setReady(true);
      return;
    }
    void Promise.all([
      getSites(),
      getSettings(),
      getMeta(),
      chrome.permissions.contains({ permissions: ['history'] }),
    ]).then(([storedSites, storedSettings, meta, allowed]) => {
      setSiteState(storedSites);
      setSettingsState(storedSettings);
      if (meta.lastDashboardOpenedAt) {
        setGrowingIds(
          storedSites
            .filter((site) => site.lastGrowthUpdateAt > meta.lastDashboardOpenedAt!)
            .map((site) => site.id),
        );
      }
      setHistoryAllowed(allowed);
      setReady(true);
      void updateMeta({ lastDashboardOpenedAt: Date.now() });
    });

    const handleChanges = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      if (changes[STORAGE_KEYS.sites]) {
        setSiteState((changes[STORAGE_KEYS.sites].newValue as SiteRecord[] | undefined) ?? []);
      }
      if (changes[STORAGE_KEYS.settings]?.newValue) {
        setSettingsState(changes[STORAGE_KEYS.settings].newValue as TerrariumSettings);
      }
    };
    chrome.storage.onChanged.addListener(handleChanges);
    return () => chrome.storage.onChanged.removeListener(handleChanges);
  }, [extensionApiAvailable]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setPanel(null);
        setShowReset(false);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const selected = sites.find((site) => site.id === selectedId) ?? null;
  const todayKey = localDayKey(Date.now());
  const activeToday = sites.filter((site) => (site.dailyActivity[todayKey]?.visits ?? 0) > 0).length;
  const newToday = sites.filter((site) => localDayKey(site.firstVisitedAt) === todayKey).length;
  const todayVisits = sites.reduce((sum, site) => sum + (site.dailyActivity[todayKey]?.visits ?? 0), 0);
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return sites
      .filter((site) =>
        `${site.hostname} ${site.displayName ?? ''}`.toLowerCase().includes(normalized),
      )
      .sort((a, b) => b.lastVisitedAt - a.lastVisitedAt)
      .slice(0, 7);
  }, [query, sites]);

  const requestHistory = async (): Promise<boolean> => {
    if (!extensionApiAvailable) {
      setHistoryAllowed(true);
      return true;
    }
    const allowed = await chrome.permissions.request({ permissions: ['history'] });
    setHistoryAllowed(allowed);
    return allowed;
  };

  const handleSettingsChange = async (patch: Partial<TerrariumSettings>) => {
    if (!extensionApiAvailable) {
      setSettingsState((current) => (current ? { ...current, ...patch } : current));
      return;
    }
    const updated = await updateSettings(patch);
    setSettingsState(updated);
  };

  const loadDemo = async () => {
    const demos = generateDemoSites();
    const existing = new Set(sites.map((site) => site.hostname));
    const merged = [...sites, ...demos.filter((site) => !existing.has(site.hostname))];
    if (extensionApiAvailable) await setSites(merged);
    else setSiteState(merged);
  };

  const exportData = () => {
    if (!settings) return;
    const data = JSON.stringify(makeExport(sites, settings), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `browser-terrarium-${localDayKey(Date.now())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    if (file.size > 20_000_000) throw new Error('That file is too large to be a terrarium export.');
    const imported = validateImport(JSON.parse(await file.text()) as unknown);
    if (extensionApiAvailable) {
      await Promise.all([setSites(imported.sites), setSettings(imported.settings)]);
    }
    setSiteState(imported.sites);
    setSettingsState(imported.settings);
  };

  const confirmReset = async () => {
    if (extensionApiAvailable) await resetTerrarium();
    setSiteState([]);
    setSelectedId(null);
    setPanel(null);
    setShowReset(false);
  };

  if (!ready || !settings) {
    return <div className="loading-screen"><span className="loading-leaf">⌁</span><p>Waking the glasshouse…</p></div>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="dashboard.html" aria-label="Browser Terrarium home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span><strong>Browser</strong><em>Terrarium</em></span>
        </a>

        <div className="search-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search plants…"
            aria-label="Search plants by domain"
            onFocus={() => setHighlightedId(searchResults[0]?.id ?? null)}
          />
          <kbd>Ctrl K</kbd>
          {query && (
            <div className="search-results" role="listbox" aria-label="Matching plants">
              {searchResults.length ? searchResults.map((site) => (
                <button
                  key={site.id}
                  role="option"
                  onMouseEnter={() => setHighlightedId(site.id)}
                  onClick={() => {
                    setSelectedId(site.id);
                    setHighlightedId(site.id);
                    setQuery('');
                  }}
                >
                  <span className="result-seed" aria-hidden="true" />
                  <span><strong>{site.hostname}</strong><small>{site.category}</small></span>
                </button>
              )) : <p>No plants found.</p>}
            </div>
          )}
        </div>

        <nav className="top-actions" aria-label="Terrarium tools">
          <button className={`icon-button ${panel === 'stats' ? 'active' : ''}`} onClick={() => setPanel(panel === 'stats' ? null : 'stats')} aria-label="View field notes">◫</button>
          <button className={`icon-button ${panel === 'settings' ? 'active' : ''}`} onClick={() => setPanel(panel === 'settings' ? null : 'settings')} aria-label="Open settings">⚙</button>
        </nav>
      </header>

      <section className="garden-frame" aria-label="Your Browser Terrarium">
        <div className="garden-toolbar">
          <div>
            <p className="eyebrow">Living locally on this device</p>
            <h1>Your Terrarium</h1>
          </div>
          <div className="toolbar-controls">
            <div className="view-toggle" role="group" aria-label="Terrarium view">
              <button
                className={settings.terrariumView === 'perspective' ? 'active' : ''}
                aria-pressed={settings.terrariumView === 'perspective'}
                onClick={() => void handleSettingsChange({ terrariumView: 'perspective' })}
                title="3D perspective view"
              >
                <span aria-hidden="true">◇</span> 3D
              </button>
              <button
                className={settings.terrariumView === 'flat' ? 'active' : ''}
                aria-pressed={settings.terrariumView === 'flat'}
                onClick={() => void handleSettingsChange({ terrariumView: 'flat' })}
                title="2D front view"
              >
                <span aria-hidden="true">▤</span> 2D
              </button>
            </div>
            <div className="filter-tabs" role="group" aria-label="Timeline emphasis">
              {FILTERS.map((item) => (
                <button key={item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="daily-note" aria-live="polite">
          <span className="pulse-dot" />
          <span>Since today began</span>
          <strong>{newToday ? `+${newToday} new ${newToday === 1 ? 'seed' : 'seeds'}` : 'No new seeds yet'}</strong>
          <span>·</span>
          <strong>{todayVisits} recorded {todayVisits === 1 ? 'visit' : 'visits'}</strong>
        </div>

        <div className="garden-content">
          <TerrariumCanvas
            sites={sites}
            filter={filter}
            selectedId={selectedId}
            highlightedId={highlightedId}
            growingIds={growingIds}
            settings={settings}
            onSelect={(site) => setSelectedId(site?.id ?? null)}
          />
          {sites.length === 0 && (
            <EmptyGarden historyAllowed={historyAllowed} demoEnabled={demoEnabled} onRequestHistory={requestHistory} onLoadDemo={loadDemo} />
          )}
          {selected && <PlantDetail site={selected} onClose={() => setSelectedId(null)} />}
          {panel === 'stats' && <StatsPanel sites={sites} onClose={() => setPanel(null)} />}
          {panel === 'settings' && (
            <SettingsPanel
              settings={settings}
              demoEnabled={demoEnabled}
              historyAllowed={historyAllowed}
              onRequestHistory={requestHistory}
              onChange={handleSettingsChange}
              onExport={exportData}
              onImport={importData}
              onReset={() => setShowReset(true)}
              onLoadDemo={loadDemo}
              onClose={() => setPanel(null)}
            />
          )}
        </div>

        <footer className="garden-footer">
          <div><strong>{sites.length.toLocaleString()}</strong><span>plants</span></div>
          <div><strong>{activeToday}</strong><span>active today</span></div>
          <div><strong>{newToday}</strong><span>new seeds</span></div>
          <p><span className={`privacy-dot ${historyAllowed ? '' : 'paused'}`} />{historyAllowed ? 'Private · stored only in this browser' : 'Visit tracking paused · history access is off'}</p>
        </footer>
      </section>

      {showReset && <ConfirmReset onCancel={() => setShowReset(false)} onConfirm={confirmReset} />}
    </main>
  );
}
