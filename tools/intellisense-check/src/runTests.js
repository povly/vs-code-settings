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

	console.log('INFO [runTests] запуск VS Code test instance…');
	await runTests({ extensionTestsPath, launchArgs });
	console.log('INFO [runTests] готово');
}

main().catch(err => {
	console.error('ERROR [runTests] провал:', err && err.message ? err.message : err);
	process.exit(1);
});
