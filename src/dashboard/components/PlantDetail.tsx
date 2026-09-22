import type { SiteRecord } from '../../shared/models/types';
import { formatDate, formatDuration, relativeDate } from '../../shared/utils/date';
import { generatePlantState } from '../../shared/utils/plant';

interface Props {
  site: SiteRecord;
  onClose: () => void;
}

export function PlantDetail({ site, onClose }: Props) {
  const plant = generatePlantState(site);
  const growthPercent = Math.round(plant.growthLevel * 100);

  return (
    <aside className="detail-panel" aria-label={`Details for ${site.hostname}`}>
      <button className="icon-button detail-close" onClick={onClose} aria-label="Close plant details">
        ×
      </button>
      <p className="eyebrow">{plant.dormant ? 'Resting plant' : site.category}</p>
      <h2>{site.hostname}</h2>
      {site.displayName && <p className="muted detail-title">{site.displayName}</p>}
      <div className="species-card">
        <span className="species-mark" style={{ '--plant-hue': plant.species.hue } as React.CSSProperties}>✦</span>
        <div>
          <span>Species</span>
          <strong>{plant.species.name}</strong>
        </div>
      </div>
      <div className="growth-block">
        <div className="row-label"><span>Growth</span><span>{growthPercent}%</span></div>
        <div className="growth-track" aria-label={`${growthPercent}% grown`}>
          <span style={{ width: `${growthPercent}%` }} />
        </div>
      </div>
      <dl className="detail-list">
        <div><dt>Visits</dt><dd>{site.totalVisits.toLocaleString()}</dd></div>
        <div><dt>Active time</dt><dd>{formatDuration(site.activeTimeSeconds)}</dd></div>
        <div><dt>First seen</dt><dd>{formatDate(site.firstVisitedAt)}</dd></div>
        <div><dt>Last seen</dt><dd>{relativeDate(site.lastVisitedAt)}</dd></div>
        <div><dt>Condition</dt><dd>{plant.dormant ? 'Dormant' : plant.health > 0.82 ? 'Vibrant' : 'Quiet'}</dd></div>
      </dl>
      <p className="gentle-note">
        Dormant plants are never lost. A return visit helps this one brighten again.
      </p>
    </aside>
  );
}
