# Каталог установленных расширений Code OSS

[← Как работает Code OSS](code-oss-internals.md) · [К README](../README.md)

> Снапшот на 06.10.2026: **50 установленных расширений** в
> `~/.vscode-oss/extensions/`. Версии — из имён каталогов установки, лицензии —
> из `package.json` каждого расширения (— = не указана в манифесте, точный
> статус — на странице Open VSX). Роли и принципы выбора — из
> `.vscode/extensions.json` (источник правды для базового набора). Как всё это
> устроено внутри — в [code-oss-internals.md](code-oss-internals.md).

## Механика: как читать каталог

- Каталог установки: `~/.vscode-oss/extensions/<publisher>.<name>-<version>`.
  Суффикс `-universal` — платформонезависимый VSIX; `-linux-x64` — бинарник под
  платформу (rust-analyzer, wgsl-analyzer, shellcheck, vscode-xml); без
  суффикса — VSIX, поставленный вручную (наши `povly.vscode-vue-css-jump`,
  CodeLLDB).
- Обновить снапшот: `code-oss --list-extensions --show-versions` либо
  `ls ~/.vscode-oss/extensions`. Сверка с рекомендациями: список
  `recommendations` в `.vscode/extensions.json` (35 позиций).
- Массовая установка базы — `tools/install-extensions.sh` (см.
  [README](../README.md)).

## База: рекомендации extensions.json (36, установлено 36)

### PHP / Laravel / WordPress / Bitrix (9)

| Расширение | Extension ID | Версия | Лицензия | Роль в воркспейсе |
|---|---|---|---|---|
| PHPantom | `phpantom.phpantom` | 0.6.1 | MIT | PHP LSP (Rust): типизация, Laravel, Blade — [phpantom-lsp.md](phpantom-lsp.md) |
| Mago | `michael4d45.mago-vscode` | 1.0.2 | MIT | Форматтер PHP mago: перенос строк (print-width), psr-12+табы — для проектов с composer-dev mago; подключается per-project, lint/analyze off глобально (LSP — только phpantom). Добавлен 06.10.2026 после отказа от Prettier+plugin-php (калечил файлы на prettier 3.9.x) |
| Laravel | `laravel.vscode-laravel` | 2.0.1 | — | Официальное: completions/links для `@include`, `view()`, `route()`, `config()`, env |
| Laravel Blade Snippets | `onecentlin.laravel-blade` | 1.38.0 | — | Подсветка и сниппеты Blade |
| Laravel Blade formatter | `shufo.vscode-blade-formatter` | 0.26.3 | MIT | Форматтер Blade (табы — `bladeFormatter.format.useTabs`) |
| PHP Debug | `xdebug.php-debug` | 1.40.2 | MIT | Отладка Xdebug (порт 9003, F5) |
| PHPUnit & Pest Test Explorer | `recca0120.vscode-phpunit` | 3.9.40 | MIT | Запуск тестов из редактора |
| Hooks IntelliSense for WordPress | `johnbillion.vscode-wordpress-hooks` | 1.5.0 | GPL-3.0-or-later | Хуки/экшены/фильтры WP |
| DotENV | `mikestead.dotenv` | 1.0.1 | MIT | Подсветка `.env` |

### Alpine.js / Vue / Vite / JS / CSS (9)

| Расширение | Extension ID | Версия | Лицензия | Роль в воркспейсе |
|---|---|---|---|---|
| Vue (Official) | `vue.volar` | 3.3.11 | — | Vue 3 SFC: язык, подсказки, `$style` inline |
| CSS Modules Kit | `mizdra.css-modules-kit-vscode` | 1.4.0 | MIT | Типизация `*.module.css` → подсказки `$style` — [vue-css-intellisense.md](vue-css-intellisense.md) |
| Alpine.js Tools | `connorontheweb.alpinejs-tools` | 1.9.3 | MIT | Alpine.js IntelliSense + подсветка |
| ESLint | `dbaeumer.vscode-eslint` | 3.0.34 | MIT | Диагностика + автофиксы (flat config) |
| Prettier — Code formatter | `esbenp.prettier-vscode` | 12.4.0 | MIT | Один форматтер на язык (табы ×2 — машинные user settings) |
| PostCSS Language Support | `csstools.postcss` | 1.0.8 | CC0-1.0 | Подсветка совр. CSS (⚠ язык `postcss` глушит IntelliSense — `.pcss`→`scss`) |
| CSS Variable Autocomplete | `vunguyentuan.vscode-css-variables` | 2.8.3 | — | `var(--…)` по всему проекту |
| npm Intellisense | `christian-kohler.npm-intellisense` | 1.4.5 | — | npm-модули в import-стейтментах |
| Vitest | `vitest.explorer` | 1.52.2 | MIT | Гуттер-раннер тестов, панель Testing |

### Rust / wgpu / WGSL (5)

