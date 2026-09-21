# Phpactor: paths, конфигурация, обслуживание

## Какой бинарарь реально работает

Если в пользовательских настройках НЕ задан `phpactor.serverPath`, расширение
`phpactor.vscode-phpactor` использует **собственную копию** phpactor:

```
~/.vscode-oss/extensions/phpactor.vscode-phpactor-<ver>-universal/
  vendor/phpactor/phpactor/bin/phpactor
```

Она обновляется вместе с расширением и обычно **свежее** phar'а в
`~/.local/bin`. Phar — ручная установка (см. README). Проверить работающий
процесс: `ps aux | grep phpactor` → `ls -l /proc/<PID>/cwd` (cwd = корень
открытого проекта).

## Конфигурация

- Проектная: `.phpactor.json` в корне проекта (читается по cwd сервера).
- Проверить, что видит сервер:
  `<бинарь расширения> config:dump` из каталога проекта.
- `indexer.exclude_patterns` **заменяет дефолты, а не дополняет** — дефолты
  (`/vendor/**/Tests/**/*`, `/vendor/**/tests/**/*`, `/vendor/composer/**/*`,
  `/vendor/rector/rector/stubs-rector`) надо включать в список вручную.
- Кэш индекса: `~/.cache/phpactor/index/<project>-<hash>`.

## Обязательный `.phpactor.json` для Laravel-проектов

Без исключения `/storage/**/*` индексатор:
- индексирует сотни скомпилированных вьюх `storage/framework/views/*.php`;
- падает на временных файлах `storage/framework/lsp-*.php` (создаются и
  удаляются процессами редактора → `SplFileInfo::getSize(): stat failed`,
  сервис indexer умирает).

Готовый шаблон — в `docs/phpactor-indexer-phpcs-fix.md` (воркспейс `_vscode`).

## Смена exclude-паттернов (процедура)

1. Отредактировать `.phpactor.json`.
2. `kill <PID>` обоих процессов phpactor — VS Code перезапустит сервер сам.
3. Удалить устаревший кэш `~/.cache/phpactor/index/<project>-<hash>`,
   иначе записи из исключённых каталогов остаются в поиске до полной
   переиндексации.

## Связанное: php-resolver + PHPCS 4.x

Расширение `stoildobreff.php-resolver` по умолчанию гоняет системный `phpcs`
на каждом переключении на PHP-вкладку. В PHPCS 4.x коды выхода — битовая маска
(0 OK; 1 FIXABLE; 2 NON_FIXABLE; 4 FAILED_TO_FIX; 16 PROCESS_ERROR;
64 REQUIREMENTS_NOT_MET). **Exit 3 = 1|2** — обычный результат сниффинга, но
php-resolver трактует его по семантике phpcs 3.x и показывает ложный тост
«Mismatch configuration provided».

В проектах, где стиль задаёт Laravel Pint, отключать в `.vscode/settings.json`
проекта: `"phpResolver.phpSnifferCommand": ""`. Аналогично при желании
отключается форматтер `"phpResolver.phpBeautifierCommand": ""` (phpcbf).

Разбор инцидента и проверка: `docs/phpactor-indexer-phpcs-fix.md`.
