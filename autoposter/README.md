# Автопостер ALO UKRAINE

Публікує пости з плану (`planner/posts.json`) в Instagram за розкладом. Якщо підпис порожній — **текст пише ChatGPT** (по aiBrief поста + стайл-гайду), результат кешується в `state.json`.

## Що потрібно один раз налаштувати (≈20 хв, робиться вручну в Meta)

1. **Instagram → Professional.** У застосунку Instagram: Налаштування → Тип акаунта → Перейти на професійний (Business).
2. **Прив'язати сторінку Facebook** до цього Instagram (створити сторінку, якщо немає: facebook.com/pages/create).
3. **Створити застосунок Meta:** developers.facebook.com → My Apps → Create App (тип Business).
4. У застосунку відкрити **Graph API Explorer** (Tools):
   - Permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management`
   - Generate Access Token → увійти → скопіювати токен
   - Дізнатись IG User ID: запит `GET me/accounts` → взяти `id` сторінки → `GET {page-id}?fields=instagram_business_account` → числовий `id` і є `IG_USER_ID`
5. **Зробити токен довгоживучим (~60 днів):**
   `GET https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={короткий токен}`
6. `cp env.example .env` і заповнити `IG_USER_ID`, `IG_ACCESS_TOKEN`, `OPENAI_API_KEY`.

## Як користуватись

```bash
python3 autoposter.py                      # dry-run: що буде опубліковано сьогодні
python3 autoposter.py --date 2026-08-01    # dry-run на конкретну дату
python3 autoposter.py --post               # опублікувати все, що настало
python3 autoposter.py --post --limit 1     # не більше одного поста за запуск
```

**Автозапуск щодня о 12:00 (Mac):**
```bash
cp com.alo.autoposter.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.alo.autoposter.plist
```
Лог: `autoposter.log`. Mac має бути увімкнений у цей час; пропущений день добереться наступним запуском (постер публікує все «прострочене» й неопубліковане).

## Правила медіа (важливо)

- Файли класти в `planner/images/` з іменем за id поста: `p2.jpg` (один кадр) або `p1-1.jpg, p1-2.jpg…` (карусель), `p10.mp4` (Reel).
- **Фото — тільки JPEG** (обмеження Instagram API). Відео — MP4.
- Перед публікацією медіа мають бути публічно доступні → запустити `./deploy.sh` (постер сам перевіряє доступність URL).
- Пост публікується, коли: настала його дата (`day` + `PLAN_YEAR`) ✚ є медіа ✚ є підпис (свій або від ChatGPT). Інакше — пропуск із поясненням у лозі.
- `stories-only` пости API не публікує — їх робити вручну.

## Стан

`state.json` — що опубліковано (ig_media_id) і кеш підписів ChatGPT. Видалити запис із `posted` = дозволити повторну публікацію.

## Ліміти й нюанси Meta API

- До 50 публікацій на добу через API — нам вистачає з запасом.
- Токен живе ~60 днів → раз на 1,5–2 місяці оновити (крок 5).
- Перший запуск краще зробити з `--limit 1` і перевірити результат в Instagram.
