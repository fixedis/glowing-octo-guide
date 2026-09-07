<!-- Docs/Engines/NetworkEngine.md -->

# Документация NetworkEngine (v0.1.0)

Сетевой фасад CoreEngine. Подключается через манифест
`src/Engines/NetworkEngine/Config/engine.manifest.json` и реализует
`Project\CoreEngine\Contracts\RegistrableEngineInterface`.

Философия: NetworkEngine — **чистый транспортный слой**. Он не содержит
игровой логики, не знает про генерацию вселенной или экономику. Его задача —
маршрутизировать внешние HTTP-запросы на команды ядра через `CommandBus`
и давать read-only доступ к состоянию. Заменяет встроенный HTTP-слой
`UniverseEngine/Presentation` (закрыт техдолг из `architecture.md`).

---

## 1. Ответственность движка

| Что делает | Что НЕ делает |
|---|---|
| Универсальный HTTP-фасад `/api/v1/*` | Игровую логику / генерацию |
| Маршрутизацию запросов на команды ядра | Рендеринг / графику |
| Read-only чтение State (`/state`) | Прямое изменение состояния |
| Серверную авторизацию admin-команд | Клиентскую валидацию прав |
| Обратную совместимость со старыми route'ами | Хранение UI-состояния |

---

## 2. Структура модуля

```text
src/Engines/NetworkEngine/
    NetworkEngine.php                         # класс движка + фабрика роутера
    Config/engine.manifest.json
    Presentation/
        NetworkRouter.php                     # универсальный роутер
        HttpRequest.php                       # абстракция запроса
        HttpResponse.php                      # JSON-ответ + send()
```

---

## 3. Эндпоинты

### GET /api/v1/health
Список зарегистрированных движков с версиями.

### POST /api/v1/command
Универсальная точка входа для любой команды ядра.
Тело: `{ "type": "CommandType", "payload": { ... } }`.
Ответ: `{ "data": <payload первого события>, "meta": { "command", "tick" } }`.
Ошибки: 400 (плохой запрос), 422 (команда отклонена), 403 (auth admin).

### GET /api/v1/state?key=...
Read-only чтение State по ключу. 404 если ключ отсутствует.

### Обратная совместимость (старые route'ы Universe/Nanite)
- `GET /api/v1/universe/galaxies?seed&cx&cy&cz`
- `GET /api/v1/galaxies/{seed}/systems?radius`
- `GET /api/v1/systems/{seed}/planets?count`
- `GET /api/v1/planets/{seed}/colony?face&depth&x&y&size`
- `POST /api/v1/planets/{seed}/colony/place`
- `POST /api/v1/planets/{seed}/colony/demolish`
- `POST /api/v1/nanite/frame`

Все маппятся на те же команды ядра через универсальный `dispatch()`.

---

## 4. Серверная авторизация

Если при запуске задан env `ADMIN_TOKEN`, команды с префиксом `Admin`
(например, будущие `AdminSpawnPlanet`, `AdminSetGodMode`) требуют заголовок
`X-Admin-Token`, совпадающий с токеном. Без `ADMIN_TOKEN` auth отключён
(dev-режим). Проверка **на сервере** — клиенту нельзя доверять флаг «я админ».

Логика в `NetworkRouter::authorizeAdmin()`:
- `adminToken === null` → доступ всегда разрешён;
- команда без префикса `Admin` → разрешёнa;
- команда с префиксом `Admin` → требуется `X-Admin-Token === adminToken`.

---

## 5. Интеграция с ядром

`public/index.php` создаёт рантайм, затем вызывает
`NetworkEngine::createRouter($services, $logger, $adminToken)` и передаёт
ему `HttpRequest::fromGlobals()`. Универсальный фасад позволяет клиенту
шлить любую команду (включая будущие Admin-команды) без изменения роутера.

---

## 6. Покрытие тестами

`tests/Engines/NetworkEngine/NetworkRouterTest.php`:
- health со всеми 5 движками (admin, economy, nanite, network, universe);
- universal command dispatch;
- валидация command (missing type);
- state read (unknown key, missing key);
- auth: admin-команда без токена → 403;
- auth: admin-команда с токеном → пропущена;
- auth отключён без `ADMIN_TOKEN`.

Также `tests/CoreEngine/KernelTimeControlTest.php` покрывает добавленные
в ядро методы `pause/resume/step/setSpeed/isPaused/getSpeed`.
