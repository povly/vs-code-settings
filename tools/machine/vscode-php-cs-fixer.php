<?php

// Машинный конфиг php-cs-fixer для расширения junstyle.php-cs-fixer (Code OSS).
// Развёртывание: скопировать в ~/.config/vscode-php-cs-fixer/.php-cs-fixer.php
// и указать в USER settings:
//   "php-cs-fixer.config": "~/.config/vscode-php-cs-fixer/.php-cs-fixer.php"
// (README junstyle: config поддерживает "~/" и абсолютные пути) — действует
// в любом открытом корне без копирования файла в проект.
//
// Табы ×2 + PSR12 (конвенция воркспейса). Finder не задаётся: junstyle
// форматирует конкретный открытый файл (pathMode override).
//
// ВАЖНО: Laravel Pint НЕ умеет табы (правило indentation_type не конфигурируется
// и берёт отступ из Config->getIndent(), который Pint не экспонирует) —
// канонический стиль PHP задаёт php-cs-fixer, а не pint.json.

return (new PhpCsFixer\Config())
	->setIndent("\t")
	->setRules([
		'@PSR12' => true,
		'indentation_type' => true,
	]);
