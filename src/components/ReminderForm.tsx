import { useMemo, useState } from "react";
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

  const searchCity = async () => {
    if (!api) return;
    const q = cityQuery.trim();
    if (q.length < 2) {
      setError("Введите название города (мин. 2 символа)");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const results = await api.searchCity(q);
      setSuggestions(results);
      if (results.length === 0) {
        setError("Город не найден");
        setSelected(null);
      }
    } catch (err) {
      setError(`Ошибка поиска: ${(err as Error).message}`);
    } finally {
      setSearching(false);
    }
  };

  const pickCity = async (geo: GeocodeResult) => {
    setSelected(geo);
    setCityQuery(labelOf(geo));
    setSuggestions([]);
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
      setError("Выберите город из списка подсказок");
      return;
    }
    if (!condition) {
      setError("Проверьте значения температуры (для диапазона: от < до)");
      return;
    }
    setSaving(true);
    try {
      const created = await api.create({
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
      // Сбрасываем форму частично, оставляя город удобным для следующих напоминаний
      setTitle("");
      void created;
    } catch (err) {
      setError(`Не удалось создать: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

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

        <label className="field">
          <span>Город</span>
          <div className="input-row">
            <input
              value={cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                setSelected(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchCity();
              }}
              placeholder="Москва"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void searchCity()}
              disabled={searching}
            >
              {searching ? "…" : "Найти"}
            </button>
          </div>
        </label>

        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((s) => (
              <button
                type="button"
                key={`${s.latitude},${s.longitude}`}
                className="suggestion"
                onClick={() => void pickCity(s)}
              >
                {labelOf(s)}
              </button>
            ))}
          </div>
        )}

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
