---
name: vscode-dev-setup
description: >
  Настройка и сопровождение VS Code для веб-стека (PHP/Laravel, Blade, Vue,
  Vite, Alpine.js, WordPress, Bitrix) и Rust (wgpu/Bevy). Использовать при
  вопросах о расширениях VS Code, settings.json, launch.json, форматировании,
  отладке (Xdebug/Chrome/CodeLLDB), live templates (.code-snippets), отступах
  (2 пробела). Принцип: ТОЛЬКО полностью бесплатные расширения, без freemium
  paywall (никаких Intelephense-premium / DEVSENSE / GitLens-платного).
---

# VS Code Dev Setup (бесплатный стек)

Единый источник конфигурации — каталог `.vscode/` этого воркспейса:

| Файл | Назначение |
|---|---|
| `.vscode/extensions.json` | Рекомендуемые расширения (все бесплатные) + unwanted (freemium) |
| `.vscode/settings.json` | Отступы 2 пробела (`detectIndentation: false`), подсказки, форматирование |
| `.vscode/launch.json` | Отладка: Xdebug (PHP), Chrome поверх Vite (JS), CodeLLDB (Rust) |
| `.vscode/*.code-snippets` | Live templates в стиле PhpStorm (php, blade, vue, javascript, html, css, rust, wgsl) |
| `.editorconfig` | Стабильные отступы для любых редакторов |

## Правила

1. **Только бесплатные расширения.** Перед добавлением проверить лицензию:
   Intelephense (rename платный), DEVSENSE PHP Tools, GitLens — НЕ рекомендовать.
   PHP LSP = `phpactor.vscode-phpactor`; сервер ставится phar-ом:
   `curl -sL -o ~/.local/bin/phpactor https://github.com/phpactor/phpactor/releases/latest/download/phpactor.phar && chmod +x ~/.local/bin/phpactor`
   (composer global НЕ использовать — конфликтует с minimum-stability).
   Без `phpactor.serverPath` расширение использует собственную (более свежую)
   копию из `~/.vscode-oss/extensions/phpactor.vscode-phpactor-*/vendor/`.
   В **Laravel-проектах** обязателен проектный `.phpactor.json` с
   `indexer.exclude_patterns` (`/storage/**/*` и др.) — иначе indexer падает
   на `storage/framework/lsp-*.php`. Детали: [phpactor.md](references/phpactor.md).
2. **Отступы — табы шириной 2.** `insertSpaces: false`, `tabSize: 2`;
   JSON/YAML — 2 пробела (синтаксис JSON); не включать `detectIndentation`.
3. **Live templates** добавляются в существующие `*.code-snippets` по языкам;
   новые префиксы — короткие, в стиле PhpStorm (`pubf`, `fore`, `bfore`, `vref`, `cl`, `pfn`).
   Tab-разворачивание включено через `editor.tabCompletion: "onlySnippets"`.
4. **Bitrix**: отдельных бесплатных расширений нет — общий PHP-стек
   (phpactor + Xdebug) покрывает; сниппеты по мере надобности в `php.code-snippets`.

## Справочники

- [extensions.md](references/extensions.md) — полный перечень расширений, ID, что даёт каждое
- [debugging.md](references/debugging.md) — рецепты отладки PHP/JS/Rust пошагово
- [snippets.md](references/snippets.md) — как пользоваться и добавлять live templates
- [phpactor.md](references/phpactor.md) — paths реального бинараря, `.phpactor.json` для Laravel, кэш индекса, PHPCS 4.x exit-коды и тост php-resolver
