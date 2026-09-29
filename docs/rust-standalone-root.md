[← Предыдущий гайд](rust-senior-setup.md) · [К README](../README.md) · [Следующий гайд →](clean-problems-formatting.md)

# Отдельный Rust-корень: модули, подсказки, переходы, отладка (iced GUI)

> Рецепт полного IntelliSense в Rust-проекте, открытом в Code OSS **отдельным
> корнем** (вне воркспейса). Модель — **global-first**: почти всё машинное
> (доктрина [rust-senior-setup.md](rust-senior-setup.md)), в проекте —
> только незаменимое + корректные `mod`-декларации. Кейс: GUI-приложение на
> iced 0.14 (`<rust-проект>`, edition 2024). Дата: 2026-09-29.

## Симптом (из аудита `<rust-проекта>`)

- В `src/<модуль>/**` нет completion/hover/F12/Outline, файл серый
  «This file is not included in any crate» — при этом `cargo build` зелёный
- Под каталогом модуля создана папка (`src/header/`), но она пустая или файлы
  в ней не видны редактору
- «Голый» `cargo fmt` в терминале форматирует 4 пробелами, хотя редактор
  сохраняет табами ×2
- F5 не отлаживает бинарник (Run/Debug-лензы при этом работают)
- `tools/rust-doctor.sh <проект>` ругается: «нет [workspace] в Cargo.toml»

## Диагностика

1. **Модульная система — главный источник «всё не работает».** Каталог без
   корневого файла модуля (`src/<имя>/mod.rs` или `src/<имя>.rs`) и/или без
   декларации `mod <имя>;` в корне крейта выпадает из дерева: rustc его не
   компилирует (сборка зелёная!), rust-analyzer помечает «not included in any
   crate» (механика и история —
   [rust-navigation-fix.md](rust-navigation-fix.md), «Смежный случай»).
   В примере: `src/header/` существовал, но `mod header;` в `main.rs`
   объявлен не был. С intro-модулями то же самое: в `pages/mod.rs` каждый
   файл объявляется `pub mod <файл>;`.
2. **Машинный сетап действует в любом корне** (проверено `rust-doctor`:
   14 PASS): `[rust]`-форматтер rust-analyzer + formatOnSave, clippy на
   сохранении (`rust-analyzer.check.command`), Run/Debug-лензы, табы ×2 через
   `rust-analyzer.rustfmt.extraArgs`, исключения `**/target` из
   search/watcher/readonly, live-templates `rust.code-snippets` в
   user-snippets (Tab-разворот в любом окне), расширения rust-analyzer /
   CodeLLDB / crates / Even Better TOML — машинные. Если чего-то нет —
   развернуть [tools/machine/](../tools/machine/README.md) и
   `rustup component add rust-analyzer rustfmt clippy`.
3. **Проектное незаменимое отсутствует**: нет `.editorconfig`,
   `rustfmt.toml`, `rust-toolchain.toml`, `.vscode/launch.json` (F5),
   `[workspace]` в Cargo.toml. Для одиночного крейта это не блокирует
   навигацию (открой папку — работает), но CLI/CI-форматирование, другие
   редакторы и явный F5-дебаг остаются ненастроенными.

## Фикс (что добавить в проект — руками, по желанию)

Быстрый путь — генератор `tools/new-rust-project.sh <каталог>
[--bevy|--wgpu|--iced] [--nightly]`: создаёт всё перечисленное ниже и
самопроверяется (`cargo check` + `tools/rust-doctor.sh <каталог>`).
Ниже — что именно кладётся и почему, для ручной правки.

### 1. Модуль: декларация + корневой файл

```text
src/
├── main.rs        # + `mod header;`  (+ `mod pages;` уже есть)
├── header/
│   └── mod.rs     # код модуля (НЕ lib.rs — он корень отдельного крейта)
└── pages/
    ├── mod.rs     # `pub mod home;`
    └── home.rs
```

`src/header/mod.rs` (iced 0.14, возвращает `Column`/`Element`):

```rust
use crate::{App, Message};
use iced::widget::{Column, column, text};

/// Верхняя панель приложения: текущий заголовок окна.
pub fn view(app: &App) -> Column<'_, Message> {
	column![text(app.window_title.as_str()).size(18)]
}
```

и в `main.rs` подключить в композицию, иначе в bin-крейте сработает
`dead_code` (pub не глушит lint для бинарника):

```rust
mod header;
mod pages;

pub fn view(app: &App) -> Element<'_, Message> {
	column![
		header::view(app),
		pages::home::view(app)
	]
	.into()
}
```

После правки: Ctrl+Shift+P → **Rust Analyzer: Restart Server**. Headless:
`rust-analyzer analysis-stats .` — в дереве появляются
`<крейт>::<модуль>::…`; `cargo metadata --no-deps` — манифест на месте.

### 2. Cargo.toml: [workspace] (для будущих вложенных крейтов)

```toml
# rust-analyzer индексирует только workspace-члены; новые вложенные
# крейты дописывать в members (glob "*" запрещён — см. rust-navigation-fix.md)
[workspace]
members = []
```

