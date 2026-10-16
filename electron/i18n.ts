import type {
  CheckOutcome,
  Language,
  ReminderCondition,
  TemperatureMetric,
} from "./types";

const ru = {
  "app.subtitle": "Напоминания о температуре по прогнозу Open-Meteo",
  "app.settings": "Настройки",

  "status.loading": "Загрузка…",
  "status.apiUnavailable":
    "Хост API недоступен — запускайте через Electron (npm start)",
  "status.noReminders": "Напоминаний пока нет",
  "status.count": "Напоминаний: {n}",
  "status.checking": "Проверяем прогноз…",
  "status.triggered": "Сработало напоминаний: {n}",
  "status.checkDone": "Проверка завершена: срабатываний нет",
  "status.checkError": "Ошибка проверки: {message}",
  "status.created": "Напоминание создано",
  "status.settingsSaved": "Настройки сохранены",
  "status.settingsError": "Не удалось сохранить настройки: {message}",

  "btn.checking": "Проверка…",
  "btn.checkNow": "Проверить сейчас",
  "btn.close": "Закрыть",
  "btn.addReminder": "+ Напоминание",

  "settings.title": "Настройки",
  "settings.language": "Язык",
  "settings.languageRu": "Русский",
  "settings.languageEn": "English",
  "settings.closeToTray": "Сворачивать в трей при закрытии",

  "settings.forecastTtl": "Интервал обновления прогноза (мин)",
  "settings.hint": "Диапазон: 1–1440 минут. Изменения применяются сразу.",

  "form.title": "Название",
  "form.titlePlaceholder": "Например: заморозки на даче",
  "form.city": "Город",
  "form.cityPlaceholder": "Начните вводить: Москва, Berlin…",
  "form.searching": "Поиск…",
  "form.notFound": "Ничего не найдено",
  "form.days": "Горизонт (дней, 1–16)",
  "form.condition": "Условие",
  "form.conditionBelow": "Температура ниже порога",
  "form.conditionAbove": "Температура выше порога",
  "form.conditionRange": "Температура в диапазоне",
  "form.from": "От, °C",
  "form.to": "До, °C",
  "form.threshold": "Порог, °C",
  "form.metric": "Как считать температуру",
  "form.metricMin": "Минимальная (ночью/утром)",
  "form.metricMax": "Максимальная (днём)",
  "form.preview": "Прогноз на {days} дн. ({condition}):",
  "form.create": "Создать напоминание",
  "form.saving": "Сохранение…",
  "form.errTitle": "Укажите название напоминания",
  "form.errCity": "Выберите город из выпадающего списка",
  "form.errCondition": "Проверьте значения температуры (для диапазона: от < до)",
  "form.errSearch": "Ошибка поиска: {message}",
  "form.errForecast": "Прогноз недоступен: {message}",
  "form.errCreate": "Не удалось создать: {message}",

  "cond.below": "ниже {value}°C",
  "cond.above": "выше {value}°C",
  "cond.range": "от {min} до {max}°C",
  "cond.short.below": "< {value}°C",
  "cond.short.above": "> {value}°C",
  "cond.short.range": "{min}…{max}°C",

  "metric.nominalMin": "минимальная",
  "metric.nominalMax": "максимальная",
  "metric.shortMin": "мин.",
  "metric.shortMax": "макс.",

  "list.empty":
    "Пока нет напоминаний. Нажмите «+ Напоминание», чтобы создать первое.",
  "badge.active": "активно",
  "badge.off": "выключено",
  "badge.fired": "сработало",
  "list.firedAt": "Сработало {time}",
  "list.checkedAt": "Проверено {time}",
  "list.days": "{n} дн.",
  "list.btnRearm": "Снова",
  "list.btnToggleOff": "Выкл",
  "list.btnToggleOn": "Вкл",
  "list.btnDelete": "Удалить",
  "list.statusRearmed": "Напоминание переведено в активные",
  "list.statusToggled": "Статус обновлён",
  "list.statusDeleted": "Напоминание удалено",
  "list.error": "Ошибка: {message}",

  "outcome.none": "нет совпадений в прогнозе",
  "outcome.error": "ошибка: {message}",
  "outcome.matched": "{count} дн.; напр. {date}: {value}°C",

  "notify.body": "Город {city}: {metric} температура {condition}.\nСовпадений: {matches}",
  "notify.matchesJoin": ", ",

  "tray.tooltip": "Weather Reminders",
  "tray.open": "Открыть",
  "tray.checkNow": "Проверить сейчас",
  "tray.quit": "Выход",
} as const;

