# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Персональный финансовый трекер для одного пользователя (Daniel). Весь продукт — **один файл `index.html`** (~7 300 строк) со встроенными CSS и JS, без сборки и без зависимостей в рантайме. Работает как PWA в Safari через GitHub Pages **и** как нативное iOS-приложение через Capacitor (один и тот же `index.html` оборачивается в WebView).

Полный контекст домена (финансовый профиль пользователя, бизнес-правила, схема `state`, история известных решений) — в `PROJECT_CONTEXT.md`. **Перед любой нетривиальной правкой читай его целиком**, а не первые 50 строк.

## Команды

Сборки в обычном смысле нет — `index.html` редактируется напрямую. Команды из `package.json` нужны только для упаковки в iOS-приложение через Capacitor:

```bash
npm run build       # копирует index.html, manifest.json, service-worker.js, icon.svg в dist/
npm run ios:init    # первый раз: ставит deps, добавляет ios-платформу, синкает
npm run ios:sync    # после правок index.html — пересобирает dist/ и синкает в ios/
npm run ios:open    # build + sync + открыть Xcode workspace
```

Проверка синтаксиса JS перед коммитом — без линтера, через Node:

```bash
node -e "
const fs = require('fs'), html = fs.readFileSync('index.html','utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
blocks.forEach((b,i)=>{ try { new Function(b); console.log('script #'+i+': OK'); }
  catch(e){ console.log('script #'+i+': ERROR — '+e.message); process.exit(1); } });
"
```

## Deploy и кеш — критично

При **любой** правке `index.html` ОБЯЗАТЕЛЬНО подними `CACHE_VERSION` в `service-worker.js` (сейчас `fintrack-v6` → `fintrack-v7`). Иначе iPhone, у которого PWA уже установлено на экран Домой, **никогда** не увидит изменения — будет крутить старую версию из кеша до удаления иконки. Это самая частая забывалка проекта.

GitHub Pages деплоится автоматически из main: `git push` → ~1 минута → новая версия на `https://USERNAME.github.io/fin-track-/`.

## Архитектура

### Один источник истины — `state`

Глобальный объект `state` (определение: `index.html:1578`), целиком сериализуется в `localStorage['myfinance_v2']`. Структура подробно описана в `PROJECT_CONTEXT.md`. Точки входа:

- `load()` — `index.html:1594` — читает localStorage, **здесь же выполняются все миграции схемы**. При любом изменении формы `state` миграция должна быть добавлена сюда.
- `save()` — `index.html:1590` — пишет JSON обратно. Не имеет try/catch, пристально следи за объёмом state.
- `exportData()` / `importData()` — `index.html:6265` / `index.html:6290` — JSON-бэкап.

### Карта функций

Скрипт начинается со строки ~1578. Логические зоны:

| Зона | Где |
|---|---|
| Утилиты + конвертация валют (`toRub`, `fromRub`, `parseAmount`, `fmt`) | `1699–1740` |
| Денежный поток (`totalIncome`, `freeIncome`, `free`, `dailyBudget`, …) | `1763–1870` |
| Календарные хелперы (`daysInMonth`, `daysLeftInMonth`, `clampToMonthDay`, `incomeScheduleForMonth`, `creditChargeDatesInRange`) | `1869–2060` |
| Привычки (`habitOccurrencesPerMonth`, `habitMonthlyCost`, `totalHabitsMonthly`) | `1831–1865` |
| Cashflow snapshot (`getCashflowSnapshot` — центральный агрегатор, который дёргают дашборд и health-score) | `~2200–2310` |
| Подтверждаемые списания (`findPendingDeductions`, `applyDeduction`, `markDeductionPaidExternally`, `markDeductionSkipped`, `undoDeductionThisMonth` + аналоги для кредитов и доходов) | `2732–3080` |
| Дневная фиксация дохода (Bitzone, тимлид: `logIncomeForToday`, `pushDailyIncomeTx`) | `~2480–2545` |
| Render-функции (`renderDashboard`, `renderBalances`, `renderIncome`, `renderHabits`, `renderUpcomingCalendar`, `renderHealthScore`, …) | `3623–7250` |
| Импорт CSV/PDF/XLSX (`importFile`, `applyImportAsMonthly`, `applyImportAsHistory`) | `5533–6230` |

Главный entrypoint UI — `renderAll()` (`index.html:6243`), вызывается после каждой мутации state.

