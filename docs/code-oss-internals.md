# Как работает Code OSS: архитектура, Extension API, работа с расширениями

[К README](../README.md) · [Каталог установленных расширений →](extensions-catalog.md)

> Базовый гайд по механике редактора: процессная модель Code OSS, жизненный
> цикл расширения, анатомия `package.json`, карта Extension API и CLI-флоу
> воркспейса. Факты сверены с официальной документацией VS Code Extension API
> (code.visualstudio.com/api, обновление страниц 30.09.2026) и разобраны на
> живом примере — собственном расширении воркспейса
> [tools/vscode-vue-css-jump](../tools/vscode-vue-css-jump/README.md).
> Инвентаризация того, что установлено сейчас, — в
> [extensions-catalog.md](extensions-catalog.md).

## Code OSS vs VS Code: что это и почему Open VSX

**Code OSS** — ядро редактора с открытым исходным кодом (MIT,
github.com/microsoft/vscode). Продукт **VS Code** — это сборка Microsoft поверх
того же ядра: фирменная упаковка, телеметрия, проприетарные компоненты и доступ
к **MS Marketplace**. Условия использования MS Marketplace разрешают его только
официальным продуктам VS Code, поэтому Code OSS работает с открытым реестром
**Open VSX** (Eclipse Foundation, open-vsx.org) — вендор-нейтральной альтернативой.

Практические следствия для воркспейса:

- **Все рекомендации проверяются на Open VSX** (принцип «только бесплатные» —
  см. [README](../README.md)): у каждого расширения из
  `.vscode/extensions.json` страница `https://open-vsx.org/extension/<publisher>/<name>`.
- Часть расширений существует **только в MS Marketplace** — Code OSS поставить
  их не может. Кейсы и замены — в гайде о темах
  ([themes.md](themes.md), раздел «Кого в списке НЕТ»).
- Бинарники расширений идентичны: формат VSIX общий, отличий в рантайме нет.

## Процессная модель: кто кого запускает

Code OSS — Electron-приложение. Логика разнесена по изолированным процессам:

| Процесс | Рантайм | Что делает |
|---|---|---|
| **Main** | Node.js | Жизненный цикл окна, меню, диалоги, координация остальных процессов |
| **Renderer** (один на окно) | Chromium (sandbox) | Workbench: файловое дерево, редактор **Monaco**, терминал, поиск |
| **Extension Host** | Node.js (отдельный процесс) | Исполняет код ВСЕХ расширений; общается с workbench по внутреннему RPC |
| Языковые серверы | внешние процессы (Rust, Node, …) | Анализ кода по протоколу **LSP**; запускаются расширениями-клиентами |

Ключевая идея изоляции: расширение **не может** напрямую трогать DOM/верстку
workbench и блокировать UI-поток — всё общение идёт через API-контракты. Это
защищает редактор от «плохих» расширений: зависший Extension Host убивается
перезапуском, окно остаётся живым.

### Конфигурации Extension Host

Расширений-хостов может быть несколько одновременно (официальная документация
«Extension Host»):

| Хост | Рантайм | Когда существует |
|---|---|---|
| `local` | Node.js | Всегда на десктопе; требует у расширения поле `main` |
| `web` | Browser WebWorker | VS Code для Web / web-расширения; требует поле `browser` |
| `remote` | Node.js на удалённой машине | Remote-SSH / контейнеры / WSL / Codespaces |

Куда попадёт конкретное расширение, определяет поле манифеста
**`extensionKind`**: `"workspace"` (нужен доступ к файлам проекта — там, где
воркспейс), `"ui"` (нужна машина рядом с интерфейсом — темы, устройства, низкая
латентность) или массив предпочтений `["ui", "workspace"]`. Большинство
расширений — `workspace`.

### LSP и DAP: расширение ≠ монолит

Две «интерграционные» точки вынесены в протоколы, чтобы анализаторы кода жили
отдельными процессами и не падали вместе с редактором:

- **LSP** (Language Server Protocol, JSON-RPC) — автодополнение, hover,
  go-to-def, диагностика. Расширение здесь — тонкий клиент
  (`vscode-languageclient`), а тяжёлый анализ делает внешний сервер. В этом
  воркспейсе так работают: **phpantom** (Rust-бинарь; возможности —
  [phpantom-lsp.md](phpantom-lsp.md)), **rust-analyzer** (in-tree, как
  официальный), **wgsl-analyzer**.
- **DAP** (Debug Adapter Protocol) — отладка: брейкпоинты, stepping, переменные.
  CodeLLDB (`vadimcn.vscode-lldb`) — DAP-адаптер поверх LLDB; Xdebug-расширение
  говорит DAP с Xdebug по wire-протоколу.

