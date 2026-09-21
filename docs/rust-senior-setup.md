[← Предыдущий гайд](rust-navigation-fix.md) · [К README](../README.md) · [Следующий гайд →](clean-problems-formatting.md)

# Rust: сеньор-сетап — всё глобально (Code OSS + bacon + just + алиасы)

> Архитектура: ВСЁ настроено на уровне машины/пользователя и работает в **любом** Rust-проекте
> без проектных конфигов. В самом проекте нужно только одно — `[workspace] members` в корневом
> `Cargo.toml` (см. `docs/rust-navigation-fix.md`). Health-check одним запуском:
> `tools/rust-doctor.sh`.

## Что происходит при сохранении .rs-файла (любой проект)

1. **rustfmt** форматирует код табами ×2 (`rust-analyzer.rustfmt.extraArgs` — глобально,
   проектный rustfmt.toml не нужен);
2. **clippy** прогоняет диагностики по всем таргетам вместо `cargo check`
   (`rust-analyzer.check.command` + `allTargets`) — ошибки/предупреждения инлайн + Problems.

Плюс над функциями и тестами — **Run/Debug-лензы** (клик вместо F5-конфигов).

## Глобальные инструменты

| Инструмент | Что даёт | Где живёт |
|---|---|---|
| rust-analyzer | LSP: подсказки, переходы, форматирование, clippy на сохранении | user-settings Code OSS + расширение (Open VSX) |
| bacon 3.25 | фоновые проверки в терминале при каждом изменении файла | `~/.cargo/bin/bacon` (конфиг не нужен) |
| just 1.58 | рецепты задач одной командой | `~/.justfile` → `just -g <рецепт>` |
| cargo-алиасы | короткие команды | `~/.cargo/config.toml` |
| rust-doctor | health-check окружения | `_vscode/tools/rust-doctor.sh` |

### Алиасы cargo (в любом проекте)

```
cargo c   → cargo check --workspace
cargo t   → cargo test --workspace
cargo cl  → cargo clippy --workspace
cargo f   → cargo fmt --all   (табы ×2 через --config)
cargo fc  → cargo fmt --all --check (табы ×2)
```

### just -g (в любом cargo-проекте)

```
just -g test | build | clippy | fmt | check | watch | watch-test | run
```

### bacon (терминал-«второй пилот»)

Запустил `bacon` — следит за кодом: пересчитывает проверки при каждом изменении файла.
Клавиши: `c` — clippy, `t` — тесты, `f` — упавшие, `s` — сводка, `q` — выход.
Встроенные job'ы (`--list-jobs`): check (дефолт), check-all, clippy, test, doc, pedantic…

## Новый Rust-проект за 30 секунд

```bash
cargo new my-project && cd my-project
# вложенные крейты? — в корневой Cargo.toml добавить:
#   [workspace]
#   members = ["sub-crate"]
code-oss .
```
Всё остальное (форматирование, clippy, ленз, алиасы, bacon, just) уже глобально.
Проверка окружения: `tools/rust-doctor.sh` (из корня репо).

## Что осталось проектным (и почему)

- **`[workspace] members`** в корневом Cargo.toml — rust-analyzer индексирует только
  workspace-члены; глобальной настройки нет (см. rust-navigation-fix.md).
- **rust-toolchain.toml** (опционально) — пин канала конкретного проекта; по умолчанию
  действует `rustup default stable`.

## Диагностика проблем

- `tools/rust-doctor.sh` — все 15+ проверок окружения одним запуском.
- Подсказок/переходов нет → `docs/rust-navigation-fix.md` (workspace members + PATH-ловушка
  GUI-запуска: запускай `code-oss .` из терминала).
- Логи LSP: Output → Rust Analyzer (`rust-analyzer.trace.server` уже `messages`).

## Ещё круче (опционально)

- `cargo nextest` — быстрый параллельный раннер тестов (bacon умеет `bacon nextest`);
- `cargo expand` — раскрытие макросов (уже установлен);
- `bacon pedantic` — clippy с `-W clippy::pedantic` (встроенный job).

---

## См. также

- [Rust: навигация](rust-navigation-fix.md) — workspace-члены для rust-analyzer
- [Productivity Power-Ups](power-ups.md) — задача rust-doctor, Run/Debug-лензы
