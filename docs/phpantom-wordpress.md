[← Предыдущий гайд](vue-css-intellisense.md) · [К README](../README.md) · [Следующий гайд →](rust-navigation-fix.md)

# PHPantom + WordPress: полное IntelliSense в Code OSS (на примере WP-инсталла и Sage-темы)

> Паттерн настройки статанализа PHP для WP-инсталлов (темы на Sage/Acorn,
> плагины, ACF). Дата: 2026-09-18, phpantom_lsp 0.10.0 + расширение
> `phpantom.phpantom` ≥0.6.1. Регрессионные чеки — в конце.

## TL;DR — правила

1. **WP-проект открывать от корня инсталла** (`<wp-инсталл>`), а не папкой
   темы/плагина. composer.json в корне WP нет → PHPantom работает в plain-PHP
   full-scan: индексируются `wp-includes/`, `wp-admin/`, `wp-content/plugins/`
   (все WP/ACF/CF7-функции резолвятся, F12 уводит в реальные исходники).
   Анти-паттерн (тема как корень воркспейса): WP-символы теряются —
   измерено 1313 диагностик против 71 (см. историю ниже).
2. **Тема — вложенный git-репозиторий, её `.gitignore` режет `/vendor`** —
   walker PHPantom (ignore-crate) уважает `.gitignore`, и Acorn выпадает из
   индекса. Лечение: файл `.ignore` в корне темы с negation (приоритет
   `.ignore` ВЫШЕ `.gitignore`; git и VS Code search не затрагиваются —
   `search.exclude **/vendor` перекрывает):

   ```gitignore
   !vendor/
   !vendor/**
   ```

3. **Guarded-хелперы Acorn** (`view()`, `app()` объявлены в vendor внутри
   `if (! function_exists(...))`) байт-сканер не видит вне composer-режима
   (Phase 1.75 требует `autoload_files.php` от composer-корня). Лечение —
   editor-стабы в теме: `stubs/editor/*.php`, объявления БЕЗ guard
   (иначе сканер не проиндексирует), файлы нигде не `require`.
4. **Внешние инструменты без исходников в дереве** (WP-CLI): editor-стабы
   (`stubs/editor/wp-cli-stubs.php`) либо `composer require --dev` реального
   пакета — тогда стабы удалить.
5. **Конфиг — ТОЛЬКО глобальный** `~/.config/phpantom_lsp/.phpantom.toml`
   (`phpantom_lsp init --global`): нейтральные дефолты + path-правила
   `[[diagnostics.ignore]]` для ЧУЖОГО кода (`vendor/**`, `wp-includes/**`,
   `wp-admin/**`, `wp-content/plugins/**`, `wp-content/mu-plugins/**`) +
   message-правило WP_Post-шума. Проектных `.phpantom.toml` НЕ держать:
   проектный `[[diagnostics.ignore]]` ЗАМЕНЯЕТ глобальный массив правил
   (эмпирика 0.10.0), а path-правила в проектах без таких путей просто не
   совпадают. Подавлять диагностику СВОЕГО кода глобально нельзя.

## Как это диагностировать (CLI)

```bash
# как в редакторе: project-root = корень WP, PATH = код темы
phpantom_lsp analyze <wp-инсталл>/wp-content/themes/<тема>/app \
  --project-root <wp-инсталл> --no-colour
```

Цель — 0 `unknown_class` / `unknown_function`. Идентификаторы диагностик:
`unknown_class`, `unknown_function`, `unknown_member`, `type_mismatch_*`,
`invalid_laravel_*`, … Полный реестр: docs.rs phpantom_lsp → configuration.md.

## Механика PHPantom (что важно знать)

- **Composer-режим**: composer.json в корне воркспейса → autoload PSR-4/classmap,
  vendor из `installed.json`. **Plain-PHP режим**: без composer.json → full-scan
  всего дерева, gitignore-aware (`ignore` crate; вложенные репозитории применяют
  свои `.gitignore` — источник сюрпризов, см. п.2 TL;DR).
- Резолюция функций: топ-левел объявления индексируются сканером; объявления
  внутри `function_exists`-обёрток — только через composer `autoload_files`
  (Phase 1.75). Поэтому в plain-PHP режиме guarded Laravel/Acorn-хелперы
  требуют стабов.
- `collect()` и прочие Laravel-хелперы могут резолвироваться встроенной
  Laravel-осведомлённостью LSP — это не значит, что vendor индексируется.
