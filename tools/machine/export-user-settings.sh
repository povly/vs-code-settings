#!/usr/bin/env bash
# export-user-settings.sh — обновить снимок user settings Code OSS из живого файла.
# Источник правды — живой ~/.config/Code - OSS/User/settings.json; снимок в репо —
# справочник переноса на новую машину. Анти-дрейф: запускать после изменения
# живых user settings (или после tools/install-extensions.sh / doctor-фиксов).
# Использование: tools/machine/export-user-settings.sh   (из любого каталога)
set -uo pipefail

SRC="$HOME/.config/Code - OSS/User/settings.json"
DST="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/Code-OSS-User-settings.jsonc"

if [ ! -f "$SRC" ]; then
	printf 'ERROR [export] живой файл не найден: %s\n' "$SRC" >&2
	exit 1
fi

{
	printf '// Снимок user settings Code OSS — %s\n' "$(date +%F)"
	printf '// Источник правды — живой файл: %s\n' "$SRC"
	printf '// Обновлено скриптом tools/machine/export-user-settings.sh (не править руками)\n\n'
	cat "$SRC"
} > "$DST"

printf 'INFO [export] снимок обновлён: %s (%s строк)\n' "$DST" "$(wc -l < "$DST")"
