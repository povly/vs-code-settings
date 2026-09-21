# wgpu + winit: стартовый каркас

## Зависимости (Cargo.toml)

```toml
[dependencies]
winit = "0.30"
wgpu = "27"
pollster = "0.4"          # блокирующий раннер для асинхронного init
bytemuck = { version = "1", features = ["derive"] }
```

(Проверить актуальные версии: `cargo search wgpu` / расширение crates.)

## Каркас приложения

```rust
use winit::{
    event::{Event, WindowEvent},
    event_loop::EventLoop,
    window::Window,
};

fn main() {
    let event_loop = EventLoop::new().unwrap();
    let window = Window::new(&event_loop).unwrap();

    pollster::block_on(init_gpu(&window)); // поверхность, адаптер, устройство

    event_loop.run(move |event, control_flow| match event {
        Event::WindowEvent { event: WindowEvent::CloseRequested, .. } => {
            control_flow.exit();
        }
        Event::AboutToWait => {
            // request_redraw() при необходимости перерисовки
        }
        Event::WindowEvent { event: WindowEvent::RedrawRequested, .. } => {
            // рендер-кадр: encoder -> render_pass -> queue.submit + present
        }
        _ => {}
    })
    .unwrap();
}

async fn init_gpu(window: &Window) {
    let instance = wgpu::Instance::default();
    let surface = instance.create_surface(window).unwrap();
    let adapter = instance
        .request_adapter(&wgpu::RequestAdapterOptions {
            compatible_surface: Some(&surface),
            ..Default::default()
        })
        .await
        .expect("нет подходящего GPU-адаптера");
    let (device, queue) = adapter
        .request_device(&wgpu::DeviceDescriptor::default(), None)
        .await
        .unwrap();
    // далее: конфигурация поверхности, пайплайн, буферы
}
```

## Минимальный WGSL (шейдер)

```wgsl
@vertex
fn vs_main(@location(0) in_pos: vec3<f32>) -> @builtin(position) vec4<f32> {
    return vec4<f32>(in_pos, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(0.2, 0.4, 0.9, 1.0);
}
```

Загрузка: `device.create_shader_module(wgpu::include_wgsl!("./shader.wgsl"))`.

## Vertex-буфер

```rust
#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct Vertex {
    position: [f32; 3],
    color: [f32; 3],
}
```

## Замечания

- Сниппеты: `vs`, `fs`, `cbuf`, `texb` в `wgsl.code-snippets`
- Отладка: CodeLLDB (launch.json)
- Ресурсы: wgpu book (sotrh/learn-wgpu), docs.rs/wgpu, winit docs
