# Воркспейс веб-разработки и Rust — настройка VS Code

Полностью **бесплатная** среда разработки сайтов (PHP/Laravel, Vue, Alpine.js,
WordPress, Bitrix) и Rust-графики (winit + wgpu + Bevy). Никаких платных
функций в расширениях — принцип «всё работает из коробки».

## Быстрый старт

1. Откройте этот воркспейс в VS Code (Remote-SSH, если работаете на сервере).
2. Установите рекомендации: одной командой `tools/install-extensions.sh`
   (CLI Code OSS, идемпотентен; `--force` — обновить) или через UI:
   панель **Extensions** → фильтр **Recommended** → **Install All**.
   Code OSS тоже подходит — все рекомендации есть на Open VSX
   (см. [docs/vue-css-intellisense.md](docs/vue-css-intellisense.md)).
3. Live templates (сниппеты как в PhpStorm) уже в `.vscode/*.code-snippets` —
   наберите префикс (например `pubf`, `fore`, `bfore`, `vsfc`, `vref`, `cl`,
   `bcomp`, `pfn`) и нажмите **Tab**. Каталог префиксов и CSS-приёмы —
   в [docs/live-templates-and-css.md](docs/live-templates-and-css.md).
4. Отступы: везде **табы шириной 2** (settings.json + .editorconfig),
   VS Code не «угадывает» отступы (`detectIndentation: false`); JSON/YAML/TOML —
   2 пробела (в JSON-строках сырые табы запрещены). Символы пробелов не
   отображаются (`renderWhitespace: "none"`). Problems — только свой код:
   vendor/ядра CMS исключены из поиска, watcher и диагностики; форматтеры —
   по одному на язык (`Ctrl+Shift+I` ≡ `Ctrl+S`). Полная политика:
   [docs/clean-problems-formatting.md](docs/clean-problems-formatting.md).
5. IntelliSense CSS/Vue/Laravel: подсказки свойств, `$style`, `var(--…)`,
   color picker, Blade `@include` — гайд [docs/vue-css-intellisense.md](docs/vue-css-intellisense.md)
   (для отдельного проекта — раздел «Проектный уровень настроек»);
   автопроверка: `cd tools/intellisense-check && npm test`; диагностика любого
   инсталла (WP-тема / корень WP-инсталла / laravel — язык, property-подсказки,
   var(--…) в чистом инстансе VS Code): `npm run diag:wp -- --theme=<корень>
   [--workspace=<корень окна>] [--files=<css-пути через запятую>]`.
6. Продуктивность: **Alt+R / Alt+A / Alt+M / Alt+L** — роуты / artisan /
   `@property`-аннотации / логи (phpantom); Terminal → Run Task — интелли-чек,
   rust-doctor / workspace-doctor, JSONC-валидация. REST-тесты — в `.http`-файлах (REST Client).
   Обзор: [docs/power-ups.md](docs/power-ups.md).

## Требует одной установки на машину (всё бесплатно)

### PHPantom — PHP language server (типы, Laravel, Blade)

Установка (Open VSX; бинарь Rust-сервера скачается сам при первом открытии
PHP-файла — `phpantom.autoDownload: true`):

```bash
code-oss --install-extension phpantom.phpantom
```

Rust-LSP с глубокой типизацией (MIT): generics/`@template`, PHPStan-аннотации,
Laravel (Eloquent-отношения, scopes, контейнер `app('…')`, go-to-def для
конфигов/роутов/переводов) и **Blade** — completion/hover/go-to-def/диагностика
в `.blade.php` через виртуальную PHP-препроцессацию, в т.ч. подсказки хелперов
внутри `@php … @endphp`. Emmet и HTML-подсказки в blade-разметке остаются.

Заменил phpactor (18.09.2026): быстрее стартует, без падений индексатора на
`storage/`. Требование Quick Start — не держать другие PHP-LSP: phpactor
удалён, builtin «PHP Language Features» отключён (`php.validate.enable: false`,
Language Basics оставить для подсветки).

**Нюансы:**

- Статус сервера — статус-бар / `PHPantom: Show Server Version`; логи —
  Output → PHPantom. Ручной бинарь (GitHub Releases / `cargo install
  phpantom_lsp`) — через `phpantom.serverPath`.
- Бонусы: log-viewer `storage/logs/*.log`, раннер artisan-команд, route list,
  генерация `@property`-аннотаций Eloquent-моделей из живой БД.
- Пути view (`@include`, `view()`) остаётся официальным Laravel LSP
  (`laravel.vscode-laravel`) — роли разделены.
- Переменные, передаваемые во view из контроллеров, статически не резолвит
  ни один LSP — только runtime.
