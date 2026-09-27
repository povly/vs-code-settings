#!/usr/bin/env bash
# install.sh — развёртывание машинного уровня (форматирование PHP +
# live-templates) одной командой.
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

# Live-templates: .code-snippets воркспейса → user-уровень, чтобы сниппеты
# действовали в ЛЮБОМ окне (проект, открытый отдельным корнем), а не только
# в воркспейсе этого репо. Источник правды — .vscode/*.code-snippets
# (CI: JSONC-валидация + кейс 16 tools/intellisense-check); правки в
# user/snippets вручную запрещены (дрейф) — только повторный запуск install.sh.
USER_SETTINGS_DIR="${VSCODE_USER_SETTINGS_DIR:-$HOME/.config/Code - OSS/User}"
USER_SNIPPETS_DIR="$USER_SETTINGS_DIR/snippets"
SNIPPETS_SRC="$(cd "$SRC/../.." && pwd)/.vscode"

mkdir -p "$USER_SNIPPETS_DIR" || die "не удалось создать $USER_SNIPPETS_DIR"

snippets_installed=0
for f in "$SNIPPETS_SRC"/*.code-snippets; do
	[ -e "$f" ] || break
	if cp "$f" "$USER_SNIPPETS_DIR/$(basename "$f")"; then
		snippets_installed=$((snippets_installed + 1))
	else
		die "копирование сниппета не удалось: $(basename "$f")"
	fi
done
if [ "$snippets_installed" -gt 0 ]; then
	step "live-templates: скопировано файлов: $snippets_installed → $USER_SNIPPETS_DIR"
else
	printf 'WARN [machine-install] live-templates: *.code-snippets не найдены в %s\n' "$SNIPPETS_SRC"
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
echo "NOTE  live-templates: $snippets_installed файл(ов) в $USER_SNIPPETS_DIR —"
echo "      действуют в любом окне после Reload Window; Tab-разворот требует"
echo "      editor.tabCompletion: \"onlySnippets\" в user settings (есть в снимке)"
