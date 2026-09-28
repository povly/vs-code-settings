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

```text
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
├── .github/workflows/ci.yml    # CI: intellisense-check (3 ОС) + vue-css-jump (submodule)
│                               #   + rust-intellisense-check (Linux) + shellcheck
│                               #   + JSONC-валидация
├── templates/                  # CI-шаблоны для Laravel-/WordPress-проектов
│                               #   (laravel-ci.yml, wordpress-ci.yml; гайд docs/github-ci.md)
├── opencode.json               # Playwright MCP (браузерная проверка сайтов агентом)
├── tools/
│   ├── intellisense-check/     # автотест IntelliSense (@vscode/test-electron, npm test)
│   │                           #   кейсы 8-15: vue-css-jump из vendor/*.vsix (старший semver);
│   │                           #   test:rust (R0–R3): rust-analyzer в модульном cargo-проекте
│   │                           #   (фикстура fixtures-rust)
│   ├── machine/                # глобальный машинный сетап: install.sh (развёртывание
│   │                           #   одной командой), снимок user settings (анти-дрейф —
│   │                           #   export-user-settings.sh), php-cs-fixer — по README внутри
│   ├── install-extensions.sh   # CLI-установка всех рекомендаций extensions.json
│   ├── workspace-doctor.sh     # PASS/FAIL-диагностика веб-стека (phpantom/xdebug/fixer)
│   ├── rust-doctor.sh          # PASS/FAIL-диагностика Rust-тулчейна
│   ├── new-js-project.sh       # генератор JS-проекта (CI-ready, --webgpu)
│   ├── validate-jsonc.php      # валидатор .vscode/*.json (задача «JSONC» + CI)
│   └── vscode-vue-css-jump/    # исходники povly.vscode-vue-css-jump (MIT):
│                               #   hover/Ctrl+Click по <style src>, $style-подсказки,
│                               #   props/emits-карточки, превью типов, hover по class-
│                               #   токену и базовому $style (0.5.0);
│                               #   npm run package → dist/*.vsix → code-oss --install-extension --force
├── docs/
│   ├── live-templates-and-css.md # гайд: live templates, Emmet, PostCSS-миксины
│   ├── phpactor-indexer-phpcs-fix.md # фикс: падение индексатора phpactor на storage/, тост php-resolver/phpcs
│   ├── vue-css-intellisense.md # гайд: подсказки CSS/$style/var(--)/пикер/Blade @include
│   ├── themes.md # гайд: темы Code OSS (Open VSX) — проверенный список, топ-5, закрепление colorTheme
│   └── … # остальные гайды — полная таблица в разделе «Документация» ниже
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
| IntelliSense CSS/Vue/Laravel | docs/vue-css-intellisense.md | Матрица «симптом → фикс»: подсказки CSS, `$style` (inline + внешние `*.module.css` через css-modules-kit; member-list также от vue-css-jump ≥ 0.1.2), hover/Ctrl+Click по `<style src>`, карточки props/emits компонентов (vue-css-jump ≥ 0.5.0 — с ts-подсветкой и переходами к типам), «is not a module», `var(--…)`, пикер, отступы, Blade `@include`/Inertia `$page`; автотест tools/intellisense-check |
| PHPantom + WordPress | docs/phpantom-wordpress.md | Паттерн полного IntelliSense для WP-инсталлов: открытие от корня WP, `.ignore` для vendor темы, editor-стабы (Acorn/WP-CLI), конфиги phpantom, регресс-чеки analyze; политика LSP-бинарников (расширение Code OSS → системный пакет) |
| Rust-навигация (rust-analyzer) | docs/rust-navigation-fix.md | Фикс навигации для вложенных крейтов: `[workspace] members` в корневом Cargo.toml (glob `"*"` неприменим — cargo требует манифест от каждого совпавшего каталога), механика discovery rust-analyzer (корневой манифест / 1 уровень подкаталогов), linkedProjects-фолбэк, глобальный уровень (машинные расширения, `[rust]`-форматтер), чек-лист проверки; смежный случай: модуль одного крейта через `mod.rs` (не `lib.rs` в подкаталоге), автотест `test:rust` (кейсы R0–R3) |
| Rust-сеньор-сетап | docs/rust-senior-setup.md | Всё глобально: user-settings Code OSS (clippy на сохранении, ленз, табы ×2 через rustfmt.extraArgs), алиасы `~/.cargo/config.toml` (c/t/cl/f/fc), `~/.justfile` (`just -g`), bacon без конфига, `tools/rust-doctor.sh` (PASS/FAIL-диагностика), рецепт «новый проект за 30 секунд» |
| Чистые Problems + форматирование | docs/clean-problems-formatting.md | Политика «анализ — только свой код»: исключения search/watcher/diagnostics/telemetry (vendor, node_modules, ядра Bitrix/WP), `php.validate.enable: false`, глобальные path-ignore phpantom; матрица форматтеров «один на язык» (Ctrl+Shift+I ≡ Ctrl+S), табы ×2: машинный `~/.config/vscode-php-cs-fixer/` + проектный `.php-cs-fixer.php` (Pint табы не умеет), Rector-конвейер; почему не Intelephense/PHP Tools |
| Productivity Power-Ups | docs/power-ups.md | Расширения-2026 с вердиктами Open VSX API (REST Client, Vitest explorer, Git Graph, Bookmarks, Rainbow CSV, ShellCheck, markdownlint, Mermaid, npm Intellisense, DotENV), задачи tasks.json (интелли-чек/rust-doctor/JSONC), keybindings Alt+R/A/M/L для phpantom-бонусов, live templates invk/mig12/useTplRef/useid |
| Темы для Code OSS | docs/themes.md | Проверенный список тем Open VSX (11: Catppuccin, Tokyo Night, Kanagawa Flavors, Ayu…), исключения (deprecated / MS-marketplace-only), top-5 рядом с Rosé Pine, установка (`code-oss --install-extension`), переключение Ctrl+K Ctrl+T, закрепление `workbench.colorTheme` |
| Отдельный JS-корень | docs/js-standalone-root.md | Паттерн «JS-проект вне воркспейса» (Vite vanilla): jsconfig (checkJs + strict:false для TS 7) + @webgpu/types (WebGPU во встроенном lib.dom отсутствует), vite-env.d.ts для import css, JSDoc-касты, Prettier табы ×2 (overrides для JSON), ESLint 9 flat, зеркалирование .vscode отдельного корня — рецепт «симптом → фикс» |
| GitHub CI | docs/github-ci.md | CI «всё везде»: JS-проекты (матрица ubuntu/windows/macos + контейнеры alpine/arch/fedora, vitest-каркас, генератор tools/new-js-project.sh — CI-ready по умолчанию), воркспейс (intellisense-check + shellcheck + JSONC), шаблоны templates/{laravel,wordpress}-ci.yml (тема + e2e: mysql + wp-cli + Playwright Chromium) |

## AI-контекст файлы

| Файл | Назначение |
|---|---|
| AGENTS.md | Эта карта проекта |
| .ai-factory/DESCRIPTION.md | Спецификация воркспейса |
| .ai-factory/ARCHITECTURE.md | Архитектурные правила |
| .ai-factory/rules/base.md | Базовые конвенции кода (2 пробела, именование, ошибки) |

## Правила для агентов

- Анонимизация (обязательно): никаких реальных названий тем/проектов/клиентов и их доменов в именах файлов, содержимом, коммит-сообщениях и AI-артефактах — только плейсхолдеры `<тема>`, `<wp-инсталл>`, `<проект>`, `[CLIENT_NAME]`; пути инсталлов — через env (напр. `THEME_DIR`), не хардкодом (см. `.ai-factory/RULES.md`)
- Отступы: табы шириной 2 в любом генерируемом коде (в JSON/YAML — 2 пробела; WGSL — 4 пробела: стиль фиксирован форматтером wgslfmt из wgsl-analyzer, редактор выровнен [wgsl]-блоком); символы пробелов не рендерятся (`renderWhitespace: "none"`)
- PHP-стиль — php-cs-fixer: проектный `.php-cs-fixer.php` в корне (`setIndent("\t")` + PSR12 + `indentation_type`), CLI/CI — `php-cs-fixer fix [--dry-run]`, dev-зависимость `friendsofphp/php-cs-fixer`. Laravel Pint НЕ использовать — не умеет табы (`indentation_type` берёт отступ из `Config->getIndent()`, который Pint не экспонирует). Глобальный машинный конфиг + снимок user settings — `tools/machine/`
- Конфигурация — global-first: редакторское поведение (отступы, формат-on-save, форматтеры, `prettier.*`, `fixAll.eslint`, подсказки, гигиена, ассоциации) — ТОЛЬКО в машинных user settings Code OSS (снимок `tools/machine/Code-OSS-User-settings.jsonc`, переэкспорт `tools/machine/export-user-settings.sh`), НЕ дублировать в `.vscode/` проектов. В проект — только незаменимое: `jsconfig.json` (+`src/vite-env.d.ts`, `@webgpu/types`), `eslint.config.js` (flat config глобальным не бывает), `.editorconfig`; `.prettierrc`/`.php-cs-fixer.php` — только для CLI/CI. Новые JS-корни — `tools/new-js-project.sh <каталог> [--webgpu]` (CI-ready), CI-паттерны — docs/github-ci.md
- Live-templates: правка — только в `.vscode/*.code-snippets` (источник правды; CI: JSONC-валидация + кейс 16 `tools/intellisense-check` по всем 8 языкам); на машину — `tools/machine/install.sh` (→ `~/.config/Code - OSS/User/snippets/`, действуют в любом окне), ручные правки user-копий запрещены (дрейф); Tab-разворот требует `editor.tabCompletion: "onlySnippets"` в машинных user settings; каждый сниппет несёт `"scope"` по языку файла (маппинг — docs/live-templates-and-css.md; регрессия утечки — кейс 16b)
- НИКОГДА не ассоциировать `.pcss`/`.postcss` с языком `postcss` — он глушит CSS IntelliSense (только `scss`; см. docs/vue-css-intellisense.md)
- Внешние CSS-модули Vue (`<style src="./x.module.css" module>`): имя файла строго `*.module.css`; типизация `$style` — расширение `mizdra.css-modules-kit-vscode` + `tsconfig.json` (`vueCompilerOptions.resolveStyleImports: true`, `cmkOptions.enabled: true`, `include` покрывает `.css`; см. docs/vue-css-intellisense.md)
- Расширения VS Code: только полностью бесплатные; freemium (Intelephense, DEVSENSE, GitLens) не предлагать
- Декомпозиция shell-команд: не объединять зависимые команды в одну. Неправильно: `git checkout main && git pull`. Правильно: сначала `git checkout main`, затем `git pull origin main` (git в воркспейсе сейчас отключён — правило на будущее)
- Изменения конфигов `.vscode/` — только через точечные правки, с сохранением JSONC-комментариев
- Новые live templates — в существующие `*.code-snippets` по языку, отступ в body — табы (`\t`), литеральный `$` в PHP — `\$`