- WordPress-инсталлы (Sage/Acorn, ACF): полный резолв символов (WP, ACF,
   Acorn, WP-CLI) — гайд [docs/phpantom-wordpress.md](docs/phpantom-wordpress.md): открывать корень WP,
  `.ignore` в теме для vendor, editor-стабы, регресс-чеки через
  `phpantom_lsp analyze`. Problems — только свой код: глобальные path-ignore
  (`vendor/**`, ядро WP, плагины) гасят чужую диагностику, не трогая
  индексацию/F12 (конфиг — только `~/.config/phpantom_lsp/.phpantom.toml`).
- Тост «phpcs - Mismatch configuration provided» от php-resolver — ложный:
  PHPCS 4.x возвращает битовую маску (3 = fixable + non-fixable). В проектах
  на Pint отключать: `"phpResolver.phpSnifferCommand": ""`
   в `.vscode/settings.json` проекта (история: [docs/phpactor-indexer-phpcs-fix.md](docs/phpactor-indexer-phpcs-fix.md)).
  PHPCS-прокси самого phpantom (source `phpcs` в Problems) тоже выключен
  глобально — `[phpcs] command = ""` в `~/.config/phpantom_lsp/.phpantom.toml`,
  иначе на каждом сохранении сыплет PSR12-стилем.

### Xdebug — отладка PHP

CachyOS / Arch Linux:

```bash
sudo pacman -S --needed xdebug
php -m | grep -i xdebug   # проверка загрузки
```

Пакет кладёт ini в `/etc/php/conf.d/` (каталог сканируется автоматически).
Если модуль не подхватился — убедитесь, что в `/etc/php/conf.d/xdebug.ini`
есть строка `zend_extension=xdebug.so`. Затем добавьте настройки:

```ini
[xdebug]
xdebug.mode=debug
xdebug.start_with_request=trigger   # старт по Listen for Xdebug из VS Code
xdebug.client_port=9003
```

Затем: F5 → конфигурация **«PHP: слушать Xdebug»** → откройте страницу сайта
(в Laravel: `php artisan serve`). Брейкпоинты в PHP-файлах сработают.

### Prettier / ESLint

В Laravel-проекте: `npm i -D prettier eslint` — расширение подхватит
автоматически. Без конфига Prettier тоже работает (табы заданы в
settings.json: `useTabs: true`, `tabWidth: 2`).

### PHP-форматирование (табы, единый стиль)

- Канон — **php-cs-fixer**. Laravel Pint табы не умеет: правило
  `indentation_type` берёт отступ из `Config->getIndent()`, который Pint не
  экспонирует → всегда 4 пробела.
- **Глобально** (одна настройка на машину, работает в любом открытом корне —
  проекты ничего не настраивают): машинный конфиг
  `~/.config/vscode-php-cs-fixer/.php-cs-fixer.php` + ключи user settings
   (`[php]` → junstyle, `php-cs-fixer.config` с путём `~/`). Развёртывание —
   [tools/machine/README.md](tools/machine/README.md).
- Воркспейс: `.vscode/.php-cs-fixer.php` (junstyle: `setIndent("\t")` + PSR12 +
  `indentation_type`). Настройка `php-cs-fixer.rules` табы НЕ даёт: символ
  отступа переключается только `Config->setIndent`.
- Проекты (в git): `.php-cs-fixer.php` в корень, `composer require --dev
  friendsofphp/php-cs-fixer`, CI — `vendor/bin/php-cs-fixer fix --dry-run`.
  Rector — рефакторер, не форматтер: после `rector process` прогонять
  php-cs-fixer.
- Инсталлы отдельным корнем (WP/Bitrix): глобальный конфиг уже покрывает
  редактор; для CLI скопировать `.php-cs-fixer.php` в корень инсталла.
   Подробно: [docs/clean-problems-formatting.md](docs/clean-problems-formatting.md).

### Rust

```bash
rustup component add rust-analyzer clippy rustfmt
```

Отладка: F5 → **«Rust: отладка бинарника»** (kind-only фильтр CodeLLDB:
единственный `[[bin]]` подхватывается автоматически; при нескольких `[[bin]]`
вернуть `"name"` в `launch.json`).

Навигация/подсказки во вложенных крейтах: корневой `Cargo.toml` обязан
объявлять `[workspace] members = [...]` — rust-analyzer индексирует только
workspace-члены. Гайд: [docs/rust-navigation-fix.md](docs/rust-navigation-fix.md).

Сеньор-автоматизация (всё глобально, любой проект): clippy + rustfmt (табы ×2)
на сохранении, Run/Debug-лензы, bacon (фоновые проверки), just, алиасы
`cargo c/t/cl/f/fc`, health-check `tools/rust-doctor.sh`. Гайд:
[docs/rust-senior-setup.md](docs/rust-senior-setup.md).

## Отладка фронтенда (Vue/Alpine/JS)

1. Запустите dev-сервер: `npm run dev` (Vite, порт 5173) или
   `php artisan serve` (порт 8000).
