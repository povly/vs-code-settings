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
- `extensions.autoUpdate: "on"` — осознанный выбор владельца (подтверждён 02.10.2026): НЕ «фиксить» на `onlyEnabledExtensions` и не трогать тумблер «Show Automatic Updates» в панели Extensions (он пишет этот ключ). Устоявшиеся user/workspace настройки не менять и не «улучшать» без явного запроса владельца
- PHP-форматтер в редакторе — **phpantom** (`[php].defaultFormatter: "phpantom.phpantom"` + formatOnSave; junstyle.php-cs-fixer снят 02.10.2026, машинная обвязка `~/.config/vscode-php-cs-fixer/` вычищена): в проектах с php-cs-fixer в require-dev phpantom авто-детектит `vendor/bin/php-cs-fixer` → табы ×2 из проектного `.php-cs-fixer.php`; корни без фиксера — встроенный PER-CS (пробелы). CLI/CI-канон — тот же `vendor/bin/php-cs-fixer`. junstyle не возвращать без явного запроса владельца
- Кросс-платформенность настроек: пути — только `${workspaceFolder}`, `~` и имена из PATH (не абсолютные: `"rg"`, не `"/usr/bin/rg"` — Windows-машины); концы строк — триада `files.eol: "\n"` + `.editorconfig` (`end_of_line = lf`) + `.gitattributes` (`* text=auto eol=lf`)
