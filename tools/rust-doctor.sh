#!/usr/bin/env bash
# rust-doctor: health-check Rust-окружения (один запуск — вся диагностика).
# Архитектура: ВСЁ глобальное (user-settings Code OSS, ~/.cargo/config.toml, ~/.justfile, bacon);
# в проекте нужен только [workspace] members в корневом Cargo.toml (не глобализуется).
# Использование: tools/rust-doctor.sh [путь-к-rust-проекту]   (по умолчанию — текущий каталог)

set -uo pipefail

RUST_STUDY="${1:-$PWD}"
USER_SETTINGS="$HOME/.config/Code - OSS/User/settings.json"
CARGO_CONFIG="$HOME/.cargo/config.toml"
EXT_DIR="$HOME/.vscode-oss/extensions"

PASS=0; FAIL=0
ok()  { printf ' \033[32mPASS\033[0m  %s\n' "$1"; PASS=$((PASS+1)); }
bad() { printf ' \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=$((FAIL+1)); }
note() { printf '        %s\n' "$1"; }

echo "── rust-doctor: диагностика Rust-окружения ─────────────────────"

# 1. Базовый тулчейн
if command -v rustc >/dev/null 2>&1 && command -v cargo >/dev/null 2>&1; then
	ok "rustc/cargo: $(rustc --version | cut -d' ' -f2) / $(cargo --version | cut -d' ' -f2)"
else
	bad "rustc/cargo не найдены в PATH"
fi

# 2. PATH: cargo из ~/.cargo/bin (GUI-ловушка Code OSS — см. docs/rust-navigation-fix.md)
if [[ "$(command -v cargo 2>/dev/null || true)" == "$HOME/.cargo/bin/cargo" ]]; then
	ok "PATH: cargo из ~/.cargo/bin (GUI-запуск Code OSS не сломает анализ)"
else
	bad "cargo не из ~/.cargo/bin — при запуске Code OSS из .desktop анализ может падать"
fi

# 3. Компоненты rustup
for comp in rust-analyzer rustfmt clippy; do
	if rustup component list --installed 2>/dev/null | grep -q "^$comp"; then
		ok "rustup-компонент: $comp"
	else
		bad "rustup-компонент отсутствует: $comp (rustup component add $comp)"
	fi
done

# 4. Инструменты сеньор-сетапа
command -v bacon >/dev/null 2>&1 && ok "bacon: $(bacon --version)" || bad "bacon не установлен (cargo install --locked bacon)"
command -v just  >/dev/null 2>&1 && ok "just: $(just --version)"  || bad "just не установлен (pacman -S just или cargo install --locked just)"

# 5. Расширения Code OSS (машинные — действуют на все проекты)
for ext in "rust-lang.rust-analyzer" "vadimcn.vscode-lldb"; do
	if ls "$EXT_DIR" 2>/dev/null | grep -q "^${ext}-"; then
		ok "расширение Code OSS: $ext"
	else
		bad "расширение Code OSS не найдено: $ext"
	fi
done

# 6. Глобальные настройки Code OSS (любые проекты)
if [ -f "$USER_SETTINGS" ]; then
	grep -q '"rust-analyzer.check.command": "clippy"' "$USER_SETTINGS" \
		&& ok "глобально: clippy на сохранении" \
		|| bad "глобально нет rust-analyzer.check.command=clippy"
	grep -q '"editor.defaultFormatter": "rust-lang.rust-analyzer"' "$USER_SETTINGS" \
		&& ok "глобально: [rust]-форматтер rustfmt" \
		|| bad "глобально нет [rust]-форматтера"
	grep -q '"rust-analyzer.rustfmt.extraArgs"' "$USER_SETTINGS" \
		&& ok "глобально: табы ×2 через rustfmt.extraArgs (без rustfmt.toml)" \
		|| note "нет rust-analyzer.rustfmt.extraArgs (таблица ×2 в редакторе только через проектный rustfmt.toml)"
else
	bad "не найдены user-settings Code OSS: $USER_SETTINGS"
fi

# 7. Глобальные алиасы cargo и justfile
if [ -f "$CARGO_CONFIG" ] && grep -q '^\[alias\]' "$CARGO_CONFIG"; then
	ok "глобальные алиасы cargo: ~/.cargo/config.toml (c/t/cl/f/fc в любом проекте)"
else
	bad "нет [alias] в ~/.cargo/config.toml"
fi
[ -f "$HOME/.justfile" ] \
	&& ok "глобальный ~/.justfile (just -g <рецепт> в любом проекте)" \
	|| bad "нет ~/.justfile"

# 8. Проект: единственное проектное требование — [workspace] members
if [ -d "$RUST_STUDY" ]; then
	grep -q '^\[workspace\]' "$RUST_STUDY/Cargo.toml" 2>/dev/null \
		&& ok "$RUST_STUDY: [workspace] members (rust-analyzer видит все крейты)" \
		|| bad "$RUST_STUDY: нет [workspace] в Cargo.toml — вложенные крейты не индексируются"
else
	bad "проект не найден: $RUST_STUDY"
fi

echo "────────────────────────────────────────────────────────────────"
echo " Итог: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo " ✅ Окружение полностью готово" || echo " ❌ Есть проблемы — см. FAIL-строки выше"
exit $(( FAIL > 0 ? 1 : 0 ))
