// Раннер: скачивает чистый инстанс VS Code (.vscode-test/), ставит туда
// проверяемые расширения и запускает mocha-сьют внутри реального редактора.
// Машина пользователя НЕ затрагивается (отдельный инстанс).
const fs = require('fs');
const path = require('path');
const { runTests, runVSCodeCommand } = require('@vscode/test-electron');

// VSIX расширения кладётся в vendor/ вручную после `npm run package`
// (povly.vscode-vue-css-jump нет на Open VSX). Берём старшую semver —
// забытый старый VSIX не должен молча оставаться тестируемой версией.
function pickVueCssJumpVsix() {
	const vendorDir = path.resolve(__dirname, '..', 'vendor');
	const nameRe = /^vscode-vue-css-jump-(\d+)\.(\d+)\.(\d+)\.vsix$/;
	const found = fs
		.readdirSync(vendorDir)
		.map((f) => f.match(nameRe))
		.filter(Boolean)
		.map((m) => ({
			file: path.join(vendorDir, m[0]),
			major: Number(m[1]),
			minor: Number(m[2]),
			patch: Number(m[3]),
		}));
	if (found.length === 0) {
		throw new Error(
			`vendor/ не содержит vscode-vue-css-jump-<version>.vsix — соберите его (npm run package в tools/vscode-vue-css-jump) и скопируйте в ${vendorDir}`,
		);
	}
	found.sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch);
	if (found.length > 1) {
		console.warn(
			`WARN [runTests] в vendor/ несколько VSIX vue-css-jump (${found
				.map((f) => path.basename(f.file))
				.join(', ')}); выбран старший semver`,
		);
	}
	return found[0].file;
}

// Кейс 16: сниппеты гоняются против реальных .code-snippets воркспейса —
// runtime-копия в fixtures/.vscode (в git не коммитится, после прогона удаляется)
const REPO_SNIPPETS_DIR = path.resolve(__dirname, '..', '..', '..', '.vscode');
const FIXTURE_VSCODE_DIR = path.resolve(__dirname, '..', 'fixtures', '.vscode');

function deployWorkspaceSnippets() {
	const files = fs.readdirSync(REPO_SNIPPETS_DIR).filter(f => f.endsWith('.code-snippets'));
	if (files.length === 0) {
		throw new Error(`нет *.code-snippets в ${REPO_SNIPPETS_DIR}`);
	}
	for (const f of files) {
		fs.copyFileSync(path.join(REPO_SNIPPETS_DIR, f), path.join(FIXTURE_VSCODE_DIR, f));
	}
	console.log(`INFO [runTests] live-templates (кейс 16): скопировано файлов: ${files.length}`);
	return files;
}

function cleanupWorkspaceSnippets(files) {
	for (const f of files) {
		try {
			fs.unlinkSync(path.join(FIXTURE_VSCODE_DIR, f));
		} catch (e) {
			console.warn(`WARN [runTests] не удалена runtime-копия: ${f}`);
		}
	}
}

async function main() {
	const extensionTestsPath = path.resolve(__dirname, 'suite', 'index.js');
	const launchArgs = [path.resolve(__dirname, '..', 'fixtures')];

	// Расширения, без которых проверяемые фичи не работают.
	// NO_EXTS=1 — контрольный прогон без расширений (диагностика конфликтов)
	// povly.vscode-vue-css-jump — локальный VSIX (нет на Open VSX), кладётся в vendor/
	const vueCssJumpVsix = pickVueCssJumpVsix();
	const extensions = process.env.NO_EXTS
		? []
		: ['Vue.volar', 'vunguyentuan.vscode-css-variables', 'mizdra.css-modules-kit-vscode', vueCssJumpVsix];
	for (const ext of extensions) {
		console.log(`INFO [runTests] установка в тестовый инстанс: ${ext}`);
		await runVSCodeCommand(['--install-extension', ext]);
	}

	const snippetFiles = deployWorkspaceSnippets();
	try {
		console.log('INFO [runTests] запуск VS Code test instance…');
		// test-languages-ext — dev-расширение: регистрирует blade/wgsl/vue в тест-инстансе
	// (реальные phpantom/wgsl-analyzer/Volar сюда не ставятся; без регистрации
	// язык = plaintext и scoped-сниппеты кейса 16 не матчатся)
	await runTests({
		extensionTestsPath,
		launchArgs,
		extensionDevelopmentPath: path.resolve(__dirname, '..', 'test-languages-ext'),
	});
		console.log('INFO [runTests] готово');
	} finally {
		cleanupWorkspaceSnippets(snippetFiles);
	}
}

main().catch(err => {
	console.error('ERROR [runTests] провал:', err && err.message ? err.message : err);
	process.exit(1);
});
