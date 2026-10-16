import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { WeatherIcon } from "./WeatherIcon";
import { TempChart } from "./TempChart";
import {
  describeWeather,
  formatForecastDay,
  formatFullDate,
  formatHour,
  t,
  weatherKind,
  windDirectionLabel,
} from "../../electron/i18n";
import type {
  CurrentWeather,
  DayForecast,
  ForecastBundle,
  GeocodeResult,
  HourlyForecast,
  Language,
  Reminder,
} from "../../electron/types";

interface Props {
  lang: Language;
  reminders: Reminder[];
}

interface City {
  label: string;
  latitude: number;
  longitude: number;
}

type View = "hourly" | "daily";

export function ForecastPanel({ lang, reminders }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<City | null>(null);
  const [days, setDays] = useState(7);
  const [view, setView] = useState<View>("hourly");
  const [hourlyRange, setHourlyRange] = useState(24);
  const [bundle, setBundle] = useState<ForecastBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const boxRef = useRef<HTMLDivElement>(null);
  const searchIdRef = useRef(0);

  const chips = useMemo(() => {
    const seen = new Map<string, City>();
    for (const r of reminders) {
      const key = `${r.latitude.toFixed(3)},${r.longitude.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.set(key, {
          label: r.city,
          latitude: r.latitude,
          longitude: r.longitude,
        });
      }
    }
    return [...seen.values()];
  }, [reminders]);

  useEffect(() => {
    const client = api;
    const q = query.trim();
    if (!client || q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const id = ++searchIdRef.current;
      try {
        const results = await client.searchCity(q);
        if (id !== searchIdRef.current) return;
        setSuggestions(results);
        setOpen(true);
      } catch {
        if (id !== searchIdRef.current) return;
        setSuggestions([]);
      } finally {
        if (id === searchIdRef.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const load = async (city: City, n: number, forceRefresh = false) => {
    if (!api) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.forecastDetails(
        city.latitude,
        city.longitude,
        n,
        forceRefresh,
      );
      setBundle(data);
    } catch (err) {
      setBundle(null);
      setError(t(lang, "forecast.error", { message: (err as Error).message }));
    } finally {
      setLoading(false);
    }
  };

  const pick = (city: City) => {
    setSelected(city);
    setQuery(city.label);
    setOpen(false);
    void load(city, days);
  };

  const changeDays = (n: number) => {
    setDays(n);
    if (selected) void load(selected, n);
  };

  const showDropdown = open && (suggestions.length > 0 || searching);
  const hourly = bundle?.hourly.slice(0, hourlyRange) ?? [];
  const range = temperatureRange(bundle?.days ?? []);

  return (
    <section className="forecast">
      <div className="forecast-toolbar">
        <div className="field city-combobox" ref={boxRef}>
          <span>{t(lang, "form.city")}</span>
          <input
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="forecast-city-listbox"
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length >= 2) setOpen(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) {
                e.preventDefault();
                pick(labelOf(suggestions[0]));
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={t(lang, "form.cityPlaceholder")}
          />
          {showDropdown && (
            <ul className="city-dropdown" id="forecast-city-listbox" role="listbox">
              {searching && suggestions.length === 0 && (
                <li className="city-item city-hint" role="presentation">
                  {t(lang, "form.searching")}
                </li>
              )}
              {suggestions.map((s) => (
                <li
                  key={`${s.latitude},${s.longitude}`}
                  role="option"
                  className="city-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(labelOf(s));
                  }}
                >
                  <span className="city-name">{s.name}</span>
                  <span className="city-sub">
                    {[s.admin1, s.country].filter(Boolean).join(", ")}
                  </span>
                </li>
              ))}
              {!searching && suggestions.length === 0 && query.trim().length >= 2 && (
                <li className="city-item city-hint" role="presentation">
                  {t(lang, "form.notFound")}
                </li>
              )}
            </ul>
          )}
        </div>

        <label className="field forecast-days">
          <span>{t(lang, "form.days")}</span>
          <select value={days} onChange={(e) => changeDays(Number(e.target.value))}>
            <option value={3}>{t(lang, "list.days", { n: 3 })}</option>
            <option value={7}>{t(lang, "list.days", { n: 7 })}</option>
            <option value={14}>{t(lang, "list.days", { n: 14 })}</option>
            <option value={16}>{t(lang, "list.days", { n: 16 })}</option>
          </select>
        </label>

        <button
          className="btn btn-secondary"
          disabled={!selected || loading}
          onClick={() => selected && void load(selected, days, true)}
        >
          {loading ? t(lang, "forecast.loading") : t(lang, "forecast.refresh")}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="forecast-quick">
          <span className="preview-label">{t(lang, "forecast.quick")}</span>
          <div className="forecast-chips">
            {chips.map((c) => (
              <button
                key={`${c.latitude},${c.longitude}`}
                className={`chip ${
                  selected &&
                  selected.latitude === c.latitude &&
                  selected.longitude === c.longitude
                    ? "active"
                    : ""
                }`}
                onClick={() => pick(c)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {!selected && <div className="empty">{t(lang, "forecast.pickCity")}</div>}

      {selected && loading && !bundle && (
        <div className="forecast-skeleton">
          <div className="skeleton skeleton-hero" />
          <div className="skeleton skeleton-line" />
        </div>
      )}

      {selected && bundle && (
        <div className="forecast-body">
          {bundle.current && <CurrentCard lang={lang} current={bundle.current} />}

          <div className="forecast-views">
            <div className="segmented">
              <button
                className={`segment ${view === "hourly" ? "active" : ""}`}
                onClick={() => setView("hourly")}
              >
                {t(lang, "forecast.hourly")}
              </button>
              <button
                className={`segment ${view === "daily" ? "active" : ""}`}
                onClick={() => setView("daily")}
              >
                {t(lang, "forecast.daily")}
              </button>
            </div>
            {view === "hourly" && (
              <div className="segmented segmented-sm">
                {[24, 48].map((n) => (
                  <button
                    key={n}
                    className={`segment ${hourlyRange === n ? "active" : ""}`}
                    onClick={() => setHourlyRange(n)}
                  >
                    {n === 24 ? t(lang, "forecast.range24") : t(lang, "forecast.range48")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {view === "hourly" ? (
            hourly.length > 0 ? (
              <>
                <TempChart hourly={hourly} lang={lang} />
                <div className="hour-strip">
                  {hourly.map((h) => (
                    <HourCard key={h.time} lang={lang} hour={h} />
                  ))}
                </div>
              </>
            ) : (
              <div className="empty">{t(lang, "forecast.noData")}</div>
            )
          ) : (
            <div className="day-list">
              {bundle.days.map((d, i) => (
                <DayRow
                  key={d.date}
                  lang={lang}
                  day={d}
                  today={i === 0}
                  lo={range.lo}
                  hi={range.hi}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CurrentCard({ lang, current }: { lang: Language; current: CurrentWeather }) {
  const kind = weatherKind(current.weatherCode);
  return (
    <article className={`current-card ${current.isDay ? "is-day" : "is-night"}`}>
      <div className="current-main">
        <WeatherIcon
          kind={kind}
          isDay={current.isDay}
          size={84}
          title={describeWeather(lang, current.weatherCode)}
        />
        <div className="current-temp-block">
          <div className="current-temp">{fmt(current.temperature)}°</div>
          <div className="current-desc">{describeWeather(lang, current.weatherCode)}</div>
          <div className="current-feels">
            {t(lang, "forecast.feelsLike")}: {fmt(current.apparent)}°
          </div>
        </div>
      </div>
      <div className="current-stats">
        <Stat
          icon="🌬"
          label={t(lang, "forecast.wind")}
          value={windLabel(lang, current)}
        />
        <Stat
          icon="💧"
          label={t(lang, "forecast.humidity")}
          value={pct(current.humidity)}
        />
        <Stat
          icon="🧭"
          label={t(lang, "forecast.pressure")}
          value={
            current.pressure == null
              ? "—"
              : `${Math.round(current.pressure)} ${t(lang, "forecast.unitHpa")}`
          }
        />
        <Stat
          icon="☂"
          label={t(lang, "forecast.precipitation")}
          value={`${fmt(current.precipitation)} ${t(lang, "forecast.unitMm")}`}
        />
      </div>
    </article>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-icon" aria-hidden>
        {icon}
      </span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function HourCard({ lang, hour }: { lang: Language; hour: HourlyForecast }) {
  return (
    <div className="hour-card">
      <span className="hour-time">{formatHour(lang, hour.time)}</span>
      <WeatherIcon
        kind={weatherKind(hour.weatherCode)}
        isDay={hour.isDay}
        size={28}
        title={describeWeather(lang, hour.weatherCode)}
      />
      <span className="hour-temp">{fmt(hour.temperature)}°</span>
      {hour.precipitationProbability != null && (
        <span className="hour-precip">☂ {Math.round(hour.precipitationProbability)}%</span>
      )}
    </div>
  );
}

function DayRow({
  lang,
  day,
  today,
  lo,
  hi,
}: {
  lang: Language;
  day: DayForecast;
  today: boolean;
  lo: number;
  hi: number;
}) {
  const kind = weatherKind(day.weatherCode);
  const wind = windDirectionLabel(lang, day.windDirection);
  return (
    <article className={`day-row ${today ? "today" : ""}`}>
      <div className="day-date">
        <b>{today ? t(lang, "forecast.current") : formatForecastDay(lang, day.date)}</b>
        <span>{formatFullDate(lang, day.date)}</span>
      </div>
      <WeatherIcon
        kind={kind}
        size={40}
        title={describeWeather(lang, day.weatherCode)}
      />
      <div className="day-desc">{describeWeather(lang, day.weatherCode)}</div>
      <div className="day-range">
        <span className="day-temp-min">{fmt(day.tmin)}°</span>
        <span className="forecast-track">
          <span className="forecast-span" style={spanStyle(day, lo, hi)} />
        </span>
        <span className="day-temp-max">{fmt(day.tmax)}°</span>
      </div>
      <div className="day-apparent">
        {t(lang, "forecast.feelsLike")}: {fmt(day.apparentMin)}° / {fmt(day.apparentMax)}°
      </div>
      <div className="day-extra">
        {day.precipProbability != null && (
          <span title={t(lang, "forecast.precipProb")}>
            ☂ {Math.round(day.precipProbability)}%
          </span>
        )}
        {day.windSpeedMax != null && (
          <span>
            🌬 {fmt(day.windSpeedMax)} {t(lang, "forecast.unitWind")}
            {wind ? ` ${wind}` : ""}
          </span>
        )}
      </div>
    </article>
  );
}

function labelOf(geo: GeocodeResult): City {
  const parts = [geo.name, geo.admin1, geo.country].filter(Boolean);
  return {
    label: parts.join(", "),
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}

function fmt(v: number | null | undefined): string {
  return v == null ? "—" : String(Math.round(v * 10) / 10);
}

function pct(v: number | null | undefined): string {
  return v == null ? "—" : `${Math.round(v)}%`;
}

function windLabel(lang: Language, current: CurrentWeather): string {
  const dir = windDirectionLabel(lang, current.windDirection);
  if (current.windSpeed == null) return "—";
  const speed = `${fmt(current.windSpeed)} ${t(lang, "forecast.unitWind")}`;
  return dir ? `${speed} ${dir}` : speed;
}

function temperatureRange(days: DayForecast[]): { lo: number; hi: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const d of days) {
    for (const v of [d.tmin, d.tmax]) {
      if (v == null) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 0, hi: 1 };
  if (hi === lo) return { lo: lo - 1, hi: hi + 1 };
  return { lo, hi };
}

function spanStyle(day: DayForecast, lo: number, hi: number): React.CSSProperties {
  if (day.tmin == null || day.tmax == null) return { display: "none" };
  const left = ((day.tmin - lo) / (hi - lo)) * 100;
  const width = Math.max(6, ((day.tmax - day.tmin) / (hi - lo)) * 100);
  return { left: `${left}%`, width: `${width}%` };
}
