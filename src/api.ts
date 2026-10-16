import type {
  CreateReminderInput,
  DayForecast,
  GeocodeResult,
  Reminder,
} from "../electron/types";

export interface Api {
  list(): Promise<Reminder[]>;
  create(input: CreateReminderInput): Promise<Reminder>;
  toggle(id: string): Promise<Reminder[]>;
  rearm(id: string): Promise<Reminder[]>;
  remove(id: string): Promise<Reminder[]>;
  checkNow(): Promise<{
    checked: number;
    triggered: number;
    reminders: Reminder[];
  }>;
  searchCity(query: string): Promise<GeocodeResult[]>;
  previewForecast(
    latitude: number,
    longitude: number,
    days: number,
  ): Promise<DayForecast[]>;
  onChanged(callback: (reminders: Reminder[]) => void): () => void;
}

declare global {
  interface Window {
    weatherApi: Api;
  }
}

export const api: Api | null =
  typeof window !== "undefined" && window.weatherApi
    ? window.weatherApi
    : null;
