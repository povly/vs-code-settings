# Отладка в VS Code (бесплатная)

Все конфигурации уже в `.vscode/launch.json`.

## PHP (Xdebug) — Laravel / WordPress / Bitrix

1. Установить Xdebug (CachyOS/Arch): `sudo pacman -S --needed xdebug`.
   Пакет кладёт ini в `/etc/php/conf.d/`; проверить: `php -m | grep -i xdebug`.
2. В `php.ini`:
   ```ini
   [xdebug]
   xdebug.mode=debug
   xdebug.start_with_request=trigger
   xdebug.client_port=9003
   ```
3. Запустить сайт: `php artisan serve` (Laravel) / `php -S localhost:8000`
   (WordPress/Bitrix) — или штатный веб-сервер с fpm.
4. F5 → **«PHP: слушать Xdebug»** → открыть страницу в браузере.
   Отладчик подключится на 9003, брейкпоинты сработают в PHP-файлах.

Удалённый сервер (Remote-SSH): если PHP крутится не в этом воркспейсе —
добавить `pathMappings` вида `"/путь/на/сервере": "${workspaceFolder}"`.

## JS / Vue / Alpine (Chrome debugger поверх Vite)

1. `npm run dev` (Vite, порт 5173) или `php artisan serve` (порт 8000).
2. F5 → **«JS: сайт через …»** — откроется экземпляр Chrome с дебаггером.
3. Брейкпоинты в `.js` / `.vue` (script-блоках); source maps включены у Vite
   по умолчанию. Alpine-код (в `x-data`, модулях) отлаживается так же.

## Rust (CodeLLDB)

1. `rustup component add rust-analyzer` (для IDE).
2. В `launch.json` в конфиге «Rust: отладка бинарника» заменить
   `ИЗМЕНИТЕ_НА_ИМЯ_БИНАРЯ` на имя бинаря из `Cargo.toml` (`[[bin]]` или имя пакета).
3. F5 — CodeLLDB сам запустит `cargo build` и подключится.

Bevy: для быстрой пересборки использовать dev-профиль с оптимизацией:
```toml
[profile.dev]
opt-level = 1

[profile.dev.package."*"]
opt-level = 3
```

## Общие приёмы

- `debugpy`-подобный «attach» не нужен: конфигурации launch-типа.
- Условные брейкпоинты: ПКМ по брейкпоинту → Edit Breakpoint (условие/hit count).
- Logpoints — лог без изменения кода.
