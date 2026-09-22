import type { TerrariumSettings, TimelineFilter } from '../../shared/models/types';
import { cutoffForFilter } from '../../shared/utils/date';
import { seededUnit } from '../../shared/utils/hash';
import { getTerrariumGeometry, soilBoundsAtDepth, type TerrariumGeometry } from './geometry';
import type { LayoutPlant } from './layout';

export interface DrawOptions {
  width: number;
  height: number;
  time: number;
  now: number;
  filter: TimelineFilter;
  selectedId: string | null;
  hoveredId: string | null;
  settings: TerrariumSettings;
  reducedMotion: boolean;
  leafLimit: number;
  growingIds: ReadonlySet<string>;
  growthProgress: number;
  worldGeometry: TerrariumGeometry;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawAmbientAir(context: CanvasRenderingContext2D, options: DrawOptions): void {
  const { width, height, time, settings, reducedMotion } = options;
  if (!settings.ambientParticles) return;
  for (let index = 0; index < 18; index += 1) {
    const seed = index * 1_271;
    const motion = reducedMotion ? 0 : time * (0.000018 + seededUnit(seed, 4) * 0.00002);
    const x = width * 0.05 + ((seededUnit(seed, 5) + motion) % 1) * width * 0.9;
    const baseY = height * (0.12 + seededUnit(seed, 6) * 0.46);
    const y = baseY + Math.sin(time * 0.00035 + index) * 6;
    context.fillStyle = `rgba(222, 240, 185, ${0.1 + seededUnit(seed, 7) * 0.2})`;
    context.beginPath();
    context.arc(x, y, 0.7 + seededUnit(seed, 8) * 1.35, 0, Math.PI * 2);
    context.fill();
  }
}

function drawMossMound(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  seed: number,
): void {
  context.save();
  context.translate(x, y);
  context.fillStyle = 'rgba(70, 91, 49, 0.88)';
  context.beginPath();
  context.ellipse(0, 1, 15 * scale, 5 * scale, 0, 0, Math.PI * 2);
  context.fill();
  for (let index = 0; index < 7; index += 1) {
    const angle = seededUnit(seed, 210 + index) * Math.PI * 2;
    const radius = seededUnit(seed, 220 + index) * 8 * scale;
    context.fillStyle = index % 2 === 0 ? '#708b50' : '#566e3d';
    context.beginPath();
    context.arc(
      Math.cos(angle) * radius,
      -2 * scale + Math.sin(angle) * radius * 0.38,
      (3.2 + seededUnit(seed, 230 + index) * 3.2) * scale,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}

function drawSoil(
  context: CanvasRenderingContext2D,
  options: DrawOptions,
  geometry: TerrariumGeometry,
): void {
  const { width, height } = options;
  const perspective = options.settings.terrariumView === 'perspective';

  context.fillStyle = 'rgba(2, 7, 6, 0.42)';
  roundedRect(
    context,
    geometry.soilFrontLeft + width * 0.008,
    geometry.soilBottomY - height * 0.012,
    geometry.soilFrontRight - geometry.soilFrontLeft - width * 0.016,
    height * 0.045,
    18,
  );
  context.fill();

  const soilFace = context.createLinearGradient(0, geometry.soilFrontY, 0, geometry.soilBottomY);
  soilFace.addColorStop(0, '#42382c');
  soilFace.addColorStop(0.42, '#30291f');
  soilFace.addColorStop(1, '#1c1a15');
  context.fillStyle = soilFace;
  context.beginPath();
  context.moveTo(geometry.soilFrontLeft, geometry.soilFrontY);
  context.lineTo(geometry.soilFrontRight, geometry.soilFrontY);
  context.lineTo(geometry.soilFrontRight, geometry.soilBottomY);
  context.lineTo(geometry.soilFrontLeft, geometry.soilBottomY);
  context.closePath();
  context.fill();

  if (perspective) {
    const topSoil = context.createLinearGradient(0, geometry.soilBackY, 0, geometry.soilFrontY);
    topSoil.addColorStop(0, '#4a4d35');
    topSoil.addColorStop(0.36, '#4c4932');
    topSoil.addColorStop(1, '#383326');
    context.fillStyle = topSoil;
    context.beginPath();
    context.moveTo(geometry.soilBackLeft, geometry.soilBackY);
    context.lineTo(geometry.soilBackRight, geometry.soilBackY);
    context.lineTo(geometry.soilFrontRight, geometry.soilFrontY);
    context.lineTo(geometry.soilFrontLeft, geometry.soilFrontY);
    context.closePath();
    context.fill();

    context.strokeStyle = 'rgba(196, 176, 126, 0.13)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(geometry.soilBackLeft, geometry.soilBackY);
    context.lineTo(geometry.soilBackRight, geometry.soilBackY);
    context.stroke();
  } else {
    const surface = context.createLinearGradient(0, geometry.soilBackY - 8, 0, geometry.soilBackY + 12);
    surface.addColorStop(0, '#596044');
    surface.addColorStop(0.45, '#464331');
    surface.addColorStop(1, '#322b22');
    context.fillStyle = surface;
    context.fillRect(
      geometry.soilBackLeft,
      geometry.soilBackY - 7,
      geometry.soilBackRight - geometry.soilBackLeft,
      15,
    );
  }

  context.globalAlpha = 0.56;
  for (let index = 0; index < 82; index += 1) {
    const seed = index * 811;
    const depth = seededUnit(seed, 1);
    const bounds = perspective
      ? soilBoundsAtDepth(geometry, depth)
      : { left: geometry.soilFrontLeft, right: geometry.soilFrontRight };
    const x = bounds.left + (bounds.right - bounds.left) * seededUnit(seed, 2);
    const y = perspective
      ? geometry.soilBackY + (geometry.soilFrontY - geometry.soilBackY) * depth
      : geometry.soilFrontY +
        10 +
        seededUnit(seed, 3) * (geometry.soilBottomY - geometry.soilFrontY - 18);
    context.fillStyle = index % 4 === 0 ? '#8e7954' : index % 3 === 0 ? '#675944' : '#82735a';
    context.beginPath();
    context.ellipse(
      x,
      y,
      0.7 + seededUnit(seed, 4) * 2.2,
      0.5 + seededUnit(seed, 5) * 1.1,
      seededUnit(seed, 6) * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.globalAlpha = 1;

  for (let index = 0; index < (perspective ? 9 : 7); index += 1) {
    const seed = 9_100 + index * 337;
    const depth = perspective ? 0.12 + seededUnit(seed, 1) * 0.75 : 0;
    const bounds = perspective
      ? soilBoundsAtDepth(geometry, depth)
      : { left: geometry.soilBackLeft, right: geometry.soilBackRight };
    const x = bounds.left + (bounds.right - bounds.left) * seededUnit(seed, 2);
    const y = perspective
      ? geometry.soilBackY + (geometry.soilFrontY - geometry.soilBackY) * depth
      : geometry.soilBackY - 2;
    drawMossMound(context, x, y, perspective ? 0.55 + depth * 0.48 : 0.7, seed);
  }

  for (let index = 0; index < 8; index += 1) {
    const seed = 13_000 + index * 191;
    const depth = perspective ? 0.16 + seededUnit(seed, 1) * 0.72 : 0;
    const bounds = perspective
      ? soilBoundsAtDepth(geometry, depth)
      : { left: geometry.soilBackLeft, right: geometry.soilBackRight };
    const x = bounds.left + (bounds.right - bounds.left) * seededUnit(seed, 2);
    const y = perspective
      ? geometry.soilBackY + (geometry.soilFrontY - geometry.soilBackY) * depth
      : geometry.soilBackY + 1;
    const scale = perspective ? 0.55 + depth * 0.42 : 0.72;
    context.fillStyle = index % 2 === 0 ? '#858376' : '#6f7366';
    context.beginPath();
    context.ellipse(x, y, (4 + seededUnit(seed, 3) * 6) * scale, 3.2 * scale, 0, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = 'rgba(168, 135, 87, 0.13)';
  context.lineWidth = 1;
  for (let index = 0; index < 5; index += 1) {
    const y = geometry.soilFrontY + 17 + index * ((geometry.soilBottomY - geometry.soilFrontY - 28) / 5);
    context.beginPath();
    context.moveTo(geometry.soilFrontLeft + width * (0.06 + index * 0.035), y);
    context.bezierCurveTo(
      width * 0.36,
      y + (index % 2 === 0 ? 5 : -4),
      width * 0.64,
      y + (index % 2 === 0 ? -3 : 5),
      geometry.soilFrontRight - width * (0.08 + index * 0.02),
      y,
    );
    context.stroke();
  }
}

function drawBackdrop(context: CanvasRenderingContext2D, options: DrawOptions): void {
  const { width, height, settings } = options;
  const glassGeometry = getTerrariumGeometry(width, height, settings.terrariumView);
  const month = new Date(options.now).getMonth();
  const seasonShift = settings.seasonalEffects
    ? month >= 8 && month <= 10
      ? 18
      : month === 11 || month <= 1
        ? -18
        : month >= 2 && month <= 4
          ? 9
          : 0
    : 0;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, `hsl(${191 + seasonShift} 19% 15%)`);
  sky.addColorStop(0.58, `hsl(${177 + seasonShift} 20% 12%)`);
  sky.addColorStop(1, '#101816');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.save();
  roundedRect(
    context,
    glassGeometry.glassX,
    glassGeometry.glassY,
    glassGeometry.glassWidth,
    glassGeometry.glassHeight,
    glassGeometry.glassRadius,
  );
  context.clip();
  const pane = context.createLinearGradient(
    glassGeometry.glassX,
    0,
    glassGeometry.glassX + glassGeometry.glassWidth,
    height,
  );
  pane.addColorStop(0, 'rgba(195, 231, 219, 0.045)');
  pane.addColorStop(0.36, 'rgba(127, 174, 158, 0.015)');
  pane.addColorStop(0.72, 'rgba(209, 239, 226, 0.035)');
  pane.addColorStop(1, 'rgba(61, 98, 87, 0.018)');
  context.fillStyle = pane;
  context.fillRect(
    glassGeometry.glassX,
    glassGeometry.glassY,
    glassGeometry.glassWidth,
    glassGeometry.glassHeight,
  );

  const glow = context.createRadialGradient(width * 0.52, height * 0.2, 0, width * 0.52, height * 0.2, width * 0.52);
  glow.addColorStop(0, 'rgba(209, 235, 188, 0.12)');
  glow.addColorStop(1, 'rgba(209, 235, 188, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  drawAmbientAir(context, options);
  drawSoil(context, options, options.worldGeometry);
  context.restore();

  context.strokeStyle = 'rgba(194, 230, 218, 0.15)';
  context.lineWidth = 1;
  roundedRect(
    context,
    glassGeometry.glassX + 4,
    glassGeometry.glassY + 4,
    glassGeometry.glassWidth - 8,
    glassGeometry.glassHeight - 8,
    Math.max(8, glassGeometry.glassRadius - 4),
  );
  context.stroke();
}

function drawGlassForeground(context: CanvasRenderingContext2D, options: DrawOptions): void {
  const { width, height, settings } = options;
  const geometry = getTerrariumGeometry(width, height, settings.terrariumView);

  context.save();
  roundedRect(
    context,
    geometry.glassX,
    geometry.glassY,
    geometry.glassWidth,
    geometry.glassHeight,
    geometry.glassRadius,
  );
  context.clip();

  const sheen = context.createLinearGradient(geometry.glassX, 0, geometry.glassX + geometry.glassWidth, 0);
  sheen.addColorStop(0, 'rgba(227, 250, 242, 0.1)');
  sheen.addColorStop(0.08, 'rgba(227, 250, 242, 0.015)');
  sheen.addColorStop(0.42, 'rgba(227, 250, 242, 0)');
  sheen.addColorStop(0.78, 'rgba(227, 250, 242, 0.025)');
  sheen.addColorStop(1, 'rgba(227, 250, 242, 0.08)');
  context.fillStyle = sheen;
  context.fillRect(geometry.glassX, geometry.glassY, geometry.glassWidth, geometry.glassHeight);

  context.save();
  context.translate(width * 0.21, height * 0.08);
  context.rotate(-0.13);
  const reflection = context.createLinearGradient(0, 0, width * 0.22, 0);
  reflection.addColorStop(0, 'rgba(235, 255, 248, 0)');
  reflection.addColorStop(0.45, 'rgba(235, 255, 248, 0.045)');
  reflection.addColorStop(0.55, 'rgba(235, 255, 248, 0.02)');
  reflection.addColorStop(1, 'rgba(235, 255, 248, 0)');
  context.fillStyle = reflection;
  context.fillRect(0, 0, width * 0.18, height * 0.78);
  context.restore();
  context.restore();

  context.strokeStyle = 'rgba(210, 240, 229, 0.33)';
  context.lineWidth = 1.25;
  roundedRect(
    context,
    geometry.glassX,
    geometry.glassY,
    geometry.glassWidth,
    geometry.glassHeight,
    geometry.glassRadius,
  );
  context.stroke();

  context.strokeStyle = 'rgba(244, 255, 251, 0.09)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(geometry.glassX + width * 0.025, geometry.glassY + geometry.glassRadius);
  context.lineTo(geometry.glassX + width * 0.025, geometry.glassY + geometry.glassHeight - geometry.glassRadius);
  context.moveTo(geometry.glassX + geometry.glassWidth - width * 0.02, geometry.glassY + geometry.glassRadius);
  context.lineTo(
    geometry.glassX + geometry.glassWidth - width * 0.02,
    geometry.glassY + geometry.glassHeight - geometry.glassRadius,
  );
  context.stroke();

  const baseRim = context.createLinearGradient(0, geometry.soilBottomY, 0, geometry.soilBottomY + 12);
  baseRim.addColorStop(0, 'rgba(218, 245, 235, 0.24)');
  baseRim.addColorStop(1, 'rgba(218, 245, 235, 0.02)');
  context.strokeStyle = baseRim;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(geometry.glassX + geometry.glassRadius * 0.7, geometry.soilBottomY + 2);
  context.lineTo(
    geometry.glassX + geometry.glassWidth - geometry.glassRadius * 0.7,
    geometry.soilBottomY + 2,
  );
  context.stroke();
}

function drawLeaf(
  context: CanvasRenderingContext2D,
  shape: LayoutPlant['plant']['species']['leafShape'],
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
): void {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = color;
  context.beginPath();
  if (shape === 'needle') {
    context.ellipse(size * 0.7, 0, size, size * 0.18, 0, 0, Math.PI * 2);
  } else if (shape === 'fan') {
    context.arc(0, 0, size, -1.1, 1.1);
    context.lineTo(0, 0);
  } else if (shape === 'heart') {
    context.moveTo(0, size * 0.8);
    context.bezierCurveTo(-size * 1.2, 0, -size * 0.8, -size, 0, -size * 0.35);
    context.bezierCurveTo(size * 0.8, -size, size * 1.2, 0, 0, size * 0.8);
  } else if (shape === 'pointed') {
    context.moveTo(-size, 0);
    context.quadraticCurveTo(0, -size * 0.65, size * 1.2, 0);
    context.quadraticCurveTo(0, size * 0.65, -size, 0);
  } else {
    context.ellipse(0, 0, size, size * 0.58, 0, 0, Math.PI * 2);
  }
  context.fill();
  context.restore();
}

function drawPlant(
  context: CanvasRenderingContext2D,
  entry: LayoutPlant,
  options: DrawOptions,
): void {
  const { site, plant, x, y, scale } = entry;
  const isSelected = options.selectedId === site.id;
  const isHovered = options.hoveredId === site.id;
  const isInFilter = site.lastVisitedAt >= cutoffForFilter(options.filter, options.now);
  const swayEnabled = options.settings.plantMotion && !options.reducedMotion && plant.health > 0.24;
  const sway = swayEnabled
    ? Math.sin(options.time * 0.00055 * plant.species.swayRate + site.plantSeed) * 0.035 * plant.health
    : 0;
  const droop = (1 - plant.health) * 0.5;
  const height = plant.height * scale;
  const healthSaturation = 24 + plant.health * 35;
  const lightness = 28 + plant.health * 24;
  const stemColor = `hsl(${plant.species.hue - 12} ${healthSaturation}% ${Math.max(23, lightness - 11)}%)`;
  const leafColor = `hsl(${plant.species.hue} ${healthSaturation}% ${lightness}%)`;

  context.save();
  context.globalAlpha = isInFilter || isSelected ? 1 : 0.19;
  context.translate(x, y);
  if (options.settings.plantMotion && options.growingIds.has(site.id)) {
    const eased = 1 - (1 - options.growthProgress) ** 3;
    context.scale(0.9 + eased * 0.1, 0.72 + eased * 0.28);
  }
  context.rotate(sway);

  if (isSelected || isHovered) {
    const aura = context.createRadialGradient(0, -height * 0.45, 0, 0, -height * 0.45, height * 0.72);
    aura.addColorStop(0, `hsla(${plant.species.hue} 70% 76% / ${isSelected ? 0.21 : 0.12})`);
    aura.addColorStop(1, 'rgba(190, 236, 189, 0)');
    context.fillStyle = aura;
    context.beginPath();
    context.arc(0, -height * 0.45, height * 0.72, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = 'rgba(13, 20, 17, 0.26)';
  context.beginPath();
  context.ellipse(3, 2, 13 * scale, 3.7 * scale, -0.08, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = stemColor;
  context.lineWidth = Math.max(1.4, 2.2 * scale);
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(0, 0);
  const curve = plant.species.stemShape === 'arching' ? 12 * scale : plant.species.stemShape === 'forked' ? -5 * scale : 2 * scale;
  context.bezierCurveTo(curve * 0.2, -height * 0.38, curve, -height * 0.72, curve * 0.55, -height);
  context.stroke();

  const visibleLeaves = Math.min(options.leafLimit, plant.leafCount);
  for (let index = 0; index < visibleLeaves; index += 1) {
    const progress = (index + 1) / (visibleLeaves + 1);
    const side = index % 2 === 0 ? -1 : 1;
    const branchLength = (6 + seededUnit(site.plantSeed, 60 + index) * 10) * scale;
    const branchY = -height * (0.15 + progress * 0.78);
    const branchX = curve * progress + side * branchLength * 0.55;
    context.strokeStyle = stemColor;
    context.lineWidth = Math.max(0.8, 1.3 * scale);
    context.beginPath();
    context.moveTo(curve * progress * 0.7, branchY + height * 0.04);
    context.quadraticCurveTo(branchX * 0.72, branchY + side * 2, branchX, branchY - droop * 9 * scale);
    context.stroke();
    const leafSize = (3.7 + seededUnit(site.plantSeed, 90 + index) * 3.5) * scale;
    drawLeaf(
      context,
      plant.species.leafShape,
      branchX,
      branchY - droop * 9 * scale,
      leafSize,
      side < 0 ? Math.PI + 0.22 + droop : -0.22 - droop,
      leafColor,
    );
  }

  const bloomCount = Math.min(4, Math.floor(plant.bloomLevel * 7));
  for (let index = 0; index < bloomCount; index += 1) {
    const bloomX = (seededUnit(site.plantSeed, 120 + index) - 0.5) * height * 0.35;
    const bloomY = -height * (0.62 + seededUnit(site.plantSeed, 130 + index) * 0.33);
    context.fillStyle = `hsl(${plant.species.accentHue} 70% ${61 + plant.health * 16}%)`;
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (petal / 5) * Math.PI * 2;
      context.beginPath();
      context.ellipse(
        bloomX + Math.cos(angle) * 2.2 * scale,
        bloomY + Math.sin(angle) * 2.2 * scale,
        2.1 * scale,
        1.3 * scale,
        angle,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }

  if (plant.dormant) {
    context.strokeStyle = 'rgba(225, 212, 165, 0.42)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(-5 * scale, -height * 0.2);
    context.lineTo(-8 * scale, -height * 0.1);
    context.stroke();
  }
  context.restore();
}

export function drawTerrarium(
  context: CanvasRenderingContext2D,
  plants: LayoutPlant[],
  options: DrawOptions,
): void {
  context.clearRect(0, 0, options.width, options.height);
  drawBackdrop(context, options);
  const glass = getTerrariumGeometry(options.width, options.height, options.settings.terrariumView);
  context.save();
  roundedRect(
    context,
    glass.glassX,
    glass.glassY,
    glass.glassWidth,
    glass.glassHeight,
    glass.glassRadius,
  );
  context.clip();
  for (const plant of plants) drawPlant(context, plant, options);
  context.restore();
  drawGlassForeground(context, options);
}
