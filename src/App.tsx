import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { ReminderForm } from "./components/ReminderForm";
import { ReminderList } from "./components/ReminderList";
import type { Reminder } from "../electron/types";

export default function App() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [status, setStatus] = useState<string>("Загрузка…");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    if (!api) {
      setStatus("Хост API недоступен — запускайте через Electron (npm start)");
      return;
    }
    const list = await api.list();
    setReminders(list);
    setStatus(list.length === 0 ? "Напоминаний пока нет" : `${list.length} напоминаний`);
  }, []);

  useEffect(() => {
    void refresh();
    if (!api) return;
    const off = api.onChanged((list) => setReminders(list));
    return off;
  }, [refresh]);

  const handleCheckNow = async () => {
    if (!api) return;
    setBusy(true);
    setStatus("Проверяем прогноз…");
    try {
      const result = await api.checkNow();
      setReminders(result.reminders);
      setStatus(
        result.triggered > 0
          ? `Сработало напоминаний: ${result.triggered}`
          : "Проверка завершена: срабатываний нет",
      );
    } catch (err) {
      setStatus(`Ошибка проверки: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCreated = (list: Reminder[]) => {
    setReminders(list);
    setShowForm(false);
    setStatus("Напоминание создано");
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🌤 Weather Reminders</h1>
          <p className="subtitle">
            Напоминания о температуре по прогнозу Open-Meteo
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => void handleCheckNow()}
            disabled={busy}
          >
            {busy ? "Проверка…" : "Проверить сейчас"}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Закрыть" : "+ Напоминание"}
          </button>
        </div>
      </header>

      <div className="status-bar">{status}</div>

      {showForm && api && <ReminderForm onCreated={handleCreated} />}

      <ReminderList
        reminders={reminders}
        onChanged={setReminders}
        onStatus={setStatus}
      />
    </div>
  );
}
