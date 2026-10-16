import type {
  CurrentWeather,
  DayForecast,
  ForecastBundle,
  GeocodeResult,
  HourlyForecast,
  Language,
  WeatherApi,
} from "./types";

const OPEN_METEO = "https://api.open-meteo.com/v1";
const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
  "sunrise",
  "sunset",
].join(",");

const HOURLY_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "relative_humidity_2m",
  "is_day",
].join(",");

const CURRENT_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "pressure_msl",
  "is_day",
].join(",");

/** Сколько часов берём для почасового блока. */
const HOURLY_HOURS = 48;

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
  current?: Record<string, number | string | undefined>;
  daily?: Record<string, unknown> & { time?: string[] };
  hourly?: Record<string, unknown> & { time?: string[] };
}

export async function fetchGeocode(
  query: string,
  language: Language = "ru",
): Promise<GeocodeResult[]> {
  const url = new URL(GEOCODE);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", language);
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

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function bool(v: unknown): boolean {
  return v === 1 || v === true;
}

function at<T>(arr: unknown, i: number): T | null {
  if (!Array.isArray(arr)) return null;
  const v = arr[i];
  return (v ?? null) as T | null;
}

export function mapCurrent(raw: ForecastResponse["current"]): CurrentWeather | null {
  if (!raw || typeof raw.time !== "string") return null;
  return {
    time: raw.time,
    temperature: num(raw.temperature_2m),
    apparent: num(raw.apparent_temperature),
    humidity: num(raw.relative_humidity_2m),
    precipitation: num(raw.precipitation),
    weatherCode: num(raw.weather_code),
    windSpeed: num(raw.wind_speed_10m),
    windDirection: num(raw.wind_direction_10m),
    pressure: num(raw.pressure_msl),
    isDay: bool(raw.is_day),
  };
}

export function mapDaily(daily: ForecastResponse["daily"]): DayForecast[] {
  const time = daily?.time;
  if (!Array.isArray(time)) return [];
  return time.map((date, i) => ({
    date: String(date),
    tmin: num(at<number>(daily?.temperature_2m_min, i)),
    tmax: num(at<number>(daily?.temperature_2m_max, i)),
    weatherCode: num(at<number>(daily?.weather_code, i)),
    precipProbability: num(at<number>(daily?.precipitation_probability_max, i)),
    precipSum: num(at<number>(daily?.precipitation_sum, i)),
    windSpeedMax: num(at<number>(daily?.wind_speed_10m_max, i)),
    windGustsMax: num(at<number>(daily?.wind_gusts_10m_max, i)),
    windDirection: num(at<number>(daily?.wind_direction_10m_dominant, i)),
    uvIndexMax: num(at<number>(daily?.uv_index_max, i)),
    sunrise: str(at<string>(daily?.sunrise, i)),
    sunset: str(at<string>(daily?.sunset, i)),
    apparentMin: num(at<number>(daily?.apparent_temperature_min, i)),
    apparentMax: num(at<number>(daily?.apparent_temperature_max, i)),
  }));
}

export function mapHourly(
  hourly: ForecastResponse["hourly"],
  limit = HOURLY_HOURS,
): HourlyForecast[] {
  const time = hourly?.time;
  if (!Array.isArray(time)) return [];
  const out: HourlyForecast[] = [];
  for (let i = 0; i < time.length && out.length < limit; i += 1) {
    out.push({
      time: String(time[i]),
      temperature: num(at<number>(hourly?.temperature_2m, i)),
      apparent: num(at<number>(hourly?.apparent_temperature, i)),
      precipitationProbability: num(at<number>(hourly?.precipitation_probability, i)),
      precipitation: num(at<number>(hourly?.precipitation, i)),
      weatherCode: num(at<number>(hourly?.weather_code, i)),
      windSpeed: num(at<number>(hourly?.wind_speed_10m, i)),
      humidity: num(at<number>(hourly?.relative_humidity_2m, i)),
      isDay: bool(at<number>(hourly?.is_day, i)),
    });
  }
  return out;
}

export function mapForecastResponse(
  data: ForecastResponse,
  hourlyLimit = HOURLY_HOURS,
): ForecastBundle {
  return {
    timezone: data.timezone || "auto",
    current: mapCurrent(data.current),
    days: mapDaily(data.daily),
    hourly: mapHourly(data.hourly, hourlyLimit),
  };
}

interface ForecastCacheEntry {
  fetchedAt: number;
  data: ForecastBundle;
}

const forecastCache = new Map<string, ForecastCacheEntry>();

export function clearForecastCache(): void {
  forecastCache.clear();
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
  days: number,
  ttlMinutes = 0,
  forceRefresh = false,
): Promise<ForecastBundle> {
  const clamped = Math.min(16, Math.max(1, Math.round(days)));
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)},${clamped}`;
  const cached = forecastCache.get(key);
  const ttlMs = Math.max(0, ttlMinutes) * 60 * 1000;
  if (
    !forceRefresh &&
    cached &&
    (ttlMs === 0 || Date.now() - cached.fetchedAt < ttlMs)
  ) {
    return cached.data;
  }

  const url = new URL(OPEN_METEO + "/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", CURRENT_FIELDS);
  url.searchParams.set("hourly", HOURLY_FIELDS);
  url.searchParams.set("daily", DAILY_FIELDS);
  url.searchParams.set("forecast_days", String(clamped));
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Прогноз недоступен (HTTP ${res.status})`);
  }
  const data = (await res.json()) as ForecastResponse;
  if (!data.daily?.time) {
    throw new Error("В ответе нет прогноза по дням");
  }
  const result = mapForecastResponse(data);
  forecastCache.set(key, { fetchedAt: Date.now(), data: result });
  return result;
}

export const weatherApi: WeatherApi = {
  geocode: fetchGeocode,
  forecast: fetchForecast,
};
