[← Предыдущий гайд](rust-navigation-fix.md) · [К README](../README.md) · [Следующий гайд →](rust-standalone-root.md)

# Rust: сеньор-сетап — всё глобально (Code OSS + bacon + just + алиасы)

> Архитектура: ВСЁ настроено на уровне машины/пользователя и работает в **любом** Rust-проекте
> без проектных конфигов. В самом проекте нужно только одно — `[workspace] members` в корневом
> `Cargo.toml` (см. `docs/rust-navigation-fix.md`). Health-check одним запуском:
> `tools/rust-doctor.sh`. Развёртывание глобалей на новой машине —
> `tools/machine/install.sh` (PHP-часть + Rust: `[alias]` в `~/.cargo/config.toml`
> и `~/.justfile`; существующие пользовательские — не перезаписываются, WARN).

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
| rust-doctor | health-check: тулчейн/PATH/компоненты, bacon+just, 5 расширений, [rust]+[wgsl] user-settings, содержимое алиасов и ~/.justfile, [workspace] проекта, капы памяти | `_vscode/tools/rust-doctor.sh` |

### Алиасы cargo (в любом проекте)

```text
cargo c   → cargo check --workspace
cargo t   → cargo test --workspace
cargo cl  → cargo clippy --workspace
cargo f   → cargo fmt --all   (табы ×2 через --config)
cargo fc  → cargo fmt --all --check (табы ×2)
```

### just -g (в любом cargo-проекте)

```text
just -g test | build | clippy | fmt | check | watch | watch-test | run
```

### bacon (терминал-«второй пилот»)

Запустил `bacon` — следит за кодом: пересчитывает проверки при каждом изменении файла.
Клавиши: `c` — clippy, `t` — тесты, `f` — упавшие, `s` — сводка, `q` — выход.
Встроенные job'ы (`--list-jobs`): check (дефолт), check-all, clippy, test, doc, pedantic…

## Новый Rust-проект за 10 секунд

```bash
tools/new-rust-project.sh my-project            # plain
tools/new-rust-project.sh my-game --bevy        # каркас Bevy
tools/new-rust-project.sh my-renderer --wgpu    # winit+wgpu + shaders/triangle.wgsl
tools/new-rust-project.sh my-gui --iced         # окно iced
tools/new-rust-project.sh my-lab --nightly      # + пин канала nightly
```

Генератор кладёт незаменимое проектное: `[workspace]`-шаблон-комментарий в
Cargo.toml, rustfmt.toml (табы ×2, CLI-паритет), .editorconfig,
.vscode/launch.json (F5 CodeLLDB); версии крейтов резолвит `cargo add`,
в конце самопроверка — `cargo check` + `tools/rust-doctor.sh <каталог>`.
Ручной путь: `cargo new my-project`, при подкаталогах-крейтах дописать
в корневой Cargo.toml `[workspace] members = ["sub-crate"]`.

Всё остальное (форматирование, clippy, ленз, алиасы, bacon, just) уже глобально —
развёртывание `tools/machine/install.sh`. Проверка окружения:
`tools/rust-doctor.sh` (из корня репо).

## Что осталось проектным (и почему)

- **`[workspace] members`** в корневом Cargo.toml — rust-analyzer индексирует только
  workspace-члены; глобальной настройки нет (см. rust-navigation-fix.md).
- **rust-toolchain.toml** (опционально) — пин канала конкретного проекта; по умолчанию
  действует `rustup default stable`.

## Диагностика проблем

- `tools/rust-doctor.sh` — вся поверхность окружения одним запуском: тулчейн/PATH/
  компоненты, bacon+just, 5 расширений (RA, CodeLLDB, wgsl-analyzer — ядро;
  crates, even-better-toml — комфорт), `[rust]`+`[wgsl]` user-settings, содержимое
  алиасов и `~/.justfile`, `[workspace]` проекта (одиночный крейт — PASS с note),
  капы памяти RA.
- Автопроверка IntelliSense: `npm run test:rust` (R0–R4: модули одного крейта
  и граница workspace-крейта) и `npm run test:wgsl` (W0–W2: активация
  wgsl-analyzer, язык `.wgsl`, completion) — в `tools/intellisense-check`.
- Подсказок/переходов нет → `docs/rust-navigation-fix.md` (workspace members + PATH-ловушка
  GUI-запуска: запускай `code-oss .` из терминала).
- Логи LSP: Output → Rust Analyzer (`rust-analyzer.trace.server` уже `messages`).

## Ещё круче (опционально)

- `cargo nextest` — быстрый параллельный раннер тестов (bacon умеет `bacon nextest`);
- `cargo expand` — раскрытие макросов (уже установлен);
- `bacon pedantic` — clippy с `-W clippy::pedantic` (встроенный job).

---

## См. также

- [Rust: память Code OSS](rust-memory.md) — кто ест RSS (замер), капы lru/cachePriming, F12 к макросам
- [Rust: навигация](rust-navigation-fix.md) — workspace-члены для rust-analyzer
- [Rust-корень вне воркспейса](rust-standalone-root.md) — незаменимое проектное для отдельного корня
- [Productivity Power-Ups](power-ups.md) — задача rust-doctor, Run/Debug-лензы
