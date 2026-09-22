import type { SiteCategory, SiteRecord } from '../models/types';
import { categoryForHostname } from '../utils/domain';
import { hashString, seededUnit } from '../utils/hash';
import { localDayKey } from '../utils/date';

const DOMAINS = [
  'github.com',
  'youtube.com',
  'wikipedia.org',
  'reddit.com',
  'spotify.com',
  'stackoverflow.com',
  'developer.mozilla.org',
  'notion.so',
  'figma.com',
  'cbc.ca',
  'reuters.com',
  'khanacademy.org',
  'coursera.org',
  'itch.io',
  'steampowered.com',
  'roblox.com',
  'soundcloud.com',
  'vimeo.com',
  'archive.org',
  'npmjs.com',
  'gitlab.com',
  'trello.com',
  'etsy.com',
  'amazon.ca',
  'theguardian.com',
  'arstechnica.com',
  'codepen.io',
  'observablehq.com',
  'openstreetmap.org',
  'unsplash.com',
  'gutenberg.org',
  'letterboxd.com',
  'bandcamp.com',
  'allrecipes.com',
  'inaturalist.org',
  'boardgamegeek.com',
  'producthunt.com',
  'web.dev',
  'canva.com',
  'duolingo.com',
  'oldforum.net',
  'tinygarden.blog',
  'localmuseum.org',
  'fieldnotes.site',
  'weatheratlas.test',
  'quietlibrary.test',
  'nightarchive.test',
  'mossjournal.test',
];

export function generateDemoSites(count = 44, now = Date.now()): SiteRecord[] {
  return DOMAINS.slice(0, Math.max(30, Math.min(count, DOMAINS.length))).map(
    (hostname, index) => {
      const seed = hashString(hostname);
      const ageDays = Math.floor(2 + seededUnit(seed, 20) * 220);
      const recencyRoll = seededUnit(seed, 21);
      const daysAgo =
        index < 7
          ? 0
          : recencyRoll < 0.42
            ? Math.floor(recencyRoll * 16)
            : recencyRoll < 0.82
              ? Math.floor(7 + recencyRoll * 30)
              : Math.floor(55 + recencyRoll * 90);
      const firstVisitedAt = now - ageDays * 86_400_000;
      const lastVisitedAt = now - daysAgo * 86_400_000;
      const totalVisits = Math.max(1, Math.floor(1 + seededUnit(seed, 22) ** 1.6 * 180));
      const activeTimeSeconds = Math.floor(
        totalVisits * (60 + seededUnit(seed, 23) * 420),
      );
      const category = categoryForHostname(hostname) as SiteCategory;
      const dailyActivity: SiteRecord['dailyActivity'] = {
        [localDayKey(lastVisitedAt)]: {
          visits: Math.min(totalVisits, 1 + Math.floor(seededUnit(seed, 24) * 7)),
          activeTimeSeconds: Math.min(
            activeTimeSeconds,
            Math.floor(120 + seededUnit(seed, 25) * 3600),
          ),
        },
      };

      return {
        id: hostname,
        hostname,
        firstVisitedAt,
        lastVisitedAt,
        totalVisits,
        activeTimeSeconds,
        lastGrowthUpdateAt: lastVisitedAt,
        category,
        plantSeed: seed,
        createdAt: firstVisitedAt,
        dailyActivity,
      };
    },
  );
}
