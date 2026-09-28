/// Приветствие домашней страницы.
pub fn greet() -> &'static str {
	"home"
}

/// Заголовок домашней страницы.
pub fn title() -> &'static str {
	"Home"
}

/// Персональное приветствие пользователя.
pub fn greet_user(name: &str) -> String {
	format!("hello, {name}")
}

/// Сводка страницы (содержит якорь completion-теста R1).
pub fn dashboard() -> Vec<&'static str> {
	vec![greet(), title()]
}
