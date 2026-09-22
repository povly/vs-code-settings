# План (fast): IntelliSense CSS WP-темы `<тема>` — service-faq/style.css без списка свойств; проверка ВСЕХ мест стилей

Branch: none (git в воркспейсе отключён)
Created: 2026-09-22
Обновлён: 2026-09-22 — диагностика и фикс завершены (Tasks 1–6 закрыты; diag-матрица 4 passing
в обоих корнях, основной сьют 14 passing / 0 failing).

## Original Request

`<wp-инсталл>`/wp-content/themes/`<тема>`/resources/css/blocks/main/service-faq/style.css не показывает
список параметров стилей и там показывают как. Проверь там во всех местах стилей для теста!

*(обезличено по правилу анонимизации `.ai-factory/RULES.md`; оригинал содержал реальные пути
инсталла/темы. Рабочие пути передаются через env: `THEME_DIR` — корень темы, `WP_ROOT` — корень
WP-инсталла.)*
Уточнения диалога планирования: «и там показывают» — в других местах список свойств показывается;
объём — диагностика + фикс; регресс-прогон автотеста — да.

## Settings

- Testing: yes — основной сьют прогнан (кейсы 9/9a живы); кейс 9b НЕ потребовался (см. Task 5)
- Logging: verbose — DIAG-вывод прогонов 1–4 зафиксирован таблицами ниже
- Docs: no → `WARN [docs]` — см. Task 6

## Предыстория (план 2026-09-21 — завершён, зафиксировано там)

- **Первопричина-2026-09-21:** при postcss-конфиге в корне воркспейса расширение `csstools.postcss`
  само ассоциирует plain `*.css` с языком `postcss` (без language server) — встроенный CSS
  IntelliSense (свойства/значения/валидация/color picker) полностью отключается. H-B (диалект
  валит сервис) и H-C тогда опровергнуты; H-D отсечён.
- **Фикс-2026-09-21:** `<тема>/.vscode/settings.json` — `"*.css": "scss"` (перебивает auto-claim;
  SCSS-сервис понимает nesting/`$vars`/`fluid-type()`), `scss.lint.unknownAtRules: "ignore"`,
  `cssVariables.lookupFiles: ["resources/**/*.css"]`; плюс `<тема>/.vscode/extensions.json`
  (css-variables + color-highlight). Верифицировано DIAG-прогоном: languageId=`scss`,
  completions с `color=true`, 41 токен темы, 0 диагностик. Кейсы 9/9a добавлены в сьют
  (14 passing / 0 failing), `runDiagWpTheme.js` чистит за собой csstools.postcss.
- **Состояние на 2026-09-22 (проверено планировщиком):**
  - `<тема>/.vscode/settings.json` + `extensions.json` — **на месте** (фикс жив);
  - `postcss.config.js` в корне темы — есть (условие перехвата сохраняется);
  - `.gitignore` темы содержит `.vscode/` → фикс **машинно-локальный**: свежий клон/чистка
    репозитория его теряют (вероятный механизм рецидивов);
  - `<wp-инсталл>/.vscode/` — отсутствует (сценарий «окно открыто от корня WP» не закрыт);
  - диагностический сьют покрывает ТОЛЬКО `common/base.css`, `components/btn.css`,
    `__clean.css` — целевой `service-faq` и остальные места стилей не покрыты.

## Результаты прогонов 2026-09-22 (Task 1; чистый инстанс VS Code 1.138.0, `npm run diag:wp`)

Конфигурации: **A** = workspace корень-темы (фикс темы на месте); **B** = workspace корень-WP
без `.vscode` (H-2, «до»); **C** = workspace корень-WP с зеркалом фикса («после», финальный
прогон №4). В каждом прогоне в инстансе установлены `vunguyentuan.vscode-css-variables` +
`csstools.postcss` (перехватчик на месте; после прогона раннер его сносит). Гипотезы Phase 1:
H-1 per-file override, H-2 другой корень окна, H-3 обновление csstools.postcss, H-4 stale-вкладка,
H-5 ввод в комментарии.