- `.phpantom.toml` проектный мерджится поверх глобального по ключам, НО
  массив `[[diagnostics.ignore]]` проектный ЗАМЕНЯЕТ глобальный целиком
  (эмпирика 2026-09-18: с проектным конфигом у <wp-инсталл> глобальные
  path-правила переставали действовать). Отсюда политика «только глобальный
  конфиг». Оба файла watcher'ятся, большинство настроек применяется без
  рестарта (indexing/php version — требуют рестарта).
- `[[diagnostics.ignore]]`: `message` (regex) / `path` (glob) / `identifier`.
  Path-правила гасят ТОЛЬКО диагностику в чужих путях — индексация, F12 и
  completions не затрагиваются («Problems — только мой код»). Пример
  message-правила — WP-шум (динамические свойства меню на `WP_Post`,
  навешиваются в рантайме через `wp_setup_nav_menu_item()`):

  ```toml
  [[diagnostics.ignore]]
  identifier = "unknown_member"
  message = "^Property '[^']+' not found on class 'WP_Post'$"
  ```

## Политика LSP-бинарников (главное правило машины)

**LSP берём из расширения Code OSS, если расширение есть; нет расширения —
системный пакет (pacman на CachyOS/Arch). Никаких ручных cargo/composer-копий
рядом.**

- Расширение PHPantom владеет бинарником: кеш
  `~/.config/Code - OSS/User/globalStorage/phpantom.phpantom/bin/<tag>/<platform>/phpantom_lsp`
  + маркер `bin/latest.json` (`{"tagName": "..."}`), autoUpdate обновляет кеш.
- НЕ задавать `phpantom.serverPath` — закрепление пути отключает autoUpdate.
- CLI-мост (для `analyze` в регресс-чеках): `~/.local/bin/phpantom_lsp` —
  sh-обёртка, читающая `latest.json` и exec'ающая бинарник из кеша расширения.
  Один источник истины, обновляется вместе с расширением.

## Файлы сетапа <wp-инсталл> / <тема> (эталон)

| Файл | Назначение |
|---|---|
| `wp-content/themes/<тема>/.ignore` | вернуть vendor темы в индекс (п.2) |
| `~/.config/phpantom_lsp/stubs/*.php` | канонические editor-стабы (`view()`, `app()`, `e()`, WP_CLI) — ЕДИНСТВЕННОЕ место правки |
| `wp-content/themes/<тема>/stubs/editor/*.php` | симлинки на глобальные стабы (walker индексирует симлинки — проверено) |
| `~/.config/phpantom_lsp/.phpantom.toml` | ЕДИНСТВЕННЫЙ конфиг: дефолты + 5 path-правил чужого кода + WP_Post-шум |

## Новая Sage/WP-тема — подключение одной командой

У phpantom 0.10.0 нет нативных глобальных стабильных путей (Config: php /
diagnostics / indexing / semantic_tokens / formatting / phpstan / phpcs /
mago / laravel — docs.rs). Поэтому канон — `~/.config/phpantom_lsp/stubs/`,
в тему кладутся симлинки (walker их индексирует; в git безвредны — стабы
editor-only, в runtime не подключаются). `.ignore` принципиально per-tree:
перебивает `/vendor` из `.gitignore` самой темы.

```bash
T=<wp-инсталл>/wp-content/themes/<тема>
mkdir -p "$T/stubs/editor"
ln -s ~/.config/phpantom_lsp/stubs/acorn-helpers.php "$T/stubs/editor/"
ln -s ~/.config/phpantom_lsp/stubs/wp-cli-stubs.php "$T/stubs/editor/"
printf '!vendor/\n!vendor/**\n' > "$T/.ignore"
```

Всё остальное (ignore-правила, PHPCS-off, WP_Post) — уже глобально в
`~/.config/phpantom_lsp/.phpantom.toml` и в новых проектах делать нечего.

## Регрессионные чеки (после изменений конфигов/темы)

