# AGENTS.md

> Карта воркспейса для AI-агентов и разработчиков. Обновляйте при существенных
> изменениях структуры. Подробности стека — в `.ai-factory/DESCRIPTION.md`.

## Обзор проекта

Воркспейс для веб-разработки (PHP/Laravel, Vue 3, Alpine.js, WordPress, Bitrix)
и Rust-графики (winit + wgpu, Bevy) с полностью бесплатной настройкой VS Code:
расширения без paywall, стабильные отступы 2 пробела, live templates в стиле
PhpStorm, отладка (Xdebug / Chrome поверх Vite / CodeLLDB).

## Технологический стек

- **Языки:** PHP 8.2+, JavaScript (ES2022+), Rust (stable), HTML5, CSS3, PostCSS, WGSL
- **Фреймворки:** Laravel (основной), Vue 3, Alpine.js; CMS: WordPress, 1C-Bitrix
- **Сборщик:** Vite
- **База данных:** MySQL / MariaDB (по умолчанию)
- **ORM:** Eloquent
- **Rust:** winit, wgpu, bevy

## Структура проекта

```
_var-www-_vscode/
├── .vscode/                    # сердце воркспейса: конфигурация VS Code
│   ├── extensions.json         #   рекомендуемые бесплатные расширения (+чёрный список freemium)
│   ├── settings.json           #   табы шириной 2 (insertSpaces: false), подсказки, форматирование
│   ├── launch.json             #   отладка: Xdebug (PHP), Chrome+Vite (JS), CodeLLDB (Rust)
│   └── *.code-snippets         #   live templates: php, blade, vue, javascript, html, css, rust, wgsl
├── .ai-factory/                # контекст AI Factory
│   ├── DESCRIPTION.md          #   описание воркспейса, стек, требования
│   ├── config.yaml             #   настройки AI Factory (язык ru, git отключён)
│   └── rules/                  #   конвенции (base.md: отступы, именование, ошибки)
├── .opencode/skills/           # скиллы OpenCode: aif* + vscode-dev-setup + winit-wgpu-bevy
├── .agents/skills/             # внешние скиллы: vue-best-practices, vite, rust-best-practices,
│                               #   bevy-ecs, analyse-with-phpstan, laravel-best-practices,
│                               #   alpine-js, wordpress-pro
├── .editorconfig               # табы шириной 2 для любых редакторов
├── .gitignore                  # исключения git: зависимости, AI-планы, chrome-профиль дебага
├── opencode.json               # Playwright MCP (браузерная проверка сайтов агентом)
├── tools/
│   ├── intellisense-check/     # автотест IntelliSense (@vscode/test-electron, npm test)
│   │                           #   кейсы 8/8b/8c: vue-css-jump из vendor/*.vsix
│   ├── machine/                # глобальный машинный сетап: install.sh (развёртывание
│   │                           #   одной командой), снимок user settings (анти-дрейф —
│   │                           #   export-user-settings.sh), php-cs-fixer — по README внутри
│   ├── install-extensions.sh   # CLI-установка всех рекомендаций extensions.json
│   ├── workspace-doctor.sh     # PASS/FAIL-диагностика веб-стека (phpantom/xdebug/fixer)
│   └── vscode-vue-css-jump/    # исходники povly.vscode-vue-css-jump (MIT):
│                               #   hover/Ctrl+Click по <style src>, $style-подсказки,
│                               #   props/emits-карточки по hover компонента (0.4.0:
│                               #   ts-подсветка, переходы к типам, превью типов);
│                               #   npm run package → dist/*.vsix → code-oss --install-extension --force
├── docs/
│   ├── live-templates-and-css.md # гайд: live templates, Emmet, PostCSS-миксины
│   ├── phpactor-indexer-phpcs-fix.md # фикс: падение индексатора phpactor на storage/, тост php-resolver/phpcs
│   └── vue-css-intellisense.md # гайд: подсказки CSS/$style/var(--)/пикер/Blade @include
└── README.md                   # инструкция по установке и настройке (PHPantom, Xdebug, отладка)
```

## Ключевые точки входа

| Файл | Назначение |
|---|---|
| `.vscode/extensions.json` | Установка всех рекомендуемых расширений (Extensions → Recommended → Install All) |
| `.vscode/settings.json` | Поведение редактора: отступы, подсказки, формат-при-сохранении |
| `.vscode/launch.json` | Конфигурации отладки (F5) для PHP/JS/Rust |
| `README.md` | Пошаговая настройка машины: PHPantom, Xdebug, Rust-тулчейн |
| `.ai-factory/DESCRIPTION.md` | Полное описание стека и требований воркспейса |

## Документация

