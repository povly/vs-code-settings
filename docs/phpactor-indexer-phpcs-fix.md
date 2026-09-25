[← Предыдущий гайд](live-templates-and-css.md) · [К README](../README.md) · [Следующий гайд →](vue-css-intellisense.md)

# Phpactor indexer и php-resolver/phpcs: диагностика и фикс

> Инцидент: 17 сентября 2026, проект `<laravel-проект>` (Laravel).
> Два сообщения об ошибках в VS Code (VSCodium, extensions в `~/.vscode-oss`).
> Статус: исправлено, проверено. Побочных эффектов не выявлено.
>
> **Актуализация 25.09.2026:** `stoildobreff.php-resolver` убран из рекомендаций
> воркспейса (дубль возможностей phpantom + сам ложный тост); ключ
> `"phpResolver.phpSnifferCommand": ""` в проектах больше не нужен.
> Гайд ниже сохранён как история инцидента.

## Симптомы

1. Падение сервиса индексации phpactor:

   ```
   Error in service "indexer"
   "Phpactor\Extension\LanguageServerIndexer\Handler\IndexerHandler:{closure:...ServiceManager::start():78}":
   SplFileInfo::getSize(): stat failed for
   <laravel-проект>/storage/framework/lsp-bf5a3a9ad3667e5e.php
   ```

2. Периодический тост:

   ```
   phpcs - Mismatch configuration provided
   ```

## Корневые причины

### 1. Индексатор phpactor индексирует `storage/` и падает на временных файлах

- Реально работающий phpactor — **не phar в `~/.local/bin`**, а копия из
  расширения `phpactor.vscode-phpactor`:
  `~/.vscode-oss/extensions/phpactor.vscode-phpactor-1.7.8-universal/vendor/phpactor/phpactor`.
  Сервер запускается с cwd = корень проекта и читает проектный `.phpactor.json`.
- Дефолтные `indexer.exclude_patterns` (phpactor 2026.07.22):

  ```
  /vendor/**/Tests/**/*
  /vendor/**/tests/**/*
  /vendor/composer/**/*
  /vendor/rector/rector/stubs-rector
  ```

  Каталог `storage/` не исключён → индексировались сотни скомпилированных
  blade-вьюх (`storage/framework/views/*.php`) и временные файлы.
- В `storage/framework/` какой-то Laravel-aware процесс редактора периодически
  создаёт и сразу удаляет временные файлы вида `lsp-<hex>.php` (автор точно не
  установлен: ни phpactor, ни laravel.vscode-laravel, ни php-resolver, ни
  laravel/pao таких строк не содержат). Индексатор находит файл → файл удаляют
  до вызова `getSize()` → `stat failed` → сервис «indexer» падает.
- После исключения `storage/` автор временных файлов перестал иметь значение.

### 2. php-resolver неверно трактует коды выхода PHPCS 4.x

- Расширение `stoildobreff.php-resolver` с дефолтами
  (`phpSnifferCommand: "phpcs"`, `phpStandards: ""`, `phpCustomStandardsFile: "phpcs.xml"`)
  запускает системный `/usr/bin/phpcs` (**PHPCS 4.0.4**) при каждом
  переключении на PHP-вкладку: `phpcs -q - --report=json` (stdin).
  В <laravel-проект> нет `phpcs.xml`, `phpStandards` пуст → phpcs идёт по своему
  дефолту (PSR12).
- PHPCS 4.x возвращает **битовую маску** (из `src/Util/ExitCode.php`):

  | Код | Значение |
  |---|---|
  | 0 | OKAY |
  | 1 | FIXABLE |
  | 2 | NON_FIXABLE |
  | 4 | FAILED_TO_FIX (phpcbf) |
  | 16 | PROCESS_ERROR (в т.ч. неизвестный standard) |
  | 64 | REQUIREMENTS_NOT_MET |

  **Exit 3 = 1\|2** — «найдены и fixable, и non-fixable нарушения», т.е.
  нормальный результат сниффинга. Расширение написано под phpcs 3.x (где 3 =
  ошибка конфигурации) и показывает ложное «Mismatch configuration provided».
  Сама конфигурация корректна; это баг маппинга в php-resolver (`src/PHPCs.js`,
  `case 3`).
