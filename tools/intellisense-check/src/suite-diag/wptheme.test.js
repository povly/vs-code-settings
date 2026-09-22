// Диагностический сьют IntelliSense WP-темы (план .ai-factory/PLAN.md, Task 1).
// Полная матрица «всех мест стилей» темы: корневой style.css (WP-заголовок),
// resources/css/** (app, common, components, partials, mixins, modal, editor,
// blocks по группам — вкл. целевой service-faq) + вендор-модуль (информационно).
// Корень темы приходит через env THEME_DIR; корень воркспейса задаёт раннер
// (WORKSPACE_DIR, по умолчанию = THEME_DIR). Прогон с workspace = корень WP
// закрывает H-2: .vscode темы применяется только из корня воркспейса.
// Все кейсы ИНФОРМАЦИОННЫЕ: печатают наблюдения с префиксом «DIAG», не падают.
const fs = require('fs');
const path = require('path');

const THEME = process.env.THEME_DIR;
if (!THEME) throw new Error('THEME_DIR не передан в test-host (extensionTestsEnv)');

// Матрица мест стилей (пути от корня темы/проекта). Для другого инсталла список
// передаётся раннером через env DIAG_FILES (относительные пути через запятую;
// флаг --files у runDiagWpTheme.js) — без него действует матрица WP-темы.
const MATRIX = process.env.DIAG_FILES
	? process.env.DIAG_FILES.split(',').map(s => s.trim()).filter(Boolean)
	: [
		'resources/css/app.css',
		'resources/css/common/base.css',
		'resources/css/common/fonts.css',
		'resources/css/components/btn.css',
		'resources/css/partials/header.css',
		'resources/css/mixins/btn.css',
		'resources/css/modal/menu.css',
		'resources/css/editor.css',
		'resources/css/editor-blocks.css',
		'resources/css/blocks/main/service-faq/style.css', // целевой файл симптома
		'resources/css/blocks/main/service-summary/style.css',
		'resources/css/blocks/services/services-hero/style.css',
		'resources/css/blocks/blog/article-hero/style.css',
		'resources/css/blocks/clinic/about/style.css',
		'style.css', // header-only: WP-заголовок темы, без правил
		'modules/swiper-master/src/swiper.css' // вендор — информационно, без обязательств
	];
const HEADER_ONLY = new Set(['style.css']);
const VENDOR = new Set(['modules/swiper-master/src/swiper.css']);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function abs(rel) {
	return path.join(THEME, rel);
}

// Самодокументирование прогона: есть ли в КОРНЕ воркспейса .vscode/settings.json
// с ассоциацией *.css — фикс действует только из корня воркспейса (механика H-2)
function workspaceAssocInfo() {
	const vscode = require('vscode');
	const root = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
	const settingsPath = path.join(root || '', '.vscode', 'settings.json');
	let assoc = 'нет файла .vscode/settings.json';
	try {
		const raw = fs.readFileSync(settingsPath, 'utf8');
		const m = raw.match(/"\*\.css"\s*:\s*"([^"]+)"/);
		assoc = m ? `"*.css" → "${m[1]}"` : 'файл есть, ассоциации *.css нет';
	} catch (e) {
		// файл отсутствует — уже отражено в значении по умолчанию
	}
	console.log(`DIAG workspace: ${root}; ассоциация из корня воркспейса: ${assoc}`);
}

async function openDoc(file) {
	const vscode = require('vscode');
	const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(abs(file)));
	await vscode.window.showTextDocument(doc);
	return doc;
}

async function completionsAt(file, pos, settleMs = 2500, retries = 2) {
	const vscode = require('vscode');
	const uri = vscode.Uri.file(abs(file));
	const doc = await vscode.workspace.openTextDocument(uri);
	await vscode.window.showTextDocument(doc);
	await sleep(settleMs);
	let labels = [];
	let count = 0;
	for (let attempt = 1; attempt <= retries; attempt++) {
		const list = await vscode.commands.executeCommand(
			'vscode.executeCompletionItemProvider',
			uri,
			pos
		);
		count = list.items.length;
		labels = list.items
			.map(i => (typeof i.label === 'string' ? i.label : i.label && i.label.label))
			.filter(Boolean);
		if (count > 5 || attempt === retries) break;
		console.log(`DIAG DEBUG: ${file}: попытка ${attempt} — ${count} items, ждём прогрева…`);
		await sleep(3000);
	}
	return { labels, count };
}

