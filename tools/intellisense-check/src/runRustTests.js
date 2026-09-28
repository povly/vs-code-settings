// Раннер Rust-кейсов: скачивает чистый инстанс VS Code (.vscode-test/), ставит
// туда rust-analyzer и запускает mocha-сьют suite-rust внутри реального
// редактора против cargo-фикстуры fixtures-rust (модульная система одного
// крейта). Машина пользователя НЕ затрагивается (отдельный инстанс).
const path = require('path');
const { runTests, runVSCodeCommand } = require('@vscode/test-electron');

async function main() {
	const extensionTestsPath = path.resolve(__dirname, 'suite-rust', 'index.js');
	const launchArgs = [path.resolve(__dirname, '..', 'fixtures-rust')];

	// rust-lang.rust-analyzer есть на маркетплейсе — ставим по ID.
	// NO_EXTS=1 — контрольный прогон без расширений (диагностика конфликтов).
	const extensions = process.env.NO_EXTS ? [] : ['rust-lang.rust-analyzer'];
	for (const ext of extensions) {
		console.log(`INFO [runRustTests] установка в тестовый инстанс: ${ext}`);
		await runVSCodeCommand(['--install-extension', ext]);
	}

	console.log('INFO [runRustTests] запуск VS Code test instance…');
	await runTests({ extensionTestsPath, launchArgs });
	console.log('INFO [runRustTests] готово');
}

main().catch(err => {
	console.error('ERROR [runRustTests] провал:', err && err.message ? err.message : err);
	process.exit(1);
});
