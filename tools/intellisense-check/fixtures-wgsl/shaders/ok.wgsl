// Файл — якорная мишень кейса W2 (suite-wgsl/wgsl-analyzer.test.js): идентификатор
// make_red используется тестом — менять аккуратно. Якорные фрагменты в комментарий
// НЕ выписывать: indexOf найдёт их раньше кода.
fn make_red() -> vec4f {
    return vec4f(1.0, 0.2, 0.2, 1.0);
}

@vertex
fn vs_quad(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4f {
    let positions = array(
        vec2f(-0.5, -0.5),
        vec2f(0.5, -0.5),
        vec2f(0.0, 0.5),
    );
    return vec4f(positions[vertex_index], 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
    return make_red();
}
