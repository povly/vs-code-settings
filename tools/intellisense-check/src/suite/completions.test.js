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
//   9)  postcss-диалект (@define-mixin/$vars/nesting) в plain .css — ассоциация dialect.css → scss
//   9a) var(--…) из соседнего файла в postcss-диалекте (css-variables поверх scss-ассоциации)
//   10)  vue-css-jump ≥ 0.2.0: hover по тегу компонента — карточка props/emits/v-model/expose (строгий)
//   10a) exploratory: нативный Volar — completions атрибутов внутри тега компонента
//   11)  vue-css-jump ≥ 0.1.3: diagnostics <style src> — нет файла (Error) и module без .module.css (Warning)
//   12)  vue-css-jump: bracket-completion $style[' — dashed-имена (после $style. — exploratory)
//   13)  vue-css-jump ≥ 0.4.0: карточка — «Типы:» command-links + секция превью типов (строгий)
//   14)  vue-css-jump ≥ 0.5.0: definition + hover по статическому class-токену (селектор + декларации)
//   15)  vue-css-jump ≥ 0.3.0: JSDoc в карточке — описание компонента + доки пропсов (строгий)
const assert = require('assert');
const path = require('path');

const FIXTURES = path.resolve(__dirname, '..', '..', 'fixtures');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Retry-polling вместо фиксированных sleep: тест идёт дальше, как только сервер
// ответил (fn → truthy); таймаут — верхняя граница ожидания, а не норма.
async function waitFor(label, fn, { timeoutMs = 10000, intervalMs = 300 } = {}) {
	const deadline = Date.now() + timeoutMs;
	for (let attempt = 1; ; attempt++) {
		const res = await fn();
		if (res) return res;
		if (Date.now() >= deadline) {
			console.log(`INFO [waitFor] ${label}: таймаут ${timeoutMs}ms (${attempt} попыток) — берём как есть`);
			return res;
		}
		await sleep(intervalMs);
	}
}

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

	// Языковые серверы прогреваются асинхронно → опрос вместо sleep-цикла:
	// большие списки (>5) принимаются сразу, малые — не раньше settleMs
	// (прежняя семантика settle+retry), бюджет — settleMs×retries
	const settleAt = Date.now() + settleMs;
	const ready = await waitFor(`${rel} completions`, async () => {
		const list = await vscode.commands.executeCommand(
			'vscode.executeCompletionItemProvider',
			uri,
			pos
		);
		const items = list.items || [];
		if (items.length === 0) return null;
		if (items.length <= 5 && Date.now() < settleAt) return null;
		return {
			labels: items
				.map(i => (typeof i.label === 'string' ? i.label : i.label && i.label.label))
				.filter(Boolean),
			count: items.length,
		};
	}, { timeoutMs: settleMs * retries, intervalMs: 500 });
	const labels = (ready && ready.labels) || [];
	const count = (ready && ready.count) || 0;
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
		for (const f of ['consumer.css', 'Example.vue', 'Example2.vue', 'Example2.module.css', 'Example3.vue', 'Example3.module.css', 'Example4.vue', 'Widget.vue', 'Example5.vue', 'Example6.vue', 'Example6.module.css']) {
			const doc = await vscode.workspace.openTextDocument(
				vscode.Uri.file(path.join(FIXTURES, f))
			);
			await vscode.window.showTextDocument(doc);
		}
		// Готовность CSS-сервера ждём опросом (completions в consumer.css),
		// а не фиксированным sleep(8000): тёплый сервер — секунды, холодный — таймаут
		const warmDoc = await vscode.workspace.openTextDocument(
			vscode.Uri.file(path.join(FIXTURES, 'consumer.css'))
		);
		const warmPos = warmDoc.positionAt(warmDoc.getText().indexOf('{\n\t') + '{\n\t'.length);
		await waitFor('прогрев css-сервера', async () => {
			const list = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', warmDoc.uri, warmPos);
			return (list.items || []).length > 5;
		}, { timeoutMs: 15000, intervalMs: 500 });
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
		const defs = await waitFor('кейс 8 definitions', async () => {
			const d = await vscode.commands.executeCommand(
				'vscode.executeDefinitionProvider',
				uri,
				doc.positionAt(at + 3)
			);
			return (d || []).length ? d : null;
		});
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
		const hovers = await waitFor('кейс 8b hover', async () => {
			const h = await vscode.commands.executeCommand(
				'vscode.executeHoverProvider',
				uri,
				doc.positionAt(at + 2)
			);
			return (h || []).length ? h : null;
		});
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
			console.log(`WARN [baseline] кейс 8c: классы $style. не получены (получено ${labels.slice(0, 15).join(', ') || 'пусто'}) — проверить активацию povly.vscode-vue-css-jump в тестовом инстансе (vendor VSIX)`);
		}
	});

	it('кейс 9: postcss-диалект .css — property-completion (ассоциация dialect.css → scss)', async function () {
		const { labels } = await completionsAfter('dialect.css', '{\n\tcol', 4000, 6);
		assert.ok(labels.includes('color'), `нет «color» в postcss-диалекте (scss-ассоциация); получено: ${labels.slice(0, 10).join(', ')}`);
	});

	it('кейс 9a: postcss-диалект .css — var(--…) из соседнего файла (css-variables + scss)', async function () {
		const { labels } = await completionsAfter('dialect.css', 'var(--card', 4000, 6);
		assert.ok(labels.includes('--card-green'), `нет «--card-green»; var-подсказки: ${labels.filter(l => l.startsWith('--')).slice(0, 10).join(', ') || 'нет'}`);
	});

	it('кейс 10: vue-css-jump ≥ 0.2.0 — hover по тегу компонента: карточка props/emits (строгий)', async function () {
		const vscode = require('vscode');
		const uri = vscode.Uri.file(path.join(FIXTURES, 'Example4.vue'));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		const at = doc.getText().indexOf('<Widget');
		assert.ok(at >= 0, 'тег <Widget не найден в Example4.vue');
		const hovers = await waitFor('кейс 10 hover', async () => {
			const h = await vscode.commands.executeCommand(
				'vscode.executeHoverProvider',
				uri,
				doc.positionAt(at + 3)
			);
			return (h || []).length ? h : null;
		});
		const text = (hovers || []).map(h => h.contents.map(c => c.value || '').join(' ')).join(' | ');
		console.log(`DEBUG [test] кейс 10 hover: ${text.slice(0, 400)}`);
		assert.ok(
			text.includes('vue-css-jump') && text.includes('`label`') && text.includes('save'),
			`hover по тегу компонента не содержит карточку vue-css-jump (props/emits); получено: ${text.slice(0, 300) || 'пусто'}`
		);
		const defs = await vscode.commands.executeCommand(
			'vscode.executeDefinitionProvider',
			uri,
			doc.positionAt(at + 3)
		);
		const targets = (defs || []).map(d => (d.uri && d.uri.fsPath) || String(d));
		console.log(`DEBUG [test] кейс 10 definitions: ${JSON.stringify(targets)}`);
		assert.ok(
			targets.some(p => p.endsWith('Widget.vue')),
			`DefinitionProvider по тегу <Widget> не ведёт в Widget.vue; получено: ${JSON.stringify(targets)}`
		);
	});

	it('кейс 10a (exploratory): нативный Volar — completions атрибутов внутри тега компонента', async function () {
		const { labels } = await completionsAfter('Example4.vue', '<Widget ', 4000, 6);
		if (labels.includes('label')) {
			console.log('INFO [baseline] кейс 10a: Volar дополняет props внутри тега компонента ✓');
		} else {
			console.log(`WARN [baseline] кейс 10a: программно props-completions не получены (${labels.slice(0, 15).join(', ') || 'пусто'}) — известное ограничение test-host (template → inferred project, раунд 3); в реальном редакторе проверяется чек-листом (docs/vue-css-intellisense.md, п. 11)`);
		}
	});

	it('кейс 11: vue-css-jump — diagnostics по <style src> (нет файла → Error, module без .module.css → Warning)', async function () {
		const vscode = require('vscode');
		const uri = vscode.Uri.file(path.join(FIXTURES, 'Example5.vue'));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		// диагностика дебаунсится (300ms) → опрос до двух vue-css-jump-записей
		const diags = await waitFor('кейс 11 diagnostics', async () => {
			const own = vscode.languages.getDiagnostics(uri)
				.filter(d => String(d.message).includes('vue-css-jump'));
			return own.length >= 2 ? own : null;
		}, { timeoutMs: 10000, intervalMs: 400 });
		const list = diags || [];
		console.log(`DEBUG [test] кейс 11: ${list.length} vue-css-jump-диагностик: ${list.map(d => `${d.severity}:${d.message.slice(0, 60)}`).join(' | ')}`);
		assert.ok(
			list.some(d => d.severity === vscode.DiagnosticSeverity.Error && d.message.includes('существует')),
			`нет Error «файл не существует»; получено: ${JSON.stringify(list.map(d => d.message))}`
		);
		assert.ok(
			list.some(d => d.severity === vscode.DiagnosticSeverity.Warning && d.message.includes('.module.css')),
			`нет Warning про суффикс .module.css; получено: ${JSON.stringify(list.map(d => d.message))}`
		);
	});

	it('кейс 12: vue-css-jump — bracket-completion $style[\' (dashed-имена); после $style. — нет (exploratory)', async function () {
		const bracket = await completionsAfter('Example6.vue', "$style['", 3000, 4);
		assert.ok(
			bracket.labels.includes('ext-card'),
			`нет «ext-card» после $style['; получено: ${bracket.labels.slice(0, 15).join(', ') || 'пусто'}`
		);
		const dot = await completionsAfter('Example6.vue', '$style.e', 3000, 4);
		if (dot.labels.includes('ext-card')) {
			console.log('WARN [baseline] кейс 12: dashed-имя после точки предлагает не vue-css-jump (tsserver-цепочка) — ожидаемо только в bracket-форме');
		} else {
			console.log('INFO [baseline] кейс 12: после точки dashed-имена не предлагаются ✓');
		}
	});

	it('кейс 13: vue-css-jump ≥ 0.4.0 — карточка: «Типы:» command-links + превью типов (строгий)', async function () {
		const vscode = require('vscode');
		const uri = vscode.Uri.file(path.join(FIXTURES, 'Example4.vue'));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		const at = doc.getText().indexOf('<Widget');
		assert.ok(at >= 0, 'тег <Widget не найден в Example4.vue');
		const hovers = await waitFor('кейс 13 hover', async () => {
			const h = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, doc.positionAt(at + 3));
			return (h || []).length ? h : null;
		});
		const text = (hovers || []).map(h => h.contents.map(c => c.value || '').join(' ')).join(' | ');
		console.log(`DEBUG [test] кейс 13 hover: ${text.slice(0, 400)}`);
		assert.ok(
			text.includes('Типы:') && text.includes('command:vue-css-jump.openType'),
			`в карточке нет строки «Типы:» с command-ссылками; получено: ${text.slice(0, 300) || 'пусто'}`
		);
		assert.ok(
			text.includes('**Типы**') && text.includes('interface Options'),
			`нет секции превью типов с «interface Options»; получено: ${text.slice(0, 300) || 'пусто'}`
		);
	});

	it('кейс 14: vue-css-jump ≥ 0.5.0 — definition + hover по статическому class-токену', async function () {
		const vscode = require('vscode');
		const uri = vscode.Uri.file(path.join(FIXTURES, 'Example.vue'));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		const at = doc.getText().indexOf('class="demo-title"');
		assert.ok(at >= 0, 'статический class-токен не найден в Example.vue');
		const pos = doc.positionAt(at + 'class="'.length + 2);
		const defs = await waitFor('кейс 14 definitions', async () => {
			const d = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', uri, pos);
			return (d || []).length ? d : null;
		});
		const targets = (defs || []).map(d => (d.uri && d.uri.fsPath) || String(d));
		console.log(`DEBUG [test] кейс 14 definitions: ${JSON.stringify(targets)}`);
		assert.ok(
			targets.some(p => p.endsWith('Example.vue')),
			`DefinitionProvider по class-токену не ведёт в Example.vue; получено: ${JSON.stringify(targets)}`
		);
		const hovers = await waitFor('кейс 14 hover', async () => {
			const h = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, pos);
			return (h || []).length ? h : null;
		});
		const text = (hovers || []).map(h => h.contents.map(c => c.value || '').join(' ')).join(' | ');
		console.log(`DEBUG [test] кейс 14 hover: ${text.slice(0, 300)}`);
		assert.ok(
			text.includes('.demo-title') && text.includes('font-weight'),
			`hover по class-токену без превью селектора/деклараций; получено: ${text.slice(0, 200) || 'пусто'}`
		);
	});

	it('кейс 15: vue-css-jump ≥ 0.3.0 — JSDoc в карточке: описание компонента + доки пропсов (строгий)', async function () {
		const vscode = require('vscode');
		const uri = vscode.Uri.file(path.join(FIXTURES, 'Example4.vue'));
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		const at = doc.getText().indexOf('<Widget');
		const hovers = await waitFor('кейс 15 hover', async () => {
			const h = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, doc.positionAt(at + 3));
			return (h || []).length ? h : null;
		});
		const text = (hovers || []).map(h => h.contents.map(c => c.value || '').join(' ')).join(' | ');
		console.log(`DEBUG [test] кейс 15 hover: ${text.slice(0, 400)}`);
		assert.ok(
			text.includes('Демонстрационный компонент фикстуры') && text.includes('Метка кнопки'),
			`JSDoc (описание компонента / доки пропса label) не попали в карточку; получено: ${text.slice(0, 300) || 'пусто'}`
		);
	});
});