| Место | A: язык / items / color | B «до» | C «после» |
|---|---|---|---|
| blocks/main/**service-faq**/style.css ← целевой | scss / 1147 / ✅ | postcss / 855 / ❌ | **scss / 1147 / ✅** |
| blocks/main/service-summary | scss / 1145 / ✅ | postcss / 855 / ❌ | scss / 1145 / ✅ |
| blocks/services/services-hero | scss / 1151 / ✅ | postcss / 855 / ❌ | scss / 1151 / ✅ |
| blocks/blog/article-hero | scss / 1147 / ✅ | postcss / 855 / ❌ | scss / 1147 / ✅ |
| blocks/clinic/about | scss / 1145 / ✅ | postcss / 855 / ❌ | scss / 1145 / ✅ |
| css/app.css (@import-only) | scss / 40 (top-level, легитимно) | postcss / 855 | scss / 40 (легитимно) |
| css/common/base.css | scss / 1147 / ✅ | postcss / 855 / ❌ | scss / 1147 / ✅ |
| css/common/fonts.css | scss / 1144 / ✅ (внутри @font-face) | postcss / 855 / ❌ | scss / 1144 / ✅ |
| css/components/btn.css | scss / 1145 / ✅ | postcss / 855 / ❌ | scss / 1145 / ✅ |
| css/partials/header.css | scss / 1148 / ✅ | postcss / 855 / ❌ | scss / 1148 / ✅ |
| css/mixins/btn.css | scss / 461 / ❌ ⚠ | postcss / 855 / ❌ | scss / 461 / ❌ ⚠ (ограничение) |
| css/modal/menu.css | scss / 1149 / ✅ | postcss / 855 / ❌ | scss / 1149 / ✅ |
| css/editor.css | scss / 1145 / ✅ | postcss / 855 / ❌ | scss / 1145 / ✅ |
| css/editor-blocks.css (генерируемый) | scss / 463 (top-level, легитимно) | postcss / 855 | scss / 463 (легитимно) |
| style.css корень (header-only) | scss / 463 (top-level, легитимно) | postcss / 855 | scss / 463 (легитимно) |
| modules/swiper-master (вендор, информационно) | scss / 1171 / ✅ | postcss / 855 / ❌ | scss / 1171 / ✅ |

- var(--…) (diag C): в A/C — только токены темы (`--color-*`, `--font-euclid` + локальные),
  38–51 items; в B — 855 items с шумом node_modules (`--base-0`, `--accent-*`).
- Диагностики на service-faq: 0 во всех прогонах; diag-сьют — 4 passing в каждом прогоне.
- **Находка-ограничение (mixins/btn.css):** property-подсказки не работают файл-широко даже со
  `scss`-ассоциацией — контекст unknown-at-rule `@define-mixin` (проверено двумя якорями: внутри
  тела миксина и внутри вложенного `&[disabled]`); `var(--)` при этом работает. Языка под
  postcss-mixins-диалект нет, гард-тест невозможен — фиксируем документацией (файл 17 строк,
  правится редко). Диалект в обычных правилах подсказки получает (кейс 9 сьюта, fixtures/dialect.css).

## Вердикт (Task 2)

- **H-2 ПОДТВЕРЖДЁН и закрыт:** окно, открытое корнем WP-инсталла (или любым родителем), не
  применяет `<тема>/.vscode/` (VS Code читает настройки только из корня воркспейса) — все .css
  перехватываются языком `postcss`, 0 property-подсказок; прогон B — точное воспроизведение
  симптома «не показывает список параметров». Зеркало в `<wp-инсталл>/.vscode/` полностью сняло
  симптом (прогоны C/№4). Наиболее вероятная механика сегодняшнего рецидива.
- **H-3 исключён:** csstools.postcss стоял в инстансе во всех прогонах (на машине —
  1.0.8-universal); явная ассоциация из корня воркспейса побеждает auto-claim всегда, когда
  применяется.
- **H-A исключён** после зеркала: languageId=`scss` во всех 16 местах в обоих сценариях корня.
- **Остаточные причины живого окна** (чистые инстансы зелёные — если ещё молчит, по порядку):
  1. `Developer: Reload Window` (H-4 — stale-вкладка с до-фиксной сессии).
  2. Корень в заголовке окна: `<wp-инсталл>` или папка темы — оба сценария закрыты. Окно,
     открытое выше (общая папка проектов), не применит `.vscode` инсталла — открыть корнем
     инсталла/темы.
  3. Статус-бар у service-faq: должен быть `SCSS`; если у одного файла отличается от соседей —
     per-file override (H-1): палитра → Change Language Mode → SCSS.
  4. Ввод проверять в теле правила, не в шапке-комментарии (H-5: авто-попапа в `/* … */` нет —
     `quickSuggestions.comments: false`; Ctrl+Space работает всегда).

