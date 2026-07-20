'use strict';

/* ---------- Config ---------- */
const ADMIN_PIN = 'alo2026';      // косметична завіса; сторінка технічно публічна
const FX_RATE = 44.8;
const MARKUP = 1.45;
const IG_URL = 'https://instagram.com/alo.ukraine';

function uah(usd) { return Math.ceil((usd * FX_RATE * MARKUP) / 50) * 50; }
function fmtUAH(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн'; }

/* ---------- Path resolution: deployed (/admin/) vs local repo-root server ---------- */
// Deployed:  store at ../, planner at ./planner/
// Local dev: repo root served → store at ../store/, planner at ../planner/
const PATHS = { planner: './planner/', products: '../products.json' };
async function resolvePaths() {
  try {
    const r = await fetch('planner/posts.json', { method: 'HEAD' });
    if (!r.ok) throw 0;
  } catch { PATHS.planner = '../planner/'; }
  try {
    const r = await fetch('../products.json', { method: 'HEAD' });
    if (!r.ok) throw 0;
  } catch { PATHS.products = '../store/products.json'; }
}

/* ---------- Data ---------- */
let CATALOG = null;   // {generatedAt, products}
let PLAN = null;      // planner posts.json

async function loadCatalog() {
  if (CATALOG) return CATALOG;
  const r = await fetch(PATHS.products);
  const data = await r.json();
  const cdn = data.cdnBase || '';
  data.products = (data.products || []).filter(p => {
    const t = (p.type || '').toLowerCase();
    return t !== 'internal' && t !== 'dnu' && !/gift card/.test(t);
  }).map(p => {
    if (!p.img && p.imgs && p.imgs.length) {
      const n = p.imgs[0];
      const full = /^https?:/.test(n) ? n : cdn + n;
      p.img = full + (full.indexOf('?') > -1 ? '&' : '?') + 'width=200';
    }
    return p;
  });
  CATALOG = data;
  return data;
}
async function loadPlan() {
  if (PLAN) return PLAN;
  const r = await fetch(PATHS.planner + 'posts.json');
  PLAN = await r.json();
  return PLAN;
}

/* ---------- Gate ---------- */
function gateOK() { return sessionStorage.getItem('alo-admin-ok') === '1'; }
function initGate() {
  const gate = document.getElementById('gate');
  const shell = document.getElementById('shell');
  if (gateOK()) { shell.classList.remove('hidden'); route(); return; }
  gate.classList.remove('hidden');
  const input = document.getElementById('gateInput');
  const tryPin = () => {
    if (input.value === ADMIN_PIN) {
      sessionStorage.setItem('alo-admin-ok', '1');
      gate.classList.add('hidden');
      shell.classList.remove('hidden');
      route();
    } else {
      document.getElementById('gateErr').textContent = 'Невірний PIN';
      input.value = '';
    }
  };
  document.getElementById('gateBtn').onclick = tryPin;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryPin(); });
  input.focus();
}

