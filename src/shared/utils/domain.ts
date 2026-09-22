import type { SiteCategory } from '../models/types';

const COMMON_SECOND_LEVEL_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'co.jp',
  'co.in',
  'com.br',
  'com.mx',
  'com.sg',
]);

const PRESERVED_SUBDOMAINS = new Set([
  'docs.google.com',
  'drive.google.com',
  'calendar.google.com',
  'mail.google.com',
  'news.google.com',
  'music.youtube.com',
  'developer.mozilla.org',
]);

const CATEGORY_MAP: Record<string, SiteCategory> = {
  'github.com': 'Development',
  'gitlab.com': 'Development',
  'stackoverflow.com': 'Development',
  'developer.mozilla.org': 'Development',
  'npmjs.com': 'Development',
  'youtube.com': 'Video',
  'vimeo.com': 'Video',
  'twitch.tv': 'Video',
  'netflix.com': 'Video',
  'spotify.com': 'Music',
  'soundcloud.com': 'Music',
  'music.youtube.com': 'Music',
  'reddit.com': 'Social',
  'facebook.com': 'Social',
  'instagram.com': 'Social',
  'linkedin.com': 'Social',
  'discord.com': 'Social',
  'x.com': 'Social',
  'wikipedia.org': 'Reference',
  'dictionary.com': 'Reference',
  'archive.org': 'Reference',
  'khanacademy.org': 'Education',
  'coursera.org': 'Education',
  'edx.org': 'Education',
  'amazon.com': 'Shopping',
  'amazon.ca': 'Shopping',
  'etsy.com': 'Shopping',
  'ebay.com': 'Shopping',
  'bbc.com': 'News',
  'cbc.ca': 'News',
  'reuters.com': 'News',
  'nytimes.com': 'News',
  'steampowered.com': 'Games',
  'itch.io': 'Games',
  'roblox.com': 'Games',
  'notion.so': 'Productivity',
  'trello.com': 'Productivity',
  'calendar.google.com': 'Productivity',
  'drive.google.com': 'Productivity',
  'docs.google.com': 'Productivity',
};

export function isTrackableUrl(rawUrl?: string): boolean {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeHostname(input: string): string | null {
  let hostname = input.trim().toLowerCase().replace(/\.$/, '');

  if (hostname.includes('://')) {
    try {
      hostname = new URL(hostname).hostname.toLowerCase().replace(/\.$/, '');
    } catch {
      return null;
    }
  }

  if (!hostname || hostname === 'localhost') return null;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) return hostname;
  if (PRESERVED_SUBDOMAINS.has(hostname)) return hostname;

  hostname = hostname.replace(/^(www\d*|m|mobile)\./, '');
  if (PRESERVED_SUBDOMAINS.has(hostname)) return hostname;

  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 2) return null;
  const finalTwo = parts.slice(-2).join('.');
  const suffixLength = COMMON_SECOND_LEVEL_SUFFIXES.has(finalTwo) ? 3 : 2;
  return parts.slice(-suffixLength).join('.');
}

export function hostnameFromUrl(rawUrl?: string): string | null {
  if (!isTrackableUrl(rawUrl)) return null;
  return normalizeHostname(new URL(rawUrl!).hostname);
}

export function categoryForHostname(hostname: string): SiteCategory {
  if (CATEGORY_MAP[hostname]) return CATEGORY_MAP[hostname];
  const match = Object.entries(CATEGORY_MAP).find(([domain]) => hostname.endsWith(`.${domain}`));
  return match?.[1] ?? 'Other';
}

export function displayNameForHostname(hostname: string): string {
  const base = hostname.split('.')[0] ?? hostname;
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
