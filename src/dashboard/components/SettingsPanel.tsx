import { useRef, useState } from 'react';
import type { TerrariumSettings } from '../../shared/models/types';

interface Props {
  settings: TerrariumSettings;
  demoEnabled: boolean;
  historyAllowed: boolean;
  onRequestHistory: () => Promise<boolean>;
  onChange: (patch: Partial<TerrariumSettings>) => Promise<void>;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onReset: () => void;
  onLoadDemo: () => Promise<void>;
  onClose: () => void;
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle-row">
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-control" aria-hidden="true"><span /></span>
    </label>
  );
}

export function SettingsPanel({
  settings,
  demoEnabled,
  historyAllowed,
  onRequestHistory,
  onChange,
  onExport,
  onImport,
  onReset,
  onLoadDemo,
  onClose,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const requestHistory = async () => {
    const allowed = await onRequestHistory();
    setMessage(allowed ? 'History access enabled. New visits can now become plants.' : 'History access was not enabled.');
  };

  return (
    <aside className="settings-panel" aria-label="Terrarium settings">
      <div className="settings-heading">
        <div><p className="eyebrow">Glasshouse controls</p><h2>Settings</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close settings">×</button>
      </div>

      <section className="settings-section permission-card">
        <div>
          <span className={`status-dot ${historyAllowed ? 'allowed' : ''}`} />
          <strong>Browsing history access</strong>
          <p>
            Used only to turn visited hostnames into plants. Full URL paths are not stored and nothing leaves this device.
          </p>
        </div>
        {!historyAllowed && <button className="small-button" onClick={() => void requestHistory()}>Enable access</button>}
        {historyAllowed && <span className="permission-label">Enabled</span>}
      </section>

      <section className="settings-section">
        <h3>Tracking</h3>
        <Toggle label="Track active time" description="Estimate time while a web tab is active and focused." checked={settings.trackActiveTime} onChange={(value) => void onChange({ trackActiveTime: value })} />
        <Toggle label="Track new sites" description="Allow newly visited domains to become plants." checked={settings.trackNewSites} onChange={(value) => void onChange({ trackNewSites: value })} />
      </section>

      <section className="settings-section">
        <h3>Visuals</h3>
        <Toggle label="Plant motion" description="Gently sway vibrant plants." checked={settings.plantMotion} onChange={(value) => void onChange({ plantMotion: value })} />
        <Toggle label="Ambient particles" description="Show a few drifting motes inside the glass." checked={settings.ambientParticles} onChange={(value) => void onChange({ ambientParticles: value })} />
        <Toggle label="Seasonal light" description="Subtly tune the atmosphere to the local month." checked={settings.seasonalEffects} onChange={(value) => void onChange({ seasonalEffects: value })} />
      </section>

      <section className="settings-section">
        <h3>Privacy</h3>
        <Toggle label="Store page titles" description="Off by default. Hostnames are enough for the garden." checked={settings.storePageTitles} onChange={(value) => void onChange({ storePageTitles: value })} />
      </section>

      <section className="settings-section data-actions">
        <h3>Data</h3>
        <button className="wide-button" onClick={onExport}>Export terrarium data</button>
        <button className="wide-button" onClick={() => fileRef.current?.click()}>Import terrarium data</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setMessage('Checking import…');
            void onImport(file)
              .then(() => setMessage('Terrarium imported.'))
              .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Import failed.'));
            event.currentTarget.value = '';
          }}
        />
        {demoEnabled && <button className="wide-button" onClick={() => void onLoadDemo().then(() => setMessage('A 44-plant sample garden is ready.'))}>Grow sample garden</button>}
        <button className="wide-button danger-button" onClick={onReset}>Reset terrarium</button>
      </section>
      {message && <p className="settings-message" role="status">{message}</p>}
    </aside>
  );
}
