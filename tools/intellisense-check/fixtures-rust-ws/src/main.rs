// Файл — якорная мишень кейсов R4 (suite-rust/workspace.test.js): идентификаторы
// mathlib::* ниже используются тестами — менять аккуратно. Сами якорные фрагменты
// в комментарий НЕ выписывать: indexOf найдёт их раньше кода.
use mathlib::double;

fn main() {
	let sum = mathlib::add(2, 3);
	let v = vec![mathlib::add(1, 1)];
	let doubled = double(sum);
	println!("sum={sum}, v={:?}, doubled={doubled}", v);
}
