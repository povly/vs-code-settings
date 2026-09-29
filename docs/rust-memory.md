[← Предыдущий гайд](rust-senior-setup.md) · [К README](../README.md)

# Rust: память Code OSS — кто ест и как прикрыть (rust-analyzer)

> Симптом: при Rust-разработке Code OSS «ест гигабайты». Замер показал: не редактор,
> а rust-analyzer без капов кэшей (iced-проект: 2.7 GB за 16 минут от открытия окна)
> плюс пики rustc/clippy от checkOnSave. Рецепт: замер → капы на машинном уровне →
> Restart Server. One-liner диагностики: `tools/rust-memory-report.sh` (воркспейс `_vscode`).

## Симптом и мгновенная диагностика

1. `tools/rust-memory-report.sh [топ-N]` — RSS-разбивка по группам процессов: дерево
   code-oss (main / extension host / file watcher), rust-analyzer, rustc/cargo (flycheck),
   web-LSP (phpantom, volar/tsserver, wgsl-analyzer). Без побочных эффектов: читает только `/proc`,
   ps не нужен. PID процессов видны в топ-N — по ним можно смотреть `/proc/<PID>/cwd`.
2. В редакторе: палитра → `Developer: Open Process Explorer` — память по процессам окна.
3. Статус-бар rust-analyzer → `rust-analyzer: Status` — сколько крейтов загружено,
   закончена ли индексация (пока идёт — подсказки/F12 скудные, это нормально).

## Реальный замер (2026-09-29, проект на iced 0.14, расширение RA 0.3.3065)

| Потребитель | RSS | Комментарий |
|---|---|---|
| rust-analyzer (одно окно, iced dep-tree ≈ 450 крейтов) | 2596 → 2754 MB за 16 мин | рост при startup-прайминге; 48 потоков, `cachePriming` без ограничений, кэши без cap'а |
| Всё дерево code-oss окна | ~3.0 GB | RA ≈ 90% дерева; сам редактор ~300–400 MB |
| Вне редактора (контекст «система душится») | qemu 4.4 GB, obs 1.7 GB, 2×opencode ~1.8 GB | к code-oss отношения не имеют |

Вывод: «жрёт» не Code OSS, а его language server на тяжёлом dep-tree (iced/wgpu/bevy —
сотни крейтов — это их нормальный масштаб). Второй источник — транзиентные пики rustc/clippy:
`checkOnSave` (clippy) + `check.allTargets` + `files.autoSave: afterDelay` = cargo запускается
на каждой паузе набора; в steady-RSS не видно, но в общую нагрузку бьёт. File watcher НЕ виноват:
`**/target/**` уже исключён в watcher/search (см. `.vscode/settings.json` и machine-снимок).

## Фикс: капы на машинном уровне (применено)

Живой файл: `~/.config/Code - OSS/User/settings.json` (снимок — `tools/machine/Code-OSS-User-settings.jsonc`,
реэкспорт `tools/machine/export-user-settings.sh`). Значения по умолчанию — без ограничений.

| Ключ | Значение | Эффект | Трейдофф |
|---|---|---|---|
| `rust-analyzer.lru.capacity` | `128` | кап кэшей запросов → ниже steady-RSS | часть пересчётов при навигации |
| `rust-analyzer.cachePriming.numThreads` | `2` | стартовый прайминг двумя потоками вместо всех ядер — без всплеска CPU/RAM | первая навигация после открытия медленнее |
| `typescript.tsserver.log` / `vue.trace.server` | удалены (`verbose`) | verbose-логи больше не растут в каждом окне | — |

Ключи применяются к **новому** процессу сервера: палитра → `rust-analyzer: Restart Server`
(или перезапуск окна). Проверка их наличия — `tools/rust-doctor.sh` чек #9.

Не трогаем (UX сеньор-сетапа): `check.command: clippy`, `check.allTargets`, лензы, autoSave.
Имя ключа «потоки flycheck» в схеме RA 0.3.x отсутствует — не выдумывать (проверено по
`package.json` установленного расширения).

## Opt-in агрессивный профиль (НЕ применяется глобально)

Если после капов всё ещё тесно — осознанные компромиссы, документируются в проекте, а не в user settings:

- `rust-analyzer.check.enable: false` — диагностики на сохранении off; проверки забирает
  `bacon` (уже в сеньор-сетапе: `bacon` → job `clippy`). Минус: инлайн-подсветка пропадает.
- `rust-analyzer.cachePriming.enable: false` — без стартового прогрева кэшей: окно открывается
  холодным, первая навигация по deps медленная.
- Гигиена расширений в чистом Rust-корне: Extensions → phpantom / Volar / Laravel LSP /
  css-variables → `Disable (Workspace)` — веб-LSP не поднимают свои процессы в Rust-окне.
- `files.autoSaveDelay` (например `2000`) — реже автосейвы → реже запуски clippy.

## F12 к макросам/крейтам молчит — отдельная диагностика

Частый сосед симптома памяти, но причина своя. Порядок проверки (от дешёвого к дорогому):

1. **`cargo check` — истина в последней инстанции.** Компилируется → код валиден и проблема
   в RA (индексация не закончена / нужен Restart Server). Не компилируется → чинить импорты:
   в iced 0.14 макросы `row!`/`column!` реэкспортированы в модуле `widget` —
   `use iced::widget::{row, column}` импортирует именно макросы; голый `row!` без импорта
   не резолвится — это ошибка кода, F12 «молчит» обоснованно.
2. Индексация идёт? — статус-бар RA / `rust-analyzer: Status` (количество крейтов, progress).
   Dep-tree из сотен крейтов индексируется минутами: в это время F12/подсказки скудные.
3. После правки `Cargo.toml` — `rust-analyzer: Restart Server` (discovery не всегда подхватывает).
4. Ошибки сервера: Output → Rust Analyzer (`rust-analyzer.trace.server: "messages"` уже включён;
   смотреть proc-macro/build-scripts ошибки).
5. Вложенные крейты «not included in any crate» → [docs/rust-navigation-fix.md](rust-navigation-fix.md)
   (`[workspace] members` без glob). GUI-ловушка PATH → `tools/rust-doctor.sh` чек #2.

## Чек-лист проверки

- [ ] `tools/rust-memory-report.sh` — в топе один rust-analyzer с RSS ниже прежнего (замер «до» →
      Restart Server → замер «после»; цифры сравнить по группе `code-oss` и строке rust-analyzer)
- [ ] `tools/rust-doctor.sh <rust-проект>` — PASS, вкл. чек #9 «память: lru.capacity + cachePriming.numThreads»
- [ ] В Rust-окне F12 на элемент крейта (`Element`, `button`) открывает файл в `~/.cargo/registry/...`
- [ ] `cargo check` в проекте — без ошибок (имена ключей/импортов подтверждены компилятором)

## См. также

- [Rust: сеньор-сетап](rust-senior-setup.md) — что происходит при сохранении .rs-файла
- [Rust: навигация](rust-navigation-fix.md) — workspace-члены и PATH-ловушка для rust-analyzer
- [Чистые Problems + форматирование](clean-problems-formatting.md) — исключения watcher/search: `target/` уже закрыт
