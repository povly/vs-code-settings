# Машинный уровень форматирования (одна настройка на машину)

> Разворётывание на новой машине: 3 шага ниже. Политика и матрица форматтеров —
> [docs/clean-problems-formatting.md](../../docs/clean-problems-formatting.md).
> Воркспейс-уровень (`.vscode/` этого репо) — отдельно, см. [README](../../README.md).

## Что здесь

| Файл | Назначение |
|---|---|
| `vscode-php-cs-fixer.php` | Машинный конфиг php-cs-fixer: табы ×2 + PSR12. Копируется в `~/.config/vscode-php-cs-fixer/.php-cs-fixer.php` |
| `Code-OSS-User-settings.jsonc` | Снимок user settings Code OSS (справочник переноса; источник правды — живой файл) |

## Развёртывание на новой машине

1. **Машинный конфиг форматтера** (действует в ЛЮБОМ открытом корне — проекты
   ничего не должны настраивать и не спрашивают форматтер):

   ```bash
   mkdir -p ~/.config/vscode-php-cs-fixer
   cp tools/machine/vscode-php-cs-fixer.php ~/.config/vscode-php-cs-fixer/.php-cs-fixer.php
   ```

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
   "php-cs-fixer.executablePath": "~/.config/composer/vendor/bin/php-cs-fixer",
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

## Проектный уровень (что кладётся в git проекта)

| Файл | Зачем |
|---|---|
| `.php-cs-fixer.php` | Тот же стиль для CLI/CI и других машин (junstyle находит дефолтным поиском) |
| `.editorconfig` | `indent_style = tab`, `indent_size = 2` |
| `.prettierrc` | `{"useTabs": true, "tabWidth": 2, ...стиль проекта}` |
| `.bladeformatterrc` | `{"useTabs": true, "indentSize": 2}` (для CLI blade-formatter) |

Шаблон `.php-cs-fixer.php` ( finder исключает vendor/blade и пр.) — в
[docs/clean-problems-formatting.md](../../docs/clean-problems-formatting.md).
