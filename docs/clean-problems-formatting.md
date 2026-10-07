[← Предыдущий гайд](rust-standalone-root.md) · [К README](../README.md) · [Следующий гайд →](power-ups.md)

# Чистые Problems + единое форматирование (табы ×2)

> Политика воркспейса: **анализ — только мой код, форматирование — везде
> одинаковое**. Дата: 2026-09-20. Действует глобально: на любой проект внутри
> воркспейса + машинные конфиги для отдельно открытых корней (WP/Bitrix).

## TL;DR

1. Подсказки и переходы (IntelliSense, F12, completions) в vendor и ядрах
   CMS — **работают**. Линты, диагностика, поиск и watcher на них — **выключены**.
2. Ровно один форматтер на язык → `Ctrl+Shift+I` (Format Document) ≡ `Ctrl+S`.
3. Отступы — **табы ×2** везде; JSON/YAML/TOML — 2 пробела.
4. PHP-LSP — phpantom, **не** Intelephense/PHP Tools (freemium, см. ниже).

## Матрица исключений стороннего кода

| Слой | Где | Что выключено |
|---|---|---|
| Поиск + Quick Open | `search.exclude` (settings.json) | `node_modules`, `vendor`, `target`, `dist`, `build`, `.git`, `.vscode-test`, `bitrix`, `upload`, `wp-admin`, `wp-includes` |
| File watcher | `files.watcherExclude` (settings.json) | то же + `storage/framework/**`, `storage/logs/**` |
| Правка файлов | `files.readonlyInclude` (settings.json + машинные user settings) | `vendor`, `node_modules`, ядра WP/Bitrix, `target`, `dist` — read-only: случайная правка невозможна, чтение/F12 доступны (снять: «Files: Toggle Active File Read Only in Session») |
| Диагностика PHP | phpantom `[[diagnostics.ignore]]` — глобальный toml | `vendor/**`, `wp-includes/**`, `wp-admin/**`, `wp-content/plugins/**`, `wp-content/mu-plugins/**`, `bitrix/**`, `upload/**` + message-правило WP_Post |
| Builtin PHP-линтер | `php.validate.enable: false` | весь builtin-валидатор (линтил каждый открытый файл, включая vendor) |
| Телеметрия | `telemetry.telemetryLevel: "off"` | отправка usage-данных |

Чего **не** выключаем (осознанно):

- `files.exclude` — проводник и Quick Open остаются живыми; F12 в vendor
  открывает файлы (переходы нужны, «я с ними не работаю» ≠ «не загляну»).
- Индексацию phpantom — path-правила гасят **только диагностику** чужих путей,
  индексация/F12/completions не затрагиваются (эмпирика phpantom_lsp 0.10.0).

Свой код при этом: Bitrix → `local/**`, WP → `wp-content/themes/**` (и свои
плагины), Laravel → `app/**` — диагностика на нём остаётся полной.

## Глобальный конфиг phpantom (единственный — `~/.config/phpantom_lsp/.phpantom.toml`)

```toml
# composer-зависимости любого проекта (Laravel, Sage/Acorn и др.)
[[diagnostics.ignore]]
path = "vendor/**"

# ядро WordPress
[[diagnostics.ignore]]
path = "wp-includes/**"

[[diagnostics.ignore]]
path = "wp-admin/**"

# сторонние плагины WP (свой плагин — сузить правило)
[[diagnostics.ignore]]
path = "wp-content/plugins/**"

[[diagnostics.ignore]]
path = "wp-content/mu-plugins/**"

# ядро 1С-Битрикс (свой код — local/**)
[[diagnostics.ignore]]
path = "bitrix/**"

# медиа/аплоады Битрикс
[[diagnostics.ignore]]
path = "upload/**"

# WP-шум: динамические свойства меню на WP_Post
[[diagnostics.ignore]]
identifier = "unknown_member"
message = "^Property '[^']+' not found on class 'WP_Post'$"

# PHPCS-прокси выключен (стиль — php-cs-fixer, не PHPCS/Pint)
[phpcs]
command = ""
```

Политика: **только глобальный конфиг** — проектный `[[diagnostics.ignore]]`
заменяет массив целиком (эмпирика 0.10.0, см. docs/phpantom-wordpress.md).
Шаблон этого конфига — `tools/machine/phpantom.toml` (деплой:
`tools/machine/install.sh`; проверка — `tools/workspace-doctor.sh`, чеки 2–3;
справочник всех опций — docs/phpantom-lsp.md).
Проверка на любом инсталле:

