interface Props {
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmReset({ onCancel, onConfirm }: Props) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" onMouseDown={(event) => event.stopPropagation()}>
        <p className="eyebrow">Fresh soil</p>
        <h2 id="reset-title">Reset your terrarium?</h2>
        <p>This removes all plants and locally stored Browser Terrarium data.</p>
        <p className="gentle-note">Your browser history will not be changed.</p>
        <div className="dialog-actions">
          <button className="wide-button" onClick={onCancel}>Keep my terrarium</button>
          <button className="wide-button danger-button" onClick={() => void onConfirm()}>Reset terrarium</button>
        </div>
      </div>
    </div>
  );
}
