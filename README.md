# ALO UKRAINE — storefront stub

Статичний магазин-візитка: оригінальний одяг Alo Yoga в Україні.
Каталог можна переглядати; замовлення поки що приймаються в Instagram Direct
(онлайн-оплати ще немає).

## Запуск

```bash
./start.sh
```

Відкрийте http://localhost:8767

## Оновлення каталогу

```bash
./fetch_products.sh
```

Скрипт тягне публічний Shopify-фід aloyoga.com (`/products.json`, до 30 сторінок
по 250 товарів) і перезаписує `products.json` у форматі
`{"generatedAt": "...", "products": [...]}`. Товари без фото або ціни пропускаються.

## Ціноутворення

Константи на початку `app.js`:

- `FX_RATE = 44.8` — курс USD → UAH
- `MARKUP = 1.45` — націнка магазину
- `IG_URL` — посилання на Instagram

Ціна в грн = `ceil(priceUSD * FX_RATE * MARKUP / 50) * 50` (округлення вгору до 50 грн).

## Файли

- `index.html`, `styles.css`, `app.js` — вітрина (vanilla JS, без збірки та CDN)
- `products.json` — кеш каталогу
- `fetch_products.sh` — оновлення каталогу
- `start.sh` — локальний сервер (порт 8767)

Зображення підвантажуються напряму з CDN Shopify (hotlink) — для локальної
заглушки це нормально.

ALO UKRAINE — незалежний магазин, не є офіційним представництвом Alo Yoga.
