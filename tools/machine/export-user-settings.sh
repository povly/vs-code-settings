#!/usr/bin/env bash
# export-user-settings.sh — обновить снимки user settings + keybindings Code OSS
# из живых файлов. Источник правды — живые ~/.config/Code - OSS/User/{settings,
# keybindings}.json; снимки в репо — справочник переноса на новую машину.
# Анти-дрейф: запускать после изменения живых user settings/keybindings
# (или после tools/install-extensions.sh / doctor-фиксов).
# Использование: tools/machine/export-user-settings.sh   (из любого каталога)
set -uo pipefail

SRC="$HOME/.config/Code - OSS/User/settings.json"
DST="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/Code-OSS-User-settings.jsonc"
KEYSRC="$HOME/.config/Code - OSS/User/keybindings.json"
KEYDST="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/Code-OSS-User-keybindings.jsonc"

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

if [ -f "$KEYSRC" ]; then
	{
		printf '// Снимок user keybindings Code OSS — %s\n' "$(date +%F)"
		printf '// Источник правды — живой файл: %s\n' "$KEYSRC"
		printf '// Обновлено скриптом tools/machine/export-user-settings.sh (не править руками)\n\n'
		cat "$KEYSRC"
	} > "$KEYDST"
	printf 'INFO [export] снимок keybindings обновлён: %s (%s строк)\n' "$KEYDST" "$(wc -l < "$KEYDST")"
else
	printf 'WARN [export] живой keybindings.json не найден, снимок пропущен: %s\n' "$KEYSRC" >&2
fi
