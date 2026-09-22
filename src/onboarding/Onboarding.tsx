import { useState } from 'react';
import { updateMeta } from '../shared/storage/storage';

type State = 'intro' | 'requesting' | 'ready' | 'declined';

export function Onboarding() {
  const [state, setState] = useState<State>('intro');
  const extensionApiAvailable = typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);

  const openDashboard = async () => {
    if (extensionApiAvailable) {
      await updateMeta({ onboardingComplete: true });
      window.location.href = chrome.runtime.getURL('dashboard.html');
    } else {
      window.location.href = 'dashboard.html';
    }
  };

  const grantAndGrow = async () => {
    setState('requesting');
    if (!extensionApiAvailable) {
      setState('ready');
      await openDashboard();
      return;
    }
    const allowed = await chrome.permissions.request({ permissions: ['history'] });
    setState(allowed ? 'ready' : 'declined');
    if (allowed) await openDashboard();
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-copy">
        <a className="onboarding-brand" href="#top"><span>⌁</span> Browser Terrarium</a>
        <p className="onboarding-eyebrow">A private garden for your browser</p>
        <h1>Your browsing can grow into something living.</h1>
        <p className="intro-copy">
          Websites become plants. Familiar places grow with return visits, while long-quiet plants simply rest until you come back.
        </p>
        <ul>
          <li><span>01</span><div><strong>Websites become plants</strong><p>Each hostname receives a stable seed and one recognizable species.</p></div></li>
          <li><span>02</span><div><strong>Visits shape the garden</strong><p>Frequency, recent activity, and approximate focused time guide gentle growth.</p></div></li>
          <li><span>03</span><div><strong>Everything stays here</strong><p>No account, backend, analytics, or cloud history. Your terrarium lives in extension storage.</p></div></li>
        </ul>

        <div className="permission-explainer">
          <span className="lock-mark" aria-hidden="true">⌂</span>
          <div>
            <strong>Why history access?</strong>
            <p>Browser Terrarium uses Chrome's history events to learn which hostnames should become plants. It stores hostnames—not full URL paths—and never uploads them.</p>
          </div>
        </div>

        {state === 'declined' && <p className="declined-note" role="status">History access was not enabled. You can continue to the empty garden and enable it later in Settings.</p>}
        <div className="onboarding-actions">
          {state !== 'declined' ? (
            <button className="grow-button" disabled={state === 'requesting'} onClick={() => void grantAndGrow()}>{state === 'requesting' ? 'Opening Chrome’s permission prompt…' : 'Grow my terrarium'} <span>→</span></button>
          ) : (
            <button className="grow-button" onClick={() => void openDashboard()}>Continue to terrarium <span>→</span></button>
          )}
          {state === 'intro' && <button className="later-button" onClick={() => void openDashboard()}>Not now</button>}
        </div>
      </section>

      <section className="onboarding-art" aria-label="Illustration of a glass terrarium">
        <div className="moon" />
        <div className="glass">
          <span className="glass-shine" />
          <div className="island">
            <i className="stone one" /><i className="stone two" />
            <div className="plant tall"><b /><b /><b /><b /></div>
            <div className="plant fern"><b /><b /><b /></div>
            <div className="plant small"><b /><b /></div>
            <div className="sprout"><i /><i /></div>
          </div>
        </div>
        <p>Grown from local browsing metadata</p>
      </section>
    </main>
  );
}
