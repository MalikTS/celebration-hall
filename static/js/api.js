"use strict";
// Все запросы идут на Go-сервер, который отдает эти же страницы.
const API = {
  token() {
    return localStorage.getItem("ch_token");
  },
  clearSession() {
    localStorage.removeItem("ch_token");
    localStorage.removeItem("ch_username");
  },
  async request(path, { method = "GET", body, protectedRoute = false } = {}) {
    const headers = { Accept: "application/json" };
    if (body) headers["Content-Type"] = "application/json";
    if (protectedRoute && this.token())
      headers.Authorization = "Bearer " + this.token();
    let response;
    try {
      response = await fetch("/api" + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(
        "Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.",
      );
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages = {
        "invalid credentials": "Неверный логин или пароль.",
        "username already exists": "Этот логин уже занят. Выберите другой.",
        "event not found": "Мероприятие не найдено. Обновите страницу.",
        "no available capacity for this date":
          "На эту дату мест уже нет. Выберите другой день.",
      };
      if (response.status === 401 && protectedRoute) {
        this.clearSession();
        window.dispatchEvent(new Event("sessionchange"));
      }
      const error = new Error(
        messages[data.error] ||
          (response.status === 401 && protectedRoute
            ? "Сессия истекла. Войдите в аккаунт ещё раз."
            : response.status === 400
              ? "Проверьте заполненные поля и попробуйте ещё раз."
              : "Не удалось выполнить запрос. Попробуйте ещё раз."),
      );
      error.status = response.status;
      throw error;
    }
    return data;
  },
};
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function message(node, text, success = false) {
  node.textContent = text;
  node.className = "message " + (success ? "success" : "error");
}
function dateKey(date) {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}
function readableDate(value) {
  // Дата бронирования — календарный день, а не локальный момент времени.
  const day = value.slice(0, 10);
  return new Date(day + "T12:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function loginURL(next = location.pathname + location.search) {
  return "/static/login.html?next=" + encodeURIComponent(next);
}
