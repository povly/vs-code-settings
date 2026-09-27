[← Предыдущий гайд](js-standalone-root.md) · [К README](../README.md)

# GitHub CI: все ОС, все типы проектов (JS · воркспейс · Laravel · WordPress)

> Рецепты CI «чтобы всё работало везде»: матрица трёх ОС + Linux-дистрибутивы
> контейнерами, тесты с первого дня, шаблоны для будущих проектов.
> Рабочие примеры: js-webgpu-кейс (проект `<js-проект>`), воркспейс `_vscode`
> (`.github/workflows/ci.yml`), шаблоны `templates/`. Дата: 2026-09-27.

## Симптом

- «У меня работает» ≠ «работает везде»: linux≠linux (glibc/musl/rolling), ОС-специфика путей и инструментов
- Тесты появляются после кода, а не вместе с ним
- Новый проект = заново придумывать pipeline

## Рецепт 1 — JS-проект (Vite/vanilla): 3 ОС + 3 дистро, тесты из коробки

Новый JS-корень — генератором (уже CI-ready, `--no-ci` чтобы выключить):

```bash
tools/new-js-project.sh <каталог> [--webgpu]
```

Тот же workflow вручную (`.github/workflows/ci.yml`): job `matrix`
(`ubuntu/windows/macos-latest`, node 22, `npm ci` → lint → typecheck →
test → build) + job `linux-distros` — тот же конвейер В КОНТАЙНЕРАХ:
`node:22-alpine` (musl; checkout требует git → `apk add --no-cache git`),
`archlinux:base` (`pacman -Sy --noconfirm nodejs npm`; rolling — ближе всего
к CachyOS), `fedora:latest` (`dnf -y install nodejs npm`). `fail-fast: false`
— одна среда не гасит остальные; `concurrency` + `cancel-in-progress` —
пуш-очередь не копится.

Тесты без GPU: vitest + happy-dom; топ-левел `main()` под гвардом
`if (import.meta.env.MODE !== "test")`; `?raw`-импорты резолвятся самим vite
(smoke-проверка шейдера). `typecheck` — `tsc -p jsconfig.json` (typescript
в devDeps, не `npx -y` — версия зафиксирована).

## Рецепт 2 — воркспейс _vscode (инструменты)

`.github/workflows/ci.yml` воркспейса, три job:

| Job | Что | Нюансы |
|---|---|---|
| intellisense-check | `tools/intellisense-check` `npm test` (@vscode/test-electron) | Linux — `xvfb-run -a`; win/macos — GUI-харнесс, до стабилизации `continue-on-error` (ubuntu обязателен); кэш npm по `tools/intellisense-check/package-lock.json` |
| shellcheck | `shellcheck --severity=error tools/*.sh tools/machine/*.sh` | только реальные баги, не стилистика — первый прогон не краснит CI |
| validate-jsonc | `php tools/validate-jsonc.php` + те же 14 файлов, что в задаче «JSONC» (`.vscode/tasks.json`) | setup-php 8.3 |

## Рецепт 3 — будущие проекты: шаблоны templates/

- `templates/laravel-ci.yml` — matrix ОС × php [8.3, 8.4]; setup-php
  (mbstring, intl, pdo_sqlite); `php vendor/bin/php-cs-fixer fix --dry-run
  --diff` (проектный `.php-cs-fixer.php`, табы ×2); pest/phpunit на sqlite
  `:memory:`; `shell: bash` — кросс-ОС вызовы бинарей через `php vendor/bin/…`
- `templates/wordpress-ci.yml` — модель «весь WP-инсталл в git, тема
  `wp-content/themes/<тема>`»: job **theme** (matrix ОС × php, composer +
  php-cs-fixer dry-run + тесты при наличии) и job **e2e** (ubuntu + Chromium:
  services mysql → wp-cli config create/core install → `php -S 127.0.0.1:8080`
  → `playwright test --project=chromium`). Локальные webkit-прогоны против
  дев-домена остаются дев-сценарием — в CI baseURL переопределяется env
  (`baseURL: process.env.WP_URL ?? …` в playwright.config.ts)

Копирование шаблона — в `.github/workflows/ci.yml` проекта; имена тем/доменов
анонимизировать (`<тема>`, `<wp-инсталл>` — правило воркспейса).

## Правила

1. **Коммиты и push — только вручную пользователем** (глобальные правила
   безопасности); агент готовит файлы и инструкции
2. «Зелёный CI» = все матрицы прошли; падение конкретной среды чинится
   итеративно (типовые: git в alpine-контейнере, pacman-key в arch)
3. CI-инструменты фиксируются в devDeps проекта (typescript), а не `npx -y`
   в workflow — детерминированность между прогонами

## Чек-лист зелёного прогона

- [ ] js-webgpu: 3 ОС + alpine/arch/fedora — все шесть чеков зелёные
- [ ] Воркспейс: intellisense-check (ubuntu обязателен), shellcheck, JSONC
- [ ] Новый проект из генератора: CI работает с первого пуша
- [ ] Шаблон Laravel/WP скопирован, плейсхолдеры заменены, прогоны зелёные

## See Also

- [js-standalone-root.md](js-standalone-root.md) — глобальная модель
  JS-корня: что в user settings, что в проекте
- [clean-problems-formatting.md](clean-problems-formatting.md) — матрица
  форматтеров «один на язык» (php-cs-fixer для CI Laravel/WP)
- [rust-senior-setup.md](rust-senior-setup.md) — глобальный Rust-сетап
  (та же философия «всё глобально» для другого стека)
