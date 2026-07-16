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
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн';
}

function priceHTML(p) {
  let html = '<span class="price-now">' + fmtUAH(uah(p.priceUSD)) + '</span>';
  if (p.compareUSD && p.compareUSD > p.priceUSD) {
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
  modal: document.getElementById('modal'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalClose: document.getElementById('modalClose'),
  modalImg: document.getElementById('modalImg'),
  modalThumbs: document.getElementById('modalThumbs'),
  modalCat: document.getElementById('modalCat'),
  modalTitle: document.getElementById('modalTitle'),
  modalPrice: document.getElementById('modalPrice'),
  modalDesc: document.getElementById('modalDesc'),
  modalSizesBlock: document.getElementById('modalSizesBlock'),
  modalSizes: document.getElementById('modalSizes'),
  modalColors: document.getElementById('modalColors'),
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

/* ---------- Filtering / sorting / rendering ---------- */

function applyFilters() {
  const q = query.trim().toLowerCase();
  filtered = PRODUCTS.filter(function (p) {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (q && p.title.toLowerCase().indexOf(q) === -1 &&
        p.type.toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
  if (sortMode === 'asc') {
    filtered.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
  } else if (sortMode === 'desc') {
    filtered.sort(function (a, b) { return b.priceUSD - a.priceUSD; });
  }
}

function cardHTML(p, index) {
  const img2 = p.img2
    ? '<img class="img2" src="' + esc(p.img2) + '" alt="" loading="lazy">'
    : '';
  return '<article class="card" data-index="' + index + '">' +
    '<div class="card-media">' +
      '<img class="img1" src="' + esc(p.img) + '" alt="' + esc(p.title) + '" loading="lazy">' +
      img2 +
    '</div>' +
    '<p class="card-cat">' + esc(p.category) + '</p>' +
    '<h3 class="card-title">' + esc(p.title) + '</h3>' +
    '<p class="card-price">' + priceHTML(p) + '</p>' +
  '</article>';
}

function renderGrid() {
  const slice = filtered.slice(0, visibleCount);
  el.grid.innerHTML = slice.map(function (p) {
    return cardHTML(p, filtered.indexOf(p));
  }).join('');

  const n = filtered.length;
  el.empty.hidden = n !== 0;
  el.more.hidden = visibleCount >= n;
  el.resultCount.textContent = n === 0
    ? ''
    : n + ' ' + pluralUk(n, 'товар', 'товари', 'товарів');
}

function resetAndRender() {
  visibleCount = PAGE_SIZE;
  applyFilters();
  renderGrid();
}

/* ---------- Modal ---------- */

function openModal(p) {
  el.modalCat.textContent = p.category;
  el.modalTitle.textContent = p.title;
  el.modalPrice.innerHTML = priceHTML(p);
  el.modalDesc.textContent = p.desc || '';
  el.modalDesc.hidden = !p.desc;

  el.modalImg.src = p.img;
  el.modalImg.alt = p.title;

  const imgs = [p.img];
  if (p.img2) imgs.push(p.img2);
  if (imgs.length > 1) {
    el.modalThumbs.innerHTML = imgs.map(function (src, i) {
      return '<button class="modal-thumb' + (i === 0 ? ' active' : '') +
        '" data-src="' + esc(src) + '"><img src="' + esc(src) + '" alt=""></button>';
    }).join('');
  } else {
    el.modalThumbs.innerHTML = '';
  }

  const sizes = p.sizes || [];
  el.modalSizesBlock.hidden = sizes.length === 0;
  el.modalSizes.innerHTML = sizes.map(function (s) {
    return '<span class="size-chip">' + esc(s) + '</span>';
  }).join('');

  const colors = p.colors || [];
  if (colors.length === 1) {
    el.modalColors.textContent = 'Колір: ' + colors[0];
  } else if (colors.length > 1) {
    el.modalColors.textContent = colors.length + ' ' +
      pluralUk(colors.length, 'колір', 'кольори', 'кольорів');
  } else {
    el.modalColors.textContent = '';
  }
  el.modalColors.hidden = colors.length === 0;

  el.modal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal() {
  el.modal.hidden = true;
  document.body.classList.remove('modal-open');
}

/* ---------- Events ---------- */

el.chips.addEventListener('click', function (e) {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  activeCategory = chip.dataset.cat;
  renderChips();
  resetAndRender();
});

el.search.addEventListener('input', function () {
  query = el.search.value;
  resetAndRender();
});

el.sort.addEventListener('change', function () {
  sortMode = el.sort.value;
  resetAndRender();
});

el.more.addEventListener('click', function () {
  visibleCount += PAGE_SIZE;
  renderGrid();
});

el.grid.addEventListener('click', function (e) {
  const card = e.target.closest('.card');
  if (!card) return;
  const p = filtered[Number(card.dataset.index)];
  if (p) openModal(p);
});

el.modalThumbs.addEventListener('click', function (e) {
  const thumb = e.target.closest('.modal-thumb');
  if (!thumb) return;
  el.modalImg.src = thumb.dataset.src;
  el.modalThumbs.querySelectorAll('.modal-thumb').forEach(function (t) {
    t.classList.toggle('active', t === thumb);
  });
});

el.modalClose.addEventListener('click', closeModal);
el.modalBackdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !el.modal.hidden) closeModal();
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
        p.category = categoryOf(p.type, p.title);
        return p;
      });
    if (data.generatedAt) {
      el.updatedAt.textContent = 'Каталог оновлено: ' + data.generatedAt;
    }
    renderChips();
    resetAndRender();
  })
  .catch(function (err) {
    el.resultCount.textContent =
      'Не вдалося завантажити каталог. Оновіть сторінку або запустіть fetch_products.sh.';
    console.error(err);
  });
