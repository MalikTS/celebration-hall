"use strict";
const page = document.body.dataset.page;
if (page === "events") initEvents();
if (page === "bookings") initBookings();

async function initEvents() {
  const list = document.getElementById("events");
  const form = document.getElementById("booking-form");
  const fields = document.getElementById("booking-fields");
  const feedback = document.getElementById("booking-message");
  const submit = document.getElementById("book-button");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let month = new Date(today.getFullYear(), today.getMonth(), 1);
  let selected = null;
  let chosenDate = "";
  let busy = false;
  let selectionVersion = 0;
  let availabilityVersion = 0;
  let availabilityReady = false;
  let bookedDates = new Set();
  const availabilityStatus = document.getElementById("availability-status");
  const availabilityRetry = document.getElementById("availability-retry");

  async function loadAvailability() {
    if (!selected) return;
    const version = ++availabilityVersion;
    const eventID = selected.id;
    const monthKey = dateKey(month).slice(0, 7);
    availabilityReady = false;
    bookedDates = new Set();
    availabilityRetry.hidden = true;
    availabilityStatus.textContent = "Проверяем занятость дат…";
    document.getElementById("calendar-days").setAttribute("aria-busy", "true");
    renderCalendar();
    try {
      const data = await API.request("/events/" + eventID + "/availability?month=" + monthKey);
      if (version !== availabilityVersion) return;
      bookedDates = new Set(data.booked_dates);
      availabilityReady = true;
      if (bookedDates.has(chosenDate)) {
        chosenDate = "";
        availabilityStatus.textContent = "Выбранная дата уже занята. Выберите другой день.";
      } else {
        availabilityStatus.textContent = "Занятые даты недоступны для выбора.";
      }
    } catch {
      if (version !== availabilityVersion) return;
      availabilityStatus.textContent = "Не удалось проверить даты. Повторите загрузку.";
      availabilityRetry.hidden = false;
    } finally {
      if (version === availabilityVersion) {
        document.getElementById("calendar-days").setAttribute("aria-busy", "false");
        renderCalendar();
      }
    }
  }
  availabilityRetry.addEventListener("click", loadAvailability);
  window.addEventListener("focus", () => {
    if (selected && !busy) loadAvailability();
  });
  const params = new URLSearchParams(location.search);
  const initialDate = params.get("date") || "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
    const parsed = new Date(initialDate + "T12:00:00");
    if (
      !Number.isNaN(parsed.getTime()) &&
      dateKey(parsed) === initialDate &&
      initialDate >= dateKey(today)
    ) {
      chosenDate = initialDate;
      month = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
  }
  function updateAuth() {
    submit.textContent = API.token()
      ? "Забронировать ↗"
      : "Войти и забронировать ↗";
    document.getElementById("login-hint").textContent = API.token()
      ? ""
      : "Для бронирования понадобится аккаунт.";
  }
  updateAuth();
  window.addEventListener("sessionchange", updateAuth);
  function renderCalendar() {
    submit.disabled = busy || !selected || !availabilityReady;
    document.getElementById("calendar-title").textContent =
      month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    const previous = document.getElementById("previous-month");
    previous.disabled =
      month.getFullYear() === today.getFullYear() &&
      month.getMonth() === today.getMonth();
    const grid = document.getElementById("calendar-days");
    grid.replaceChildren();
    const offset = (month.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) grid.append(el("span"));
    const days = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    for (let i = 1; i <= days; i++) {
      const date = new Date(month.getFullYear(), month.getMonth(), i);
      const key = dateKey(date);
      const button = el("button", "day", String(i));
      button.type = "button";
      const booked = bookedDates.has(key);
      button.disabled = key < dateKey(today) || booked || !availabilityReady;
      button.classList.toggle("booked", booked);
      if (booked) button.title = "Занято";

      button.classList.toggle("today", key === dateKey(today));
      button.setAttribute("aria-label", readableDate(key) + (booked ? " — занято" : ""));
      button.setAttribute("aria-pressed", String(key === chosenDate));
      if (key === dateKey(today)) button.setAttribute("aria-current", "date");
      button.addEventListener("click", () => {
        chosenDate = key;
        feedback.textContent = "";
        document.getElementById("booking-success").hidden = true;
        renderCalendar();
        document.querySelector('.day[aria-pressed="true"]').focus();
      });
      grid.append(button);
    }
    document.getElementById("selected-date").textContent = chosenDate
      ? "Выбрано: " + readableDate(chosenDate)
      : "Выберите день в календаре";
  }
  document.getElementById("previous-month").addEventListener("click", () => {
    month.setMonth(month.getMonth() - 1);
    chosenDate = "";
    loadAvailability();
  });
  document.getElementById("next-month").addEventListener("click", () => {
    month.setMonth(month.getMonth() + 1);
    chosenDate = "";
    loadAvailability();
  });
  renderCalendar();

  async function selectEvent(id) {
    if (busy) return;
    const version = ++selectionVersion;
    selected = null;
    ++availabilityVersion;
    availabilityReady = false;
    bookedDates = new Set();
    renderCalendar();
    fields.disabled = true;
    feedback.textContent = "";
    document.getElementById("booking-success").hidden = true;
    const detail = document.getElementById("selected-event");
    detail.textContent = "Загружаем информацию…";
    list
      .querySelectorAll(".event-card")
      .forEach((card) =>
        card.classList.toggle("selected", Number(card.dataset.id) === id),
      );
    list.querySelectorAll(".choose-event").forEach((button) => {
      const active = Number(button.dataset.id) === id;
      button.textContent = active ? "Выбрано ✓" : "Выбрать мероприятие →";
      button.setAttribute("aria-pressed", String(active));
    });
    try {
      const event = await API.request("/events/" + id);
      if (version !== selectionVersion) return;
      selected = event;
      detail.replaceChildren(
        el("h3", "", event.title),
        el("p", "muted", event.description),
      );
      fields.disabled = false;
      await loadAvailability();
    } catch (error) {
      if (version !== selectionVersion) return;
      detail.textContent = "Выберите мероприятие ещё раз.";
      message(feedback, error.message);
    }
  }

  async function loadEvents() {
    list.replaceChildren(el("p", "notice", "Загружаем мероприятия…"));
    try {
      const events = await API.request("/events");
      list.replaceChildren();
      if (!events || !events.length) {
        list.append(
          el("p", "notice", "Пока нет мероприятий. Загляните позже."),
        );
        return;
      }
      document.getElementById("event-count").textContent =
        "Всего: " + events.length;
      events.forEach((event, index) => {
        const card = el("article", "event-card");
        card.dataset.id = event.id;
        const top = el("div", "event-card-top");
        top.append(
          el("span", "event-number", String(index + 1).padStart(2, "0")),
          el("span", "event-symbol", ["✧", "✺", "◇", "✦"][index % 4]),
        );
        const button = el("button", "choose-event", "Выбрать мероприятие →");
        button.type = "button";
        button.dataset.id = event.id;
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", "Выбрать: " + event.title);
        button.addEventListener("click", () => selectEvent(event.id));
        card.append(
          top,
          el("h3", "", event.title),
          el("p", "event-description", event.description),
        );
        if (event.date && !Number.isNaN(Date.parse(event.date)))
          card.append(
            el(
              "p",
              "event-meta",
              "Дата в программе: " + readableDate(event.date),
            ),
          );
        card.append(button);
        list.append(card);
      });
      const requested = events.find(
        (event) => event.id === Number(params.get("event")),
      );
      await selectEvent((requested || events[0]).id);
    } catch (error) {
      list.replaceChildren(el("p", "message error", error.message));
      const retry = el("button", "button secondary", "Попробовать ещё раз");
      retry.addEventListener("click", loadEvents);
      list.append(retry);
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !selected || !availabilityReady) return;
    if (!chosenDate || chosenDate < dateKey(new Date()) || bookedDates.has(chosenDate)) {
      message(feedback, "Выберите сегодняшнюю или будущую дату в календаре.");
      return;
    }
    if (!API.token()) {
      location.assign(
        loginURL("/?event=" + selected.id + "&date=" + chosenDate),
      );
      return;
    }
    const fullName = form.elements.full_name.value.trim();
    const phone = form.elements.phone.value.trim();
    if (!fullName) return message(feedback, "Введите ФИО.");
    if (
      !/^[+\d\s()-]+$/.test(phone) ||
      phone.replace(/\D/g, "").length < 10 ||
      phone.replace(/\D/g, "").length > 15
    )
      return message(
        feedback,
        "Введите телефон: от 10 до 15 цифр, например +7 999 123-45-67.",
      );
    busy = true;
    fields.disabled = true;
    list
      .querySelectorAll("button")
      .forEach((button) => (button.disabled = true));
    submit.textContent = "Бронируем…";
    feedback.textContent = "";
    document.getElementById("booking-success").hidden = true;
    try {
      const booking = await API.request("/bookings", {
        method: "POST",
        protectedRoute: true,
        body: {
          event_id: selected.id,
          full_name: fullName,
          phone,
          booking_date: chosenDate + "T00:00:00Z",
        },
      });
      message(
        feedback,
        "Бронирование №" +
          booking.id +
          " создано на " +
          readableDate(chosenDate) +
          ".",
        true,
      );
      document.getElementById("booking-success").hidden = false;
      chosenDate = "";
      await loadAvailability();
    } catch (error) {
      message(feedback, error.message);
      if (error.status === 409) {
        chosenDate = "";
        await loadAvailability();
      }
      if (error.status === 401) {
        const link = el("a", "text-link", " Войти в аккаунт →");
        link.href = loginURL("/?event=" + selected.id + "&date=" + chosenDate);
        feedback.append(link);
      }
    } finally {
      busy = false;
      fields.disabled = false;
      list
        .querySelectorAll("button")
        .forEach((button) => (button.disabled = false));
      updateAuth();
      renderCalendar();
    }
  });
  await loadEvents();
}

