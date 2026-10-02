# Машинный уровень форматирования (одна настройка на машину)

> Развёртывание на новой машине: `tools/machine/install.sh` + 2 шага ниже.
> Политика и матрица форматтеров —
> [docs/clean-problems-formatting.md](../../docs/clean-problems-formatting.md).
> Воркспейс-уровень (`.vscode/` этого репо) — отдельно, см. [README](../../README.md).

## Что здесь

| Файл | Назначение |
|---|---|
| `install.sh` | Развёртывание машинного уровня **одной командой**: mkdir `~/.config/vscode-php-cs-fixer/` + копия конфигов + wrapper (755); live-templates: 8 файлов `.vscode/*.code-snippets` → `~/.config/Code - OSS/User/snippets/` (сниппеты в любом окне). Идемпотентен, логирует каждый шаг |
| `export-user-settings.sh` | Анти-дрейф снимка: перезаписывает `Code-OSS-User-settings.jsonc` из живого user settings (запускать после изменения глобальных ключей) |
| `vscode-php-cs-fixer.php` | Машинный конфиг php-cs-fixer: табы ×2 + PSR12 + `array_indentation`. Копируется в `~/.config/vscode-php-cs-fixer/.php-cs-fixer.php` |
| `php-cs-fixer-wrapper.sh` | Silent-wrapper (обязателен): cwd = `~/.config/vscode-php-cs-fixer` — гасит WARN «Unable to determine minimum PHP version…» и фильтрует баннер fixer'а из stderr (баг junstyle 0.3.21: `files==0` + непустой stderr → «provider FAILED» — падало каждое сохранение уже-чистого файла). Настоящие ошибки проходят насквозь. Механика — docs/clean-problems-formatting.md |
| `composer.json` | Служебный composer.json для wrapper'а: `config.platform.php` = major.minor runtime. Копируется в `~/.config/vscode-php-cs-fixer/composer.json` |
| `phpantom.toml` | Шаблон глобального конфига phpantom `~/.config/phpantom_lsp/.phpantom.toml`: path-ignore чужой диагностики (vendor/**, ядра WP/Bitrix, плагины) + `[phpcs] command = ""` (иначе phpantom сам находит системный phpcs в `$PATH` и гоняет PSR12-снифф при каждом сохранении; стиль — php-cs-fixer). install.sh копирует только при отсутствии. Проверка — `tools/workspace-doctor.sh` (чеки 2–3); справочник опций — docs/phpantom-lsp.md |
| `Code-OSS-User-settings.jsonc` | Снимок user settings Code OSS (справочник переноса; источник правды — живой файл) |
| `Code-OSS-User-keybindings.jsonc` | Снимок user keybindings Code OSS: Alt+R/A/M/L — phpantom-бонусы на машинном уровне (справочник переноса; обновляется `export-user-settings.sh` вместе со settings) |
| `rust/cargo-config.toml` | Шаблон `[alias]` для `~/.cargo/config.toml` (c/t/cl/f/fc; f/fc — табы ×2). install.sh копирует при отсутствии файла / дописывает `[alias]`, если его ещё нет; существующие алиасы не трогает |
| `rust/justfile` | Шаблон `~/.justfile` (`just -g test\|build\|clippy\|fmt\|check\|watch\|watch-test`); копируется только при отсутствии |

## Развёртывание на новой машине

1. **Машинный конфиг форматтера + wrapper** (действует в ЛЮБОМ открытом корне —
   проекты ничего не должны настраивать и не спрашивают форматтер):

   ```bash
   tools/machine/install.sh
   ```

   Скрипт создаёт `~/.config/vscode-php-cs-fixer/`, копирует конфиг и служебный
   composer.json, ставит wrapper с правами 755, создаёт глобальный конфиг
   phpantom `~/.config/phpantom_lsp/.phpantom.toml` (path-ignore чужой
   диагностики + PHPCS-прокси off; существующий не перезаписывает — WARN) и
   раскладывает live-templates:
   8 файлов `.vscode/*.code-snippets` → `~/.config/Code - OSS/User/snippets/` —
   сниппеты действуют в ЛЮБОМ окне, не только в воркспейсе (гайд:
   docs/live-templates-and-css.md). Плюс Rust-глобаль: `[alias]` в
   `~/.cargo/config.toml` (дописывается только при отсутствии) и `~/.justfile`
   (копируется только при отсутствии) — гайд docs/rust-senior-setup.md.
   Wrapper обязателен: устраняет WARN
   «Unable to determine minimum PHP version…» на каждом сохранении и баг
   junstyle 0.3.21 «provider FAILED» на уже-чистых файлах (механика и
   регресс-чек —
   [docs/clean-problems-formatting.md](../../docs/clean-problems-formatting.md),
   раздел «WARN `composer.json` / provider FAILED при format-on-save»).

2. **CLI-бинарь php-cs-fixer** (коммит-паритет терминала и редактора):

   ```bash
   composer global require friendsofphp/php-cs-fixer
   ```

3. **User settings Code OSS** (`~/.config/Code - OSS/User/settings.json`) —
   перенести ключи из снимка `Code-OSS-User-settings.jsonc` (секция PHP —
   обязательный минимум):

   ```jsonc
   "[php]": { "editor.defaultFormatter": "junstyle.php-cs-fixer" },
   "php-cs-fixer.config": "~/.config/vscode-php-cs-fixer/.php-cs-fixer.php",
   "php-cs-fixer.executablePath": "~/.config/vscode-php-cs-fixer/php-cs-fixer-wrapper.sh",
   "bladeFormatter.format.useTabs": true,
   "bladeFormatter.format.indentSize": 2,
   "bladeFormatter.format.wrapAttributes": "auto",
   "prettier.useTabs": true,
   "prettier.tabWidth": 2,
   "prettier.singleAttributePerLine": true
   ```

   **JS — тоже глобально** (2026-09-26): в снимке дополнительно —
   `formatOnSave` для js/ts/css/scss/html/md/json(`c`)/yaml +
   `[html]`/`[markdown]`-форматтеры, `editor.formatOnSave` в `[js-блоках]`,
   `editor.codeActionsOnSave: {"source.fixAll.eslint": "explicit"}` (no-op без
   eslint-конфига), `editor.formatOnPaste`, suggest-ключи (`suggest.preview`,
   `parameterHints`, `snippetSuggestions`, `editor.tabCompletion` — Tab-разворот
   сниппетов), файловая гигиена
   (`files.eol`/finalNewline/trim). JS-корни вне воркспейса НЕ кладут
   `.prettierrc`/`.vscode` — редактор форматирует значениями user settings
   (гайд: docs/js-standalone-root.md); `.prettierrc` — только под CLI/CI
   (таблица ниже). Новые JS-проекты — генератором
   `tools/new-js-project.sh <каталог> [--webgpu]` (jsconfig + ESLint +
   vitest-каркас + CI-workflow). Паттерны CI — docs/github-ci.md.

   **Global-first editor-фишки + встроенный git-стек** (2026-09-29, аудит
   возможностей Code OSS 1.97–1.108): машинные user settings дополнительно
   несут — editor-поведение воркспейса в любом окне (Emmet по Tab,
   `linkedEditing`, `mouseWheelZoom`, `rulers`, `guides.bracketPairs`,
   `files.autoGuessEncoding` для cp1251, `extensions.autoUpdate`), исключения
   CMS-ядер из поиска/watcher (`bitrix/upload/wp-admin/wp-includes/
   storage/logs`), приватность (`telemetry.telemetryLevel: off`,
   `redhat.telemetry.enabled: false`), явные форматтеры `[json]/[jsonc]/
   [yaml]` + `[vue]` = Prettier (Volar игнорирует `prettier.useTabs`),
   встроенные возможности (`git.blame.editorDecoration.enabled`,
   `git.autofetch`, Terminal IntelliSense, дерево брейкпоинтов). Мёртвые
   ключи (phpResolver, kilo-code) удалены; `editor.tabCompletion:
   "onlySnippets"` и `editor.stickyScroll.enabled: true` выровнены
   с воркспейсом.

   **Дополнение 2026-10-02** (аудит живых проектов /var/www: 13 Laravel-корней
   L12/L13, 17 WP-инсталлов, Rust bevy/iced/wgpu, Vue 3.5/Inertia/Alpine,
   ESLint 9/10 flat): `[php]`/`[blade]` + `editor.formatOnSave: true`
   (standalone-корни форматируются как в воркспейсе — раньше только окна
   _vscode), новый блок `[toml]` (even-better-toml, 2 пробела, formatOnSave),
   inlay hints JS/TS (`parameterNames: "literals"`, `enumMemberValues`,
   `variableTypes` + `suppressWhenNoMatches`; шумные режимы не включены),
   `search.exclude` += `**/storage/framework` (скомпилированные views —
   сгенерированный код), `git.confirmSync: false`, fileNesting `Cargo.toml`
   += `rust-toolchain.toml`, фикс `extensions.autoUpdate`: `"on"` →
   `"onlyEnabledExtensions"` (комментарий декларировал «меньше обновлений» —
   значение ему противоречило). Порядок import-ов вторым сортировщиком
   (`source.organizeImports`) сознательно НЕ включён: им владеет ESLint
   `import/order` + `source.fixAll.eslint` на сохранении (6 проектов) —
   иначе каждый Ctrl+S перекладывал бы импорты по-разному. Tailwind-расширение
   остаётся в blacklist: `tailwindcss ^4` в 8 манифестах — стартовый шаблон
   Laravel 12/13, вёрстка на нём не пишется.

   **Keybindings — Alt+R/A/M/L (2026-10-02):** 4 биндинга phpantom (роуты /
   artisan / `@property`-аннотации / логи; `when`-гарды по `editorLangId`
   php/blade) вынесены в машинный `~/.config/Code - OSS/User/keybindings.json` —
   работают в любом окне с Laravel-корнем, не только в воркспейсе _vscode. В
   user settings им сопутствует `terminal.integrated.commandsToSkipShell`
   (клавиши срабатывают и при фокусе в терминале; дефолтный список сохраняется).
   Воркспейс-копия в `.vscode/keybindings.json` остаётся (самодостаточность
   воркспейса). Снимок — `Code-OSS-User-keybindings.jsonc` (обновляет
   `export-user-settings.sh`, теперь экспортирует оба снимка разом).

## Анти-дрейф снимка user settings

Снимок `Code-OSS-User-settings.jsonc` — справочник переноса; источник правды —
живой `~/.config/Code - OSS/User/settings.json`. Регламент синхронизации:

1. Изменили глобальные ключи (user settings) → запустить
   `tools/machine/export-user-settings.sh` — снимок перезапишется.
2. Сверить diff снимка с `.vscode/settings.json` воркспейса: общие ключи
   (отступы, форматтеры, `prettier.*`, гигиена) не должны разъезжаться.
   Расхождение = WARN: чинить сразу — либо в живом файле, либо в воркспейсе.
3. Зафиксировать снимок коммитом (вместе с сопутствующей правкой воркспейса).
4. Обратное направление (правка воркспейса → машина): перенести ключи в живой
   user settings вручную, затем снова шаг 1.

## Ключевой факт (почему НЕ pint)

**Laravel Pint не умеет табы**: правило `indentation_type` в php-cs-fixer 3.9x
не конфигурируется и берёт целевой отступ из `Config->getIndent()`, который
Pint не экспонирует (всегда дефолтные 4 пробела). Поэтому канонический стиль
PHP — **php-cs-fixer** с `setIndent("\t")`:

- редактор: junstyle.php-cs-fixer + машинный конфиг (глобально) или
  проектный `.php-cs-fixer.php` (self-sufficient корень);
- CLI/CI: `vendor/bin/php-cs-fixer fix` (dev-зависимость
  `friendsofphp/php-cs-fixer`).

Анти-паттерн: `laravel.vscode-laravel` как `[php]`-форматтер — его
Pint-форматирование зависит от наличия `vendor/bin/pint` в корне проекта
и в корнях без pint (WP-инсталлы) просто не работает.

## Обслуживание: апгрейд PHP

Служебный `~/.config/vscode-php-cs-fixer/composer.json` держит
`config.platform.php` = major.minor текущего runtime. После апгрейда PHP
обновить значение, иначе WARN вернётся (runtime новее минимума):

```bash
php -r 'echo PHP_MAJOR_VERSION, ".", PHP_MINOR_VERSION, PHP_EOL;'
```

В служебном composer.json — ТОЛЬКО `config.platform.php`, без `require.php`:
`detectPhp()` объединяет кандидатов через «||», `getMinSemVer()` берёт минимум
из объединения — любой require вернёт WARN обратно.

## Проектный уровень (что кладётся в git проекта)

| Файл | Зачем |
|---|---|
| `.php-cs-fixer.php` | Тот же стиль для CLI/CI и других машин (junstyle находит дефолтным поиском) |
| `.editorconfig` | `indent_style = tab`, `indent_size = 2` |
| `.prettierrc` | `{"useTabs": true, "tabWidth": 2, ...стиль проекта}` |
| `.bladeformatterrc` | `{"useTabs": true, "indentSize": 2}` (для CLI blade-formatter) |

Шаблон `.php-cs-fixer.php` ( finder исключает vendor/blade и пр.) — в
[docs/clean-problems-formatting.md](../../docs/clean-problems-formatting.md).
