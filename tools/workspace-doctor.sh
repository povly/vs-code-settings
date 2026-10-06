#!/usr/bin/env bash
# workspace-doctor: health-check веб-стека (аналог rust-doctor для PHP/Laravel/WP/Bitrix).
# Архитектура: машинный уровень — phpantom + path-ignore (~/.config/phpantom_lsp/),
# xdebug, CLI-паритет php-cs-fixer (канон — CLI/CI в проектах; редакторная
# интеграция junstyle.php-cs-fixer убрана 02.10.2026), ключевые расширения.
# Работает на ЛЮБОМ корне: проверяет машину, не проект.
# Использование: tools/workspace-doctor.sh   (из любого каталога)
# Exit-коды: 0 — все PASS, 1 — есть FAIL.

set -uo pipefail

PHPANTOM_TOML="$HOME/.config/phpantom_lsp/.phpantom.toml"
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

# 5. CLI-паритет (composer global; редакторная интеграция junstyle убрана —
#    стиль в проектах гоняет CLI/CI vendor/bin/php-cs-fixer)
if command -v php-cs-fixer >/dev/null 2>&1; then
	ok "CLI php-cs-fixer: $(command -v php-cs-fixer)"
else
	bad "CLI php-cs-fixer не в PATH (composer global require friendsofphp/php-cs-fixer)"
fi

# 6. Ключевые расширения веб-стека: LSP, форматтеры, IntelliSense-звено
for ext in xdebug.php-debug vue.volar laravel.vscode-laravel povly.vscode-vue-css-jump shufo.vscode-blade-formatter mizdra.css-modules-kit-vscode vunguyentuan.vscode-css-variables dbaeumer.vscode-eslint esbenp.prettier-vscode; do
	if has_ext "$ext"; then
		ok "расширение: $ext"
	else
		bad "расширение отсутствует: $ext (tools/install-extensions.sh)"
	fi
done

# 7. WGSL (Rust/wgpu-трек): LSP wgsl-analyzer + [wgsl]-блок форматтера
if has_ext "wgsl-analyzer.wgsl-analyzer"; then
	ok "wgsl-analyzer: $(ls "$EXT_DIR" | grep -i '^wgsl-analyzer.wgsl-analyzer-' | head -n1)"
else
	bad "wgsl-analyzer не установлен — нет WGSL-подсказок/диагностики (code-oss --install-extension wgsl-analyzer.wgsl-analyzer)"
fi
if grep -q '"\[wgsl\]"' "$LIVE_SETTINGS" 2>/dev/null; then
	ok "user settings: [wgsl]-блок — форматтер выровнен (4 пробела, стиль wgslfmt фиксирован)"
else
	note "WARN: в user settings нет [wgsl]-блока — редактор вне воркспейса будет вставлять табы, formatOnSave переписывать в пробелы (снимок machine/Code-OSS-User-settings.jsonc)"
fi

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

# 9. Машинные live-templates: сниппеты развёрнуты на user-уровень (install.sh)
REPO_SNIPPETS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.vscode"
USER_SNIPPETS="${VSCODE_USER_SNIPPETS_DIR:-$HOME/.config/Code - OSS/User/snippets}"
snip_missing=""
for f in "$REPO_SNIPPETS"/*.code-snippets; do
	[ -e "$f" ] || break
	[ -f "$USER_SNIPPETS/$(basename "$f")" ] || snip_missing="$snip_missing $(basename "$f")"
done
if [ -z "$snip_missing" ]; then
	ok "live-templates: user-сниппеты развёрнуты ($(ls "$USER_SNIPPETS" 2>/dev/null | grep -c '\.code-snippets$') файлов)"
else
	note "WARN: live-templates не развёрнуты (tools/machine/install.sh):$snip_missing"
fi
if grep -q '"editor.tabCompletion"' "$LIVE_SETTINGS" 2>/dev/null; then
	ok "user settings: editor.tabCompletion — Tab разворачивает сниппеты в любом окне"
else
	note "WARN: в user settings нет editor.tabCompletion — Tab вне воркспейса не развернёт сниппет (снимок machine/Code-OSS-User-settings.jsonc, секция подсказок)"
fi

# 10. phpantom_lsp: сервер не устарел (релизы GitHub опережают качалку
#     расширения). WARN, не FAIL: расширение владеет своим кешем и может
#     перекачать свою версию при обновлении самого расширения.
PHPANTOM_LSP_BIN="$HOME/.local/bin/phpantom_lsp"
if [ -x "$PHPANTOM_LSP_BIN" ]; then
	if "$PHPANTOM_LSP_BIN" update --check >/dev/null 2>&1; then
		ok "phpantom_lsp: сервер свежий (обновлений нет)"
	else
		note "WARN: phpantom_lsp: доступно обновление сервера — phpantom_lsp update (затем PHPantom: Restart Language Server)"
	fi
else
	note "WARN: phpantom_lsp CLI-мост не найден (~/.local/bin/phpantom_lsp) — сервер обновляется расширением"
fi

echo "────────────────────────────────────────────────────────────────"
echo " Итог: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
