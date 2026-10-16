import type { WeatherIconKind } from "../../electron/types";

interface Props {
  kind: WeatherIconKind;
  isDay?: boolean;
  size?: number;
  title?: string;
}

const COLORS = {
  sun: "#fbbf24",
  moon: "#cbd5e1",
  cloud: "#94a3b8",
  cloudDark: "#64748b",
  rain: "#38bdf8",
  snow: "#e2e8f0",
  bolt: "#facc15",
  fog: "#94a3b8",
};

export function WeatherIcon({ kind, isDay = true, size = 48, title }: Props) {
  return (
    <svg
      className="weather-icon"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {render(kind, isDay)}
    </svg>
  );
}

function render(kind: WeatherIconKind, isDay: boolean) {
  switch (kind) {
    case "clear":
      return isDay ? <Sun /> : <Moon />;
    case "partly":
      return (
        <>
          <g transform="translate(12 -4) scale(0.72)">
            {isDay ? <Sun /> : <Moon />}
          </g>
          <Cloud x={14} y={26} />
        </>
      );
    case "cloudy":
      return (
        <>
          <Cloud x={4} y={18} fill={COLORS.cloudDark} opacity={0.55} />
          <Cloud x={16} y={28} />
        </>
      );
    case "fog":
      return (
        <>
          <Cloud x={16} y={20} />
          <FogLines />
        </>
      );
    case "drizzle":
      return (
        <>
          <Cloud x={16} y={20} />
          <g stroke={COLORS.rain} strokeWidth={3} strokeLinecap="round">
            <line x1="26" y1="48" x2="24" y2="54" />
            <line x1="34" y1="48" x2="32" y2="54" />
            <line x1="42" y1="48" x2="40" y2="54" />
          </g>
        </>
      );
    case "rain":
      return (
        <>
          <Cloud x={16} y={18} />
          <g stroke={COLORS.rain} strokeWidth={3.4} strokeLinecap="round">
            <line x1="24" y1="46" x2="20" y2="56" />
            <line x1="33" y1="46" x2="29" y2="56" />
            <line x1="42" y1="46" x2="38" y2="56" />
          </g>
        </>
      );
    case "snow":
      return (
        <>
          <Cloud x={16} y={18} />
          <g fill={COLORS.snow}>
            <circle cx="24" cy="50" r="2.4" />
            <circle cx="33" cy="55" r="2.4" />
            <circle cx="42" cy="50" r="2.4" />
          </g>
        </>
      );
    case "thunder":
      return (
        <>
          <Cloud x={16} y={18} fill={COLORS.cloudDark} />
          <path
            d="M34 40 L24 54 L31 54 L27 64 L40 47 L32 47 Z"
            fill={COLORS.bolt}
          />
        </>
      );
    default:
      return <Cloud x={16} y={25} />;
  }
}

function Sun() {
  return (
    <g>
      <circle cx="32" cy="32" r="11" fill={COLORS.sun} />
      <g stroke={COLORS.sun} strokeWidth={3} strokeLinecap="round">
        <line x1="32" y1="8" x2="32" y2="15" />
        <line x1="32" y1="49" x2="32" y2="56" />
        <line x1="8" y1="32" x2="15" y2="32" />
        <line x1="49" y1="32" x2="56" y2="32" />
        <line x1="15" y1="15" x2="20" y2="20" />
        <line x1="44" y1="44" x2="49" y2="49" />
        <line x1="49" y1="15" x2="44" y2="20" />
        <line x1="20" y1="44" x2="15" y2="49" />
      </g>
    </g>
  );
}

function Moon() {
  return (
    <path
      d="M42 10 A22 22 0 1 0 42 54 A17 17 0 1 1 42 10 Z"
      fill={COLORS.moon}
    />
  );
}

function Cloud({
  x = 0,
  y = 0,
  fill = COLORS.cloud,
  opacity = 1,
}: {
  x?: number;
  y?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`} fill={fill} opacity={opacity}>
      <circle cx="22" cy="20" r="12" />
      <circle cx="38" cy="16" r="13" />
      <rect x="10" y="16" width="40" height="16" rx="8" />
    </g>
  );
}

function FogLines() {
  return (
    <g stroke={COLORS.fog} strokeWidth={3} strokeLinecap="round">
      <line x1="18" y1="44" x2="46" y2="44" />
      <line x1="14" y1="51" x2="42" y2="51" />
      <line x1="20" y1="58" x2="48" y2="58" />
    </g>
  );
}
