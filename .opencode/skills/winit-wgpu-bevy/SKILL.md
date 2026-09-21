---
name: winit-wgpu-bevy
description: >
  Rust-трек воркспейса: графическое приложение на winit + wgpu (WGSL) и игры
  на Bevy. Использовать при создании/отладке Rust-проектов с wgpu, winit,
  bevy, ECS, WGSL-шейдерами; вопросы сборки, дев-профиля компиляции,
  структуры cargo-проекта и отладки в CodeLLDB.
---

# Rust-трек: winit + wgpu + Bevy

Два сценария работы, не смешивать в одном cargo-проекте:

1. **Свой рендер-цикл**: winit (окно/события) + wgpu (графика) + WGSL-шейдеры.
2. **Игра на Bevy**: движок сам владеет окном и циклом; wgpu внутри Bevy.

## Быстрые ссылки

- [wgpu-starter.md](references/wgpu-starter.md) — каркас winit+wgpu приложения, пайплайн, шейдер
- [bevy-starter.md](references/bevy-starter.md) — каркас Bevy, ECS-минимум, дев-профиль сборки

## Правила трека

- Отдельный cargo-проект на приложение; общий код — в workspace-члены
- Отступы — табы шириной 2 (rustfmt: `hard_tabs = true, tab_spaces = 2` в rustfmt.toml)
- Ошибки: `Result` + `thiserror`; `unwrap` только в тестах/прототипах
- Отладка: CodeLLDB (конфиг в `.vscode/launch.json`)
- Шейдеры — `.wgsl` файлы рядом с кодом (не inline-строки)
