# Воркспейс веб-разработки и Rust (VS Code)

## Обзор

Воркспейс для разработки сайтов и Rust-графики в **VS Code**. Это не одно
приложение, а настроенная среда: полностью бесплатные расширения (без paywall),
стабильные табы шириной 2, форматирование, отладка и live templates
в стиле PhpStorm (`.vscode/*.code-snippets`).

Веб-трек: PHP/Laravel full-stack, Vue 3 + Vite, Alpine.js, WordPress, Bitrix.
Rust-трек: графическое приложение на winit + wgpu (WGSL-шейдеры), игры на Bevy.

## Ключевые направления

- Настройка VS Code: расширения, settings.json, launch.json, .editorconfig
- Live templates (сниппеты как в PhpStorm) для PHP/Blade/Vue/JS/HTML/CSS/Rust/WGSL
- Веб-сайты: Laravel (Blade + Vue через Vite), WordPress, Bitrix, Alpine.js
- Frontend: Vue 3 (Composition API, SFC), JavaScript, HTML5, CSS3, PostCSS
- Rust-графика: приложение на winit + wgpu, шейдеры WGSL
- Игры: Bevy (ECS-архитектура)
- Отладка: Xdebug (PHP), Chrome-дебаггер поверх Vite (JS), CodeLLDB (Rust)

## Технологический стек

- **Языки:** PHP 8.2+, JavaScript (ES2022+), Rust (stable), HTML5, CSS3, PostCSS, WGSL
- **Backend-фреймворк:** Laravel (актуальная версия)
- **Frontend-фреймворк:** Vue 3 (Composition API, однофайловые компоненты)
- **Сборщик:** Vite
- **База данных:** MySQL / MariaDB (по умолчанию)
- **ORM:** Eloquent
- **Rust-крейты:** winit, wgpu, bevy
- **IDE:** VS Code — только бесплатные расширения (phpantom как PHP LSP, официальные Laravel/Vue, rust-analyzer, CodeLLDB, Xdebug; css-modules-kit для типизации `*.module.css` → подсказки `$style`)
- **Отступы:** табы шириной 2 (editorconfig + settings.json; JSON/YAML — 2 пробела)

## Архитектурные заметки

- Два независимых трека разработки: веб (PHP/JS) и Rust — с раздельными
  инструментами и правилами запуска
- Конфигурация IDE централизована в `.vscode/` воркспейса (extensions.json,
  settings.json, launch.json, *.code-snippets) и переносится вместе с ним
- Никаких freemium-расширений: phpantom (Rust-LSP, MIT) вместо Intelephense/DEVSENSE
  (ранее phpactor — заменён 18.09.2026)
- Веб-платформы: Laravel (основная), WordPress, 1C-Bitrix; интерактив — Alpine.js
- Laravel-приложения создаются по мере необходимости через `composer create-project`
- Vue-фронтенд интегрируется в Laravel штатно: `@vitejs/plugin-vue` + `resources/js`
- Rust-проекты — отдельные cargo-проекты/воркспейсы (не смешиваются с веб-треком)
- Отладка PHP — Xdebug (только dev-окружение), JS — встроенный дебаггер VS Code
  поверх Vite dev-server, Rust — CodeLLDB

## Нефункциональные требования

- **Логирование:** Laravel — стандартный стек каналов; Rust — `tracing`
- **Обработка ошибок:** структурированные error-ответы API; в Rust — `Result` + `thiserror`, без `unwrap` в рабочем коде
- **Безопасность:** следовать глобальным security-правилам (whitelist полей API, никаких секретов в коде и конфигах, `.env` вне AI-контекста, Xdebug выключен в production)
- **Форматирование:** PHP — php-cs-fixer/Laravel Pint, JS/Vue/CSS/PostCSS — Prettier + ESLint, Blade — blade-formatter, Rust — `rustfmt`

## Архитектура

Подробные архитектурные правила — в [.ai-factory/ARCHITECTURE.md](.ai-factory/ARCHITECTURE.md).
**Паттерн:** воркспейс-центричная структура (слой IDE-конфигурации + слой AI-контекста + два изолированных трека: web и Rust).
