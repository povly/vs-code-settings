# Кража фокуса при переключении языка (KDE Plasma 6.7 Wayland)

> Рецепт «симптом → диагностика → фикс»: Alt+Shift (переключение раскладки) отбирал
> фокус ввода у активного окна. Оказались задействованы **два независимых механизма** —
> OSD-поверхность plasmashell (все приложения) и Alt-меню-бар Code OSS (Electron).
> Чек после фикса: `tools/lang-switch-doctor.sh` (PASS 5/5).

## Симптом

- Alt+Shift переключает раскладку (us ↔ ru), но активное окно **теряет фокус ввода**:
  набор прерывается, приходится кликать обратно.
- В Code OSS — свой вариант: фокус уходил в меню-бар (панель **File**), лечилось только ESC.

## Окружение (на момент фикса)

| Параметр | Значение |
|---|---|
| Plasma / kwin | 6.7.5, сессия **Wayland** |
| Раскладки | `us,ru`, локаль `ru_RU.UTF-8` |
| Переключение | XKB-опция **`grp:alt_shift_toggle`** (`localectl` → `/etc/X11/xorg.conf.d/00-keyboard.conf`) |
| KDE-раскладки | не настроены (`kxkbrc` пуст — systemsettings Keyboard → Layouts ни разу не включались) |

## Механизм №1 — OSD раскладки в plasmashell (все приложения)

Цепочка (доказана по исходникам kwin 6.7 / plasma-workspace):

1. Смена раскладки (любой способ — XKB-тоггл, DBus, апплет) → плагин kwin `KeyboardLayout`
   **безусловно** шлёт DBus-вызов
   `org.kde.plasmashell /org/kde/osdService org.kde.osdService.kbdLayoutChanged`
   (`kwin src/keyboard_layout.cpp`, `notifyLayoutChange()` — гейта в kwin нет).
2. plasmashell показывает OSD-окно «Russian / English» (QML-поверхность).
3. На Wayland эта поверхность получает **keyboard focus** → активное окно теряет ввод.

Гейт OSD — на стороне plasmashell (`plasma-workspace shell/osd.cpp`):

```cpp
void Osd::kbdLayoutChanged(const QString &layoutName)
{
    if (m_osdConfigGroup.readEntry("kbdLayoutChangedEnabled", true)) {
        showText(u"keyboard-layout"_s, layoutName);
    }
}
```

`Osd` создаётся в `ShellCorona::init()` c `KSharedConfig::openConfig("plasmarc")` →
ключ живёт в **`~/.config/plasmarc`**, группа `[OSD]`, и применяется **на лету**
(KConfigWatcher) — без перезапуска сессии.

