#!/usr/bin/env bash
# workspace-doctor: health-check веб-стека (аналог rust-doctor для PHP/Laravel/WP/Bitrix).
# Архитектура: машинный уровень — phpantom + path-ignore (~/.config/phpantom_lsp/),
# php-cs-fixer (~/.config/vscode-php-cs-fixer/ + wrapper), xdebug, CLI-паритет,
# ключевые расширения. Работает на ЛЮБОМ корне: проверяет машину, не проект.
# Использование: tools/workspace-doctor.sh   (из любого каталога)
# Exit-коды: 0 — все PASS, 1 — есть FAIL.

set -uo pipefail

PHPANTOM_TOML="$HOME/.config/phpantom_lsp/.phpantom.toml"
FIXER_DIR="$HOME/.config/vscode-php-cs-fixer"
EXT_DIR="$HOME/.vscode-oss/extensions"
LIVE_SETTINGS="$HOME/.config/Code - OSS/User/settings.json"
SNAPSHOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/machine/Code-OSS-User-settings.jsonc"

PASS=0; FAIL=0
ok()   { printf ' \033[32mPASS\033[0m  %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf ' \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=$((FAIL+1)); }
note() { printf '        %s\n' "$1"; }

# каталог расширения существует? (каталоги — lowercase: Vue.volar → vue.volar-*)
has_ext() {
	[ -d "$EXT_DIR" ] && ls "$EXT_DIR" 2>/dev/null | grep -iq "^$(printf '%s' "$1" | sed 's/\./\\./g')-"
}

echo "── workspace-doctor: диагностика веб-стека (машинный уровень) ──"

# 1. phpantom — PHP LSP
if has_ext "phpantom.phpantom"; then
	ok "phpantom: $(ls "$EXT_DIR" | grep -i '^phpantom.phpantom-' | head -n1)"
else
	bad "phpantom не установлен (code-oss --install-extension phpantom.phpantom)"
fi

# 2. phpantom path-ignore: чужая диагностика погашена глобально
if [ -f "$PHPANTOM_TOML" ]; then
	ok "конфиг phpantom: $PHPANTOM_TOML"
	for pat in 'vendor/**' 'wp-admin/**' 'wp-includes/**' 'bitrix/**'; do
		if grep -qF "$pat" "$PHPANTOM_TOML" 2>/dev/null; then
			ok "path-ignore: $pat"
		else
			bad "path-ignore отсутствует: $pat (добавить в $PHPANTOM_TOML)"
		fi
	done
	# 3. PHPCS-прокси выключен (иначе PSR12-шум на каждом сохранении)
	if grep -A1 '^\[phpcs\]' "$PHPANTOM_TOML" | grep -qF 'command = ""'; then
		ok "phpantom [phpcs]: command = \"\" (прокси выключен)"
	else
		bad "phpantom [phpcs] command != \"\" — PSR12-шум при сохранении (см. docs/phpactor-indexer-phpcs-fix.md)"
	fi
else
	bad "нет $PHPANTOM_TOML — path-ignore/phpcs не проверить"
fi

# 4. Xdebug загружен
if php -m 2>/dev/null | grep -qi xdebug; then
	ok "xdebug: загружен ($(php -m | grep -i xdebug | head -n1))"
else
	bad "xdebug не загружен (sudo pacman -S --needed xdebug; см. README §Xdebug)"
fi

# 5. Машинный php-cs-fixer: конфиг + wrapper + служебный composer.json
for f in .php-cs-fixer.php php-cs-fixer-wrapper.sh composer.json; do
	if [ -f "$FIXER_DIR/$f" ]; then
		ok "машинный php-cs-fixer: $f"
	else
		bad "нет $FIXER_DIR/$f (развернуть: tools/machine/install.sh)"
	fi
done
[ -x "$FIXER_DIR/php-cs-fixer-wrapper.sh" ] && ok "wrapper исполняемый (755)" \
	|| bad "wrapper не исполняемый: chmod 755 $FIXER_DIR/php-cs-fixer-wrapper.sh"

# 6. CLI-паритет (composer global)
if command -v php-cs-fixer >/dev/null 2>&1; then
	ok "CLI php-cs-fixer: $(command -v php-cs-fixer)"
else
	bad "CLI php-cs-fixer не в PATH (composer global require friendsofphp/php-cs-fixer)"
fi

# 7. Ключевые расширения веб-стека
for ext in junstyle.php-cs-fixer xdebug.php-debug vue.volar laravel.vscode-laravel povly.vscode-vue-css-jump; do
	if has_ext "$ext"; then
		ok "расширение: $ext"
	else
		bad "расширение отсутствует: $ext (tools/install-extensions.sh)"
	fi
done

# 8. Снимок user settings не старше живого файла (анти-дрейф; WARN, не FAIL)
if [ -f "$SNAPSHOT" ] && [ -f "$LIVE_SETTINGS" ]; then
	if [ "$SNAPSHOT" -nt "$LIVE_SETTINGS" ] || [ "$SNAPSHOT" -ef "$LIVE_SETTINGS" ]; then
		ok "снимок user settings актуальнее живого файла"
	else
		note "WARN: живой user settings новее снимка — обновить: tools/machine/export-user-settings.sh"
	fi
else
	note "WARN: снимок ($SNAPSHOT) или живой settings не найдены — сравнение пропущено"
fi

echo "────────────────────────────────────────────────────────────────"
echo " Итог: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
