# ALO UKRAINE — Instagram Planner

Локальний планер запуску українського акаунту з перепродажу **оригінального Alo Yoga** (@alo / aloyoga.com).

## Що всередині

- Контент-план запуску: пости зібрані на основі хітів Alo Yoga (Airlift, Accolade, Alosoft тощо)
- **Тексти пише виключно ChatGPT.** Підписи в plan-і свідомо порожні; у кожного поста два брифи:
  - `productionBrief` — що зберегти з @alo / aloyoga.com (медіа)
  - `aiBrief` — завдання копірайтеру ChatGPT (факти, ціна, CTA)
- **✨ Generate all** — ChatGPT пише підписи для всіх постів одним натисканням; «✨ Generate» у пості — для одного (потрібен OpenAI API key — кнопка «✨ AI» зверху)
- Можна додавати власні пости («+ New post», зберігається у браузері)
- Формати: static · carousel · reel · stories
- Статуси: Draft / Ready / Scheduled / Posted (LocalStorage)
- Фільтри: формат · рубрика · статус · «Media to source»
- Два в'юхи: Instagram-grid 3×3 і список

## Запуск

```bash
./start.sh          # відкриється на http://localhost:8766
```

або вручну:

```bash
python3 -m http.server 8766
```

Порт 8766 — щоб можна було тримати відкритим одночасно з планером KIND SIGMA (8765).

## ChatGPT (написання постів)

1. Натисни **✨ AI** у верхній панелі
2. Встав свій OpenAI API key (platform.openai.com → API keys) — зберігається лише в цьому браузері
3. Модель за замовчуванням `gpt-5-mini`, можна змінити
4. **Style guide** — головне поле: опиши тон, довжину, емодзі, CTA, встав приклади підписів, які подобаються. ChatGPT писатиме всі підписи саме так
5. У будь-якому пості: «✨ Generate (ChatGPT)» → чернетка з'явиться в редакторі підпису → перевір і Save

Дефолтний стайл-гайд лежить у `posts.json` → `meta.aiStylePrompt` (використовується, поки не збережеш свій у настройках).

## Як наповнювати медіа

Фото/відео з @alo **не тягнуться автоматично** — Instagram це блокує. Робочий процес:

1. Відкрий пост у планері → розділ **Production brief** каже, що саме шукати в @alo або на aloyoga.com
2. Збережи фото/відео (скріншот, save-інструменти, прес-матеріали aloyoga.com)
3. Поклади файли в `images/` (або `images/product-shots/`) і онови сторінку — **або** просто натисни «+ Add photo» в пості й завантаж файл
4. Статус посту → Ready

⚠️ Фото бренду захищені авторським правом. Для ресейл-акаунтів це поширена практика, але безпечніше: власні фото товару, які приїхали зі США, + прес-матеріали бренду.

## Файли

| Файл | Що це |
|---|---|
| `index.html` | UI |
| `app.js` | логіка + ChatGPT-генератор |
| `styles.css` | стилі (warm-neutral) |
| `posts.json` | контент-план: тексти, брифи, ціни — редагуй тут |
| `images/` | сюди складати збережені фото/відео Alo |

## Структура посту в posts.json

```json
{
  "id": "p1",
  "day": "Drop",
  "format": "static",
  "pillar": "product",
  "title": "Airlift Legging",
  "product": "Airlift High-Waist Legging",
  "priceUAH": 5200,
  "productionRequired": true,
  "productionType": "media",
  "productionBrief": "Зберегти з @alo: ...",
  "aiBrief": "Завдання для ChatGPT: хіро-пост Airlift, ціна 8 200 грн, CTA у Direct...",
  "caption": "",
  "hashtags": ["#aloyoga"]
}
```

`product`, `priceUAH` і `aiBrief` автоматично підставляються в промпт ChatGPT.

## TODO

- [ ] Вставити фінальний стайл-гайд у ✨ AI settings
- [ ] Підтвердити ціни в гривнях (зараз орієнтовні, з націнкою ресейлу)
- [ ] Обрати хендл акаунту (зараз placeholder @alo.ukraine)
- [ ] Зібрати медіа по брифах
