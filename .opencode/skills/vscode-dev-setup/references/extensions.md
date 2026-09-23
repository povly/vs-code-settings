# Расширения VS Code (только бесплатные)

Все ID проверены. Установка: Extensions → Recommended → Install All, либо
`code --install-extension <id>`.

## PHP / Laravel / WordPress / Bitrix

| ID | Что даёт | Примечания |
|---|---|---|
| `phpactor.vscode-phpactor` | PHP LSP: автодополнение, hover, goto-def, **rename**, рефакторинг | Сервер — копия **из самого расширения** (свежая, `~/.vscode-oss/extensions/.../vendor/phpactor/phpactor`); phar в `~/.local/bin` — опционально. Laravel → проектный `.phpactor.json` (см. [phpactor.md](phpactor.md)). MIT |
| `laravel.vscode-laravel` | Официальное (MIT): Blade, роуты, конфиги, валидация, view-пути | Laravel LSP встроен; PHP 8.2+ |
| `onecentlin.laravel-blade` | Подсветка Blade, сниппеты директив | — |
| `shufo.vscode-blade-formatter` | Форматирование Blade при сохранении | Бесплатно (OSS) |
| `xdebug.php-debug` | Отладка PHP по Xdebug (порт 9003) | Требует установленный Xdebug в PHP |
| `junstyle.php-cs-fixer` | Форматтер PHP | Указать `php-cs-fixer.executablePath` или vendor/bin. На машине (17.09.2026) глобального `php-cs-fixer` в PATH нет; в Laravel-проектах фиксер — Pint (`vendor/bin/pint`), расширение неактивно, пока не указан путь |
| `Recca0120.vscode-phpunit` | Запуск PHPUnit/Pest тестов из редактора | — |
| `stoildobreff.php-resolver` | PHP-инструменты: goto-def по всем символам, call/type hierarchy, dead code, inlay hints, ZIP-навигация | ⚠ Встроенный phpcs-сниффер: гоняет системный `phpcs` на каждом переключении PHP-вкладки и **неверно трактует exit-код 3 PHPCS 4.x** (битовая маска 1\|2 = «есть fixable и non-fixable нарушения») как «Mismatch configuration provided». В проектах на Pint отключать: `"phpResolver.phpSnifferCommand": ""` (проектный `.vscode/settings.json`); там же при желании `"phpResolver.phpBeautifierCommand": ""` (phpcbf-форматтер). Детали: [phpactor.md](phpactor.md) |
| `johnbillion.vscode-wordpress-hooks` | Автодополнение WP-хуков (actions/filters, до WP 7.1) | GPL-3.0, 226K установок |

## Alpine.js / Vue / Vite / JS / CSS

| ID | Что даёт |
|---|---|
| `connorontheweb.alpinejs-tools` | Alpine.js IntelliSense + подсветка директив |
| `vuejs.volar` | Vue 3 — официальное расширение (Volar) |
| `dbaeumer.vscode-eslint` | ESLint: диагностика + `source.fixAll.eslint` на сохранении |
| `esbenp.prettier-vscode` | Prettier: JS/Vue/CSS/HTML/JSON/MD |
| `csstools.postcss` | Синтаксис `.pcss` |

## Rust / wgpu / Bevy

| ID | Что даёт |
|---|---|
| `rust-lang.rust-analyzer` | Официальный LSP Rust |
| `vadimcn.vscode-lldb` | CodeLLDB — отладка Rust (lldb) |
| `tamasfe.even-better-toml` | TOML: Cargo.toml с подсветкой и валидацией |
| `serayuzgur.crates` | Подсказки версий крейтов в Cargo.toml |
| `polyMeilex.wgsl` | Подсветка WGSL-шейдеров |

## Качество жизни

| ID | Что даёт |
|---|---|
| `usernamehw.errorlens` | Ошибки/варнинги инлайн в строке |
| `editorconfig.editorconfig` | Применяет `.editorconfig` |
| `christian-kohler.path-intellisense` | Автодополнение путей в импортах/строках |

## Чёрный список (freemium — НЕ ставить)

- `bmewburn.vscode-intelephense-client` — rename symbol / organize imports платные
- `devsense.phptools` (PHP Tools) — ядро возможностей платное
- `eamodio.gitlens` — часть функций платная
