import { useEffect, useMemo, useState } from 'react';
import type { SiteRecord } from '../shared/models/types';
import { generateDemoSites } from '../shared/dev/generateDemoData';
import { getMeta, getSites } from '../shared/storage/storage';
import { localDayKey } from '../shared/utils/date';
import { hostnameFromUrl } from '../shared/utils/domain';
import { generatePlantState } from '../shared/utils/plant';

export function Popup() {
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [currentHostname, setCurrentHostname] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      setSites(generateDemoSites());
      setCurrentHostname('github.com');
      setOnboarded(true);
      return;
    }
    void Promise.all([
      getSites(),
      chrome.tabs.query({ active: true, currentWindow: true }),
      getMeta(),
    ]).then(([storedSites, tabs, meta]) => {
      setSites(storedSites);
      setCurrentHostname(hostnameFromUrl(tabs[0]?.url));
      setOnboarded(meta.onboardingComplete);
    });
  }, []);

  const todayKey = localDayKey(Date.now());
  const activeToday = sites.filter((site) => (site.dailyActivity[todayKey]?.visits ?? 0) > 0).length;
  const newToday = sites.filter((site) => localDayKey(site.firstVisitedAt) === todayKey).length;
  const current = sites.find((site) => site.hostname === currentHostname);
  const currentPlant = useMemo(() => (current ? generatePlantState(current) : null), [current]);

  const openPage = async (path: string) => {
    await chrome.tabs.create({ url: chrome.runtime.getURL(path) });
    window.close();
  };

  return (
    <main className="popup-shell">
      <header>
        <span className="popup-mark" aria-hidden="true">⌁</span>
        <div><strong>Browser Terrarium</strong><span>Local glasshouse</span></div>
      </header>

      {!onboarded ? (
        <section className="popup-welcome">
          <p className="popup-eyebrow">A seed is waiting</p>
          <h1>Welcome to your private terrarium.</h1>
          <p>See how websites become plants, all on this device.</p>
          <button className="open-button" onClick={() => void openPage('onboarding.html')}>Begin growing <span>→</span></button>
        </section>
      ) : (
        <>
          <section className="today-card">
            <p className="popup-eyebrow">Today's activity</p>
            <div className="today-grid">
              <div><strong>{activeToday}</strong><span>plants visited</span></div>
              <div><strong>{newToday}</strong><span>new seeds</span></div>
            </div>
          </section>

          <section className="current-card">
            <p className="popup-eyebrow">Current plant</p>
            {current && currentPlant ? (
              <div className="current-row">
                <span className="mini-plant" style={{ '--hue': currentPlant.species.hue } as React.CSSProperties}><i /><i /></span>
                <div><strong>{current.hostname}</strong><span>{currentPlant.species.name}</span></div>
                <span className={`condition ${currentPlant.dormant ? 'dormant' : ''}`}>{currentPlant.dormant ? 'Resting' : 'Growing'}</span>
              </div>
            ) : (
              <p className="current-empty">Open a tracked web page to meet its plant.</p>
            )}
          </section>

          <button className="open-button" onClick={() => void openPage('dashboard.html')}>Open terrarium <span>→</span></button>
        </>
      )}
      <footer><span /> Everything stays in this browser</footer>
    </main>
  );
}
