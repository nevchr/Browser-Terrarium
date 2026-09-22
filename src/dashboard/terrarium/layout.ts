import type {
  PlantState,
  SiteCategory,
  SiteRecord,
  TerrariumViewMode,
} from '../../shared/models/types';
import { seededUnit } from '../../shared/utils/hash';
import { generatePlantState } from '../../shared/utils/plant';
import { getTerrariumGeometry, soilBoundsAtDepth } from './geometry';

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
  view: TerrariumViewMode = 'perspective',
): LayoutPlant[] {
  const geometry = getTerrariumGeometry(width, height, view);
  const countScale = Math.max(0.52, Math.min(1, 1.2 - sites.length / 2600));
  const collisionDistance = Math.max(12, 27 * countScale);
  const grid = new Map<string, Array<{ x: number; y: number }>>();

  return [...sites]
    .sort((a, b) => a.plantSeed - b.plantSeed || a.hostname.localeCompare(b.hostname))
    .map((site, index) => {
      const plant = generatePlantState(site, now);
      const [zoneX, zoneY] = ZONES[site.category];
      const xScatter = sites.length > 180 ? 0.42 : 0.25;
      const normalizedX = Math.max(
        0.02,
        Math.min(0.98, zoneX + (seededUnit(site.plantSeed, 31) - 0.5) * xScatter),
      );
      const baseDepth = Math.max(0, Math.min(1, (zoneY - 0.48) / 0.31));
      const depth =
        view === 'perspective'
          ? Math.max(
              0.03,
              Math.min(
                0.97,
                baseDepth +
                  (seededUnit(site.plantSeed, 32) - 0.5) * (sites.length > 180 ? 0.5 : 0.26),
              ),
            )
          : 0;
      const initialBounds = soilBoundsAtDepth(geometry, depth);
      const baseX = initialBounds.left + (initialBounds.right - initialBounds.left) * normalizedX;
      const baseY =
        view === 'perspective'
          ? geometry.soilBackY +
            8 +
            (geometry.soilFrontY - geometry.soilBackY - 18) * depth
          : geometry.soilBackY + 2;
      let x = baseX;
      let y = baseY;

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
        if (view === 'flat') {
          const step = Math.ceil((attempt + 1) / 2);
          const direction = attempt % 2 === 0 ? -1 : 1;
          x = Math.max(
            geometry.soilBackLeft + 10,
            Math.min(
              geometry.soilBackRight - 10,
              baseX + direction * step * collisionDistance * 0.92,
            ),
          );
          y = baseY;
        } else {
          const angle = seededUnit(site.plantSeed, 33) * Math.PI * 2 + attempt * 2.399;
          const radius = collisionDistance * (1 + Math.sqrt(attempt));
          y = Math.max(
            geometry.soilBackY + 7,
            Math.min(geometry.soilFrontY - 10, baseY + Math.sin(angle) * radius * 0.46),
          );
          const candidateDepth =
            (y - geometry.soilBackY) / (geometry.soilFrontY - geometry.soilBackY);
          const bounds = soilBoundsAtDepth(geometry, candidateDepth);
          x = Math.max(
            bounds.left + 8,
            Math.min(bounds.right - 8, baseX + Math.cos(angle) * radius),
          );
        }
      }

      const key = cellKey(x, y, collisionDistance);
      grid.set(key, [...(grid.get(key) ?? []), { x, y }]);
      const perspectiveDepth =
        view === 'perspective'
          ? Math.max(
              0,
              Math.min(
                1,
                (y - geometry.soilBackY) / (geometry.soilFrontY - geometry.soilBackY),
              ),
            )
          : 0.55;
      const depthScale = view === 'perspective' ? 0.72 + perspectiveDepth * 0.36 : 0.92;
      const scale = countScale * depthScale * (0.84 + seededUnit(site.plantSeed, 34) * 0.28);

      return {
        site,
        plant,
        x,
        y,
        scale,
        hitRadius: Math.max(12, (11 + plant.growthLevel * 13) * scale),
      };
    })
    .sort((a, b) =>
      view === 'perspective'
        ? a.y - b.y || a.site.plantSeed - b.site.plantSeed
        : a.x - b.x || a.site.plantSeed - b.site.plantSeed,
    )
    .map((entry, index, entries) => ({
      ...entry,
      // A tiny deterministic depth stagger keeps exact ties from shimmering.
      y: entry.y + (index / Math.max(1, entries.length)) * 0.01,
    }));
}
