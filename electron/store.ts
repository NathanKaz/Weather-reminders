import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import type { Reminder } from "./types";

let cachePath: string | null = null;

export function storePath(): string {
  if (!cachePath) {
    const dir = path.join(app.getPath("userData"), "weather-reminders");
    cachePath = path.join(dir, "reminders.json");
  }
  return cachePath;
}

export async function loadReminders(): Promise<Reminder[]> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Reminder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    console.error("Не удалось прочитать reminders.json:", err);
    return [];
  }
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(reminders, null, 2), "utf8");
  await fs.rename(tmp, file);
}
