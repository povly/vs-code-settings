#!/bin/sh
# Wrapper php-cs-fixer для junstyle.php-cs-fixer (машинный сетап _vscode).
#
# 1) cwd = ~/.config/vscode-php-cs-fixer → fixer видит служебный composer.json
#    (config.platform.php = major.minor runtime) → нет WARN «Unable to determine
#    minimum PHP version supported by your project from composer.json» — junstyle
#    спавнит фиксер с cwd каталога редактируемого файла, а fixer ищет composer.json
#    строго в cwd, без walk-up (ComposerJsonReader 3.95).
# 2) Фильтр баннера из stderr: junstyle 0.3.21 при «files==0» и >1 непустой строки
#    в stderr РЕДЖЕКТИТ провайдер форматирования («provider FAILED» в exthost),
#    а php-cs-fixer всегда печатает баннер (about / runtime / config / running)
#    в stderr даже с --format=json → каждое сохранение уже-чистого по правилам
#    файла падало с ошибкой. Фильтр убирает ТОЛЬКО строки баннера; настоящие
#    предупреждения и ошибки проходят насквозь (провайдер честно их покажет).
#
# stdout не трогаем — его парсит расширение (JSON). Сам скрипт молчит.
# Развёртывание: tools/machine/README.md; механика: docs/clean-problems-formatting.md.

FIXER="$HOME/.config/composer/vendor/bin/php-cs-fixer"

cd "$HOME/.config/vscode-php-cs-fixer" || exit 1

tmp="$(mktemp)"
"$FIXER" "$@" 2>"$tmp"
status=$?

grep -v -E '^(PHP CS Fixer [0-9]|PHP runtime:|Loaded config|Running analysis )' "$tmp" >&2
rm -f "$tmp"
exit $status

