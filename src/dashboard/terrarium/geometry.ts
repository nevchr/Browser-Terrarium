import type { TerrariumViewMode } from '../../shared/models/types';

export interface TerrariumGeometry {
  glassX: number;
  glassY: number;
  glassWidth: number;
  glassHeight: number;
  glassRadius: number;
  soilBackY: number;
  soilFrontY: number;
  soilBottomY: number;
  soilBackLeft: number;
  soilBackRight: number;
  soilFrontLeft: number;
  soilFrontRight: number;
}

export function getTerrariumGeometry(
  width: number,
  height: number,
  view: TerrariumViewMode,
): TerrariumGeometry {
  const shared = {
    glassX: width * 0.035,
    glassY: height * 0.035,
    glassWidth: width * 0.93,
    glassHeight: height * 0.91,
    glassRadius: Math.min(42, width * 0.04),
  };

  if (view === 'flat') {
    return {
      ...shared,
      soilBackY: height * 0.72,
      soilFrontY: height * 0.72,
      soilBottomY: height * 0.91,
      soilBackLeft: width * 0.055,
      soilBackRight: width * 0.945,
      soilFrontLeft: width * 0.055,
      soilFrontRight: width * 0.945,
    };
  }

  return {
    ...shared,
    soilBackY: height * 0.52,
    soilFrontY: height * 0.835,
    soilBottomY: height * 0.91,
    soilBackLeft: width * 0.105,
    soilBackRight: width * 0.895,
    soilFrontLeft: width * 0.055,
    soilFrontRight: width * 0.945,
  };
}

export function soilBoundsAtDepth(
  geometry: TerrariumGeometry,
  depth: number,
): { left: number; right: number } {
  const clamped = Math.max(0, Math.min(1, depth));
  return {
    left: geometry.soilBackLeft + (geometry.soilFrontLeft - geometry.soilBackLeft) * clamped,
    right:
      geometry.soilBackRight +
      (geometry.soilFrontRight - geometry.soilBackRight) * clamped,
  };
}
