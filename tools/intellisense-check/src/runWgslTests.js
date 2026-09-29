// Раннер WGSL-кейсов: скачивает чистый инстанс VS Code (.vscode-test/), ставит
// туда wgsl-analyzer и запускает mocha-сьют suite-wgsl против fixtures-wgsl
// (папка с .wgsl-шейдерами, cargo не нужен). Машина пользователя НЕ затрагивается.
// W0-guard: если расширение не устанавливается в тест-инстанс (доступность
// маркетплейса), сьют WARN-пропускается — CI не краснеет.
const path = require('path');
const { runTests, runVSCodeCommand } = require('@vscode/test-electron');

async function main() {
	const extensionTestsPath = path.resolve(__dirname, 'suite-wgsl', 'index.js');
	const launchArgs = [path.resolve(__dirname, '..', 'fixtures-wgsl')];

	const extensions = process.env.NO_EXTS ? [] : ['wgsl-analyzer.wgsl-analyzer'];
	for (const ext of extensions) {
		console.log(`INFO [runWgslTests] установка в тестовый инстанс: ${ext}`);
		try {
			await runVSCodeCommand(['--install-extension', ext]);
		} catch (err) {
			console.warn(`WARN [runWgslTests] расширение не установилось: ${ext} — сьют пропустится (W0-guard)`);
		}
	}

	console.log('INFO [runWgslTests] запуск VS Code test instance…');
	await runTests({ extensionTestsPath, launchArgs });
	console.log('INFO [runWgslTests] готово');
}

main().catch(err => {
	console.error('ERROR [runWgslTests] провал:', err && err.message ? err.message : err);
	process.exit(1);
});
