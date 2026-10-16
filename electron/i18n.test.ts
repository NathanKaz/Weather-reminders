import { test } from "node:test";
import assert from "node:assert/strict";
import { dictionaries, t } from "./i18n";

test("словари ru и en содержат одинаковый набор ключей", () => {
  const ruKeys = Object.keys(dictionaries.ru).sort();
  const enKeys = Object.keys(dictionaries.en).sort();
  assert.deepEqual(enKeys, ruKeys);
});

test("нет пустых переводов", () => {
  for (const lang of ["ru", "en"] as const) {
    for (const [key, value] of Object.entries(dictionaries[lang])) {
      assert.ok(value.trim().length > 0, `пустой перевод ${lang}:${key}`);
    }
  }
});

test("t подставляет параметры и не падает на отсутствующих", () => {
  assert.equal(
    t("ru", "status.count", { n: 3 }),
    "Напоминаний: 3",
  );
  assert.equal(
    t("en", "status.count", { n: 3 }),
    "Reminders: 3",
  );
  assert.equal(
    t("ru", "status.count"),
    "Напоминаний: {n}",
  );
});