## Ручной чек-лист живого окна (Task 4, остаток для пользователя, ~2 мин)

1. `Developer: Reload Window`.
2. Открыть `blocks/main/service-faq/style.css` → статус-бар справа внизу: **SCSS**.
3. В теле правила (внутри `.main-service-faq {`) набрать `col` → в списке `color`; Ctrl+Space —
   принудительно.
4. `var(--c` → токены `--color-*`.
5. Квадратик-превью у `#4bc887` (color picker).
6. `resources/css/mixins/*.css` — property-список не появится (ограничение), `var(--)` работает.

## Tasks

### Phase 1: Диагностика по всем местам — ✅ закрыта 2026-09-22

- [x] Task 1: `suite-diag/wptheme.test.js` расширен до полной матрицы (16 мест: root style.css,
  app/common/components/partials/mixins/modal/editor/editor-blocks, blocks по 5 группам вкл.
  service-faq, вендор-модуль); `runDiagWpTheme.js` — аргументы `--theme`/`--workspace` (H-2),
  npm-скрипт `diag:wp`. Якорь property-теста — первая селектор-строка с `{` (ат-рулы
  пропускаются, кроме `@font-face`: внутри него подсказки работают — 1144 items; внутри
  `@define-mixin` — нет). Прогоны 1–4 — таблица выше. ЛОГИРОВАНИЕ: DIAG-строки × 4 прогона,
  счётчики по каждому месту в таблице.
- [x] Task 2: Вердикт — раздел «Вердикт» выше (H-2 подтверждён и закрыт зеркалом; H-3/H-A
  исключены; H-1/H-4/H-5 — инструкция живого окна; ограничение mixins задокументировано).

### Phase 2: Фикс — ✅ закрыта 2026-09-22

- [x] Task 3: Создан `<wp-инсталл>/.vscode/settings.json` (зеркало фикса темы, адаптированное
  к корню WP: `"*.css": "scss"`, `scss.lint.unknownAtRules: "ignore"`,
  `cssVariables.lookupFiles: ["wp-content/themes/*/resources/**/*.css"]` — без имён тем и
  абсолютных путей) + `<wp-инсталл>/.vscode/extensions.json` (css-variables +
  color-highlight). Потребление конфига подтверждено прогоном №4: «ассоциация из корня
  воркспейса: "*.css" → "scss"». Пункты (b) H-1 и (c) H-3 не потребовались — исключены
  диагностикой; язык `postcss` нигде не использован. ЛОГИРОВАНИЕ: применён только пункт (a).

### Phase 3: Регресс и верификация — ✅ закрыта 2026-09-22

- [x] Task 4: Повторные прогоны полной матрицы: корень-темы (прогон 1) и корень-WP «до/после»
  (прогоны 2 → 3/4) — таблица выше: `scss` + `color=true` во всех местах своего кода,
  var-токены только темы (node_modules-шум ушёл). Ручной остаток — чек-лист выше.
  ЛОГИРОВАНИЕ: «до/после» по каждому месту в таблице.
- [x] Task 5: `npm run test:headless` — **14 passing / 0 failing**; кейсы 9 (4.2 s) и 9a (19 s)
  живы. Кейс 9b НЕ добавлялся: header-only WP `style.css` ведёт себя легитимно (top-level,
  property-подсказки там не ожидаются), а ограничение `mixins/*.css` — свойство
  language-сервиса, не регрессия (гард-тест невозможен). ЛОГИРОВАНИЕ: счётчики зафиксированы.
- [x] Task 6: `WARN [docs]` — рекомендованный фоллоу-ап вне объёма (Docs: no): дополнить матрицу
  `docs/vue-css-intellisense.md`: «WP-инсталл, открытый от корня WP: .vscode темы не применяется
  → зеркалить фикс в `<wp-инсталл>/.vscode/`; фикс темы машинно-локален (.vscode в .gitignore)»
  + сценарии per-file override (H-1) и ввода в комментарии (H-5) + ограничение `@define-mixin`.

## Commit Plan

Git воркспейса отключён — автоматических коммитов нет. По явному запросу пользователя
(обезличенно, без имён клиентов/инсталлов/тем):

- `<wp-инсталл>` (если он под git):
  `chore(vscode): зеркала настроек IntelliSense CSS (css→scss, var-lookup) для открытия от корня WP`
- Воркспейс `_vscode`, после Tasks 1/5:
  `test(intellisense-check): diag-матрица мест стилей инсталла (--workspace/--files, якорь с @font-face)`
