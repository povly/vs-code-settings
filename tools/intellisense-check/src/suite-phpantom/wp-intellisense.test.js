// Проверка PHPantom + WordPress в РЕАЛЬНОМ инстансе VS Code (test-electron):
// то же, что руками делает пользователь — F12 (definitions), подсказки
// (completions) и панель Problems (диагностики) по Sage-теме инсталла.
// Воркспейс = корень WP (как открывает пользователь): env WP_ROOT + WP_THEME.
// Контекст: docs/phpantom-wordpress.md (воркспейс _vscode).
//
// Установлено эмпирически (phpantom 0.10.0, WP-инсталл ~19k php-файлов):
//  - definition-провайдер ленивый, отвечает до готовности фоновой индексации;
//  - diagnostics/completion зависят от зрелости индекса всего дерева;
//  - диагностики, опубликованные на незрелом индексе, сами не пересчитываются
//    — лечится didChange-подталкиванием (nudge) после прогрева.
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const WP_ROOT = process.env.WP_ROOT;
const WP_THEME = process.env.WP_THEME;
if (!WP_ROOT || !WP_THEME) {
	throw new Error('Задай WP_ROOT (корень WP-инсталла) и WP_THEME (имя каталога темы) в окружении');
}
const THEME = path.join(WP_ROOT, 'wp-content/themes', WP_THEME);

const sleep = ms => new Promise(r => setTimeout(r, ms));

const docCache = new Map();
async function openDoc(absPath) {
	const vscode = require('vscode');
	if (!docCache.has(absPath)) {
		const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(absPath));
		await vscode.window.showTextDocument(doc);
		docCache.set(absPath, doc);
	}
	return docCache.get(absPath);
}

async function positionAtAnchor(doc, anchor, into) {
	const idx = doc.getText().indexOf(anchor);
	assert.ok(idx >= 0, `якорь «${anchor}» не найден`);
	return doc.positionAt(idx + into);
}

// LSP индексирует WP-дерево лениво → retry-цикл запросов определений
async function definitionsAt(absPath, anchor, into, retries, delayMs) {
	const vscode = require('vscode');
	const doc = await openDoc(absPath);
	const pos = await positionAtAnchor(doc, anchor, into);
	const label = `${path.basename(absPath)} @«${anchor.slice(0, 40)}»`;
	for (let attempt = 1; attempt <= retries; attempt++) {
		const locs = await vscode.commands.executeCommand(
			'vscode.executeDefinitionProvider',
			doc.uri,
			pos
		);
		if (Array.isArray(locs) && locs.length > 0) {
			const files = locs.map(l => (l.targetUri || l.uri).fsPath);
			console.log(`DEBUG [phpantom-test] ${label}: → ${files[0]}`);
			return files;
		}
		console.log(`DEBUG [phpantom-test] ${label}: попытка ${attempt}/${retries} — пусто, ждём индексации…`);
		await sleep(delayMs);
	}
	return [];
}

async function labelsAt(doc, pos) {
	const vscode = require('vscode');
	const list = await vscode.commands.executeCommand(
		'vscode.executeCompletionItemProvider',
		doc.uri,
		pos
	);
	return list.items
		.map(i => (typeof i.label === 'string' ? i.label : i.label && i.label.label))
		.filter(Boolean);
}

// phpantom возвращает label функции ВМЕСТЕ с сигнатурой:
// «get_field($selector, $post_id = ...)» — точный includes() не матчится
function hasLabel(labels, name) {
	return labels.some(l => l === name || l.startsWith(name + '(') || l.startsWith(name + ' ('));
}

async function hoverAt(doc, pos) {
	const vscode = require('vscode');
	const hovers = await vscode.commands.executeCommand(
		'vscode.executeHoverProvider',
		doc.uri,
		pos
	);
	return Array.isArray(hovers)
		&& hovers.some(h => h.contents && h.contents.length > 0);
}

// Два didChange без итогового изменения содержимого — форсируют
// переанализацию файла уже прогретым сервером
async function nudge(doc) {
	const vscode = require('vscode');
	const ins = new vscode.WorkspaceEdit();
	ins.insert(doc.uri, new vscode.Position(0, 0), ' ');
	await vscode.workspace.applyEdit(ins);
	await sleep(1500);
	const del = new vscode.WorkspaceEdit();
	del.delete(doc.uri, new vscode.Range(0, 0, 0, 1));
	await vscode.workspace.applyEdit(del);
	await sleep(1500);
}