```bash
phpantom_lsp analyze <путь своего кода> --project-root <корень инсталла> --no-colour
```

## Матрица форматтеров (один на язык → нет диалога «Multiple Formatters»)

| Язык | Форматтер | Где настроено | Отступ |
|---|---|---|---|
| PHP | phpantom.phpantom (LSP-провайдер) | авто-детект `vendor/bin/php-cs-fixer` (require-dev) → проектный `.php-cs-fixer.php`; фолбэк — встроенный PER-CS | табы ×2 (из конфига фиксера) |
| Blade | shufo.vscode-blade-formatter | `bladeFormatter.format.useTabs/indentSize/wrapAttributes` | табы ×2 |
| JS, TS, JSX, TSX, Vue, HTML, MD | Prettier | явные `[lang]`-блоки + `prettier.useTabs/tabWidth/singleAttributePerLine` | табы ×2 |
| CSS, SCSS | Prettier — только по запросу (Ctrl+Shift+I / Shift+Alt+F) | `[css]`/`[scss]`-блоки машинных user settings: `formatOnSave: false` (2026-10-07, запрос владельца: autoSave afterDelay + автоформат переписывали css на каждой паузе набора после ассоциации `*.css → scss`) | табы ×2 |
| JSON, JSONC, YAML | Prettier | `[lang]`-блоки: `insertSpaces` | 2 пробела |
| TOML | even-better-toml | `[toml]`-блок | 2 пробела |
| Rust | rustfmt (rust-analyzer) | `rust-analyzer.rustfmt.extraArgs` = `hard_tabs=true,tab_spaces=2` | табы ×2 |
| WGSL | — (форматтера нет, осознанно) | — | — |

«Табы ×2» = символ таба в файле; ширина рендера 2 задаётся `editor.tabSize`
(+ `.editorconfig`). Инвариант: `editor.defaultFormatter` задан явно для
каждого языка → VS Code не спрашивает выбор форматтера → результат
`Ctrl+Shift+I` и `Ctrl+S` идентичен.

### Перенос атрибутов тегов (Vue / HTML / Blade)

- **Vue, HTML, JSX (Prettier):** `prettier.singleAttributePerLine: true`
  (Prettier ≥ 2.6, в расширении 12.x ключ объявлен). Тег, не влезающий в
  `printWidth` (дефолт 80), переносится — **каждый атрибут на своей строке**;
  без опции Prettier «набивает» атрибуты по несколько в строку. Короткие теги
  остаются в одну строку. Хотите перенос всегда — снизьте `prettier.printWidth`.
- **Blade (blade-formatter ≥ 0.26):** `bladeFormatter.format.wrapAttributes`:
  `auto` (установлено) — переносить при превышении `wrapLineLength`
  (дефолт 120), каждый атрибут на своей строке; `force` — всегда;
  порог «атрибутов ≥ N» для force-режимов — `wrapAttributesMinAttrs` (дефолт 2);
  прочее: `force-aligned`, `force-expand-multiline`, `aligned-multiple`,
  `preserve(-aligned)`.
- **PHP с HTML внутри (.php):** php-cs-fixer форматирует только PHP-токены —
  HTML-атрибуты в php-файлах не переносит (и редактор через phpantom — тоже).
  Выносить разметку в blade или переносить вручную; HTML-форматтер на `[php]`
  не вешать — PER-CS/Pint дают 4 пробела, ломают табы ×2 и «один форматтер
  на язык».

## PHP: табы (php-cs-fixer), Rector

- **Канон — php-cs-fixer, НЕ Pint** (эмпирика 2026-09-21, php-cs-fixer 3.95 /
  Pint 1.32): правило `indentation_type` не конфигурируется и берёт целевой
  отступ из `Config->getIndent()`, который Pint не экспонирует → Pint всегда
  даёт 4 пробела. Рецепт `pint.json {"rules":{"indentation_type":true}}` из
  ранних версий этого гайда был ошибочен — pint из конвейера убран.
- **Конфиг — один уровень: проектный `.php-cs-fixer.php` в корне** (правила:
  `setIndent("\t")` + `@PSR12` + `indentation_type` + `array_indentation`) —
  self-sufficiency для CLI/CI и других машин. Машинный
  `~/.config/vscode-php-cs-fixer/` и воркспейсный `.vscode/.php-cs-fixer.php`
  сняты 02.10.2026 вместе с редакторной интеграцией junstyle (история — git).
  Тот же файл читает и редактор — через авто-детект phpantom.
