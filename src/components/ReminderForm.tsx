import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type {
  DayForecast,
  GeocodeResult,
  Reminder,
  ReminderCondition,
  TemperatureMetric,
} from "../../electron/types";

interface Props {
  onCreated: (reminders: Reminder[]) => void;
}

type ConditionKind = ReminderCondition["kind"];

export function ReminderForm({ onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [days, setDays] = useState(5);
  const [kind, setKind] = useState<ConditionKind>("below");
  const [threshold, setThreshold] = useState("0");
  const [rangeMin, setRangeMin] = useState("18");
  const [rangeMax, setRangeMax] = useState("25");
  const [metric, setMetric] = useState<TemperatureMetric>("tmin");
  const [preview, setPreview] = useState<DayForecast[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchIdRef = useRef(0);

  const condition: ReminderCondition | null = useMemo(() => {
    if (kind === "range") {
      const min = Number(rangeMin);
      const max = Number(rangeMax);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
      return { kind: "range", min, max };
    }
    const value = Number(threshold);
    if (!Number.isFinite(value)) return null;
    return { kind, value };
  }, [kind, threshold, rangeMin, rangeMax]);

  const conditionText = condition
    ? kind === "below"
      ? `ниже ${condition.kind === "below" ? condition.value : ""}°C`
      : kind === "above"
        ? `выше ${condition.kind === "above" ? condition.value : ""}°C`
        : `от ${condition.kind === "range" ? condition.min : ""} до ${
            condition.kind === "range" ? condition.max : ""
          }°C`
    : "—";

  // Дебаунс-поиск при вводе.
  useEffect(() => {
    const client = api;
    const q = cityQuery.trim();
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
        setHighlight(results.length > 0 ? 0 : -1);
      } catch (err) {
        if (id !== searchIdRef.current) return;
        setSuggestions([]);
        setError(`Ошибка поиска: ${(err as Error).message}`);
      } finally {
        if (id === searchIdRef.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  // Закрытие меню по клику вне поля.
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

  // Подсвечиваемый пункт держим в видимой части списка.
  useEffect(() => {
    if (!open || highlight < 0) return;
    const el = listRef.current?.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const pickCity = async (geo: GeocodeResult) => {
    setSelected(geo);
    setCityQuery(labelOf(geo));
    setOpen(false);
    setHighlight(-1);
    setError("");
    if (!api) return;
    try {
      const forecast = await api.previewForecast(geo.latitude, geo.longitude, days);
      setPreview(forecast);
    } catch (err) {
      setPreview([]);
      setError(`Прогноз недоступен: ${(err as Error).message}`);
    }
  };

  const onCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) setOpen(true);
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlight >= 0 && highlight < suggestions.length) {
          void pickCity(suggestions[highlight]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlight(-1);
        break;
    }
  };

  const loadPreview = async (nextDays: number) => {
    setDays(nextDays);
    if (!api || !selected) return;
    try {
      const forecast = await api.previewForecast(
        selected.latitude,
        selected.longitude,
        nextDays,
      );
      setPreview(forecast);
    } catch {
      setPreview([]);
    }
  };

  const submit = async () => {
    if (!api) return;
    setError("");
    if (!title.trim()) {
      setError("Укажите название напоминания");
      return;
    }
    if (!selected) {
      setError("Выберите город из выпадающего списка");
      return;
    }
    if (!condition) {
      setError("Проверьте значения температуры (для диапазона: от < до)");
      return;
    }
    setSaving(true);
    try {
      await api.create({
        title: title.trim(),
        city: labelOf(selected),
        latitude: selected.latitude,
        longitude: selected.longitude,
        timezone: selected.timezone,
        days,
        condition,
        metric,
      });
      const list = await api.list();
      onCreated(list);
      setTitle("");
    } catch (err) {
      setError(`Не удалось создать: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const showDropdown = open && (suggestions.length > 0 || searching);

  return (
    <section className="card form">
      <div className="form-grid">
        <label className="field">
          <span>Название</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: заморозки на даче"
          />
        </label>

        <div className="field city-combobox" ref={boxRef}>
          <span>Город</span>
          <input
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="city-listbox"
            aria-autocomplete="list"
            autoComplete="off"
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              setSelected(null);
              if (e.target.value.trim().length >= 2) setOpen(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            onKeyDown={onCityKeyDown}
            placeholder="Начните вводить: Москва, Berlin…"
          />
          {showDropdown && (
            <ul className="city-dropdown" id="city-listbox" role="listbox" ref={listRef}>
              {searching && suggestions.length === 0 && (
                <li className="city-item city-hint" role="presentation">
                  Поиск…
                </li>
              )}
              {suggestions.map((s, i) => (
                <li
                  key={`${s.latitude},${s.longitude}`}
                  id={`city-option-${i}`}
                  role="option"
                  aria-selected={i === highlight}
                  className={`city-item ${i === highlight ? "highlight" : ""}`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void pickCity(s);
                  }}
                >
                  <span className="city-name">{s.name}</span>
                  <span className="city-sub">{[s.admin1, s.country].filter(Boolean).join(", ")}</span>
                </li>
              ))}
              {!searching && suggestions.length === 0 && cityQuery.trim().length >= 2 && (
                <li className="city-item city-hint" role="presentation">
                  Ничего не найдено
                </li>
              )}
            </ul>
          )}
        </div>

        <label className="field">
          <span>Горизонт (дней, 1–16)</span>
          <input
            type="number"
            min={1}
            max={16}
            value={days}
            onChange={(e) => void loadPreview(Number(e.target.value) || 1)}
          />
        </label>

        <label className="field">
          <span>Условие</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ConditionKind)}
          >
            <option value="below">Температура ниже порога</option>
            <option value="above">Температура выше порога</option>
            <option value="range">Температура в диапазоне</option>
          </select>
        </label>

        {kind === "range" ? (
          <>
            <label className="field">
              <span>От, °C</span>
              <input
                type="number"
                value={rangeMin}
                onChange={(e) => setRangeMin(e.target.value)}
              />
            </label>
            <label className="field">
              <span>До, °C</span>
              <input
                type="number"
                value={rangeMax}
                onChange={(e) => setRangeMax(e.target.value)}
              />
            </label>
          </>
        ) : (
          <label className="field">
            <span>Порог, °C</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span>Как считать температуру</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as TemperatureMetric)}
          >
            <option value="tmin">Минимальная (ночью/утром)</option>
            <option value="tmax">Максимальная (днём)</option>
          </select>
        </label>
      </div>

      {preview.length > 0 && (
        <div className="preview">
          <span className="preview-label">
            Прогноз на {days} дн. ({conditionText}):
          </span>
          <div className="preview-days">
            {preview.map((d) => (
              <span key={d.date} className="preview-day">
                <b>{formatShort(d.date)}</b>
                <span>
                  {fmt(d.tmin)}…{fmt(d.tmax)}°C
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={() => void submit()}
          disabled={saving}
        >
          {saving ? "Сохранение…" : "Создать напоминание"}
        </button>
      </div>
    </section>
  );
}

function labelOf(geo: GeocodeResult): string {
  const parts = [geo.name, geo.admin1, geo.country].filter(Boolean);
  return parts.join(", ");
}

function fmt(v: number | null): string {
  return v == null ? "—" : String(Math.round(v * 10) / 10);
}

function formatShort(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
