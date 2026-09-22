import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  SiteRecord,
  TerrariumSettings,
  TimelineFilter,
} from '../../shared/models/types';
import { formatDuration, relativeDate } from '../../shared/utils/date';
import { drawTerrarium } from '../terrarium/draw';
import { computeLayout, type LayoutPlant } from '../terrarium/layout';

interface Props {
  sites: SiteRecord[];
  filter: TimelineFilter;
  selectedId: string | null;
  highlightedId: string | null;
  growingIds: string[];
  settings: TerrariumSettings;
  onSelect: (site: SiteRecord | null) => void;
}

interface Size {
  width: number;
  height: number;
}

function nearestPlant(
  plants: LayoutPlant[],
  x: number,
  y: number,
): LayoutPlant | null {
  let winner: LayoutPlant | null = null;
  let winnerDistance = Number.POSITIVE_INFINITY;
  for (let index = plants.length - 1; index >= 0; index -= 1) {
    const entry = plants[index];
    const centerY = entry.y - entry.plant.height * entry.scale * 0.45;
    const distance = Math.hypot(entry.x - x, (centerY - y) * 0.7);
    const radius = Math.max(entry.hitRadius, entry.plant.height * entry.scale * 0.38);
    if (distance <= radius && distance < winnerDistance) {
      winner = entry;
      winnerDistance = distance;
    }
  }
  return winner;
}

export function TerrariumCanvas({
  sites,
  filter,
  selectedId,
  highlightedId,
  growingIds,
  settings,
  onSelect,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const openedAtRef = useRef(performance.now());
  const [size, setSize] = useState<Size>({ width: 900, height: 620 });
  const [hovered, setHovered] = useState<LayoutPlant | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [keyboardIndex, setKeyboardIndex] = useState(-1);
  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const layouts = useMemo(
    () => computeLayout(sites, size.width, size.height, Date.now(), settings.terrariumView),
    [settings.terrariumView, sites, size.width, size.height],
  );
  const hoveredId = hovered?.site.id ?? highlightedId;
  const growingSet = useMemo(() => new Set(growingIds), [growingIds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.round(entry.contentRect.width));
      const height = Math.max(430, Math.round(entry.contentRect.height));
      setSize({ width, height });
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    let lastDrawAt = Number.NEGATIVE_INFINITY;
    const animate = (time: number) => {
      if (time - lastDrawAt >= 32) {
        lastDrawAt = time;
        drawTerrarium(context, layouts, {
          width: size.width,
          height: size.height,
          time,
          now: Date.now(),
          filter,
          selectedId,
          hoveredId,
          settings,
          reducedMotion,
          leafLimit: sites.length > 1_000 ? 5 : sites.length > 500 ? 8 : 18,
          growingIds: growingSet,
          growthProgress: Math.min(1, (time - openedAtRef.current) / 1_200),
        });
      }
      const growthAnimationActive =
        settings.plantMotion && growingSet.size > 0 && time - openedAtRef.current < 1_250;
      if ((settings.plantMotion || settings.ambientParticles || growthAnimationActive) && !reducedMotion) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    animate(performance.now());

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [filter, growingSet, hoveredId, layouts, reducedMotion, selectedId, settings, sites.length, size]);

  const canvasPoint = (
    event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * size.width,
      y: ((event.clientY - bounds.top) / bounds.height) * size.height,
    };
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!layouts.length) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (keyboardIndex + 1 + layouts.length) % layouts.length;
      setKeyboardIndex(next);
      setHovered(layouts[next]);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = (keyboardIndex - 1 + layouts.length) % layouts.length;
      setKeyboardIndex(next);
      setHovered(layouts[next]);
    } else if (event.key === 'Enter' && keyboardIndex >= 0) {
      event.preventDefault();
      onSelect(layouts[keyboardIndex].site);
    } else if (event.key === 'Escape') {
      setHovered(null);
      onSelect(null);
    }
  };

  return (
    <div className="terrarium-stage">
      <canvas
        ref={canvasRef}
        className="terrarium-canvas"
        tabIndex={0}
        role="application"
        aria-label={`${sites.length} plant terrarium${hovered ? `. Focused plant: ${hovered.site.hostname}, ${hovered.plant.species.name}.` : '.'} Use arrow keys to explore plants and Enter to select.`}
        onKeyDown={handleKeyDown}
        onPointerMove={(event) => {
          const point = canvasPoint(event);
          setPointer({ x: event.clientX, y: event.clientY });
          setHovered(nearestPlant(layouts, point.x, point.y));
        }}
        onPointerLeave={() => setHovered(null)}
        onClick={(event) => {
          const point = canvasPoint(event);
          onSelect(nearestPlant(layouts, point.x, point.y)?.site ?? null);
        }}
      />
      {hovered && (
        <div
          className="plant-tooltip"
          role="status"
          style={{ left: pointer.x + 16, top: pointer.y + 16 }}
        >
          <strong>{hovered.site.hostname}</strong>
          <span>{hovered.plant.species.name}</span>
          <dl>
            <div><dt>Visits</dt><dd>{hovered.site.totalVisits.toLocaleString()}</dd></div>
            <div><dt>Active time</dt><dd>{formatDuration(hovered.site.activeTimeSeconds)}</dd></div>
            <div><dt>Last visited</dt><dd>{relativeDate(hovered.site.lastVisitedAt)}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
