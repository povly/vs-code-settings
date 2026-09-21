// Точка входа test-host: запускает mocha по всем *.test.js рядом.
const path = require('path');
const fs = require('fs');
const Mocha = require('mocha');

exports.run = async function () {
	const mocha = new Mocha({ ui: 'bdd', timeout: 120000, color: true });
	const testsRoot = __dirname;
	for (const f of fs.readdirSync(testsRoot)) {
		if (f.endsWith('.test.js')) mocha.addFile(path.join(testsRoot, f));
	}

	const failures = await new Promise(resolve => mocha.run(resolve));
	if (failures > 0) {
		throw new Error(`${failures} тест(ов) провалились`);
	}
};
