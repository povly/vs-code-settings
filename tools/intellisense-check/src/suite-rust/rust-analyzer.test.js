// Кейсы R0–R3: rust-analyzer в модульном cargo-проекте (фикстура fixtures-rust).
// Регрессия (история <rust-проект>): файлы модулей вне дерева крейта — lib.rs
// в подкаталоге без mod-декларации в корне — не дают completion/hover/definition
// («This file is not included in any crate»).
//   R0) guard: тулчейн cargo + активация rust-lang.rust-analyzer
//   R1) completion в src/pages/home.rs: префикс «gre» → greet + greet_user
//   R2) hover на pages::home::greet в main.rs — непустой контент
//   R3) definition из main.rs на pages::home::greet → src/pages/home.rs
const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');

const FIXTURES = path.resolve(__dirname, '..', '..', 'fixtures-rust');
const RA_EXT = 'rust-lang.rust-analyzer';
// Раннер гоняет две фикстуры отдельными инстансами VS Code (runRustTests.js):
// этот сьют активен в прогоне RUST_SUITE=modular (или без переменной).
const ACTIVE = !process.env.RUST_SUITE || process.env.RUST_SUITE === 'modular';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Retry-polling вместо фиксированных sleep: холодный старт rust-analyzer
// (загрузка VS Code + cargo metadata) может занять десятки секунд — таймаут
// это верхняя граница ожидания, а не норма.
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

// Якорь — точный кусок текста фикстуры; позиция = конец якоря (курсор внутри
// слова: слева префикс-фильтр для completion, сам идентификатор — для
// hover/definition-резолва).
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

(ACTIVE ? describe : describe.skip)('rust-analyzer: модульная система (fixtures-rust)', function () {
	this.timeout(180000);

	before(async function () {
		// R0 guard: без тулчейна сьют пропускается (WARN) — локальные машины
		// без Rust не краснеют; CI-джоба rust-intellisense-check ставит
		// тулчейн и обязана проходить.
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

	it('R1: completion в модуле home.rs — префикс gre → greet + greet_user', async function () {
		const vscode = require('vscode');
		const rel = path.join('src', 'pages', 'home.rs');
		const { doc, uri } = await openDoc(rel);
		const pos = anchorPos(doc, rel, 'vec![gre');

		const labels = await waitFor('R1 completions', async () => {
			const list = await vscode.commands.executeCommand(
				'vscode.executeCompletionItemProvider',
				uri,
				pos
			);
			const labels = labelsOf(list);
			return labels.includes('greet') && labels.includes('greet_user') ? labels : null;
		});
		assert.ok(labels, 'completion не предложил greet/greet_user по префиксу «gre»');
		console.log(`DEBUG [test] R1: предложено ${labels.length} items; sample: ${labels.slice(0, 10).join(', ')}`);
	});

	it('R2: hover на pages::home::greet (main.rs) — непустой контент', async function () {
		const vscode = require('vscode');
		const rel = path.join('src', 'main.rs');
		const { doc, uri } = await openDoc(rel);
		const pos = anchorPos(doc, rel, 'pages::home::gre');

		const hovers = await waitFor('R2 hover', async () => {
			const res = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, pos);
			return hoverHasContent(res) ? res : null;
		});
		assert.ok(hovers, 'hover не вернул контент по pages::home::greet');
		console.log('DEBUG [test] R2: hover вернул контент');
	});

	it('R3: definition из main.rs на pages::home::greet → src/pages/home.rs', async function () {
		const vscode = require('vscode');
		const rel = path.join('src', 'main.rs');
		const { doc, uri } = await openDoc(rel);
		const pos = anchorPos(doc, rel, 'pages::home::gre');

		const defs = await waitFor('R3 definition', async () => {
			const res = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', uri, pos);
			return res && res.length > 0 ? res : null;
		});
		assert.ok(defs, 'definition не найден по pages::home::greet');
		// LSP-провайдер rust-analyzer возвращает DefinitionLink (LocationLink:
		// targetUri вместо uri) — принимаем обе формы.
		const defFsPath = d => (d.uri && d.uri.fsPath) || (d.targetUri && d.targetUri.fsPath) || '?';
		const target = path.join('src', 'pages', 'home.rs');
		assert.ok(
			defs.some(d => defFsPath(d).endsWith(target)),
			`definition ведёт не в ${target}: ${defs.map(defFsPath).join(', ')}`
		);
		console.log(`DEBUG [test] R3: definition → ${defFsPath(defs[0])}`);
	});
});