| Документ | Путь | Описание |
|---|---|---|
| README | README.md | Быстрый старт и установка инструментов |
| Описание | .ai-factory/DESCRIPTION.md | Стек и нефункциональные требования |
| Архитектура | .ai-factory/ARCHITECTURE.md | Структура воркспейса и правила зависимостей |
| Live templates и CSS | docs/live-templates-and-css.md | Гайд: сниппеты в стиле PhpStorm, Emmet, PostCSS-миксины |
| Фикс phpactor/phpcs | docs/phpactor-indexer-phpcs-fix.md | Диагностика и фикс: indexer + storage/, exit-коды PHPCS 4.x, шаблон `.phpactor.json` для Laravel-проектов |
| IntelliSense CSS/Vue/Laravel | docs/vue-css-intellisense.md | Матрица «симптом → фикс»: подсказки CSS, `$style` (inline + внешние `*.module.css` через css-modules-kit; member-list также от vue-css-jump ≥ 0.1.2), hover/Ctrl+Click по `<style src>`, карточки props/emits компонентов (vue-css-jump ≥ 0.4.0 — с ts-подсветкой и переходами к типам), «is not a module», `var(--…)`, пикер, отступы, Blade `@include`/Inertia `$page`; автотест tools/intellisense-check |
| PHPantom + WordPress | docs/phpantom-wordpress.md | Паттерн полного IntelliSense для WP-инсталлов: открытие от корня WP, `.ignore` для vendor темы, editor-стабы (Acorn/WP-CLI), конфиги phpantom, регресс-чеки analyze; политика LSP-бинарников (расширение Code OSS → системный пакет) |
| Rust-навигация (rust-analyzer) | docs/rust-navigation-fix.md | Фикс навигации для вложенных крейтов: `[workspace] members` в корневом Cargo.toml (glob `"*"` неприменим — cargo требует манифест от каждого совпавшего каталога), механика discovery rust-analyzer (корневой манифест / 1 уровень подкаталогов), linkedProjects-фолбэк, глобальный уровень (машинные расширения, `[rust]`-форматтер), чек-лист проверки |
| Rust-сеньор-сетап | docs/rust-senior-setup.md | Всё глобально: user-settings Code OSS (clippy на сохранении, ленз, табы ×2 через rustfmt.extraArgs), алиасы `~/.cargo/config.toml` (c/t/cl/f/fc), `~/.justfile` (`just -g`), bacon без конфига, `tools/rust-doctor.sh` (PASS/FAIL-диагностика), рецепт «новый проект за 30 секунд» |
| Чистые Problems + форматирование | docs/clean-problems-formatting.md | Политика «анализ — только свой код»: исключения search/watcher/diagnostics/telemetry (vendor, node_modules, ядра Bitrix/WP), `php.validate.enable: false`, глобальные path-ignore phpantom; матрица форматтеров «один на язык» (Ctrl+Shift+I ≡ Ctrl+S), табы ×2: машинный `~/.config/vscode-php-cs-fixer/` + проектный `.php-cs-fixer.php` (Pint табы не умеет), Rector-конвейер; почему не Intelephense/PHP Tools |
| Productivity Power-Ups | docs/power-ups.md | Расширения-2026 с вердиктами Open VSX API (REST Client, Vitest explorer, Git Graph, Bookmarks, Rainbow CSV, ShellCheck, markdownlint, Mermaid, npm Intellisense, DotENV), задачи tasks.json (интелли-чек/rust-doctor/JSONC), keybindings Alt+R/A/M/L для phpantom-бонусов, live templates invk/mig12/useTplRef/useid |

## AI-контекст файлы

| Файл | Назначение |
|---|---|
| AGENTS.md | Эта карта проекта |
| .ai-factory/DESCRIPTION.md | Спецификация воркспейса |
| .ai-factory/ARCHITECTURE.md | Архитектурные правила |
| .ai-factory/rules/base.md | Базовые конвенции кода (2 пробела, именование, ошибки) |

## Правила для агентов

- Анонимизация (обязательно): никаких реальных названий тем/проектов/клиентов и их доменов в именах файлов, содержимом, коммит-сообщениях и AI-артефактах — только плейсхолдеры `<тема>`, `<wp-инсталл>`, `<проект>`, `[CLIENT_NAME]`; пути инсталлов — через env (напр. `THEME_DIR`), не хардкодом (см. `.ai-factory/RULES.md`)
- Отступы: табы шириной 2 в любом генерируемом коде (в JSON/YAML — 2 пробела); символы пробелов не рендерятся (`renderWhitespace: "none"`)
- PHP-стиль — php-cs-fixer: проектный `.php-cs-fixer.php` в корне (`setIndent("\t")` + PSR12 + `indentation_type`), CLI/CI — `php-cs-fixer fix [--dry-run]`, dev-зависимость `friendsofphp/php-cs-fixer`. Laravel Pint НЕ использовать — не умеет табы (`indentation_type` берёт отступ из `Config->getIndent()`, который Pint не экспонирует). Глобальный машинный конфиг + снимок user settings — `tools/machine/`
- НИКОГДА не ассоциировать `.pcss`/`.postcss` с языком `postcss` — он глушит CSS IntelliSense (только `scss`; см. docs/vue-css-intellisense.md)
- Внешние CSS-модули Vue (`<style src="./x.module.css" module>`): имя файла строго `*.module.css`; типизация `$style` — расширение `mizdra.css-modules-kit-vscode` + `tsconfig.json` (`vueCompilerOptions.resolveStyleImports: true`, `cmkOptions.enabled: true`, `include` покрывает `.css`; см. docs/vue-css-intellisense.md)
- Расширения VS Code: только полностью бесплатные; freemium (Intelephense, DEVSENSE, GitLens) не предлагать
- Декомпозиция shell-команд: не объединять зависимые команды в одну. Неправильно: `git checkout main && git pull`. Правильно: сначала `git checkout main`, затем `git pull origin main` (git в воркспейсе сейчас отключён — правило на будущее)
- Изменения конфигов `.vscode/` — только через точечные правки, с сохранением JSONC-комментариев
- Новые live templates — в существующие `*.code-snippets` по языку, отступ в body — табы (`\t`), литеральный `$` в PHP — `\$`