describe('DIAG WP-тема: полная матрица мест стилей', function () {
	this.timeout(300000);

	before(async function () {
		this.timeout(180000);
		workspaceAssocInfo();
		const vscode = require('vscode');
		const related = vscode.extensions.all
			.filter(e => /css|postcss|peek|color/i.test(e.id))
			.map(e => `${e.id}${e.isActive ? ' [active]' : ''}`);
		console.log(`DIAG extensions (css-related): ${related.join(', ') || 'нет'}`);
		for (const id of ['vunguyentuan.vscode-css-variables', 'vscode.css-language-features']) {
			const e = vscode.extensions.getExtension(id);
			if (e && !e.isActive) {
				await e.activate();
				console.log(`DIAG DEBUG: активирован ${id}`);
			}
		}
		await sleep(2000);
	});

	it('diag A: languageId всех мест стилей (H-A/H-2: перехват языка)', async function () {
		for (const file of MATRIX) {
			const doc = await openDoc(file);
			console.log(`DIAG A: ${file} → languageId="${doc.languageId}"`);
		}
	});

	it('diag B: property-completion в каждом месте (якорь = первый селектор-блок "{")', async function () {
		for (const file of MATRIX) {
			const doc = await openDoc(file);
			const text = doc.getText();
			// Якорь: первая строка-селектор, оканчивающаяся на "{" — строки-ат-рулы
			// пропускаем, КРОМЕ @font-face (внутри него property-подсказки работают,
			// прогон 2026-09-22: 1144 items, color=true). Внутри прочих ат-рулов
			// (@import/@define-mixin/@media…) SCSS-сервис property-подсказок не даёт
			// (артефакт якоря «первый {», вскрыт на mixins/btn.css: @define-mixin btn {…})
			const lines = text.split('\n');
			let brace = -1;
			for (let i = 0, off = 0; i < lines.length; off += lines[i].length + 1, i++) {
				const t = lines[i].trim();
				if (t.endsWith('{') && (!t.startsWith('@') || t.startsWith('@font-face'))) {
					brace = off + lines[i].lastIndexOf('{');
					break;
				}
			}
			const topOnly = HEADER_ONLY.has(file) || brace < 0;
			const pos = topOnly
				? doc.positionAt(text.length) // header-only/@import-only: конец файла (селекторный уровень)
				: doc.positionAt(brace + 1); // пустая позиция внутри первого правила (mid-word префикс тест-хост не отвечает)
			const { labels, count } = await completionsAt(file, pos);
			const color = labels.includes('color');
			console.log(`DIAG B: ${file}: ${count} items; color=${color}; sample: ${labels.slice(0, 8).join(', ')}`);
			if (!topOnly && !VENDOR.has(file) && !color) {
				console.log(`DIAG B ⚠: ${file}: свойств нет, хотя место — свой код темы (ожидалось color в списке)`);
			}
		}
	});

	it('diag C: var(--…) в файлах с var-упоминаниями (цепочка css-variables)', async function () {
		for (const file of MATRIX) {
			const doc = await openDoc(file);
			const text = doc.getText();
			const idx = text.indexOf('var(--');
			if (idx < 0) {
				console.log(`DIAG C: ${file}: нет var(-- — пропуск`);
				continue;
			}
			const { labels, count } = await completionsAt(file, doc.positionAt(idx + 'var(--'.length));
			const dash = labels.filter(l => l.startsWith('--'));
			console.log(`DIAG C: ${file} @var(--: ${count} items; --vars: ${dash.slice(0, 10).join(', ') || 'НЕТ'}`);
		}
	});

	it('diag D: диагностика built-in CSS на целевом файле матрицы (шум диалекта)', async function () {
		const vscode = require('vscode');
		// Цель: по умолчанию service-faq (WP-тема); при кастомной матрице (--files) —
		// первый не-import-манифест (app.css из @import-строк пуст для диагностики)
		const file = MATRIX.find(f => f.includes('service-faq'))
			|| MATRIX.find(f => !f.endsWith('app.css'))
			|| MATRIX[0];
		const uri = vscode.Uri.file(abs(file));
		await vscode.workspace.openTextDocument(uri);
		await sleep(1500);
		const diags = vscode.languages.getDiagnostics(uri);
		const sample = diags
			.slice(0, 5)
			.map(d => `${d.source || '?'}: ${String(d.message).slice(0, 60)}`)
			.join(' | ');
		console.log(`DIAG D: ${file}: ${diags.length} диагностик; первые: ${sample || 'нет'}`);
	});
});
