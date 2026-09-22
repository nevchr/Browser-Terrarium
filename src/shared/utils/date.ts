const DAY_MS = 86_400_000;

export function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(timestamp = Date.now()): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysSince(timestamp: number, now = Date.now()): number {
  return Math.max(0, (now - timestamp) / DAY_MS);
}

export function relativeDate(timestamp: number, now = Date.now()): string {
  const days = Math.floor(daysSince(timestamp, now));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    timestamp,
  );
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return seconds > 0 ? '< 1m' : '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function cutoffForFilter(filter: 'today' | '7days' | '30days' | 'all', now: number): number {
  switch (filter) {
    case 'today':
      return startOfLocalDay(now);
    case '7days':
      return now - 7 * DAY_MS;
    case '30days':
      return now - 30 * DAY_MS;
    default:
      return 0;
  }
}
