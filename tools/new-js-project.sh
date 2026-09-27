#!/usr/bin/env bash
# new-js-project.sh — каркас нового JS-корня по глобальной модели воркспейса _vscode.
#
# Модель «всё глобально»: редакторское поведение (табы ×2, формат-on-save,
# prettier.*, fixAll.eslint, подсказки, файловая гигиена, ассоциации) живёт в
# машинных user settings Code OSS (снимок-анти-дрейф: tools/machine/).
# По умолчанию проект CI-ready: vitest-каркас (tests/, happy-dom) + typecheck
# (typescript) + .github/workflows/ci.yml (матрица 3 ОС + Linux-дистрибутивы).
# Флаг --no-ci — без CI/vitest/typecheck-части.
#
# В проект кладём только незаменимые языковые файлы:
#   jsconfig.json      — границы проекта + checkJs (WebGPU-типы при --webgpu)
#   src/vite-env.d.ts  — декларации vite/client (import css / «?raw»)
#   eslint.config.js   — ESLint 9 flat (глобальным быть не может)
#   .editorconfig      — editorconfig не имеет fallback вне $HOME
set -euo pipefail

usage() {
	cat >&2 <<-USAGE
	Использование: tools/new-js-project.sh <каталог> [--webgpu] [--no-ci]
	  <каталог>   новый или пустой каталог (имя каталога = имя npm-пакета)
	  --webgpu    + @webgpu/types и шаблон WebGPU (canvas + shader.wgsl ?raw)
	  --no-ci     без vitest/typecheck/CI-workflow (только lint)

	Модель global-first: редакторское поведение — в машинных user settings
	Code OSS (tools/machine/ в воркспейсе _vscode). Форматирование Prettier
	работает из коробки значениями user settings — .prettierrc не создаётся.
	USAGE
	exit 1
}

DIR=""
WEBGPU=0
CI=1
for arg in "$@"; do
	case "$arg" in
	--webgpu) WEBGPU=1 ;;
	--no-ci) CI=0 ;;
	-*) usage ;;
	*)
		if [ -n "$DIR" ]; then
			usage
		fi
		DIR="$arg"
		;;
	esac
done
[ -n "$DIR" ] || usage

NAME="$(basename "$DIR")"
if [ -e "$DIR" ] && [ -n "$(ls -A "$DIR")" ]; then
	printf 'ERROR [scaffold] каталог не пуст: %s\n' "$DIR" >&2
	exit 1
fi

mkdir -p "$DIR"
cd "$DIR"
log() { printf 'INFO  [scaffold] %s\n' "$*"; }

log "каталог: $DIR (пакет: $NAME)"

if [ "$CI" -eq 1 ]; then
	cat > package.json <<JSON
{
  "name": "$NAME",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc -p jsconfig.json",
    "test": "vitest run"
  }
}
JSON
else
	cat > package.json <<JSON
{
  "name": "$NAME",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  }
}
JSON
fi
log "package.json — scripts dev/build/preview/lint$( [ "$CI" -eq 1 ] && printf ' + typecheck/test' )"

cat > .gitignore <<'EOF'
node_modules/
dist/
test-results/
playwright-report/
EOF
log ".gitignore — node_modules/, dist/, playwright-артефакты"

cat > .editorconfig <<'EOF'
# EditorConfig — источник правды для отступов (конвенция воркспейса _vscode)
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = tab
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

# JSON/YAML — пробелы (сырые табы в строках JSON запрещены)
[{*.json,*.jsonc,*.yml,*.yaml}]
indent_style = space
indent_size = 2
EOF
log ".editorconfig — табы ×2, LF, JSON — 2 пробела"

if [ "$WEBGPU" -eq 1 ]; then
	cat > jsconfig.json <<'EOF'
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
    // WebGPU-типы: во встроенном lib.dom их нет
    "types": ["@webgpu/types"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
else
	cat > jsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "checkJs": true,
    "noEmit": true,
    // Без strict: код без JSDoc-типов не должен «шуметь»
    // (TS 7 включает strict-проверки по умолчанию — гасим явно)
    "strict": false,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
fi
if [ "$WEBGPU" -eq 1 ]; then
	log "jsconfig.json — checkJs + @webgpu/types"
else
	log "jsconfig.json — checkJs"
fi

mkdir -p src
printf '/// <reference types="vite/client" />\n' > src/vite-env.d.ts
log "src/vite-env.d.ts — vite/client (import css, «?raw»)"

cat > eslint.config.js <<'EOF'
import js from "@eslint/js";
import globals from "globals";

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: {
				...globals.browser,
			},
		},
		rules: {
			// «module» — имя из учебных сэмплов webgpufundamentals:
			// используется на следующих шагах туториала
			"no-unused-vars": [
				"error",
				{
					args: "none",
					caughtErrors: "none",
					varsIgnorePattern: "^module$",
				},
			],
		},
	},
];
EOF
log "eslint.config.js — ESLint 9 flat, browser globals"

if [ "$WEBGPU" -eq 1 ]; then
	cat > index.html <<'EOF'
<!doctype html>
<html lang="ru">
	<head>
		<meta charset="UTF-8" />
		<meta
			name="viewport"
			content="width=device-width, initial-scale=1.0"
		/>
		<title>WebGPU</title>
	</head>
	<body>
		<canvas id="canvas-webgpu"></canvas>
		<script
			type="module"
			src="/src/main.js"
		></script>
	</body>
</html>
EOF

	cat > src/main.js <<'EOF'
import "./style.css";
import shaderSource from "./shader.wgsl?raw";