async function initBookings() {
  const list = document.getElementById("bookings");
  function loginState(text) {
    const state = el("div", "empty-state");
    const link = el("a", "button primary", "Войти в аккаунт →");
    link.href = loginURL("/static/bookings.html");
    state.append(
      el("span", "empty-symbol", "◇"),
      el("h2", "", "Ваши бронирования здесь"),
      el("p", "muted", text),
      link,
    );
    list.replaceChildren(state);
  }
  if (!API.token()) {
    loginState("Войдите, чтобы увидеть забронированные мероприятия.");
    return;
  }
  try {
    const bookings = await API.request("/bookings/my", {
      protectedRoute: true,
    });
    list.replaceChildren();
    if (!bookings || !bookings.length) {
      const state = el("div", "empty-state");
      const link = el("a", "button primary", "Выбрать мероприятие →");
      link.href = "/";
      state.append(
        el("span", "empty-symbol", "✧"),
        el("h2", "", "Пока нет бронирований"),
        el(
          "p",
          "muted",
          "Выберите событие и удобную дату — здесь появятся его детали.",
        ),
        link,
      );
      list.append(state);
      return;
    }
    bookings.sort((a, b) => b.booking_date.localeCompare(a.booking_date));
    bookings.forEach((booking) => {
      const card = el("article", "booking-card");
      const date = new Date(booking.booking_date.slice(0, 10) + "T12:00:00");
      const tile = el("div", "date-tile");
      tile.append(
        el("strong", "", String(date.getDate())),
        el(
          "span",
          "",
          date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" }),
        ),
      );
      const content = el("div", "booking-info");
      content.append(
        el("p", "eyebrow", "БРОНИРОВАНИЕ №" + booking.id),
        el(
          "h2",
          "",
          booking.event?.title || "Мероприятие №" + booking.event_id,
        ),
        el("p", "muted", readableDate(booking.booking_date)),
      );
      const contacts = el("div", "booking-contacts");
      contacts.append(
        el("p", "", booking.full_name),
        el("p", "muted", booking.phone),
      );
      const past = booking.booking_date.slice(0, 10) < dateKey(new Date());
      card.append(
        tile,
        content,
        contacts,
        el(
          "span",
          "badge" + (past ? " past" : ""),
          past ? "Дата прошла" : "Забронировано",
        ),
      );
      list.append(card);
    });
  } catch (error) {
    if (error.status === 401) return loginState(error.message);
    list.replaceChildren(el("p", "message error", error.message));
    const retry = el("button", "button secondary", "Попробовать ещё раз");
    retry.addEventListener("click", () => {
      list.replaceChildren(el("p", "notice", "Загружаем…"));
      initBookings();
    });
    list.append(retry);
  }
}
