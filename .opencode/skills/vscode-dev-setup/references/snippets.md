# Live templates (.code-snippets) — как в PhpStorm

Файлы в `.vscode/`:

| Файл | Язык | Примеры префиксов |
|---|---|---|
| `php.code-snippets` | PHP + Laravel | `pubf`, `pubfr`, `prif`, `prof`, `cstr`, `fore`, `forek`, `tryc`, `thr`, `match`, `afn`, `test`, `dd`, `logi`, `route:`, `val:`, `relhm`, `relbo`, `scope:`, `col:` |
| `blade.code-snippets` | Blade | `bext`, `bsec`, `bif`, `bifel`, `bfore`, `bforelse`, `bxcomp`, `bxslot`, `bprops`, `bcsrf`, `bmethod`, `bech`, `braw`, `bjson`, `berror`, `bvite` |
| `vue.code-snippets` | Vue SFC | `vsfc`, `vscript`, `vref`, `vreactive`, `vcompd`, `vwatch`, `vprops`, `vemit`, `vexpose`, `vmounted`, `vfor`, `vstore` |
| `javascript.code-snippets` | JS | `cl`, `ce`, `cw`, `afn`, `afnr`, `nfn`, `asfn`, `expf`, `tryc`, `imp`, `impd`, `prom`, `fe`, `mapr`, `filtr`, `forof`, `st`, `sw`, `composable` |
| `html.code-snippets` | HTML + Alpine | `html5`, `linkcss`, `scriptm`, `mvp`, `picture`, `alpdata`, `alpclick`, `alpshow`, `alpfor` |
| `css.code-snippets` | CSS/PostCSS | `psrel`, `psab`, `flexcc`, `flexbb`, `dgrid`, `mq`, `varc`, `centerabs`, `trans`, `trunc`, `vishid`, `pcssnest` |
| `rust.code-snippets` | Rust + Bevy | `pfn`, `fn`, `asfn`, `main`, `tmain`, `pstruct`, `penum`, `pimpl`, `imptrait`, `derive`, `pl`, `pd`, `tfn`, `tmod`, `res`, `errte`, `bcomp`, `bres`, `bevent`, `bsys`, `bsysq`, `bplugin`, `bapp` |
| `wgsl.code-snippets` | WGSL | `vs`, `fs`, `st`, `cbuf`, `texb` |

## Использование

1. Набрать префикс → выбрать сниппет (стоят первыми: `editor.snippetSuggestions: "top"`).
2. **Tab** разворачивает и прыгает по позициям `$1 → $2`, `Tab`/`Shift+Tab`
   вперёд-назад (включено `editor.tabCompletion: "onlySnippets"`).

## Добавление нового шаблона

1. Открыть нужный `*.code-snippets` (файл = язык).
2. Добавить объект:
   ```jsonc
   "Мой шаблон": {
     "prefix": "myt",
     "body": [
       "public function ${1:name}()",
       "{",
       "  ${0://}",
       "}"
     ],
     "description": "что разворачивает"
   }
   ```
3. Правила синтаксиса: `\\$` — литеральный `$` (PHP-переменные!),
   `${1:дефолт}` — позиция с дефолтом, `$0` — финальный курсор,
   `${1|a,b,c|}` — выбор из списка, `$TM_FILENAME_BASE` — имя файла.
4. Отступ в body — табы (`\t`). JSON с комментариями (JSONC) допустим.
