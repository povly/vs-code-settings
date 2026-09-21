[← Предыдущий гайд](rust-senior-setup.md) · [К README](../README.md) · [Следующий гайд →](power-ups.md)

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

# PHPCS-прокси выключен (стиль — Pint/php-cs-fixer, не PHPCS)
[phpcs]
command = ""
```

Политика: **только глобальный конфиг** — проектный `[[diagnostics.ignore]]`
заменяет массив целиком (эмпирика 0.10.0, см. docs/phpantom-wordpress.md).
Проверка на любом инсталле:

```bash
phpantom_lsp analyze <путь своего кода> --project-root <корень инсталла> --no-colour
```

## Матрица форматтеров (один на язык → нет диалога «Multiple Formatters»)

| Язык | Форматтер | Где настроено | Отступ |
|---|---|---|---|
| PHP | junstyle.php-cs-fixer | машинный `~/.config/vscode-php-cs-fixer/` + проектный `.php-cs-fixer.php` | табы ×2 |
| Blade | shufo.vscode-blade-formatter | `bladeFormatter.format.useTabs/indentSize/wrapAttributes` | табы ×2 |
| JS, TS, JSX, TSX, Vue, HTML, CSS, SCSS, MD | Prettier | явные `[lang]`-блоки + `prettier.useTabs/tabWidth/singleAttributePerLine` | табы ×2 |
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
  HTML-атрибуты в php-файлах не переносит. Выносить разметку в blade или
  переносить вручную; менять `[php]`-форматтер на HTML-форматтер нельзя —
  сломается «один форматтер на язык» и табы ×2 в PHP.


## PHP: табы (php-cs-fixer), Rector

- **Канон — php-cs-fixer, НЕ Pint** (эмпирика 2026-09-21, php-cs-fixer 3.95 /
  Pint 1.32): правило `indentation_type` не конфигурируется и берёт целевой
  отступ из `Config->getIndent()`, который Pint не экспонирует → Pint всегда
  даёт 4 пробела. Рецепт `pint.json {"rules":{"indentation_type":true}}` из
  ранних версий этого гайда был ошибочен — pint из конвейера убран.
- **Три уровня конфига** (правила одни: `setIndent("\t")` + `@PSR12` +
  `indentation_type`):
  1. машинный `~/.config/vscode-php-cs-fixer/.php-cs-fixer.php` — подключён в
     user settings ключом `php-cs-fixer.config` (путь с `~/` поддерживается
     расширением) → действует в **любом** открытом корне; шаблон и снимок
     настроек — [`tools/machine/`](../tools/machine/README.md);
  2. воркспейс `.vscode/.php-cs-fixer.php` — перекрывает машинный на
     workspace-уровне;
  3. проектный `.php-cs-fixer.php` в корне — self-sufficiency для CLI/CI и
     других машин (junstyle находит его дефолтным поиском: корень + `.vscode/`).
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
- **phpantom `[formatting]` не используется**: встроенный форматтер PER-CS 2.0
  зашит на 4 пробела без опций отступа (config-schema.json: только
  pint/php-cs-fixer/phpcbf-команды + timeout). Единственный `[php]`-форматтер —
  junstyle (defaultFormatter), провайдер phpantom не вызывается.
- **Анти-паттерн**: `laravel.vscode-laravel` как `[php]`-форматтер в user
  settings — его Pint-форматирование зависит от `vendor/bin/pint` в корне
  проекта (в WP-инсталлах не работает вовсе) и даёт 4 пробела вместо табов.

## Инсталлы отдельным корнем (WP/Bitrix вне воркспейса)

Конфиг phpantom — уже глобальный (работает везде). PHP-форматтер — тоже:
машинный конфиг + ключ `php-cs-fixer.config` в user settings действует в любом
открытом корне без копирования файлов (junstyle ищет конфиг в корне
workspace/`.vscode/`, но ключ user-настроек задаёт путь явно). Для CLI-прогонов
по инсталлу — скопировать проектный `.php-cs-fixer.php` в корень инсталла,
finder ограничить своим кодом (например `wp-content/themes`). Blade — табы ×2
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
