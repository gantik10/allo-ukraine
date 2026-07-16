#!/usr/bin/env python3
"""
ALO UKRAINE autoposter.

Читає план постів з ../planner/posts.json, знаходить пости, чия дата настала,
за потреби просить ChatGPT написати підпис (aiBrief + стайл-гайд) і публікує
в Instagram через Meta Graph API (акаунт має бути Professional + прив'язаний
до сторінки Facebook).

Використання:
  python3 autoposter.py                  # dry-run: показує, що буде опубліковано
  python3 autoposter.py --post           # реально публікує
  python3 autoposter.py --date 2026-08-01  # «сьогодні» для тесту
  python3 autoposter.py --post --limit 1   # опублікувати максимум 1 пост

Налаштування — у файлі .env поруч (див. env.example).
Стан (що вже опубліковано, згенеровані підписи) — state.json.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PLANNER = ROOT.parent / "planner"
IMAGES = PLANNER / "images"
STATE_FILE = ROOT / "state.json"
ENV_FILE = ROOT / ".env"
GRAPH = "https://graph.facebook.com/v21.0"
MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}
MEDIA_EXT = (".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov")
VIDEO_EXT = (".mp4", ".mov")


# ---------- config / state ----------

def load_env():
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    env.update({k: v for k, v in os.environ.items() if k in (
        "IG_USER_ID", "IG_ACCESS_TOKEN", "OPENAI_API_KEY", "OPENAI_MODEL",
        "MEDIA_BASE_URL", "PLAN_YEAR")})
    env.setdefault("MEDIA_BASE_URL",
                   "https://gantik10.github.io/allo-ukraine/admin/planner/images/")
    env.setdefault("OPENAI_MODEL", "gpt-5-mini")
    env.setdefault("PLAN_YEAR", "2026")
    return env


def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"posted": {}, "captions": {}}


def save_state(state):
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2))


# ---------- helpers ----------

def parse_day(day_str, year):
    """'Drop · 1 Aug' / '12 Aug' -> date; None якщо дати немає."""
    m = re.search(r"(\d{1,2})\s+([A-Za-z]{3})", day_str or "")
    if not m:
        return None
    mon = MONTHS.get(m.group(2).lower())
    if not mon:
        return None
    return date(int(year), mon, int(m.group(1)))


def http(method, url, data=None, timeout=60):
    req = urllib.request.Request(url, method=method)
    body = None
    if data is not None:
        body = urllib.parse.urlencode(data).encode()
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, body, timeout=timeout) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read().decode())
            msg = err.get("error", {}).get("message", str(err))
        except Exception:
            msg = str(e)
        raise RuntimeError(f"HTTP {e.code}: {msg}") from None


def graph(method, path, env, **params):
    params["access_token"] = env["IG_ACCESS_TOKEN"]
    url = f"{GRAPH}/{path}"
    if method == "GET":
        return http("GET", url + "?" + urllib.parse.urlencode(params))
    return http("POST", url, params)


def url_ok(url):
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200
    except Exception:
        return False


def find_media(post):
    """Медіа поста: файли <id>.<ext> або <id>-1.<ext>, <id>-2.<ext>… у planner/images/,
    інакше — поля image / slides[].image з posts.json (якщо файли існують)."""
    pid = post["id"]
    found = []
    if IMAGES.exists():
        for f in sorted(IMAGES.iterdir()):
            if not f.is_file() or f.suffix.lower() not in MEDIA_EXT:
                continue
            if f.stem == pid or re.fullmatch(re.escape(pid) + r"-\d+", f.stem):
                found.append(f.name)
    if not found:
        refs = []
        if post.get("image"):
            refs = [post["image"]]
        elif post.get("slides"):
            refs = [s.get("image") for s in post["slides"] if s.get("image")]
        found = [r for r in refs if r and (IMAGES / r).exists()]
    return found


# ---------- ChatGPT captions ----------

def gen_caption(post, meta, env):
    key = env.get("OPENAI_API_KEY")
    if not key:
        return None
    style = meta.get("aiStylePrompt", "")
    sys_msg = (f"You are the SMM copywriter for {meta.get('brand', 'ALO UKRAINE')} "
               f"({meta.get('handle', '@alo.ukraine')}), a Ukrainian Instagram shop for Alo Yoga.\n"
               f"Write ONE Instagram caption in Ukrainian following this style guide:\n{style}\n"
               "Rules: return ONLY the caption text — no hashtags, no quotes, no explanations.")
    user = f"Пост:\n— Назва: {post.get('title')}\n— Формат: {post.get('format')}"
    if post.get("product"):
        user += f"\n— Товар: {post['product']}"
    if post.get("priceUAH"):
        user += f"\n— Ціна: {post['priceUAH']} ₴"
    if post.get("aiBrief"):
        user += f"\n— Завдання від бренд-менеджера (виконати повністю): {post['aiBrief']}"
    user += "\n\nНапиши підпис."
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        json.dumps({"model": env["OPENAI_MODEL"],
                    "messages": [{"role": "system", "content": sys_msg},
                                 {"role": "user", "content": user}]}).encode(),
        {"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        out = json.loads(r.read().decode())
    return out["choices"][0]["message"]["content"].strip()


def full_caption(text, post):
    tags = post.get("hashtags") or []
    return text + ("\n\n" + " ".join(tags) if tags else "")


# ---------- Instagram publishing ----------

def wait_container(env, cid, minutes=6):
    for _ in range(minutes * 6):
        st = graph("GET", cid, env, fields="status_code")["status_code"]
        if st == "FINISHED":
            return
        if st == "ERROR":
            raise RuntimeError(f"container {cid}: processing ERROR")
        time.sleep(10)
    raise RuntimeError(f"container {cid}: processing timeout")


def publish(env, post, media_urls, caption):
    ig = env["IG_USER_ID"]
    is_video = media_urls[0].lower().endswith(VIDEO_EXT)
    if len(media_urls) > 1:  # carousel (images only)
        children = []
        for u in media_urls:
            c = graph("POST", f"{ig}/media", env,
                      image_url=u, is_carousel_item="true")["id"]
            children.append(c)
        cid = graph("POST", f"{ig}/media", env, media_type="CAROUSEL",
                    children=",".join(children), caption=caption)["id"]
    elif is_video:  # reel
        cid = graph("POST", f"{ig}/media", env, media_type="REELS",
                    video_url=media_urls[0], caption=caption)["id"]
        wait_container(env, cid)
    else:  # single image
        cid = graph("POST", f"{ig}/media", env,
                    image_url=media_urls[0], caption=caption)["id"]
    res = graph("POST", f"{ig}/media_publish", env, creation_id=cid)
    return res.get("id")


# ---------- main ----------

def main(argv):
    do_post = "--post" in argv
    limit = None
    if "--limit" in argv:
        limit = int(argv[argv.index("--limit") + 1])
    today = date.today()
    if "--date" in argv:
        today = datetime.strptime(argv[argv.index("--date") + 1], "%Y-%m-%d").date()

    env = load_env()
    state = load_state()
    data = json.loads((PLANNER / "posts.json").read_text())
    meta = data.get("meta", {})
    year = env["PLAN_YEAR"]

    due = []
    for p in sorted(data["posts"], key=lambda x: x.get("order", 0)):
        if p["id"] in state["posted"] or p.get("format") == "stories-only":
            continue
        d = parse_day(p.get("day"), year)
        if d and d <= today:
            due.append((d, p))

    if not due:
        print(f"[{today}] Немає постів до публікації.")
        return 0

    if do_post and not (env.get("IG_USER_ID") and env.get("IG_ACCESS_TOKEN")):
        print("✗ Немає IG_USER_ID / IG_ACCESS_TOKEN у .env — публікація неможлива.")
        return 1

    published = 0
    for d, p in due:
        if limit is not None and published >= limit:
            break
        pid, title = p["id"], p["title"]
        media = find_media(p)
        if not media:
            print(f"⏭  {pid} «{title}» ({d}): немає медіа в planner/images/ "
                  f"(очікую {pid}.jpg або {pid}-1.jpg …) — пропускаю.")
            continue
        urls = [env["MEDIA_BASE_URL"] + urllib.parse.quote(m) for m in media]

        caption = (p.get("caption") or "").strip() or state["captions"].get(pid, "")
        source = "posts.json" if (p.get("caption") or "").strip() else "cache"
        if not caption:
            try:
                caption = gen_caption(p, meta, env) or ""
                source = "ChatGPT"
            except Exception as e:
                print(f"⏭  {pid} «{title}»: помилка ChatGPT ({e}) — пропускаю.")
                continue
        if not caption:
            print(f"⏭  {pid} «{title}»: немає підпису і немає OPENAI_API_KEY — пропускаю.")
            continue
        state["captions"][pid] = caption
        save_state(state)
        cap = full_caption(caption, p)

        if not do_post:
            print(f"▶ DRY-RUN {pid} «{title}» ({d})")
            print(f"   медіа ({len(urls)}): {', '.join(media)}")
            print(f"   підпис [{source}]: {cap[:120].replace(chr(10), ' / ')}…\n")
            published += 1
            continue

        bad = [u for u in urls if not url_ok(u)]
        if bad:
            print(f"⏭  {pid}: медіа не доступне публічно (задеплойте ./deploy.sh): {bad[0]}")
            continue
        if len(urls) == 1 and not urls[0].lower().endswith(VIDEO_EXT) \
                and not urls[0].lower().endswith((".jpg", ".jpeg")):
            print(f"⏭  {pid}: Instagram API приймає лише JPEG для фото — переконвертуйте {media[0]}.")
            continue
        try:
            media_id = publish(env, p, urls, cap)
            state["posted"][pid] = {"at": datetime.now().isoformat(timespec="seconds"),
                                    "ig_media_id": media_id}
            save_state(state)
            print(f"✓ Опубліковано {pid} «{title}» → media_id {media_id}")
            published += 1
            time.sleep(5)
        except Exception as e:
            print(f"✗ {pid} «{title}»: {e}")

    mode = "опубліковано" if do_post else "готово до публікації (dry-run)"
    print(f"\nПідсумок [{today}]: {published} — {mode}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
