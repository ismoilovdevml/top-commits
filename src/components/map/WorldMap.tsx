import { useRouter } from "next/router";
import { useMemo, useState } from "react";

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

/**
 * Choropleth of GitHub users per country.
 *
 * The outlines are projected at build time (`scripts/build-map.ts`), so this
 * ships path strings only — no projection library reaches the browser. Countries
 * without a leaderboard, and the six city-states too small for the 110m atlas,
 * render in the no-data fill; the table below the map is the accessible
 * equivalent of everything drawn here.
 */
const WorldMap = ({ countries }: { countries: CountryStatsEntry[] }) => {
  const router = useRouter();
  const [hover, setHover] = useState<HoverState | null>(null);

  const bySlug = useMemo(
    () => new Map(countries.map((entry) => [entry.slug, entry])),
    [countries]
  );

  return (
    <figure className={styles.figure}>
      <div className={styles.canvas}>
        <svg
          viewBox={`0 0 ${map.width} ${map.height}`}
          className={styles.svg}
          role="img"
          aria-label="World map shaded by the number of GitHub users in each country"
        >
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
                className={`${styles.shape} ${styles.interactive}`}
                tabIndex={0}
                role="link"
                aria-label={`${entry.title}: ${full(entry.totalUsers)} GitHub users`}
                onMouseMove={(event) => {
                  const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (!box) return;
                  setHover({
                    entry,
                    x: ((event.clientX - box.left) / box.width) * 100,
                    y: ((event.clientY - box.top) / box.height) * 100,
                  });
                }}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ entry, x: 50, y: 50 })}
                onBlur={() => setHover(null)}
                onClick={() => router.push(`/${entry.slug}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/${entry.slug}`);
                  }
                }}
              />
            );
          })}
        </svg>

        {hover && (
          <div
            className={styles.tooltip}
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
    </figure>
  );
};

export default WorldMap;
