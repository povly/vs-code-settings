[← Предыдущий гайд](phpantom-lsp.md) · [К README](../README.md)

# PHPantom 0.10.0: локальные патчи — паника на кириллице и форматирование

> Дата: 05.10.2026, сервер **0.10.0** (бинарь extension 0.6.1), Linux x86_64.
> Два upstream-бага, воспроизведённых на живом Laravel-корне (`<проект>`):
> паника `not a char boundary` в `throws_analysis` и тихий no-op внешнего
> форматтера. Оба закрыты локальной пересборкой бинаря; патч —
> [tools/phpantom-0.10.0-local.patch](../tools/phpantom-0.10.0-local.patch).
> Обзор возможностей сервера — [phpantom-lsp.md](phpantom-lsp.md).

## TL;DR — симптом → корень → фикс

| Симптом | Корень | Фикс |
|---|---|---|
| `panicked at src/completion/source/throws_analysis/scanning.rs:65:35: … is not a char boundary; it is inside 'п'` при code action на файле с кириллицей | сканеры ходят по байтам (`pos += 1`) и проверяют `&body[pos..pos+5] == "throw"` str-слайсом; `#`-комментарии не пропускаются — walker отдаёт мультибайту «сырой» текст | патч №1: байт-сравнения + скип `#`-комментариев |
| `Formatting failed: Failed to spawn pint: Permission denied (os error 13)` | деплой срезал exec-биты `vendor/bin/*` (см. [laravel-vue-alpine-root.md](laravel-vue-alpine-root.md), раздел «После деплоя») | `chmod +x vendor/bin/* artisan` |
| Форматирование **тихо** ничего не делает: 0 правок, без ошибок | `run_php_cs_fixer` наследует cwd процесса-LSP, а php-cs-fixer ищет конфиг от cwd, не от файла → конфига нет → пустой дефолтный finder + `--path-mode=intersection` → 0 файлов, exit 0 | патч №2: `--config=<…>` ищется от пути форматируемого файла |
| Форматирование работает, но ставит **4 пробела** (ломает CI на табах) | автодетект 0.10.0 (formatting.rs → `resolve_strategy`) проверяет **pint первым**: при `laravel/pint` в require-dev выбирается он, даже если php-cs-fixer установлен | проектный `.phpantom.toml` с `[formatting] pint = ""` — автодетект подхватывает `vendor/bin/php-cs-fixer` → табы ×2 из `.php-cs-fixer.php` |

## Баг 1: паника на мультибайтах в throws_analysis

Контекст: code action «Update docblock to match signature» (добавление/обновление
`@throws`) вызывает `find_uncaught_throw_types_with_context` →
`extract_function_body` → `find_throw_statements(&body)`. Сканеры
(`scanning.rs`, `catch.rs`, `cross_file.rs`) обходят текст побайтно и делают
спекулятивные str-слайсы:

```rust
// 0.10.0, scanning.rs:65 — паника, когда pos+5 внутри кириллицы
if pos + 5 <= len && &body[pos..pos + 5] == "throw" {
```

`#`-комментарий (`# Проверка входных данных…` — валидный PHP) не скипается,
walker заходит в кириллицу «сырыми» байтами, конец слайса попадает внутрь
символа → паника. То же место: `catch.rs` (`"throw"`, `"try"`), `cross_file.rs`
(`"new"`), `scanning.rs` (`$this->`/`self::`/`static::`-паттерны). Побочно:
ASCII-текст `# throw new X();` ложно распознаётся как реальный throw.

Минимальный репро-файл (code action внутри докблока → паника до патча,
2 действия и 0 паник после):

```php
<?php

class ReproService
{
	/**
	 * Обрабатывает полезную нагрузку каталога.
	 */
	public function process(string $payload): void
	{
		# Проверка входных данных перед обработкой
		$summary = 'сводка по каталогу товаров';
		if ($payload === '') {
			throw new \InvalidArgumentException('empty payload');
		}
	}
}
```

Фикс: сравнивать байты (`&bytes[pos..pos + 5] == b"throw"` — байтовый слайс
не паникует на границах char, семантика та же для ASCII-игл) + скипать
`#`-комментарии как `//` (skip_line_comment). Слайсы после **успешного**
байт-сравнения (`body[pos + 5..]`) остаются корректными — ASCII-совпадение
гарантирует char-границу. 5 регрессионных тестов в
`src/completion/source/throws_analysis_tests.rs` (кириллица в `#`/`//`/`/* */`/
строках для `find_throw_statements`, `find_catch_blocks`, `find_propagated_throws`).

