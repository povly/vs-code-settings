# Архитектура: воркспейс-центричная структура (два трека + слой конфигурации)

## Обзор

Этот воркспейс — не монолитное приложение, а настроенная среда разработки.
Архитектура фиксирует три зоны ответственности: **слой IDE-конфигурации**
(`.vscode/`, `.editorconfig`), **слой AI-контекста** (`.ai-factory/`, скиллы)
и **зону будущих проектов** с двумя изолированными треками — веб
(PHP/Laravel/Vue/Alpine/WP/Bitrix) и Rust (winit+wgpu/Bevy). Каждый будущий
сайт или Rust-приложение живёт в собственном каталоге со своей структурой,
а вся настройка редактора — общая и переносится вместе с воркспейсом.

## Обоснование решения

- **Тип проекта:** tooling-воркспейс настройки VS Code (код приложений появится позже)
- **Стек:** VS Code + PHP 8/Laravel + Vue 3/Vite/Alpine + WordPress/Bitrix + Rust/wgpu/Bevy
- **Ключевой фактор:** треки технологически независимы; конфигурация редактора
  должна работать для любого проекта воркспейса без дублирования

## Структура каталогов

```
_var-www-_vscode/
├── .vscode/                     # ── Слой IDE-конфигурации ──
│   ├── extensions.json          #    бесплатные расширения (рекомендации)
│   ├── settings.json            #    отступы 2, подсказки, форматирование
│   ├── launch.json              #    отладка: Xdebug / Chrome+Vite / CodeLLDB
│   └── *.code-snippets          #    live templates (8 языков)
├── .editorconfig                #    отступы для любых редакторов
│
├── .ai-factory/                 # ── Слой AI-контекста ──
│   ├── DESCRIPTION.md           #    спецификация воркспейса
│   ├── ARCHITECTURE.md          #    этот документ
│   ├── config.yaml              #    настройки AI Factory
│   └── rules/base.md            #    конвенции кода
├── .opencode/skills/            #    скиллы: aif*, vscode-dev-setup, winit-wgpu-bevy
├── .agents/skills/              #    внешние скиллы: vue, vite, rust, bevy, phpstan, laravel, alpine, wordpress
├── opencode.json                #    Playwright MCP
├── AGENTS.md                    #    карта проекта для агентов
├── README.md                    #    инструкция по настройке
│
├── (web-проекты)                # ── Зона будущих проектов ──
│   └── site-<имя>/              #    Laravel: app/, routes/, resources/{js,views,css},
│                                #    vendor/, package.json, vite.config.js
└── (rust-проекты)
    └── <имя>-app/               #    cargo: src/main.rs, src/lib.rs, Cargo.toml,
                                #    shaders/*.wgsl, target/
```

## Правила зависимостей

- ✅ `.vscode/*` применяется редактором ко **всем** файлам воркспейса (файловые ассоциации управляют сниппетами/подсветкой)
- ✅ Внутри Laravel-проекта: `resources/js` → собирается Vite → подключается в Blade через `@vite`
- ✅ Скиллы (`vscode-dev-setup`, `winit-wgpu-bevy`) читают конфиги — конфиги от скиллов не зависят
- ❌ Rust-код не зависит от web-треков и наоборот (общими остаются только конфиги редактора и AI-слой)
- ❌ Код проектов не изменяет `.vscode/` (точечные правки конфигов — только осознанно, агентом)
- ❌ Никаких абсолютных путей в настройках — только `${workspaceFolder}`

## Взаимодействие зон

- **IDE-слой → проекты:** применяется по расширениям файлов (`files.associations`:
  `*.blade.php` → blade, `*.pcss` → postcss, `*.wgsl` → wgsl)
- **AI-слой → агент:** `AGENTS.md` (карта) → `DESCRIPTION.md` (спецификация) →
  `ARCHITECTURE.md` (правила) → `rules/base.md` (конвенции)
- **Проект → дебаг:** `launch.json` запускает внешний процесс (`php artisan serve`,
  Vite dev-server, `cargo build`) и подключается к нему

## Ключевые принципы

1. **Единый источник конфигурации** — `.vscode/`; новая машина = открыть воркспейс → Install All recommended
2. **Только бесплатные расширения** — freemium-расширения запрещены (Intelephense/DEVSENSE/GitLens)
3. **Отступы — табы шириной 2** — `.editorconfig` + `editor.detectIndentation: false` (JSON/YAML — 2 пробела)
4. **Изоляция треков** — web и Rust не пересекаются на уровне кода и сборки
5. **Прогрессия архитектуры проектов:** когда появится реальный код сайта,
   запустить `/aif-architecture` внутри этого проекта — для малой команды и
   типового сайта рекомендуется слоистая (Laravel-стандарт) или Structured Modules;
   Rust-приложение следует штатной структуре cargo-проекта

## Примеры

### Будущий Laravel-проект (внутри `site-<имя>/`)

```
site-blog/
├── app/
│   ├── Http/Controllers/
│   ├── Models/
│   └── Services/
├── routes/web.php
├── resources/
│   ├── js/            # Vue-компоненты + Alpine-модули
│   ├── views/         # Blade
│   └── css/           # PostCSS
├── vite.config.js
└── package.json
```

### Будущий Rust-проект

```
gfx-app/
├── Cargo.toml
├── src/
│   ├── main.rs        # winit event loop
│   ├── renderer.rs    # wgpu-инициализация и пайплайн
│   └── shader.wgsl    # (или shaders/ для нескольких)
└── rustfmt.toml       # hard_tabs=true, tab_spaces=2
```

## Анти-паттерны

- ❌ Смешивать PHP-код и cargo-проект в одном каталоге
- ❌ Расширения с платными функциями (paywall на rename/format)
- ❌ Пробелы вместо табов в коде — конвенция воркспейса: табы шириной 2
- ❌ Хардкод путей машины в settings.json/launch.json
- ❌ Инлайнить WGSL-шейдеры строками в Rust вместо `.wgsl`-файлов
