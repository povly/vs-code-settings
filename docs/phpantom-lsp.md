[← Предыдущий гайд](phpantom-wordpress.md) · [К README](../README.md) · [Следующий гайд →](rust-navigation-fix.md)

# PHPantom (phpantom_lsp): возможности PHP language server — справочник

> Обзор и конфигурация PHP-LSP `phpantom.phpantom` (сервер — Rust-проект
> [phpantom_lsp](https://github.com/PHPantom-dev/phpantom_lsp), MIT). Дата:
> 2026-10-06, сервер **0.11.0** (бинарь extension ≥ 0.6.1 качает сам;
> релизы GitHub опережают качалку расширения — обновление:
> `phpantom_lsp update` / подсказка — `tools/workspace-doctor.sh` чек 10;
> `update` заменяет бинарь в кеше расширения по `latest.json`, расширение
> при своём апдейте может перекачать свою версию — doctor-чек это ловит),
> конфигурация — `~/.config/phpantom_lsp/.phpantom.toml` (шаблон:
> `tools/machine/phpantom.toml`, деплой — `tools/machine/install.sh`).
> Источники: README и `config-schema.json` репо, notes релизов 0.8.0–0.11.0,
> [документация-сайт](https://phpantom-dev.github.io/phpantom_lsp/).
> Паттерн WordPress-инсталлов — отдельный гайд
> [phpantom-wordpress.md](phpantom-wordpress.md); политика «Problems — только
> свой код» — [clean-problems-formatting.md](clean-problems-formatting.md).

## TL;DR — что это даёт

- **PHP-LSP на Rust**: готовность ~2 с (из кеша), ~578 MB RAM на Laravel
  5,1K PHP-файлов — против phpactor 3 мин 17 с до готовности (замеры upstream).
- **Типизация уровня PHPStan**: generics/`@template`, conditional return
  types, `@phpstan-type`-алиасы, shapes, инференс closure-параметров — без
  ide-helper и доступа к БД.
- **Laravel и Blade глубоко**: ключи `route()/config()/view()/__()/env()` —
  живые символы с typo-чеком; компоненты `<x-*>`/`<livewire:*>`; контракт
  `view()`-вызова (= Bladestan в редакторе).
- **Внешние анализаторы in-server**: PHPStan, PHPCS, Mago — их отчёты
  становятся quick-fix'ами. Все отключаются одной строкой `command = ""`.
- **CLI**: `analyze` / `fix` / `update` — работает и на проектах без
  composer.json (WordPress, legacy).

## Производительность и сравнение

Замеры upstream на production-Laravel 5,1K PHP-файлов + 1,3K Blade
(«Time to ready» — холодный старт до полной типизации):

| | PHPantom | Intelephense | PHP Tools | Phpactor | PHPStorm |
|---|---|---|---|---|---|
| Готовность (из кеша) | 2 с | 11 с (1 с) | 10 с | 3 мин 17 с (4 с) | 1 мин 7 с (5 с) |
| RAM | 578 MB | 766 MB | 594 MB | 467 MB | 2 GB |
| Дисковый кеш | — | 51 MB | — | 2,3 GB | 379 MB |

Против Intelephense вне paywall: продвинутая навигация (call/type hierarchy,
go-to-implementation, code lens), editor-философия (semantic tokens, inlay
hints, auto-import), built-in диагностика, интеграция внешних анализаторов,
conditional return types и продвинутые PHPDoc-типы. Парсер — [Mago](https://github.com/carthage-software/mago);
стабы стандартной библиотеки — phpstorm-stubs, вшиты в бинарь (ничего не
скачивается в рантайме).

## LSP-возможности

- **База**: completion, hover, signature help, go-to-definition, find
  references, document/workspace symbols, rename.
- **Продвинутая навигация**: call hierarchy, type hierarchy,
  go-to-implementation / type-definition, code lens. С 0.10.0 индексация
  всего проекта включена по умолчанию (full workspace indexing) — Find
  References / Rename / Implementation / Type Hierarchy работают по всем
  файлам проекта, а не только по открытым.
- **Editor-возможности**: semantic tokens (режимы `contextual`/`full`/`off`),
  inlay hints (в т.ч. инференс параметров closure), auto-import, smart
  select, folding ranges, document links, форматирование.

## Типизация

- Generics / `@template` (в т.ч. на `@method`-тегах, `@mixin` от
  template-параметра, `new $var()` от `class-string<T>`).
- Array/object shapes: литеральные массивы дают key-completion без аннотаций;
  `array_map` наследует тип от callback'а (`fn(Item $i): string => $i->id` →
  `list<string>`); `#[ArrayShape]`.
- Conditional return types: PHPStan-стиль `@return ($x is ... ? A : B)`
  резолвится в конкретную ветку на call-site (с пересечением классов —
  Mockery `mock(Foo::class)` даёт `Foo&MockInterface`).
- Алиасы `@phpstan-type` / `@phpstan-import-type`, `object{...}`,
  `@phpstan-sealed`, pseudo-types.
- Инференс closure-параметров: `$users->map(fn($u) => $u->name)` — `$u`
  выводится из generic-контекста коллекции.
- Type narrowing: `instanceof`, type-guard-функции, `in_array()` strict,
  `assert()`, `@phpstan-assert-if-true/-if-false`, составные `&&`/`||`,
  `match(true)`.
- PHP 8.4/8.5 end-to-end: property hooks, asymmetric visibility, pipe
  operator.

## Диагностика (built-in)

Неопределённые/неиспользуемые переменные (unused — с приглушением),
unknown symbols/members, `type_mismatch_argument` / `type_mismatch_return` /
`type_mismatch_property`, PSR-4 mismatch (namespace/имя файла ≠ путь) с
quick-fix, case-sensitivity ссылок (ловит баг «работает на macOS, падает на
Linux»), invalid class-like kind (`new` абстрактного, `extends` final …).

Тумблеры `[diagnostics]` (дефолты из схемы):

| Ключ | Дефолт | Что делает |
|---|---|---|
| `unresolved-member-access` | `false` | сообщать о `->`/`::` на нерезолвленном субъекте (шумно на нетипизированном коде) |
| `extra-arguments` | `false` | лишние аргументы вызова (PHP их молча игнорирует) |
| `report-magic-properties` | `false` | неизвестные свойства при `__get` (паритет PHPStan) |
| `downgrade-nullable-argument-mismatch` | `false` | type_mismatch_argument из-за «лишнего» null → warning |
| `workspace` | `false` | диагностика ВСЕГО проекта фоном после старта (задорого на каждой сессии — opt-in) |
| `workspace-external` | `true` | внешний тул по всему проекту (действует только при `workspace = true` и только если у тула есть свой конфиг в корне: `phpstan.neon`/`phpcs.xml`/`mago.toml`) |

Подавление — `[[diagnostics.ignore]]`: правило с любым сочетанием `message`
(regex) + `path` (glob от корня) + `identifier` (код диагностики). Готовой
набор для vendor/ядер CMS — в шаблоне `tools/machine/phpantom.toml`.

## Внешние анализаторы: PHPStan / PHPCS / Mago

PHPantom запускает внешние тулы **in-server** и превращает их отчёты в
диагностики и quick-fix'ы: PHPStan (editor-mode на каждом сохранении), PHPCS
(при каждом сохранении), Mago lint/analyze (только при `mago.toml` в корне).
Автодетект команды: `vendor/bin/<tool>` → `$PATH`.

**Рецепт: отключить PHPCS-прокси** (кейс воркспейса: phpantom находил
системный `phpcs` 4.0.4 в `$PATH` и сниффил PSR12-стилем при каждом
сохранении Laravel-файла без `phpcs.xml` — поток находок в Problems):

```toml
# ~/.config/phpantom_lsp/.phpantom.toml
[phpcs]
command = ""   # пустая строка = disable (config-schema.json)
```

Схема каждой секции одинакова: `command` (unset = автодетект, `""` =
отключить, строка = путь), `timeout` (phpcs/phpstan: 30 с / 60 с),
у phpstan ещё `memory-limit` (`1G`). Воркспейс-политика: phpstan оставлен
включённым (в Laravel-проектах larastan даёт ценную типизацию), phpcs
выключен навсегда — стиль кода задаёт php-cs-fixer
([clean-problems-formatting.md](clean-problems-formatting.md)).

## Форматирование (`[formatting]`)

Встроенный форматтер — PER-CS 2.0. Если в `composer.json` require-dev есть
php-cs-fixer или PHP_CodeSniffer — phpantom использует их вместо
встроенного. Явный конфиг (`pint`/`php-cs-fixer`/`phpcbf` — команда или
`""` для отключения, `timeout` 10 с) приоритетнее автодетекта. Форматтер
`[php]` в воркспейсе — сам phpantom (defaultFormatter; junstyle снят
02.10.2026): автодетект подхватывает `vendor/bin/php-cs-fixer` → табы ×2 из
проектного `.php-cs-fixer.php`.

## Laravel

- **Строковые ключи — символы**: `route()`, `config()`, `view()`, `__()`,
  `trans_choice()`, `Lang::hasForLocale()`, `Config::getMany()` и семейство
  (`redirect()`/`url()`/`response()`, фасады `Redirect`/`URL`/`Response`,
  signed-URL-билдеры, `Route::is()`/`$request->routeIs()` с glob-матчингом):
  completion, hover (имя + файл + строка перевода), go-to-definition,
  диагностика опечаток (`route('dashbaord')` — ошибка). Ключи, зарегистрированные
  пакетами через service providers, тоже находятся.
- **env() проиндексирован**: `env('APP_NAME')`/`Env::get()` — completion из
  `.env`/`.env.example`, hover со значением и файлом, Find References включая
  чтения в `config/*.php`. Значения credential-имён (`APP_KEY`,
  `STRIPE_SECRET`) показываются как «set» — не светятся на скриншарах.
  Отсутствия имени в `.env` НЕ ошибка (runtime-окружение не на диске).
- **Роуты**: параметры `route('users.show', ['user' => $u])` — из `{param}`
  URI с учётом префиксов групп; `Route::resource()`/`apiResource()` выводят
  URI, которых нет в коде. Массив-коллблы `[Controller::class, 'method']` —
  навигация/rename/completion имени метода (как в `routes/web.php`).
- **Artisan**: имя команды — completion/hover (аргументы+опции)/F12/чек
  опечаток, как бы ни объявлено (`$signature`/`$name`/защищённое свойство);
  грамматика `$signature` типизирует `$this->argument()`/`option()`
  (`{--fresh}` → bool, `{--since=}` → `?string`, `{tags*}` → `list<string>`),
  массив `Artisan::call()` — ключи целевой команды.
- **config() типизирован** из `config/*.php` проекта (скаляры — в базовые
  типы, `env()` — через fallback, вложенные массивы — shapes с типизированными
  ключами; дефолты фреймворка закрывают непublished-ключи).
- **Eloquent**: relations/scopes/accessors/casts/Builder-цепочки end-to-end,
  macros — как реальные методы, custom builder через `#[UseEloquentBuilder]`,
  completion строк relation/column в query-строках. Инференс свойств моделей —
  из `database/schema`-дампов и миграций (`[laravel]` в конфиге, оба on по
  умолчанию) — без ide-helper и без БД.
- **Контейнер и auth**: `app('cache')` → класс биндинга, `auth()->user()` →
  настроенная модель, строки авторизации → gate-определение или policy-метод.
- **Path-хелперы**: `base_path('routes/web.php')`, `config_path()` и пр. —
  аргумент кликабелен (go-to-definition в файл).

## Blade

Шаблоны препроцессируются в виртуальный PHP — работают completion, hover,
go-to-definition, диагностика, semantic tokens, inlay hints (в т.ч. хелперы
внутри `@php … @endphp`).

- **Переменные шаблона — из цепочки деклараций**, а не по догадке:
  `@bladestan-signature`-докблок (контракт) → `@props`/`@aware` → класс
  компонента / Livewire `$this` → `View::share()`/`View::composer()` из
  service providers → декларации layout'а (наследуются шаблонами, что его
  расширяют) → инференс с call-sites рендера. Каждый источник дополняет
  пробелы, а не перебивает. Инжектируемые Blade переменные (`$attributes`,
  `$slot`, `$componentName`, `$errors`, `$loop`) учтены.
- **Каждый способ рендера — render-site**: `view()`, `View::make()`,
  `Route::view()`, `Response::view()`, `first()`/`renderWhen()`/
  `renderUnless()`/`renderEach()`, mailable `new Content(view:…)` и
  `$this->view()`, `@include`-семейство, `@extends`, `@each` — навигация,
  hover, передача данных в шаблон.
- **Контракт `view()`-вызова**: шаблон с `@bladestan-signature` держит
  callers по счёту — недостающая переменная, несовместимый тип, лишний ключ
  reported на вызове. Это редакторная половина Bladestan: одна аннотация —
  те же ошибки live и в CI. Шаблон без деклараций не проверяется (opt-in).
- **Компоненты first-class**: `<x-alert>`, `<x-forms.date-picker>`,
  `<livewire:counter>` резолвятся в класс/шаблон: Ctrl+Click, completion
  `<x-`/`<livewire:`, атрибуты — из конструктора/`mount()`/`@props`; тег
  проверяется как вызов (лишний/неверный аргумент — ошибка на теге),
  `$component` типизирован внутри тега.
- **Пары `@section`↔`@yield`, `@stack`↔`@push`**: Ctrl+Click по имени —
  вторая половина; `@section`/`@push` под layout-цепочкой, которая нигде не
  рендерится, — диагностика.
- **Директивы**: `@`-completion со вставкой пары `@end…`; неверное/незакрытое
  закрытие блока — ошибка в шаблоне, а не в скомпилированном кеше.
- **Известные артефакты виртуализатора** (эмпирика
  [phpantom-wordpress.md](phpantom-wordpress.md)): тернарник с `''` в
  интерполяции даёт 2 ложных `syntax_error`; `$data`/`$attrs` блоков — ложные
  `unknown_variable` (общее ограничение: переменные view статически не
  резолвятся).

## Рефакторинги и code actions

- Rename символа; с 0.9.0 — rename с полного FQCN (между namespace за один
  шаг) и rename namespace (несколько сегментов, перенос PSR-4-каталогов,
  обновление ссылок по проекту).
- Extract: method/function, variable (extract/inline), constant, interface
  (сохраняет `@template`); promote constructor parameter; generate
  constructor / getters+setters / implement interface methods.
- Rewrite: FQCN → import (в т.ч. «заменить все FQCN файла»), arrow fn ↔
  closure (авто-`use()`), switch → match, null-check simplification,
  конверсия string interpolation.
- Quick-fix'ы: PSR-4 mismatch (namespace/имя), регистр имени класса,
  PSR-4/classmap-загрузку.

## Проектная осведомлённость

- **Точность composer-автолоадера**: completion/F12 предлагают только классы,
  которые автолоадер реально загрузит (нет ложных кандидатов из
  internal/дублей vendor). PSR-4 on-demand, classmap/`autoload_files`,
  `require_once`-дискавери функций.
- **Ранжирование completion по provenance**: код проекта → core/stabs →
  явные зависимости (`require`/`require-dev`) → транзитивный vendor.
- **Без composer.json** (WordPress, legacy): plain-PHP режим — классы
  индексируются сканом дерева, stderr отмечает fallback (детали:
  [phpantom-wordpress.md](phpantom-wordpress.md)). Drupal: детект по
  composer.json, индексация `.module`/`.install`/`.theme`, `.gitignore`
  обходится.
- **Свежесть**: создание/удаление PHP-файлов вне редактора (`git checkout`)
  и смена `composer.json`/`composer.lock` подхватываются без рестарта.
- **Стратегии индексации** `[indexing]`: `full` (дефолт) / `composer` /
  `self` / `none`; `exclude` (gitignore-синтаксис) и `extensions` (напр.
  `module`/`inc`/`theme`).

## CLI

```bash
# диагностика своего кода (path-правила глобального конфига действуют)
phpantom_lsp analyze <путь> --project-root <корень проекта> --no-colour

# автофиксы встроенных диагностик
phpantom_lsp fix <путь> --project-root <корень>

# форматирование всего проекта тем же форматтером, что и редактор
# (0.11.0; --check — CI-гейт: exit 2, если есть неформатированные)
phpantom_lsp format [пути] --check --project-root <корень>

# перенос класса/namespace с обновлением деклараций, импортов и PSR-4 (0.11.0)
phpantom_lsp move <from> <to> --project-root <корень>

# интерактивный генератор .phpantom.toml (0.11.0)
phpantom_lsp init

# самообновление бинаря (релизы GitHub, 6 платформ)
phpantom_lsp update --check     # dry-run: код 1, если есть апдейт
phpantom_lsp update --no-confirm
```

CLI-мост расширения — `~/.local/bin/phpantom_lsp` (sh-обёртка, читает
`latest.json` из кеша расширения и exec'ает тот же бинарь: один источник
истины, обновляется вместе с расширением; механика —
[phpantom-wordpress.md](phpantom-wordpress.md)).

## Расширение VS Code (бонусы поверх LSP)

- Бинарь сервера качает сам (`phpantom.autoDownload: true`, кеш в
  globalStorage; `phpantom.serverPath` НЕ задавать — закрепление пути
  отключает автообновление). Статус — статус-бар / `PHPantom: Show Server
  Version`; логи — Output → PHPantom.
- Раннер artisan-команд, список роутов, генерация `@property`-аннотаций
  Eloquent-моделей из живой БД, log-viewer `storage/logs/*.log`.
- Кейбиндинги воркспейса: **Alt+R / Alt+A / Alt+M / Alt+L** — роуты /
  artisan / аннотации / логи ([power-ups.md](power-ups.md)).

## Конфиг `.phpantom.toml` — справочник

Схема — `config-schema.json` в корне репо (секции: `php`, `diagnostics`,
`indexing`, `semantic_tokens`, `laravel`, `formatting`, `phpstan`, `phpcs`,
`mago`).

| Секция | Ключи (дефолты) |
|---|---|
| `[php]` | `version` — override детекта из composer.json |
| `[diagnostics]` | тумблеры (таблица выше), `workspace`, `workspace-external`, `[[diagnostics.ignore]]` |
| `[indexing]` | `strategy` = `full`, `exclude` = `[]`, `extensions` = `[]` |
| `[semantic_tokens]` | `mode` = `contextual` (\| `full` \| `off`) |
| `[laravel.schema]` | `enabled` = `true`, `paths` = `["database/schema"]` |
| `[laravel.migrations]` | `enabled` = `true`, `paths` = не-skанируемые `database/migrations` |
| `[formatting]` | `pint`/`php-cs-fixer`/`phpcbf` (unset = автодетект), `timeout` = `10000` |
| `[phpstan]` | `command`, `memory-limit` = `"1G"`, `timeout` = `60000` |
| `[phpcs]` | `command`, `standard` (unset = phpcs.xml → builtin PSR12), `timeout` = `30000` |
| `[mago]` | `command`, `lint`/`analyze` (unset = по секциям mago.toml), `lint-timeout` = `30000`, `analyze-timeout` = `60000` |

**Глобальный vs проектный конфиг.** Схема называет `.phpantom.toml`
per-project-настройкой; глобального пути в схеме нет. Канон воркспейса
(эмпирика 0.10.0, [phpantom-wordpress.md](phpantom-wordpress.md)): один
глобальный `~/.config/phpantom_lsp/.phpantom.toml` на всё (path-ignore чужого
кода + `[phpcs]` off), проектные конфиги не раскладывать — проектный
`[[diagnostics.ignore]]` **заменяет** массив целиком, а не дополняет.

Шаблон: `tools/machine/phpantom.toml`; деплой — `tools/machine/install.sh`
(идемпотентен: существующий конфиг не перезаписывает — WARN); проверка —
`tools/workspace-doctor.sh` (чеки 2–3: path-ignore ×4 + `[phpcs]` off).
После первого деплоя — `PHPantom: Restart Language Server` (или Reload
Window) в открытых окнах.

## См. также

- [PHPantom + WordPress](phpantom-wordpress.md) — паттерн WP-инсталлов, стабы, регресс-чеки
- [Чистые Problems + форматирование](clean-problems-formatting.md) — path-ignore политика, матрица форматтеров
- [Фикс phpactor/phpcs](phpactor-indexer-phpcs-fix.md) — история: PHPCS 4.x и битовая маска exit-кодов
- [Productivity Power-Ups](power-ups.md) — Alt+R/A/M/L, задачи, REST Client
- [Отдельный Laravel-корень](laravel-vue-alpine-root.md) — phpantom в проекте вне воркспейса
