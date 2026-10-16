import { contextBridge, ipcRenderer } from "electron";
import type {
  CreateReminderInput,
  DayForecast,
  GeocodeResult,
  Reminder,
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
  onChanged(callback: (reminders: Reminder[]) => void): () => void {
    const listener = (_e: Electron.IpcRendererEvent, list: Reminder[]) =>
      callback(list);
    ipcRenderer.on("reminders:changed", listener);
    return () => ipcRenderer.removeListener("reminders:changed", listener);
  },
};

export type Api = typeof api;

contextBridge.exposeInMainWorld("weatherApi", api);
