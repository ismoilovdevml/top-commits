import { useRouter } from "next/router";
import { useCallback, useMemo, useRef, useState } from "react";

import worldMap from "@/data/world-map.json";
import {
  BUCKET_LABELS,
  CHOROPLETH_RAMP,
  NO_DATA_FILL,
  compact,
  fillFor,
  full,
} from "@/lib/stats";
import type { CountryStatsEntry, WorldMap as WorldMapData } from "@/types/Committers";
import styles from "./worldMap.module.scss";

const map = worldMap as WorldMapData;

interface HoverState {
  entry: CountryStatsEntry;
  /** Percentage of the SVG box, so the tooltip follows the shape on resize. */
  x: number;
  y: number;
}

/** Past this the tooltip is flipped to the left of the cursor so it stays on screen. */
const FLIP_AT = 66;

/** Radius of a micro-state marker, in viewBox units at zoom 1. */
const MARKER_RADIUS = 4;

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.6;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

interface View {
  scale: number;
  /** Translation in viewBox units, applied before the scale. */
  x: number;
  y: number;
}

const IDENTITY: View = { scale: 1, x: 0, y: 0 };

/**
 * Keeps the map inside its own box: at scale s the visible window is 1/s of the
 * width, so the pan offset can never exceed the hidden remainder.
 */
function clampView(view: View): View {
  const maxX = (map.width * (view.scale - 1)) / view.scale;
  const maxY = (map.height * (view.scale - 1)) / view.scale;

  return {
    scale: view.scale,
    x: clamp(view.x, -maxX, 0),
    y: clamp(view.y, -maxY, 0),
  };
}

/**
 * Zooms about a fixed point so whatever sits under it stays put.
 *
 * The group is transformed `scale(s) translate(t)`, so a map point p renders at
 * s·(p + t). Holding a rendered position f fixed across a scale change gives
 * t' = t + f·(1/s' − 1/s). `focus` is therefore in rendered units, not map units
 * — the order of those two operations is easy to get backwards.
 */
function zoomAbout(view: View, nextScale: number, focusX: number, focusY: number): View {
  const scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
  const shift = 1 / scale - 1 / view.scale;

  return clampView({
    scale,
    x: view.x + focusX * shift,
    y: view.y + focusY * shift,
  });
}

/**
 * Choropleth of GitHub users per country.
 *
 * The outlines are projected at build time (`scripts/build-map.ts`), so this
 * ships path strings only — no projection library reaches the browser. Countries
 * without a leaderboard, and the six city-states too small for the 110m atlas,
 * render in the no-data fill; the table below the map is the accessible
 * equivalent of everything drawn here.
 */
interface WorldMapProps {
  countries: CountryStatsEntry[];
  /** Slug highlighted from elsewhere on the page, e.g. a hovered table row. */
  highlighted?: string | null;
  /** Reports which country the pointer is over, so the table can follow along. */
  onHighlight?: (slug: string | null) => void;
}

