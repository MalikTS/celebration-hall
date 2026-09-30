# Celebration Hall

Fullstack-приложение для просмотра мероприятий дома торжеств и бронирования участия в них. Пользователь может просматривать доступные мероприятия, регистрироваться, авторизовываться и создавать бронирования на выбранную дату. Система контролирует вместимость: если место на мероприятие уже забронировано, повторное бронирование на ту же дату будет отклонено.

## Стек технологий

- **Backend:** Go, Gin
- **Frontend:** HTML, CSS, JavaScript
- **База данных:** SQLite
- **Аутентификация:** JWT

## Используемые библиотеки

| Библиотека | Назначение | Ссылка |
|---|---|---|
| Gin | HTTP-фреймворк для маршрутизации и обработки запросов | https://github.com/gin-gonic/gin |
| GORM | ORM для работы с базой данных | https://github.com/go-gorm/gorm |
| SQLite Driver (glebarez) | Драйвер SQLite на чистом Go без CGO | https://github.com/glebarez/sqlite |
| golang-jwt | Генерация и валидация JWT-токенов | https://github.com/golang-jwt/jwt |
| bcrypt | Хеширование паролей | https://golang.org/x/crypto |

## Установка и запуск

### Клонирование проекта

```bash
git clone https://github.com/MalikTS/celebration-hall.git
cd celebration-hall
```

### Установка зависимостей

```bash
go mod tidy
```

### Запуск сервера

```bash
go run main.go
```

После запуска сервер будет доступен по адресу:

```
http://localhost:8080
```

При первом запуске автоматически создаётся файл базы данных `database.db` и наполняется четырьмя тестовыми мероприятиями.

## API эндпоинты

### Публичные маршруты

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/register` | Регистрация нового пользователя |
| POST | `/api/login` | Авторизация и получение JWT-токена |
| GET | `/api/events` | Получить список всех мероприятий |
| GET | `/api/events/:id` | Получить информацию о конкретном мероприятии |

### Защищённые маршруты (требуется заголовок Authorization: Bearer TOKEN)

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/bookings` | Создать бронирование |
| GET | `/api/bookings/my` | Получить список бронирований текущего пользователя |

### Примеры тел запросов

**Регистрация:**

```json
{
    "username": "user1",
    "password": "1234"
}
```

**Авторизация:**

```json
{
    "username": "user1",
    "password": "1234"
}
```

**Создание бронирования:**

```json
{
    "event_id": 1,
    "full_name": "Иванов Иван Иванович",
    "phone": "+79991234567",
    "booking_date": "2026-10-29T00:00:00Z"
}
```

## Структура проекта

```
celebration-hall/
├── main.go
├── go.mod
├── go.sum
├── .gitignore
├── config/
│   └── config.go
├── models/
│   └── models.go
├── database/
│   └── database.go
├── handlers/
│   ├── auth.go
│   ├── events.go
│   └── bookings.go
├── middleware/
│   └── auth.go
└── static/
```
