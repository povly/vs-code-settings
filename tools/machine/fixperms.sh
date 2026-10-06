#!/usr/bin/env bash
# fixperms — восстановить exec-биты на bin-файлах composer-проекта (vendor/bin/*
# и цели симлинков). Права регулярно сносит перенос/синк дерева проекта
# (scp/rsync/tar без сохранения perms) — после этого phpantom и CLI не могут
# запустить vendor/bin/php-cs-fixer («Failed to spawn … Permission denied,
# os error 13»), а вместе с ним pest/phpunit/phpstan/pint.
# Деплой: tools/machine/install.sh → ~/.local/bin/fixperms (действует в любом
# composer-проекте). Проверка: tools/workspace-doctor.sh (чек 10 — соседний).
# Использование: fixperms [-n|--dry-run] [каталог]   (по умолчанию — $PWD;
# корень проекта ищется подъёмом до composer.json — запускать можно из любого
# подкаталога).
# Exit-коды: 0 — ок / нечего чинить / dry-run; 1 — ошибка.
set -euo pipefail

usage() {
	printf 'usage: fixperms [-n|--dry-run] [каталог]\n'
}

die() { printf 'ERROR [fixperms] %s\n' "$1" >&2; exit 1; }

dry_run=0
start_dir=$PWD
while [ $# -gt 0 ]; do
	case $1 in
		-n|--dry-run) dry_run=1 ;;
		-h|--help) usage; exit 0 ;;
		-*) usage >&2; die "неизвестный флаг: $1" ;;
		*) start_dir=$1 ;;
	esac
	shift
done
[ -d "$start_dir" ] || die "каталог не найден: $start_dir"

# Корень проекта: подъём от start_dir до composer.json.
root=""
dir=$(cd "$start_dir" && pwd)
while [ "$dir" != "/" ]; do
	if [ -f "$dir/composer.json" ]; then
		root=$dir
		break
	fi
	dir=$(dirname "$dir")
done
[ -n "$root" ] || die "composer.json не найден выше $start_dir — запускайте внутри composer-проекта"

bin_dir="$root/vendor/bin"
if [ ! -d "$bin_dir" ]; then
	printf 'fixperms: ok — vendor/bin отсутствует (%s)\n' "$root"
	exit 0
fi

found=0
fixed=0
for entry in "$bin_dir"/*; do
	if [ ! -e "$entry" ] && [ ! -L "$entry" ]; then
		continue
	fi
	# composer-биндарь бывает симлинком на файл пакета — чиним цель, а не ссылку
	path=$entry
	if [ -L "$entry" ]; then
		target=$(readlink -f "$entry" 2>/dev/null || true)
		if [ -n "$target" ] && [ -e "$target" ]; then
			path=$target
		fi
	fi
	if [ ! -f "$path" ]; then
		continue
	fi
	found=$((found + 1))
	if [ -x "$path" ]; then
		continue
	fi
	before=$(stat -c '%A' "$path")
	if [ "$dry_run" -eq 1 ]; then
		printf '[dry-run] chmod +x %s (%s)\n' "$path" "$before"
	else
		chmod +x "$path"
		printf 'fixperms: %s: %s -> %s\n' "$path" "$before" "$(stat -c '%A' "$path")"
	fi
	fixed=$((fixed + 1))
done

if [ "$fixed" -eq 0 ]; then
	printf 'fixperms: ok — все exec-биты на месте (%s: файлов %s)\n' "$bin_dir" "$found"
else
	suffix=""
	if [ "$dry_run" -eq 1 ]; then
		suffix=' (dry-run)'
	fi
	printf 'fixperms: исправлено: %s из %s%s\n' "$fixed" "$found" "$suffix"
fi