Корневой пакет — член автоматически. Одиночному крейту секция не нужна для
навигации — rust-doctor (check#8) распознаёт одиночные крейты и даёт PASS
с note; `[workspace]` нужна только для будущего роста (появится
подкаталог-крейт — раскомментировать и дописать в members).

### 3. rustfmt.toml — CLI-паритет табов ×2

```toml
hard_tabs = true
tab_spaces = 2
```

Редактору не мешает (совпадает с машинными `extraArgs`), зато голый
`cargo fmt` / CI форматируют табами, а не дефолтными 4 пробелами
(паттерн закреплён в ARCHITECTURE.md воркспейса; file-nesting уже сворачивает
`rustfmt.toml` под `Cargo.toml`).

### 4. rust-toolchain.toml — пин канала (edition 2024 ≥ rustc 1.85)

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy", "rust-analyzer"]
```

### 5. .editorconfig (зеркало воркспейса, без wgsl/Makefile-блоков)

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = tab
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

# JSON — пробелы (сырые табы в строках JSON запрещены)
[{*.json,*.jsonc,*.yml,*.yaml}]
indent_style = space
indent_size = 2
```

### 6. .vscode/launch.json — F5 (Run/Debug-лензы остаются альтернативой)

```jsonc
{
	"version": "0.2.0",
	"configurations": [
		{
			// kind-only фильтр: CodeLLDB запускает единственный bin-таргет
			// без указания имени; при НЕСКОЛЬКИХ [[bin]] — вернуть "name"
			"name": "Rust: отладка бинарника (cargo build, CodeLLDB)",
			"type": "lldb",
			"request": "launch",
			"cargo": {
				"args": ["build"],
				"filter": { "kind": "bin" }
			},
			"args": [],
			"cwd": "${workspaceFolder}"
		}
	]
}
```

### Чего НЕ добавлять (global-first, анти-паттерны)

- ❌ `.vscode/settings.json` — редакторское поведение машинное, дублирование
  запрещено политикой воркспейса
- ❌ `.vscode/extensions.json` — расширения уже машинные
- ❌ проектные сниппеты — источник правды `_vscode/.vscode/rust.code-snippets`
  (в окно отдельного корня попадают через user-snippets: `tools/machine/install.sh`)

## Что живёт где (глобальная модель)

| Возможность | Где настроено |
|---|---|
| Подсказки, hover, F12, Outline, rename | rust-analyzer (машинное расширение) + `mod`-декларации (проект) |
| clippy-диагностики на сохранении | машинные user settings (`rust-analyzer.check.command`) |
| Табы ×2 при сохранении | машинные user settings (`rustfmt.extraArgs`) |
| Табы ×2 в CLI/CI (`cargo fmt`) | проектный `rustfmt.toml` |
| Run/Debug-лензы | машинные user settings (`rust-analyzer.lens.*`) |
| F5-дебаг бинарника | проектный `.vscode/launch.json` (CodeLLDB, kind-only) |
| Отступы вне VS Code | проектный `.editorconfig` |
| Канал тулчейна + компоненты | проектный `rust-toolchain.toml` |
| Live templates (Tab) | user-snippets (`tools/machine/install.sh`) |
| Фоновые проверки, алиасы c/t/cl/f/fc, just | `bacon`, `~/.cargo/config.toml`, `~/.justfile` (машина) |
| `**/target` вне поиска/watcher/чужой-правок | машинные user settings |

## Диагностика проблем

- `tools/rust-doctor.sh <путь-к-проекту>` — весь health-check одним запуском.
  check#8 различает: подкаталог-крейт без `[workspace]` — FAIL (дописать
  members); одиночный крейт — PASS с note «[workspace] не требуется».
- Code OSS запущен из `.desktop` и cargo «не находится» → запускать
  `code-oss .` из терминала (PATH без `~/.cargo/bin` в GUI-сессии).
- Подсказок нет после правок Cargo.toml/модулей → Rust Analyzer:
  Restart Server; при проблемах — `cargo clean`, трейс
  `rust-analyzer.trace.server: verbose` → Output → Rust Analyzer.
- Headless-проверки: `cargo metadata --no-deps`,
  `rust-analyzer analysis-stats .`, `rust-analyzer diagnostics .`.

## Чек-лист проверки

1. Открыть корень проекта в Code OSS (`code-oss .` из терминала).
2. `mod <имя>;` объявлен, `mod.rs` существует → файлы не серые, F12 из
   `view()` в модуль работает, Outline показывает модуль.
3. Набрать `col` внутри модуля → completion предлагает `column!`/`column`.
4. Hover на виджете iced → документация; статус-бар rust-analyzer: 1 package.
5. Сохранение `.rs` → rustfmt табами ×2 (Status Bar не мигает ошибками).
6. `cargo fmt --all --check` (при наличии rustfmt.toml) — зелёный без
   `--config`-флагов.
7. F5 → «Rust: отладка бинарника» — брейкпоинт в `main` срабатывает;
   либо Run-ленза над `main`.
8. `tools/rust-doctor.sh <проект>` — ожидаемо 14 PASS (+1 прощаемый /
   погашенный `[workspace]`).
9. Tab-разворот live-шаблонов (`pubf`, `tfn` …) в любом `.rs` окна проекта.

---

## См. также

- [Rust: сеньор-сетап](rust-senior-setup.md) — глобальная доктрина (всё машинное)
- [Rust: навигация](rust-navigation-fix.md) — workspace-члены, mod.rs vs lib.rs, PATH-ловушка
- [Отдельный JS-корень](js-standalone-root.md) — тот же паттерн для Vite/vanilla JS
- [tools/machine/README.md](../tools/machine/README.md) — развёртывание машинного уровня
