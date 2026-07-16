'use strict';

/* ---------- Config ---------- */

const FX_RATE = 44.8;               // USD -> UAH
const MARKUP = 1.45;                // store margin
const IG_URL = 'https://instagram.com/alo.ukraine';
const PAGE_SIZE = 24;               // cards per "Показати ще" chunk

/* ---------- Pricing ---------- */

function uah(usd) {
  return Math.ceil((usd * FX_RATE * MARKUP) / 50) * 50;
}

function fmtUAH(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн';
}

function priceHTML(p) {
  let html = '<span class="price-now">' + fmtUAH(p.uah) + '</span>';
  if (p.sale) {
    html += '<span class="price-old">' + fmtUAH(uah(p.compareUSD)) + '</span>';
  }
  return html;
}

/* ---------- Categories ---------- */

const CATEGORY_ORDER = [
  'Падел і теніс',
  'Спортзал',
  'Сумки та аксесуари',
  'Жіноче',
  'Чоловіче',
  'Б’юті та велнес',
  'Інше',
];

const TENNIS_RE = /tennis|match point|courtside|game on|grand slam|pickleball|padel|skort|tiebreak|baseline|clubhouse/i;

function categoryOf(type, title) {
  const t = type || '';
  if (TENNIS_RE.test(title || '') || t.includes('Skirts')) return 'Падел і теніс';
  if (t.includes('Accessories') || t.includes('Luxury') || t === 'Books') return 'Сумки та аксесуари';
  if (t.startsWith('Beauty') || t.startsWith('Wellness')) return 'Б’юті та велнес';
  if (/:(Leggings|Bras|Shorts|Tanks|Onesies)/.test(t)) return 'Спортзал';
  if (t.startsWith('Men')) return 'Чоловіче';
  if (t.startsWith('Women')) return 'Жіноче';
  return 'Інше';
}

/* ---------- Facets: subcategory, gender, color family ---------- */

const SUB_RULES = [
  ['Long Sleeve', 'Лонгсліви'],
  ['Short Sleeve', 'Футболки'],
  ['Sweatpants', 'Джогери та штани'],
  ['Leggings', 'Легінси'],
  ['Bralettes', 'Бра'],
  ['Bras', 'Бра'],
  ['Shorts', 'Шорти'],
  ['Tanks', 'Майки'],
  ['Tees', 'Футболки'],
  ['Shirts', 'Сорочки'],
  ['Bodysuits', 'Боді'],
  ['Onesies', 'Комбінезони'],
  ['Dresses', 'Сукні'],
  ['Skirts', 'Спідниці'],
  ['Pullovers', 'Світшоти'],
  ['Hoodies', 'Худі'],
  ['Sweaters', 'Светри'],
  ['Cardigans', 'Кардигани'],
  ['Jackets', 'Куртки'],
  ['Vests', 'Жилети'],
  ['Coats', 'Пальта'],
  ['Pants', 'Штани'],
  ['Sneakers', 'Кросівки'],
  ['Mules', 'М’юли'],
  ['Slides', 'Шльопанці'],
  ['Shoes', 'Взуття'],
  ['Socks', 'Шкарпетки'],
  ['Hair', 'Пов’язки та волосся'],
  ['Headband', 'Пов’язки та волосся'],
  ['Hats', 'Шапки та кепки'],
  ['Caps', 'Шапки та кепки'],
  ['Beanies', 'Шапки та кепки'],
  ['Gloves', 'Рукавиці'],
  ['Scarves', 'Шарфи'],
  ['Backpack', 'Рюкзаки'],
  ['Duffle', 'Сумки'],
  ['Tote', 'Сумки'],
  ['Bags', 'Сумки'],
  ['Mats', 'Мати'],
  ['Equipment', 'Інвентар'],
  ['Water', 'Пляшки'],
  ['Skin', 'Догляд'],
  ['Body', 'Догляд'],
  ['Supplement', 'Вітаміни'],
  ['Books', 'Книги'],
  ['Underwear', 'Білизна'],
];

function subOf(type) {
  const t = type || '';
  for (let i = 0; i < SUB_RULES.length; i++) {
    if (t.includes(SUB_RULES[i][0])) return SUB_RULES[i][1];
  }
  const seg = t.split(':').pop();
  return seg || 'Інше';
}

