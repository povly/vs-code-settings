# Темы для Code OSS (Open VSX)

> Проверенный список цветовых тем, доступных на **Open VSX** (реестр Code OSS).
> Актуальность версий проверена по open-vsx.org API 27.09.2026.
> Текущая тема воркспейса: **Rosé Pine** (`mvllow.rose-pine`), закреплена в
> `.vscode/settings.json` → `workbench.colorTheme`.

## Механика: установка и переключение

1. Установить тему (на выбор):
   - CLI: `code-oss --install-extension <Extension ID>` (ID — из таблицы ниже);
   - UI: панель **Extensions** → поиск по имени.
2. Переключить: `Ctrl+K Ctrl+T` (Preferences: Color Theme) — превью по стрелкам,
   Enter — применить.
3. Закрепить для всего воркспейса: `"workbench.colorTheme": "<Имя темы>"` в
   `.vscode/settings.json` (сейчас — `"Rosé Pine"`). Убрать ключ — тема станет
   персональной (user-level), не воркспейсной.

**Политика воркспейса:** темы — косметика личного выбора, в базовый
`recommendations` (`extensions.json`) они НЕ входят (как секция «Опциональные»).
Разве что Rosé Pine — осознанное исключение: она дефолт воркспейса.

## Проверенный список (Open VSX)

| Тема | Extension ID | Версия¹ | Тип | Лицензия | Почему интересна |
|---|---|---|---|---|---|
| Catppuccin | `Catppuccin.catppuccin-vsc` | 3.19.0 | Latte (светлая) + Frappé/Macchiato/Mocha (тёмные) | MIT | Пастельная — ближайший «дух» Rosé Pine; 530k загрузок, активные релизы 2026 |
| Tokyo Night | `enkia.tokyo-night` | 1.1.2 | тёмная + Day (светлая) | MIT | Чистая контрастная, любима во фронтенд-сообществе |
| One Dark Pro | `zhuangtongfa.material-theme` | 3.20.2 | тёмная | MIT | Классика Atom; 856k загрузок — самая скачиваемая здесь |
| Dracula | `dracula-theme.theme-dracula` | 2.25.1 | тёмная | MIT | Целая экосистема: терминалы, shell-промпты, другие редакторы |
| Night Owl | `sdras.night-owl` | 2.1.1 | тёмная + Light Owl (светлая) | своя free | Контраст под ночную работу, внимание к читаемости |
| Ayu | `teabyii.ayu` | 1.1.12 | dark / light / mirage | MIT | Три режима под разное время дня |
| Noctis | `liviuschera.noctis` | 10.43.3 | 10+ вариаций (тёмные/светлые) | — | Баланс тёплых/холодных тонов, синтаксические акценты (italic/bold) |
| Gruvbox | `jdinhlife.gruvbox` | 1.29.1 | тёмная/светлая, medium/high contrast | MIT | Ретро-палитра, мягкая для глаз при долгих сессиях |
| Nord | `arcticicestudio.nord-visual-studio-code` | 0.19.0 | тёмная | MIT | Северная сине-серая гамма; ⚠ последний релиз 2022 — заморожена (не deprecated) |
| Kanagawa Flavors | `metaphore.kanagawa-vscode-color-theme` | 0.5.0 | Wave/Dragon (тёмные) + Lotus (светлая) | MIT | Порт легендарной Neovim-темы («Большая волна в Канагаве») |
| poimandres | `flvffy.poimandres` | 0.0.4 | тёмная minimal | MIT | Semantic-minimal: цвет = смысл (ошибки — красным, типы — приглушённо); ⚠ сторонний ре-паблиш — оригинал `pmndrs.pmndrs` есть только в MS Marketplace |

¹ Версия на момент проверки 27.09.2026; свежесть смотреть на странице темы:
`https://open-vsx.org/extension/<publisher>/<name>`.

## Кого в списке НЕТ (и почему)

| Тема | Причина исключения |
|---|---|
| Everforest (`sainnhe.everforest`) | На Open VSX помечена `deprecated: true` — автор снял с поддержки |
| Min Theme (`miguelsolorio.min-theme`) | 404 — опубликована только в MS Marketplace, Code OSS не может установить |
| pmndrs.pmndrs (оригинал poimandres) | MS-marketplace-only; ставится зеркало `flvffy.poimandres` (см. таблицу) |

## Top-5 к освоению рядом с Rosé Pine

Если нынешняя Rosé Pine зашла — эти с наибольшей вероятностью тоже понравятся
(та же «мягкая» школа):

1. **Catppuccin** — пастель той же температуры, 4 варианта насыщенности.
2. **Kanagawa Flavors** — спокойная японская палитра, Wave для вечера.
3. **Tokyo Night** — чуть контрастнее, отличный баланс синего.
4. **Ayu** — mirage как «полумрак» между dark и light.
5. **Gruvbox** — если хочется тепла и ретро вместо пастели.

## Симптом → фикс

| Симптом | Фикс |
|---|---|
| После установки тема «не применилась» | `Ctrl+K Ctrl+T` и выбрать вариант вручную (у мульти-тем список вариантов: Catppuccin Mocha и т.п.) |
| Хочу тему только себе, не всему воркспейсу | Убрать `"workbench.colorTheme"` из `.vscode/settings.json` — выбор уйдёт в user settings |
| Тема не находится в Extensions | Проверить ID по таблице выше; расширение может быть MS-marketplace-only (см. «Кого в списке НЕТ») |
| Слепну от яркой темы днём | Взять мульти-тему со светлым вариантом (Catppuccin Latte, Tokyo Night Day, Night Owl Light, Ayu light) и переключаться `Ctrl+K Ctrl+T` |

## См. также

- [docs/power-ups.md](power-ups.md) — обзор расширений-2026 с вердиктами Open VSX
- [README.md](../README.md) — стек и покрытие воркспейса
