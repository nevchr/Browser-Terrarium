import type { TerrariumGeometry } from './geometry';
import type { LayoutPlant } from './layout';

export interface TerrariumCamera {
  yaw: number;
  pitch: number;
  zoom: number;
}

export const DEFAULT_TERRARIUM_CAMERA: TerrariumCamera = {
  yaw: 0,
  pitch: 0,
  zoom: 1,
};

export const CAMERA_LIMITS = {
  yaw: 0.3,
  pitch: 0.22,
  minZoom: 0.9,
  maxZoom: 1.28,
} as const;

export function clampTerrariumCamera(camera: TerrariumCamera): TerrariumCamera {
  return {
    yaw: Math.max(-CAMERA_LIMITS.yaw, Math.min(CAMERA_LIMITS.yaw, camera.yaw)),
    pitch: Math.max(-CAMERA_LIMITS.pitch, Math.min(CAMERA_LIMITS.pitch, camera.pitch)),
    zoom: Math.max(CAMERA_LIMITS.minZoom, Math.min(CAMERA_LIMITS.maxZoom, camera.zoom)),
  };
}

export function cameraGeometry(
  width: number,
  base: TerrariumGeometry,
  camera: TerrariumCamera,
): TerrariumGeometry {
  const view = clampTerrariumCamera(camera);
  const centerX = width / 2;
  const surfaceCenterY = (base.soilBackY + base.soilFrontY) / 2;
  const surfaceDepth = base.soilFrontY - base.soilBackY;
  const depthScale = 1 + view.pitch * 0.5;
  const yawShift = view.yaw * width * 0.075 * view.zoom;

  const zoomX = (value: number) => centerX + (value - centerX) * view.zoom;
  const zoomY = (value: number) => surfaceCenterY + (value - surfaceCenterY) * view.zoom;
  const halfDepth = surfaceDepth * depthScale * view.zoom * 0.5;

  return {
    ...base,
    soilBackY: surfaceCenterY - halfDepth,
    soilFrontY: surfaceCenterY + halfDepth,
    soilBottomY: zoomY(base.soilBottomY),
    soilBackLeft: zoomX(base.soilBackLeft) + yawShift,
    soilBackRight: zoomX(base.soilBackRight) + yawShift,
    soilFrontLeft: zoomX(base.soilFrontLeft) - yawShift,
    soilFrontRight: zoomX(base.soilFrontRight) - yawShift,
  };
}

export function projectLayoutForCamera(
  plants: LayoutPlant[],
  base: TerrariumGeometry,
  view: TerrariumGeometry,
  camera: TerrariumCamera,
): LayoutPlant[] {
  const baseDepth = Math.max(1, base.soilFrontY - base.soilBackY);
  const projectedDepth = view.soilFrontY - view.soilBackY;
  const clampedCamera = clampTerrariumCamera(camera);

  return plants
    .map((entry) => {
      const depth = Math.max(0, Math.min(1, (entry.y - base.soilBackY) / baseDepth));
      const baseLeft = base.soilBackLeft + (base.soilFrontLeft - base.soilBackLeft) * depth;
      const baseRight = base.soilBackRight + (base.soilFrontRight - base.soilBackRight) * depth;
      const horizontal = Math.max(0, Math.min(1, (entry.x - baseLeft) / Math.max(1, baseRight - baseLeft)));
      const viewLeft = view.soilBackLeft + (view.soilFrontLeft - view.soilBackLeft) * depth;
      const viewRight = view.soilBackRight + (view.soilFrontRight - view.soilBackRight) * depth;

      return {
        ...entry,
        x: viewLeft + (viewRight - viewLeft) * horizontal,
        y: view.soilBackY + projectedDepth * depth,
        scale: entry.scale * clampedCamera.zoom,
        hitRadius: entry.hitRadius * clampedCamera.zoom,
      };
    })
    .sort((a, b) => a.y - b.y || a.site.plantSeed - b.site.plantSeed);
}