- **Почему файл, а не настройка `php-cs-fixer.rules`**: символ отступа живёт в
  `Config->setIndent` (дефолт — 4 пробела), правилами не переключается
  (проверено CLI: `--rules='{"indentation_type":true}'` дал «Fixed 0» на файле
  с пробелами; с конфигом — фиксы и табы).
- **CLI-паритет** (одна установка на машину):
  `composer global require friendsofphp/php-cs-fixer`; в проекты —
  `composer require --dev friendsofphp/php-cs-fixer`; скрипты:
  `lint` → `php-cs-fixer fix`, `lint:check` → `php-cs-fixer fix --dry-run`;
  CI: `vendor/bin/php-cs-fixer fix --dry-run`.
- **Проектный шаблон** (finder исключает vendor/blade и пр.):

  ```php
  $finder = (new PhpCsFixer\Finder())
  	->in(__DIR__)
  	->exclude(['vendor', 'node_modules', 'storage', 'resources/views'])
  	->notName('*.blade.php');

  return (new PhpCsFixer\Config())
  	->setIndent("\t")
  	->setRules(['@PSR12' => true, 'indentation_type' => true])
  	->setFinder($finder);
  ```

- **Rector — рефакторер, не форматтер**: конвейер `rector process` →
  `vendor/bin/php-cs-fixer fix` — диффы только по смыслу правок, не по отступам.
- **phpantom — форматтер `[php]`** (junstyle снят 02.10.2026): провайдер
  phpantom сам находит `vendor/bin/php-cs-fixer` (фиксер в require-dev
  composer.json) → табы ×2 из проектного `.php-cs-fixer.php`; явная секция
  `[formatting]` в конфиге не нужна (нужна только для нестандартных случаев —
  pint/phpcbf-команды + timeout). Корни без vendor-фиксера — встроенный
  PER-CS 2.0 (4 пробела, опций отступа нет).
- **Анти-паттерн**: `laravel.vscode-laravel` как `[php]`-форматтер в user
  settings — его Pint-форматирование зависит от `vendor/bin/pint` в корне
  проекта (в WP-инсталлах не работает вовсе) и даёт 4 пробела вместо табов.

### Архив: WARN `composer.json` / «provider FAILED» при format-on-save

> Исторический кейс: junstyle.php-cs-fixer снят 02.10.2026 — раздел сохранён
> как механика бага и история wrapper-фикса (сами wrapper и конфиги удалены).

Симптом → диагностика → фикс (эмпирика 2026-09-21: junstyle.php-cs-fixer
0.3.21-universal + PHP CS Fixer 3.95.26, runtime PHP 8.5).

**Симптомы:**

1. При каждом сохранении Output php-cs-fixer показывает stderr-WARN
   `Unable to determine minimum PHP version supported by your project from
   composer.json: Failed to read file "composer.json".`
2. Форматирование «умирает»: exthost-лог сыплет
   `[junstyle.php-cs-fixer] provider FAILED` + `[error] undefined`, файл
   сохраняется неформатированным.

**Механика (по исходнику junstyle 0.3.21 и php-cs-fixer 3.95):**

- junstyle форматирует временную копию `/tmp/pcf-tmp0.<rand>/<Имя>.php`,
  спавня фиксер с `cwd` = каталогу редактируемого файла. Проектный
  `.php-cs-fixer.php` и корневой composer.json на это не влияют.
- `ComposerJsonReader::processFile()` ищет `composer.json` по относительному
  пути — строго от cwd, без walk-up к корню и без привязки к `--config` →
  симптом 1 (предупреждение косметическое: правила задаёт `--config`).
- Баг junstyle 0.3.21 (`format()`, else-ветка): при `files==0` и >1 непустой
  строки в stderr промис форматирования реджектится → VS Code пишет
  «provider FAILED». Баннер фиксерa (`PHP CS Fixer …` / `PHP runtime:` /
  `Loaded config…` / `Running analysis…`) ВСЕГДА уходит в stderr — даже с
  `--format=json` → каждое сохранение уже-чистого по правилам файла падало
  (симптом 2). Вишка: `@PSR12` не включает `array_indentation`, поэтому
  визуально кривые массивы фиксер считает «чистыми» (`files:[]`) и упирается
  ровно в этот баг.

**Доказанные НЕ-решения (не пытаться):**

- `php-cs-fixer.ignorePHPVersion: true` → deprecated env
  `PHP_CS_FIXER_IGNORE_ENV` (двойной шум), наш WARN не глушит.
