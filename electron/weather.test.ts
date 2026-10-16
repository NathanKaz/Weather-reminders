import test from "node:test";
import assert from "node:assert/strict";
import { mapCurrent, mapDaily, mapForecastResponse, mapHourly } from "./weather";

test("mapCurrent разбирает текущие данные и приводит is_day к boolean", () => {
  const current = mapCurrent({
    time: "2026-06-01T12:00",
    temperature_2m: 21.4,
    apparent_temperature: 20.1,
    relative_humidity_2m: 55,
    precipitation: 0,
    weather_code: 2,
    wind_speed_10m: 3.2,
    wind_direction_10m: 180,
    pressure_msl: 1013.2,
    is_day: 1,
  });
  assert.ok(current);
  assert.equal(current.isDay, true);
  assert.equal(current.temperature, 21.4);
  assert.equal(current.weatherCode, 2);
  assert.equal(current.pressure, 1013.2);
});

test("mapCurrent возвращает null без времени", () => {
  assert.equal(mapCurrent(undefined), null);
  assert.equal(mapCurrent({ temperature_2m: 5 }), null);
});

test("mapDaily пропускает null и берёт нужные поля по индексам", () => {
  const days = mapDaily({
    time: ["2026-06-01", "2026-06-02"],
    temperature_2m_min: [5, null],
    temperature_2m_max: [15, 18],
    weather_code: [0, 61],
    precipitation_probability_max: [10, 80],
    precipitation_sum: [0, 4.2],
    wind_speed_10m_max: [3, 7],
    wind_gusts_10m_max: [8, 14],
    wind_direction_10m_dominant: [90, 270],
    uv_index_max: [6, 1],
    sunrise: ["2026-06-01T04:30", null],
    sunset: ["2026-06-01T20:15", null],
    apparent_temperature_min: [3, null],
    apparent_temperature_max: [13, 16],
  });
  assert.equal(days.length, 2);
  assert.equal(days[0].tmin, 5);
  assert.equal(days[0].weatherCode, 0);
  assert.equal(days[0].sunrise, "2026-06-01T04:30");
  assert.equal(days[1].tmin, null);
  assert.equal(days[1].precipSum, 4.2);
  assert.equal(days[1].sunset, null);
});

test("mapDaily возвращает пусто без массива времени", () => {
  assert.deepEqual(mapDaily(undefined), []);
  assert.deepEqual(mapDaily({ time: undefined }), []);
});

test("mapHourly ограничивает количество часов", () => {
  const time = Array.from({ length: 60 }, (_, i) => `2026-06-01T${String(i % 24).padStart(2, "0")}:00`);
  const hourly = mapHourly(
    {
      time,
      temperature_2m: time.map((_, i) => i),
      is_day: time.map(() => 0),
    },
    48,
  );
  assert.equal(hourly.length, 48);
  assert.equal(hourly[0].temperature, 0);
  assert.equal(hourly[0].isDay, false);
});

test("mapForecastResponse собирает bundle с timezone по умолчанию", () => {
  const bundle = mapForecastResponse({
    timezone: "Europe/Moscow",
    current: { time: "2026-06-01T12:00", temperature_2m: 10 },
    daily: { time: ["2026-06-01"], temperature_2m_min: [1], temperature_2m_max: [9] },
    hourly: { time: ["2026-06-01T12:00"], temperature_2m: [10] },
  });
  assert.equal(bundle.timezone, "Europe/Moscow");
  assert.equal(bundle.days.length, 1);
  assert.equal(bundle.hourly.length, 1);
  assert.ok(bundle.current);
});

test("mapForecastResponse подставляет timezone auto при отсутствии", () => {
  const bundle = mapForecastResponse({ timezone: "" });
  assert.equal(bundle.timezone, "auto");
  assert.deepEqual(bundle.days, []);
  assert.deepEqual(bundle.hourly, []);
  assert.equal(bundle.current, null);
});