Upstream: issue [#72](https://github.com/PHPantom-dev/phpantom_lsp/issues/72) —
тот же класс бага, другой сайт (`phpdoc/generation.rs`, закрыт в апреле);
эти места не покрыты.

## Баг 2: форматирование зависит от cwd сервера

`run_php_cs_fixer` пишет sibling-темп `.phpantom-fmt-*.php` рядом с файлом
(комментарий upstream обещает «tool config discovery walks up from the file»),
но запускает `php-cs-fixer fix --using-cache=no --quiet --no-interaction <temp>`
**без конфига и с наследованным cwd**. php-cs-fixer ищет конфиг от cwd процесса:
если LSP-сервер стартован вне корня проекта, конфига нет, дефолтный finder пуст,
`--path-mode=intersection` (дефолт) даёт 0 файлов → exit 0 → `Ok(None)` →
редактор получает «нет правок», **без единой ошибки**. Проверено симуляцией:
cwd сервера вне корня проекта → 0 правок на заведомо кривом по отступам файле.

Фикс: найти `.php-cs-fixer.php` / `.php-cs-fixer.dist.php` подъёмом от
форматируемого файла и передать `--config=<путь>` явно — форматирование
становится cwd-независимым (проверено обоими cwd: `/tmp` и корень проекта).

## Машинный уровень: что и где изменено

- Пропатченный бинарь: `~/.config/Code - OSS/User/globalStorage/phpantom.phpantom/bin/0.10.0/x86_64-unknown-linux-gnu/phpantom_lsp`
  (печатает `0.10.0-dirty`); оригинал 0.10.0 — рядом, `phpantom_lsp.orig-0.10.0`
  (откат = переименовать обратно).
- Замена живого бинаря — через `mv` (rename поверх запущенного процесса не
  падает с ETXTBSY); подхват — `PHPantom: Restart Language Server` или
  `Developer: Reload Window` в каждом открытом окне.
- Судьба при автообновлении: extension скачает новый тег → `latest.json`
  переключит wrapper на новый бинарь, патч потеряет силу. Это ожидаемо:
  к тому релизу upstream может включить оба фикса (см. раздел «Upstream»).
- Исходники патча: клон тега 0.10.0 → правки → `cargo test` → `cargo build
  --release` → замена в globalStorage. Полный git-дифф (5 файлов, +129/−16):
  [tools/phpantom-0.10.0-local.patch](../tools/phpantom-0.10.0-local.patch).
- CLI-мост `~/.local/bin/phpantom_lsp` трогать не нужно — читает `latest.json`
  и стартует тот же бинарь из globalStorage.

Пере-применение патча на новой машине/теге:

```bash
git clone --depth 1 --branch 0.10.0 https://github.com/PHPantom-dev/phpantom_lsp.git
cd phpantom_lsp && git apply /path/to/phpantom-0.10.0-local.patch
cargo test --lib throws_analysis && cargo build --release
CACHE="$HOME/.config/Code - OSS/User/globalStorage/phpantom.phpantom/bin/0.10.0/x86_64-unknown-linux-gnu"
cp -a "$CACHE/phpantom_lsp" "$CACHE/phpantom_lsp.orig-0.10.0"  # бэкап, если ещё нет
cp target/release/phpantom_lsp "$CACHE/phpantom_lsp.new" && mv -f "$CACHE/phpantom_lsp.new" "$CACHE/phpantom_lsp"
```

## Проектный уровень: рецепт форматтера (pint → php-cs-fixer)

В Laravel-корнях воркспейса, где CI — `vendor/bin/php-cs-fixer fix --dry-run`
(табы), а `laravel/pint` остался в require-dev со старта скелетона, phpantom
выберет pint → 4 пробела → расхождение с CI и `.editorconfig`. Рецепт —
проектный `.phpantom.toml` (одна секция; кладётся в git проекта):

```toml
[formatting]
pint = ""
```

Глобальные path-ignore (`vendor/**`, ядра CMS) при этом не теряются: проектный
конфиг мержится поверх глобального по ключам (`config.rs → merge_toml`), секции
`diagnostics` в проектном файле нет. Проверка после правки:
`phpantom_lsp analyze vendor/<любой файл> --project-root <корень> --no-colour` —
должен молчать (игноры действуют). Опция «отключить pint машинно» —
`[formatting] pint = ""` в глобальном шаблоне `tools/machine/phpantom.toml` —
владелец не утверждал, не включена.

## Верификация (05.10.2026)

- `cargo test --lib throws_analysis` — 70 passed / 0 failed (5 новых);
  `cargo test --lib catch_completion` — 23 / 0; `cargo fmt --check` — чисто.
- Headless-LSP пробы (spawn `--stdio`, initialize/didOpen/codeAction/formatting):
  репро-файл — паника до патча, 2 действия после; живой файл с кириллицей —
  0 паник; formatting — целый файл-эдит с табами при обоих cwd сервера,
  файл на диске не меняется; `analyze` vendor-файла — пусто, exit 0.

## Upstream

- Репо: [PHPantom-dev/phpantom_lsp](https://github.com/PHPantom-dev/phpantom_lsp),
  лицензия MIT, актуальный релиз 0.10.0 (20.08.2026) — фиксов нет.
- Подготовленный issue/PR-текст (оба бага, репро, верификация) лежал в
  `/tmp/opencode/phpantom_lsp-upstream-report.md`; публикация — только по
  явному запросу владельца.

## См. также

- [phpantom-lsp.md](phpantom-lsp.md) — возможности сервера и справочник `.phpantom.toml`
- [laravel-vue-alpine-root.md](laravel-vue-alpine-root.md) — паттерн Laravel-корня; exec-биты после деплоя
- [clean-problems-formatting.md](clean-problems-formatting.md) — политика «Pint не умеет табы», матрица форматтеров