2. F5 → «JS: сайт через …» — откроется Chrome с подключённым дебаггером:
   брейкпоинты в `.js`/`.vue`, DevTools не нужен.

## Стек и покрытие

| Область | Инструменты (все бесплатные) |
|---|---|
| PHP | phpantom (Rust-LSP: типы, Laravel, Blade), xdebug.php-debug, php-cs-fixer, PHPUnit |
| Laravel | официальное расширение laravel.vscode-laravel — Laravel LSP: completions/links для @include, view(), route(), config(), env, переводов, middleware, валидации |
| WordPress | johnbillion.vscode-wordpress-hooks (хуки до WP 7.1) |
| Bitrix | отдельного расширения нет — покрывается PHP-стеком; сниппеты добавляйте в `php.code-snippets` |
| Vue / Vite | vuejs.volar (подсказки `$style`: inline `<style module>` — jsconfig/tsconfig + `vueCompilerOptions`; внешние CSS-модули — `*.module.css` + `mizdra.css-modules-kit-vscode` + `resolveStyleImports`/`cmkOptions.enabled` — см. [docs/vue-css-intellisense.md](docs/vue-css-intellisense.md)), **povly.vscode-vue-css-jump ≥ 0.1.2** (своё расширение: hover/Ctrl+Click по `<style src>`, прыжки и подсказки `$style.` без tsserver-цепочки; исходники `tools/vscode-vue-css-jump/`, установка из VSIX), ESLint, Prettier |
| Alpine.js | connorontheweb.alpinejs-tools + сниппеты `alp*` в html.code-snippets |
| CSS / PostCSS | csstools.postcss (только подсветка; `.pcss`→`scss` для IntelliSense), vunguyentuan.vscode-css-variables (var(--) по проекту), встроенный color picker (naumovs.color-highlight — опционально, в комментариях extensions.json). Ловушка: при `postcss.config.js` в корне инсталла plain `*.css` перехватывается языком `postcss` (подсказки отключаются) — в `.vscode` проекта добавить `"*.css": "scss"`; WP-инсталл, открытый от корня WP, `.vscode` темы не применяет — зеркалить настройки в `.vscode` корня инсталла; известное ограничение: в файлах из одних `@define-mixin`-блоков списка свойств нет (`var(--)` работает) |
| Rust / Bevy | rust-analyzer, CodeLLDB, crates, Even Better TOML |
| wgpu / WGSL | polyMeilex.wgsl + сниппеты в wgsl.code-snippets |
| Продуктивность | REST Client (.http-тесты API), Vitest explorer, Git Graph, Bookmarks, Rainbow CSV, ShellCheck, markdownlint + Mermaid, npm Intellisense, DotENV — вердикты и гайды: [docs/power-ups.md](docs/power-ups.md) |

## Чего НЕ ставим (платные функции)

- **Intelephense** — rename symbol и organize imports платные.
- **DEVSENSE PHP Tools** — большая часть возможностей платная.
- **GitLens** — часть функций платная.

Чем заменены и как настроить «Problems — только свой код» на больших базах
Bitrix/WP: [docs/clean-problems-formatting.md](docs/clean-problems-formatting.md) (раздел «Почему не
Intelephense…»).

## Документация

Все гайды — в каталоге `docs/`; каждый — самодостаточный рецепт
«симптом → диагностика → фикс».

| Гайд | Что внутри |
|---|---|
| [docs/live-templates-and-css.md](docs/live-templates-and-css.md) | Live templates в стиле PhpStorm: каталог префиксов по 8 языкам, Emmet-трюки, PostCSS-миксины |
| [docs/vue-css-intellisense.md](docs/vue-css-intellisense.md) | Матрица «симптом → фикс»: подсказки CSS-свойств, `$style` (inline + внешние `*.module.css`), `var(--…)`, color picker, Blade `@include`; автотест `tools/intellisense-check`; диагностика инсталлов `npm run diag:wp` (WP: корень темы vs корень инсталла — зеркалирование `.vscode`, машинно-локально) |
| [docs/clean-problems-formatting.md](docs/clean-problems-formatting.md) | Политика «анализ — только свой код»: исключения vendor/ядра Bitrix/WP из поиска и диагностик, матрица форматтеров «один на язык», машинный php-cs-fixer с табами, почему не Intelephense/PHP Tools |
| [docs/phpantom-wordpress.md](docs/phpantom-wordpress.md) | Полный IntelliSense для WP-инсталлов (Sage/Acorn, ACF, WP-CLI): открытие от корня WP, `.ignore` для vendor, editor-стабы, регресс-чеки `phpantom_lsp analyze`, глобальные path-ignore |
| [docs/phpactor-indexer-phpcs-fix.md](docs/phpactor-indexer-phpcs-fix.md) | История миграции с phpactor: падение индексатора на `storage/`, ложный тост php-resolver/phpcs (PHPCS 4.x и битовая маска), шаблон конфига для Laravel-проектов |
| [docs/rust-navigation-fix.md](docs/rust-navigation-fix.md) | Навигация во вложенных крейтах: `[workspace] members` в корневом Cargo.toml (без glob `"*"`), механика discovery rust-analyzer, linkedProjects-фолбэк, чек-лист проверки |
| [docs/rust-senior-setup.md](docs/rust-senior-setup.md) | Сеньор-сетап «всё глобально»: clippy + rustfmt (табы ×2) на сохранении, Run/Debug-лензы, bacon, just, алиасы `cargo c/t/cl/f/fc`, health-check `tools/rust-doctor.sh`, рецепт «новый проект за 30 секунд» |
| [docs/power-ups.md](docs/power-ups.md) | Расширения-2026 с вердиктами Open VSX (REST Client, Vitest explorer, Git Graph, Bookmarks, Rainbow CSV, ShellCheck, markdownlint + Mermaid, DotENV), задачи tasks.json, keybindings Alt+R/A/M/L, live templates invk/mig12/useTplRef/useid |

