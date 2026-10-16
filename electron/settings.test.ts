import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  INTERVAL_MAX,
  INTERVAL_MIN,
  clampInterval,
  normalizeSettings,
} from "./settings";

test("clampInterval ограничивает диапазон и округляет", () => {
  assert.equal(clampInterval(0, 45), INTERVAL_MIN);
  assert.equal(clampInterval(99999, 45), INTERVAL_MAX);
  assert.equal(clampInterval(12.6, 45), 13);
  assert.equal(clampInterval("abc", 45), 45);
  assert.equal(clampInterval(undefined, 45), 45);
});

test("normalizeSettings подставляет значения по умолчанию", () => {
  assert.deepEqual(normalizeSettings({}), DEFAULT_SETTINGS);
});

test("normalizeSettings принимает валидные значения", () => {
  const s = normalizeSettings({
    language: "en",
    closeToTray: true,
    forecastTtlMinutes: 90,
  });
  assert.deepEqual(s, {
    language: "en",
    closeToTray: true,
    forecastTtlMinutes: 90,
  });
});

test("normalizeSettings отбрасывает невалидный язык и типы", () => {
  const s = normalizeSettings({
    language: "de",
    closeToTray: "yes",
    forecastTtlMinutes: 99999,
  });
  assert.equal(s.language, "ru");
  assert.equal(s.closeToTray, false);
  assert.equal(s.forecastTtlMinutes, INTERVAL_MAX);
});
