# Project Rules

> Короткие обязательные правила воркспейса. Загружаются автоматически в /aif-implement.

## Rules

- В @vscode/test-electron-харнессах (tools/intellisense-check) активировать Vue.volar строго ДО встроенного vscode.typescript-language-features, после активаций вызывать typescript.restartTsServer — иначе инъекция vue-typescript-plugin в tsserver пропускается ($style: any, member-list в .vue-шаблонах пуст)
- Вложенные Rust-крейты — только через `[workspace] members` явным списком в корневом Cargo.toml; glob `"*"` в members не использовать (cargo ≥1.98 требует Cargo.toml от каждого совпавшего каталога — `src/`, `.codegraph` ломают сборку); rust-analyzer индексирует только workspace-члены (гайд: docs/rust-navigation-fix.md)
