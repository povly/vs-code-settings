// Кейсы W0–W2: wgsl-analyzer в чистой папке с .wgsl-шейдерами (fixtures-wgsl).
//   W0) guard (в before): расширение wgsl-analyzer.wgsl-analyzer найдено и
//       активировано в тест-инстансе; не ставится с маркетплейса → WARN-skip,
//       CI не краснеет (контракт плана rust-tooling-completeness)
//   W1) язык .wgsl-файла = wgsl (ассоциация из расширения)
//   W2) completion в shaders/ok.wgsl: префикс «make_re» → make_red
const assert = require('assert');
const path = require('path');

const FIXTURES = path.resolve(__dirname, '..', '..', 'fixtures-wgsl');
const WGSL_EXT = 'wgsl-analyzer.wgsl-analyzer';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(label, fn, { timeoutMs = 60000, intervalMs = 1000 } = {}) {
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

async function openDoc(rel) {
	const vscode = require('vscode');
	const uri = vscode.Uri.file(path.join(FIXTURES, rel));
	const doc = await vscode.workspace.openTextDocument(uri);
	await vscode.window.showTextDocument(doc);
	console.log(`DEBUG [test] открыт: ${rel}`);
	return { doc, uri };
}

function anchorPos(doc, rel, anchor) {
	const idx = doc.getText().indexOf(anchor);
	assert.ok(idx >= 0, `якорь «${anchor}» не найден в ${rel}`);
	return doc.positionAt(idx + anchor.length);
}

function labelsOf(list) {
	return (list.items || [])
		.map(i => (typeof i.label === 'string' ? i.label : i.label && i.label.label))
		.filter(Boolean);
}

describe('wgsl-analyzer: WGSL IntelliSense (fixtures-wgsl)', function () {
	this.timeout(120000);

	before(async function () {
		const vscode = require('vscode');
		const root = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
		console.log(`DEBUG [test] workspace: ${root}`);

		const ext = vscode.extensions.getExtension(WGSL_EXT);
		if (!ext) {
			console.warn(`WARN [test] расширение не найдено в тест-инстансе: ${WGSL_EXT} — сьют пропущен (W0-guard)`);
			this.skip();
		}
		if (!ext.isActive) await ext.activate();
		await sleep(3000);
		console.log(`DEBUG [test] расширение активно: ${WGSL_EXT}`);
	});

	it('W1: язык .wgsl-файла — wgsl', async function () {
		const { doc } = await openDoc(path.join('shaders', 'ok.wgsl'));
		assert.strictEqual(doc.languageId, 'wgsl', `languageId = ${doc.languageId}, ожидался wgsl`);
		console.log('DEBUG [test] W1: languageId = wgsl');
	});

	it('W2: completion в ok.wgsl — make_re → make_red', async function () {
		const vscode = require('vscode');
		const rel = path.join('shaders', 'ok.wgsl');
		const { doc, uri } = await openDoc(rel);
		const pos = anchorPos(doc, rel, 'return make_re');

		const labels = await waitFor('W2 completions', async () => {
			const list = await vscode.commands.executeCommand(
				'vscode.executeCompletionItemProvider',
				uri,
				pos
			);
			const labels = labelsOf(list);
			return labels.includes('make_red') ? labels : null;
		});
		assert.ok(labels, 'completion не предложил make_red по префиксу «make_re»');
		console.log(`DEBUG [test] W2: предложено ${labels.length} items; sample: ${labels.slice(0, 10).join(', ')}`);
	});
});