- Стиль кода в <laravel-проект> задаёт **Laravel Pint** (`vendor/bin/pint`),
  phpcs там избыточен; диагностики расширение всё равно не показывает
  (соответствующий код в PHPCs.js закомментирован) — только тост.

## Что изменено

| Файл | Действие |
|---|---|
| `<laravel-проект>/.phpactor.json` | Добавлен `indexer.exclude_patterns` |
| `<laravel-проект>/.vscode/settings.json` | Создан; отключён сниффер php-resolver для проекта |
| `~/.cache/phpactor/index/<laravel-проект>-6ee438` | Удалён (устаревший индекс со записями из `storage/`) |
| phpactor LSP | Перезапущен (`kill`; VS Code сам поднимает сервер заново) |

`.phpactor.json` (полностью; **массив exclude_patterns заменяет дефолты, а не
дополняет — дефолты сохранены вручную**):

```json
{
  "$schema": "/phpactor.schema.json",
  "language_server_phpstan.enabled": true,
  "indexer.exclude_patterns": [
    "/vendor/**/Tests/**/*",
    "/vendor/**/tests/**/*",
    "/vendor/composer/**/*",
    "/vendor/rector/rector/stubs-rector",
    "/storage/**/*",
    "/bootstrap/cache/**/*",
    "/node_modules/**/*"
  ]
}
```

`.vscode/settings.json` (JSONC, табы ×2):

```jsonc
{
  // Стиль кода в проекте — Laravel Pint; php-resolver запускает системный phpcs
  // на каждое переключение вкладки, а его сообщение "Mismatch configuration
  // provided" — неверная трактовка кода выхода 3 в PHPCS 4.x
  // (битовая маска: 1|2 = найдены fixable и non-fixable нарушения).
  "phpResolver.phpSnifferCommand": ""
}
```

## Проверка

- `phpactor config:dump` в cwd проекта показывает новый список excludes.
- Перестроенный индекс: 90 446 файлов-записей, **0** упоминаний
  `storage/framework`; записи `App\…` (app/, controllers) присутствуют.
- Сервер phpactor пережил полную переиндексацию без падения сервиса indexer.
- Оба JSON валидны (`json_decode`; для settings.json — после стрипа `//`).

## Шаблон для будущих Laravel-проектов

1. Класть в корень проекта `.phpactor.json` из блока выше.
2. Если стиль задаёт Pint и phpcs не используется — в `.vscode/settings.json`
  проекта добавлять `"phpResolver.phpSnifferCommand": ""`.
3. После смены exclude-паттернов: перезапустить phpactor (kill PID — VS Code
  перезапустит сам) и удалить устаревший кэш
  `~/.cache/phpactor/index/<project>-<hash>`, иначе записи из исключённых
  каталогов остаются в поиске до следующей полной переиндексации.

## Заметки на будущее

- Реальный бинарарь phpactor — из расширения VS Code (обновляется вместе с
  расширением); phar в `~/.local/bin` — отдельная копия (может быть старее).
- Кэш и конфиги phpactor: проектный `.phpactor.json`; глобальный кэш
  `~/.cache/phpactor/` (`index/`, `worse-reflection/`).
- Установленные расширения PHP-стека (VSCodium): `phpactor.vscode-phpactor`,
  `stoildobreff.php-resolver`, `junstyle.php-cs-fixer`, `laravel.vscode-laravel`,
  `onecentlin.laravel-blade`, `recca0120.vscode-phpunit`, `xdebug.php-debug`.
- php-resolver ещё регистрирует как форматтер `phpcbf` (есть в PATH,
  `phpBeautifierCommand` по умолчанию). Он может переспорить Pint при ручном
  форматировании — при желании отключается так же:
  `"phpResolver.phpBeautifierCommand": ""`. `php-cs-fixer` в PATH отсутствует,
  соответствующая ветка расширения неактивна.
- `laravel/pao` (require-dev) — «Agent-optimized output for PHP testing
  tools», к обеим ошибкам отношения не имеет.

## Откат

- Убрать `indexer.exclude_patterns` из `.phpactor.json`, удалить проектный
  `.vscode/settings.json`, перезапустить phpactor и удалить его кэш индекса.

---

## См. также

- [PHPantom + WordPress](phpantom-wordpress.md) — актуальный гайд по PHPantom (заменил phpactor 18.09.2026)
- [Чистые Problems](clean-problems-formatting.md) — исключение чужой диагностики, `php.validate.enable: false`
