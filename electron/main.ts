import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  nativeImage,
  ipcMain,
  shell,
} from "electron";
import path from "path";
import { evaluateForecast } from "./checker";
import {
  describeCondition,
  metricNominal,
  t,
} from "./i18n";
import { loadReminders, saveReminders } from "./store";
import { loadSettings, normalizeSettings, saveSettings, DEFAULT_SETTINGS } from "./settings";
import type {
  CheckOutcome,
  CreateReminderInput,
  DayForecast,
  Reminder,
  Settings,
} from "./types";
import { clearForecastCache, fetchForecast, fetchGeocode } from "./weather";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

let reminders: Reminder[] = [];
let settings: Settings = { ...DEFAULT_SETTINGS };
let checking = false;
let checkTimer: NodeJS.Timeout | null = null;

function sendReminders(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("reminders:changed", reminders);
  }
}

function sendSettings(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("settings:changed", settings);
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

function applyOutcome(reminder: Reminder, outcome: CheckOutcome): void {
  reminder.lastResult = outcome;
}

async function checkOnce(
  forceRefresh = false,
): Promise<{ checked: number; triggered: number }> {
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
          settings.forecastTtlMinutes,
          forceRefresh,
        );
        const result = evaluateForecast(
          days,
          reminder.condition,
          reminder.metric,
        );
        reminder.lastCheckedAt = now;
        if (result.matched) {
          reminder.triggered = true;
          reminder.triggeredAt = now;
          const first = result.matches[0];
          applyOutcome(reminder, {
            kind: "matched",
            count: result.matches.length,
            exampleDate: first.date,
            exampleValue: first.value,
            matches: result.matches,
          });
          notify(
            `🌡 ${reminder.title}`,
            t(settings.language, "notify.body", {
              city: reminder.city,
              metric: metricNominal(settings.language, reminder.metric),
              condition: describeCondition(settings.language, reminder.condition),
              matches: result.matches
                .map((m) => `${m.date}: ${m.value}°C`)
                .join(t(settings.language, "notify.matchesJoin")),
            }),
          );
          triggered += 1;
        } else {
          applyOutcome(reminder, { kind: "none" });
        }
      } catch (err) {
        reminder.lastCheckedAt = now;
        applyOutcome(reminder, {
          kind: "error",
          message: (err as Error).message,
        });
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
  }, 60 * 60 * 1000);
}

function buildTrayMenu(): Menu {
  const lang = settings.language;
  return Menu.buildFromTemplate([
    {
      label: t(lang, "tray.open"),
      click: () => showWindow(),
    },
    {
      label: t(lang, "tray.checkNow"),
      click: () => void checkOnce(true),
    },
    { type: "separator" },
    {
      label: t(lang, "tray.quit"),
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray(): void {
  if (tray) return;
  const iconPath = path.join(__dirname, "../assets/tray.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip(t(settings.language, "tray.tooltip"));
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => showWindow());
}

function destroyTray(): void {
  if (!tray) return;
  tray.destroy();
  tray = null;
}

function syncTray(): void {
  if (settings.closeToTray) {
    createTray();
  } else {
    destroyTray();
  }
  if (tray) {
    tray.setToolTip(t(settings.language, "tray.tooltip"));
    tray.setContextMenu(buildTrayMenu());
  }
}

function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
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

  // Закрытие окна → в трей, если опция включена.
  mainWindow.on("close", (event) => {
    if (settings.closeToTray && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

async function applySettings(next: Settings): Promise<Settings> {
  const prev = settings;
  settings = normalizeSettings(next);
  try {
    await saveSettings(settings);
  } catch (err) {
    console.error("Не удалось сохранить настройки:", err);
  }

  syncTray();
  sendSettings();
  return settings;
}

function registerIpc(): void {
  ipcMain.handle("reminders:list", () => reminders);

  ipcMain.handle("settings:get", () => settings);

  ipcMain.handle("settings:set", async (_e, patch: Partial<Settings>) => {
    return applySettings({ ...settings, ...patch });
  });

  ipcMain.handle("geocode:search", async (_e, query: string) => {
    const q = String(query ?? "").trim();
    if (q.length < 2) return [];
    return fetchGeocode(q, settings.language);
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
    // Ручная проверка всегда тянет свежий прогноз, минуя кэш.
    const result = await checkOnce(true);
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
        settings.forecastTtlMinutes,
      );
      return days;
    },
  );

  ipcMain.handle("cache:clear", () => {
    clearForecastCache();
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showWindow();
  });

  app.whenReady().then(async () => {
    settings = await loadSettings();
    reminders = await loadReminders();
    registerIpc();
    createWindow();
    syncTray();
    scheduleChecks();
    // Первая проверка сразу после запуска (с задержкой, чтобы окно успело открыться).
    setTimeout(() => {
      void checkOnce();
    }, 5_000);

    app.on("activate", () => {
      showWindow();
    });
  });

  app.on("window-all-closed", () => {
    // При включённом трее окно лишь прячется, приложение продолжает жить.
    if (process.platform !== "darwin" && !settings.closeToTray) {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    isQuitting = true;
    if (checkTimer) clearInterval(checkTimer);
    destroyTray();
  });
}
