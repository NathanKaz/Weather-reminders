import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { ForecastPanel } from "./components/ForecastPanel";
import { ReminderForm } from "./components/ReminderForm";
import { ReminderList } from "./components/ReminderList";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusBanner } from "./components/StatusBanner";
import type { StatusVariant } from "./components/StatusBanner";
import { t } from "../electron/i18n";
import { DEFAULT_SETTINGS } from "../electron/types";
import type { Reminder, Settings } from "../electron/types";

type Page = "reminders" | "forecast" | "settings";

interface Status {
  text: string;
  variant: StatusVariant;
}

export default function App() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState<Page>("reminders");

  const lang = settings.language;

  const showStatus = useCallback((text: string, variant: StatusVariant = "info") => {
    setStatus({ text, variant });
  }, []);

  const refresh = useCallback(async () => {
    if (!api) {
      showStatus(t(settings.language, "status.apiUnavailable"), "error");
      return;
    }
    const list = await api.list();
    setReminders(list);
    showStatus(
      list.length === 0
        ? t(settings.language, "status.noReminders")
        : t(settings.language, "status.count", { n: list.length }),
    );
  }, [settings.language, showStatus]);

  useEffect(() => {
    void refresh();
    if (!api) return;
    const offReminders = api.onChanged((list) => setReminders(list));
    const offSettings = api.onSettingsChanged((next) => setSettings(next));
    return () => {
      offReminders();
      offSettings();
    };
  }, [refresh]);

  useEffect(() => {
    if (!api) return;
    void api.getSettings().then(setSettings);
  }, []);

  const updateSettings = async (patch: Partial<Settings>) => {
    if (!api) return;
    // Оптимистично применяем (в т.ч. для мгновенной смены языка).
    setSettings((prev) => ({ ...prev, ...patch }));
    try {
      const next = await api.setSettings(patch);
      setSettings(next);
      showStatus(t(next.language, "status.settingsSaved"), "success");
    } catch (err) {
      showStatus(
        t(lang, "status.settingsError", { message: (err as Error).message }),
        "error",
      );
    }
  };

  const handleCheckNow = async () => {
    if (!api) return;
    setBusy(true);
    showStatus(t(lang, "status.checking"));
    try {
      const result = await api.checkNow();
      setReminders(result.reminders);
      showStatus(
        result.triggered > 0
          ? t(lang, "status.triggered", { n: result.triggered })
          : t(lang, "status.checkDone"),
        result.triggered > 0 ? "success" : "info",
      );
    } catch (err) {
      showStatus(
        t(lang, "status.checkError", { message: (err as Error).message }),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCreated = (list: Reminder[]) => {
    setReminders(list);
    setShowForm(false);
    setStatus({ text: t(lang, "status.created"), variant: "success" });
  };

  const title =
    page === "forecast"
      ? t(lang, "nav.forecast")
      : page === "settings"
        ? t(lang, "nav.settings")
        : t(lang, "nav.reminders");

  const subtitle =
    page === "reminders"
      ? t(lang, "app.subtitle")
      : page === "forecast"
        ? t(lang, "forecast.pickCity")
        : t(lang, "settings.hint");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo" aria-hidden>
            🌤
          </span>
          <span className="brand-name">Weather&nbsp;Reminders</span>
        </div>

        <nav className="nav">
          <button
            className={`nav-item ${page === "reminders" ? "active" : ""}`}
            aria-current={page === "reminders"}
            onClick={() => setPage("reminders")}
          >
            <span className="nav-icon" aria-hidden>
              🔔
            </span>
            {t(lang, "nav.reminders")}
          </button>
          <button
            className={`nav-item ${page === "forecast" ? "active" : ""}`}
            aria-current={page === "forecast"}
            onClick={() => setPage("forecast")}
          >
            <span className="nav-icon" aria-hidden>
              🌤
            </span>
            {t(lang, "nav.forecast")}
          </button>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            aria-current={page === "settings"}
            onClick={() => setPage("settings")}
          >
            <span className="nav-icon" aria-hidden>
              ⚙
            </span>
            {t(lang, "nav.settings")}
          </button>
        </nav>

        <div className="sidebar-foot">
          <span className="muted">Open-Meteo</span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p className="subtitle">{subtitle}</p>
          </div>
          {page === "reminders" && (
            <div className="topbar-actions">
              <button
                className="btn btn-secondary"
                onClick={() => void handleCheckNow()}
                disabled={busy}
              >
                {busy ? t(lang, "btn.checking") : t(lang, "btn.checkNow")}
              </button>
              <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
                {showForm ? t(lang, "btn.close") : t(lang, "btn.addReminder")}
              </button>
            </div>
          )}
        </header>

        {page === "reminders" && (
          <>
            {status && (
              <StatusBanner
                text={status.text}
                variant={status.variant}
                onClose={() => setStatus(null)}
              />
            )}
            {showForm && api && <ReminderForm lang={lang} onCreated={handleCreated} />}
            <ReminderList
              lang={lang}
              reminders={reminders}
              onChanged={setReminders}
              onStatus={showStatus}
            />
          </>
        )}

        {page === "forecast" && <ForecastPanel lang={lang} reminders={reminders} />}

        {page === "settings" && (
          <>
            {status && (
              <StatusBanner
                text={status.text}
                variant={status.variant}
                onClose={() => setStatus(null)}
              />
            )}
            <SettingsPanel settings={settings} onChange={(p) => void updateSettings(p)} />
          </>
        )}
      </main>
    </div>
  );
}