### Два render-стека

В коде сосуществуют `renderAll` (старый, вызывается отовсюду) и `renderV2` (`index.html:7060`). Не предполагай, что какой-то из них «канон» — оба активны. Если правишь дашборд, проверь, что отображается в обоих.

### PWA / Capacitor

- `service-worker.js` — кеш-стратегия: navigate (network-first), статика (cache-first). Cross-origin (CDN) **умышленно не кеширует**.
- `manifest.json` — описание PWA для «Добавить на экран Домой».
- Через Capacitor (`capacitor.config.json`, appId `com.daniel.fintrack`) тот же `index.html` копируется в `dist/` и оборачивается в iOS WebView. На iOS service-worker не используется — кеш делает сам WebView.

### Внешние библиотеки

Грузятся **только при необходимости** через `ensurePapa`/`ensureXLSX`/`ensurePdfJs` (`index.html:~42–84`) — PapaParse, XLSX, pdf.js. Источники: `cdn.jsdelivr.net` с фоллбэком на `unpkg.com`. SRI-хешей нет. Если рассматриваешь правки безопасности — это вектор для подмены.

## Инварианты, которые нельзя нарушать

(полный список в `PROJECT_CONTEXT.md`)

1. **Все суммы в `transactions[].amount` хранятся в ₽.** Оригинал — в `nativeAmount` + `nativeCurrency`.
2. **Конвертация валют — только через `toRub()` / `fromRub()`** с курсами из `state.rates`. Никогда не считай `amount * 90` напрямую.
3. **Любое изменение `state` без миграции в `load()` — потеря пользовательских данных.** Особенно при переименовании полей.
4. **Никаких silent-deductions.** Движение по балансу — только через UI-подтверждение (модалка `pending events`).
5. **Цвета:** `--accent` (зелёный) — норма; `--accent2` (красный) — перебор/долг; `#ff9f4f` — предупреждение.
6. **Тон сообщений:** прямой, без «возможно» / «обратите внимание». Если плохо — сказать «плохо».

## Точки повышенной хрупкости

Обнаружены при последнем ревью — здесь правки требуют особой аккуратности:

- **`toRub` при `rate=0`** возвращает 0 без алерта — USD/USDT-доход незаметно исчезает из бюджета (`index.html:1714`).
- **`load()` catch на `JSON.parse` ошибке** молча оставляет дефолтный state, а первый же `save()` затирает битый, но восстановимый JSON (`index.html:1695`).
- **`Object.assign(state, parsed)`** в `load()` не удаляет фантомные поля; миграции переименования здесь не сработают (`index.html:1600`).
- **`findPendingDeductions`** проверяет только текущий месяц — пропущенные месяцы не догоняются после долгого отсутствия (`index.html:2732`).
- **`applyDeduction`** уменьшает `bal.amount` и пишет `deductionLog`, но **не создаёт запись в `state.transactions`** — расход исчезает из истории и графиков (`index.html:2772`).
- **`renderPastPaycheck`** читает `inc.payDay` для monthly-доходов, но в схеме это `inc.payDays` (массив) — блок ретроспективы молча скрыт (`index.html:4506`).
- **Категория «Кредиты» в дашборде** использует `c.monthly` вместо `creditMonthlyEq(c)` и не фильтрует `paused` — недоучёт weekly/biweekly (`index.html:4225`).
- **`payCreditNow`** использует сырой `parseFloat` без `parseAmount` — ввод «10 000» парсится как 10 (`index.html:2905`).
- **Магическое `/ 30`** для среднемесячного дня разбросано в `sustainableDaily`, `habitDailyCost`, рендере целей — рядом с честным `daysInMonth()`. Несогласованно.
- **Нет `storage`-listener** — две открытые вкладки приводят к last-writer-wins без предупреждения.

При правке любого из этих мест — сразу чини проблему, не маскируй.

## Git workflow

- `git config user.email` — локально настроен на `daniel.chumak@yahoo.com` (не глобально).
- Ветка одна: `main`. Force-push в анамнезе есть — старые клоны могут разойтись с origin.
- Перед push: подними `CACHE_VERSION` (см. выше).

## Не относится к коду, но лежит в репо

- `items.csv` (~700 KB, untracked) + `scripts/generate_items.py` — каталог «эпических» предметов для геймификации трат, фича в разработке.
- `.claude/worktrees/` — служебная папка Claude Code, в `.gitignore`.