/* ---------- Router ---------- */
const routes = {
  '/': renderDashboard,
  '/products': renderProducts,
  '/orders': renderOrders,
  '/payments': renderPayments,
  '/settings': renderSettings,
};
function currentRoute() {
  const h = location.hash.replace(/^#/, '') || '/';
  return routes[h] ? h : '/';
}
function route() {
  if (!gateOK()) return;
  const r = currentRoute();
  document.querySelectorAll('#nav a[data-route]').forEach(a => {
    a.classList.toggle('active', a.dataset.route === r);
  });
  document.getElementById('main').innerHTML = '<div class="page-sub">Завантаження…</div>';
  routes[r]();
}
window.addEventListener('hashchange', route);

function page(title, sub, bodyHTML) {
  document.getElementById('main').innerHTML =
    '<h1 class="page-title">' + title + '</h1>' +
    '<div class="page-sub">' + sub + '</div>' + bodyHTML;
}

/* ---------- Pages ---------- */
async function renderDashboard() {
  let postCount = '—', productCount = '—', updated = '';
  try { const plan = await loadPlan(); postCount = plan.posts.length; } catch {}
  try { const cat = await loadCatalog(); productCount = cat.products.length.toLocaleString('uk-UA'); updated = cat.generatedAt || ''; } catch {}
  page('Дашборд', 'ALO UKRAINE — тестовий стенд магазину та контент-планера',
    '<div class="cards">' +
      '<a class="card link" href="' + PATHS.planner + '"><div class="num">' + postCount + '</div><div class="lbl">Постів у плані</div><div class="note">Відкрити планер ↗</div></a>' +
      '<a class="card link" href="#/products"><div class="num">' + productCount + '</div><div class="lbl">Товарів у каталозі</div><div class="note">' + (updated ? 'Оновлено: ' + updated : '') + '</div></a>' +
      '<a class="card link" href="#/orders"><div class="num">0</div><div class="lbl">Замовлення</div><div class="note">Приймаються в Direct до підключення оплати</div></a>' +
      '<div class="card"><div class="num">✳</div><div class="lbl">Статус магазину</div><div class="note">Вітрина-заглушка · онлайн-оплата ще не підключена</div></div>' +
    '</div>' +
    '<div class="stub-banner"><b>Що вже працює:</b> сайт-вітрина з реальним каталогом Alo та планер постів із ChatGPT-копірайтером. <b>Що буде тут далі:</b> керування товарами, замовлення, оплати — після переходу на движок магазину.</div>');
}

async function renderProducts() {
  let cat;
  try { cat = await loadCatalog(); }
  catch { page('Товари', 'Каталог', '<div class="empty"><h3>Каталог не завантажився</h3><p>Перевірте products.json</p></div>'); return; }
  const products = cat.products;
  page('Товари', products.length.toLocaleString('uk-UA') + ' позицій · каталог Alo Yoga',
    '<div class="stub-banner"><b>Read-only заглушка.</b> Додавання, редагування та наявність по розмірах з’являться разом із движком магазину.</div>' +
    '<input class="search" id="prodSearch" placeholder="Пошук за назвою…" />' +
    '<div id="prodTable"></div>');
  const tableEl = document.getElementById('prodTable');
  let shown = 50;
  let query = '';
  const draw = () => {
    const q = query.toLowerCase();
    const list = q ? products.filter(p => p.title.toLowerCase().includes(q)) : products;
    const rows = list.slice(0, shown).map(p =>
      '<tr><td><img src="' + p.img + '" loading="lazy" alt=""></td>' +
      '<td>' + p.title + '</td>' +
      '<td><span class="badge">' + (p.type || '—') + '</span></td>' +
      '<td class="price">' + fmtUAH(uah(parseFloat(p.priceUSD))) + '</td>' +
      '<td><span class="badge soon">під замовлення</span></td></tr>'
    ).join('');
    tableEl.innerHTML =
      '<table><thead><tr><th></th><th>Назва</th><th>Категорія</th><th>Ціна</th><th>Наявність</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5" style="text-align:center;color:var(--mute);padding:32px">Нічого не знайдено</td></tr>') +
      '</tbody></table>' +
      (list.length > shown ? '<button class="btn-more" id="moreBtn">Показати ще (' + (list.length - shown) + ')</button>' : '');
    const more = document.getElementById('moreBtn');
    if (more) more.onclick = () => { shown += 50; draw(); };
  };
  document.getElementById('prodSearch').oninput = (e) => { query = e.target.value; shown = 50; draw(); };
  draw();
}

function renderOrders() {
  page('Замовлення', 'Історія та статуси замовлень',
    '<div class="empty"><h3>Замовлень поки немає</h3>' +
    '<p>Зараз усі замовлення приймаються в Instagram Direct. Коли підключимо движок магазину й оплату — тут з’являться кошики, статуси, ТТН Нової пошти та історія клієнтів.</p></div>');
}

function renderPayments() {
  const methods = [
    ['Оплата карткою', 'Visa / Mastercard на сайті'],
    ['Apple Pay / Google Pay', 'Експрес-оплата в один дотик'],
    ['LiqPay / monopay', 'Українські платіжні шлюзи'],
    ['Передоплата на ФОП (IBAN)', 'Рахунок для юр. оформлення'],
    ['Накладений платіж НП', 'З передоплатою 200 грн'],
  ];
  page('Оплати', 'Способи оплати магазину',
    '<div class="stub-banner"><b>Заглушка.</b> Платіжні методи підключимо разом із движком магазину. Зараз оплата — переказ після підтвердження замовлення в Direct.</div>' +
    '<div class="pay-grid">' + methods.map(m =>
      '<div class="pay"><div><div class="name">' + m[0] + '</div><div class="desc">' + m[1] + '</div></div><div class="toggle" title="незабаром"></div></div>'
    ).join('') + '</div>');
}

function renderSettings() {
  page('Налаштування', 'Конфігурація стенду (read-only)',
    '<div class="kv">' +
      '<div class="row"><span class="k">Instagram</span><span class="v">' + IG_URL.replace('https://', '') + '</span></div>' +
      '<div class="row"><span class="k">Курс USD → UAH</span><span class="v">' + FX_RATE + '</span></div>' +
      '<div class="row"><span class="k">Націнка</span><span class="v">×' + MARKUP + ' (округлення до 50 грн)</span></div>' +
      '<div class="row"><span class="k">Оновлення каталогу</span><span class="v">store/fetch_products.sh</span></div>' +
      '<div class="row"><span class="k">PIN адмінки</span><span class="v">константа ADMIN_PIN в admin.js</span></div>' +
    '</div>' +
    '<div class="stub-banner" style="margin-top:24px">Значення редагуються у коді (admin.js, store/app.js). Панель редагування з’явиться з движком магазину.</div>');
}

/* ---------- Init ---------- */
(async function () {
  await resolvePaths();
  document.getElementById('plannerLink').href = PATHS.planner;
  document.getElementById('storeLink').href = PATHS.products.replace('products.json', '') || '../';
  initGate();
})();
