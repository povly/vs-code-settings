[← Предыдущий гайд](power-ups.md) · [К README](../README.md) · [Следующий гайд →](github-ci.md)

# Отдельный JS-корень: подсказки, переходы, форматирование (Vite + vanilla JS)

> Рецепт включения полного IntelliSense в JS-проекте, открытом в Code OSS
> **отдельным корнем** (вне воркспейса). Модель — **global-first**: редакторское
> поведение в машинных user settings, в проекте — только незаменимые языковые
> файлы. Кейс: Vite + WebGPU-учебник `<js-проект>`. Дата: 2026-09-26,
> глобализация — 2026-09-27.

## Симптом

- Подсказки в `main.js` куцые: `navigator.gpu` без hover-типа, completion
  `device.` пустой
- F12/Ctrl+Click работают только внутри одного файла, import-переходы хромают
- Format Document / Ctrl+S ничего не форматирует (нет форматтера)
- Необъявленные имена (вызов несуществующей функции) не подсвечиваются
- Переименование файла не чинит import-пути

## Диагностика

1. **Нет `jsconfig.json`** — файл живёт в «inferred project» tsserver: без
   границ проекта нет семантической диагностики и сквозных переходов.
2. **WebGPU-типов нет во встроенном TS** (проверено на TS 7.0.2: в `lib.dom.d.ts`
   нет ни `GPUCanvasContext`, ни `navigator.gpu`; отдельной `lib.webgpu` не
   существует) — нужен `@webgpu/types`.
3. **Редакторское поведение — не в проекте, а в машинных user settings**
   (`~/.config/Code - OSS/User/settings.json`, снимок воркспейса:
   `tools/machine/Code-OSS-User-settings.jsonc`): табы ×2, `prettier.*`,
   формат-on-save для js-семейства, `fixAll.eslint`, подсказки, гигиена,
   `*.wgsl`-ассоциация. Если их нет — развернуть `tools/machine/`
   (см. [tools/machine/README.md](../tools/machine/README.md)).
4. Линтинг: ESLint 9 flat config — только в проекте (глобальным не бывает).

## Фикс: одна команда

```bash
tools/new-js-project.sh <каталог> [--webgpu]
```

Генератор воркспейса разворачивает: `package.json` (dev/build/preview/lint/
typecheck/test), `jsconfig.json` (checkJs, Bundler; при `--webgpu` —
`@webgpu/types`), `src/vite-env.d.ts`, `eslint.config.js` (ESLint 9 flat),
`.editorconfig`, `.gitignore`, шаблон `src/` (+ `shader.wgsl` при `--webgpu`),
vitest-каркас `tests/` и `.github/workflows/ci.yml` (матрица 3 ОС +
Linux-дистрибутивы — см. [github-ci.md](github-ci.md)). Флаг `--no-ci` — без
CI/vitest-части. Редакторское поведение подтянется из машинных user settings —
`.vscode/` и `.prettierrc` в проект НЕ кладём.

## Что живёт где (глобальная модель)

| Возможность | Где настроено |
|---|---|
| Табы ×2, формат-on-save, форматтеры per-lang, `prettier.*` | машинные user settings (снимок `tools/machine/…jsonc`) |
| Подсказки (`quickSuggestions`, `suggest.preview`, parameter hints) | машинные user settings |
| WebGPU-типы (hover/completion) | `jsconfig.json` → `types: ["@webgpu/types"]` (проект) |
| Переходы F12/Ctrl+Click, автофикс import при переименовании | `jsconfig.json` + user settings (`updateImportsOnFileMove`) |
| Линтинг + автофикс на сохранении | `eslint.config.js` (проект) + user settings (`fixAll.eslint`) |
| Отступы вне VS Code | `.editorconfig` (проект; `~/.editorconfig` не работает вне `$HOME`) |
| CLI/CI-форматирование Prettier | `.prettierrc` — только по надобности ([tools/machine/README.md](../tools/machine/README.md)) |
| CI (3 ОС + Linux-дистрибутивы, vitest) | `.github/workflows/ci.yml` из генератора |

### Ручной вариант (если без генератора)

1. `jsconfig.json` + `src/vite-env.d.ts` (типы `@webgpu/types` — для WebGPU):

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "checkJs": true,
    "noEmit": true,
    // Без strict: обучающий код без JSDoc-типов не должен «шуметь»
    // (TS 7 включает strict-проверки по умолчанию — гасим явно)
    "strict": false,
    "types": ["@webgpu/types"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

JSDoc-касты вместо `as` (это JS): `/** @type {HTMLCanvasElement} */` над
`querySelector` — иначе `getContext` недоступен на `Element`.

2. `eslint.config.js` (ESLint 9 flat, ESM):

```js
import js from "@eslint/js";
import globals from "globals";

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: { ...globals.browser },
		},
		rules: {
			// «module» — имя из учебных сэмплов webgpufundamentals:
			// используется на следующем шаге туториала
			"no-unused-vars": [
				"error",
				{ args: "none", caughtErrors: "none", varsIgnorePattern: "^module$" },
			],
		},
	},
];
```

3. WGSL-шейдеры — в `src/*.wgsl` (`import src from "./x.wgsl?raw"`, тип
`string` из `vite/client`); подсветка и LSP — расширение
`wgsl-analyzer.wgsl-analyzer` (установлено машинно из воркспейса; сервер
бандлит сам — внешних бинарей не нужно), ассоциация `*.wgsl → wgsl` — глобально.

## Чек-лист проверки

- [ ] hover `navigator.gpu` → тип `GPU`; completion `device.` → члены `GPUDevice`
- [ ] F12 из вызова функции → определение; Ctrl+Click по import — переход
- [ ] Испортил отступ → Ctrl+S → Prettier чинит табами (глобальные user settings)
- [ ] Problems пустые; вписал `noSuchVar` → ошибка TS (checkJs) + ESLint no-undef
- [ ] `src/*.wgsl` подсвечивается; `import … "?raw"` — тип `string` (hover)
- [ ] `npm run lint` / `npm run typecheck` / `npm test` — чистые; `npm run dev` работает

## Грабли

- **`.vscode/` и `.prettierrc` в JS-проект не класть** — редакторское поведение
  глобально (user settings); дублирование = дрейф конфигов
- **TS 7 strict по умолчанию:** без явного `"strict": false` checkJs сыплет
  TS7006 (implicit any) и null-ошибками на JSDoc-касты
- **JSDoc-каст `@type {HTMLCanvasElement}`** на `querySelector` — канонический
  паттерн: без него `getContext` недоступен на `Element`
- **`import "./style.css"`** требует `vite/client` в типах (`src/vite-env.d.ts`)
- **`getContext("webgpu")`** без `@webgpu/types` резолвится в generic
  `RenderingContext` → `configure` не существует (TS2339)
- **Топ-левел вызов `main()` в тестах:** гвард `if (import.meta.env.MODE !== "test")`
  — иначе vitest падает на отсутствии `navigator.gpu`

## See Also

- [github-ci.md](github-ci.md) — CI-паттерны: JS-проект (матрица ОС +
  Linux-дистрибутивы), воркспейс, Laravel/WordPress-шаблоны
- [clean-problems-formatting.md](clean-problems-formatting.md) — матрица
  форматтеров «один на язык» и политика «Problems — только свой код»
- [phpantom-wordpress.md](phpantom-wordpress.md) — отдельный корень WP-инсталла
  (IntelliSense-уровень)