Семейство багов: [KDE 479084](https://bugs.kde.org/show_bug.cgi?id=479084)
(widget активирует панель-родителя; FIXED 6.0.3; дубликаты 483235, 482653, 483928,
484339, 484417), [KDE 483670](https://bugs.kde.org/show_bug.cgi?id=483670)
(shortcut смены раскладки теряет фокус; WORKSFORME),
[r/kde 1b8srmh](https://www.reddit.com/r/kde/comments/1b8srmh/window_loses_focus_when_keyboard_layout_changes/)
(фокус уходит панели в момент OSD).

## Механизм №2 — Alt-меню-бар Code OSS (Electron)

Проявляется только в приложениях с видимым классическим меню-баром (Code OSS —
`window.menuBarVisibility: "classic"`, дефолт на Linux):

- Обе клавиши Alt+Shift проходят в приложение (XKB-тоггл лишь параллельно меняет группу).
- Если Alt отпускается **последним** (обычный порядок при быстром тоггле), Electron видит
  одиночный Alt-up → активирует меню-бар «File» → фокус уходит в меню, нужен ESC.
- kwin-диагностика это **не ловит** — фокус теряется *внутри* окна (active window не меняется).
- Классика жанра: [askubuntu 1178533](https://askubuntu.com/questions/1178533/skype-loses-focus-when-changing-keyboard-layout-with-altshift) (Skype + gnome-tweak Alt+Shift — тот же эффект).

## Диагностика (живая сессия)

```bash
# Базлайн: механизм переключения + состояние ключей
localectl status | grep -E 'Layout|Options'
kreadconfig6 --file plasmarc --group OSD --key kbdLayoutChangedEnabled   # до фикса: пусто = default true
kreadconfig6 --file kxkbrc --group Layout --key Use                      # пусто = KDE-раскладки не настроены

# Активное окно глазами kwin (плазма-поверхности видит, kdotool — нет)
qdbus6 org.kde.KWin /KWin org.kde.KWin.queryWindowInfo | grep -E '^resourceClass'

# Принудительный OSD без переключения раскладки (проба поверхности-воровки)
qdbus6 org.kde.plasmashell /org/kde/osdService org.kde.osdService.kbdLayoutChanged "Russian"

# Реальная смена раскладки через DBus (правильный интерфейс — org.kde.KeyboardLayouts)
qdbus6 org.kde.keyboard /Layouts org.kde.KeyboardLayouts.getLayout
qdbus6 org.kde.keyboard /Layouts org.kde.KeyboardLayouts.setLayout 1   # 0 = us, 1 = ru
```

Evidence из сессии фикса (30.09.2026): в baseline kwin сообщал активным окном
`plasmashell` при живой работе пользователя — фокус был «застрявшим» в плазме.
После фикса (оба) — active window стабильно `chromium` до/после принудительного OSD
и смен раскладки через DBus.

## Фикс

### №1 — отключить OSD раскладки (точечно, на лету)

```bash
kwriteconfig6 --file plasmarc --group OSD --key kbdLayoutChangedEnabled --type bool false
```

- Отключает **только** OSD смены раскладки; OSD громкости/яркости не трогает
  (глобальный `Enabled=false` в той же группе НЕ используем — он гасит всё).
- XKB-тоггл продолжает работать — переключение раскладок живёт в ядре ввода kwin
  (`Xkb`), а не в OSD.
- Откат (например, после апстрим-фикса): та же команда с `--type bool true`.

### №2 — Code OSS: компакт-меню (машинные user settings, global-first)

`~/.config/Code - OSS/User/settings.json`:

```jsonc
"window.menuBarVisibility": "compact",
```

- Меню остаётся (кнопка в титлбаре), но Alt больше нечего активировать.
- Не `toggle`: в нём Alt как раз показывает/прячет меню — конфликт остался бы.
- После правки — переэкспорт снимка (анти-дрейф): `tools/machine/export-user-settings.sh`.

## Верификация

1. Alt+Shift в окне (терминал/браузер): раскладка меняется, фокус сохраняется, набор не прерывается.
2. Alt+Shift в Code OSS: меню-бар не открывается, ESC не нужен.
3. OSD громкости по клавишам звука — появляется как раньше.
4. `tools/lang-switch-doctor.sh` → exit 0 (PASS: сессия, grp-опция, оба фикса, plasmashell).

## Fallback (если кража фокуса вернётся)

Порядок эскалации (проверять после каждого шага):

1. **Апплет Keyboard Layout в трее** — обновление иконки на смену раскладки может
   активировать панель (баг-семейство 479084). Проверка:
   `grep -c keyboardlayout ~/.config/plasma-org.kde.plasma.desktop-appletsrc`.
   Убрать: правый клик по панели → «Добавить виджеты» → убрать keyboard layout
   (или вычеркнуть из `extraItems` в конфиге системного трея).
2. **Плагин kwin keyboardlayout** (гасит OSD-DBus, апплет и org.kde.keyboard разом):

   ```bash
   kwriteconfig6 --file kwinrc --group Plugins --key keyboardlayoutEnabled false
   qdbus6 org.kde.KWin /KWin reconfigure
   ```

   Обязательно проверить, что Alt+Shift продолжает переключать раскладку
   (XKB-тоггл должен выжить — он в ядре ввода). Откат: `--key keyboardlayoutEnabled --delete` + reconfigure.
3. **Смена тоггла на не-Alt** (`grp:shifts_toggle` — два Shift, `localectl set-x11-keymap us,ru "" grp:shifts_toggle`):
   лечит Alt-меню во ВСЕХ приложениях, но меняет привычку Alt+Shift.

## Честные ограничения

- OSD-плашка с названием раскладки больше не показывается — это и была поверхность-воровка.
  Индикация текущей раскладки остаётся в трее (апплет) — если он добавлен.
- Механизм №2 специфичен для приложений с классическим меню-баром; `compact` закрывает
  Code OSS, а другие Electron/GTK-приложения с меню (если появятся) — через fallback №3.
- Живое «фокус крадётся/не крадётся» автоматически не измерить (для kwin активное окно не
  меняется, когда фокус теряется внутри приложения) — финальная проба всегда ручная.

## See Also

- `tools/lang-switch-doctor.sh` — PASS/FAIL чек обоих фиксов
- [tools/machine/README.md](../tools/machine/README.md) — регламент анти-дрейфа снимка user settings
- План-артефакт: `.ai-factory/plans/kde-lang-switch-focus-fix.md` (исследование с исходниками kwin/plasma-workspace)
