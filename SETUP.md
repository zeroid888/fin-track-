# Как запустить «Мои финансы» на iPhone

Два пути. **Сделай сначала вариант 1** — это 15 минут работы и ты получишь
рабочее приложение на телефоне. Потом, если захочешь «настоящий» app в Xcode —
делай вариант 2.

---

## Вариант 1. GitHub Pages + PWA (быстро, без Xcode)

Результат: иконка «Финансы» на экране Домой iPhone, работает офлайн,
хостинг бесплатный навсегда.

### 1.1. Зарегистрируй аккаунт GitHub (если нет)

https://github.com/signup — достаточно почты и пароля. Имя пользователя запомни,
оно войдёт в адрес сайта.

### 1.2. Создай репозиторий

На github.com → зелёная кнопка **New** → заполни:
- Repository name: `fin-track` (или любое другое)
- **Public** (обязательно — для бесплатного GitHub Pages)
- **НЕ** ставь галочки «Add README», «Add .gitignore» — у нас уже всё есть
- **Create repository**

### 1.3. Привяжи локальный проект к GitHub

Открой Terminal и выполни (замени `USERNAME` и `fin-track` на свои):

```bash
cd "/Users/Daniel/Documents/Claude/Projects/Fin track"

# Один раз настрой своё имя для коммитов (только для этого репо, глобальный git не тронем)
git config user.name "Daniel"
git config user.email "твоя-почта@example.com"

# Первый коммит
git commit -m "Первая версия: PWA + Capacitor"

# Подключить GitHub и отправить
git remote add origin https://github.com/USERNAME/fin-track.git
git push -u origin main
```

При `git push` GitHub попросит логин. **Пароль не подойдёт** — нужно создать
Personal Access Token:
1. github.com → аватар в углу → Settings
2. Внизу слева → Developer settings → Personal access tokens → Tokens (classic)
3. Generate new token (classic) → галочка `repo` → Generate
4. Скопируй токен (покажут один раз!) — это твой «пароль» для git push.

### 1.4. Включи GitHub Pages

В репозитории на GitHub: **Settings** → слева **Pages** →
- Source: **Deploy from a branch**
- Branch: **main** / **/ (root)** → Save

Через 1-2 минуты страница обновится и покажет ссылку вида:
`https://USERNAME.github.io/fin-track/`

### 1.5. Установи на iPhone

1. Открой эту ссылку в **Safari** на iPhone (обязательно Safari, не Chrome)
2. Нажми кнопку «Поделиться» (квадрат со стрелкой вверх)
3. Пролистай → **«На экран Домой»** → «Добавить»
4. На экране Домой появится иконка «Финансы» — запускай как обычное приложение

### 1.6. Проверь офлайн

1. Открой приложение с иконки один раз при интернете (чтобы service worker
   закешировал файлы)
2. Включи режим «В самолёте» на iPhone
3. Открой приложение — должно работать

### Как обновлять

Правишь `index.html` локально → `git add . && git commit -m "что изменил" &&
git push` → через минуту сайт обновится → на следующем открытии приложение
подтянет новую версию.

**Важно:** если менял `index.html`, подними версию кеша в `service-worker.js`
(`CACHE_VERSION = 'fintrack-v1'` → `'fintrack-v2'`). Иначе iPhone будет
показывать старую закешированную версию.

---

## Вариант 2. Xcode + Capacitor (настоящее iOS-приложение)

Результат: нативное приложение в папке «Программы» на iPhone, работает офлайн,
без Safari.

### 2.1. Установи Node.js

Вариант А (через Homebrew, если он стоит):
```bash
brew install node
```

Вариант Б: скачай установщик LTS с https://nodejs.org/ru и запусти.

Проверь:
```bash
node -v   # должно быть v20.x.x или выше
npm -v
```

### 2.2. Установи CocoaPods

Нужен для iOS-зависимостей. Один раз:
```bash
sudo gem install cocoapods
```

### 2.3. Сгенерируй iOS-проект

```bash
cd "/Users/Daniel/Documents/Claude/Projects/Fin track"
npm run ios:init
```

Скрипт:
1. поставит npm-зависимости (~30 сек)
2. соберёт папку `dist/` с веб-файлами
3. создаст папку `ios/` с Xcode-проектом
4. синхронизирует туда веб-код

### 2.4. Открой проект в Xcode

```bash
npm run ios:open
```

Откроется Xcode с файлом `App.xcworkspace`.

### 2.5. Настрой подпись (один раз)

В Xcode слева — выбери **App** → вкладка **Signing & Capabilities**:
1. **Team** → нажми, **Add an Account...** → войди своим Apple ID
2. После логина выбери свой Apple ID как Team
3. **Bundle Identifier** должен быть `com.daniel.fintrack` (или любой уникальный,
   типа `com.daniel.fintrack2` — если выдаст ошибку что занят)

Внизу появится сообщение «Automatically manage signing» — оставь включённым.

### 2.6. Подключи iPhone и разреши разработку

1. Подключи iPhone кабелем к Mac
2. На iPhone разреши: **Настройки → Конфиденциальность и безопасность → Режим
   разработчика → Включить**, iPhone перезагрузится
3. На Mac открой **Finder** → iPhone в боковой панели → **Доверять**
4. В Xcode сверху выбери свой iPhone из списка устройств (рядом с кнопкой Run)

### 2.7. Запусти

Нажми **▶︎ Run** в Xcode (или `Cmd+R`). Xcode соберёт и установит приложение
на iPhone.

**Первый запуск даст ошибку «Untrusted Developer»** — это нормально. Нужно:
1. На iPhone: **Настройки → Основные → VPN и управление устройством**
2. Найди свой Apple ID в разделе Developer App → нажми **Доверять**
3. Вернись на экран Домой, запусти приложение

### 2.8. Неделя прошла — приложение не запускается

Бесплатный сертификат живёт 7 дней. Когда перестанет запускаться:
1. Подключи iPhone к Mac
2. Открой Xcode → `npm run ios:open` из терминала
3. Нажми Run — сертификат обновится на новые 7 дней

Если надоест — $99/год за Apple Developer Program, сертификат на год.

### Как обновить приложение после правок кода

```bash
cd "/Users/Daniel/Documents/Claude/Projects/Fin track"
npm run ios:open
```

В Xcode → Run. Всё.

---

## Если что-то сломалось

- **Service worker не работает на iPhone** — проверь что открываешь по HTTPS
  (GitHub Pages даёт HTTPS автоматически). На `file://` или `http://` — SW
  не запустится.
- **В PWA старая версия после git push** — подними `CACHE_VERSION` в
  `service-worker.js` и запушь ещё раз. Или удали иконку с экрана Домой и
  добавь заново.
- **Xcode ругается на подпись** — Bundle Identifier должен быть уникальным
  в мире. Поменяй `com.daniel.fintrack` на `com.daniel.fintrack.v2` и т.п.
- **`npx cap sync` пишет «no ios platform»** — запусти `npm run ios:init`
  вместо `ios:sync` (первый раз нужно именно init).
