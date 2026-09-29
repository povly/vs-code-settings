#!/usr/bin/env bash
# rust-memory-report: кто ест память при Rust-разработке в Code OSS.
# Архитектура: только чтение /proc — нет зависимости от ps и побочных эффектов;
# группы процессов (code-oss дерево, rust-analyzer, rustc/cargo, веб-LSP) + топ-N по RSS.
# Стиль вывода — как у tools/rust-doctor.sh. Логирование: verbose (каждый шаг эхом).
# Использование: tools/rust-memory-report.sh [топ-N]   (по умолчанию 15)

set -uo pipefail

TOP_N="${1:-15}"
PROCS_SEEN=0
PROCS_RSS=0

verbose() { printf '        %s\n' "$1"; }

# ── Классификация процесса: comm + cmdline → группа (приоритет сверху вниз) ──
classify() {
	local comm="$1" cmd="$2"
	case "$comm" in
		rust-analyzer)                 echo "rust-analyzer";              return ;;
		rustc|clippy-driver|cargo|rustdoc|bacon)
		                               echo "rustc/cargo (flycheck)";    return ;;
		phpantom*)                     echo "web-LSP: phpantom";         return ;;
		wgsl-analyzer*)                echo "wgsl-analyzer";             return ;;
		tsserver|eslint-*|*-language-server|volar*)
		                               echo "web-LSP: js/vue/ts";        return ;;
	esac
	# Группы code-oss — только при маркере самого Code OSS в cmdline:
	# иначе браузерный Chromium и чужие electron-приложения с теми же --type=
	# ошибочно попадают в дерево редактора.
	case "$cmd" in
		*code-oss*|*code_oss*|*vscode-oss*)
			case "$cmd" in
				*"--type=extensionHost"*)  echo "code-oss: extension host"; return ;;
				*"--type=fileWatcher"*)    echo "code-oss: file watcher";   return ;;
				*"--type=renderer"*|*"--type=gpu-process"*)
				                           echo "code-oss: render/gpu";     return ;;
				*"--type=utility"*|*"--type=sharedProcess"*|*"--type=ptyHost"*)
				                           echo "code-oss: utility/shared"; return ;;
			esac
			echo "code-oss: main/прочее"; return ;;
	esac
	echo "прочее"
}

echo "── rust-memory-report: RSS-разбивка потребителей памяти ─────────"
verbose "сканирую /proc (только чтение), топ-N = ${TOP_N}"

# ── Сбор: rss_kB|группа|описание (comm :: обрезок cmdline) ──
rows=""
for d in /proc/[0-9]*; do
	[ -r "$d/cmdline" ] || continue
	PROCS_SEEN=$((PROCS_SEEN + 1))
	comm=$(<"$d/comm" 2>/dev/null) || continue
	cmd=$(tr '\0' ' ' <"$d/cmdline" 2>/dev/null)
	cmd=${cmd//$'\n'/ }   # \n внутри аргументов рвёт строку отчёта
	cmd=${cmd//$'\r'/ }
	rss=$(awk '/^VmRSS:/ { print $2 }' "$d/status" 2>/dev/null)
	[ -n "${rss:-}" ] || continue   # ядровые потоки без VmRSS пропускаем
	[ "$rss" -gt 0 ] || continue    # VmRSS=0 (зомби/переходные) не попадают в отчёт
	PROCS_RSS=$((PROCS_RSS + 1))
	group=$(classify "$comm" "$cmd")
	pid=${d##*/}
	rows+="${rss}|${group}|[${pid}] ${comm} :: ${cmd:0:104}"$'\n'
done
verbose "процессов в /proc: ${PROCS_SEEN}; с VmRSS (пользовательские): ${PROCS_RSS}"

if [ -z "$rows" ]; then
	echo " НЕТ ДАННЫХ: ни одного процесса с VmRSS (странная система?)"
	exit 1
fi

# ── Сводка по группам (сумма RSS, количество процессов) ──
echo
echo " Группы (суммарный RSS):"
printf '%s' "$rows" | awk -F'|' '
	{ sum[$2] += $1; cnt[$2]++ }
	END {
		for (g in sum) printf "%10.1f MB  %3d шт  %s\n", sum[g] / 1024, cnt[g], g
	}' | sort -rn

total_mb=$(printf '%s' "$rows" | awk -F'|' '{ s += $1 } END { printf "%.1f", s / 1024 }')
echo " ─────────────────────────────────────────────"
echo " Итого учтено (RSS всех пользовательских процессов): ${total_mb} MB"
verbose "порог внимания: группа > 512 MB помечается ⚠"

# ── Топ-N процессов ──
echo
echo " Топ-${TOP_N} процессов по RSS:"
	printf '%s' "$rows" | sort -t'|' -k1,1rn | head -n "$TOP_N" \
		| awk -F'|' '{ printf " %10.1f MB  [%s] %s\n", $1 / 1024, $2, $3 }'

echo "────────────────────────────────────────────────────────────────"
verbose "как пользоваться: замер «до» → правки настроек → перезапуск окна → замер «после»"
verbose "живое окно Rust-проекта должно быть открыто: иначе строки rust-analyzer не будет"
exit 0
