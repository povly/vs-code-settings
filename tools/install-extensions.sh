#!/usr/bin/env bash
# install-extensions.sh — CLI-установка всех рекомендаций .vscode/extensions.json.
# Заменяет ручной «Extensions → Recommended → Install All» — для новой машины
# или восстановления после чистки ~/.vscode-oss/extensions.
# Использование:  tools/install-extensions.sh [--force]   (из любого каталога)
#   --force — переустановить даже уже установленные (обновить до версии VSIX)
# Зависимости: php (парсинг JSONC), CLI Code OSS (code-oss | code) в PATH.
# Exit-коды: 0 — все прошли (установлены или уже стояли), 1 — есть FAIL.
set -uo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_JSON="$SELF_DIR/../.vscode/extensions.json"

FORCE=()
if [[ "${1:-}" == "--force" ]]; then
	FORCE=(--force)
fi

CLI=""
for c in code-oss code; do
	if command -v "$c" >/dev/null 2>&1; then CLI="$c"; break; fi
done
if [ -z "$CLI" ]; then
	echo "ERROR [ext] CLI Code OSS не найден (code-oss / code) в PATH" >&2
	exit 1
fi

if [ ! -f "$EXT_JSON" ]; then
	echo "ERROR [ext] не найден $EXT_JSON" >&2
	exit 1
fi

IDS=$(php -r '
	// String-aware JSONC strip: инлайн // и /* */ комментарии, строки не трогаем
	$s = file_get_contents($_SERVER["argv"][1]);
	$out = ""; $len = strlen($s); $i = 0; $inStr = false;
	while ($i < $len) {
		$c = $s[$i];
		if ($inStr) {
			$out .= $c;
			if ($c === "\\" && $i + 1 < $len) { $out .= $s[$i + 1]; $i += 2; continue; }
			if ($c === "\"") { $inStr = false; }
			$i++; continue;
		}
		if ($c === "\"") { $inStr = true; $out .= $c; $i++; continue; }
		if ($c === "/" && ($i + 1 < $len) && $s[$i + 1] === "/") { while ($i < $len && $s[$i] !== "\n") { $i++; } continue; }
		if ($c === "/" && ($i + 1 < $len) && $s[$i + 1] === "*") { $i += 2; while ($i + 1 < $len && ($s[$i] !== "*" || $s[$i + 1] !== "/")) { $i++; } $i += 2; continue; }
		$out .= $c; $i++;
	}
	$out = preg_replace("/,\s*([\]}])/", "$1", $out); // tolerate trailing commas
	$j = json_decode($out, true);
	if (!is_array($j) || empty($j["recommendations"])) {
		fwrite(STDERR, "recommendations пуст или не читается\n");
		exit(1);
	}
	echo implode("\n", $j["recommendations"]);
' "$EXT_JSON") || { echo "ERROR [ext] парсинг $EXT_JSON не удался" >&2; exit 1; }

TOTAL=0; OK=0; SKIP=0; FAIL=0
echo "── install-extensions ($CLI${FORCE[0]:+ --force}): рекомендации из .vscode/extensions.json ──"
while IFS= read -r id; do
	[ -z "$id" ] && continue
	TOTAL=$((TOTAL+1))
	OUT=$("$CLI" --install-extension "$id" "${FORCE[@]}" 2>&1)
	if [ $? -eq 0 ]; then
		if echo "$OUT" | grep -qi "successfully installed"; then
			printf ' PASS  установлен: %s\n' "$id"
			OK=$((OK+1))
		else
			printf ' SKIP  уже стоит:   %s\n' "$id"
			SKIP=$((SKIP+1))
		fi
	else
		printf ' FAIL  %s: %s\n' "$id" "$(echo "$OUT" | tail -n 1)" >&2
		FAIL=$((FAIL+1))
	fi
done <<< "$IDS"

echo "── SUMMARY: total=$TOTAL installed=$OK skipped=$SKIP failed=$FAIL ──"
if [ "$FAIL" -ne 0 ]; then
	exit 1
fi
