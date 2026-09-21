[← Предыдущий гайд](phpantom-wordpress.md) · [К README](../README.md) · [Следующий гайд →](rust-senior-setup.md)

# Rust: навигация в Code OSS — фикс для вложенных крейтов (rust-analyzer)

> Симптом: в проекте с вложенными crate'ами (пакет в корне + подкаталог-крейт) не
> работают подсказки (completion), переходы к определениям (F12/Ctrl+click),
> Outline/структура, hover. Файл помечается серым «This file is not included
> in any crate». История фикса: <rust-проект> (`adder/` не индексировался).

## Диагноз

rust-analyzer обнаруживает проект запуском `cargo metadata` **от корня открытой
папки**. Правила (исходники `project-model`, issue rust-lang/rust-analyzer#19567):

- Корень содержит `Cargo.toml` → грузится **только он** и только его
  `[workspace] members`. Вложенные не-члены полностью игнорируются.
- Корень без манифеста → сканируются подкаталоги **ровно на один уровень**,
  каждый найденный `Cargo.toml` грузится как отдельный проект. Глубже — нет.
- `linkedProjects` **не поддерживает wildcards**; глубина автодискавери не
  настраивается.

Cargo при этом «проще» редактора: `cargo build` внутри подкаталога работает и
без workspace — поэтому терминал «видит» крейт, а редактор нет (и JetBrains
видел: `.idea`-эпоха). Проверка headless:

```bash
cargo metadata --no-deps | grep -o '"name":"[^"]*"'   # каких пакетов нет — те вне анализа
rust-analyzer analysis-stats .                          # строка "crates: N"
```

## Фикс (каноничный): [workspace] members в корневом Cargo.toml

```toml
[package]
name = "<rust-проект>"
version = "0.1.0"
edition = "2024"

[workspace]
members = ["adder"]   # новые крейты дописывать сюда
```

Корневой пакет — член автоматически. После правки: `cargo metadata --no-deps`
показывает оба пакета, `rust-analyzer analysis-stats .` — `crates: 2`.
В Code OSS: Ctrl+Shift+P → **Rust Analyzer: Restart Server**.

⚠ **Glob `members = ["*"]` не работает** (проверено на cargo 1.98.0): glob
требует `Cargo.toml` от **каждого** совпавшего каталога — сборка падает
последовательно на `.codegraph`, затем `src/`. Только явный список. Glob по
«чистому» каталогу крейтов (`members = ["crates/*"]`, где живут только крейты)
в других проектах — допустим.

Нюанс workspace: голый `cargo test`/`cargo run` в корне действует только на
корневой пакет (`workspace_default_members`); весь набор — через
`--workspace` или `-p <имя>`.

## Глобальный уровень (любые проекты, Code OSS)

- **Расширения машинные** (`~/.vscode-oss/extensions`): rust-analyzer
  (платформенный VSIX с бинарем под linux-x64 — Open VSX), CodeLLDB, Even Better
  TOML, crates, wgsl — действуют на любую открытую папку.
- **user-settings** (`~/.config/Code - OSS/User/settings.json`): блок
  `"[rust]": { "editor.defaultFormatter": "rust-lang.rust-analyzer" }` —
  rustfmt при сохранении в любом Rust-файле.
- **Отладка без launch.json**: Run/Debug-лензы rust-analyzer + CodeLLDB
  работают из коробки (клик по «Run|Debug» над `main`/тестом). launch.json —
  только для явных F5-конфигов.
- Политика LSP-бинарников: бинарь из расширения — основной; rustup-бинарь —
  фолбэк через `"rust-analyzer.server.path"`.

## Рецепты под любые структуры

| Структура | Что делать |
|---|---|
| Одиночный crate | Просто открыть папку — работает из коробки |
| Корень-пакет + подкаталоги-крейты | `[workspace] members = [...]` — явный список |
| Репо с каталогом крейтов | `[workspace] members = ["crates/*"]` (в каталоге только крейты) |
| Глубоко вложенные (Ch01/proj/…) | Открыть сам проект папкой, ИЛИ `linkedProjects`: `["${workspaceFolder}/Ch01/proj/Cargo.toml", ...]` — списком, без wildcards |

## Чек-лист проверки (после фикса)

1. `adder/src/lib.rs`: F12 на `can_hold` в тесте → переход к определению.
2. Outline (Ctrl+Shift+P → Outline): `Rectangle`, `can_hold`, `tests`.
3. Ctrl+Shift+O — символы файла; «Go to Symbol in Workspace» — оба крейта.
4. Набрать `Rect` в тесте → completion предлагает `Rectangle`.
5. Hover на `assert!` → документация; статус-бар rust-analyzer: 2 packages.
6. Сохранение `.rs` → rustfmt срабатывает.
7. Ctrl+P — переход по файлам (работал всегда — контроль).

При проблемах: `"rust-analyzer.trace.server": "verbose"` → Output →
Rust Analyzer; `cargo clean`; Restart Server. Если Code OSS запущен из
`.desktop` и cargo «не находится» — запускать `code-oss .` из терминала
(PATH без `~/.cargo/bin` в GUI-сессии).

## Источники

- rust-lang/rust-analyzer#6605 — hover/навигация не работают в не-членах workspace
- rust-lang/rust-analyzer#10227 — cargo metadata игнорирует исключённых/не-членов
- rust-lang/rust-analyzer#17664 — регрессия linkedProjects 0.4.2040–2042
- rust-lang/rust-analyzer#19567 — глубина автодискавери = 1 уровень
- Cargo Book → Workspaces (members/exclude, globs)

---

## См. также

- [Rust: сеньор-сетап](rust-senior-setup.md) — глобальная настройка тулчейна
- [Productivity Power-Ups](power-ups.md) — задача rust-doctor в tasks.json