function genderOf(type) {
  const t = type || '';
  if (t.startsWith('Men')) return 'Чоловіче';
  if (t.startsWith('Women')) return 'Жіноче';
  return 'Унісекс';
}

const COLOR_FAMILIES = [
  ['Чорний', '#151515', /black|anthracite|charcoal|onyx/i],
  ['Білий та айворі', '#F4F0E8', /white|ivory|bone|cream|frost|natural|vanilla/i],
  ['Сірий', '#9A9A9A', /grey|gray|heather|gravel|steel|titanium|smoke|stone/i],
  ['Бежевий та коричневий', '#A07850', /taupe|almond|espresso|mushroom|camel|chai|brown|tan|sand|oat|latte|khaki|cocoa|mocha|beige|butter|toffee|caramel|dune|bark/i],
  ['Рожевий', '#E3A4BC', /pink|rose|blush|quartz|bubblegum|mauve|petal/i],
  ['Червоний та бордо', '#A63040', /red|burgundy|bordeaux|cherry|wine|scarlet|crimson|berry/i],
  ['Синій та блакитний', '#41618F', /blue|navy|azure|denim|indigo|provence|ocean|sky|cobalt/i],
  ['Зелений', '#5E7A5E', /green|olive|emerald|spruce|sage|mint|ivy|lettuce|forest|moss|pine|jade/i],
  ['Жовтий та помаранчевий', '#DFAF56', /yellow|gold|sunshine|candlelight|orange|peach|apricot|marigold|citrus|honey/i],
  ['Фіолетовий', '#8E6FA8', /purple|lavender|lilac|plum|violet|orchid/i],
];

function colorFamilyOf(colors) {
  const c = (colors && colors[0]) || '';
  for (let i = 0; i < COLOR_FAMILIES.length; i++) {
    if (COLOR_FAMILIES[i][2].test(c)) return COLOR_FAMILIES[i][0];
  }
  return c ? 'Інші кольори' : '';
}

const SIZE_ORDER = ['XXS', 'XS', 'XS/S', 'S', 'S/M', 'M', 'M/L', 'L', 'L/XL', 'XL', 'XXL', '1X', '2X', '3X', 'One Size', 'OS'];

function sizeRank(s) {
  const i = SIZE_ORDER.indexOf(s);
  if (i !== -1) return i;
  const num = parseFloat(s);
  if (!isNaN(num)) return 100 + num;      // взуттєві розміри — після літерних
  return 1000;                             // все інше — в кінець
}

