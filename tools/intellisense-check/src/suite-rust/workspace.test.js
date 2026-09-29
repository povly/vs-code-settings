// Кейсы R4: rust-analyzer в cargo-workspace с подкаталогом-крейтом (fixtures-rust-ws).
// Регрессия — первичный кейс docs/rust-navigation-fix.md: подкаталог-крейт даёт
// completion/hover/definition только при [workspace] members в корневом Cargo.toml.
//   R4a) completion в src/main.rs: префикс «mathlib::ad» → add
//   R4b) hover на mathlib::add (main.rs) — непустой контент
//   R4c) definition из main.rs на mathlib::add → mathlib/src/lib.rs
// Активен только в прогоне RUST_SUITE=workspace: раннер гоняет обе фикстуры
// отдельными инстансами VS Code, сьюты разводятся env-переменной.
const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');

const FIXTURES = path.resolve(__dirname, '..', '..', 'fixtures-rust-ws');
const RA_EXT = 'rust-lang.rust-analyzer';
const ACTIVE = process.env.RUST_SUITE === 'workspace';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(label, fn, { timeoutMs = 90000, intervalMs = 1000 } = {}) {
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

function hoverHasContent(hovers) {
	return (hovers || []).some(h =>
		(h.contents || []).some(c => {
			const text = c && c.value !== undefined ? c.value : c;
			return String(text).trim().length > 0;
		})
	);
}

(ACTIVE ? describe : describe.skip)('rust-analyzer: workspace с подкаталогом-крейтом (fixtures-rust-ws)', function () {
	this.timeout(180000);

	before(async function () {
		try {
			const ver = execSync('cargo --version').toString().trim();
			console.log(`DEBUG [test] тулчейн: ${ver}`);
		} catch (e) {
			console.warn('WARN [test] cargo недоступен в PATH — сьют пропущен');
			this.skip();
		}

		const vscode = require('vscode');
		const root = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
		console.log(`DEBUG [test] workspace: ${root}`);

		const ext = vscode.extensions.getExtension(RA_EXT);
		if (!ext) {
			console.warn(`WARN [test] расширение не найдено в тест-инстансе: ${RA_EXT} (NO_EXTS=1?)`);
			return;
		}
		if (!ext.isActive) await ext.activate();
		console.log(`DEBUG [test] расширение активно: ${RA_EXT}`);
	});

	it('R4a: completion через границу крейта — mathlib::ad → add', async function () {
		const vscode = require('vscode');
		const rel = path.join('src', 'main.rs');
		const { doc, uri } = await openDoc(rel);
		const pos = anchorPos(doc, rel, 'vec![mathlib::ad');

		const labels = await waitFor('R4a completions', async () => {
			const list = await vscode.commands.executeCommand(
				'vscode.executeCompletionItemProvider',
				uri,
				pos
			);
			const labels = labelsOf(list);
			return labels.includes('add') ? labels : null;
		});
		assert.ok(labels, 'completion не предложил add по префиксу «mathlib::ad»');
		console.log(`DEBUG [test] R4a: предложено ${labels.length} items; sample: ${labels.slice(0, 10).join(', ')}`);
	});

	it('R4b: hover на mathlib::add (main.rs) — непустой контент', async function () {
		const vscode = require('vscode');
		const rel = path.join('src', 'main.rs');
		const { doc, uri } = await openDoc(rel);
		const pos = anchorPos(doc, rel, 'mathlib::ad');

		const hovers = await waitFor('R4b hover', async () => {
			const res = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, pos);
			return hoverHasContent(res) ? res : null;
		});
		assert.ok(hovers, 'hover не вернул контент по mathlib::add');
		console.log('DEBUG [test] R4b: hover вернул контент');
	});

	it('R4c: definition из main.rs на mathlib::add → mathlib/src/lib.rs', async function () {
		const vscode = require('vscode');
		const rel = path.join('src', 'main.rs');
		const { doc, uri } = await openDoc(rel);
		const pos = anchorPos(doc, rel, 'mathlib::ad');

		const defs = await waitFor('R4c definition', async () => {
			const res = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', uri, pos);
			return res && res.length > 0 ? res : null;
		});
		assert.ok(defs, 'definition не найден по mathlib::add');
		const defFsPath = d => (d.uri && d.uri.fsPath) || (d.targetUri && d.targetUri.fsPath) || '?';
		const target = path.join('mathlib', 'src', 'lib.rs');
		assert.ok(
			defs.some(d => defFsPath(d).endsWith(target)),
			`definition ведёт не в ${target}: ${defs.map(defFsPath).join(', ')}`
		);
		console.log(`DEBUG [test] R4c: definition → ${defFsPath(defs[0])}`);
	});
});
