import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_SETTINGS } from "./types";
import type { Language, Settings } from "./types";

export { DEFAULT_SETTINGS };

export const INTERVAL_MIN = 1;
export const INTERVAL_MAX = 1440;

let cachePath: string | null = null;

export function settingsPath(): string {
  if (!cachePath) {
    const dir = path.join(app.getPath("userData"), "weather-reminders");
    cachePath = path.join(dir, "settings.json");
  }
  return cachePath;
}

export function clampInterval(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(INTERVAL_MAX, Math.max(INTERVAL_MIN, Math.round(n)));
}

function isLanguage(value: unknown): value is Language {
  return value === "ru" || value === "en";
}

/** Приводит произвольный объект к валидным настройкам. */
export function normalizeSettings(raw: unknown): Settings {
  const input = (raw ?? {}) as Partial<Settings>;
  return {
    language: isLanguage(input.language) ? input.language : DEFAULT_SETTINGS.language,
    closeToTray:
      typeof input.closeToTray === "boolean"
        ? input.closeToTray
        : DEFAULT_SETTINGS.closeToTray,
    forecastTtlMinutes: clampInterval(
      input.forecastTtlMinutes,
      DEFAULT_SETTINGS.forecastTtlMinutes,
    ),
  };
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(settingsPath(), "utf8");
    return normalizeSettings(JSON.parse(raw));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error("Не удалось прочитать settings.json:", err);
    }
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const file = settingsPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(settings, null, 2), "utf8");
  await fs.rename(tmp, file);
}