/**
 * @param {string} message
 */
function fail(message) {
	const div = document.createElement("div");
	div.textContent = message;
	document.body.replaceChildren(div);
	throw new Error(message);
}

async function main() {
	const adapter = await navigator.gpu?.requestAdapter();
	const device = await adapter?.requestDevice();
	if (!device) {
		fail("need a browser that supports WebGPU");
		return;
	}

	/** @type {HTMLCanvasElement} */
	const canvas = document.querySelector("#canvas-webgpu");
	const context = canvas.getContext("webgpu");
	const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

	context.configure({
		device,
		format: presentationFormat,
	});

	const module = device.createShaderModule({
		label: "triangle",
		code: shaderSource,
	});
}

if (import.meta.env.MODE !== "test") {
	main();
}

export { fail };
EOF

	cat > src/shader.wgsl <<'EOF'
@vertex fn vs(
	@builtin(vertex_index) vertexIndex : u32
) -> @builtin(position) vec4f {
	let pos = array(
		vec2f(0.0, 0.5), // top center
		vec2f(-0.5, -0.5), // bottom left
		vec2f(0.5, -0.5) // bottom right
	);

	return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
	return vec4f(1.0, 0.0, 0.0, 1.0);
}
EOF

	cat > src/style.css <<'EOF'
html,
body {
	margin: 0;
	height: 100%;
}

canvas {
	display: block;
	width: 100vw;
	height: 100vh;
}
EOF
	log "src/ + index.html (+ src/shader.wgsl) — WebGPU-шаблон"
else
	cat > index.html <<'EOF'
<!doctype html>
<html lang="ru">
	<head>
		<meta charset="UTF-8" />
		<meta
			name="viewport"
			content="width=device-width, initial-scale=1.0"
		/>
		<title>JS</title>
	</head>
	<body>
		<div id="app"></div>
		<script
			type="module"
			src="/src/main.js"
		></script>
	</body>
</html>
EOF

	cat > src/main.js <<'EOF'
import "./style.css";

export function render(root) {
	root.textContent = "It works";
	return root;
}

const app = document.querySelector("#app");
if (app) {
	render(app);
}
EOF

	printf 'html,\nbody {\n\tmargin: 0;\n}\n' > src/style.css
	log "src/ + index.html — vanilla-шаблон"
fi

if [ "$CI" -eq 1 ]; then
	mkdir -p tests .github/workflows

	cat > vitest.config.js <<'EOF'
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "happy-dom",
	},
});
EOF

	if [ "$WEBGPU" -eq 1 ]; then
		cat > tests/main.test.js <<'EOF'
import { describe, expect, it } from "vitest";
import { fail } from "../src/main.js";
import shaderSource from "../src/shader.wgsl?raw";

describe("fail(message)", () => {
	it("показывает сообщение в DOM и бросает Error", () => {
		expect(() => fail("need a browser that supports WebGPU")).toThrow(Error);
		expect(document.body.textContent).toContain(
			"need a browser that supports WebGPU",
		);
	});
});

describe("shader.wgsl", () => {
	it("содержит vertex- и fragment-входные точки", () => {
		expect(shaderSource).toContain("@vertex fn vs");
		expect(shaderSource).toContain("@fragment fn fs");
	});
});
EOF
	else
		cat > tests/main.test.js <<'EOF'
import { describe, expect, it } from "vitest";
import { render } from "../src/main.js";

describe("render(root)", () => {
	it("пишет текст в переданный элемент", () => {
		const el = document.createElement("div");
		render(el);
		expect(el.textContent).toBe("It works");
	});
});
EOF
	fi
	log "tests/main.test.js + vitest.config.js (happy-dom)"

	cat > .github/workflows/ci.yml <<'EOF'
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  matrix:
    name: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build

  # «Разные линуксы»: musl (alpine), rolling (archlinux — ближе всего к CachyOS),
  # свежий glibc (fedora). Node ставится в контейнер, setup-node не используется.
  linux-distros:
    name: distro · ${{ matrix.container }}
    strategy:
      fail-fast: false
      matrix:
        container: [node:22-alpine, archlinux:base, fedora:latest]
    runs-on: ubuntu-latest
    container: ${{ matrix.container }}
    steps:
      - name: git для checkout (alpine)
        if: matrix.container == 'node:22-alpine'
        run: apk add --no-cache git
      - name: install node (archlinux)
        if: matrix.container == 'archlinux:base'
        run: pacman -Sy --noconfirm nodejs npm
      - name: install node (fedora)
        if: matrix.container == 'fedora:latest'
        run: dnf -y install nodejs npm
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
EOF
	log ".github/workflows/ci.yml — матрица 3 ОС + linux-дистрибутивы"
fi

DEPS="vite eslint @eslint/js globals"
if [ "$WEBGPU" -eq 1 ]; then
	DEPS="$DEPS @webgpu/types"
fi
if [ "$CI" -eq 1 ]; then
	DEPS="$DEPS typescript vitest happy-dom"
fi
log "npm i -D $DEPS"
# shellcheck disable=SC2086 — список пакетов собирается по флагам
npm i -D --no-fund --no-audit $DEPS >/dev/null

npm run lint --silent
log "smoke-lint пройден"
if [ "$CI" -eq 1 ]; then
	npm run typecheck --silent
	npm test >/dev/null 2>&1 || npm test
	log "smoke typecheck + test пройдены"
fi

log "готово: $DIR"
printf '\nДальше:\n\tcd %s\n\tnpm run dev\n\tcode-oss %s\n' "$DIR" "$DIR"
