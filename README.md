# Weather Reminders

Десктопное приложение (Electron + React), которое напоминает о температуре по прогнозу погоды [Open-Meteo](https://open-meteo.com) — без API-ключей.

## Возможности

- Напоминание срабатывает, если в ближайшие 1–16 дней по прогнозу температура:
  - **ниже** порога (минимальная/максимальная),
  - **выше** порога,
  - либо попадает в **диапазон**.
- Поиск города через геокодер Open-Meteo с превью прогноза перед созданием.
- Десктоп-уведомление при срабатывании (один раз; кнопка «Снова» перевзводит).
- Автопроверка раз в 45 минут + вручную кнопкой «Проверить сейчас».
- Напоминания хранятся в `~/.config/Electron/weather-reminders/reminders.json` (путь зависит от userData Electron).

## Запуск

```bash
npm install
npm start        # Vite dev-сервер + Electron
```

Сборка production:

```bash
npm run build    # dist/ (UI) + dist-electron/ (main)
npm test         # юнит-тесты логики срабатываний
```

После `npm run build` Electron можно запустить без dev-сервера: `npx electron .`

## Структура

- `electron/main.ts` — окно, фоновая проверка, уведомления, IPC
- `electron/weather.ts` — клиент Open-Meteo (forecast + geocoding)
- `electron/checker.ts` — логика срабатывания условий
- `electron/store.ts` — хранение напоминаний
- `src/` — React-интерфейс
