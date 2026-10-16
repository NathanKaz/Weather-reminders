import { api } from "../api";
import type { Reminder, ReminderCondition } from "../../electron/types";

interface Props {
  reminders: Reminder[];
  onChanged: (reminders: Reminder[]) => void;
  onStatus: (status: string) => void;
}

export function ReminderList({ reminders, onChanged, onStatus }: Props) {
  if (reminders.length === 0) {
    return (
      <section className="empty">
        Пока нет напоминаний. Нажмите «+ Напоминание», чтобы создать первое.
      </section>
    );
  }

  const act = async (fn: () => Promise<Reminder[]>, message: string) => {
    if (!api) return;
    try {
      const list = await fn();
      onChanged(list);
      onStatus(message);
    } catch (err) {
      onStatus(`Ошибка: ${(err as Error).message}`);
    }
  };

  return (
    <section className="list">
      {reminders.map((r) => (
        <article key={r.id} className={`card reminder ${r.triggered ? "triggered" : ""}`}>
          <div className="reminder-main">
            <div className="reminder-title">
              {r.title}
              <span className={`badge ${r.active ? "badge-on" : "badge-off"}`}>
                {r.active ? "активно" : "выключено"}
              </span>
              {r.triggered && <span className="badge badge-fired">сработало</span>}
            </div>
            <div className="reminder-meta">
              📍 {r.city} · {r.days} дн. · {metricLabel(r.metric)} {conditionLabel(r.condition)}
            </div>
            {r.triggered && r.triggeredAt && (
              <div className="reminder-result">
                Сработало {formatDateTime(r.triggeredAt)}
                {r.lastResult ? ` · ${r.lastResult}` : ""}
              </div>
            )}
            {!r.triggered && r.lastCheckedAt && (
              <div className="reminder-result muted">
                Проверено {formatDateTime(r.lastCheckedAt)}
                {r.lastResult ? ` · ${r.lastResult}` : ""}
              </div>
            )}
          </div>
          <div className="reminder-actions">
            {r.triggered && (
              <button
                className="btn btn-small btn-secondary"
                onClick={() => void act(() => api!.rearm(r.id), "Напоминание переведено в активные")}
              >
                Снова
              </button>
            )}
            <button
              className="btn btn-small btn-secondary"
              onClick={() => void act(() => api!.toggle(r.id), "Статус обновлён")}
            >
              {r.active ? "Выкл" : "Вкл"}
            </button>
            <button
              className="btn btn-small btn-danger"
              onClick={() => void act(() => api!.remove(r.id), "Напоминание удалено")}
            >
              Удалить
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function metricLabel(metric: Reminder["metric"]): string {
  return metric === "tmin" ? "мин." : "макс.";
}

function conditionLabel(condition: ReminderCondition): string {
  switch (condition.kind) {
    case "above":
      return `> ${condition.value}°C`;
    case "below":
      return `< ${condition.value}°C`;
    case "range":
      return `${condition.min}…${condition.max}°C`;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