const en: Record<keyof typeof ru, string> = {
  "app.subtitle": "Temperature reminders based on the Open-Meteo forecast",
  "app.settings": "Settings",

  "status.loading": "Loading…",
  "status.apiUnavailable":
    "Host API is unavailable — launch via Electron (npm start)",
  "status.noReminders": "No reminders yet",
  "status.count": "Reminders: {n}",
  "status.checking": "Checking the forecast…",
  "status.triggered": "Reminders triggered: {n}",
  "status.checkDone": "Check complete: nothing triggered",
  "status.checkError": "Check failed: {message}",
  "status.created": "Reminder created",
  "status.settingsSaved": "Settings saved",
  "status.settingsError": "Could not save settings: {message}",

  "btn.checking": "Checking…",
  "btn.checkNow": "Check now",
  "btn.close": "Close",
  "btn.addReminder": "+ Reminder",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageRu": "Русский",
  "settings.languageEn": "English",
  "settings.closeToTray": "Minimize to tray on close",

  "settings.forecastTtl": "Forecast refresh interval (min)",
  "settings.hint": "Range: 1–1440 minutes. Changes apply immediately.",

  "form.title": "Title",
  "form.titlePlaceholder": "e.g. frost at the dacha",
  "form.city": "City",
  "form.cityPlaceholder": "Start typing: Moscow, Berlin…",
  "form.searching": "Searching…",
  "form.notFound": "Nothing found",
  "form.days": "Horizon (days, 1–16)",
  "form.condition": "Condition",
  "form.conditionBelow": "Temperature below threshold",
  "form.conditionAbove": "Temperature above threshold",
  "form.conditionRange": "Temperature within range",
  "form.from": "From, °C",
  "form.to": "To, °C",
  "form.threshold": "Threshold, °C",
  "form.metric": "Which temperature to use",
  "form.metricMin": "Minimum (night/morning)",
  "form.metricMax": "Maximum (daytime)",
  "form.preview": "Forecast for {days} days ({condition}):",
  "form.create": "Create reminder",
  "form.saving": "Saving…",
  "form.errTitle": "Enter a reminder title",
  "form.errCity": "Pick a city from the dropdown",
  "form.errCondition": "Check the temperature values (for a range: from < to)",
  "form.errSearch": "Search failed: {message}",
  "form.errForecast": "Forecast unavailable: {message}",
  "form.errCreate": "Could not create: {message}",

  "cond.below": "below {value}°C",
  "cond.above": "above {value}°C",
  "cond.range": "between {min} and {max}°C",
  "cond.short.below": "< {value}°C",
  "cond.short.above": "> {value}°C",
  "cond.short.range": "{min}…{max}°C",

  "metric.nominalMin": "minimum",
  "metric.nominalMax": "maximum",
  "metric.shortMin": "min",
  "metric.shortMax": "max",

  "list.empty": "No reminders yet. Click “+ Reminder” to create the first one.",
  "badge.active": "active",
  "badge.off": "off",
  "badge.fired": "fired",
  "list.firedAt": "Triggered {time}",
  "list.checkedAt": "Checked {time}",
  "list.days": "{n} d",
  "list.btnRearm": "Rearm",
  "list.btnToggleOff": "Disable",
  "list.btnToggleOn": "Enable",
  "list.btnDelete": "Delete",
  "list.statusRearmed": "Reminder re-armed",
  "list.statusToggled": "Status updated",
  "list.statusDeleted": "Reminder deleted",
  "list.error": "Error: {message}",

  "outcome.none": "no matches in the forecast",
  "outcome.error": "error: {message}",
  "outcome.matched": "{count} day(s); e.g. {date}: {value}°C",

  "notify.body": "{city}: {metric} temperature {condition}.\nMatches: {matches}",
  "notify.matchesJoin": ", ",

  "tray.tooltip": "Weather Reminders",
  "tray.open": "Open",
  "tray.checkNow": "Check now",
  "tray.quit": "Quit",
};

export type TranslationKey = keyof typeof ru;

const messages: Record<Language, Record<TranslationKey, string>> = { ru, en };

export const dictionaries = messages;

export type TransParams = Record<string, string | number>;

export function t(
  lang: Language,
  key: TranslationKey,
  params?: TransParams,
): string {
  const template = messages[lang]?.[key] ?? messages.ru[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  );
}

const locales: Record<Language, string> = { ru: "ru-RU", en: "en-US" };

export function describeCondition(
  lang: Language,
  condition: ReminderCondition,
): string {
  switch (condition.kind) {
    case "below":
      return t(lang, "cond.below", { value: condition.value });
    case "above":
      return t(lang, "cond.above", { value: condition.value });
    case "range":
      return t(lang, "cond.range", {
        min: condition.min,
        max: condition.max,
      });
  }
}

export function describeConditionShort(
  lang: Language,
  condition: ReminderCondition,
): string {
  switch (condition.kind) {
    case "below":
      return t(lang, "cond.short.below", { value: condition.value });
    case "above":
      return t(lang, "cond.short.above", { value: condition.value });
    case "range":
      return t(lang, "cond.short.range", {
        min: condition.min,
        max: condition.max,
      });
  }
}

export function metricNominal(lang: Language, metric: TemperatureMetric): string {
  return metric === "tmin"
    ? t(lang, "metric.nominalMin")
    : t(lang, "metric.nominalMax");
}

export function metricShort(lang: Language, metric: TemperatureMetric): string {
  return metric === "tmin"
    ? t(lang, "metric.shortMin")
    : t(lang, "metric.shortMax");
}

export function describeOutcome(lang: Language, outcome: CheckOutcome): string {
  switch (outcome.kind) {
    case "none":
      return t(lang, "outcome.none");
    case "error":
      return t(lang, "outcome.error", { message: outcome.message });
    case "matched":
      return t(lang, "outcome.matched", {
        count: outcome.count,
        date: outcome.exampleDate,
        value: outcome.exampleValue,
      });
  }
}

export function formatDateTime(lang: Language, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locales[lang], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(lang: Language, iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locales[lang], {
    day: "numeric",
    month: "short",
  });
}