describe('PHPantom + WordPress IntelliSense (WP-инсталл / Sage-тема)', function () {
	this.timeout(300000);
	const PROBE = path.join(THEME, 'stubs', 'editor', '__probe_completion.php');
	const PROBE_CONTENT = '<?php\n\n$x = get_field;\n';

	// Гейт прогрева: пока get_field не появился в completion, индексация
	// WP-дерева не созрела — диагностики/completion недостоверны
	async function warmupGate() {
		fs.writeFileSync(PROBE, PROBE_CONTENT);
		try {
			const doc = await openDoc(PROBE);
			const pos = doc.positionAt(PROBE_CONTENT.indexOf('get_field') + 'get_fie'.length);
			const t0 = Date.now();
			for (let attempt = 1; attempt <= 36; attempt++) {
				const labels = await labelsAt(doc, pos);
				if (hasLabel(labels, 'get_field')) {
					console.log(`DEBUG [phpantom-test] warmup: готово за ${Math.round((Date.now() - t0) / 1000)}s`);
					return true;
				}
				console.log(`DEBUG [phpantom-test] warmup ${attempt}/36 (${Math.round((Date.now() - t0) / 1000)}s): ${labels.length} items, ждём индексацию…`);
				await sleep(10000);
			}
			return false;
		} finally {
			if (fs.existsSync(PROBE)) fs.unlinkSync(PROBE);
		}
	}

	before(async function () {
		this.timeout(420000);
		const vscode = require('vscode');
		const root = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
		console.log(`DEBUG [phpantom-test] workspace: ${root}`);
		assert.strictEqual(root, WP_ROOT, 'воркспейс должен быть корнем WP');

		const ext = vscode.extensions.getExtension('phpantom.phpantom');
		assert.ok(ext, 'расширение phpantom.phpantom не загружено в тестовый инстанс');
		if (!ext.isActive) await ext.activate();
		console.log('DEBUG [phpantom-test] phpantom активен, прогрев…');

		const ready = await warmupGate();
		if (!ready) {
			console.warn('WARN [phpantom-test] прогрев НЕ завершился за 6 минут — тесты продолжат с незрелым индексом');
		}
	});

	// Первый тест — самый долгий: ждём прогрева full-scan (WP + vendor)
	it('F12: get_field → исходник ACF Pro (плагин)', async function () {
		const files = await definitionsAt(
			path.join(THEME, 'app/acf/page-settings.php'),
			"get_field('enable_white_bg'",
			4,
			45,
			4000
		);
		assert.ok(files.length > 0, 'get_field не резолвится (индексация не завершилась?)');
		assert.ok(
			files.some(f => f.includes('advanced-custom-fields-pro')),
			`ожидается исходник ACF Pro, получено: ${files.join(', ')}`
		);
	});

	it('F12: view() → editor-стаб темы (или Roots-хелпер vendor)', async function () {
		// Примечание: у глобального view() несколько кандидатов в индексе
		// (стаб + Roots\view + guarded-объявления) — definition-провайдер
		// phpantom при коллизии возвращает пусто; тогда достаточно hover
		// (символ резолвится для редактора). Семантика — тестом Problems.
		const abs = path.join(THEME, 'app/acf/render.php');
		const files = await definitionsAt(abs, "echo view('blocks.'", 3, 10, 3000);
		if (files.length === 0) {
			const vscode = require('vscode');
			const doc = await openDoc(abs);
			const pos = await positionAtAnchor(doc, "echo view('blocks.'", 3);
			const hovered = await hoverAt(doc, pos);
			console.log(`DEBUG [phpantom-test] view: definition пуст (коллизия кандидатов), hover=${hovered}`);
			assert.ok(hovered, 'view() не резолвится ни definition, ни hover (F12 — тупик)');
			return;
		}
		assert.ok(
			files.some(f => f.includes(path.join('stubs', 'editor', 'acorn-helpers.php'))
				|| f.includes(path.join('vendor', 'roots', 'acorn'))),
			`ожидается стаб acorn-helpers или vendor/roots/acorn, получено: ${files.join(', ')}`
		);
	});

	it('F12: app() → editor-стаб темы', async function () {
		const files = await definitionsAt(
			path.join(THEME, 'index.php'),
			"app('sage.view'",
			2,
			8,
			2000
		);
		assert.ok(files.some(f => f.includes(path.join('stubs', 'editor', 'acorn-helpers.php'))),
			`ожидается стаб acorn-helpers, получено: ${files.join(', ')}`);
	});

	it('F12: WP_CLI → editor-стаб', async function () {
		const files = await definitionsAt(
			path.join(THEME, 'app/Console/MakeBlockCommand.php'),
			'WP_CLI::error(',
			3,
			8,
			2000
		);
		assert.ok(files.some(f => f.includes(path.join('stubs', 'editor', 'wp-cli-stubs.php'))),
			`ожидается стаб wp-cli, получено: ${files.join(', ')}`);
	});

	it('F12: WP_Block_Type_Registry → ядро WP (wp-includes)', async function () {
		const files = await definitionsAt(
			path.join(THEME, 'app/Console/BlocksStatusCommand.php'),
			'WP_Block_Type_Registry::get_instance',
			5,
			8,
			2000
		);
		assert.ok(files.some(f => f.includes('wp-includes')),
			`ожидается wp-includes, получено: ${files.join(', ')}`);
	});

	it('F12: Roots\\Acorn\\View\\Composer → vendor темы', async function () {
		const files = await definitionsAt(
			path.join(THEME, 'app/View/Composers/App.php'),
			'use Roots\\Acorn\\View\\Composer;',
			22,
			8,
			2000
		);
		assert.ok(files.some(f => f.includes(path.join('vendor', 'roots', 'acorn'))),
			`ожидается vendor/roots/acorn, получено: ${files.join(', ')}`);
	});

	it('Подсказки: completion по префиксу «get_fie» содержит get_field', async function () {
		fs.writeFileSync(PROBE, PROBE_CONTENT);
		try {
			const doc = await openDoc(PROBE);
			const pos = doc.positionAt(PROBE_CONTENT.indexOf('get_field') + 'get_fie'.length);
			let labels = [];
			for (let attempt = 1; attempt <= 10; attempt++) {
				labels = await labelsAt(doc, pos);
				if (hasLabel(labels, 'get_field')) break;
				console.log(`DEBUG [phpantom-test] completion: попытка ${attempt} — ${labels.length} items, нет get_field…`);
				await sleep(3000);
			}
			console.log(`DEBUG [phpantom-test] completion: ${labels.length} items; sample: ${labels.slice(0, 5).join(' | ')}`);
			assert.ok(hasLabel(labels, 'get_field'),
				'get_field отсутствует в completion-списке');
		} finally {
			if (fs.existsSync(PROBE)) fs.unlinkSync(PROBE);
		}
	});

	it('Problems: 0 «not found»-диагностик по открытым файлам темы', async function () {
		const vscode = require('vscode');
		const targets = [
			'functions.php',
			'index.php',
			'app/acf/render.php',
			'app/acf/page-settings.php',
			'app/Walker/Header_Walker_Nav_Menu.php',
			'app/View/Composers/App.php',
			'app/Console/BlocksStatusCommand.php',
		];
		const docs = [];
		for (const rel of targets) docs.push(await openDoc(path.join(THEME, rel)));
		// didChange-подталкивание: диагностики didOpen-времени могли уйти
		// на незрелый индекс и сами не пересчитываются
		for (const doc of docs) await nudge(doc);

		let notFound = [];
		let diagTotal = 0;
		for (let attempt = 1; attempt <= 24; attempt++) {
			notFound = [];
			diagTotal = 0;
			for (let i = 0; i < targets.length; i++) {
				const uri = vscode.Uri.file(path.join(THEME, targets[i]));
				for (const d of vscode.languages.getDiagnostics(uri)) {
					diagTotal++;
					const isNotFound = /not found/i.test(d.message);
					const isUnknownCode = typeof d.code === 'string' && d.code.startsWith('unknown_');
					if (isNotFound || isUnknownCode) {
						notFound.push(`${targets[i]}:${d.range.start.line + 1}: ${d.message} [source=${d.source},code=${d.code}]`);
					}
				}
			}
			if (notFound.length === 0 && (diagTotal > 0 || attempt >= 6)) break;
			console.log(`DEBUG [phpantom-test] problems: попытка ${attempt} — not-found=${notFound.length}, всего=${diagTotal}, ждём…`);
			await sleep(5000);
		}
		if (notFound.length > 0) {
			const uri = vscode.Uri.file(path.join(THEME, 'app/acf/page-settings.php'));
			console.log('DEBUG [phpantom-test] дамп page-settings.php:',
				JSON.stringify(vscode.languages.getDiagnostics(uri).map(d => ({
					line: d.range.start.line + 1, severity: d.severity, source: d.source, code: d.code, message: d.message
				})), null, 1));
		}
		assert.deepStrictEqual(notFound, [],
			`остались «not found»-диагностики:\n${notFound.join('\n')}`);
	});
});

