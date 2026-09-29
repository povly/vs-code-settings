#!/usr/bin/env bash
# rust-doctor: health-check Rust-окружения (один запуск — вся диагностика).
# Архитектура: ВСЁ глобальное (user-settings Code OSS, ~/.cargo/config.toml, ~/.justfile, bacon);
# в проекте нужен только [workspace] members в корневом Cargo.toml (не глобализуется).
# Покрытие: тулчейн/PATH/компоненты, bacon+just, 5 расширений, [rust]+[wgsl] user-settings,
# содержимое алиасов и ~/.justfile, [workspace] проекта (одиночный крейт — PASS), капы памяти RA.
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
# ядро Rust-трека (IntelliSense/дебаг/WGSL) — FAIL при отсутствии
for ext in "rust-lang.rust-analyzer" "vadimcn.vscode-lldb" "wgsl-analyzer.wgsl-analyzer"; do
	if ls "$EXT_DIR" 2>/dev/null | grep -q "^${ext}-"; then
		ok "расширение Code OSS: $ext"
	else
		bad "расширение Code OSS не найдено: $ext (code-oss --install-extension $ext)"
	fi
done
# комфорт (версии крейтов в Cargo.toml, TOML-форматтер) — WARN-уровень, не блокер
for ext in "serayuzgur.crates" "tamasfe.even-better-toml"; do
	if ls "$EXT_DIR" 2>/dev/null | grep -q "^${ext}-"; then
		ok "расширение Code OSS: $ext"
	else
		note "расширение Code OSS не найдено: $ext — комфорт (code-oss --install-extension $ext)"
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
	grep -q '"wgsl-analyzer.wgsl-analyzer"' "$USER_SETTINGS" \
		&& ok "глобально: [wgsl]-форматтер wgsl-analyzer (стиль wgslfmt — 4 пробела)" \
		|| note "нет [wgsl]-блока с wgsl-analyzer в user settings — форматирование .wgsl глобально не настроено"
else
	bad "не найдены user-settings Code OSS: $USER_SETTINGS"
fi

# 7. Глобальные алиасы cargo и justfile (+ содержимое, не только факт наличия)
if [ -f "$CARGO_CONFIG" ] && grep -q '^\[alias\]' "$CARGO_CONFIG"; then
	ok "глобальные алиасы cargo: ~/.cargo/config.toml (c/t/cl/f/fc в любом проекте)"
	missing_aliases=""
	for a in c t cl f fc; do
		grep -q "^$a = " "$CARGO_CONFIG" || missing_aliases="$missing_aliases $a"
	done
	if [ -z "$missing_aliases" ]; then
		note "содержимое [alias]: все 5 алиасов (c/t/cl/f/fc) на месте"
	else
		note "в [alias] нет алиасов:$missing_aliases — свой набор? шаблон: tools/machine/rust/cargo-config.toml"
	fi
else
	bad "нет [alias] в ~/.cargo/config.toml (развёртывание: tools/machine/install.sh)"
fi
if [ -f "$HOME/.justfile" ]; then
	ok "глобальный ~/.justfile (just -g <рецепт> в любом проекте)"
	missing_recipes=""
	for r in test build clippy fmt; do
		grep -q "^$r:" "$HOME/.justfile" || missing_recipes="$missing_recipes $r"
	done
	if [ -z "$missing_recipes" ]; then
		note "рецепты ~/.justfile: test/build/clippy/fmt на месте"
	else
		note "в ~/.justfile нет рецептов:$missing_recipes — свой набор? шаблон: tools/machine/rust/justfile"
	fi
else
	bad "нет ~/.justfile (развёртывание: tools/machine/install.sh)"
fi

# 8. Проект: единственное проектное требование — [workspace] members.
# Одиночный крейт (нет подкаталогов с собственным Cargo.toml, кроме target/) —
# PASS с note: [workspace] не требуется (docs/rust-standalone-root.md — прежний ложный FAIL)
if [ -d "$RUST_STUDY" ]; then
	if grep -q '^\[workspace\]' "$RUST_STUDY/Cargo.toml" 2>/dev/null; then
		ok "$RUST_STUDY: [workspace] members (rust-analyzer видит все крейты)"
	elif [ -f "$RUST_STUDY/Cargo.toml" ]; then
		sub_crate=$(find "$RUST_STUDY" -mindepth 2 -name Cargo.toml -not -path '*/target/*' -not -path '*/.git/*' 2>/dev/null | head -n 1)
		if [ -n "$sub_crate" ]; then
			bad "$RUST_STUDY: подкаталог-крейт без [workspace] ($sub_crate) — не индексируется; добавить [workspace] members"
		else
			ok "$RUST_STUDY: одиночный крейт — [workspace] не требуется"
		fi
	else
		bad "$RUST_STUDY: Cargo.toml не найден — не cargo-проект"
	fi
else
	bad "проект не найден: $RUST_STUDY"
fi

# 9. Память: кап кэшей rust-analyzer (опциональный тюнинг — docs/rust-memory.md)
if [ -f "$USER_SETTINGS" ]; then
	if grep -q '"rust-analyzer.lru.capacity"' "$USER_SETTINGS" && \
		grep -q '"rust-analyzer.cachePriming.numThreads"' "$USER_SETTINGS"; then
		ok "память: lru.capacity + cachePriming.numThreads (кап кэшей RA)"
	else
		note "нет ключей памяти RA (lru.capacity, cachePriming.numThreads) — опционально, см. docs/rust-memory.md"
	fi
fi

echo "────────────────────────────────────────────────────────────────"
echo " Итог: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo " ✅ Окружение полностью готово" || echo " ❌ Есть проблемы — см. FAIL-строки выше"
exit $(( FAIL > 0 ? 1 : 0 ))
