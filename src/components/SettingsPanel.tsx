import type { Language, Settings } from "../../electron/types";
import { t } from "../../electron/i18n";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const INTERVAL_MIN = 1;
const INTERVAL_MAX = 1440;

export function SettingsPanel({ settings, onChange }: Props) {
  const lang = settings.language;

  const onInterval = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(INTERVAL_MAX, Math.max(INTERVAL_MIN, Math.round(n)));
    onChange({ forecastTtlMinutes: clamped } as Partial<Settings>);
  };

  return (
    <section className="card settings">
      <h2 className="settings-title">{t(lang, "settings.title")}</h2>

      <div className="settings-grid">
        <label className="field">
          <span>{t(lang, "settings.language")}</span>
          <select
            value={settings.language}
            onChange={(e) =>
              onChange({ language: e.target.value as Language })
            }
          >
            <option value="ru">{t(lang, "settings.languageRu")}</option>
            <option value="en">{t(lang, "settings.languageEn")}</option>
          </select>
        </label>

        <label className="field">
          <span>{t(lang, "settings.forecastTtl")}</span>
          <input
            type="number"
            min={INTERVAL_MIN}
            max={INTERVAL_MAX}
            value={settings.forecastTtlMinutes}
            onChange={(e) => onInterval(e.target.value)}
          />
        </label>

        <label className="field checkbox">
          <input
            type="checkbox"
            checked={settings.closeToTray}
            onChange={(e) => onChange({ closeToTray: e.target.checked })}
          />
          <span>{t(lang, "settings.closeToTray")}</span>
        </label>
      </div>

      <p className="settings-hint">{t(lang, "settings.hint")}</p>
    </section>
  );
}
