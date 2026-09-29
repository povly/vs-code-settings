#!/usr/bin/env bash
# new-rust-project.sh — каркас нового Rust-корня по глобальной модели воркспейса _vscode.
#
# Модель «всё глобально» (docs/rust-senior-setup.md): форматирование rustfmt (табы ×2),
# clippy на сохранении, Run/Debug-лензы, алиасы cargo, bacon, just — уже на машине;
# окружение подтверждает tools/rust-doctor.sh. В проект кладём только незаменимое:
#   Cargo.toml          — + шаблон-комментарий [workspace] members (для подкаталогов-крейтов)
#   rustfmt.toml        — CLI-паритет табов ×2 (cargo fmt без --config)
#   .editorconfig       — editorconfig не имеет fallback вне $HOME
#   .vscode/launch.json — F5-отладка CodeLLDB (kind-only: единственный [[bin]])
#   [--nightly] rust-toolchain.toml — пин канала проекта
#
# Самопроверка каркаса: cargo check + tools/rust-doctor.sh (если генератор запущен
# из воркспейса _vscode). Версии крейтов резолвит cargo add — пины не хардкодятся.
set -euo pipefail

usage() {
	cat >&2 <<-USAGE
	Использование: tools/new-rust-project.sh <каталог> [--bevy|--wgpu|--iced] [--nightly]
	  <каталог>  новый или пустой каталог (имя каталога = имя крейта)
	  --bevy     каркас Bevy-приложения (минимальный App + система Startup)
	  --wgpu     каркас winit + wgpu (+ shaders/triangle.wgsl, include_str)
	  --iced     каркас iced-приложения (окно с текстом)
	  --nightly  + rust-toolchain.toml с каналом nightly

	Флейворы взаимоисключающие. Модель global-first: редакторское поведение —
	в машинных user settings Code OSS (tools/machine/ в воркспейсе _vscode);
	rustfmt.toml здесь только для CLI-паритета табов ×2.
	USAGE
	exit 1
}

DIR=""
FLAVOR=""
NIGHTLY=0
for arg in "$@"; do
	case "$arg" in
	--bevy | --wgpu | --iced)
		if [ -n "$FLAVOR" ]; then
			usage
		fi
		FLAVOR="${arg#--}"
		;;
	--nightly) NIGHTLY=1 ;;
	-*) usage ;;
	*)
		if [ -n "$DIR" ]; then
			usage
		fi
		DIR="$arg"
		;;
	esac
done
[ -n "$DIR" ] || usage

NAME="$(basename "$DIR")"
if [ -e "$DIR" ] && [ -n "$(ls -A "$DIR")" ]; then
	printf 'ERROR [scaffold] каталог не пуст: %s\n' "$DIR" >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$DIR"
cd "$DIR"
log() { printf 'INFO  [scaffold] %s\n' "$*"; }
fail() { printf 'ERROR [scaffold] %s\n' "$*" >&2; exit 1; }

log "каталог: $DIR (крейт: $NAME, флейвор: ${FLAVOR:-plain})"

cargo init --quiet --edition 2024 --name "$NAME" .
log "Cargo.toml + src/main.rs + .gitignore (edition 2024)"

cat >> Cargo.toml <<'EOF'

# Подкаталоги-крейты? rust-analyzer индексирует только workspace-члены —
# при появлении подкаталога-крейта раскомментируй и допиши:
# [workspace]
# members = ["<подкаталог-крейт>"]
# (glob "*" запрещён: cargo требует Cargo.toml от каждого совпавшего каталога —
# см. docs/rust-navigation-fix.md в воркспейсе _vscode)
EOF
log "Cargo.toml: шаблон-комментарий [workspace] members"

printf 'hard_tabs = true\ntab_spaces = 2\n' > rustfmt.toml
log "rustfmt.toml — CLI-паритет табов ×2"

cat > .editorconfig <<'EOF'
# EditorConfig — источник правды для отступов (конвенция воркспейса _vscode)
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = tab
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

# JSON/YAML — пробелы (сырые табы в строках JSON запрещены)
[{*.json,*.jsonc,*.yml,*.yaml}]
indent_style = space
indent_size = 2

# WGSL — пробелы ×4: стиль фиксирован форматтером wgsl-analyzer (wgslfmt)
[*.wgsl]
indent_style = space
indent_size = 4

[Makefile]
indent_style = tab
EOF
log ".editorconfig — табы ×2, WGSL ×4, JSON — 2 пробела"

