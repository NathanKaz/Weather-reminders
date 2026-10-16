import { formatHour } from "../../electron/i18n";
import type { HourlyForecast, Language } from "../../electron/types";

interface Props {
  hourly: HourlyForecast[];
  lang: Language;
}

const W = 720;
const H = 190;
const PAD_X = 24;
const TOP = 30;
const BOTTOM = 44;

export function TempChart({ hourly, lang }: Props) {
  const points = hourly
    .map((h, i) => ({ i, t: h.temperature, time: h.time }))
    .filter((p): p is { i: number; t: number; time: string } => p.t != null);

  if (points.length < 2) return null;

  let lo = Infinity;
  let hi = -Infinity;
  for (const p of points) {
    if (p.t < lo) lo = p.t;
    if (p.t > hi) hi = p.t;
  }
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const span = hi - lo;
  const innerW = W - PAD_X * 2;
  const innerH = H - TOP - BOTTOM;

  const x = (i: number) =>
    PAD_X + (i / Math.max(1, hourly.length - 1)) * innerW;
  const y = (t: number) => TOP + (1 - (t - lo) / span) * innerH;

  const line = points.map((p) => `${x(p.i)},${y(p.t)}`).join(" ");
  const area = `M ${x(points[0].i)},${TOP + innerH} L ${line
    .split(" ")
    .join(" L ")} L ${x(points[points.length - 1].i)},${TOP + innerH} Z`;

  const maxPoint = points.reduce((a, b) => (b.t > a.t ? b : a));
  const minPoint = points.reduce((a, b) => (b.t < a.t ? b : a));

  const step = hourly.length > 24 ? 6 : 3;
  const ticks = points.filter((p) => p.i % step === 0);

  return (
    <svg
      className="temp-chart"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Temperature chart"
    >
      <defs>
        <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={TOP + f * innerH}
          y2={TOP + f * innerH}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="3 5"
          opacity={0.6}
        />
      ))}

      <path d={area} fill="url(#tempFill)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {[maxPoint, minPoint].map((p) => (
        <g key={`${p.i}-${p.t}`}>
          <circle cx={x(p.i)} cy={y(p.t)} r={4} fill="var(--accent)" />
          <text
            x={x(p.i)}
            y={y(p.t) + (p === maxPoint ? -12 : 20)}
            textAnchor="middle"
            className="temp-chart-label"
          >
            {Math.round(p.t)}°
          </text>
        </g>
      ))}

      {ticks.map((p) => (
        <text
          key={p.i}
          x={x(p.i)}
          y={H - 12}
          textAnchor="middle"
          className="temp-chart-tick"
        >
          {formatHour(lang, p.time)}
        </text>
      ))}
    </svg>
  );
}