| Расширение | Extension ID | Версия | Лицензия | Роль в воркспейсе |
|---|---|---|---|---|
| rust-analyzer | `rust-lang.rust-analyzer` | 0.3.3065 | MIT OR Apache-2.0 | LSP + rustfmt (табы ×2 через `rust-analyzer.rustfmt.extraArgs`); linux-x64 |
| CodeLLDB | `vadimcn.vscode-lldb` | 1.12.3 | MIT | Отладка Rust (F5, kind-only фильтр) |
| Even Better TOML | `tamasfe.even-better-toml` | 0.21.2 | — (LICENSE.md) | TOML: Cargo.toml, phpantom.toml + форматтер |
| crates | `serayuzgur.crates` | 0.6.7 | — (LICENSE) | Версии крейтов в Cargo.toml |
| wgsl-analyzer | `wgsl-analyzer.wgsl-analyzer` | 0.12.487 | MIT OR Apache-2.0 | WGSL LSP: completion/hover/inlay/диагностика naga; linux-x64 |

### Инструменты и данные (11)

| Расширение | Extension ID | Версия | Лицензия | Роль в воркспейсе |
|---|---|---|---|---|
| Error Lens | `usernamehw.errorlens` | 3.29.0 | MIT | Диагностика прямо в строке (шум vendor погашен path-ignore) |
| EditorConfig | `editorconfig.editorconfig` | 0.18.2 | MIT | Поддержка `.editorconfig` — стабильные отступы |
| Path Intellisense | `christian-kohler.path-intellisense` | 2.8.0 | — | Автодополнение путей |
| Todo Tree | `gruntfuggly.todo-tree` | 0.0.215 | MIT | Дерево TODO/FIXME (ripgrep — системный) |
| REST Client | `humao.rest-client` | 0.25.0 | MIT | `.http`-тесты API — Postman не нужен |
| Git Graph | `mhutchie.git-graph` | 1.30.0 | — (своя free) | Визуализация веток/коммитов — GitLens-free |
| Bookmarks | `alefragnani.bookmarks` | 14.1.1 | GPL-3.0 | Метки-строки — навигация по большим базам Bitrix/WP |
| Rainbow CSV | `mechatroner.rainbow-csv` | 3.24.1 | MIT | Подсветка колонок + RBQL-запросы |
| ShellCheck | `timonwong.shellcheck` | 0.42.0 | MIT | Линтинг bash (CI job «shellcheck»); linux-x64 |
| markdownlint | `davidanson.vscode-markdownlint` | 0.62.1 | MIT | Качество docs (конфиг `.markdownlint-cli2.jsonc`) |
| Markdown Preview Mermaid Support | `bierner.markdown-mermaid` | 1.32.1 | MIT | Mermaid-диаграммы в preview |

### Темы и иконки (2)

| Расширение | Extension ID | Версия | Лицензия | Роль в воркспейсе |
|---|---|---|---|---|
| Rosé Pine | `mvllow.rose-pine` | 2.15.2 | MIT | Дефолт `workbench.colorTheme` |
| Material Icon Theme | `pkief.material-icon-theme` | 5.38.1 | MIT | Дефолт `workbench.iconTheme` (закреплён в user settings) |

## Установленные сверх рекомендаций (14)

### Своё расширение (1)

| Расширение | Extension ID | Версия | Лицензия | Примечание |
|---|---|---|---|---|
| Vue CSS Jump | `povly.vscode-vue-css-jump` | 0.5.0 | MIT | Наше: hover/Ctrl+Click по `<style src>`, `$style`, карточки props/emits. Ставится из VSIX (`tools/vscode-vue-css-jump`, `npm run package`), в реестре не публикуется |

### Опционалы из комментариев extensions.json (6)

| Расширение | Extension ID | Версия | Лицензия | Примечание |
|---|---|---|---|---|
| CSS Peek | `pranaygp.vscode-css-peek` | 4.4.3 | MIT | Прыжок от класса в HTML к CSS-правилу |
| Import Cost | `wix.vscode-import-cost` | 3.3.0 | MIT | Размер JS-пакетов рядом с import (аудит 02.10.2026: MIT, опционал) |
| Better Comments | `aaron-bond.better-comments` | 3.0.2 | — (своя) | Цветные комментарии |
| Indent-Rainbow | `oderwat.indent-rainbow` | 8.3.1 | MIT | Цветная подсветка отступов |
| Color Highlight | `naumovs.color-highlight` | 2.8.0 | GPL-3.0 | Подсветка web-цветов (пикер — встроенный) |
| Kanagawa Flavors | `metaphore.kanagawa-vscode-color-theme` | 0.5.0 | MIT | Тема на изучение — проверенный список [themes.md](themes.md) |

### Машинный опционал — решение от 02.10.2026, аудит T7 (6)

Рабочие сценарии конкретной машины; в `recommendations` не вносятся
(комментарий-блок в `.vscode/extensions.json`):

| Расширение | Extension ID | Версия | Лицензия | Примечание |
|---|---|---|---|---|
| SFTP | `natizyskunk.sftp` | 1.16.3 | MIT | Деплой по SFTP |
| inifmt | `lkrms.inifmt` | 0.1.7 | — | Форматтер `.ini` |
| NGINX Beautifier | `lch.nginx-beautifier` | 1.0.2 | MIT | Форматирование nginx.conf |
| XML | `redhat.vscode-xml` | 0.29.3 | EPL-2.0 | XML + LSP; linux-x64 |
| Cherry Markdown | `cherrymarkdownpublisher.cherry-markdown` | 0.3.1081718 | Apache-2.0 | Markdown-редактор |
| Pinit | `decahedra.pinit` | 0.0.5 | MIT | Пиннинг вкладок |

