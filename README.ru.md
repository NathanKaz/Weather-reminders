# Weather Reminders

Русский · [English](README.md)

Десктопное приложение (Electron + React), которое напоминает о температуре по прогнозу погоды [Open-Meteo](https://open-meteo.com) — без API-ключей.

## Возможности

- Напоминание срабатывает, если в ближайшие 1–16 дней по прогнозу температура:
  - **ниже** порога (минимальная/максимальная),
  - **выше** порога,
  - либо попадает в **диапазон**.
- Поиск города через геокодер Open-Meteo с превью прогноза перед созданием.
- Десктоп-уведомление при срабатывании (один раз; кнопка «Снова» перевзводит).
- Ручная проверка кнопкой «Проверить сейчас» (всегда тянет свежий прогноз).
- Настройки (⚙ в шапке):
  - **Язык** интерфейса и уведомлений: русский / English (подсказки городов тоже локализуются);
  - **Сворачивание в трей** при закрытии окна (выход — через меню трея);
  - **Интервал проверки напоминаний** (1–1440 мин, по умолчанию 45);
  - **Интервал обновления прогноза** — TTL кэша прогноза (1–1440 мин, по умолчанию 60).
- Данные хранятся в `~/.config/Electron/weather-reminders/` (`reminders.json`, `settings.json`; путь зависит от userData Electron).

## Запуск

```bash
npm install
npm start        # Vite dev-сервер + Electron
```

Сборка production:

```bash
npm run build    # dist/ (UI) + dist-electron/ (main)
npm test         # юнит-тесты (логика условий, i18n, настройки)
npm run typecheck
```

После `npm run build` Electron можно запустить без dev-сервера: `npx electron .`

## Сборка пакетов (electron-builder)

```bash
npm run dist:linux   # release/*.deb и release/*.AppImage
npm run dist:win     # release/Weather Reminders-Setup-<version>.exe (NSIS)
npm run dist         # для текущей платформы
```

Windows-установщик собирается на Linux через Wine (`apt install wine`). Артефакты кладутся в `release/` (не коммитится).

## Структура

- `electron/main.ts` — окно, трей, фоновая проверка, уведомления, IPC
- `electron/settings.ts` — хранение и валидация настроек
- `electron/i18n.ts` — словари ru/en и локализованные помощники
- `electron/weather.ts` — клиент Open-Meteo (forecast + geocoding, кэш прогноза)
- `electron/checker.ts` — логика срабатывания условий
- `electron/store.ts` — хранение напоминаний
- `assets/tray.png` — иконка трея
- `build/icon.png` — иконка приложения (512×512, для пакетов)
- `src/` — React-интерфейс


