import type { SiteRecord } from '../../shared/models/types';
import { localDayKey, startOfLocalDay } from '../../shared/utils/date';

interface Props {
  sites: SiteRecord[];
  onClose: () => void;
}

export function StatsPanel({ sites, onClose }: Props) {
  const todayKey = localDayKey(Date.now());
  const weekAgo = Date.now() - 7 * 86_400_000;
  const activeToday = sites.filter((site) => (site.dailyActivity[todayKey]?.visits ?? 0) > 0).length;
  const newThisWeek = sites.filter((site) => site.firstVisitedAt >= weekAgo).length;
  const oldest = [...sites].sort((a, b) => a.firstVisitedAt - b.firstVisitedAt)[0];
  const mostVisited = [...sites].sort((a, b) => b.totalVisits - a.totalVisits)[0];

  return (
    <aside className="detail-panel stats-panel" aria-label="Terrarium statistics">
      <button className="icon-button detail-close" onClick={onClose} aria-label="Close statistics">×</button>
      <p className="eyebrow">Field notes</p>
      <h2>Your terrarium</h2>
      <p className="muted">A quiet local summary of what has taken root.</p>
      <dl className="stats-list">
        <div><dt>Total plants</dt><dd>{sites.length.toLocaleString()}</dd></div>
        <div><dt>Active today</dt><dd>{activeToday}</dd></div>
        <div><dt>New this week</dt><dd>{newThisWeek}</dd></div>
        <div><dt>Oldest plant</dt><dd>{oldest?.hostname ?? '—'}</dd></div>
        <div><dt>Most visited</dt><dd>{mostVisited?.hostname ?? '—'}</dd></div>
      </dl>
      <p className="gentle-note">
        “Active today” means at least one recorded visit since {new Date(startOfLocalDay()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
      </p>
    </aside>
  );
}
