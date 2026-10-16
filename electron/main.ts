import {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  shell,
} from "electron";
import path from "path";
import { evaluateForecast, describeCondition } from "./checker";
import { loadReminders, saveReminders } from "./store";
import type {
  CreateReminderInput,
  DayForecast,
  Reminder,
} from "./types";
import { fetchForecast, fetchGeocode } from "./weather";

const CHECK_INTERVAL_MS = 45 * 60 * 1000;

let mainWindow: BrowserWindow | null = null;
let reminders: Reminder[] = [];
let checking = false;
let checkTimer: NodeJS.Timeout | null = null;

function sendReminders(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("reminders:changed", reminders);
  }
}

async function persist(): Promise<void> {
  try {
    await saveReminders(reminders);
  } catch (err) {
    console.error("Не удалось сохранить напоминания:", err);
  }
  sendReminders();
}

function notify(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function findReminder(id: string): Reminder | undefined {
  return reminders.find((r) => r.id === id);
}

async function checkOnce(): Promise<{ checked: number; triggered: number }> {
  if (checking) return { checked: 0, triggered: 0 };
  checking = true;
  let triggered = 0;
  try {
    const active = reminders.filter((r) => r.active && !r.triggered);
    const now = new Date().toISOString();
    for (const reminder of active) {
      try {
        const { days } = await fetchForecast(
          reminder.latitude,
          reminder.longitude,
          reminder.days,
        );
        const result = evaluateForecast(days, reminder.condition, reminder.metric);
        reminder.lastCheckedAt = now;
        reminder.timezone = reminder.timezone || "auto";
        if (result.matched) {
          reminder.triggered = true;
          reminder.triggeredAt = now;
          const first = result.matches[0];
          reminder.lastResult = `${result.matches.length} дн.; напр. ${first.date}: ${first.value}°C`;
          const metricLabel =
            reminder.metric === "tmin" ? "минимальная" : "максимальная";
          notify(
            `🌡 ${reminder.title}`,
            `В городе ${reminder.city} ${metricLabel} температура ${describeCondition(reminder.condition)}.` +
              `\nСовпадений: ${result.matches.map((m) => `${m.date}: ${m.value}°C`).join(", ")}`,
          );
          triggered += 1;
        } else {
          reminder.lastResult = "нет совпадений в прогнозе";
        }
      } catch (err) {
        reminder.lastCheckedAt = now;
        reminder.lastResult = `ошибка: ${(err as Error).message}`;
        console.error(`Проверка "${reminder.title}" не удалась:`, err);
      }
    }
    if (triggered > 0 || active.length > 0) {
      await persist();
    }
  } finally {
    checking = false;
  }
  return { checked: reminders.length, triggered };
}

function scheduleChecks(): void {
  if (checkTimer) clearInterval(checkTimer);
  checkTimer = setInterval(() => {
    void checkOnce();
  }, CHECK_INTERVAL_MS);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    title: "Weather Reminders",
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function registerIpc(): void {
  ipcMain.handle("reminders:list", () => reminders);

  ipcMain.handle("geocode:search", async (_e, query: string) => {
    const q = String(query ?? "").trim();
    if (q.length < 2) return [];
    return fetchGeocode(q);
  });

  ipcMain.handle(
    "reminders:create",
    async (_e, input: CreateReminderInput): Promise<Reminder> => {
      const reminder: Reminder = {
        id: crypto.randomUUID(),
        title: input.title.trim(),
        city: input.city.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        timezone: input.timezone,
        days: Math.min(16, Math.max(1, Math.round(input.days))),
        condition: input.condition,
        metric: input.metric,
        active: true,
        triggered: false,
        createdAt: new Date().toISOString(),
      };
      reminders = [...reminders, reminder];
      await persist();
      return reminder;
    },
  );

  ipcMain.handle("reminders:toggle", async (_e, id: string) => {
    reminders = reminders.map((r) =>
      r.id === id
        ? {
            ...r,
            active: !r.active,
            // При повторном включении сбрасываем срабатывание,
            // чтобы условие можно было поймать заново.
            triggered: r.active ? r.triggered : false,
            triggeredAt: r.active ? r.triggeredAt : undefined,
          }
        : r,
    );
    await persist();
    return reminders;
  });

  ipcMain.handle("reminders:rearm", async (_e, id: string) => {
    reminders = reminders.map((r) =>
      r.id === id
        ? { ...r, triggered: false, triggeredAt: undefined }
        : r,
    );
    await persist();
    return reminders;
  });

  ipcMain.handle("reminders:delete", async (_e, id: string) => {
    reminders = reminders.filter((r) => r.id !== id);
    await persist();
    return reminders;
  });

  ipcMain.handle("reminders:checkNow", async () => {
    const result = await checkOnce();
    return { ...result, reminders };
  });

  ipcMain.handle(
    "forecast:preview",
    async (
      _e,
      args: { latitude: number; longitude: number; days: number },
    ): Promise<DayForecast[]> => {
      const { days } = await fetchForecast(
        args.latitude,
        args.longitude,
        args.days,
      );
      return days;
    },
  );
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    reminders = await loadReminders();
    registerIpc();
    createWindow();
    scheduleChecks();
    // Первая проверка сразу после запуска (с задержкой, чтобы окно успело открыться).
    setTimeout(() => {
      void checkOnce();
    }, 5_000);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    if (checkTimer) clearInterval(checkTimer);
  });
}
