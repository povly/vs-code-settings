// Раннер проверки PHPantom + WordPress: открывает корень WP-инсталла
// (переменная окружения WP_ROOT) в чистом
// тестовом инстансе VS Code (тот же .vscode-test/), подгружая расширение
// PHPantom напрямую из каталога установленного расширения Code OSS
// (extensionDevelopmentPath — без зависимости от маркетплейсов).
// Проверяет то же, что руками: F12 (definitions), подсказки (completions)
// и отсутствие unknown-диагностик в Problems.
const path = require('path');
const os = require('os');
const { runTests } = require('@vscode/test-electron');

const PHPANTOM_EXT = path.join(
	os.homedir(),
	'.vscode-oss/extensions/phpantom.phpantom-0.6.1-universal'
);
const WP_ROOT = process.env.WP_ROOT;
if (!WP_ROOT) {
	console.error('ERROR [phpantom-check] WP_ROOT не задан — путь к WP-инсталлу передай так: WP_ROOT=<корень-WP> npm run test:phpantom');
	process.exit(1);
}

async function main() {
	const extensionTestsPath = path.resolve(__dirname, 'suite-phpantom', 'index.js');

	console.log(`INFO [phpantom-check] расширение: ${PHPANTOM_EXT}`);
	console.log(`INFO [phpantom-check] workspace: ${WP_ROOT}`);
	console.log('INFO [phpantom-check] запуск VS Code test instance…');

	await runTests({
		extensionDevelopmentPath: PHPANTOM_EXT,
		extensionTestsPath,
		launchArgs: [WP_ROOT, '--disable-workspace-trust'],
	});
	console.log('INFO [phpantom-check] готово');
}

main().catch(err => {
	console.error('ERROR [phpantom-check] провал:', err && err.message ? err.message : err);
	process.exit(1);
});
