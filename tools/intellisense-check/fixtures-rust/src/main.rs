// Фикстура регрессии rust-analyzer: модульная система одного крейта.
// Регрессия (история <rust-проект>): файлы src/pages/** вне дерева крейта
// (lib.rs в подкаталоге без mod-декларации в корне) не дают
// completion/hover/definition — «file is not included in any crate».
mod pages;

fn main() {
	let greeting = pages::home::greet();
	let user = pages::home::greet_user("fixture");
	let panel = pages::home::dashboard();
	println!("{greeting} / {user} / {panel:?}");
}
