[← Предыдущий гайд](phpactor-indexer-phpcs-fix.md) · [К README](../README.md) · [Следующий гайд →](phpantom-wordpress.md)

# IntelliSense CSS / Vue / Laravel: диагностика и фикс

> Гайд закрывает симптомы планов `fix-vue-css-intellisense` (раунд 1),
> `fix-vue-external-style-completions` (раунд 3) и
> `fix-vue-style-src-nav-module-typing` (раунд 4): нет подсказок CSS-свойств,
> нет классов `$style` в Vue (вк. из **внешних** css-файлов через
> `<style src>`), hover/Ctrl+Click по пути в `src="…"`, TS-ошибка
> «File … is not a module», глобальные CSS-переменные не в списке, нет color
> picker, табы видны точками, Blade `@include` не подсказывает view-файлы,
> `Undefined variable` на Inertia-переменных Blade.
> Все фиксы уже применены в `.vscode/` этого воркспейса — здесь
> объяснения и чек-лист проверки на вашей машине/проекте.

## Матрица «симптом → причина → фикс»

| # | Симптом | Первопричина | Фикс (где) |
|---|---|---|---|
| 1 | Нет подсказок CSS-свойств/значений | `.pcss`/`.postcss` были ассоциированы с языком `postcss` — у него нет language server, встроенный CSS-сервис на этих файлах полностью отключается ([csstools/postcss-language#12](https://github.com/csstools/postcss-language/issues/12)) | `settings.json`: `*.pcss`/`*.postcss` → `scss` + `scss.lint.unknownAtRules: "ignore"` |
| 2 | `:class="$style…"` без классов | **inline** `<style module>`: по умолчанию `$style` — плоский `Record<string,string>` ([#1089](https://github.com/vuejs/language-tools/issues/1089)). **Внешний** `<style src="./x.css" module>`: Volar внешний CSS не читает — только генерирует `typeof import('./x.css').default` в типе ([#5136](https://github.com/vuejs/language-tools/pull/5136)), типизировать импорт обязан TS-плагин | jsconfig/tsconfig + `vueCompilerOptions` (`strictCssModules`/`resolveStyleImports`); для внешних файлов — `*.module.css` + расширение `mizdra.css-modules-kit-vscode` + `cmkOptions.enabled`; см. раздел `$style` |
| 3 | Глобальные `var(--…)` не в списке | Встроенный CSS-сервис видит переменные только текущего файла; `@import` не резолвится ([microsoft/vscode#28459](https://github.com/microsoft/vscode/issues/28459)) | расширение `vunguyentuan.vscode-css-variables` + `cssVariables.lookupFiles` (вкл. `**/*.vue`) |
| 4 | Нет color picker | В css/scss/vue пикер встроен, но в `.pcss` его не было (та же причина №1); в остальных языках выключен по умолчанию | `editor.colorDecorators: true` + `editor.defaultColorDecorators: true` + `naumovs.color-highlight` |
| 5 | Табы видны «точками» | `editor.renderWhitespace` показывал символы пробелов/табов | `renderWhitespace: "none"`; JSON/YAML — 2 пробела (`[json]`/`[jsonc]`/`[yaml]`-блоки) |
| 6 | Blade `@include` без подсказок view | Официальный Laravel LSP не установлен/не стартовал | расширение `laravel.vscode-laravel` + php/composer; см. раздел Laravel |
| 7 | Hover/Ctrl+Click по пути в `src="…"` (`<style>`, вк. самозакрытый `<style … />`) молчат | Volar не предоставляет links/definitions/hover на src-атрибутах SFC-блоков; path-intellisense — completions-only | расширение `povly.vscode-vue-css-jump` ≥ 0.1.2 (Definition + Hover; самозакрытые блоки поддержаны); см. раздел vue-css-jump |
| 8 | TS: `File '…​.css' is not a module` на внешние стили | `resolveStyleImports: true` генерирует `typeof import('./x.css')`; css-modules-kit типизирует строго `*.module.css` — plain `.css` остаётся без типа модуля | именовать ВСЕ внешние CSS-модули `*.module.css` (конвенция, см. «Дисциплина именования»); fallback — ambient-стаб `declare module '*.css'` (PR #5136) |
| 9 | Blade: `Undefined variable '$page'` (Inertia) | `$page` приходит в runtime из Inertia-middleware — статически не резолвит ни один LSP | `@var`-докблок в app.blade.php (тип в hover) + `@see`-тропинка для навигации к источникам (пример ниже); заглушка — `[[diagnostics.ignore]]` identifier+message-regex в `~/.config/phpantom_lsp/.phpantom.toml` |
| 10 | Hover по тегу компонента — стена генериков + import, пропсов не видно | Нативный Volar не строит читаемую сводку public API компонента | расширение `povly.vscode-vue-css-jump` ≥ 0.2.0 (карточка props/emits/v-model/expose); нативно — Ctrl+Space внутри тега; см. раздел «Компоненты» |

## Быстрая диагностика на машине (2 минуты)

1. **Language mode** — справа внизу статус-бара:
   `.css` → `CSS`, `.pcss` → `SCSS` (не PostCSS!), `.vue` → `Vue`, `*.blade.php` → `Blade`.
   Если нет — правый клик по статус-бару → «Change Language Mode», проверьте ассоциации.
2. **Ctrl+Space** в файле — список подсказок должен появиться принудительно.
3. **Расширения установлены?** Extensions → фильтр Recommended → **Install All**
   (рекомендации воркспейса). После установки — `Developer: Reload Window`.
4. **Output-каналы**: View → Output → выбрать `Vue` (ошибки сервера Volar) или
   `Laravel` (ошибки Laravel LSP). Пусто/без ошибок — хорошо.
5. **Node.js ≥ 20**: `node -v` — нужен Volar и css-variables расширению.

## CSS-подсказки: postcss-ловушка

Язык `postcss` (расширение `csstools.postcss`) даёт подсветку современного
синтаксиса, но **не имеет language server** — IntelliSense, валидация, hover и
color picker на таких файлах полностью отключаются. Поэтому в воркспейсе:

```jsonc
"files.associations": {
	"*.pcss": "scss",     // НЕ "postcss"!
	"*.postcss": "scss"
},
"scss.lint.unknownAtRules": "ignore"  // @tailwind/@apply/nesting без ложных ошибок
```

SCSS-сервис покрывает nesting и все подсказки. Расширение `csstools.postcss`
оставлено в рекомендациях только ради подсветки — при желании можно отключить.

## Глобально (User Settings) — применено на этой машине

Настройки воркспейса действуют только при открытом воркспейсе `_vscode`, поэтому
все фиксы **продублированы в пользовательские настройки Code OSS**
(`~/.config/Code - OSS/User/settings.json`, бэкап: `settings.json.bak-20260917`)
и действуют во **всех окнах и проектах**: отступы (табы ×2, без точек),
`files.associations` (`.pcss`/`.postcss` → `scss`, `*.blade.php` → blade),
`scss.lint.unknownAtRules`, `cssVariables.lookupFiles`, оба `colorDecorators`,
`quickSuggestions.strings`, `[json]`/`[jsonc]`/`[yaml]` = 2 пробела.
Расширения `vunguyentuan.vscode-css-variables` и `naumovs.color-highlight`
установлены глобально (`code-oss --install-extension …`).

Для другой машины: скопировать блок «IntelliSense CSS/Vue/Laravel — глобально»
из user-настроек (или весь `.vscode/settings.json` воркспейса) + установить
рекомендации.

## Code OSS (Open VSX)

Воркспейс полностью совместим с **Code OSS**: встроенные языковые фичи
(CSS/SCSS/TS/HTML IntelliSense) — MIT и входят в OSS-сборку, а все рекомендуемые
расширения опубликованы на **open-vsx.org** (проверено 2026-09):

| Расширение | Open VSX |
|---|---|
| `Vue.volar` (Vue - Official) | ✅ 3.3.11 |
| `laravel.vscode-laravel` | ✅ 2.0.1 |
| `vunguyentuan.vscode-css-variables` | ✅ 2.8.3 (Node ≥ 20) |
| `naumovs.color-highlight` | ✅ 2.8.0 |
| `mizdra.css-modules-kit-vscode` | ✅ 1.4.0 (типизация `*.module.css` для `$style`) |

Нюансы Code OSS:

- маркетплейс по умолчанию — Open VSX; версии могут отставать от MS
  Marketplace (некритично);
- если в вашей сборке галерея вовсе не настроена — скачайте `.vsix` с
  open-vsx.org и установите через Extensions → `···` → **Install from VSIX…**;
- автотест `tools/intellisense-check` скачивает отдельный официальный бинарь
  VS Code в `.vscode-test/` — вашему Code OSS он не мешает.

## `$style` (CSS Modules) во Vue — правила

Два способа подключения стилей, у каждого свой рецепт типизации:

- **inline**: `<style module>` внутри того же SFC (`scoped` ≠ `module`!);
- **внешний файл**: `<style src="./x.module.css" module></style>` — имя файла
  обязательно с суффиксом **`.module.css`** (требование css-modules-kit;
  самозакрытая форма `<style … />` тоже валидна — Vite и vue-css-jump её
  понимают).

> Подсказки member-list `$style.` дают **два независимых источника**:
> css-modules-kit (через tsserver — зависит от порядка активации серверов,
> см. ниже) и `povly.vscode-vue-css-jump` ≥ 0.1.2 (CompletionProvider,
> работает всегда). Достаточно любого; для hover-типа и строгой проверки — cmk.

Использование — в **`<template>`**: `:class="$style.card"`. Расширение
**Vue - Official (Volar)** активно, файл открыт как язык `vue`.

### Как это устроено «у них» (Volar 3.3.11, по коду расширения)

Volar **сам не читает внешний CSS**: для `<style src>` блок стилей пуст, имён
классов из него он не извлекает. Опция `resolveStyleImports` лишь добавляет в
тип `$style` конструкцию `typeof import('./x.module.css').default` — а
типизировать этот импорт обязан **TS-плагин**. Мейнтейнеры Volar рекомендуют
для этого **css-modules-kit** ([PR #5136](https://github.com/vuejs/language-tools/pull/5136)):
TS Language Service Plugin + Volar.js, расширяет tsserver — типизация
`*.module.css`-импортов, completions, go-to-def, rename, find-references.

### Рецепт: подсказки `$style.` (внутренние и внешние)

1. В корне Vue-проекта (рядом с `package.json`) — **`tsconfig.json`**
   (или `jsconfig.json` — но только для inline-стилей: css-modules-kit ищет
   строго `tsconfig.json`!). Без конфига Volar работает в fallback-режиме.
2. Установить расширение **`mizdra.css-modules-kit-vscode`** (MIT, Open VSX —
   см. таблицу выше): оно подключает `@css-modules-kit/ts-plugin` во встроенный
   tsserver автоматически (`typescriptServerPlugins`).
3. Внешние файлы стилей назвать `*.module.css` (пример из <laravel-проект>:
   `Sidebar.vue` ↔ `sidebar.module.css`).
4. `tsconfig.json`:

   ```jsonc
   {
     "compilerOptions": { /* ... */ },
     "vueCompilerOptions": {
       // false = $style: Record<string,string> & {типизированные ключи}: подсказки
       // есть, а обращение к ещё не написанному классу не даёт TS-ошибку.
       // true = строгий режим (подсветка несуществующих классов) — включать,
       // когда все *.module.css заполнены
       "strictCssModules": false,
       // генерирует в типе $style «typeof import('./x.module.css').default» (#5136)
       "resolveStyleImports": true
     },
     // css-modules-kit: без enabled:true ts-плагин неактивен («Project is not configured»)
     "cmkOptions": { "enabled": true },
     "include": [
       /* ...ts/vue... */
       "resources/js/**/*.css"   // include обязан покрывать *.module.css
     ]
   }
   ```

5. `Developer: Reload Window` (после правки tsconfig достаточно
   `TypeScript: Restart JS/TS Server`).

Важный нюанс активации (выяснен в раунде 3): Volar инъектирует
vue-typescript-plugin во встроенный tsserver **только если TS-расширение ещё
не активно** (функция-инъектор в extension.js: `if (isActive) return false`).
Если подсказки в `.vue` пропали после сессии работы — `Developer: Reload
Window` пересоздаёт порядок активации.

Бонусы css-modules-kit: go-to-def по `$style.<класс>` → открывает css-файл на
правиле; rename/find-all-references по классам; hover показывает литеральный
тип `$style`.

Ограничения css-modules-kit (by design):

- только чистый CSS (Sass/Less — нет; для них — happy-css-modules);
- **без camelCase-конверсии**: класс `.foo-bar` доступен как
  `$style['foo-bar']`, не `$style.fooBar` — в шаблонах пишите
  `:class="$style['foo-bar']"` или называйте классы без дефисов;
- `:local`/`:global` только функциональным синтаксисом (`:local(.x)`),
  блочный (`:local .x {…}`) не поддерживается;
- nesting-суффикс (`&Bottom` внутри `.items {…}` → класс `.itemsBottom`)
  может не типизироваться — при проблемах выписывайте класс отдельным правилом;
- `useCssModule()` в `<script setup>` не типизируется — сознательное решение
  Volar ([#548](https://github.com/johnsoncodehk/volar/issues/548));
- CLI `vue-tsc` 2.x опции `resolveStyleImports`/`strictCssModules` игнорирует
  (это language-core v3+, редакторские) — `npm run types:check` не меняется.
  При будущем апгрейде vue-tsc понадобится `@css-modules-kit/codegen`
  (`generated/*.module.css.d.ts` + `rootDirs`).

## vue-css-jump — навигация и подсказки `$style` без tsserver-цепочки

Свободное расширение воркспейса (`povly.vscode-vue-css-jump`, MIT; исходники:
`tools/vscode-vue-css-jump/` этого воркспейса, зеркало github.com/povly/vscode-vue-css-jump).
Закрывает дыры Volar собственными провайдерами — **независимо от tsserver/плагинов**:

| Фича | Как работает |
|---|---|
| Ctrl+Click / F12 по пути в `src="…"` (вк. самозакрытый `<style … />`, с 0.1.2) | DefinitionProvider: резолвит относительные/корневые пути, открывает файл |
| Hover по src-пути (с 0.1.2) | абсолютный путь + ✓ файл существует + кол-во проиндексированных классов |
| Ctrl+Click по `$style.класс` / `$style['kebab']` / `` $style[`tpl${…}`] `` | прыжок к селектору во внешнем css или inline-блоке (несколько совпадений — peek-список) |
| **Подсказки `$style.` / `$style['`** (с 0.1.2) | CompletionItemProvider: имена классов из css-модулей компонента, фильтр по префиксу (camelCase тоже матчится) |
| **Живая диагностика src-путей** (с 0.1.3) | несуществующий файл (регистр имени! Linux case-sensitive) — красная ошибка; `module` без суффикса `.module.css` — жёлтое предупреждение; в любом открытом .vue, нулевой конфигурации |
| Hover по `$style.класс` (с 0.1.2) | список совпавших селекторов с file:line / inline-позицией |
| **Карточка компонента по hover** (с 0.2.0) | hover по тегу компонента в template: таблица props (тип/required/default), emits с сигнатурами, `defineModel`-v-model, `defineExpose` + путь к файлу; PascalCase и kebab-case, алиасы `@/` из tsconfig paths |
| **Ctrl+Click по тегу компонента** (с 0.2.0) | DefinitionProvider: открывает файл компонента напрямую (нативный Volar ведёт на import-строку — оба результата мержатся в peek-списке) |

Установка (на Open VSX расширение не публикуется):

```bash
cd tools/vscode-vue-css-jump
npm run package                                # typecheck + vite build + vsix
code-oss --install-extension dist/*.vsix --force
```

Обновление версией выше: поднять `version` в package.json, запись в CHANGELOG.md,
пересобрать/переустановить; копию VSIX для автотеста класть в
`tools/intellisense-check/vendor/` (см. `src/runTests.js`).

Ограничения: line-based сканер (селекторы — по одному на строку; минифицированный
css не индексируется); после `$style.` вставляются только identifier-имена —
классы с дефисами предлагаются в скобочном контексте `$style['kebab-name']`
(иначе `$style.foo-bar` распарсится как вычитание); `$style[variable]` статически
не резолвится.

Паритет с css-modules-kit: cmk остаётся источником **типов** (hover-тип `$style`,
строгий `strictCssModules`, rename/find-references); vue-css-jump даёт
**навигацию и member-list**, которые не зависят от порядка активации
Volar/TS-серверов (уязвимость раундов 3–4).

## Blade: Inertia `$page` — `@see`-тропинка (откуда идёт переменная)

Статического прыжка по `$page` не существует (runtime из middleware), но в
app.blade.php работает докблок-тропинка: `@var` даёт тип в hover, `@see` —
навигацию Ctrl+Click'ом по классам-источникам:

```blade
@php
    /**
     * @var array{component: string, props: array<string, mixed>, url: string} $page
     *
     * $page приходит runtime из Inertia (статически не резолвится ни одним LSP).
     * Источники — Ctrl+Click по классам ниже:
     * @see \App\Http\Middleware\HandleInertiaRequests  share-пропсы проекта (bootstrap/app.php)
     * @see \Inertia\Response                            vendor: viewData + ['page' => $page] (Response.php)
     */
@endphp
```

(Прыжки по классам из докблоков — phpantom; `$page`-подсветка при этом может
остаться — тогда узкая заглушка через `[[diagnostics.ignore]]`, см. матрицу № 9.)

## Дисциплина именования `*.module.css`

Конвенция ломается при рефакторингах (перенос компонентов, новые файлы) —
раунд-4 нашёл все 7 внешних стилей <laravel-проект> снова plain `.css`:
пустой member-list + «is not a module» возвращаются. Чек-команда
(0 строк на выходе = порядок):

```bash
grep -rn --exclude-dir=node_modules '<style[^>]*src="[^"]*\.css"' resources/js | grep -v '\.module\.css'
```

## CSS-переменные `var(--…)`

Встроенный CSS-сервис ищет переменные **только в текущем файле** — переменные из
`resources/css/app.css`, подключённого через JS-import (Vite), он не видит.
Решение — бесплатное расширение **CSS Variable Autocomplete**
(`vunguyentuan.vscode-css-variables`, MIT):

- сканирует `css/scss/sass/less` (+ настроено `**/*.vue`) по всему проекту;
- подсказки в css/scss/vue/postcss, go-to-definition, превью цветов;
- файлы из node_modules (например open-props) добавляются через
  `cssVariables.lookupFiles`;
- требует Node.js ≥ 20.

## Color picker

- **css/scss/vue-style/pcss**: пикер встроен — кликните по квадратику-превью
  слева от цвета (или наведите — зависит от `editor.colorDecoratorsActivatedOn`);
- **любые другие файлы** (js/php/blade/rust…): включён
  `editor.defaultColorDecorators` — квадратики у `#hex`/`rgb()`-значений;
- **везде**: команда `editor.action.showOrfocusStandaloneColorPicker`
  («Show or Focus Standalone Color Picker») — можно повесить хоткей;
- именованные цвета (`red`, `white`) в любых языках подсвечивает
  `naumovs.color-highlight`;
- `anseki.vscode-color` НЕ ставим — репозиторий архивнут автором
  («Now, VS Code has own Color Picker»).

## Отступы: табы ×2, без точек

- `editor.insertSpaces: false`, `editor.tabSize: 2`, `detectIndentation: false`
  — настоящие табы шириной 2 везде;
- `editor.renderWhitespace: "none"` — табы/пробелы **не отображаются**
  (никаких `·`/`→` точек);
- единственное исключение — JSON/YAML: 2 пробела (`[json]`/`[jsonc]`/`[yaml]`
  блоки + `prettier.useTabs: false`), источник правды — `.editorconfig`.

## Laravel / Blade: `@include` и «все моменты»

Официальное расширение **`laravel.vscode-laravel`** (Laravel LSP) даёт
completions/links/hover/diagnostics для всех типовых мест:

| Место | Что подсказывает |
|---|---|
| `@include('…')`, `@extends`, `view('…')`, `Route::view` | пути view-файлов + «Create view» quick-fix |
| `route('…')`, `Redirect::route`, `URL::route` | имена роутов |
| `config('…')`, `Config::get` | ключи конфигов |
| `env('…')` | переменные окружения |
| `__('…')` | ключи переводов |
| middleware, Blade-компоненты, validation rules, controller actions | соответствующие значения |

(Полная матрица: [laravel/lsp](https://packagist.org/packages/laravel/lsp).)

**Если `@include` не подсказывает — по порядку:**

1. Расширение установлено и включено? (Extensions → Recommended → Install All.)
2. Файл открыт как язык **`blade`** (ассоциация `*.blade.php` уже в настройках).
3. Laravel LSP стартовал? View → Output → канал **Laravel** — там ошибки старта.
4. Есть `php` в PATH и выполнен `composer install` (LSP поднимает приложение
   в фоне для сбора данных). Нужный PHP задаётся `Laravel.phpEnvironment`.
5. Известный баг с переходом по клику на view в `@include` при симлинках
   ([#77](https://github.com/laravel/vs-code-extension/issues/77)) — линк можно
   отключить: `"Laravel.view.link": false` (completions при этом работают).
6. `editor.quickSuggestions.strings: true` уже включён — подсказки в кавычках
   появляются по ходу печати; Ctrl+Space работает всегда.

**`@php … @endphp` (PHP-код/хелперы в Blade)** — их даёт **PHPantom**
(`phpantom.phpantom`, основной PHP LSP воркспейса с 18.09.2026): completion /
hover / go-to-def / диагностика в `.blade.php` через виртуальную
PHP-препроцессацию. Роли разделены: официальный Laravel LSP — пути
(`@include`, `view()`, `route()`, `config()`), PHPantom — PHP-типы в `@php`.
Переменные view из контроллеров статически не резолвит ни один LSP.

## Проектный уровень настроек (пример: <laravel-проект>)

User-настройки работают во всех окнах, но проект с особенностями стека надёжнее
фиксировать в собственном `.vscode/` — тогда машина без глобальных настроек
получит то же поведение (Install All recommended из проекта):

- `.vscode/settings.json`:
  - CSS на postcss-плагинах (`@mixin` postcss-mixins, `$vars`
    postcss-simple-vars, nesting) в обычных `.css` — ассоциировать `*.css` → `scss`:
    SCSS-сервис понимает этот синтаксис и даёт полные подсказки свойств/значений
    (язык `postcss` по-прежнему запрещён — глушит IntelliSense);
  - `cssVariables.lookupFiles` можно сузить на проекте — например, только
    `resources/**/*.css` + `resources/**/*.vue`, чтобы `var(--…)` подсказывались
    исключительно из исходников проекта (массив на проектном уровне заменяет
    глобальный);
  - `"phpResolver.phpSnifferCommand": ""` для проектов на Pint (ложный тост phpcs).
- `.vscode/extensions.json` — рекомендации проекта: volar, laravel.vscode-laravel,
  css-variables, blade-formatter, editorconfig, prettier, path-intellisense.
- `tsconfig.json`: `vueCompilerOptions.strictCssModules` — опция language-core
  **v3+**: редакторский Volar 3.x типизирует `$style` фактическими классами;
  CLI `vue-tsc` 2.x её игнорирует — `npm run types:check` от неё не меняется
  (проверено на <laravel-проект>: vue-tsc 2.2.12, проба с несуществующими
  классами ошибок не дала). Диагностика — в редакторе после
  `Developer: Reload Window`.
- `strictCssModules` подсвечивает обращения к несуществующим классам CSS-модулей:
  в <laravel-проект> это вскрыло отсутствующие классы (`.header`/`.title`/
  `.icon`/`.text`/… — добавлены пустые заглушки по образцу проекта) и
  `<style src="./content.css">` на несуществовавший файл у `Profile.vue`
  (файл создан).
- `.phpactor.json`: `indexer.exclude_patterns` + kill phpactor + чистка
  `~/.cache/phpactor/index/<project>-<hash>` (см. docs/phpactor-indexer-phpcs-fix.md);
  VS Code перезапускает сервер сам (проверено: новый PID поднялся через секунды).
  *(18.09.2026: phpactor заменён на PHPantom — пункт сохранён как история;
  `.phpactor.json` в проектах инертен.)*

## Компоненты: props/emits/expose по hover

Симптом: наведение на тег компонента в template показывает стену генериков
(`DefineComponent<…>`) + строку import — читать пропсы из неё невозможно;
нужен «как в WebStorm» список параметров.

Нативно (Volar) работают:

- **Ctrl+Space внутри тега** (`<Button ` + Ctrl+Space) → список всех props
  с типами и JSDoc; основной способ «что сюда можно передать»;
- hover на **атрибуте** prop → тип значения;
- диагностика «обязательный prop не передан» — из коробки.

Читаемая карточка — расширение `povly.vscode-vue-css-jump` **≥ 0.2.0**:
hover по тегу любого локально импортированного компонента (PascalCase и
kebab-case) → таблица PROPS (имя/тип/required/default), EMITS с сигнатурами,
v-model (`defineModel`), EXPOSE (`defineExpose`) + путь к файлу; Ctrl+Click
по тегу открывает сам компонент, а не import-строку. Резолвятся относительные
импорты и алиасы tsconfig (`@/…`), спецификатор без `.vue` тоже. Библиотечные
компоненты (bare-импорты, напр. `@inertiajs/vue3`) остаются на нативном Volar.
Парсинг текстовый (не TS AST): типы длиннее 64 символов усекаются,
`defineProps<NamedInterface>` (не литерал) даёт «нет объявленного API».

**Как описывать компоненты** — обычный JSDoc, работает без настройки везде:

```vue
<script setup lang="ts">
/** Карточка товара в каталоге */
defineProps<{
	/** Текст на кнопке */
	text: string;
	/** Вариант отображения */
	type?: 'default' | 'border';
}>();
defineEmits<{
	/** Отправляется при сохранении */
	(e: 'save', id: number): void;
}>();
</script>
```

- JSDoc члена → в карточке vue-css-jump ≥ 0.3.0 (описания под таблицей
  props, у emits) и нативно в Ctrl+Space внутри тега + hover на атрибуте;
- JSDoc над `defineProps`/`withDefaults` → описание компонента в заголовке
  карточки.

Лог: Output → «Vue CSS Jump» (нерезолвленные локальные импорты — WARN раз на
файл; `VUE_CSS_JUMP_DEBUG=1` — трассировка). Регресс: кейс 10 автотеста.

## Автотест: `tools/intellisense-check`

Харнесс на `@vscode/test-electron` поднимает **чистый** инстанс VS Code
(скачивается в `.vscode-test/`, машину не трогает), ставит туда `Vue.volar`,
`vunguyentuan.vscode-css-variables` и `mizdra.css-modules-kit-vscode`
и прогоняет кейсы через `vscode.executeCompletionItemProvider`:

```bash
cd tools/intellisense-check
npm install
npm test            # есть дисплей; на headless-сервере: npm run test:headless
```

Кейсы: property-completion в `.css` / `.pcss` / `.vue`-style, `var(--` из другого
файла, TS в `<script setup>`, **классы из `*.module.css` в чистом `.ts` (кейс 6a,
строгий — запирает цепочку css-modules-kit)**, `$style` в template
(exploratory), DocumentColorProvider (пайплайн пикера), **кейсы 8/8b/8c
(раунд 4): vue-css-jump — DefinitionProvider по src-пути самозакрытого
`<style … />` (строгий), HoverProvider по src-пути (строгий), completions
`$style.` (exploratory)**, **кейсы 10/10a (0.2.0): карточка props/emits по
hover тега компонента (строгий) и нативные completions атрибутов внутри
тега (exploratory)**. VSIX vue-css-jump ставится в тестовый инстанс из
`vendor/` (обновляется при релизе расширения). Особенности харнесса
(не баги воркспейса):

- встроенный css-клиент тестового хоста не отвечает на запрос по префиксу
  посреди слова — кейс 1 проверяется на пустой позиции (фильтрация по префиксу
  гарантируется виджетом подсказок и подтверждается кейсом 3 для scss);
- **порядок активации критичен**: Volar инъектирует vue-typescript-plugin во
  встроенный tsserver только если TS ещё не активен — в `before()` Volar
  активируется первым, затем встроенные TS/CSS, затем
  `typescript.restartTsServer` (плагин-лист читается из runtime-манифестов
  при старте сервера);
- member-list `$style.` в template не воспроизводится программно даже при
  всех плагинах (root cause раунда 3, tsserver.log: `.vue` попадает в
  Inferred-проект — configured-проект по tsconfig не создаётся из-за
  «languageId not found» для `.vue`/`.css`; сами плагины загружаются — видно
  в `--globalPlugins`). Компоненты цепочки заперты кейсом 6a + конфигом
  `resolveStyleImports`; template-часть проверяется вручную (чек-лист, п. 4);
- диагностика загрузки плагинов: `"typescript.tsserver.log": "verbose"` в
  `fixtures/.vscode/settings.json` → лог-файл печатается в Output → TypeScript.

## Ручной чек-лист (в реальном проекте)

1. `.css`: набрать `col` → в списке `color`.
2. `.pcss`: то же самое (язык в статус-баре — SCSS).
3. `var(--` в любом css/vue → переменные из app.css/тематических файлов.
4. `.vue` с `<style module>`: в template набрать `$style.` → классы.
   Внешние модули (`<style src="./x.module.css" module>`): `$style.` → классы
   из файла; Ctrl+Space по `$style.<класс>` → go-to-def открывает css на правиле.
   Пустые css-файлы (в активной разработке) → список легитимно пуст —
   `strictCssModules: false` держит код без TS-ошибок.
5. Если (4) пусто: язык файла `vue`, tsconfig содержит `resolveStyleImports` +
   `cmkOptions.enabled` + include с `.css`, файл называется `*.module.css`,
   расширение `mizdra.css-modules-kit-vscode` установлено, Output → Vue/TypeScript
   без ошибок, `TypeScript: Restart JS/TS Server`, затем `Developer: Reload Window`
   (порядок активации: Volar раньше TS — см. раздел `$style`).
6. Color picker: в `.css`/`.pcss` квадратик у цвета + пикер по клику; в `.js`
   строка `"#ff0000"` — квадратик.
7. Отступы: в `.php`/`.vue` — табы ×2, точек/стрелок нет; в `.json` — 2 пробела.
8. Blade: `@include('` → список view; `view('`, `route('`, `config('` → подсказки.
9. `<style src="./x.module.css"…>` (вк. самозакрытый): hover по пути →
   абсолютный путь + «✓ file exists»; Ctrl+Click → файл открылся;
   `$style.` в template → классы (vue-css-jump и/или cmk).
10. app.blade.php: подсветка `Undefined variable '$page'` ушла после
    `@var`-докблока (если нет — см. матрицу, строка 9).
11. `.vue` template: hover по тегу компонента → карточка vue-css-jump
    (таблица props/emits/v-model/expose + путь); Ctrl+Click по тегу → файл
    компонента; Ctrl+Space внутри тега (`<Button `) → нативный список props.

---

## См. также

- [Live Templates и CSS](live-templates-and-css.md) — сниппеты, Emmet, PostCSS-миксины
- [Чистые Problems](clean-problems-formatting.md) — матрица форматтеров «один на язык»
