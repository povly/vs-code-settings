[К README](../README.md) · [Следующий гайд →](phpactor-indexer-phpcs-fix.md)

# Live Templates и CSS-магия в этом воркспейсе

> Практический гайд: сниппеты в стиле PhpStorm, Emmet для CSS и «функции» в CSS
> (custom snippets + PostCSS-миксины). Всё бесплатно, всё уже настроено.

---

## 1. Live Templates (`.vscode/*.code-snippets`)

Как в PhpStorm: набираете короткий префикс → **Tab** → разворачивается шаблон,
курсор прыгает по «аргументам», Tab/Shift+Tab — вперёд/назад.

Что включено в settings.json:
- `editor.tabCompletion: "onlySnippets"` — Tab разворачивает сниппет;
- `editor.snippetSuggestions: "top"` — шаблоны первыми в списке подсказок.

### Синтаксис шаблонов

| Конструкция | Что делает |
|---|---|
| `${1:имя}` | позиция курсора №1 со значением по умолчанию |
| `$0` | финальная позиция курсора |
| `${1\|вариант1,вариант2\|}` | выбор из списка (dropdown) |
| `\\$переменная` | литеральный `$` (для PHP-переменных — обязателен!) |
| `$TM_FILENAME_BASE` | имя текущего файла без расширения |
| одинаковые `${1:...}` в двух местах | редактируются синхронно |

### Каталог префиков (138 шаблонов)

#### PHP + Laravel — `php.code-snippets` (29)

| Префикс | Результат |
|---|---|
| `pubf` / `pubfr` / `pubfs` | `public function` / с return type / static |
| `prif` / `prof` | `private function` / `protected function` |
| `cstr` | конструктор с property promotion (`public readonly`-свойства) |
| `cl` / `intf` / `trt` | `class` / `interface` / `trait` (имя из имени файла; `intf`, не `int` — конфликт с тайпхинтом) |
| `enum` / `enumb` | enum / backed enum (`: string\|int`) |
| `fore` / `forek` | `foreach ($arr as $item)` / `as $key => $value` |
| `tryc` / `thr` | `try {} catch (\Throwable)` / `throw new` (выбор исключения) |
| `strict` | `declare(strict_types=1);` |
| `afn` | arrow function `fn ($x) => expr` |
| `match` | `match`-выражение |
| `test` | метод PHPUnit `public function test_...()` |
| `dd` / `dumpv` | Laravel `dd()` / `dump()` |
| `logi` / `loge` | `Log::info()` / `Log::error()` |
| `route:` | `Route::get/post/...(...)->name(...)` (выбор метода) |
| `val:` | `$request->validate([...])` |
| `relhm` / `relbo` | отношение Eloquent `hasMany` / `belongsTo` |
| `scope:` | локальный scope модели |
| `col:` | колонка миграции `$table->тип(...)` |

#### Blade — `blade.code-snippets` (22)

`bext` (@extends+@section), `bsec`, `byield`, `bif`, `bifel`, `bfore`, **`bforelse`**
(forelse+@empty), `bxcomp` (`<x-component />`), `bxslot`, `bprops`, `bcsrf`, `bmethod`,
`bech` (`{{ $var }}`), `braw` (`{!! !!}`), `bjson`, `berror`, `bauth`, `bguest`, `binc`,
`bpush`, **`bvite`** (`@vite([...])`), `blang`.

#### Vue 3 — `vue.code-snippets` (16)

`vsfc` (полный SFC: script setup + template + style), `vscript`, `vref`, `vreactive`,
`vcompd` (computed), `vwatch`, `vwatche`, `vprops` (defineProps), `vemit`, `vexpose`,
`vmounted`, `vunmounted`, `vfor`, `vmodel`, `vslot`, `vstore` (Pinia store).

#### JavaScript — `javascript.code-snippets` (20)

`cl` (console.log), `ce`, `cw`, `afn`/`afnr`, `nfn`, `asfn`, `expf`, `tryc`, `imp`,
`impd`, `expd`, `prom`, `fe`, `mapr`, `filtr`, `forof`, `st`, `sw`, **`composable`**
(`useXxx()`-функция для Vue).

#### HTML + Alpine.js — `html.code-snippets` (9)

`html5` (каркас с lang=ru/en), `linkcss`, `scriptm` (module script), `mvp` (viewport),
`picture` (webp+lazy), `alpdata` (x-data блок), `alpclick` (x-on:click), `alpshow`,
`alpfor` (x-for + template).

