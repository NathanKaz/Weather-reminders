import { api } from "../api";
import {
  describeConditionShort,
  describeOutcome,
  formatDateTime,
  metricShort,
  t,
} from "../../electron/i18n";
import type { Language, Reminder } from "../../electron/types";

interface Props {
  lang: Language;
  reminders: Reminder[];
  onChanged: (reminders: Reminder[]) => void;
  onStatus: (status: string) => void;
}

export function ReminderList({ lang, reminders, onChanged, onStatus }: Props) {
  if (reminders.length === 0) {
    return <section className="empty">{t(lang, "list.empty")}</section>;
  }

  const act = async (fn: () => Promise<Reminder[]>, message: string) => {
    if (!api) return;
    try {
      const list = await fn();
      onChanged(list);
      onStatus(message);
    } catch (err) {
      onStatus(t(lang, "list.error", { message: (err as Error).message }));
    }
  };

  return (
    <section className="list">
      {reminders.map((r) => (
        <article
          key={r.id}
          className={`card reminder ${r.triggered ? "triggered" : ""}`}
        >
          <div className="reminder-main">
            <div className="reminder-title">
              {r.title}
              <span className={`badge ${r.active ? "badge-on" : "badge-off"}`}>
                {r.active ? t(lang, "badge.active") : t(lang, "badge.off")}
              </span>
              {r.triggered && (
                <span className="badge badge-fired">{t(lang, "badge.fired")}</span>
              )}
            </div>
            <div className="reminder-meta">
              📍 {r.city} · {t(lang, "list.days", { n: r.days })} ·{" "}
              {metricShort(lang, r.metric)}{" "}
              {describeConditionShort(lang, r.condition)}
            </div>
            {r.triggered && r.triggeredAt && (
              <div className="reminder-result">
                {t(lang, "list.firedAt", {
                  time: formatDateTime(lang, r.triggeredAt),
                })}
                {r.lastResult ? ` · ${describeOutcome(lang, r.lastResult)}` : ""}
              </div>
            )}
            {!r.triggered && r.lastCheckedAt && (
              <div className="reminder-result muted">
                {t(lang, "list.checkedAt", {
                  time: formatDateTime(lang, r.lastCheckedAt),
                })}
                {r.lastResult ? ` · ${describeOutcome(lang, r.lastResult)}` : ""}
              </div>
            )}
          </div>
          <div className="reminder-actions">
            {r.triggered && (
              <button
                className="btn btn-small btn-secondary"
                onClick={() =>
                  void act(
                    () => api!.rearm(r.id),
                    t(lang, "list.statusRearmed"),
                  )
                }
              >
                {t(lang, "list.btnRearm")}
              </button>
            )}
            <button
              className="btn btn-small btn-secondary"
              onClick={() =>
                void act(() => api!.toggle(r.id), t(lang, "list.statusToggled"))
              }
            >
              {r.active ? t(lang, "list.btnToggleOff") : t(lang, "list.btnToggleOn")}
            </button>
            <button
              className="btn btn-small btn-danger"
              onClick={() =>
                void act(() => api!.remove(r.id), t(lang, "list.statusDeleted"))
              }
            >
              {t(lang, "list.btnDelete")}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
