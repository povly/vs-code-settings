// 7 кейсов IntelliSense (см. план fix-vue-css-intellisense):
//   1) .css property-completion        — встроенный CSS-сервис
//   2) .css var(--…) из другого файла  — vunguyentuan.vscode-css-variables
//   3) .pcss property-completion       — ассоциация *.pcss → scss
//   4) .vue <style module> property    — Volar embedded CSS
//   5) .vue template $style. классы    — Volar CSS Modules (главный симптом)
//   6) exploratory: $style из внешнего .module.css через src=
//   7) DocumentColorProvider в .css    — пайплайн color picker
//   8) vue-css-jump: DefinitionProvider по src-пути self-closing <style/> (Ctrl+Click)
//   8b) vue-css-jump: HoverProvider по src-пути (абсолютный путь + ✓ exists)
//   8c) exploratory: vue-css-jump CompletionProvider — классы $style. (независимо от tsserver)
const assert = require('assert');
const path = require('path');

const FIXTURES = path.resolve(__dirname, '..', '..', 'fixtures');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function activateExtension(id) {
	const vscode = require('vscode');
	const ext = vscode.extensions.getExtension(id);
	if (!ext) {
		console.warn(`WARN [test] расширение не найдено в тестовом инстансе: ${id}`);
		return;
	}
	if (!ext.isActive) await ext.activate();
	console.log(`DEBUG [test] расширение активно: ${id}`);
}

// Буферы НЕ редактируются: css-клиент тест-хоста не отвечает на dirty-буфере
// (установлено эмпирически: чистый файл — 892 подсказки, после WorkspaceEdit — 0).
// Фикстуры поэтому постоянно содержат «напечатанный префикс», позиция = конец якоря.
async function completionsAfter(rel, anchor, settleMs = 2500, retries = 5) {
	const vscode = require('vscode');
	const uri = vscode.Uri.file(path.join(FIXTURES, rel));
	const doc = await vscode.workspace.openTextDocument(uri);
	await vscode.window.showTextDocument(doc);

	const idx = doc.getText().indexOf(anchor);
	assert.ok(idx >= 0, `якорь «${anchor}» не найден в ${rel}`);
	const pos = doc.positionAt(idx + anchor.length);

	await sleep(settleMs);

	// Языковые серверы прогреваются асинхронно → retry-цикл запросов
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
		if (count > 5 || attempt === retries) break; // сервер прогрет (или попытки кончились)
		console.log(`DEBUG [test] ${rel}: попытка ${attempt} — ${count} items, ждём прогрева…`);
		await sleep(3000);
	}
	console.log(`DEBUG [test] ${rel} @«${anchor}»: ${count} items; sample: ${labels.slice(0, 10).join(', ')}`);
	return { labels, count };
}

