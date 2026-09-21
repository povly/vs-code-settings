# Правила области: rust

> Конвенции Rust-трека (winit/wgpu, Bevy). Загружается после rules/base.md.

## Rules

- Форматирование — `rustfmt`: `hard_tabs = true`, `tab_spaces = 2` (rustfmt.toml проекта или глобально через `rustfmt.extraArgs`)
- Rust-проекты — отдельные cargo-проекты/воркспейсы; не смешивать с веб-треком в одном каталоге
- Clippy на сохранении (`rust-analyzer check.command = "clippy"`); фоновые проверки — bacon
- Отладка — CodeLLDB через launch.json (имя бинарника из `[[bin]]` / имени пакета)
- WGSL-шейдеры — в `.wgsl`-файлах (или `shaders/`), не строками в Rust-коде
- Ошибки — `Result` + `thiserror` (библиотеки) / `anyhow` (приложения); `unwrap`/`expect` — только тесты и прототип
- Тесты — `#[cfg(test)] mod tests` рядом с кодом; `cargo test`
- Логирование — крейт `tracing` (`info!`/`warn!`/`error!` + span'ы), без `println!`-дебага в рабочем коде
- Вложенные крейты — через `[workspace] members` явным списком (см. аксиому в RULES.md и docs/rust-navigation-fix.md)
