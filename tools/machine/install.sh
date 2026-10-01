#!/usr/bin/env bash
# install.sh — развёртывание машинного уровня (форматирование PHP +
# конфиг phpantom: path-ignore чужой диагностики + PHPCS-прокси off,
# live-templates + Rust-глобаль: cargo-алиасы и ~/.justfile) одной командой.
# Заменяет 3 ручных шага README (mkdir + cp + install). Идемпотентен: повторный
# запуск безопасен (копирование поверх, wrapper переустанавливается с 755,
# существующие [alias]/~/.justfile/~/.phpantom.toml пользователя
# не перезаписываются — WARN).
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

echo
echo "PASS [machine-install] машинный уровень развёрнут в $DEST"
if command -v php-cs-fixer >/dev/null 2>&1; then
	echo "PASS  CLI php-cs-fixer: $(command -v php-cs-fixer)"
else
	echo "WARN  CLI php-cs-fixer не в PATH — один раз на машину:"
	echo "      composer global require friendsofphp/php-cs-fixer"
fi
echo "NOTE  phpantom: после ПЕРВОГО создания ~/.config/phpantom_lsp/.phpantom.toml —"
echo "      PHPantom: Restart Language Server (или Reload Window) в открытых окнах"
echo "NOTE  ключи user settings (~/config Code - OSS/User/settings.json) —"
echo "      перенос из снимка Code-OSS-User-settings.jsonc, секция PHP обязательна"
echo "      (полный чек после — tools/workspace-doctor.sh)"
echo "NOTE  live-templates: $snippets_installed файл(ов) в $USER_SNIPPETS_DIR —"
echo "      действуют в любом окне после Reload Window; Tab принимает пункты"
echo "      списка и разворачивает сниппеты: editor.tabCompletion: \"on\" (есть в снимке)"