/* ---------- Helpers ---------- */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pluralUk(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/* ---------- State ---------- */

let PRODUCTS = [];
let filtered = [];
let activeCategory = 'all';
let query = '';
let sortMode = 'default';
let visibleCount = PAGE_SIZE;

const facets = {
  subs: new Set(),
  sizes: new Set(),
  colors: new Set(),
  genders: new Set(),
  priceMin: null,
  priceMax: null,
  sale: false,
};

function facetsActiveCount() {
  return facets.subs.size + facets.sizes.size + facets.colors.size + facets.genders.size +
    (facets.priceMin != null ? 1 : 0) + (facets.priceMax != null ? 1 : 0) + (facets.sale ? 1 : 0);
}

function clearFacets() {
  facets.subs.clear(); facets.sizes.clear(); facets.colors.clear(); facets.genders.clear();
  facets.priceMin = null; facets.priceMax = null; facets.sale = false;
}

/* ---------- DOM ---------- */

const el = {
  chips: document.getElementById('chips'),
  sort: document.getElementById('sort'),
  search: document.getElementById('search'),
  grid: document.getElementById('grid'),
  empty: document.getElementById('empty'),
  more: document.getElementById('more'),
  resultCount: document.getElementById('resultCount'),
  updatedAt: document.getElementById('updatedAt'),
  filters: document.getElementById('filters'),
  filterGroups: document.getElementById('filterGroups'),
  filtersToggle: document.getElementById('filtersToggle'),
  filtersClose: document.getElementById('filtersClose'),
  filtersApply: document.getElementById('filtersApply'),
  filtersReset: document.getElementById('filtersReset'),
  filtersBackdrop: document.getElementById('filtersBackdrop'),
  applied: document.getElementById('applied'),
  hero: document.querySelector('.hero'),
  toolbar: document.querySelector('.toolbar'),
  catalog: document.querySelector('.catalog'),
  productPage: document.getElementById('productPage'),
  ppCrumbs: document.getElementById('ppCrumbs'),
  ppImg: document.getElementById('ppImg'),
  ppThumbs: document.getElementById('ppThumbs'),
  ppCat: document.getElementById('ppCat'),
  ppTitle: document.getElementById('ppTitle'),
  ppPrice: document.getElementById('ppPrice'),
  ppSizesBlock: document.getElementById('ppSizesBlock'),
  ppSizes: document.getElementById('ppSizes'),
  ppColors: document.getElementById('ppColors'),
  ppCopy: document.getElementById('ppCopy'),
  ppDescBlock: document.getElementById('ppDescBlock'),
  ppDesc: document.getElementById('ppDesc'),
  relatedBlock: document.getElementById('relatedBlock'),
  relatedGrid: document.getElementById('relatedGrid'),
  recentBlock: document.getElementById('recentBlock'),
  recentGrid: document.getElementById('recentGrid'),
};

/* ---------- Chips ---------- */

function renderChips() {
  const counts = {};
  for (const p of PRODUCTS) {
    counts[p.category] = (counts[p.category] || 0) + 1;
  }
  const parts = [];
  parts.push(chipHTML('all', 'Всі', PRODUCTS.length));
  for (const cat of CATEGORY_ORDER) {
    if (counts[cat]) parts.push(chipHTML(cat, cat, counts[cat]));
  }
  el.chips.innerHTML = parts.join('');
}

function chipHTML(value, label, count) {
  const active = value === activeCategory ? ' active' : '';
  return '<button class="chip' + active + '" data-cat="' + esc(value) + '">' +
    esc(label) + '<span class="chip-count">' + count + '</span></button>';
}

/* ---------- Filtering ---------- */

// Base scope: category + search (facets applied on top of this)
function inScope(p) {
  if (activeCategory !== 'all' && p.category !== activeCategory) return false;
  const q = query.trim().toLowerCase();
  if (q && p.title.toLowerCase().indexOf(q) === -1 &&
      p.type.toLowerCase().indexOf(q) === -1) return false;
  return true;
}

// Does p pass every facet group except `skip`? (standard faceting:
// OR inside a group, AND across groups)
function passesFacets(p, skip) {
  if (skip !== 'subs' && facets.subs.size && !facets.subs.has(p.sub)) return false;
  if (skip !== 'genders' && facets.genders.size && !facets.genders.has(p.gender)) return false;
  if (skip !== 'colors' && facets.colors.size && !facets.colors.has(p.colorFam)) return false;
  if (skip !== 'sizes' && facets.sizes.size) {
    let hit = false;
    for (const s of p.sizes || []) { if (facets.sizes.has(s)) { hit = true; break; } }
    if (!hit) return false;
  }
  if (skip !== 'price') {
    if (facets.priceMin != null && p.uah < facets.priceMin) return false;
    if (facets.priceMax != null && p.uah > facets.priceMax) return false;
  }
  if (skip !== 'sale' && facets.sale && !p.sale) return false;
  return true;
}

function applyFilters() {
  filtered = PRODUCTS.filter(function (p) { return inScope(p) && passesFacets(p, null); });
  if (sortMode === 'asc') {
    filtered.sort(function (a, b) { return a.uah - b.uah; });
  } else if (sortMode === 'desc') {
    filtered.sort(function (a, b) { return b.uah - a.uah; });
  } else if (sortMode === 'sale') {
    filtered.sort(function (a, b) { return (b.sale ? 1 : 0) - (a.sale ? 1 : 0); });
  }
}

/* ---------- Filter panel ---------- */

function countBy(skipGroup, valueOf, multi) {
  const counts = {};
  for (const p of PRODUCTS) {
    if (!inScope(p) || !passesFacets(p, skipGroup)) continue;
    if (multi) {
      for (const v of valueOf(p) || []) counts[v] = (counts[v] || 0) + 1;
    } else {
      const v = valueOf(p);
      if (v) counts[v] = (counts[v] || 0) + 1;
    }
  }
  return counts;
}

function checkboxHTML(group, value, label, count, checked, dot) {
  return '<label class="f-opt' + (count === 0 && !checked ? ' muted' : '') + '">' +
    '<input type="checkbox" data-group="' + group + '" data-value="' + esc(value) + '"' +
    (checked ? ' checked' : '') + '>' +
    (dot ? '<span class="f-dot" style="background:' + dot + '"></span>' : '') +
    '<span class="f-name">' + esc(label) + '</span>' +
    '<span class="f-count">' + count + '</span></label>';
}

function groupHTML(title, inner) {
  if (!inner) return '';
  return '<details class="fgroup" open><summary>' + title + '</summary>' +
    '<div class="fgroup-body">' + inner + '</div></details>';
}

function renderFilters() {
  const parts = [];

  // Тип (підкатегорія)
  const subCounts = countBy('subs', function (p) { return p.sub; });
  const subs = Object.keys(subCounts).sort(function (a, b) { return subCounts[b] - subCounts[a]; });
  if (subs.length > 1 || facets.subs.size) {
    parts.push(groupHTML('Тип', subs.map(function (s) {
      return checkboxHTML('subs', s, s, subCounts[s] || 0, facets.subs.has(s));
    }).join('')));
  }

  // Для кого (ховаємо всередині чисто жіночих/чоловічих категорій)
  if (activeCategory !== 'Жіноче' && activeCategory !== 'Чоловіче') {
    const gCounts = countBy('genders', function (p) { return p.gender; });
    const genders = ['Жіноче', 'Чоловіче', 'Унісекс'].filter(function (g) { return gCounts[g] || facets.genders.has(g); });
    if (genders.length > 1) {
      parts.push(groupHTML('Для кого', genders.map(function (g) {
        return checkboxHTML('genders', g, g, gCounts[g] || 0, facets.genders.has(g));
      }).join('')));
    }
  }

  // Розмір
  const sCounts = countBy('sizes', function (p) { return p.sizes; }, true);
  const sizes = Object.keys(sCounts).sort(function (a, b) { return sizeRank(a) - sizeRank(b) || a.localeCompare(b); });
  if (sizes.length > 1) {
    parts.push(groupHTML('Розмір', '<div class="f-sizes">' + sizes.map(function (s) {
      return '<button class="f-size' + (facets.sizes.has(s) ? ' active' : '') +
        '" data-group="sizes" data-value="' + esc(s) + '" title="' + sCounts[s] + '">' + esc(s) + '</button>';
    }).join('') + '</div>'));
  }

  // Колір
  const cCounts = countBy('colors', function (p) { return p.colorFam; });
  const famOrder = COLOR_FAMILIES.map(function (f) { return f[0]; }).concat(['Інші кольори']);
  const fams = famOrder.filter(function (f) { return cCounts[f] || facets.colors.has(f); });
  if (fams.length > 1) {
    parts.push(groupHTML('Колір', fams.map(function (f) {
      const def = COLOR_FAMILIES.find(function (x) { return x[0] === f; });
      return checkboxHTML('colors', f, f, cCounts[f] || 0, facets.colors.has(f), def ? def[1] : '#D8D2C8');
    }).join('')));
  }

  // Ціна
  parts.push(groupHTML('Ціна, грн',
    '<div class="f-price">' +
      '<input type="number" id="priceMin" inputmode="numeric" min="0" placeholder="від" value="' + (facets.priceMin != null ? facets.priceMin : '') + '">' +
      '<span>—</span>' +
      '<input type="number" id="priceMax" inputmode="numeric" min="0" placeholder="до" value="' + (facets.priceMax != null ? facets.priceMax : '') + '">' +
    '</div>'));

  // Знижка
  const saleCounts = countBy('sale', function (p) { return p.sale ? 'y' : ''; });
  if (saleCounts.y || facets.sale) {
    parts.push(groupHTML('Знижка',
      checkboxHTML('sale', 'y', 'Зі знижкою', saleCounts.y || 0, facets.sale)));
  }

  el.filterGroups.innerHTML = parts.join('');
  el.filtersReset.hidden = facetsActiveCount() === 0;
  updateFiltersToggle();
}

function updateFiltersToggle() {
  const n = facetsActiveCount();
  el.filtersToggle.textContent = 'Фільтри' + (n ? ' · ' + n : '');
}

function renderApplied() {
  const chips = [];
  function add(group, value, label) {
    chips.push('<button class="applied-chip" data-group="' + group + '" data-value="' + esc(value) + '">' +
      esc(label) + ' ×</button>');
  }
  facets.subs.forEach(function (v) { add('subs', v, v); });
  facets.genders.forEach(function (v) { add('genders', v, v); });
  facets.sizes.forEach(function (v) { add('sizes', v, 'Розмір ' + v); });
  facets.colors.forEach(function (v) { add('colors', v, v); });
  if (facets.priceMin != null) add('priceMin', '', 'від ' + fmtUAH(facets.priceMin));
  if (facets.priceMax != null) add('priceMax', '', 'до ' + fmtUAH(facets.priceMax));
  if (facets.sale) add('sale', 'y', 'Зі знижкою');
  if (chips.length) {
    chips.push('<button class="applied-clear" id="appliedClear">Скинути все</button>');
  }
  el.applied.innerHTML = chips.join('');
  el.applied.hidden = chips.length === 0;
}

function refreshAll() {
  visibleCount = PAGE_SIZE;
  applyFilters();
  renderGrid();
  renderFilters();
  renderApplied();
}

/* ---------- Grid ---------- */

function cardHTML(p) {
  const img2 = p.img2
    ? '<img class="img2" src="' + esc(p.img2) + '" alt="" loading="lazy">'
    : '';
  const sale = p.sale ? '<span class="card-sale">знижка</span>' : '';
  return '<article class="card" data-handle="' + esc(p.handle) + '">' +
    '<div class="card-media">' + sale +
      '<img class="img1" src="' + esc(p.img) + '" alt="' + esc(p.title) + '" loading="lazy">' +
      img2 +
    '</div>' +
    '<p class="card-cat">' + esc(p.sub || p.category) + '</p>' +
    '<h3 class="card-title">' + esc(p.title) + '</h3>' +
    '<p class="card-price">' + priceHTML(p) + '</p>' +
  '</article>';
}

function renderGrid() {
  const slice = filtered.slice(0, visibleCount);
  el.grid.innerHTML = slice.map(cardHTML).join('');

  const n = filtered.length;
  el.empty.hidden = n !== 0;
  el.more.hidden = visibleCount >= n;
  el.resultCount.textContent = n === 0
    ? ''
    : n + ' ' + pluralUk(n, 'товар', 'товари', 'товарів');
  if (el.filtersApply) {
    el.filtersApply.textContent = n === 0
      ? 'Нічого не знайдено'
      : 'Показати ' + n + ' ' + pluralUk(n, 'товар', 'товари', 'товарів');
  }
}

/* ---------- Product page (hash route #/p/<handle>) ---------- */

let currentProduct = null;

function findByHandle(handle) {
  for (let i = 0; i < PRODUCTS.length; i++) {
    if (PRODUCTS[i].handle === handle) return PRODUCTS[i];
  }
  return null;
}

function productHash(p) { return '#/p/' + encodeURIComponent(p.handle); }

const RECENT_KEY = 'alo-recent-v1';
function recentHandles() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
}
function pushRecent(handle) {
  const list = recentHandles().filter(function (h) { return h !== handle; });
  list.unshift(handle);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 9))); } catch (e) {}
}