### Отдельно стоящее (1)

| Расширение | Extension ID | Версия | Лицензия | Примечание |
|---|---|---|---|---|
| Composer (DEVSENSE) | `devsense.composer-php-vscode` | 1.74.19252 | — (своя, free) | UI для Composer (scripts, audit). ⚠ НЕ путать с нежелательным `devsense.phptools` — это отдельный бесплатный инструмент, а не freemium PHP Tools |

## Убрано осознанно (1)

| Extension ID | Статус | Следствие |
|---|---|---|
| `junstyle.php-cs-fixer` | PHP-форматтер убран с машины решением владельца (в снапшоте 02.10.2026 отсутствует). 02.10.2026 вычищены следы: рекомендация из `extensions.json`, мёртвые ключи user-/workspace-settings (`[php]`-форматтер junstyle, `php-cs-fixer.config/executablePath`), машинная обвязка (`tools/machine/`-конфиги/wrapper, `~/.config/vscode-php-cs-fixer/`, doctor-чек). Форматирование PHP в редакторе осталось рабочим: `[php]`-форматтер — **phpantom** (авто-детект `vendor/bin/php-cs-fixer` в проектах с require-dev → табы ×2 из проектного конфига; фолбэк — встроенный PER-CS). CLI/CI (`vendor/bin/php-cs-fixer fix --dry-run`) от расширения не зависит | Возвращать junstyle — только по явному запросу владельца (`code-oss --install-extension junstyle.php-cs-fixer` + `[php]`-блок из истории, [clean-problems-formatting.md](clean-problems-formatting.md)); текущая схема (phpantom → фиксер) его не требует |

## Не рекомендуем — unwanted (4)

Из `unwantedRecommendations` `.vscode/extensions.json`:

| Extension ID | Причина |
|---|---|
| `bmewburn.vscode-intelephense-client` | Intelephense: rename symbol и organize imports — платные (freemium) |
| `devsense.phptools` | DEVSENSE PHP Tools: значительная часть возможностей платная |
| `octref.vetur` | Конфликтует с Volar (ломает подсказки в `.vue`) |
| `bradlc.vscode-tailwindcss` | Tailwind не используется (проекты на CSS Modules) |

## Политика дрейфа и обновлений

- **Источник правды базы** — `.vscode/extensions.json` (35 позиций): что в
  `recommendations` — обязательно к установке на любой машине воркспейса.
  Восстановление: `tools/install-extensions.sh` (--force — обновить до версии
  VSIX).
- **Опционалы** (косметика, темы) — осознанно вне базы: список и вердикты — в
  комментариях `extensions.json` и [power-ups.md](power-ups.md) /
  [themes.md](themes.md).
- **Машинный опционал** — не переносится автоматически; на новой машине
  ставить по необходимости (см. таблицу выше).
- **Своё расширение** — только через VSIX-релизы; проверка установленной
  версии: `ls ~/.vscode-oss/extensions | grep vue-css-jump`.
- **Обновления** — UI Extensions-панели или `code-oss --install-extension <id>
  --force`; после массовых обновлений — `Developer: Reload Window`.

## Ключевые настройки расширений (сводка)

| Домен | Ключи | Где |
|---|---|---|
| PHPantom | `phpantom.autoDownload`, `phpantom.serverPath`; path-ignore — `~/.config/phpantom_lsp/.phpantom.toml` | [phpantom-lsp.md](phpantom-lsp.md) |
| rust-analyzer | `rust-analyzer.rustfmt.extraArgs` (табы ×2), `rust-analyzer.lru.capacity`, `cachePriming.numThreads` (память) | [rust-senior-setup.md](rust-senior-setup.md), [rust-memory.md](rust-memory.md) |
| Blade formatter | `bladeFormatter.format.useTabs` | [laravel-vue-alpine-root.md](laravel-vue-alpine-root.md) |
| CSS Modules Kit | `vueCompilerOptions.resolveStyleImports` + `cmkOptions.enabled` (jsconfig/tsconfig) | [vue-css-intellisense.md](vue-css-intellisense.md) |
| WGSL | `[wgsl]`-блок выравнивает редактор под wgslfmt (4 пробела) | [rust-senior-setup.md](rust-senior-setup.md) |

## См. также

- [Как работает Code OSS](code-oss-internals.md) — архитектура, Extension API,
  жизненный цикл и CLI расширений
- [Power-Ups](power-ups.md) — расширения-2026: вердикты, даты релизов, задачи
- [Темы для Code OSS](themes.md) — проверенный список тем Open VSX
- [Чистые Problems + форматирование](clean-problems-formatting.md) — почему не
  Intelephense/PHP Tools, матрица форматтеров
- [README](../README.md) — быстрый старт: установка рекомендаций одной командой
