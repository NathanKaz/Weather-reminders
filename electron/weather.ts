import type { DayForecast, GeocodeResult, WeatherApi } from "./types";

const OPEN_METEO = "https://api.open-meteo.com/v1";
const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";

interface GeocodeResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    country?: string;
    admin1?: string;
  }>;
}

interface ForecastResponse {
  timezone: string;
  daily?: {
    time: string[];
    temperature_2m_min?: (number | null)[];
    temperature_2m_max?: (number | null)[];
  };
}

export async function fetchGeocode(query: string): Promise<GeocodeResult[]> {
  const url = new URL(GEOCODE);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "ru");
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Геокодер вернул HTTP ${res.status}`);
  }
  const data = (await res.json()) as GeocodeResponse;
  return (data.results ?? []).map((r) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    country: r.country,
    admin1: r.admin1,
  }));
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
  days: number,
): Promise<{ timezone: string; days: DayForecast[] }> {
  const clamped = Math.min(16, Math.max(1, Math.round(days)));
  const url = new URL(OPEN_METEO + "/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("daily", "temperature_2m_min,temperature_2m_max");
  url.searchParams.set("forecast_days", String(clamped));
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Прогноз недоступен (HTTP ${res.status})`);
  }
  const data = (await res.json()) as ForecastResponse;
  const daily = data.daily;
  if (!daily?.time) {
    throw new Error("В ответе нет прогноза по дням");
  }
  const daysOut: DayForecast[] = daily.time.map((date, i) => ({
    date,
    tmin: daily.temperature_2m_min?.[i] ?? null,
    tmax: daily.temperature_2m_max?.[i] ?? null,
  }));
  return { timezone: data.timezone || "auto", days: daysOut };
}

export const weatherApi: WeatherApi = {
  geocode: fetchGeocode,
  forecast: fetchForecast,
};