- Проектный `.php-cs-fixer.php` в корне — якорь cwd, а не конфиг.
- cwd = корень проекта → вместо WARN появляется ДРУГОЙ («running on PHP X,
  but the minimum … is Y») — неприемлемо для машинного сетапа.
- `Config::setPhpVersion()` в 3.95 нет; CLI-флага `--php-version` нет.

**Фикс — машинный wrapper** (шаблоны: `tools/machine/`, подключается user
settings ключом `"php-cs-fixer.executablePath"`):

1. `cd ~/.config/vscode-php-cs-fixer` + служебный `composer.json` с
   `config.platform.php` = major.minor runtime → нет WARN. Только platform,
   БЕЗ `require.php` (иначе `getMinSemVer()` возьмёт минимум из объединения
   кандидатов и WARN вернётся).
2. Фильтр баннера из stderr (grep -v по 4 сигнатурам) → при `files==0` stderr
   пуст → провайдер резолвится. Настоящие ошибки проходят насквозь.
3. Правило `array_indentation` в машинном/воркспейс/проектном конфигах —
   кривые отступы массивов реально чинятся.

**Обслуживание:** при апгрейде PHP обновить `config.platform.php` в служебном
composer.json (`php -r 'echo PHP_MAJOR_VERSION,".",PHP_MINOR_VERSION;'`),
иначе WARN вернётся (runtime новее минимума).

**Регресс-чек** (реплика спавна расширения — из глубокого каталога без
composer.json):

```bash
~/.config/vscode-php-cs-fixer/php-cs-fixer-wrapper.sh fix --using-cache=no \
	--format=json --config=~/.config/vscode-php-cs-fixer/.php-cs-fixer.php \
	--path-mode=override <файл.php>
```

Ожидания: уже-чистый файл → `files:[]`, stderr ПУСТ, exit 0; кривой массив →
`files:[1]`, отступы нормализованы; негатив-контроли — прямой бинарарь без
wrapper даёт WARN, wrapper с битым `--config` → текст ошибки виден, exit 16.

## Инсталлы отдельным корнем (WP/Bitrix вне воркспейса)

Конфиг phpantom — уже глобальный (работает везде). PHP-стиль — скопировать
проектный `.php-cs-fixer.php` в корень инсталла, finder ограничить своим
кодом (например `wp-content/themes`); при composer-зависимости php-cs-fixer
редактор отформатирует через phpantom (авто-детект), иначе — терминал:
`vendor/bin/php-cs-fixer fix` или глобальный CLI. Blade — табы ×2
глобально через `bladeFormatter.*` в user settings. `search.exclude`/
`watcherExclude` user-уровня уже покрывают типовые каталоги (vendor,
node_modules, wp-ядра).

## Почему НЕ Intelephense и НЕ DEVSENSE PHP Tools

| Кандидат | Проблема |
|---|---|
| Intelephense | rename symbol, organize imports — **платные** (freemium) |
| DEVSENSE PHP Tools | значительная часть возможностей **платная** |
| GitLens (для полноты) | часть функций платная |

Доктрина воркспейса: только полностью бесплатные расширения
(ARCHITECTURE.md, принцип 2). Оба кандидата — в `unwantedRecommendations`.

Альтернатива — **phpantom** (Rust, MIT):

- не вешается на больших базах: WP-инсталлы сканируются полностью
  (полный резолв WP/ACF/CF7-символов, docs/phpantom-wordpress.md), Bitrix —
  тем более plain-PHP full-scan;
- Laravel + Blade из коробки (виртуальная PHP-препроцессация шаблонов);
- чужая диагностика гасится **глобальными** path-ignore без потери
  индексации и F12 — тот эффект, ради которого обычно мучают exclusions
  у Intelephense/PHP Tools.

## Регресс-чеки

1. `cd tools/intellisense-check && npm test` — IntelliSense-автотест
   (чистый инстанс VS Code).
2. JSONC-валидация `.vscode/settings.json` и `.vscode/extensions.json`.
3. Чек-лист инвариантов: Problems не содержит vendor/bitrix/wp-ядер; F12
   в vendor открывает файл; `Ctrl+Shift+I` ≡ `Ctrl+S` по php/blade/vue/js/
   css/json/toml/rust; отступы — табы ×2 (кроме json/yaml/toml).

---

## См. также

- [IntelliSense CSS/Vue/Laravel](vue-css-intellisense.md) — настройка подсказок без шума
- [Productivity Power-Ups](power-ups.md) — задачи и keybindings
