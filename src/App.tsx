import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { ReminderForm } from "./components/ReminderForm";
import { ReminderList } from "./components/ReminderList";
import { SettingsPanel } from "./components/SettingsPanel";
import { t } from "../electron/i18n";
import { DEFAULT_SETTINGS } from "../electron/types";
import type { Reminder, Settings } from "../electron/types";

export default function App() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const lang = settings.language;

  const refresh = useCallback(async () => {
    if (!api) {
      setStatus(t(settings.language, "status.apiUnavailable"));
      return;
    }
    const list = await api.list();
    setReminders(list);
    setStatus(
      list.length === 0
        ? t(settings.language, "status.noReminders")
        : t(settings.language, "status.count", { n: list.length }),
    );
  }, [settings.language]);

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
      setStatus(t(next.language, "status.settingsSaved"));
    } catch (err) {
      setStatus(
        t(lang, "status.settingsError", { message: (err as Error).message }),
      );
    }
  };

  const handleCheckNow = async () => {
    if (!api) return;
    setBusy(true);
    setStatus(t(lang, "status.checking"));
    try {
      const result = await api.checkNow();
      setReminders(result.reminders);
      setStatus(
        result.triggered > 0
          ? t(lang, "status.triggered", { n: result.triggered })
          : t(lang, "status.checkDone"),
      );
    } catch (err) {
      setStatus(t(lang, "status.checkError", { message: (err as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  const handleCreated = (list: Reminder[]) => {
    setReminders(list);
    setShowForm(false);
    setStatus(t(lang, "status.created"));
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🌤 Weather Reminders</h1>
          <p className="subtitle">{t(lang, "app.subtitle")}</p>
        </div>
        <div className="header-actions">
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
          <button
            className="btn btn-secondary"
            title={t(lang, "app.settings")}
            aria-label={t(lang, "app.settings")}
            onClick={() => setShowSettings((v) => !v)}
          >
            ⚙
          </button>
        </div>
      </header>

      {showSettings && api && (
        <SettingsPanel settings={settings} onChange={(p) => void updateSettings(p)} />
      )}

      <div className="status-bar">{status}</div>

      {showForm && api && <ReminderForm lang={lang} onCreated={handleCreated} />}

      <ReminderList
        lang={lang}
        reminders={reminders}
        onChanged={setReminders}
        onStatus={setStatus}
      />
    </div>
  );
}