const WorldMap = ({ countries, highlighted = null, onHighlight }: WorldMapProps) => {
  const router = useRouter();
  const [hover, setHover] = useState<HoverState | null>(null);
  const [view, setView] = useState<View>(IDENTITY);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const bySlug = useMemo(
    () => new Map(countries.map((entry) => [entry.slug, entry])),
    [countries]
  );

  /** Pointer position in viewBox units, before the pan/zoom transform. */
  const toViewBox = useCallback((clientX: number, clientY: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return null;

    return {
      x: ((clientX - box.left) / box.width) * map.width,
      y: ((clientY - box.top) / box.height) * map.height,
    };
  }, []);

  const setHighlight = useCallback(
    (slug: string | null) => onHighlight?.(slug),
    [onHighlight]
  );

  const zoomBy = (factor: number) =>
    setView((current) =>
      zoomAbout(current, current.scale * factor, map.width / 2, map.height / 2)
    );

  /** Shared by the polygons and the micro-state markers. */
  const interactions = (entry: CountryStatsEntry) => ({
    tabIndex: 0,
    role: "link",
    "aria-label": `${entry.title}: ${full(entry.totalUsers)} GitHub users`,
    onMouseMove: (event: React.MouseEvent<SVGElement>) => {
      // A drag is a pan, not a hover — showing a tooltip mid-drag is noise.
      if (drag.current) return;

      const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
      if (!box) return;
      setHover({
        entry,
        x: ((event.clientX - box.left) / box.width) * 100,
        y: ((event.clientY - box.top) / box.height) * 100,
      });
      setHighlight(entry.slug);
    },
    onMouseLeave: () => {
      setHover(null);
      setHighlight(null);
    },
    onFocus: () => {
      setHover({ entry, x: 50, y: 50 });
      setHighlight(entry.slug);
    },
    onBlur: () => {
      setHover(null);
      setHighlight(null);
    },
    onClick: () => router.push(`/${entry.slug}`),
    onKeyDown: (event: React.KeyboardEvent<SVGElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        router.push(`/${entry.slug}`);
      }
    },
  });

  return (
    <figure className={styles.figure}>
      <div className={styles.canvas}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${map.width} ${map.height}`}
          className={`${styles.svg} ${view.scale > 1 ? styles.pannable : ""}`}
          role="img"
          aria-label="World map shaded by the number of GitHub users in each country"
          onPointerDown={(event) => {
            if (view.scale === 1 || event.button !== 0) return;
            drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
            setHover(null);
          }}
          onPointerMove={(event) => {
            const state = drag.current;
            if (!state || state.pointerId !== event.pointerId) return;

            const box = svgRef.current?.getBoundingClientRect();
            if (!box) return;

            // Screen pixels to viewBox units, then undo the scale so the map
            // tracks the cursor exactly.
            const dx = ((event.clientX - state.x) / box.width) * map.width;
            const dy = ((event.clientY - state.y) / box.height) * map.height;
            drag.current = { ...state, x: event.clientX, y: event.clientY };

            setView((current) =>
              clampView({
                ...current,
                x: current.x + dx / current.scale,
                y: current.y + dy / current.scale,
              })
            );
          }}
          onPointerUp={(event) => {
            drag.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onWheel={(event) => {
            // Plain wheel must keep scrolling the page; only a deliberate
            // ctrl/⌘+wheel zooms, which is also the pinch gesture on trackpads.
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();

            const focus = toViewBox(event.clientX, event.clientY);
            if (!focus) return;

            setView((current) =>
              zoomAbout(
                current,
                current.scale * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
                focus.x,
                focus.y
              )
            );
          }}
        >
          <g transform={`scale(${view.scale}) translate(${view.x} ${view.y})`}>
          {map.shapes.map((shape, index) => {
            const entry = shape.slug ? bySlug.get(shape.slug) : undefined;

            if (!entry) {
              return (
                <path
                  key={`${shape.name}-${index}`}
                  d={shape.d}
                  fill={NO_DATA_FILL}
                  className={styles.shape}
                />
              );
            }

            return (
              <path
                key={`${shape.name}-${index}`}
                d={shape.d}
                fill={fillFor(entry.totalUsers)}
                className={`${styles.shape} ${styles.interactive} ${
                  highlighted === entry.slug ? styles.highlighted : ""
                }`}
                {...interactions(entry)}
              />
            );
          })}

            {/* City-states with no polygon at this atlas resolution. A ring makes
                them read as deliberate markers rather than stray dots. */}
            {map.markers.map((marker) => {
              const entry = bySlug.get(marker.slug);
              if (!entry) return null;

              return (
                <circle
                  key={marker.slug}
                  cx={marker.x}
                  cy={marker.y}
                  // Counter-scaled so a marker stays a marker instead of
                  // swelling into a blob as the reader zooms in.
                  r={MARKER_RADIUS / view.scale}
                  fill={fillFor(entry.totalUsers)}
                  className={`${styles.marker} ${styles.interactive} ${
                    highlighted === entry.slug ? styles.highlighted : ""
                  }`}
                  {...interactions(entry)}
                />
              );
            })}
          </g>
        </svg>

        <div className={styles.zoomControls}>
          <button
            type="button"
            onClick={() => zoomBy(ZOOM_STEP)}
            disabled={view.scale >= MAX_ZOOM}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            disabled={view.scale <= MIN_ZOOM}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setView(IDENTITY)}
            disabled={view.scale === MIN_ZOOM}
            aria-label="Reset zoom"
          >
            ⌂
          </button>
        </div>

        {hover && (
          <div
            className={`${styles.tooltip} ${hover.x > FLIP_AT ? styles.tooltipFlipped : ""}`}
            style={{ left: `${hover.x}%`, top: `${hover.y}%` }}
            aria-hidden
          >
            <div className={styles.tooltipTitle}>
              <span>{hover.entry.flag}</span>
              <span>{hover.entry.title}</span>
            </div>
            <dl className={styles.tooltipRows}>
              <div>
                <dt>GitHub users</dt>
                <dd>{full(hover.entry.totalUsers)}</dd>
              </div>
              <div>
                <dt>Ranked commits</dt>
                <dd>{compact(hover.entry.rankedContributions)}</dd>
              </div>
              {hover.entry.topUser && (
                <div>
                  <dt>Top committer</dt>
                  <dd>{hover.entry.topUser.login}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      <figcaption className={styles.legend}>
        <span className={styles.legendLabel}>GitHub users</span>
        <ul className={styles.legendScale}>
          {CHOROPLETH_RAMP.map((color, index) => (
            <li key={color}>
              <span className={styles.swatch} style={{ background: color }} aria-hidden />
              {BUCKET_LABELS[index]}
            </li>
          ))}
          <li>
            <span className={styles.swatch} style={{ background: NO_DATA_FILL }} aria-hidden />
            no data
          </li>
        </ul>
      </figcaption>

      <p className={styles.hint}>
        Zoom with the buttons or ⌘/Ctrl + scroll, then drag to pan. Hovering a row
        in the table below locates that country here.
      </p>
    </figure>
  );
};

export default WorldMap;