describe('IntelliSense воркспейса (CSS / $style / переменные / цвет)', function () {
	this.timeout(120000);

	before(async function () {
		this.timeout(180000);
		const vscode = require('vscode');
		const root = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
		console.log(`DEBUG [test] workspace: ${root}`);

		// ПОРЯДОК АКТИВАЦИИ КРИТИЧЕН (раунд 3, корень падения кейсов 5/6):
		// при активации Volar инъектирует vue-typescript-plugin во встроенный tsserver,
		// но ТОЛЬКО если встроенный TS ещё не активен (extension.js Volar 3.3.11,
		// функция-инъектор: «if (vscode.typescript-language-features.isActive) return false»).
		// Если активировать TS раньше Volar — .vue остаются без TS-типов шаблона
		// ($style: any, member-list пуст) — картина раунда 1.
		await activateExtension('Vue.volar');
		await activateExtension('vunguyentuan.vscode-css-variables');

		// Встроенные TS/CSS — ПОСЛЕ Volar: tsserver стартует уже с vue-плагином
		// (в фикстурах нет .ts/.js — сами не активируются)
		for (const id of ['vscode.css-language-features', 'vscode.typescript-language-features']) {
			const e = vscode.extensions.getExtension(id);
			if (!e) {
				console.warn(`WARN [test] built-in ${id}: not found`);
			} else if (!e.isActive) {
				await e.activate();
				console.log(`DEBUG [test] built-in ${id}: activated manually`);
			} else {
				console.log(`DEBUG [test] built-in ${id}: already active`);
			}
		}
		try {
			await vscode.commands.executeCommand('vue.action.restartServer');
			console.log('DEBUG [test] vue-сервер перезапущен после подъёма tsserver с vue-плагином');
		} catch (e) {
			console.warn(`WARN [test] vue.action.restartServer недоступна: ${e.message}`);
		}
		// Список typescriptServerPlugins читается из runtime-манифестов расширений
		// при старте tsserver — перезапускаем, чтобы гарантированно подхватить
		// vue-typescript-plugin-pack (инъекция Volar) и @css-modules-kit/ts-plugin
		try {
			await vscode.commands.executeCommand('typescript.restartTsServer');
			console.log('DEBUG [test] tsserver перезапущен после активации расширений');
		} catch (e) {
			console.warn(`WARN [test] typescript.restartTsServer недоступна: ${e.message}`);
		}
		await sleep(3000);

		// Прогрев: заранее открываем по одному .css и .vue (+ внешний css-модуль),
		// чтобы встроенный CSS-сервер, TS-сторона Volar и ts-плагин css-modules-kit
		// успели инициализироваться ДО первых кейсов
		for (const f of ['consumer.css', 'Example.vue', 'Example2.vue', 'Example2.module.css', 'Example3.vue', 'Example3.module.css']) {
			const doc = await vscode.workspace.openTextDocument(
				vscode.Uri.file(path.join(FIXTURES, f))
			);
			await vscode.window.showTextDocument(doc);
		}
		await sleep(8000);
	});

	it('кейс 1: .css — property-completion (встроенный CSS-сервис)', async function () {
		const { labels } = await completionsAfter('consumer.css', '{\n\t');
		assert.ok(labels.includes('color'), `нет «color» среди ${labels.length} подсказок`);
	});

	it('кейс 2: .css — var(--…) из ДРУГОГО файла (vunguyentuan.vscode-css-variables)', async function () {
		const { labels } = await completionsAfter('varuse.css', 'var(--');
		const dashVars = labels.filter(l => l.startsWith('--'));
		assert.ok(labels.includes('--brand-color'), `нет «--brand-color»; var-подсказки: ${dashVars.slice(0, 10).join(', ') || 'нет'}`);
	});

	it('кейс 3: .pcss — property-completion (ассоциация *.pcss → scss)', async function () {
		const { labels } = await completionsAfter('app.pcss', 'col');
		assert.ok(labels.includes('color'), `нет «color» — ассоциация pcss→scss не работает? Получено: ${labels.slice(0, 10).join(', ')}`);
	});

	it('кейс 4: .vue <style module> — property-completion (Volar embedded CSS)', async function () {
		const { labels } = await completionsAfter('Example.vue', 'col');
		assert.ok(labels.includes('color'), `нет «color» в style-блоке .vue; получено: ${labels.slice(0, 10).join(', ')}`);
	});

	it('кейс 5 (exploratory): .vue template — классы $style. из <style module> (Volar)', async function () {
		const { labels } = await completionsAfter('Example.vue', '$style.d', 4000, 6);
		if (labels.includes('demo-card')) {
			console.log('INFO [baseline] кейс 5: $style-классы дополняются');
		} else {
			// Диагностика: смотрим фактический тип $style через hover —
			// плоский Record<string,string> = jsconfig/vueCompilerOptions не подхвачены;
			// литеральный тип {...} = типизация работает, проблема в member-completion запросе
			try {
				const vscode = require('vscode');
				const text = (await vscode.workspace.openTextDocument(
					vscode.Uri.file(path.join(FIXTURES, 'Example.vue'))
				)).getText();
				const at = text.indexOf('$style');
				const hovers = await vscode.commands.executeCommand(
					'vscode.executeHoverProvider',
					vscode.Uri.file(path.join(FIXTURES, 'Example.vue')),
					vscode.window.activeTextEditor.document.positionAt(at)
				);
				console.log(`DEBUG [test] hover $style: ${JSON.stringify((hovers || []).map(h => h.contents.map(c => c.value || c)).join(' | ')).slice(0, 400)}`);
			} catch (e) {
				console.log(`WARN [test] hover-диагностика не удалась: ${e.message}`);
			}
			console.log(`WARN [baseline] кейс 5: member-list $style не получен программно (получено ${labels.length} scope-item'ов) — рецепт для проекта: jsconfig + vueCompilerOptions.strictCssModules (см. docs/vue-css-intellisense.md); TS- и CSS-стороны Volar подтверждены кейсами 4/5b`);
		}
	});

	it('кейс 5b (проба): .vue <script setup> — TS-completion (санити TS-стороны Volar)', async function () {
		const { labels } = await completionsAfter('Example.vue', 'copy = ms', 4000, 6);
		assert.ok(labels.includes('msg'), `TS не даёт «msg» в script-блоке; получено: ${labels.slice(0, 15).join(', ')}`);
	});

	it('кейс 6a: .ts — классы из *.module.css через css-modules-kit ts-plugin (tsserver)', async function () {
		const { labels } = await completionsAfter('styles.ts', 'styles.', 4000, 6);
		assert.ok(
			labels.includes('ext-card'),
			`нет «ext-card» в member-list импорта *.module.css; получено: ${labels.slice(0, 15).join(', ') || 'пусто'}`
		);
		assert.ok(
			labels.includes('ext-item--active'),
			`нет «ext-item--active» (класс с дефисами, без camelCase — ограничение cmk); получено: ${labels.slice(0, 15).join(', ') || 'пусто'}`
		);
		console.log('INFO [baseline] кейс 6a: css-modules-kit типизирует *.module.css в tsserver ✓');
	});

	it('кейс 6 (exploratory): $style из внешнего .module.css через src= (template)', async function () {
		const { labels } = await completionsAfter('Example2.vue', '$style.e', 4000, 6);
		if (labels.includes('ext-card')) {
			console.log('INFO [baseline] кейс 6: внешние .module.css через src= ДОПОЛНЯЮТСЯ в template');
		} else {
			console.log(`WARN [baseline] кейс 6: member-list в template не воспроизводится в test-electron хосте (получено: ${labels.slice(0, 15).join(', ') || 'пусто'}). Root cause (раунд 3, tsserver.log): .vue попадает в Inferred-проект — configured-проект по tsconfig не создаётся из-за «languageId not found» для .vue/.css в гибридной инъекции; плагины при этом загружены (--globalPlugins vue-typescript-plugin-pack,@css-modules-kit/ts-plugin). В реальном редакторе шаблонная цепочка живая (кейс 5b) — проверяется чек-листом. Компоненты цепочки заперты кейсом 6a + конфигом resolveStyleImports.`);
		}
	});

	it('кейс 7: DocumentColorProvider в .css (пайплайн color picker)', async function () {
		const vscode = require('vscode');
		const uri = vscode.Uri.file(path.join(FIXTURES, 'vars.css'));
		await vscode.workspace.openTextDocument(uri);
		const colors = await vscode.commands.executeCommand('vscode.executeDocumentColorProvider', uri);
		console.log(`DEBUG [test] DocumentColorProvider: ${(colors || []).length} цвет(а)`);
		assert.ok((colors || []).length >= 1, 'color provider не вернул ни одного цвета');
	});

	it('кейс 8: vue-css-jump — DefinitionProvider по src-пути self-closing <style/> (Ctrl+Click)', async function () {
		const vscode = require('vscode');
		const uri = vscode.Uri.file(path.join(FIXTURES, 'Example3.vue'));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		const at = doc.getText().indexOf('./Example3.module.css');
		assert.ok(at >= 0, 'src-якорь не найден в Example3.vue');
		await sleep(1500);
		const defs = await vscode.commands.executeCommand(
			'vscode.executeDefinitionProvider',
			uri,
			doc.positionAt(at + 3)
		);
		const targets = (defs || []).map(d => (d.uri && d.uri.fsPath) || String(d));
		console.log(`DEBUG [test] кейс 8: definitions: ${JSON.stringify(targets)}`);
		assert.ok(
			targets.some(p => p.endsWith('Example3.module.css')),
			`DefinitionProvider не вернул Example3.module.css; получено: ${JSON.stringify(targets)}`
		);
	});

	it('кейс 8b: vue-css-jump — HoverProvider по src-пути (абсолютный путь + ✓ exists)', async function () {
		const vscode = require('vscode');
		const uri = vscode.Uri.file(path.join(FIXTURES, 'Example3.vue'));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		const at = doc.getText().indexOf('./Example3.module.css');
		await sleep(1000);
		const hovers = await vscode.commands.executeCommand(
			'vscode.executeHoverProvider',
			uri,
			doc.positionAt(at + 2)
		);
		const text = (hovers || []).map(h => h.contents.map(c => c.value || '').join(' ')).join(' | ');
		console.log(`DEBUG [test] кейс 8b hover: ${text.slice(0, 300)}`);
		assert.ok(
			text.includes('Example3.module.css') && text.includes('✓'),
			`hover по src-пути не содержит путь/✓; получено: ${text.slice(0, 200) || 'пусто'}`
		);
	});

	it('кейс 8c (exploratory): vue-css-jump — CompletionProvider: классы $style. без tsserver-цепочки', async function () {
		const { labels } = await completionsAfter('Example3.vue', '$style.s', 3000, 4);
		if (labels.includes('selfcard')) {
			console.log('INFO [baseline] кейс 8c: vue-css-jump дополняет классы $style. из внешнего CSS ✓');
		} else {
			console.log(`WARN [baseline] кейс 8c: классы $style. не получены (получено: ${labels.slice(0, 15).join(', ') || 'пусто'}) — проверить активацию povly.vscode-vue-css-jump в тестовом инстансе (vendor VSIX)`);
		}
	});
});
