// ДИАГНОСТИКА IntelliSense WP-темы (план .ai-factory/PLAN.md):
// чистый инстанс VS Code, воркспейс = корень воркспейса (по умолчанию = корень темы).
// Путь инсталла передаётся аргументами/env — реальные пути в файлах воркспейса
// не хардкодим (RULES.md).
// Запуск: cd tools/intellisense-check \
//   npm run diag:wp -- --theme=<корень темы/проекта> [--workspace=<корень воркспейса>] \
//     [--files=<относит. пути через запятую — матрица мест стилей этого инсталла>]
//     workspace по умолчанию = theme; прогон с --workspace=<корень WP> закрывает
//     гипотезу H-2 (.vscode темы не применяется, когда окно открыто другим корнем).
//     Без --files используется матрица мест WP-темы из suite-diag/wptheme.test.js.
const path = require('path');
const { runTests, runVSCodeCommand } = require('@vscode/test-electron');

const arg = k => {
	const m = process.argv.find(a => a.startsWith(`--${k}=`));
	return m ? m.slice(k.length + 3) : undefined;
};
const THEME = arg('theme') || process.env.THEME_DIR;
if (!THEME) {
	console.error('ERROR [diag] путь к теме не задан — передай --theme=<корень темы> (или THEME_DIR env)');
	process.exit(1);
}
const WORKSPACE = arg('workspace') || process.env.WORKSPACE_DIR || THEME;
const FILES = arg('files');
const EXTS = (process.env.DIAG_EXTS || 'vunguyentuan.vscode-css-variables,csstools.postcss')
	.split(',')
	.map(s => s.trim())
	.filter(Boolean);

async function main() {
	const extensionTestsPath = path.resolve(__dirname, 'suite-diag', 'index.js');
	for (const ext of EXTS) {
		console.log(`INFO [diag] установка в тестовый инстанс: ${ext}`);
		await runVSCodeCommand(['--install-extension', ext]);
	}
	try {
		console.log(`INFO [diag] запуск VS Code test instance; workspace: ${WORKSPACE}; тема: ${THEME}`);
		await runTests({
			extensionTestsPath,
			launchArgs: [WORKSPACE],
			extensionTestsEnv: { THEME_DIR: THEME, WORKSPACE_DIR: WORKSPACE, ...(FILES ? { DIAG_FILES: FILES } : {}) }
		});
	} finally {
		// csstools.postcss ставим ТОЛЬКО для воспроизведения перехвата *.css; после
		// прогона сносим из общего тестового профиля — иначе он перехватывает .css
		// и в основном сьюте (эмпирика 2026-09-21: с установленным csstools.postcss
		// падают кейсы 1/7 основного сьюта на чистом .css)
		if (process.env.DIAG_KEEP_EXTS !== '1') {
			console.log('INFO [diag] очистка: удаление csstools.postcss из тестового инстанса');
			await runVSCodeCommand(['--uninstall-extension', 'csstools.postcss']).catch(() => {});
		}
	}
	console.log('INFO [diag] готово');
}

main().catch(err => {
	console.error('ERROR [diag] провал:', err && err.message ? err.message : err);
	process.exit(1);
});
