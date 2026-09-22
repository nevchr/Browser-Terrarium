import type { PlantState, SiteCategory, SiteRecord } from '../../shared/models/types';
import { seededUnit } from '../../shared/utils/hash';
import { generatePlantState } from '../../shared/utils/plant';

export interface LayoutPlant {
  site: SiteRecord;
  plant: PlantState;
  x: number;
  y: number;
  scale: number;
  hitRadius: number;
}

const ZONES: Record<SiteCategory, [number, number]> = {
  Development: [0.28, 0.57],
  Education: [0.42, 0.49],
  Reference: [0.55, 0.55],
  Productivity: [0.68, 0.52],
  News: [0.76, 0.62],
  Social: [0.63, 0.72],
  Video: [0.48, 0.76],
  Music: [0.34, 0.74],
  Games: [0.21, 0.69],
  Shopping: [0.79, 0.74],
  Other: [0.51, 0.65],
};

function cellKey(x: number, y: number, cellSize: number): string {
  return `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;
}

export function computeLayout(
  sites: SiteRecord[],
  width: number,
  height: number,
  now = Date.now(),
): LayoutPlant[] {
  const floorTop = Math.max(150, height * 0.34);
  const floorHeight = Math.max(150, height * 0.55);
  const countScale = Math.max(0.52, Math.min(1, 1.2 - sites.length / 2600));
  const collisionDistance = Math.max(12, 27 * countScale);
  const grid = new Map<string, Array<{ x: number; y: number }>>();

  return [...sites]
    .sort((a, b) => a.plantSeed - b.plantSeed || a.hostname.localeCompare(b.hostname))
    .map((site, index) => {
      const plant = generatePlantState(site, now);
      const [zoneX, zoneY] = ZONES[site.category];
      const baseX =
        width * (zoneX + (seededUnit(site.plantSeed, 31) - 0.5) * (sites.length > 180 ? 0.42 : 0.27));
      const baseY =
        floorTop +
        floorHeight *
          (zoneY - 0.42 + (seededUnit(site.plantSeed, 32) - 0.5) * (sites.length > 180 ? 0.42 : 0.28));
      let x = Math.max(width * 0.07, Math.min(width * 0.93, baseX));
      let y = Math.max(floorTop, Math.min(height * 0.9, baseY));

      for (let attempt = 0; attempt < 30; attempt += 1) {
        const keyX = Math.floor(x / collisionDistance);
        const keyY = Math.floor(y / collisionDistance);
        let clear = true;
        for (let dx = -1; dx <= 1 && clear; dx += 1) {
          for (let dy = -1; dy <= 1 && clear; dy += 1) {
            const neighbors = grid.get(`${keyX + dx}:${keyY + dy}`) ?? [];
            clear = neighbors.every(
              (point) => Math.hypot(point.x - x, (point.y - y) * 1.6) >= collisionDistance,
            );
          }
        }
        if (clear) break;
        const angle = seededUnit(site.plantSeed, 33) * Math.PI * 2 + attempt * 2.399;
        const radius = collisionDistance * (1 + Math.sqrt(attempt));
        x = Math.max(width * 0.06, Math.min(width * 0.94, baseX + Math.cos(angle) * radius));
        y = Math.max(floorTop, Math.min(height * 0.9, baseY + Math.sin(angle) * radius * 0.46));
      }

      const key = cellKey(x, y, collisionDistance);
      grid.set(key, [...(grid.get(key) ?? []), { x, y }]);
      const depth = Math.max(0.62, Math.min(1.14, 0.63 + (y / height) * 0.55));
      const scale = countScale * depth * (0.82 + seededUnit(site.plantSeed, 34) * 0.3);

      return {
        site,
        plant,
        x,
        y,
        scale,
        hitRadius: Math.max(12, (11 + plant.growthLevel * 13) * scale),
      };
    })
    .sort((a, b) => a.y - b.y || a.site.plantSeed - b.site.plantSeed)
    .map((entry, index, entries) => ({
      ...entry,
      // A tiny deterministic depth stagger keeps exact ties from shimmering.
      y: entry.y + (index / Math.max(1, entries.length)) * 0.01,
    }));
}
