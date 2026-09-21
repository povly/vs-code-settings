# Базовые правила воркспейса

> Стартовые конвенции, заданные под выбранный стек (кодовой базы ещё нет — файл
> будет уточняться по мере появления проектов через /aif-rules).

## Отступы и форматирование

- Отступы: **табы шириной 2** во всех языках (PHP, JS, Vue, CSS, PostCSS, Rust, WGSL); JSON/YAML — 2 пробела (синтаксис JSON не допускает сырых табов в строках)
- Источник правды — `.editorconfig`; в VS Code `editor.detectIndentation: false` (отступы не «угадываются»)
- Форматирование при сохранении: Prettier (JS/Vue/CSS/HTML/JSON), php-cs-fixer/Pint (PHP), blade-formatter (Blade), rustfmt (Rust)

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
