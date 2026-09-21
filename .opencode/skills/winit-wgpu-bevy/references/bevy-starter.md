# Bevy: стартовый каркас

## Зависимости

```toml
[dependencies]
bevy = "0.19" # проверить актуальную: cargo search bevy / crates-расширение
```

## Дев-профиль (быстрая пересборка — критично для Bevy)

```toml
[profile.dev]
opt-level = 1

[profile.dev.package."*"]
opt-level = 3
```

Альтернатива для частых итераций: `cargo build` с фичей `dynamic_linking`
(только для dev, НЕ для release):

```bash
cargo run --features bevy/dynamic_linking
```

## Каркас приложения (ECS)

```rust
use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_systems(Startup, setup)
        .add_systems(Update, (movement, color_pulse))
        .run();
}

fn setup(mut commands: Commands) {
    commands.spawn(Camera2d);
    commands.spawn((
        Sprite::from_color(Color::srgb(0.3, 0.7, 0.9), Vec2::splat(80.0)),
        Transform::from_translation(Vec3::new(0.0, 0.0, 0.0)),
    ));
}

fn movement(
    time: Res<Time>,
    keys: Res<ButtonInput<KeyCode>>,
    mut query: Query<&mut Transform, With<Sprite>>,
) {
    for mut transform in &mut query {
        if keys.pressed(KeyCode::ArrowRight) {
            transform.translation.x += 200.0 * time.delta_secs();
        }
    }
}

fn color_pulse(mut query: Query<&mut Sprite>) {
    for mut sprite in &mut query {
        // анимация цвета/размера
    }
}
```

## ECS-шпаргалка

| Понятие | Как | Префикс сниппета |
|---|---|---|
| Компонент | `#[derive(Component)] pub struct Name;` | `bcomp` |
| Ресурс | `#[derive(Resource)] pub struct X { pub field: f32 }` | `bres` |
| Событие | `#[derive(Event)] pub struct X;` | `bevent` |
| Система | функция с параметрами `Commands`, `Res`, `Query` | `bsys`, `bsysq` |
| Плагин | `impl Plugin for XPlugin { fn build(&self, app: &mut App) }` | `bplugin` |
| Каркас App | `App::new().add_plugins(...)` | `bapp` |

## Правила

- Независимость движения от FPS: всегда умножать на `time.delta_secs()`
- Конфликты заимствований в системах: разбивать на несколько систем или
  использовать `Query<&mut A>` + отдельный `Query<&B>` (пара мутабельных
  запросов к одному компоненту в одной системе не компилируется)
- Ресурсы: bevy.org/learn/book, Migration Guide между версиями Bevy
