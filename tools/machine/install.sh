#!/usr/bin/env bash
# install.sh — развёртывание машинного уровня (конфиг phpantom: path-ignore
# чужой диагностики + PHPCS-прокси off, live-templates + Rust-глобаль:
# cargo-алиасы и ~/.justfile) одной командой.
# Редакторная интеграция php-cs-fixer (junstyle) снята 02.10.2026: машинный
# слой фиксер-конфигов/wrapper'а больше не развёртывается; форматтер [php] —
# phpantom (авто-детект vendor/bin/php-cs-fixer с проектным .php-cs-fixer.php).
# Идемпотентен: повторный запуск безопасен (копирование поверх,
# существующие [alias]/~/.justfile/~/.phpantom.toml пользователя
# не перезаписываются — WARN).
# Использование: tools/machine/install.sh   (из любого каталога)
set -uo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step() { printf 'INFO [machine-install] %s\n' "$1"; }
die()  { printf 'ERROR [machine-install] %s\n' "$1" >&2; exit 1; }

# phpantom: глобальный конфиг (~/.config/phpantom_lsp/.phpantom.toml) —
# path-ignore чужой диагностики (vendor/**, ядра WP/Bitrix, плагины) +
# выключенный PHPCS-прокси (иначе phpantom сам находит системный phpcs
# в $PATH и гоняет его при каждом сохранении — PSR12-шум; стиль —
# php-cs-fixer). Шаблон: tools/machine/phpantom.toml; проверка —
# tools/workspace-doctor.sh (чеки 2–3); обзор опций — docs/phpantom-lsp.md.
PHPANTOM_DIR="$HOME/.config/phpantom_lsp"
PHPANTOM_TOML="$PHPANTOM_DIR/.phpantom.toml"
mkdir -p "$PHPANTOM_DIR" || die "не удалось создать $PHPANTOM_DIR"

if [ -f "$PHPANTOM_TOML" ]; then
	printf 'WARN [machine-install] %s уже существует — не трогаю (шаблон: tools/machine/phpantom.toml; diff — вручную)\n' "$PHPANTOM_TOML"
elif cp "$SRC/phpantom.toml" "$PHPANTOM_TOML"; then
	step "phpantom-конфиг: создан $PHPANTOM_TOML (path-ignore + [phpcs] off)"
else
	die "копирование phpantom.toml не удалось"
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

# Rust-глобаль: cargo-алиасы + ~/.justfile (гайд: docs/rust-senior-setup.md;
# существующие [alias]/~/.justfile пользователя не перезаписываем — только WARN)
RUST_SRC="$SRC/rust"
CARGO_CONFIG="$HOME/.cargo/config.toml"
JUSTFILE="$HOME/.justfile"
mkdir -p "$HOME/.cargo" || die "не удалось создать ~/.cargo"

if grep -q '^\[alias\]' "$CARGO_CONFIG" 2>/dev/null; then
	printf 'WARN [machine-install] %s уже содержит [alias] — не трогаю (шаблон: tools/machine/rust/cargo-config.toml)\n' "$CARGO_CONFIG"
elif cat "$RUST_SRC/cargo-config.toml" >> "$CARGO_CONFIG"; then
	step "cargo-алиасы: [alias] дописан в ~/.cargo/config.toml (c/t/cl/f/fc)"
else
	die "не удалось дописать алиасы в $CARGO_CONFIG"
fi

if [ -f "$JUSTFILE" ]; then
	printf 'WARN [machine-install] %s уже существует — не перезаписываю (шаблон: tools/machine/rust/justfile)\n' "$JUSTFILE"
elif cp "$RUST_SRC/justfile" "$JUSTFILE"; then
	step "just-рецепты: создан ~/.justfile (just -g test|build|clippy|fmt|check|watch)"
else
	die "копирование не удалось: $JUSTFILE"
fi

# fixperms: ~/.local/bin/fixperms — восстановление exec-битов vendor/bin/* в
# любом composer-проекте (права сносит перенос/синк дерева: scp/rsync/tar без
# сохранения perms → «Failed to spawn php-cs-fixer: Permission denied»).
# Симлинк (не копия): правки fixperms.sh в воркспейсе подхватываются сразу.
FIXPERMS_LINK="$HOME/.local/bin/fixperms"
if ln -sf "$SRC/fixperms.sh" "$FIXPERMS_LINK" 2>/dev/null; then
	step "fixperms: $FIXPERMS_LINK → tools/machine/fixperms.sh (запускать внутри проекта)"
else
	printf 'WARN [machine-install] fixperms: не удалось создать симлинк %s (создайте вручную)\n' "$FIXPERMS_LINK"
fi

# phpantom: подтянуть свежий сервер (релизы GitHub опережают качалку
# расширения; CLI-мост обновляет тот же бинарь, что исполняет расширение).
# Подсказка об обновлении без развёртывания — workspace-doctor.sh (чек 10).
PHPANTOM_LSP_BIN="$HOME/.local/bin/phpantom_lsp"
if [ -x "$PHPANTOM_LSP_BIN" ]; then
	if "$PHPANTOM_LSP_BIN" update --no-confirm >/dev/null 2>&1; then
		step "phpantom: сервер проверен/обновлён до актуального релиза (phpantom_lsp update)"
	else
		printf 'WARN [machine-install] phpantom_lsp update не удался (сеть?) — вручную: phpantom_lsp update\n'
	fi
else
	printf 'WARN [machine-install] phpantom_lsp CLI-мост не найден (%s) — откройте PHP-файл в Code OSS (расширение скачает сервер), затем перезапустите install.sh\n' "$PHPANTOM_LSP_BIN"
fi

echo
echo "PASS [machine-install] машинный уровень развёрнут (phpantom-конфиг + сервер, live-templates, fixperms, Rust)"
echo "NOTE  CLI php-cs-fixer (для CLI/CI-прогонов в инсталлах): composer global"
echo "      require friendsofphp/php-cs-fixer — один раз на машину (чек — workspace-doctor)"
echo "NOTE  phpantom: после ПЕРВОГО создания ~/.config/phpantom_lsp/.phpantom.toml —"
echo "      PHPantom: Restart Language Server (или Reload Window) в открытых окнах"
echo "NOTE  ключи user settings (~/.config/Code - OSS/User/settings.json) —"
echo "      перенос из снимка Code-OSS-User-settings.jsonc ([php]-форматтер —"
echo "      phpantom; junstyle убран 02.10.2026; чек — tools/workspace-doctor.sh)"
echo "NOTE  live-templates: $snippets_installed файл(ов) в $USER_SNIPPETS_DIR —"
echo "      действуют в любом окне после Reload Window; Tab принимает пункты"
echo "      списка и разворачивает сниппеты: editor.tabCompletion (есть в снимке)"