#### CSS / PostCSS — `css.code-snippets` (13)

`psrel`, `psab`, `flexcc` (flex-центрирование), `flexbb`, `dgrid` (grid auto-fit),
`mq` (media query), `varc`, `centerabs`, `trans`, `trunc`, `vishid`
(скрытый для скринридеров), `pcssimp`, `pcssnest` (PostCSS-нестинг `& {}`).

#### Rust + Bevy — `rust.code-snippets` (23)

`pfn`, `fn`, `asfn`, `main`, `tmain` (tokio::main), `pstruct`, `penum`, `pimpl`,
`imptrait`, `derive`, `pl` (println!), `pd` (dbg!), `tfn` (#[test]), `tmod`
(mod tests), `res`, `errte` (thiserror), Bevy: `bcomp`, `bres`, `bevent`, `bsys`,
`bsysq`, `bplugin`, `bapp`.

#### WGSL — `wgsl.code-snippets` (6)

`vs` (vertex-шейдер), `fs` (fragment), `st` (struct), `cbuf` (uniform-биндинг),
`texb` (texture+sampler), `fn`.

### Как добавить свой шаблон

Откройте `.vscode/<язык>.code-snippets` и добавьте объект (пример — «функция»
с параметрами для CSS):

```jsonc
"Моя карточка": {
  "prefix": "card",
  "body": [
    ".${1:name} {",
    "  display: grid;",
    "  gap: ${2:1rem};",
    "  padding: ${3:1.5rem};",
    "  border-radius: ${4:12px};",
    "}"
  ],
  "description": "карточка с параметрами"
}
```

Правила: отступ в `body` — табы (`\t`); литеральный `$` в PHP — `\$`; файл = язык
(`php.code-snippets` применяется в PHP-файлах и т.д.).

---

## 2. Emmet для CSS — генерация «на лету» (встроено в VS Code)

В CSS/PostCSS-файлах (и в `<style>` Vue/Blade — включено в settings) набираете
сокращение → **Tab**:

| Сокращение | Результат |
|---|---|
| `m10-20` | `margin: 10px 20px;` |
| `p0` / `pt2rem` | `padding: 0;` / `padding-top: 2rem;` |
| `d:f` | `display: flex;` |
| `d:g` | `display: grid;` |
| `posa+t0+l0` | `position: absolute; top: 0; left: 0;` |
| `fz1.5rem` | `font-size: 1.5rem;` |
| `fw700` | `font-weight: 700;` |
| `bxsh` | `box-shadow: ;` (с плейсхолдерами) |
| `trs` | `transition: ;` |
| `bd+` | полный блок `border: ...;` |
| `bg+` | полный блок `background: ...;` |
| `lg(...)` | `linear-gradient(...)` |
| `@m` | `@media screen { }` |
| `@m1024` | `@media (min-width: 1024px) { }` |
| `w100%` / `h50vh` | `width: 100%;` / `height: 50vh;` |
| `ta:c` / `va:t` | `text-align: center;` / `vertical-align: top;` |
| `us:n` | `user-select: none;` |

Эммет угадывает по подстрокам: `fl:c` → `flex-direction: column`? Нет — это
`fd:c`; `fl` → `float`. Мышление: «свойство: значение» через двоеточие.

---

## 3. «Функции» в CSS

### Уровень 1: сниппеты-«функции» (см. выше)

Префикс = имя функции, `${1}`, `${2}`… = аргументы со значениями по умолчанию.
Вызов: `card` → Tab → прыжки по аргументам.

### Уровень 2: настоящие функции — PostCSS-миксины

Плагин [`postcss-mixins`](https://github.com/postcss/postcss-mixins) даёт CSS
настоящие функции с аргументами и дефолтами. Код разворачивается при сборке Vite.

Установка в проект:

```bash
npm i -D postcss-mixins
```

`postcss.config.js`:

```js
module.exports = {
  plugins: [
    require('postcss-mixins'), // первым в списке
    require('autoprefixer'),
  ],
}
```

(Laravel: файл в корне проекта, Vite подхватит автоматически.)

Определение и вызов:

```css
/* ── "функции" ── */
@define-mixin card $pad: 1rem, $radius: 12px {
  display: grid;
  gap: 1rem;
  padding: $pad;
  border-radius: $radius;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

@define-mixin truncate $lines: 1 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: $lines;
  -webkit-box-orient: vertical;
}

/* ── вызов: генерируется готовый CSS ── */
.price-card {
  @mixin card 2rem, 20px;
  grid-template-columns: 1fr auto;
}

.product-title {
  @mixin truncate 2;
}
```

На выходе — обычный CSS без следов миксинов.

### Уровень 3: custom properties как «переменные»

```css
:root {
  --space: 8px;
  --card-pad: calc(var(--space) * 2); /* 16px — вычисляется в рантайме */
}
```

Сниппет `varc` → `var(--имя)` уже есть.

---

## 5. Fluid Type — «резиновая» типографика

### Эталон: `fluid-type()` из боевого Laravel-проекта

Там работает самописный Vite-плагин (`postcss/js/viteCssFunctions.js`):
в CSS пишется `fluid-type(320px, 1200px, 14px, 18px)`, на выходе —

```css
clamp(14px, calc(14px + (18 - 14) * (100vw - 320px) / (1200 - 320)), 18px)
```

Математика выполняется **в браузере** (calc внутри clamp), любые единицы,
есть вариант с отрицательными значениями и с процентами.

### Сниппет без сборки (уже в `css.code-snippets`)

Префикс `fluid` → Tab → идентичная формула, параметры — табами:

```
fluid → clamp(14px, calc(14px + (4) * (100vw - 320px) / (880)), 18px)
```

($5 = maxVal−minVal числом, $6 = maxVw−minVw числом — формула/css валидна,
т.к. `(100vw - 320px)` — длина, остальное — множители.)

Префикс `fluidc` — предрассчитанная slope-форма
(`clamp(min, intercept + slope vw, max)`), удобно с калькуляторами
[fluid-type-scale.com](https://fluid-type-scale.com) /
[utopia.fyi](https://utopia.fyi).

### Альтернативы — чем ещё решают ту же задачу

| Вариант | Синтаксис в CSS | Плюсы | Минусы |
|---|---|---|---|
| **1. Перенос вашего Vite-плагина** | `fluid-type(320px,1200px,14px,18px)` | Привычный синтаксис, обкатан (684 вызова), ноль математики | 2 файла в каждый проект + регистрация в vite.config |
| **2. Сниппет `fluid`** | вставка готового clamp | Ничего не настраивать, работает в любом файле/проекте | Числа разности вводятся руками |
| **3. `postcss-mixins` с JS-миксином** | `@mixin fluid-type 320px, 1200px, 14px, 18px` | Стандартный поддерживаемый плагин, JS-логика та же | Другой синтаксис вызова, чем привычный |
| **4. `postcss-functions`** | `fluid-type(...)` как у вас | Родной синтаксис функций CSS, generic-плагин | Проверить живость пакета перед adopцией |
| **5. Container queries (`cqi`)** | `clamp(1rem, 2.5cqi, 1.5rem)` | Нативно, ноль тулов; масштаб от контейнера, не вьюпорта | Другая семантика — для компонентов |
| **6. Utopia.fyi** | `var(--step-2)` из scale | Дизайн-система типографики из коробки | Надо генерить переменные |
| (будущее) `@function` в CSS | — | Спека Values L5 | Ещё не реализовано в браузерах |

**Рекомендация:** для новых Laravel+Vite проектов — вариант 1 (перенос
`postcss/js/` + строка в `vite.config.js`); для правок «на месте» и
не-Vite проектов — сниппет `fluid`.

### Как перенести плагин в новый проект (вариант 1)

```bash
cp -r <laravel-проект>/postcss/js <новый-проект>/postcss/js
```

В `vite.config.js`:

```js
import { viteCssFunctions } from './postcss/js/viteCssFunctions.js'

export default defineConfig({
  plugins: [
    laravel(...),
    vue(),
    viteCssFunctions(), // ← добавили
  ],
})
```


| Действие | Клавиши |
|---|---|
| Развернуть live template | набрать префикс → **Tab** |
| Мультикурсор по вхождениям | **Ctrl+D** (повторно — следующее вхождение) |
| Курсоры в произвольных местах | **Alt+Click** |
| Переименовать парный тег | просто правите тег — парный меняется сам (`linkedEditing`) |
| Выделить столбец | **Shift+Alt** + протянуть мышью |
| Зум кода | **Ctrl + колесо мыши** |
| Sticky scroll (шапка функции) | включён постоянно |

---

## См. также

- [IntelliSense CSS/Vue/Laravel](vue-css-intellisense.md) — подсказки свойств, `$style`, `var(--…)`
- [Productivity Power-Ups](power-ups.md) — live templates invk/mig12/useTplRef/useid
