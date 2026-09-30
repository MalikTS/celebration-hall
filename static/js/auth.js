"use strict";
function renderAccount() {
  const account = document.getElementById("account");
  account.replaceChildren();
  if (API.token()) {
    account.append(
      el(
        "span",
        "account-name",
        localStorage.getItem("ch_username") || "Личный кабинет",
      ),
    );
    const logout = el("button", "button secondary small", "Выйти");
    logout.type = "button";
    logout.addEventListener("click", () => {
      API.clearSession();
      location.assign("/");
    });
    account.append(logout);
  } else {
    const link = el("a", "button secondary small", "Войти ↗");
    link.href = loginURL();
    account.append(link);
  }
}
renderAccount();
window.addEventListener("sessionchange", renderAccount);
if (document.body.dataset.page === "login") {
  const form = document.getElementById("auth-form");
  const submit = document.getElementById("auth-submit");
  const password = document.getElementById("password");
  const feedback = document.getElementById("auth-message");
  let registering = false;
  let busy = false;
  const tabs = [
    document.getElementById("login-tab"),
    document.getElementById("register-tab"),
  ];
  tabs.forEach((tab, index) =>
    tab.addEventListener("click", () => {
      if (busy) return;
      registering = index === 1;
      tabs.forEach((item, i) =>
        item.setAttribute("aria-pressed", String(i === index)),
      );
      document.getElementById("auth-title").textContent = registering
        ? "Создать аккаунт"
        : "С возвращением";
      document.getElementById("auth-description").textContent = registering
        ? "Придумайте логин и пароль для бронирований."
        : "Введите логин и пароль своего аккаунта.";
      document.getElementById("password-hint").hidden = !registering;
      password.autocomplete = registering ? "new-password" : "current-password";
      password.minLength = registering ? 4 : 1;
      submit.textContent = registering ? "Зарегистрироваться →" : "Войти →";
      feedback.textContent = "";
    }),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const username = form.elements.username.value.trim();
    if (!username) return message(feedback, "Введите логин.");
    if (registering && new TextEncoder().encode(password.value).length > 72)
      return message(
        feedback,
        "Пароль слишком длинный. Используйте не более 72 байт.",
      );
    busy = true;
    submit.disabled = true;
    tabs.forEach((tab) => (tab.disabled = true));
    submit.textContent = "Подождите…";
    feedback.textContent = "";
    try {
      const data = await API.request(registering ? "/register" : "/login", {
        method: "POST",
        body: { username, password: password.value },
      });
      localStorage.setItem("ch_token", data.token);
      localStorage.setItem("ch_username", data.username);
      const next = new URLSearchParams(location.search).get("next") || "/";
      const target = new URL(next, location.origin);
      location.assign(
        target.origin === location.origin &&
          ["/", "/static/index.html", "/static/bookings.html"].includes(
            target.pathname,
          )
          ? target.pathname + target.search
          : "/",
      );
    } catch (error) {
      message(feedback, error.message);
    } finally {
      busy = false;
      submit.disabled = false;
      tabs.forEach((tab) => (tab.disabled = false));
      submit.textContent = registering ? "Зарегистрироваться →" : "Войти →";
    }
  });
}
