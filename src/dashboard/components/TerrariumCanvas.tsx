import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  SiteRecord,
  TerrariumSettings,
  TimelineFilter,
} from '../../shared/models/types';
import { formatDuration, relativeDate } from '../../shared/utils/date';
import {
  cameraGeometry,
  clampTerrariumCamera,
  DEFAULT_TERRARIUM_CAMERA,
  projectLayoutForCamera,
  type TerrariumCamera,
} from '../terrarium/camera';
import { drawTerrarium } from '../terrarium/draw';
import { getTerrariumGeometry } from '../terrarium/geometry';
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

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startCamera: TerrariumCamera;
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
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [size, setSize] = useState<Size>({ width: 900, height: 620 });
  const [hovered, setHovered] = useState<LayoutPlant | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [keyboardIndex, setKeyboardIndex] = useState(-1);
  const [camera, setCamera] = useState<TerrariumCamera>(DEFAULT_TERRARIUM_CAMERA);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const layouts = useMemo(
    () => computeLayout(sites, size.width, size.height, Date.now(), settings.terrariumView),
    [settings.terrariumView, sites, size.width, size.height],
  );
  const baseGeometry = useMemo(
    () => getTerrariumGeometry(size.width, size.height, settings.terrariumView),
    [settings.terrariumView, size.height, size.width],
  );
  const activeCamera = settings.terrariumView === 'perspective' ? camera : DEFAULT_TERRARIUM_CAMERA;
  const worldGeometry = useMemo(
    () =>
      settings.terrariumView === 'perspective'
        ? cameraGeometry(size.width, baseGeometry, activeCamera)
        : baseGeometry,
    [activeCamera, baseGeometry, settings.terrariumView, size.width],
  );
  const displayLayouts = useMemo(
    () =>
      settings.terrariumView === 'perspective'
        ? projectLayoutForCamera(layouts, baseGeometry, worldGeometry, activeCamera)
        : layouts,
    [activeCamera, baseGeometry, layouts, settings.terrariumView, worldGeometry],
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
    if (!canvas || settings.terrariumView !== 'perspective') return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0012);
      setCamera((current) => clampTerrariumCamera({ ...current, zoom: current.zoom * factor }));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [settings.terrariumView]);

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
        drawTerrarium(context, displayLayouts, {
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
          worldGeometry,
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
  }, [displayLayouts, filter, growingSet, hoveredId, reducedMotion, selectedId, settings, sites.length, size, worldGeometry]);

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
    if (settings.terrariumView === 'perspective') {
      if (event.shiftKey && event.key.startsWith('Arrow')) {
        event.preventDefault();
        setCamera((current) =>
          clampTerrariumCamera({
            ...current,
            yaw:
              current.yaw +
              (event.key === 'ArrowRight' ? 0.06 : event.key === 'ArrowLeft' ? -0.06 : 0),
            pitch:
              current.pitch +
              (event.key === 'ArrowDown' ? 0.05 : event.key === 'ArrowUp' ? -0.05 : 0),
          }),
        );
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setCamera((current) => clampTerrariumCamera({ ...current, zoom: current.zoom * 1.12 }));
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        setCamera((current) => clampTerrariumCamera({ ...current, zoom: current.zoom / 1.12 }));
        return;
      }
      if (event.key.toLowerCase() === 'r' || event.key === 'Home') {
        event.preventDefault();
        setCamera(DEFAULT_TERRARIUM_CAMERA);
        return;
      }
    }
    if (!displayLayouts.length) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (keyboardIndex + 1 + displayLayouts.length) % displayLayouts.length;
      setKeyboardIndex(next);
      setHovered(displayLayouts[next]);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = (keyboardIndex - 1 + displayLayouts.length) % displayLayouts.length;
      setKeyboardIndex(next);
      setHovered(displayLayouts[next]);
    } else if (event.key === 'Enter' && keyboardIndex >= 0) {
      event.preventDefault();
      onSelect(displayLayouts[keyboardIndex].site);
    } else if (event.key === 'Escape') {
      setHovered(null);
      onSelect(null);
    }
  };

  const changeZoom = (factor: number) => {
    setCamera((current) => clampTerrariumCamera({ ...current, zoom: current.zoom * factor }));
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div className="terrarium-stage">
      <canvas
        ref={canvasRef}
        className={`terrarium-canvas${settings.terrariumView === 'perspective' ? ' is-interactive' : ''}${dragging ? ' is-dragging' : ''}`}
        tabIndex={0}
        role="application"
        aria-label={`${sites.length} plant terrarium${hovered ? `. Focused plant: ${hovered.site.hostname}, ${hovered.plant.species.name}.` : '.'} ${settings.terrariumView === 'perspective' ? 'Drag or use Shift plus arrow keys to orbit, scroll or use plus and minus to zoom, and press R to reset. ' : ''}Use arrow keys to explore plants and Enter to select.`}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          if (settings.terrariumView !== 'perspective' || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startCamera: camera,
          };
          suppressClickRef.current = false;
          setDragging(true);
          setHovered(null);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (drag && drag.pointerId === event.pointerId) {
            const deltaX = event.clientX - drag.startX;
            const deltaY = event.clientY - drag.startY;
            if (Math.hypot(deltaX, deltaY) > 4) suppressClickRef.current = true;
            setCamera(
              clampTerrariumCamera({
                ...drag.startCamera,
                yaw: drag.startCamera.yaw + (deltaX / Math.max(320, size.width)) * 0.72,
                pitch: drag.startCamera.pitch + (deltaY / Math.max(430, size.height)) * 0.68,
              }),
            );
            return;
          }
          const point = canvasPoint(event);
          setPointer({ x: event.clientX, y: event.clientY });
          setHovered(nearestPlant(displayLayouts, point.x, point.y));
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          if (!dragRef.current) setHovered(null);
        }}
        onDoubleClick={() => {
          if (settings.terrariumView === 'perspective') setCamera(DEFAULT_TERRARIUM_CAMERA);
        }}
        onClick={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          const point = canvasPoint(event);
          onSelect(nearestPlant(displayLayouts, point.x, point.y)?.site ?? null);
        }}
      />
      {settings.terrariumView === 'perspective' && (
        <div
          className="camera-controls"
          role="group"
          aria-label="3D terrarium camera"
          title="Drag the terrarium to orbit. Scroll to zoom."
        >
          <div>
            <button type="button" aria-label="Zoom out" onClick={() => changeZoom(1 / 1.12)}>−</button>
            <button
              type="button"
              className="camera-reset"
              onClick={() => setCamera(DEFAULT_TERRARIUM_CAMERA)}
            >
              Reset
            </button>
            <button type="button" aria-label="Zoom in" onClick={() => changeZoom(1.12)}>+</button>
          </div>
        </div>
      )}
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