mkdir -p .vscode
cat > .vscode/launch.json <<'EOF'
{
  // CodeLLDB: единственный [[bin]] подхватывается автоматически (kind-only фильтр);
  // при нескольких [[bin]] вернуть "name": "<имя-бинаря>".
  // Альтернатива без конфига — Run/Debug-лензы rust-analyzer.
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Rust: отладка бинарника (cargo build, CodeLLDB)",
      "type": "lldb",
      "request": "launch",
      "cargo": {
        "args": ["build"],
        "filter": {
          "kind": "bin"
        }
      },
      "args": [],
      "cwd": "${workspaceFolder}"
    }
  ]
}
EOF
log ".vscode/launch.json — F5 (CodeLLDB, kind-only)"

if [ "$NIGHTLY" -eq 1 ]; then
	printf '[toolchain]\nchannel = "nightly"\n' > rust-toolchain.toml
	log "rust-toolchain.toml — nightly"
fi

case "$FLAVOR" in
bevy)
	cargo add --quiet bevy
	cat > src/main.rs <<'EOF'
use bevy::{log::info, prelude::*};

fn main() -> AppExit {
	App::new()
		.add_plugins(DefaultPlugins)
		.add_systems(Startup, hello)
		.run()
}

fn hello() {
	info!("bevy-каркас запущен");
}
EOF
	log "src/main.rs — минимальный App + система Startup"
	;;
wgpu)
	cargo add --quiet wgpu winit pollster log env_logger
	mkdir -p shaders
	cat > src/main.rs <<'EOF'
// WGSL живёт в .wgsl-файлах (аксиома воркспейса), не строками в Rust
const TRIANGLE_WGSL: &str = include_str!("../shaders/triangle.wgsl");

use winit::{
	event::{Event, WindowEvent},
	event_loop::EventLoop,
	window::WindowBuilder,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
	env_logger::init();
	log::info!("wgpu + winit: запрашиваем адаптер…");

	let event_loop = EventLoop::new()?;
	let _window = WindowBuilder::new()
		.with_title(concat!(env!("CARGO_PKG_NAME"), " — wgpu + winit"))
		.build(&event_loop)?;

	let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor::default());
	let adapter = pollster::block_on(instance.request_adapter(
		&wgpu::RequestAdapterOptions::default(),
	))?;
	let (device, _queue) =
		pollster::block_on(adapter.request_device(&wgpu::DeviceDescriptor::default()))?;
	let _shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
		label: Some("triangle.wgsl"),
		source: wgpu::ShaderSource::Wgsl(TRIANGLE_WGSL.into()),
	});
	log::info!("адаптер: {:?}", adapter.get_info());

	event_loop.run(|event, control_flow| {
		if let Event::WindowEvent {
			event: WindowEvent::CloseRequested,
			..
		} = event
		{
			control_flow.exit();
		}
	})?;
	Ok(())
}
EOF
	cat > shaders/triangle.wgsl <<'EOF'
// Минимальная пара vertex+fragment: позиции из @builtin(vertex_index),
// вершинный буфер не нужен
@vertex
fn vs(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4f {
    let positions = array(
        vec2f(0.0, 0.5),
        vec2f(-0.5, -0.5),
        vec2f(0.5, -0.5),
    );
    return vec4f(positions[vertex_index], 0.0, 1.0);
}

@fragment
fn fs() -> @location(0) vec4f {
    return vec4f(0.9, 0.4, 0.3, 1.0);
}
EOF
	log "src/main.rs + shaders/triangle.wgsl — окно, адаптер, шейдер-модуль"
	;;
iced)
	cargo add --quiet iced
	cat > src/main.rs <<'EOF'
use iced::{widget::text, Element};

#[derive(Default)]
struct App;

#[derive(Debug, Clone)]
enum Message {}

impl App {
	fn update(&mut self, _message: Message) {}

	fn view(&self) -> Element<'_, Message> {
		text(concat!(env!("CARGO_PKG_NAME"), " — iced")).into()
	}
}

fn main() -> iced::Result {
	iced::application(App::default, App::update, App::view)
		.title(|_app: &App| concat!(env!("CARGO_PKG_NAME"), " — iced").to_owned())
		.run()
}
EOF
	log "src/main.rs — окно iced (application + title, паттерн 0.14)"
	;;
esac

cargo fmt
log "cargo fmt — отступы приведены к табам ×2"

log "cargo check — самопроверка каркаса…"
cargo check --quiet || fail "cargo check не прошёл — вывод выше"
log "cargo check: PASS"

if [ -x "$SCRIPT_DIR/rust-doctor.sh" ]; then
	"$SCRIPT_DIR/rust-doctor.sh" "$PWD" || fail "rust-doctor нашёл проблемы окружения"
fi

log "готово: $DIR"
printf '\nДальше:\n\tcd %s\n\tcode-oss %s\n' "$DIR" "$DIR"