function relatedFor(p, limit) {
  const sameSub = [];
  const sameCat = [];
  for (const x of PRODUCTS) {
    if (x.handle === p.handle) continue;
    if (x.category === p.category && x.sub === p.sub) sameSub.push(x);
    else if (x.category === p.category) sameCat.push(x);
  }
  const byPrice = function (a, b) { return Math.abs(a.uah - p.uah) - Math.abs(b.uah - p.uah); };
  sameSub.sort(byPrice);
  sameCat.sort(byPrice);
  return sameSub.concat(sameCat).slice(0, limit);
}

function showProduct(handle) {
  const p = findByHandle(handle);
  if (!p) { location.hash = ''; return; }
  currentProduct = p;

  el.ppCrumbs.innerHTML =
    '<a href="#" data-crumb="all">Каталог</a><span>/</span>' +
    '<a href="#" data-crumb="cat">' + esc(p.category) + '</a>' +
    (p.sub ? '<span>/</span><a href="#" data-crumb="sub">' + esc(p.sub) + '</a>' : '');

  el.ppCat.textContent = p.category + (p.sub ? ' · ' + p.sub : '');
  el.ppTitle.textContent = p.title;
  el.ppPrice.innerHTML = priceHTML(p);

  el.ppImg.src = p.img;
  el.ppImg.alt = p.title;
  const imgs = [p.img];
  if (p.img2) imgs.push(p.img2);
  el.ppThumbs.innerHTML = imgs.length > 1 ? imgs.map(function (src, i) {
    return '<button class="modal-thumb' + (i === 0 ? ' active' : '') +
      '" data-src="' + esc(src) + '"><img src="' + esc(src) + '" alt=""></button>';
  }).join('') : '';

  const sizes = p.sizes || [];
  el.ppSizesBlock.hidden = sizes.length === 0;
  el.ppSizes.innerHTML = sizes.map(function (s) {
    return '<span class="size-chip">' + esc(s) + '</span>';
  }).join('');

  const colors = p.colors || [];
  el.ppColors.textContent = colors.length === 1 ? 'Колір: ' + colors[0]
    : colors.length > 1 ? colors.length + ' ' + pluralUk(colors.length, 'колір', 'кольори', 'кольорів')
    : '';
  el.ppColors.hidden = colors.length === 0;

  el.ppDesc.textContent = p.desc || '';
  el.ppDescBlock.hidden = !p.desc;

  const related = relatedFor(p, 8);
  el.relatedBlock.hidden = related.length === 0;
  el.relatedGrid.innerHTML = related.map(cardHTML).join('');

  const recent = recentHandles()
    .filter(function (h) { return h !== p.handle; })
    .map(findByHandle)
    .filter(Boolean)
    .slice(0, 4);
  el.recentBlock.hidden = recent.length === 0;
  el.recentGrid.innerHTML = recent.map(cardHTML).join('');

  pushRecent(p.handle);

  el.hero.hidden = true;
  el.toolbar.hidden = true;
  el.catalog.hidden = true;
  el.productPage.hidden = false;
  closeFiltersPanel();
  document.title = p.title + ' — ALO UKRAINE';
  window.scrollTo(0, 0);
}

