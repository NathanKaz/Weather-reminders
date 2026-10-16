import { contextBridge, ipcRenderer } from "electron";
import type {
  CreateReminderInput,
  DayForecast,
  ForecastBundle,
  GeocodeResult,
  Reminder,
  Settings,
} from "./types";

const api = {
  list(): Promise<Reminder[]> {
    return ipcRenderer.invoke("reminders:list");
  },
  create(input: CreateReminderInput): Promise<Reminder> {
    return ipcRenderer.invoke("reminders:create", input);
  },
  toggle(id: string): Promise<Reminder[]> {
    return ipcRenderer.invoke("reminders:toggle", id);
  },
  rearm(id: string): Promise<Reminder[]> {
    return ipcRenderer.invoke("reminders:rearm", id);
  },
  remove(id: string): Promise<Reminder[]> {
    return ipcRenderer.invoke("reminders:delete", id);
  },
  checkNow(): Promise<{
    checked: number;
    triggered: number;
    reminders: Reminder[];
  }> {
    return ipcRenderer.invoke("reminders:checkNow");
  },
  searchCity(query: string): Promise<GeocodeResult[]> {
    return ipcRenderer.invoke("geocode:search", query);
  },
  previewForecast(
    latitude: number,
    longitude: number,
    days: number,
  ): Promise<DayForecast[]> {
    return ipcRenderer.invoke("forecast:preview", { latitude, longitude, days });
  },
  forecastDetails(
    latitude: number,
    longitude: number,
    days: number,
    forceRefresh = false,
  ): Promise<ForecastBundle> {
    return ipcRenderer.invoke("forecast:details", {
      latitude,
      longitude,
      days,
      forceRefresh,
    });
  },
  getSettings(): Promise<Settings> {
    return ipcRenderer.invoke("settings:get");
  },
  setSettings(patch: Partial<Settings>): Promise<Settings> {
    return ipcRenderer.invoke("settings:set", patch);
  },
  onChanged(callback: (reminders: Reminder[]) => void): () => void {
    const listener = (_e: Electron.IpcRendererEvent, list: Reminder[]) =>
      callback(list);
    ipcRenderer.on("reminders:changed", listener);
    return () => ipcRenderer.removeListener("reminders:changed", listener);
  },
  onSettingsChanged(callback: (settings: Settings) => void): () => void {
    const listener = (_e: Electron.IpcRendererEvent, next: Settings) =>
      callback(next);
    ipcRenderer.on("settings:changed", listener);
    return () => ipcRenderer.removeListener("settings:changed", listener);
  },
};

export type Api = typeof api;

contextBridge.exposeInMainWorld("weatherApi", api);
