# Машинный уровень форматирования (одна настройка на машину)

> Разворётывание на новой машине: 3 шага ниже. Политика и матрица форматтеров —
> [docs/clean-problems-formatting.md](../../docs/clean-problems-formatting.md).
> Воркспейс-уровень (`.vscode/` этого репо) — отдельно, см. [README](../../README.md).

## Что здесь

| Файл | Назначение |
|---|---|
| `vscode-php-cs-fixer.php` | Машинный конфиг php-cs-fixer: табы ×2 + PSR12 + `array_indentation`. Копируется в `~/.config/vscode-php-cs-fixer/.php-cs-fixer.php` |
| `php-cs-fixer-wrapper.sh` | Silent-wrapper (обязателен): cwd = `~/.config/vscode-php-cs-fixer` — гасит WARN «Unable to determine minimum PHP version…» и фильтрует баннер fixer'а из stderr (баг junstyle 0.3.21: `files==0` + непустой stderr → «provider FAILED» — падало каждое сохранение уже-чистого файла). Настоящие ошибки проходят насквозь. Механика — docs/clean-problems-formatting.md |
| `composer.json` | Служебный composer.json для wrapper'а: `config.platform.php` = major.minor runtime. Копируется в `~/.config/vscode-php-cs-fixer/composer.json` |
| `Code-OSS-User-settings.jsonc` | Снимок user settings Code OSS (справочник переноса; источник правды — живой файл) |

## Развёртывание на новой машине

1. **Машинный конфиг форматтера + wrapper** (действует в ЛЮБОМ открытом корне —
   проекты ничего не должны настраивать и не спрашивают форматтер):

   ```bash
   mkdir -p ~/.config/vscode-php-cs-fixer
   cp tools/machine/vscode-php-cs-fixer.php ~/.config/vscode-php-cs-fixer/.php-cs-fixer.php
   cp tools/machine/composer.json ~/.config/vscode-php-cs-fixer/composer.json
   install -m 755 tools/machine/php-cs-fixer-wrapper.sh ~/.config/vscode-php-cs-fixer/php-cs-fixer-wrapper.sh
   ```

   Wrapper обязателен: устраняет WARN «Unable to determine minimum PHP
   version…» на каждом сохранении и баг junstyle 0.3.21 «provider FAILED» на
   уже-чистых файлах (механика и регресс-чек —
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
   "phpResolver.phpSnifferCommand": "",
   "bladeFormatter.format.useTabs": true,
   "bladeFormatter.format.indentSize": 2,
   "bladeFormatter.format.wrapAttributes": "auto",
   "prettier.useTabs": true,
   "prettier.tabWidth": 2
   ```

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
