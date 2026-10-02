[← Предыдущий гайд](github-ci.md) · [К README](../README.md)

# Отдельный Laravel-корень: полный IntelliSense для Laravel + Vue 3 + Alpine.js + Inertia + Vite

> Рецепт «из коробки» для Laravel-проекта, открытого в Code OSS (или VS Code)
> **отдельным корнем** (вне воркспейса): подсказки PHP/Laravel/Blade, Vue 3 на
> чистом JavaScript (без TypeScript), Alpine.js без ложных ошибок, пути Vite
> (`@/`), форматирование «один форматтер на язык» и Emmet. Стек: PHP 8.x+,
> Laravel, Inertia.js, Vite, HTML + чистый CSS/SCSS; **без** Tailwind и
> Livewire. Кейс: `<laravel-проект>`. Дата: 2026-09-29.
>
> Модель — **global-first** (как [js-standalone-root.md](js-standalone-root.md)):
> редакторское поведение живёт в машинных user settings, в проект кладём только
> незаменимое. Все расширения — полностью бесплатные (без freemium).

## TL;DR — порядок действий

1. Удалить конфликтующие расширения (Vetur, Intelephense/DEVSENSE, phpactor,
   php-resolver) — [раздел 1](#1-расширения-установка-и-чистка-конфликтов).
2. Установить веб-подмножество рекомендаций одной командой — раздел 1.
3. Развернуть машинный уровень: `tools/machine/install.sh` + ключи user
   settings — [раздел 2](#2-settingsjson-форматтеры-по-языкам--emmet).
4. Положить в проект `jsconfig.json` + сверить алиас `@/` в `vite.config.js` —
   [раздел 3](#3-vite--inertia-пути-алиасы-jsconfig-composer-помощники).
5. Пройти чек-лист проверки — [раздел 5](#5-чек-лист-проверки-и-подсказки-пропали).

## Что живёт где (глобальная модель)

| Возможность | Где настроено |
|---|---|
| Табы ×2, формат-on-save, форматтеры per-lang, `prettier.*`, Emmet, `php.validate.enable: false` | машинные user settings (снимок [`tools/machine/Code-OSS-User-settings.jsonc`](../tools/machine/Code-OSS-User-settings.jsonc)) |
| PHP-форматирование с табами | машинный `~/.config/vscode-php-cs-fixer/` (deploy — `tools/machine/install.sh`); для CLI/CI — проектный `.php-cs-fixer.php` |
| Подсказки PHP/Laravel/Blade | расширения: `phpantom.phpantom` + `laravel.vscode-laravel` (роли разделены) |
| Границы JS-проекта, алиас `@/`, переходы/автоимпорты | **проект**: `jsconfig.json` (+ алиас в `vite.config.js`) |
| Линтинг JS/Vue + автофикс на сохранении | **проект**: `eslint.config.js` (flat, глобальным не бывает) + user settings (`fixAll.eslint`) |
| Ассоциации стека (`*.blade.php`, `*.css`→`scss` при postcss-конфиге) | машинные user settings; дублируются в `.vscode/` проекта, если корень открывают на машине без глобалей |
| Отступы вне VS Code | **проект**: `.editorconfig` (`indent_style = tab`, `indent_size = 2`) |
| Отладка (F5) | **проект**: `.vscode/launch.json` — Xdebug + Chrome поверх Vite |
| Live templates (сниппеты PhpStorm-стиля, вкл. `alp*` для Alpine) | машинно: `~/.config/Code - OSS/User/snippets/` из `tools/machine/install.sh` |

## 1. Расширения: установка и чистка конфликтов

### Установка одной командой

Веб-подмножество рекомендаций воркспейса (все — на Open VSX, все бесплатные):

```bash
for e in \
  phpantom.phpantom laravel.vscode-laravel onecentlin.laravel-blade \
  shufo.vscode-blade-formatter xdebug.php-debug junstyle.php-cs-fixer \
  Recca0120.vscode-phpunit mikestead.dotenv \
  connorontheweb.alpinejs-tools Vue.volar dbaeumer.vscode-eslint \
  esbenp.prettier-vscode csstools.postcss \
  vunguyentuan.vscode-css-variables christian-kohler.npm-intellisense \
  editorconfig.editorconfig
do code-oss --install-extension "$e"; done
```

(В обычном VS Code CLI называется `code` — замените `code-oss` в командах.)

### Роли (кто за что отвечает)

| Область | Расширение | Что даёт |
|---|---|---|
| PHP — типы, Laravel, Blade | `phpantom.phpantom` | Rust-LSP (MIT): completion/hover/F12/диагностика PHP **и** `.blade.php` (виртуальная препроцессация, подсказки хелперов в `@php … @endphp`); Eloquent-отношения, scopes, контейнер `app('…')`; генерация `@property`-аннотаций из живой БД; log-viewer, artisan-раннер, route list |
| Laravel — пути | `laravel.vscode-laravel` | официальный Laravel LSP: completions/links для `@include`, `view()`, `route()`, `config()`, `env()`, `__()`, middleware, validation |
| Blade — подсветка | `onecentlin.laravel-blade` | подсветка + сниппеты Blade |
| Blade — форматтер | `shufo.vscode-blade-formatter` | форматирование `.blade.php` (табы — настройками, раздел 2) |
| PHP — форматтер | `junstyle.php-cs-fixer` | формат-on-save PHP через php-cs-fixer (табы ×2) |
| PHP — отладка | `xdebug.php-debug` | F5 → Listen for Xdebug (порт 9003) |
| PHP — тесты | `Recca0120.vscode-phpunit` | гуттер-раннер PHPUnit/Pest |
| Env | `mikestead.dotenv` | подсветка `.env` |
| Vue 3 | `Vue.volar` | официальный «Vue - Official» (ex-Volar) — см. ниже |
| Alpine.js | `connorontheweb.alpinejs-tools` | IntelliSense директив Alpine в HTML — см. ниже |
| JS-качество | `dbaeumer.vscode-eslint` | диагностика + автофикс на сохранении |
| Форматтер фронта | `esbenp.prettier-vscode` | JS/Vue/CSS/SCSS/HTML/JSON/MD |
| CSS-подсветка | `csstools.postcss` | только подсветка совр. CSS (ловушка — раздел «CSS/SCSS» ниже) |
| CSS-переменные | `vunguyentuan.vscode-css-variables` | `var(--…)` по всему проекту (+ `**/*.vue`), Node ≥ 20 |
| Импорты npm | `christian-kohler.npm-intellisense` | автокомплит npm-модулей в import |

Роли PHP-LSP разделены по принципу «один язык — один сервер»: **phpantom** —
типы и PHP-код (включая `@php`-блоки Blade), **Laravel LSP** — пути
(`@include`/`view()`/`route()`/`config()`). Переменные, передаваемые во view
из контроллеров, статически не резолвит ни один LSP — это runtime.

### Vue 3 на чистом JavaScript (без TypeScript)

- Ставится **один** `Vue.volar` (ID сменился с `vuejs.volar` на `Vue.volar` —
  это то же расширение, старый ID обновится сам).
- TypeScript-зависимостей нет: Volar использует встроенный JS-сервис VS Code.
  Границы проекта и алиасы задаёт `jsconfig.json` (раздел 3) — **не** tsconfig.
- SFC пишутся как `<script setup>` без `lang="ts"`; JSDoc-касты
  (`/** @type {…} */`) работают, когда нужен тип.
- Машинные ключи для Vue: `editor.quickSuggestions.strings: true` (подсказки в
  строках-атрибутах), `javascript.updateImportsOnFileMove.enabled: "always"`
  (переименование файла чинит import-пути).

### Alpine.js: подсветка без ложных ошибок

- В `.html` — `connorontheweb.alpinejs-tools` даёт completion/hover по
  директивам (`x-data`, `x-show`, модификаторы).
- В `.blade.php` — директивы остаются обычными HTML-атрибутами (подсветка от
  Blade-расширения), но есть **главный конфликт**: `@click`, `@keydown` —
  это синтаксис Blade-директив. Blade пытается резолвить `@click` как
  директиву и падает. Решение — канонический `x-on:`:

  ```html
  {{-- НЕ так: @click="open = true" — конфликт с Blade --}}
  <button x-on:click="open = true">Открыть</button>
  {{-- или экранирование: @@click компилируется в @click --}}
  <button @@click="open = true">Открыть</button>
  ```

- Остаточные ложные диагностики phpantom на конкретную директиву гасятся
  точечно через `[[diagnostics.ignore]]` (identifier + message-regex) в
  `~/.config/phpantom_lsp/.phpantom.toml` — по образцу `$page` из
  [vue-css-intellisense.md](vue-css-intellisense.md) (матрица, строка 9).
- Сниппеты `alp*` (alpine-директивы) — в `html.code-snippets`; на любую машину
  — `tools/machine/install.sh` (user-уровень, действуют в любом окне).

### CSS/SCSS: навигация и автокомплит

- Подсказки свойств/значений и color picker даёт **встроенный** CSS-сервис
  VS Code (MIT, входит в OSS-сборку) — для `css`/`scss` ничего ставить не нужно.
- `vunguyentuan.vscode-css-variables` — `var(--…)` из всех файлов проекта
  (встроенный сервис видит только текущий файл), включая `**/*.vue`.
- Ловушка postcss: если в корне проекта есть `postcss.config.js` (плагины
  postcss-mixins/simple-vars/nesting), plain `*.css` перехватывается языком
  `postcss`, у которого нет language server — подсказки гаснут полностью.
  Фикс — ассоциация `"*.css": "scss"` в settings проекта (раздел 2). Язык
  `postcss` для `.pcss`/`.postcss` **запрещён** — только `scss`.
- Прыжок от класса в шаблоне к CSS-правилу: во Vue — hover по class-токену
  (расширение `povly.vscode-vue-css-jump` ≥ 0.5.0, ставится из VSIX —
  раздел 4); в Blade/HTML — опционально `pranaygp.vscode-css-peek`.

### Что удалить (конфликты и freemium)

```bash
code-oss --uninstall-extension octref.vetur
code-oss --uninstall-extension bmewburn.vscode-intelephense-client
code-oss --uninstall-extension devsense.phptools
```

| Удалить | Почему |
|---|---|
| `octref.vetur` (Vetur) | старый Vue-стек для Vue 2 — конфликтует с Volar, ломает подсказки в `.vue` |
| `bmewburn.vscode-intelephense-client` (Intelephense) | freemium (rename/organize imports платные) + второй PHP-LSP конфликтует с phpantom |
| `devsense.phptools` (DEVSENSE) | freemium, та же причина |
| `phpactor.vscode-phpactor` | заменён phpantom (18.09.2026): падения индексатора на `storage/` |
| `stoildobreff.php-resolver` | дубль возможностей phpantom + ложный phpcs-тост (PHPCS 4.x) |
| `bradlc.vscode-tailwindcss` | Tailwind не используется |
| builtin «PHP Language Features» | отключается ключом `php.validate.enable: false` (см. раздел 2) — иначе второй линтер PHP поверх phpantom; «PHP Language Basics» оставить для подсветки |

## 2. settings.json: форматтеры по языкам + Emmet

Два уровня. Правило **global-first**: редакторское поведение — машинные user
settings (`~/.config/Code - OSS/User/settings.json`), действует в любом
открытом корне; `.vscode/` проекта — только то, что привязано к особенностям
стека (ассоциации, рекомендации), чтобы корень работал и на машинах без
глобалей.

### Машинный уровень (user settings)

Развёртывание — `tools/machine/install.sh` (php-cs-fixer + сниппеты), затем
перенести ключи в user settings (обязательный минимум; полный снимок —
[`tools/machine/Code-OSS-User-settings.jsonc`](../tools/machine/Code-OSS-User-settings.jsonc)):

```jsonc
{
  // ── Отступы: табы ×2, стабильно ──
  "editor.tabSize": 2,
  "editor.insertSpaces": false,
  "editor.detectIndentation": false,

  // ── Форматирование: один форматтер на язык (Ctrl+Shift+I ≡ Ctrl+S) ──
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "prettier.useTabs": true,
  "prettier.tabWidth": 2,
  "prettier.singleAttributePerLine": true,
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },

  // PHP — php-cs-fixer (машинный конфиг даёт табы; Pint табы не умеет)
  "[php]": { "editor.defaultFormatter": "junstyle.php-cs-fixer" },
  "php-cs-fixer.config": "~/.config/vscode-php-cs-fixer/.php-cs-fixer.php",
  "php-cs-fixer.executablePath": "~/.config/vscode-php-cs-fixer/php-cs-fixer-wrapper.sh",

  // Blade — blade-formatter (префикс bladeFormatter.*, НЕ blade.*)
  "[blade]": { "editor.defaultFormatter": "shufo.vscode-blade-formatter" },
  "bladeFormatter.format.useTabs": true,
  "bladeFormatter.format.indentSize": 2,
  "bladeFormatter.format.wrapAttributes": "auto",

  // Фронт — Prettier
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[vue]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[html]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[css]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[scss]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[markdown]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },

  // JSON/YAML — единственное исключение: 2 пробела
  "[json]": { "editor.insertSpaces": true, "editor.tabSize": 2, "prettier.useTabs": false },
  "[jsonc]": { "editor.insertSpaces": true, "editor.tabSize": 2, "prettier.useTabs": false },
  "[yaml]": { "editor.insertSpaces": true, "editor.tabSize": 2, "prettier.useTabs": false },

  // ── Подсказки ──
  "editor.quickSuggestions": { "other": true, "comments": false, "strings": true },
  "editor.snippetSuggestions": "top",
  "editor.tabCompletion": "onlySnippets",
  "javascript.updateImportsOnFileMove.enabled": "always",
  "typescript.updateImportsOnFileMove.enabled": "always",

  // ── Emmet для Blade / PostCSS ──
  "emmet.includeLanguages": { "blade": "html", "postcss": "css" },
  "emmet.triggerExpansionOnTab": true,

  // ── Ассоциации стека ──
  "files.associations": {
    "*.blade.php": "blade",
    "*.pcss": "scss",
    "*.postcss": "scss"
  },
  "scss.lint.unknownAtRules": "ignore",
  "cssVariables.lookupFiles": [
    "**/*.css", "**/*.scss", "**/*.sass", "**/*.less", "**/*.vue"
  ],

  // ── PHP: единый источник диагностики — phpantom ──
  "php.validate.enable": false,
  "php.debug.idekey": "VSCODE"
}
```

Нюансы:

- Табы PHP живут в конфиге php-cs-fixer (`Config->setIndent("\t")`), НЕ в
  настройках правила — `php-cs-fixer.rules` символ отступа не переключает.
  Laravel Pint не умеет табы вовсе (правило `indentation_type` берёт отступ из
  `Config->getIndent()`, который Pint не экспонирует) — канон php-cs-fixer
  (разбор — [tools/machine/README.md](../tools/machine/README.md), «Ключевой факт»).
- `php.validate.enable: false` обязателен: builtin-валидатор линтит каждый
  открытый файл (включая vendor) и дублирует phpantom.
- Emmet во `vue` встроен (language `vue` обслуживается Emmet из коробки);
  в `blade` подключается парой `blade → html` выше. `triggerExpansionOnTab`
  сочетается с live templates: `tabCompletion: "onlySnippets"` разворачивает
  сниппет, если он в топе списка (`snippetSuggestions: "top"`), иначе Tab
  уходит Emmet'у.

### Проектный минимум (`.vscode/settings.json` отдельного корня)

Кладётся, когда корень открывают на машинах без глобалей — дублирует
стек-специфичные ключи (остальное подтянется из user settings):

```jsonc
{
  // стек-ассоциации: Blade и postcss-диалект в plain *.css
  "files.associations": {
    "*.blade.php": "blade",
    "*.css": "scss"
  },
  // var(--) — только из исходников проекта
  "cssVariables.lookupFiles": [
    "resources/css/**/*.css",
    "resources/js/**/*.vue",
    "resources/js/**/*.css"
  ],
  "scss.lint.unknownAtRules": "ignore"
}
```

`"*.css": "scss"` — только если в корне есть `postcss.config.js` (иначе plain
CSS перехватывается языком `postcss` без IntelliSense). Плюс
`.vscode/extensions.json` с рекомендациями из раздела 1 — тогда «Install All»
работает из самого проекта.

### Матрица «язык → форматтер»

| Язык | Форматтер | Где задан | Табы |
|---|---|---|---|
| PHP | `junstyle.php-cs-fixer` | машина (конфиг `~/.config/vscode-php-cs-fixer/`); CLI/CI — `.php-cs-fixer.php` в корне проекта | `\t` ×2 из `setIndent` |
| Blade | `shufo.vscode-blade-formatter` | машина (`bladeFormatter.*`); CLI — `.bladeformatterrc` | `useTabs: true, indentSize: 2` |
| Vue / JS / CSS / SCSS / HTML / MD | `esbenp.prettier-vscode` | машина (`prettier.*`); CLI — `.prettierrc` | `useTabs: true, tabWidth: 2` |
| JSON / YAML | Prettier (перекрытие) | машина (`[json]`/`[jsonc]`/`[yaml]`) | 2 пробела |

Проектные CLI-конфиги для CI (в git проекта): `.php-cs-fixer.php`
(`composer require --dev friendsofphp/php-cs-fixer`, проверка
`vendor/bin/php-cs-fixer fix --dry-run`), `.prettierrc`
(`{"useTabs": true, "tabWidth": 2}`), `.bladeformatterrc`
(`{"useTabs": true, "indentSize": 2}`) — шаблоны:
[tools/machine/README.md](../tools/machine/README.md).

## 3. Vite + Inertia: пути-алиасы, jsconfig, composer-помощники

### `jsconfig.json` (корень проекта) — границы JS-проекта и алиас `@/`

Без jsconfig файлы живут в «inferred project» tsserver: нет сквозных
переходов, автоимпортов и семантической диагностики. Рецепт — адаптация
[js-standalone-root.md](js-standalone-root.md) под структуру Laravel:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "checkJs": true,
    "noEmit": true,
    // Без strict: прикладной JS без JSDoc-типов не должен «шуметь»
    // (TS 7 включает strict-проверки по умолчанию — гасим явно)
    "strict": false,
    "baseUrl": ".",
    "paths": { "@/*": ["resources/js/*"] },
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["resources/js/**/*"],
  "exclude": ["node_modules", "vendor", "storage/framework", "public/build"]
}
```

Эффект: Ctrl+Click/F12 по `@/Components/AppHeader.vue` и относительным
import-путям, автоимпорт при переименовании/переносе файлов
(`updateImportsOnFileMove`), диагностика `no-undef`-класса в JS.

### `vite.config.js` — алиас обязан совпадать с jsconfig

```js
import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig({
	plugins: [
		laravel({
			input: ["resources/css/app.css", "resources/js/app.js"],
			refresh: true,
		}),
		vue(),
	],
	resolve: {
		alias: {
			"@": path.resolve("./resources/js"),
		},
	},
});
```

Нюансы:

- `laravel-vite-plugin` ≥ 1.0 уже регистрирует алиас `@` → `./resources/js`;
  явный блок `resolve.alias` нужен, если алиас другой или добавляете свои
  (например `~` для ресурсов). Главное правило: **алиас в vite и `paths` в
  jsconfig — один и тот же путь**, иначе редактор и сборка разъедутся.
- `laravel-vite-plugin` и `@vitejs/plugin-vue` уже в стартере — отдельно не
  ставятся; для качества — `npm i -D prettier eslint` — расширения подхватятся
  автоматически. ESLint 9 flat config
  (`eslint.config.js`) — только в проекте, глобальным не бывает (рецепт —
  [js-standalone-root.md](js-standalone-root.md)).

### Inertia: что реально работает статически

Честная граница: **Ctrl+Click из контроллера к Vue-компоненту невозможен** —
`Inertia::render('User/Edit')` это строка, переменные во view статически не
резолвит ни один LSP (runtime-данные). Рабочие тропинки:

1. Внутри JS-дерева всё работает: страницы резолвятся в `resources/js/app.js`
   через `resolvePageComponent(import.meta.glob("./Pages/**/*.vue"))`
   (хелпер из `laravel-vite-plugin/inertia` в стартерах Laravel/Breeze) —
   переходы/подсказки по компонентам полноценные (jsconfig из этого раздела).
2. Навигация «откуда пришло» — `@see`-докблоки: в `app/Http/Controllers` над
   render-вызовами, и `@var`+`@see` для `$page` в `resources/views/app.blade.php`
   (готовый блок — [vue-css-intellisense.md](vue-css-intellisense.md), раздел
   «Blade: Inertia `$page`»).
3. Laravel LSP покрывает обычные Blade-точки: `view()`, `@include`, `route()`,
   `config()` — completions и links.

### Composer-помощники: что ставить, чтобы редактор «видел» Laravel

| Задача | Инструмент | Комментарий |
|---|---|---|
| `@property`-аннотации Eloquent-моделей (`User::where()->` цепочки, `$user->name`) | **phpantom**: `Alt+M` / команда `phpantom.generateModelAnnotations` | канон воркспейса: генерирует из живой БД, без пакетов и артизан-обёрток |
| Сигнатуры фасадов (`View::make`, `Route::get`) | `barryvdh/laravel-ide-helper` → `_ide_helper.php` | опция: статические докблоки фасадов, работают и для AI-агентов |
| Контейнер/фабрики (`app(...)`, `Model::factory()`) | ide-helper → `.phpstorm.meta.php` | опция, маппинг container-бинденов |
| `@property` моделей из CLI/CI | ide-helper: `php artisan ide-helper:models --nowrite` | печатает блоки для вставки в модели — если не хочется держать phpantom-генератор под рукой |

Установка опции:

```bash
composer require --dev barryvdh/laravel-ide-helper
php artisan ide-helper:generate            # _ide_helper.php (фасады)
php artisan ide-helper:meta                # .phpstorm.meta.php (контейнер)
php artisan ide-helper:models --nowrite    # @property-блоки в stdout
```

`_ide_helper.php` и `.phpstorm.meta.php` либо коммитят (репозиторий
самодокументируется), либо добавляют в `.gitignore` и генерируют локально —
на ваш выбор. phpantom читает оба файла как обычные PHP-стабы. Секретов в них
нет, но в AI-контекст генерированные дампы не тащите — только как файлы на
диске.

## 4. Code OSS и Open VSX: если расширения нет или устарело

Маркетплейс Code OSS — **open-vsx.org**. Всё из раздела 1 опубликовано там
(проверено 2026-09), версии могут отставать от MS Marketplace на несколько
дней — для рутинной работы некритично.

Порядок действий, когда расширение отсутствует или сильно устарело:

1. **Взять готовый `.vsix`**:
   - страница расширения на open-vsx.org → «Download»;
   - GitHub Releases самого расширения (у большинства — там);
   - страница на marketplace.visualstudio.com → «Download Extension»
     (лицензия отдельных MS-расширений запрещает использование вне VS Code —
     сначала проверять; политика воркспейса — искать бесплатный аналог,
     см. [themes.md](themes.md), раздел «Кого в списке НЕТ»).
2. **Установить из файла**:

   ```bash
   code-oss --install-extension <файл>.vsix --force
   ```

   или UI: Extensions → `···` → **Install from VSIX…** Флаг `--force` —
   обновление поверх установленной версии.
3. **Автообновление не мешает**: `extensions.autoUpdate: "onlyEnabledExtensions"`
   — обновляются только включённые расширения, VSIX-версия не перетирается
   молча.

Внутрипроектный пример VSIX-потока — собственное расширение воркспейса
`povly.vscode-vue-css-jump` (hover/Ctrl+Click по `<style src>`, карточки
props/emits, hover по class-токену): исходники в
`tools/vscode-vue-css-jump/`, `npm run package` → `dist/*.vsix` →
`code-oss --install-extension dist/<файл>.vsix --force`.

Чего НЕ делать: подменять галерею в `product.json` на MS Marketplace —
серая зона лицензий и рассинхрон с идеологией OSS-сборки. Нужной
функциональности в списке раздела 1 это не добавит.

## 5. Чек-лист проверки и «подсказки пропали»

### Позитивные проверки (по стеку)

| Что проверяем | Как | Ожидание |
|---|---|---|
| Алиас `@/` | в `resources/js/app.js` напечатать `import X from "@/C` | completion путей; Ctrl+Click по существующему `@/…` → переход в `resources/js/…` |
| Inertia-компоненты | в `resources/js/Pages/*.vue` обратиться к `@/Components/…` | F12/hover по компоненту работают внутри JS-дерева (карточка props — с vue-css-jump); `$page` — через `@var`-докблок (раздел 3) |
| Alpine | в `.blade.php` набрать `x-on:click="` и `x-data="{ o` | подсказки значений в строках (`quickSuggestions.strings`); без «Unknown directive» на `x-on:*` |
| CSS/SCSS | в `app.css` набрать свойство и `var(--` | property-completion; `var(--)` из всех файлов проекта; color picker у `#hex` |
| Laravel — модели | `User::whe` + `->` по цепочке; `$user->n` | completion Eloquent-методов и колонок (после `@property`-аннотаций phpantom Alt+M) |
| Laravel — фасады/роуты | `View::ma`, `route('`, `@include('` | подсказки имён (Laravel LSP + ide-helper-стабы) |
| Blade | `@php … @endphp` с хелпером внутри | hover/F12 по хелперу (phpantom) |
| Форматирование | испортить отступ в `.php`, `.blade.php`, `.vue`, `.js`, `.css` → Ctrl+S | каждый файл выправлен своим форматтером, табы ×2, без диалога «Multiple Formatters» |
| Emmet | в `.blade.php` набрать `div.card>ul>li*3` + Tab | разложилось в разметку |

### «Подсказки внезапно пропали» — матрица «симптом → фикс»

| Симптом | Причина | Фикс |
|---|---|---|
| В `.vue` куцые подсказки / дичь вместо типов | стоит Vetur или второй Vue-LSP рядом с Volar | удалить Vetur (раздел «Что удалить»), `Developer: Reload Window` |
| PHP-диагностика задвоена/конфликтует | второй PHP-LSP (Intelephense/DEVSENSE/phpactor) или builtin-линтер | удалить дубль, `php.validate.enable: false` |
| Нет подсказок CSS-свойств в `.css` | язык файла `postcss` (в корне `postcss.config.js`) | ассоциация `"*.css": "scss"` (раздел 2) |
| F12 по `@/…` не работает | нет/сломан `jsconfig.json` — inferred project | восстановить jsconfig (раздел 3), reload |
| Переходы/подсказки «залипли» | упал языковой сервер | `Vue: Restart Vue and TS Server` (палитра), статус phpantom в статус-баре; `Developer: Reload Window` |
| Problems забиты чужим кодом (vendor) | нет path-ignore | `~/.config/phpantom_lsp/.phpantom.toml` — глобальные path-ignore ([clean-problems-formatting.md](clean-problems-formatting.md)) |
| Laravel LSP молчит (`@include` без подсказок) | LSP не стартовал / нет composer install | View → Output → канал **Laravel**; `php` в PATH, `composer install` выполнен |
| Окно живёт своей жизнью после смены настроек | user settings кэшированы | `Developer: Reload Window` после правок ассоциаций/алиасов |
| При сохранении `.php`: `Formatting failed: Failed to spawn pint: Permission denied (os error 13)` | деплой срезал exec-биты `vendor/bin/*` — phpantom-форматтер не может спавнить pint | `chmod +x vendor/bin/* artisan` от корня проекта — рецепт ниже |

### После деплоя: срезанные exec-биты в `vendor/bin`

Симптом → диагностика → фикс:

1. **Симптом**: при каждом сохранении `.php` (format-on-save) —
   `Formatting failed: Failed to spawn pint: Permission denied (os error 13)`,
   LSP-код `-32603`; из терминала `vendor/bin/<любой скрипт>` и `artisan`
   не запускаются («Permission denied»). `[php]`-форматтер phpantom
   автодетектит pint из `vendor/bin` — спавн падает на отсутствии `x`.
2. **Диагностика**: `ls -l vendor/bin/` — у скриптов `-rw-rw-r--` (нет
   exec-бита). Права срезает деплой-инструмент: копирование/vendor-синк
   без сохранения прав (маркер — «чужая» группа файла, напр. `http`).
   Сломаны не только форматирование, но и `composer test`/CI-скрипты,
   которые дёргают `vendor/bin/*` напрямую.
3. **Фикс** — одна команда от корня проекта:

   ```bash
   chmod +x vendor/bin/* artisan
   ```

   Проверка: `vendor/bin/pint --version` печатает версию, spawn OK.

Нюанс: `composer install` с нуля выставляет bin-права сам; повторный
деплой срежет снова — чинить в деплой-пайплайне (сохранение прав:
`rsync -p`, `tar -p`) или post-deploy-хуком с chmod.

### Инструменты воркспейса

- `tools/workspace-doctor.sh` — PASS/FAIL веб-стека машины (phpantom, Xdebug,
  машинный php-cs-fixer, расширения).
- `cd tools/intellisense-check && npm test` — автотест IntelliSense воркспейса
  (CSS/$style/Blade-кейсы; машине отдельного корня не мешает).
- Логи серверов: View → Output → `PHPantom` / `Laravel` / `Vue`.

## См. также

- [js-standalone-root.md](js-standalone-root.md) — прародитель паттерна:
  JS-корень на Vite (jsconfig, ESLint 9, JSDoc-касты)
- [vue-css-intellisense.md](vue-css-intellisense.md) — глубина по CSS/Vue:
  `$style`, CSS-модули, `var(--)`, пикер, Inertia `$page`, проектный уровень
- [clean-problems-formatting.md](clean-problems-formatting.md) — «Problems —
  только свой код», полная матрица форматтеров, регламент машинного php-cs-fixer
- [phpantom-wordpress.md](phpantom-wordpress.md) — та же модель для WP-инсталлов
  (политика LSP-бинарников, path-ignore, регресс-чеки)
- [phpactor-indexer-phpcs-fix.md](phpactor-indexer-phpcs-fix.md) — история
  миграции phpactor → phpantom (почему в Laravel-корнях не держат два PHP-LSP)
- [themes.md](themes.md) — политика расширений Open VSX: кого в списке НЕТ
- [github-ci.md](github-ci.md) — CI-шаблон для Laravel-проекта
  (`templates/laravel-ci.yml`: pint→php-cs-fixer, e2e)
