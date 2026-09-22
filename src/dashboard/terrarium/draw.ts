import type { TerrariumSettings, TimelineFilter } from '../../shared/models/types';
import { cutoffForFilter } from '../../shared/utils/date';
import { seededUnit } from '../../shared/utils/hash';
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

function drawBackdrop(context: CanvasRenderingContext2D, options: DrawOptions): void {
  const { width, height, time, settings, reducedMotion } = options;
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
  sky.addColorStop(1, '#111a18');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.5, height * 0.2, 0, width * 0.5, height * 0.2, width * 0.55);
  glow.addColorStop(0, 'rgba(209, 235, 188, 0.13)');
  glow.addColorStop(1, 'rgba(209, 235, 188, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  // The garden bed is drawn as a layered ellipse for a tactile diorama effect.
  context.fillStyle = 'rgba(9, 14, 13, 0.58)';
  context.beginPath();
  context.ellipse(width / 2, height * 0.79, width * 0.43, height * 0.17, 0, 0, Math.PI * 2);
  context.fill();
  const soil = context.createRadialGradient(width / 2, height * 0.63, 20, width / 2, height * 0.7, width * 0.5);
  soil.addColorStop(0, '#59654a');
  soil.addColorStop(0.42, '#3e4937');
  soil.addColorStop(1, '#202c26');
  context.fillStyle = soil;
  context.beginPath();
  context.ellipse(width / 2, height * 0.7, width * 0.44, height * 0.22, 0, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.46;
  for (let index = 0; index < 34; index += 1) {
    const seed = index * 811;
    const angle = seededUnit(seed, 1) * Math.PI * 2;
    const radius = Math.sqrt(seededUnit(seed, 2));
    const x = width / 2 + Math.cos(angle) * width * 0.4 * radius;
    const y = height * 0.7 + Math.sin(angle) * height * 0.19 * radius;
    context.fillStyle = index % 3 === 0 ? '#8b8861' : '#7c9365';
    context.beginPath();
    context.ellipse(x, y, 1.2 + (index % 4), 0.7 + (index % 3), angle, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  if (settings.ambientParticles) {
    for (let index = 0; index < 18; index += 1) {
      const seed = index * 1_271;
      const motion = reducedMotion ? 0 : time * (0.000018 + seededUnit(seed, 4) * 0.00002);
      const x = ((seededUnit(seed, 5) + motion) % 1) * width;
      const baseY = height * (0.12 + seededUnit(seed, 6) * 0.58);
      const y = baseY + Math.sin(time * 0.00035 + index) * 6;
      context.fillStyle = `rgba(222, 240, 185, ${0.12 + seededUnit(seed, 7) * 0.25})`;
      context.beginPath();
      context.arc(x, y, 0.7 + seededUnit(seed, 8) * 1.5, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.strokeStyle = 'rgba(206, 236, 224, 0.28)';
  context.lineWidth = 1.25;
  roundedRect(context, width * 0.035, height * 0.035, width * 0.93, height * 0.91, Math.min(42, width * 0.04));
  context.stroke();
  context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  context.beginPath();
  context.moveTo(width * 0.095, height * 0.08);
  context.bezierCurveTo(width * 0.05, height * 0.32, width * 0.08, height * 0.62, width * 0.12, height * 0.79);
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
  for (const plant of plants) drawPlant(context, plant, options);
}
