# Правила области: vscode-config

> Конвенции правки конфигурации VS Code / Code OSS воркспейса. Загружается после rules/base.md.

## Rules

- Изменения конфигов `.vscode/` — только точечные правки, с сохранением JSONC-комментариев; полный rewrite файла запрещён
- В самих JSON/YAML/TOML-файлах — 2 пробела; символ таба в editor-полях настроек — `\t` шириной 2
- Новые live templates — только в существующие `*.code-snippets` по языку; отступ в body — табы (`\t`), литеральный `$` в PHP-сниппетах — `\$`
- НИКОГДА не ассоциировать `.pcss`/`.postcss` с языком `postcss` — глушит CSS IntelliSense (только `scss`; см. docs/vue-css-intellisense.md)
- Внешние CSS-модули Vue (`<style src="./x.module.css" module>`): имя файла строго `*.module.css`; типизация `$style` — css-modules-kit + `resolveStyleImports`/`cmkOptions.enabled`
- Расширения VS Code — только полностью бесплатные; freemium (Intelephense, DEVSENSE, GitLens) не предлагать и не добавлять в extensions.json
- Один форматтер на язык: форматирование при сохранении ≡ ручной формат (Ctrl+Shift+I ≡ Ctrl+S)
- Никаких абсолютных путей машины в settings.json/launch.json — только `${workspaceFolder}`
