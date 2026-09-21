<?php

// Форматтер PHP воркспейса — ТАБЫ + PSR12 (единый стиль всех проектов внутри
// воркспейса; подключён через "php-cs-fixer.config" в settings.json — junstyle
// ищет конфиг в корне воркспейса и в .vscode/).
//
// Почему файл, а не настройка "php-cs-fixer.rules": символ отступа задаётся
// Config->setIndent (дефолт — 4 пробела), правилами его не переключить.
//
// Инсталлы, открываемые ОТДЕЛЬНЫМ корнем (WordPress/Bitrix вне воркспейса):
// скопируйте этот файл в корень инсталла — редактор подхватит автоматически
// (шаблон и детали — docs/clean-problems-formatting.md).
//
// Laravel-проекты: в CI/скриптах стиль задаёт vendor/bin/pint + pint.json
// с тем же правилом табов — см. docs/clean-problems-formatting.md.

$finder = (new PhpCsFixer\Finder())
	->in(__DIR__ . '/..');

return (new PhpCsFixer\Config())
	->setIndent("\t")
	->setRules([
		'@PSR12' => true,
		'indentation_type' => true,
		'array_indentation' => true,
	])
	->setFinder($finder);
