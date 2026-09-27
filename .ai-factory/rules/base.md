# Базовые правила воркспейса

> Стартовые конвенции, заданные под выбранный стек (кодовой базы ещё нет — файл
> будет уточняться по мере появления проектов через /aif-rules).

## Отступы и форматирование

- Отступы: **табы шириной 2** во всех языках (PHP, JS, Vue, CSS, PostCSS, Rust, WGSL); JSON/YAML — 2 пробела (синтаксис JSON не допускает сырых табов в строках)
- Источник правды — `.editorconfig`; в VS Code `editor.detectIndentation: false` (отступы не «угадываются»)
- Форматирование при сохранении: Prettier (JS/Vue/CSS/HTML/JSON), php-cs-fixer/Pint (PHP), blade-formatter (Blade), rustfmt (Rust)

## Машинный уровень конфигурации (global-first)

- Редакторское поведение — в **машинных user settings** Code OSS
  (`~/.config/Code - OSS/User/settings.json`), НЕ в `.vscode/` проектов:
  отступы, формат-on-save, форматтеры per-lang, `prettier.*`,
  `source.fixAll.eslint`, подсказки, файловая гигиена, excludes,
  `files.associations`
- Анти-дрейф: после изменения глобальных ключей — `tools/machine/export-user-settings.sh`
  (снимок `tools/machine/Code-OSS-User-settings.jsonc` — источник для переноса)
- В проект — только незаменимые языковые файлы: JS — `jsconfig.json` +
  `src/vite-env.d.ts` (+ `@webgpu/types` для WebGPU), `eslint.config.js`
  (flat config глобальным не бывает), `.editorconfig` (editorconfig не имеет
  fallback вне `$HOME`); `.prettierrc`/`.php-cs-fixer.php` — только для CLI/CI
- Новые JS-корни — генератором `tools/new-js-project.sh <каталог> [--webgpu]`
  (CI-готовы: vitest-каркас + workflow), не копированием конфигов руками

## Конвенции именования

- **PHP / Laravel:** PSR-12 — классы `PascalCase`, методы/переменные `camelCase`,
  таблицы БД и конфиги Laravel `snake_case` (мн. число для таблиц)
- **Vue:** файлы SFC — `PascalCase` (`AppHeader.vue`), composables — `useXxx.js`,
  внутри скрипта — `camelCase`
- **JavaScript:** переменные/функции `camelCase`, модули-классы `PascalCase`
- **CSS/PostCSS:** классы — `kebab-case` (или методология БЭМ в рамках проекта)
- **Rust:** функции/переменные/крейты `snake_case`, типы/трейты `PascalCase`,
  константы `SCREAMING_SNAKE_CASE`; имена модулей = имена файлов

## Структура модулей

- Веб-трек: стандартная структура Laravel (`app/`, `routes/`, `resources/js`,
  `resources/views`, `resources/css`) — не изобретать свою
- Vue-код: `resources/js/components`, `resources/js/composables`,
  `resources/js/pages`
- Rust-трек: отдельные cargo-проекты; общий код выделяется в workspace-члены
- Смешение треков (PHP-код внутри cargo-проекта и наоборот) запрещено

## Обработка ошибок

- Laravel: исключения + единый формат error-ответа (`code`, `message`,
  `request_id` — без stack trace наружу)
- Никаких пустых `catch`/`catch (e) {}`
- Rust: `Result` + `thiserror` для библиотечных ошибок; `unwrap`/`expect` —
  только в тестах и на этапе прототипа

## Поток управления

- Плоский, читаемый поток управления вместо глубокой вложенности: guard-клаузы,
  ранние `return`/`continue`, маленькие именованные хелперы. Краевые случаи —
  в начале функции, чтобы основной путь оставался видимым.

## Логирование

- Laravel: `Log::` facade / `logger()`; не логировать токены, пароли, PII
- Rust: крейт `tracing` (`info!`/`warn!`/`error!` + span'ы)
- Frontend: `console.*` только в dev-сборке; в проде не оставлять

## Тестирование

- Laravel: PHPUnit/Pest — тесты в `tests/Feature` и `tests/Unit`
- Vue/JS: Vitest для компонентов и composables
- Rust: `cargo test`; тесты рядом с кодом в `#[cfg(test)] mod tests`
