# Weather Reminders

A desktop app (Electron + React) that reminds you about temperature based on the [Open-Meteo](https://open-meteo.com) weather forecast — no API keys required.

[Русская версия](README.ru.md) · English

## Features

- A reminder fires when the forecast temperature over the next 1–16 days is:
  - **below** a threshold (minimum/maximum),
  - **above** a threshold,
  - or falls within a **range**.
- City search via the Open-Meteo geocoder with a forecast preview before creating a reminder.
- Desktop notification when a reminder fires (once; the "Rearm" button re-enables it).
- Manual check with the "Check now" button (always fetches a fresh forecast).
- Settings (⚙ in the header):
  - **Language** of the UI and notifications: Russian / English (city suggestions are localized too);
  - **Minimize to tray** on window close (quit from the tray menu);
  - **Reminder check interval** (1–1440 min, default 45);
  - **Forecast refresh interval** — forecast cache TTL (1–1440 min, default 60).
- Data is stored in `~/.config/Electron/weather-reminders/` (`reminders.json`, `settings.json`; the exact path depends on Electron's userData).

## Running

```bash
npm install
npm start        # Vite dev server + Electron
```

Production build:

```bash
npm run build    # dist/ (UI) + dist-electron/ (main)
npm test         # unit tests (condition logic, i18n, settings)
npm run typecheck
```

After `npm run build` you can run Electron without the dev server: `npx electron .`

## Packaging (electron-builder)

```bash
npm run dist:linux   # release/*.deb and release/*.AppImage
npm run dist:win     # release/Weather Reminders-Setup-<version>.exe (NSIS)
npm run dist         # for the current platform
```

The Windows installer is built on Linux via Wine (`apt install wine`). Artifacts are placed in `release/` (not committed).

## Structure

- `electron/main.ts` — window, tray, background checks, notifications, IPC
- `electron/settings.ts` — settings storage and validation
- `electron/i18n.ts` — ru/en dictionaries and localization helpers
- `electron/weather.ts` — Open-Meteo client (forecast + geocoding, forecast cache)
- `electron/checker.ts` — condition matching logic
- `electron/store.ts` — reminders storage
- `assets/tray.png` — tray icon
- `build/icon.png` — application icon (512×512, for packages)
- `src/` — React UI
