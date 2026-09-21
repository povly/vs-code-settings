<?php

// Валидатор JSONC-конфигов воркспейса (.vscode/*.json с комментариями).
// Использование:
//   php tools/validate-jsonc.php <файл1.jsonc> [<файл2> ...]
// Exit-код 0 — все файлы валидны, 1 — есть ошибки (детали в STDERR).
// Задача VS Code «Валидация JSONC-конфигов» (.vscode/tasks.json) вызывает его же.

function strip_jsonc(string $s): string
{
	$out = '';
	$len = strlen($s);
	$i = 0;
	$inStr = false;
	while ($i < $len) {
		$c = $s[$i];
		if ($inStr) {
			$out .= $c;
			if ($c === '\\' && $i + 1 < $len) {
				$out .= $s[$i + 1];
				$i += 2;
				continue;
			}
			if ($c === '"') {
				$inStr = false;
			}
			$i++;
			continue;
		}
		if ($c === '"') {
			$inStr = true;
			$out .= $c;
			$i++;
			continue;
		}
		if ($c === '/' && $i + 1 < $len && $s[$i + 1] === '/') {
			while ($i < $len && $s[$i] !== "\n") {
				$i++;
			}
			continue;
		}
		if ($c === '/' && $i + 1 < $len && $s[$i + 1] === '*') {
			$i += 2;
			while ($i + 1 < $len && !($s[$i] === '*' && $s[$i + 1] === '/')) {
				$i++;
			}
			$i = ($i + 1 < $len) ? $i + 2 : $len;
			continue;
		}
		$out .= $c;
		$i++;
	}
	// trailing commas (допустимы в JSONC VS Code): ,] / ,}
	$out = preg_replace('/,(\s*[}\]])/', '$1', $out);

	return $out;
}

$exit = 0;
foreach (array_slice($argv, 1) as $f) {
	$raw = @file_get_contents($f);
	if ($raw === false) {
		fwrite(STDERR, "FAIL read: $f\n");
		$exit = 1;
		continue;
	}
	json_decode(strip_jsonc($raw));
	if (json_last_error() !== JSON_ERROR_NONE) {
		fwrite(STDERR, "FAIL $f: " . json_last_error_msg() . "\n");
		$exit = 1;
	} else {
		echo "OK $f\n";
	}
}
exit($exit);