function showCatalog() {
  currentProduct = null;
  el.productPage.hidden = true;
  el.hero.hidden = false;
  el.toolbar.hidden = false;
  el.catalog.hidden = false;
  document.title = 'ALO UKRAINE — оригінальний Alo Yoga в Україні';
}

function route() {
  const m = location.hash.match(/^#\/p\/(.+)$/);
  if (m && PRODUCTS.length) showProduct(decodeURIComponent(m[1]));
  else showCatalog();
}
window.addEventListener('hashchange', route);

/* ---------- Events ---------- */

el.chips.addEventListener('click', function (e) {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  activeCategory = chip.dataset.cat;
  clearFacets();                      // нова категорія — чисті фільтри
  renderChips();
  refreshAll();
});

el.search.addEventListener('input', function () {
  query = el.search.value;
  if (currentProduct) location.hash = '';   // пошук повертає до каталогу
  refreshAll();
});

el.sort.addEventListener('change', function () {
  sortMode = el.sort.value;
  visibleCount = PAGE_SIZE;
  applyFilters();
  renderGrid();
});

el.more.addEventListener('click', function () {
  visibleCount += PAGE_SIZE;
  renderGrid();
});

// facet checkboxes / size buttons
el.filterGroups.addEventListener('click', function (e) {
  const sizeBtn = e.target.closest('.f-size');
  if (sizeBtn) {
    toggleFacet('sizes', sizeBtn.dataset.value);
    refreshAll();
  }
});
el.filterGroups.addEventListener('change', function (e) {
  const input = e.target;
  if (input.id === 'priceMin' || input.id === 'priceMax') {
    const v = input.value === '' ? null : Math.max(0, parseInt(input.value, 10) || 0);
    if (input.id === 'priceMin') facets.priceMin = v; else facets.priceMax = v;
    refreshAll();
    return;
  }
  if (!input.dataset.group) return;
  toggleFacet(input.dataset.group, input.dataset.value);
  refreshAll();
});

function toggleFacet(group, value) {
  if (group === 'sale') { facets.sale = !facets.sale; return; }
  if (group === 'priceMin') { facets.priceMin = null; return; }
  if (group === 'priceMax') { facets.priceMax = null; return; }
  const set = facets[group];
  if (!set) return;
  if (set.has(value)) set.delete(value); else set.add(value);
}

el.applied.addEventListener('click', function (e) {
  if (e.target.id === 'appliedClear') {
    clearFacets();
    refreshAll();
    return;
  }
  const chip = e.target.closest('.applied-chip');
  if (!chip) return;
  const g = chip.dataset.group;
  if (g === 'sale') facets.sale = false;
  else if (g === 'priceMin') facets.priceMin = null;
  else if (g === 'priceMax') facets.priceMax = null;
  else facets[g].delete(chip.dataset.value);
  refreshAll();
});

el.filtersReset.addEventListener('click', function () {
  clearFacets();
  refreshAll();
});

// mobile slide-over
function openFiltersPanel() {
  document.body.classList.add('filters-open');
  el.filtersBackdrop.hidden = false;
}
function closeFiltersPanel() {
  document.body.classList.remove('filters-open');
  el.filtersBackdrop.hidden = true;
}
el.filtersToggle.addEventListener('click', openFiltersPanel);
el.filtersClose.addEventListener('click', closeFiltersPanel);
el.filtersApply.addEventListener('click', closeFiltersPanel);
el.filtersBackdrop.addEventListener('click', closeFiltersPanel);

// any product card (catalog, related, recently viewed) → its page
document.addEventListener('click', function (e) {
  const card = e.target.closest('.card[data-handle]');
  if (!card) return;
  const p = findByHandle(card.dataset.handle);
  if (p) location.hash = productHash(p);
});

el.ppThumbs.addEventListener('click', function (e) {
  const thumb = e.target.closest('.modal-thumb');
  if (!thumb) return;
  el.ppImg.src = thumb.dataset.src;
  el.ppThumbs.querySelectorAll('.modal-thumb').forEach(function (t) {
    t.classList.toggle('active', t === thumb);
  });
});

el.ppCrumbs.addEventListener('click', function (e) {
  const a = e.target.closest('a[data-crumb]');
  if (!a) return;
  e.preventDefault();
  const p = currentProduct;
  clearFacets();
  if (a.dataset.crumb === 'all') activeCategory = 'all';
  else if (p) {
    activeCategory = p.category;
    if (a.dataset.crumb === 'sub' && p.sub) facets.subs.add(p.sub);
  }
  renderChips();
  refreshAll();
  location.hash = '';
});

el.ppCopy.addEventListener('click', function () {
  if (!currentProduct) return;
  const msg = 'Добрий день! Цікавить ' + currentProduct.title +
    ' (' + fmtUAH(currentProduct.uah) + '). Розмір: ___. Підкажіть, будь ласка, наявність і строки.';
  navigator.clipboard.writeText(msg).then(function () {
    el.ppCopy.textContent = 'Скопійовано — вставте в Direct';
    setTimeout(function () { el.ppCopy.textContent = 'Скопіювати запит для Direct'; }, 2000);
  });
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (document.body.classList.contains('filters-open')) closeFiltersPanel();
    else if (currentProduct) location.hash = '';
  }
});

