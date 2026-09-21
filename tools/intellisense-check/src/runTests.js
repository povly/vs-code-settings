// Раннер: скачивает чистый инстанс VS Code (.vscode-test/), ставит туда
// проверяемые расширения и запускает mocha-сьют внутри реального редактора.
// Машина пользователя НЕ затрагивается (отдельный инстанс).
const path = require('path');
const { runTests, runVSCodeCommand } = require('@vscode/test-electron');

async function main() {
	const extensionTestsPath = path.resolve(__dirname, 'suite', 'index.js');
	const launchArgs = [path.resolve(__dirname, '..', 'fixtures')];

	// Расширения, без которых проверяемые фичи не работают.
	// NO_EXTS=1 — контрольный прогон без расширений (диагностика конфликтов)
	// povly.vscode-vue-css-jump — локальный VSIX (нет на Open VSX), кладётся в vendor/
	const vueCssJumpVsix = path.resolve(__dirname, '..', 'vendor', 'vscode-vue-css-jump-0.1.3.vsix');
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