Правило выбора: чистое расширение (`main`-модуль + `vscode.*`) — когда нужна
интеграция в UI (команды, ховеры, деревья); language server — когда нужен
глубокий анализ языка и/или сервер уже существует (например, на Rust).

## Хранение и пути по платформам

Code OSS на разных ОС отличается только путями — формат данных один и тот же
(JSON-конфиги, структура каталогов расширений, `argv.json`). Базовые точки
(продукт VS Code — те же строки с `Code` вместо `Code - OSS` и `.vscode`
вместо `.vscode-oss`):

| Что | Linux | Windows | macOS |
|---|---|---|---|
| User data: `settings.json`, `keybindings.json`, `snippets/`, `globalStorage/`, кэши (Cache/, CachedData/, GPUCache) | `~/.config/Code - OSS/` | `%APPDATA%\Code - OSS\` | `~/Library/Application Support/Code - OSS/` |
| Профили | `…/User/profiles/<id>/settings.json` | то же, внутри `%APPDATA%` | то же |
| Расширения | `~/.vscode-oss/extensions/` | `%USERPROFILE%\.vscode-oss\extensions\` | `~/.vscode-oss/extensions/` |
| `argv.json` — постоянные CLI-флаги (crash-reporter, GPU и пр.) | `~/.vscode-oss/argv.json` | `%USERPROFILE%\.vscode-oss\argv.json` | `~/.vscode-oss/argv.json` |

Сборки-родственники живут по той же схеме, отличаются именами каталогов и CLI:

| Сборка | User data | Расширения | CLI |
|---|---|---|---|
| VS Code (продукт MS) | `~/.config/Code/` · `%APPDATA%\Code\` | `~/.vscode/extensions/` · `%USERPROFILE%\.vscode\` | `code` |
| Code OSS (эта машина, Arch) | `Code - OSS` | `.vscode-oss` | `code-oss` |
| VSCodium | `~/.config/VSCodium/` · `%APPDATA%\VSCodium\` | те же `~/.vscode-oss/` | `codium` |

Практические следствия: кэши лежат ВНУТРИ user-data (чистить при раздутии —
`Cache/`, `CachedData/`, `GPUCache/`; этой машине соответствует содержимое
`~/.config/Code - OSS/`); «хвосты» других сборок (`~/.config/Code`,
`~/.config/VSCodium`) можно удалить, если сборка с машины снята.

### Portable mode

Всё окружение редактора — в одну папку рядом с бинарём (официальные доки
«Portable mode»):

- **Windows/Linux**: создать папку `data` рядом с бинарнем (только ZIP/TAR.GZ
  дистрибутивы, НЕ установщики) → перенести в неё `data/user-data` и
  `data/extensions`. Папка `data` перекрывает `--user-data-dir` и
  `--extensions-dir`. Обновление = перетащить `data` в каталог новой версии.
- **Linux tar.gz дополнительно**: права setuid-хелпера песочницы —
  `sudo chown root <dir>/chrome-sandbox && sudo chmod 4755 <dir>/chrome-sandbox`.
- **macOS**: папка `code-portable-data` рядом с `.app`; если не подхватывается —
  снять quarantine: `xattr -dr com.apple.quarantine "Visual Studio Code.app"`.

### Remote-SSH: расширения в двух местах

Windows-клиент + Linux-хост: расширения делятся по `extensionKind` (см.
«Процессная модель») — UI-расширения (темы) ставятся на клиенте
(`%USERPROFILE%\.vscode-oss\`), workspace-расширения (LSP: phpantom,
rust-analyzer) — на хосте в `~/.vscode-server/` (имя каталога сервер-части
зависит от сборки remote-расширения). Глобальные настройки при этом у каждой
стороны свои; воркспейс-`.vscode` применяется на стороне хоста.

### Кросс-платформенная гигиена (правила воркспейса)

1. **Никаких абсолютных путей в настройках** — только `${workspaceFolder}`,
   `~` и имена из PATH. Пример: `"todo-tree.ripgrep.ripgrep": "rg"` вместо
   `"/usr/bin/rg"` (абсолютный путь сломался бы на Windows-машине).
2. **Концы строк — тремя слоями**: редактор (`files.eol: "\n"`) +
   `.editorconfig` (`end_of_line = lf`) + git (`.gitattributes`:
   `* text=auto eol=lf`). Без git-слоя Windows-чекаут с `core.autocrlf=true`
   получит CRLF в рабочих копиях.
3. **Платформенные ключи не конфликтуют**: `terminal.integrated.default
   Profile.linux/.windows/.osx` — суффикс скоупит ОС.
4. **Shell-скрипты** (`tools/*.sh`) — bash: на Windows запускать из Git Bash
   или WSL.
5. **CLI-имена**: `code-oss` (Arch) | `code` (VS Code) | `codium` (VSCodium) —
   `install-extensions.sh` перебирает все три.
6. **Watcher** полезен на всех ОС: `files.watcherExclude` экономит лимиты
   inotify на Linux (`fs.inotify.max_user_watches`) и дескрипторы
   `ReadDirectoryChangesW` на Windows.

## Жизненный цикл расширения

```text
установка (Open VSX / VSIX) ──► ~/.vscode-oss/extensions/<publisher>.<name>-<version>/
        │                              + служебный extensions.json (индекс каталога)
        ▼
   НЕАКТИВНО (код не исполняется вовсе — экономия CPU/RAM)
        ▼  событие из activationEvents (открылся файл нужного языка, вызвана команда…)
   АКТИВНО: Extension Host вызывает export activate(ctx) — один раз
        ▼
   работа: слушатели событий, провайдеры (hover/definition/…)
        ▼  завершение редактора
   export deactivate() — очистка (Promise, если чистка асинхронная)
```

Три состояния важны: до активации код расширения **не грузится вообще**; после
активации оно живёт до перезапуска хоста; повторная активация не происходит
никогда — «перезапустить расширение» = Reload Window.

### Activation events (обзор)

Объявляются в `activationEvents` манифеста; полный справочник —
code.visualstudio.com/api/references/activation-events. Самые ходовые:

| Событие | Активация когда |
|---|---|
| `onLanguage:vue` | открыт файл этого языка |
| `onCommand:<id>` | вызвана команда расширения |
| `workspaceContains:**/Cargo.toml` | в открытом воркспейсе есть файл по glob |
| `onView:<id>` / `onDebug*` / `onTaskType:<t>` | раскрыт view / старт отладки / задачи типа t |
| `onStartupFinished` | «после старта» — не тормозит запуск (замена `*`) |
| `*` | на старте ВСЕГДА — не использовать без крайней нужды |

Нюансы, о которых забывают:

- С VS Code **1.74** неявная активация: собственные `contributes` (команды,
  языки, view, custom editors, auth-провайдеры) активируют расширение сами —
  дублирующие `onCommand:`/`onLanguage:` записи не нужны.
- `onStartupFinished` — легальный способ «жить всегда», не влияя на время
  старта: событие выстреливает после того, как окно готово.
- Расширение обязано экспортировать `activate()`; `deactivate()` — должна, если
  есть что чистить (возвращает Promise при асинхронной чистке).

## Анатомия расширения: package.json

Всё, чем расширение «представляется» редактору — декларативный манифест.
Поля, которые встречаются практически всегда:

| Поле | Смысл |
|---|---|
| `name`, `publisher`, `version` | ID расширения `<publisher>.<name>` и версия |
| `engines.vscode` | Минимальная версия API-слоя (`^1.80.0`) — от неё зависит доступность `vscode.*` |
| `main` / `browser` | Точка входа Node.js- / web-расширения (обычно бандл `dist/extension.js`) |
| `activationEvents` | Когда грузить код (см. выше) |
| `contributes` | Декларативные вклады в UI/поведение (таблица ниже) |
| `categories`, `keywords`, `icon`, `repository`, `license` | Витрина Open VSX |

Основные точки `contributes` (полный список — Contribution Points в офиц. доках):

| Точка | Что добавляет в редактор |
|---|---|
| `commands` | Команды в Command Palette (`Ctrl+Shift+P`) |
| `configuration` | Свои ключи settings.json (autocompletion + схема) |
| `languages`, `grammars`, `snippets` | Язык, подсветка TextMate, сниппеты |
| `themes`, `iconThemes` | Цветовые и файловые темы |
| `debuggers` | Типы отладчиков (launch.json «type») |
| `jsonValidation` | Схемы для JSON-конфигов (`*.code-snippets`, `tsconfig`…) |
| `keybindings`, `menus` | Горячие клавиши, пункты меню |
| `views`, `viewsContainers` | Деревья в боковой панели (Activity Bar) |

А программная часть — namespace **`vscode.*`** в коде точки входа:
`commands` (регистрация команд), `languages` (registerHoverProvider,
registerDefinitionProvider…), `window` (статус-бар, сообщения, активный
редактор), `workspace` (файлы, настройки, `fs`), `debug`, `tasks`,
`authentication`, `extensions`. Контекст активации `vscode.ExtensionContext`
даёт `subscriptions` (освобождение ресурсов) и `extensionUri`.

Декларативное — всегда предпочтительнее программного: `contributes` работает
до активации (команда видна в палитре, пока код ещё не загружен) и не тратит
память.

## Пример из воркспейса: Vue CSS Jump

Своё расширение [tools/vscode-vue-css-jump](../tools/vscode-vue-css-jump/README.md)
(0.5.0) — наглядная анатомия на практике. Манифест `package.json`:

```jsonc
{
	"name": "vscode-vue-css-jump",
	"publisher": "povly",
	"version": "0.5.0",
	"engines": { "vscode": "^1.80.0" },
	"activationEvents": ["onLanguage:vue"],   // грузимся при открытии .vue
	"main": "./dist/extension.js",            // бандл (vite lib-mode → CJS)
	"contributes": {
		"commands": [{
			"command": "vue-css-jump.openType",
			"title": "Open Type Definition",
			"category": "Vue CSS Jump"
		}]
	}
}
```

Как это работает в рантайме:

1. Пользователь открывает `.vue`-файл → событие `onLanguage:vue` → Extension
   Host грузит `dist/extension.js` и вызывает `activate()`.
2. В `activate()` регистрируются провайдеры (`registerHoverProvider`,
   `registerDefinitionProvider`) — это даёт Ctrl+Click по `$style.*`,
   `<style src>` и карточки props/emits по hover.
3. Больше код расширения не исполняется: работает только когда пользователь
   ховерит/кликает — редактор вызывает провайдеры по требованию.

Пайплайн сборки (типовой для VSIX-first разработки): TypeScript + `@types/vscode`
→ vite lib-mode (CJS-бандл в `dist/`) → упаковка VSIX (здесь свой
`scripts/build-vsix.py`; канонично — `vsce package`) → установка
`code-oss --install-extension dist/*.vsix --force`. VSIX — обычный zip с папкой
`extension/`, тот же формат, что публикуется на Open VSX.

Платформенные ограничения, почувствованные на практике (полезно знать до
проектирования фич): у расширений **нет** API между окнами (файл из другого
окна фокусируется только в текущем), command-ссылки не живут внутри код-блоков
ховера, вложенных ховеров не существует. Полный список — в README расширения.

## CLI-управление: флоу воркспейса

```bash
code-oss --list-extensions --show-versions   # что установлено (+версии)
code-oss --install-extension <id> [--force]  # поставить/обновить (Open VSX)
code-oss --install-extension dist/*.vsix     # поставить из локального VSIX
code-oss --uninstall-extension <id>          # удалить
```

- Массовая установка рекомендаций —
  [tools/install-extensions.sh](../tools/install-extensions.sh): читает
  `.vscode/extensions.json` (JSONC-парсинг через php), ставит каждую позицию
  CLI, отчёт PASS/SKIP/FAIL. Для новой машины это и есть «разворачивание»
  окружения.
- Физически установленное лежит в `~/.vscode-oss/extensions/`
  (`<publisher>.<name>-<version>`, суффикс `-universal` / `-linux-x64` —
  платформенный таргет VSIX). Снапшот с версиями и лицензиями — в
  [extensions-catalog.md](extensions-catalog.md).
- Диагностика расширений: `Developer: Restart Extension Host`,
  `Extensions: Show Running Extensions` (время активации каждого),
  лог хоста — Output → Log (Extension Host).

## Куда развиваться дальше

- **Web extensions** (`browser`-entry): тот же манифест, рантайм WebWorker —
  работают в vscode.dev.
- **Proposed API** (`enabledApiProposals`): нестабильные возможности только для
  development-версий — в прод не публикуются.
- **Публикация на Open VSX**: Eclipse-аккаунт + `ovsx publish`; приватные
  расширения (как наше) живут флоу VSIX-релизов.
- Тонкая настройка «кто когда активируется» —
  `Developer: Show Running Extensions` + ревизия `activationEvents`: каждое
  `*` в манифесте чужого расширения — минус к скорости старта.

## См. также

- [Каталог установленных расширений](extensions-catalog.md) — все 49 позиций
  с версиями, лицензиями и ролями
- [Power-Ups](power-ups.md) — вердикты по расширениям-2026 и задачи tasks.json
- [Темы для Code OSS](themes.md) — Open VSX-флоу тем, кейсы MS-marketplace-only
- [PHPantom LSP](phpantom-lsp.md) — устройство language server на практике
- [Чистые Problems + форматирование](clean-problems-formatting.md) — политика
  «один форматтер на язык» и исключения чужого кода
- [Vue CSS Jump](../tools/vscode-vue-css-jump/README.md) — исходники своего
  расширения