/* ---------- Init ---------- */

document.querySelectorAll('.ig-href').forEach(function (a) {
  a.href = IG_URL;
});

fetch('products.json')
  .then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(function (data) {
    PRODUCTS = data.products
      .filter(function (p) {
        var t = (p.type || '').toLowerCase();
        return t !== 'internal' && t !== 'dnu' && !/gift card/.test(t);
      })
      .map(function (p) {
        p.priceUSD = parseFloat(p.priceUSD) || 0;
        p.compareUSD = p.compareUSD != null ? parseFloat(p.compareUSD) || null : null;
        p.uah = uah(p.priceUSD);
        p.sale = !!(p.compareUSD && p.compareUSD > p.priceUSD);
        p.category = categoryOf(p.type, p.title);
        p.sub = subOf(p.type);
        p.gender = genderOf(p.type);
        p.colorFam = colorFamilyOf(p.colors);
        return p;
      });
    if (data.generatedAt) {
      el.updatedAt.textContent = 'Каталог оновлено: ' + data.generatedAt;
    }
    renderChips();
    refreshAll();
    route();   // підтримка прямих посилань #/p/<handle>
  })
  .catch(function (err) {
    el.resultCount.textContent =
      'Не вдалося завантажити каталог. Оновіть сторінку або запустіть fetch_products.sh.';
    console.error(err);
  });
