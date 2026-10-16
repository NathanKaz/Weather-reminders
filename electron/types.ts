export type ReminderCondition =
  | { kind: "above"; value: number }
  | { kind: "below"; value: number }
  | { kind: "range"; min: number; max: number };

export type TemperatureMetric = "tmin" | "tmax";

export type Language = "ru" | "en";

export interface Settings {
  language: Language;
  closeToTray: boolean;
  /** Интервал обновления прогноза (TTL кэша), минуты (1..1440). */
  forecastTtlMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  language: "ru",
  closeToTray: false,
  forecastTtlMinutes: 60,
};

/**
 * Структурированный результат последней проверки — переводится при рендере,
 * поэтому смена языка корректно отражается на уже сохранённых записях.
 */
export type CheckOutcome =
  | { kind: "matched"; count: number; exampleDate: string; exampleValue: number; matches: CheckMatch[] }
  | { kind: "none" }
  | { kind: "error"; message: string };

export interface Reminder {
  id: string;
  title: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** Сколько дней вперёд смотрим (1..16). */
  days: number;
  condition: ReminderCondition;
  /** min — ночная/утренняя температура, max — дневная. */
  metric: TemperatureMetric;
  active: boolean;
  triggered: boolean;
  triggeredAt?: string;
  lastCheckedAt?: string;
  lastResult?: CheckOutcome;
  createdAt: string;
}

export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
}

export interface DayForecast {
  date: string;
  tmin: number | null;
  tmax: number | null;
  weatherCode?: number | null;
  precipProbability?: number | null;
  precipSum?: number | null;
  windSpeedMax?: number | null;
  windGustsMax?: number | null;
  windDirection?: number | null;
  humidityMean?: number | null;
  uvIndexMax?: number | null;
  sunrise?: string | null;
  sunset?: string | null;
  apparentMin?: number | null;
  apparentMax?: number | null;
}

export interface HourlyForecast {
  time: string;
  temperature: number | null;
  apparent: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  humidity: number | null;
  isDay: boolean;
}

export interface CurrentWeather {
  time: string;
  temperature: number | null;
  apparent: number | null;
  humidity: number | null;
  precipitation: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
  isDay: boolean;
}

export interface ForecastBundle {
  timezone: string;
  current: CurrentWeather | null;
  days: DayForecast[];
  hourly: HourlyForecast[];
}

export type WeatherIconKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder"
  | "unknown";

export interface CheckMatch {
  date: string;
  value: number;
}

export interface CheckResult {
  matched: boolean;
  matches: CheckMatch[];
  forecast: DayForecast[];
}

export interface CreateReminderInput {
  title: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  days: number;
  condition: ReminderCondition;
  metric: TemperatureMetric;
}

export interface WeatherApi {
  geocode(query: string): Promise<GeocodeResult[]>;
  forecast(
    latitude: number,
    longitude: number,
    days: number,
  ): Promise<ForecastBundle>;
}
