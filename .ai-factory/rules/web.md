# Правила области: web

> Конвенции веб-трека (PHP/Laravel, Vue 3, WordPress, Bitrix). Загружается после rules/base.md.

## Rules

- PHP — PSR-12; табы ×2 через php-cs-fixer (`Config->setIndent("\t")`) или Laravel Pint (`indentation_type: true`); после `rector process` обязательно прогонять Pint
- Laravel — стандартная структура (`app/`, `routes/`, `resources/`), не изобретать свою; секреты только через `config()` + env, никогда хардкодом
- Blade — форматирование blade-formatter; IntelliSense (типы, хелперы, `@php…@endphp`) — phpantom; пути `@include`/`view()` — официальное Laravel LSP
- Vue 3 — Composition API + `<script setup>` + TypeScript; SFC — `PascalCase.vue`, composables — `useXxx`
- JavaScript — ES2022+; `console.*` только в dev-сборке
- CSS/PostCSS — классы `kebab-case` (или БЭМ в рамках проекта); Tailwind не используется
- WordPress — nonces на все формы/AJAX, sanitization входа + escaping выхода (`esc_html`/`esc_url`/`wp_kses_post`), capability checks перед привилегированными операциями, `$wpdb->prepare` для всех запросов
- Bitrix — покрывается общим PHP-стеком; сниппеты добавлять в `php.code-snippets`
- Отладка: PHP — Xdebug (только dev), JS — Chrome-дебаггер поверх Vite dev-server
