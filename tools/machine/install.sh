#!/usr/bin/env bash
# install.sh — развёртывание машинного уровня форматирования PHP одной командой.
# Заменяет 3 ручных шага README (mkdir + cp + install). Идемпотентен: повторный
# запуск безопасен (копирование поверх, wrapper переустанавливается с 755).
# Использование: tools/machine/install.sh   (из любого каталога)
set -uo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.config/vscode-php-cs-fixer"

step() { printf 'INFO [machine-install] %s\n' "$1"; }
die()  { printf 'ERROR [machine-install] %s\n' "$1" >&2; exit 1; }

mkdir -p "$DEST" || die "не удалось создать $DEST"

for f in vscode-php-cs-fixer.php composer.json; do
	if cp "$SRC/$f" "$DEST/$f"; then
		step "скопирован: $DEST/$f"
	else
		die "копирование не удалось: $f"
	fi
done

if install -m 755 "$SRC/php-cs-fixer-wrapper.sh" "$DEST/php-cs-fixer-wrapper.sh"; then
	step "установлен wrapper (755): $DEST/php-cs-fixer-wrapper.sh"
else
	die "установка wrapper не удалась"
fi

echo
echo "PASS [machine-install] машинный уровень развёрнут в $DEST"
if command -v php-cs-fixer >/dev/null 2>&1; then
	echo "PASS  CLI php-cs-fixer: $(command -v php-cs-fixer)"
else
	echo "WARN  CLI php-cs-fixer не в PATH — один раз на машину:"
	echo "      composer global require friendsofphp/php-cs-fixer"
fi
echo "NOTE  ключи user settings (~/config Code - OSS/User/settings.json) —"
echo "      перенос из снимка Code-OSS-User-settings.jsonc, секция PHP обязательна"
echo "      (полный чек после — tools/workspace-doctor.sh)"