```bash
# тема: 0 unknown_class/unknown_function (остались только реальные type-находки)
phpantom_lsp analyze <wp-инсталл>/wp-content/themes/<тема>/app \
  --project-root <wp-инсталл> --no-colour

# чужой код: каждый файл — 0 errors (глобальные path-правила; было 2/70/8/5)
for f in wp-includes/plugin.php wp-includes/media.php \
  wp-content/plugins/contact-form-7/includes/contact-form-functions.php; do
  phpantom_lsp analyze "<wp-инсталл>/$f" --project-root <wp-инсталл> --no-colour
done
phpantom_lsp analyze <laravel-проект>/vendor/laravel/framework/src/Illuminate/Routing/Router.php \
  --project-root <laravel-проект> --no-colour

# <laravel-проект> (Laravel-контроль, composer-режим): 0 not-found,
# ~36 мягких диагностик (24 invalid_laravel_trans и пр.) — счётчик не должен расти
phpantom_lsp analyze <laravel-проект>/app \
  --project-root <laravel-проект> --no-colour

# сьют темы
cd <wp-инсталл>/wp-content/themes/<тема> && vendor/bin/pest

# автотест редактора: реальный VS Code (test-electron) + PHPantom на воркспейсе
# <wp-инсталл> — F12 (ACF/wp-includes/vendor/стабы), completion, Problems 0 «not found»
WP_ROOT=<wp-инсталл> WP_THEME=<тема> npm run test:phpantom   # из tools/intellisense-check
```

## Известные нюансы phpantom 0.10.0 (эмпирика, учтена в автотесте)

- **Completion-подсказки функций приходят с сигнатурой в label**
  («`get_field($selector, $post_id = ...)`») — в автотестах матчить по префиксу
  имени, не точным равенством.
- **Символы с несколькими кандидатами в индексе** (глобальный стаб `view()` +
  namespaced `Roots\view` + guarded-объявления): definition-провайдер (F12)
  может вернуть пусто, при этом hover и диагностика работают корректно —
  это коллизия кандидатов, а не «пропавший» символ.
- **Диагностики, опубликованные при открытии файла до готовности фоновой
  индексации** (большое дерево ~19k php-файлов), сами не пересчитываются:
  переоткрытие файла или любая правка (didChange) пересчитывает их. После
  прогрева сессии (~10–60 с) всё стабильно. Практически: сразу после
  `PHPantom: Restart Language Server` на WP-инсталле открытые файлы могут
  показать ложные `unknown_function` (например, функции темы) — дай индексу
  прогреться и переоткрой/подправь файл: CLI-прогон подтверждает, что резолв
  на готовом индексе полный. Ошибки «мигрируют» между файлами — это тайминг
  открытия, а не реальный код.
- **Plain-режим без `[php] version`** анализирует дефолтной версией — для
  темы <тема> (`requires >=8.4`) расхождений с явным `8.5` не выявлено
  (состав находок идентичен).
- **PHPCS-прокси phpantom** («owner phpantom», source `phpcs`, коды PSR12.*):
  phpantom сам находит системный phpcs в `$PATH` и гоняет его на каждом
  сохранении со стандартом по умолчанию (PSR12) — шум для WP-тем.
  Выключено глобально: `[phpcs] command = ""` в `~/.config/phpantom_lsp/.phpantom.toml`
  (пустая строка = disable, config-schema.json). Аналогично настраиваются
  прокси `phpstan` и `mago`.
- **Blade-виртуализация**: `{{ $x ? '…' : '' }}` (тернарник с пустой
  строкой в интерполяции) даёт 2 ложных `syntax_error` — артефакт
  виртуализатора, шаблон валиден. `$data`/`$attrs` в шаблонах блоков
  приходят в рантайме от рендерера — `unknown_variable` по ним ложные
  (общее ограничение: переменные view статически не резолвятся).

## История (кратко, для контекста)

- До: 71 unknown-диагностика в редакторе (WP_CLI ×31, классы без `use` в
  namespace ×31, `view()` ×3, Acorn-классы ×4) — vendor невидим (gitignore),
  WP-CLI отсутствует в дереве, реальные дефекты импортов.
- После: 0 unknown; в Problems остаются только настоящие type-находки
  (14 type_mismatch_argument + 4 type_mismatch_return + 4 unused_variable
  в `app/`) — это ценность статанализа, чинить по мере сил, не подавлять.
- Второй проход (вечер 18.09): «Problems — только мой код». Открытые по F12
  чужие файлы сыпали 2–70 ошибок каждый (wp-includes, плагины, vendor
  Laravel). Глобальные path-правила погасили их до 0 (индексация/F12 не
  тронуты); проектный конфиг <wp-инсталл> удалён (его ignore-массив заменял
  глобальный), WP_Post-правило перенесено в глобальный конфиг. 2 из 4
  unused_variable в теме исправлены вручную — в `app/` осталось 20 находок.

---

## См. также

- [IntelliSense CSS/Vue/Laravel](vue-css-intellisense.md) — подсказки в Blade/Vue-проектах
- [Чистые Problems](clean-problems-formatting.md) — глобальные path-ignore phpantom
