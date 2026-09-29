// Раннер Rust-кейсов: скачивает чистый инстанс VS Code (.vscode-test/), ставит
// туда rust-analyzer и запускает mocha-сьют suite-rust внутри реального
// редактора против cargo-фикстур. Машина пользователя НЕ затрагивается.
// Две фикстуры — два отдельных инстанса (cargo-дискавери разный: одиночный
// крейт vs workspace с подкаталогом-крейтом); RUST_SUITE включает нужный
// describe-блок в каждом прогоне (modular → R1–R3, workspace → R4).
const path = require('path');
const { runTests, runVSCodeCommand } = require('@vscode/test-electron');

async function main() {
	const extensionTestsPath = path.resolve(__dirname, 'suite-rust', 'index.js');

	// rust-lang.rust-analyzer есть на маркетплейсе — ставим по ID.
	// NO_EXTS=1 — контрольный прогон без расширений (диагностика конфликтов).
	const extensions = process.env.NO_EXTS ? [] : ['rust-lang.rust-analyzer'];
	for (const ext of extensions) {
		console.log(`INFO [runRustTests] установка в тестовый инстанс: ${ext}`);
		await runVSCodeCommand(['--install-extension', ext]);
	}

	const runs = [
		{ suite: 'modular', dir: 'fixtures-rust' },
		{ suite: 'workspace', dir: 'fixtures-rust-ws' },
	];
	for (const { suite, dir } of runs) {
		process.env.RUST_SUITE = suite;
		const launchArgs = [path.resolve(__dirname, '..', dir)];
		console.log(`INFO [runRustTests] запуск VS Code test instance (${dir}, RUST_SUITE=${suite})…`);
		await runTests({ extensionTestsPath, launchArgs });
	}
	console.log('INFO [runRustTests] готово');
}

main().catch(err => {
	console.error('ERROR [runRustTests] провал:', err && err.message ? err.message : err);
	process.exit(1);
});
