import { test } from "node:test";
import assert from "node:assert/strict";
import { conditionMatches, evaluateForecast } from "./checker";

test("below срабатывает строго меньше порога", () => {
  assert.equal(conditionMatches({ kind: "below", value: 0 }, -1), true);
  assert.equal(conditionMatches({ kind: "below", value: 0 }, 0), false);
  assert.equal(conditionMatches({ kind: "below", value: 0 }, 1), false);
});

test("above срабатывает строго больше порога", () => {
  assert.equal(conditionMatches({ kind: "above", value: 25 }, 26), true);
  assert.equal(conditionMatches({ kind: "above", value: 25 }, 25), false);
});

test("range включает границы", () => {
  const cond = { kind: "range", min: 18, max: 25 } as const;
  assert.equal(conditionMatches(cond, 18), true);
  assert.equal(conditionMatches(cond, 25), true);
  assert.equal(conditionMatches(cond, 17.9), false);
});

test("evaluateForecast выбирает нужную метрику и пропускает null", () => {
  const result = evaluateForecast(
    [
      { date: "2026-10-16", tmin: 5, tmax: 12 },
      { date: "2026-10-17", tmin: null, tmax: null },
      { date: "2026-10-18", tmin: -2, tmax: 8 },
    ],
    { kind: "below", value: 0 },
    "tmin",
  );
  assert.equal(result.matched, true);
  assert.deepEqual(result.matches, [{ date: "2026-10-18", value: -2 }]);
});

test("evaluateForecast: без совпадений matched=false", () => {
  const result = evaluateForecast(
    [{ date: "2026-10-16", tmin: 10, tmax: 18 }],
    { kind: "below", value: 0 },
    "tmin",
  );
  assert.equal(result.matched, false);
  assert.equal(result.matches.length, 0);
});
