interface Props {
  historyAllowed: boolean;
  demoEnabled: boolean;
  onRequestHistory: () => Promise<boolean>;
  onLoadDemo: () => Promise<void>;
}

export function EmptyGarden({ historyAllowed, demoEnabled, onRequestHistory, onLoadDemo }: Props) {
  return (
    <div className="empty-garden">
      <span className="empty-seed" aria-hidden="true">◒</span>
      <p className="eyebrow">A quiet patch of soil</p>
      <h2>Your first seed is waiting.</h2>
      <p>
        Visit a normal website and return here. Its hostname will take root locally in this terrarium.
      </p>
      {!historyAllowed && <button className="primary-button" onClick={() => void onRequestHistory()}>Enable history access</button>}
      {demoEnabled && <button className="text-button" onClick={() => void onLoadDemo()}>Preview a sample garden</button>}
    </div>
  );
}
