import { describe, expect, it } from 'vitest';
import {
  CAMERA_LIMITS,
  cameraGeometry,
  clampTerrariumCamera,
  DEFAULT_TERRARIUM_CAMERA,
  projectLayoutForCamera,
} from '../src/dashboard/terrarium/camera';
import { getTerrariumGeometry, soilBoundsAtDepth } from '../src/dashboard/terrarium/geometry';
import { computeLayout } from '../src/dashboard/terrarium/layout';
import type { SiteRecord } from '../src/shared/models/types';
import { hashString } from '../src/shared/utils/hash';

const NOW = 1_800_000_000_000;

function makeSites(count: number): SiteRecord[] {
  return Array.from({ length: count }, (_, index) => {
    const hostname = `camera-${index}.example`;
    return {
      id: hostname,
      hostname,
      firstVisitedAt: NOW - index * 1_000,
      lastVisitedAt: NOW - index * 10_000,
      totalVisits: 1 + index,
      activeTimeSeconds: index * 45,
      lastGrowthUpdateAt: NOW,
      category: 'Other',
      plantSeed: hashString(hostname),
      createdAt: NOW - index * 1_000,
      dailyActivity: {},
    };
  });
}

describe('interactive terrarium camera', () => {
  it('keeps the default 3D projection aligned with the original soil bed', () => {
    const base = getTerrariumGeometry(1_200, 700, 'perspective');
    const view = cameraGeometry(1_200, base, DEFAULT_TERRARIUM_CAMERA);
    expect(view.soilBackY).toBeCloseTo(base.soilBackY);
    expect(view.soilFrontY).toBeCloseTo(base.soilFrontY);
    expect(view.soilBackLeft).toBeCloseTo(base.soilBackLeft);
    expect(view.soilFrontRight).toBeCloseTo(base.soilFrontRight);
  });

  it('clamps orbit and zoom values to safe limits', () => {
    expect(clampTerrariumCamera({ yaw: 20, pitch: -20, zoom: 9 })).toEqual({
      yaw: CAMERA_LIMITS.yaw,
      pitch: -CAMERA_LIMITS.pitch,
      zoom: CAMERA_LIMITS.maxZoom,
    });
    expect(clampTerrariumCamera({ yaw: -20, pitch: 20, zoom: 0.1 }).zoom).toBe(
      CAMERA_LIMITS.minZoom,
    );
  });

  it('keeps extreme camera angles as a shallow bed instead of a wall of soil', () => {
    const width = 1_600;
    const height = 800;
    const base = getTerrariumGeometry(width, height, 'perspective');
    const view = cameraGeometry(width, base, {
      yaw: CAMERA_LIMITS.yaw,
      pitch: CAMERA_LIMITS.pitch,
      zoom: CAMERA_LIMITS.maxZoom,
    });

    expect(view.soilBackY).toBeGreaterThan(height * 0.55);
    expect(view.soilFrontY - view.soilBackY).toBeLessThan(height * 0.3);
    expect(view.soilBottomY - view.soilFrontY).toBeLessThan(height * 0.15);
  });

  it('keeps projected plant bases rooted inside the transformed soil surface', () => {
    const width = 1_300;
    const height = 760;
    const base = getTerrariumGeometry(width, height, 'perspective');
    const camera = { yaw: 0.62, pitch: 0.42, zoom: 1.45 };
    const view = cameraGeometry(width, base, camera);
    const projected = projectLayoutForCamera(
      computeLayout(makeSites(160), width, height, NOW, 'perspective'),
      base,
      view,
      camera,
    );

    for (const entry of projected) {
      const depth = (entry.y - view.soilBackY) / (view.soilFrontY - view.soilBackY);
      const bounds = soilBoundsAtDepth(view, depth);
      expect(entry.y).toBeGreaterThanOrEqual(view.soilBackY);
      expect(entry.y).toBeLessThanOrEqual(view.soilFrontY);
      expect(entry.x).toBeGreaterThanOrEqual(bounds.left);
      expect(entry.x).toBeLessThanOrEqual(bounds.right);
    }
  });
});
