#!/usr/bin/env bash
# lang-switch-doctor: PASS/FAIL диагностика кражи фокуса при переключении раскладки
# (Alt+Shift, XKB grp:alt_shift_toggle) на KDE Plasma Wayland.
# Проверяет ОБА фикса (гайд: docs/kde-lang-switch-focus-fix.md):
#   1. OSD раскладки отключён — plasmarc [OSD] kbdLayoutChangedEnabled=false
#      (поверхность plasmashell больше не активируется и не крадёт keyboard focus);
#   2. Code OSS: menuBarVisibility=compact — Alt-up больше не открывает меню-бар
#      «File» (Electron-механизм, фокус уходил внутрь окна редактора).
# Работает на ЛЮБОМ корне: проверяет машину, не проект.
# Использование: tools/lang-switch-doctor.sh   (из любого каталога)
# Exit-коды: 0 — все PASS, 1 — есть FAIL.

set -uo pipefail

PLASMARC_GROUP="OSD"
PLASMARC_KEY="kbdLayoutChangedEnabled"
OSS_SETTINGS="$HOME/.config/Code - OSS/User/settings.json"

PASS=0; FAIL=0
ok()   { printf ' \033[32mPASS\033[0m  %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf ' \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=$((FAIL+1)); }
note() { printf '        %s\n' "$1"; }

echo "── lang-switch-doctor: кража фокуса при переключении раскладки ──"

# 1. Сессия: KDE + Wayland (фиксы специфичны для этой среды)
if [ "${XDG_CURRENT_DESKTOP:-}" = "KDE" ] && [ -n "${WAYLAND_DISPLAY:-}" ]; then
	ok "сессия: KDE Plasma Wayland (WAYLAND_DISPLAY=${WAYLAND_DISPLAY})"
else
	bad "сессия не KDE Wayland (XDG_CURRENT_DESKTOP=${XDG_CURRENT_DESKTOP:-<пусто>}) — скрипт для KDE Plasma Wayland"
fi

# 2. Механизм переключения: XKB-опция grp:alt_shift_toggle на месте
if command -v localectl >/dev/null 2>&1; then
	if localectl status 2>/dev/null | grep -q 'grp:alt_shift_toggle'; then
		ok "переключение: XKB grp:alt_shift_toggle (localectl)"
	else
		note "переключение настроено НЕ через grp:alt_shift_toggle — фикс всё равно валиден (OSD срабатывает при любом способе смены раскладки)"
	fi
else
	note "localectl недоступен — механизм переключения не проверить (не критично)"
fi

# 3. Главный чек №1: OSD раскладки отключён (поверхность-воровка в plasmashell)
if command -v kreadconfig6 >/dev/null 2>&1; then
	osd_val="$(kreadconfig6 --file plasmarc --group "$PLASMARC_GROUP" --key "$PLASMARC_KEY" 2>/dev/null)"
	if [ "$osd_val" = "false" ]; then
		ok "OSD раскладки отключён: plasmarc [${PLASMARC_GROUP}] ${PLASMARC_KEY}=false (фокус не крадётся)"
	else
		bad "OSD раскладки активен (${PLASMARC_KEY}='${osd_val:-<пусто=default true>}') — kwin дёргает plasmashell на каждой смене раскладки"
		note "фикс: kwriteconfig6 --file plasmarc --group ${PLASMARC_GROUP} --key ${PLASMARC_KEY} --type bool false"
		note "гайд: docs/kde-lang-switch-focus-fix.md"
	fi
else
	bad "kreadconfig6 не найден — конфиг Plasma не проверить (не KDE-машина?)"
fi

# 4. Главный чек №2: Code OSS — меню-бар компакт (Alt-up не открывает панель File)
if [ -f "$OSS_SETTINGS" ]; then
	if grep -Eq '"window\.menuBarVisibility"\s*:\s*"compact"' "$OSS_SETTINGS"; then
		ok "Code OSS: window.menuBarVisibility=compact (Alt+Shift не активирует меню-бар)"
	else
		bad "Code OSS: menuBarVisibility != compact — Alt-up при Alt+Shift открывает меню-бар «File» и крадёт фокус (нужен ESC)"
		note "фикс (машинные user settings): \"window.menuBarVisibility\": \"compact\" в ${OSS_SETTINGS}"
		note "затем: tools/machine/export-user-settings.sh (анти-дрейф снимка)"
	fi
else
	note "Code OSS user settings не найден (${OSS_SETTINGS}) — чек пропущен"
fi

# 5. plasmashell жив (иначе диагностика вне графической сессии)
if pgrep -x plasmashell >/dev/null 2>&1; then
	ok "plasmashell запущен"
else
	note "plasmashell не запущен — вне графической сессии Plasma (конфиг-чеки выше всё равно валидны)"
fi

echo "──"
if [ "$FAIL" -gt 0 ]; then
	printf 'ИТОГ: FAIL %d, PASS %d — применять фиксы по подсказкам выше\n' "$FAIL" "$PASS"
	note "если фокус крадётся при ложном PASS — см. fallback-ветви в docs/kde-lang-switch-focus-fix.md"
	exit 1
fi
printf 'ИТОГ: PASS %d, FAIL 0\n' "$PASS"
note "если фокус крадётся при ложном PASS — см. fallback-ветви в docs/kde-lang-switch-focus-fix.md"
exit 0
