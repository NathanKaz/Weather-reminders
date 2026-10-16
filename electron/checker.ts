import type {
  CheckMatch,
  CheckResult,
  DayForecast,
  ReminderCondition,
  TemperatureMetric,
} from "./types";

export function conditionMatches(
  condition: ReminderCondition,
  value: number,
): boolean {
  switch (condition.kind) {
    case "above":
      return value > condition.value;
    case "below":
      return value < condition.value;
    case "range":
      return value >= condition.min && value <= condition.max;
  }
}

export function describeCondition(condition: ReminderCondition): string {
  switch (condition.kind) {
    case "above":
      return `выше ${condition.value}°C`;
    case "below":
      return `ниже ${condition.value}°C`;
    case "range":
      return `от ${condition.min} до ${condition.max}°C`;
  }
}

export function evaluateForecast(
  forecast: DayForecast[],
  condition: ReminderCondition,
  metric: TemperatureMetric,
): CheckResult {
  const matches: CheckMatch[] = [];
  for (const day of forecast) {
    const value = metric === "tmin" ? day.tmin : day.tmax;
    if (value == null) continue;
    if (conditionMatches(condition, value)) {
      matches.push({ date: day.date, value });
    }
  }
  return { matched: matches.length > 0, matches, forecast };
}