Внутренние документации и AI-контекст:

- [tools/machine/README.md](tools/machine/README.md) — развёртывание машинного
  (глобального) сетапа: снимок user settings Code OSS + php-cs-fixer
- [tools/vscode-vue-css-jump/README.md](tools/vscode-vue-css-jump/README.md) —
  README собственного расширения (git submodule:
  [github.com/povly/vscode-vue-css-jump](https://github.com/povly/vscode-vue-css-jump))
- [AGENTS.md](AGENTS.md) — карта проекта для AI-агентов и разработчиков
  (структура, таблица документации, правила)
- [.ai-factory/DESCRIPTION.md](.ai-factory/DESCRIPTION.md) — спецификация
  воркспейса: стек, направления, нефункциональные требования
- [.ai-factory/ARCHITECTURE.md](.ai-factory/ARCHITECTURE.md) — архитектурные
  правила: слои IDE-конфигурации и AI-контекста, изоляция треков web/Rust

## Структура

```
.vscode/
  extensions.json      — рекомендуемые расширения (все бесплатные)
  settings.json        — табы ×2, подсказки, форматирование, исключения шума
  .php-cs-fixer.php    — форматтер PHP: табы + PSR12 (setIndent "\t")
  tasks.json           — задачи: интелли-чек / rust-doctor / workspace-doctor /
                         JSONC-валидация
  keybindings.json     — Alt+R/A/M/L: phpantom-роуты/artisan/аннотации/логи
  launch.json          — отладка: Xdebug / Chrome+Vite / CodeLLDB (Rust)
  *.code-snippets      — live templates в стиле PhpStorm:
                         php, blade, vue, javascript, html, css, rust, wgsl
.editorconfig          — стабильные отступы для любых редакторов
AGENTS.md              — карта проекта для AI-агентов (структура, доки, правила)
.ai-factory.json       — манифест agent-skills (какие скиллы установлены)
skills-lock.json       — фиксация версий внешних скиллов (.agents/skills)
.agents/skills/        — внешние скиллы: vue, vite, rust, bevy, phpstan, laravel…
.opencode/skills/      — скиллы OpenCode: aif*, vscode-dev-setup, winit-wgpu-bevy
opencode.json          — Playwright MCP для AI-агента (проверка сайтов)
tools/intellisense-check/ — автотест IntelliSense (@vscode/test-electron,
                           чистый инстанс VS Code; npm test; кейсы 9/9a —
                           postcss-диалект; диагностика инсталлов:
                           npm run diag:wp -- --theme=… [--workspace/--files])
tools/vscode-vue-css-jump/ — исходники расширения povly.vscode-vue-css-jump
                           (git submodule → github.com/povly/vscode-vue-css-jump;
                           hover/Ctrl+Click по <style src>, $style-подсказки;
                           npm run package → VSIX → code-oss --install-extension)
tools/machine/            — глобальный машинный сетап: install.sh (развёртывание
                           одной командой), снимок user settings (анти-дрейф —
                           export-user-settings.sh), php-cs-fixer (README внутри)
tools/validate-jsonc.php — валидатор .vscode/*.json (задача «JSONC»)
tools/rust-doctor.sh     — PASS/FAIL диагностика Rust-тулчейна
tools/workspace-doctor.sh — PASS/FAIL диагностика веб-стека (phpantom, xdebug,
                           машинный php-cs-fixer, расширения)
tools/install-extensions.sh — CLI-установка всех рекомендаций extensions.json
docs/                  — гайды: 8 рецептов настройки — см. раздел «Документация»
.ai-factory/           — контекст AI Factory (описание, правила, архитектура)
```
# vs-code-settings
