// Landing page behavior: catalog browsing, search, filters, menu, contact form.
let products = CATALOG;
let activeCategory = 'All';
let searchTerm = '';

const UPPER_WORDS = new Set(['KFC', 'MJB']);
function prettyCategory(cat){
  return cat.split(' ').map(w => {
    if (UPPER_WORDS.has(w)) return w;
    if (w === 'MCDO') return 'McDo';
    if (/^[^A-Za-z]+$/.test(w)) return w;
    return w.charAt(0) + w.slice(1).toLowerCase();
  }).join(' ');
}
function categorySlug(cat){ return 'cat-' + cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

function renderProducts(){
  const grid = document.getElementById('productsGrid');
  const emptyEl = document.getElementById('productsEmpty');
  const chipsEl = document.getElementById('categoryChips');
  const countEl = document.getElementById('resultCount');

  const matched = products;
  const allCategories = [...new Set(matched.map(p => p.category))];

  document.getElementById('statProducts').textContent = matched.length;
  document.getElementById('statCategories').textContent = allCategories.length;

  if (!matched.length){
    emptyEl.style.display = 'block';
    grid.innerHTML = '';
    chipsEl.innerHTML = '';
    countEl.textContent = '';
    return;
  }
  emptyEl.style.display = 'none';

  chipsEl.innerHTML =
    `<button type="button" class="chip ${activeCategory === 'All' ? 'active' : ''}" data-cat="All">All<em>${matched.length}</em></button>` +
    allCategories.map(c => {
      const n = matched.filter(p => p.category === c).length;
      return `<button type="button" class="chip ${activeCategory === c ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(prettyCategory(c))}<em>${n}</em></button>`;
    }).join('');

  const term = searchTerm.trim().toLowerCase();
  const visible = matched.filter(p => {
    if (activeCategory !== 'All' && p.category !== activeCategory) return false;
    if (!term) return true;
    return (p.name + ' ' + (p.description || '') + ' ' + p.category).toLowerCase().includes(term);
  });

  if (!visible.length){
    grid.innerHTML = '<p class="empty-msg">No products match your search. Try a different word or choose another category.</p>';
    countEl.textContent = '';
    return;
  }

  countEl.textContent = `Showing ${visible.length} of ${matched.length} products`;

  const categories = allCategories.filter(c => visible.some(p => p.category === c));
  grid.innerHTML = categories.map(category => {
    const items = visible.filter(p => p.category === category);
    return `
    <section class="product-category" id="${categorySlug(category)}">
      <div class="cat-head">
        <h3>${escapeHtml(prettyCategory(category))}</h3>
        <span>${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
      </div>
      <div class="products-grid">
        ${items.map(p => `
          <article class="product-card${p.out ? ' is-out' : ''}">
            <div class="product-thumb">${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentNode.textContent='${escapeHtml(initials(p.name))}'">` : escapeHtml(initials(p.name))}${p.out ? '<span class="out-badge">Out of stock</span>' : ''}</div>
            <div class="product-body">
              <h4>${escapeHtml(p.name)}</h4>
              ${p.description ? `<p class="product-desc">${escapeHtml(p.description)}</p>` : ''}
              <div class="product-meta">
                <span class="price">${p.priceLabel || `₱${formatPrice(p.price)}`}</span>
              </div>
              ${p.live ? `<button type="button" class="btn btn-primary add-btn" data-id="${escapeHtml(p.id)}" ${p.out ? 'disabled' : ''}>${p.out ? 'Unavailable' : 'Add to Order'}</button>` : ''}
            </div>
          </article>`).join('')}
      </div>
    </section>`;
  }).join('');
}

document.getElementById('productsGrid').addEventListener('click', function(e){
  const btn = e.target.closest('.add-btn');
  if (!btn || !window.KMCart) return;
  const p = products.find(x => String(x.id) === btn.getAttribute('data-id'));
  if (p && !p.out) window.KMCart.add(p);
});
window.setCatalog = function(list){ products = list; renderProducts(); };

document.getElementById('categoryChips').addEventListener('click', function(e){
  const btn = e.target.closest('.chip');
  if (!btn) return;
  activeCategory = btn.getAttribute('data-cat');
  renderProducts();
  const active = document.querySelector('#categoryChips .chip.active');
  if (active && active.scrollIntoView) active.scrollIntoView({block:'nearest', inline:'center'});
});
document.getElementById('productSearch').addEventListener('input', function(){
  searchTerm = this.value;
  renderProducts();
});

// Mobile menu
(function(){
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('siteNav');
  toggle.addEventListener('click', function(){
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.addEventListener('click', function(e){
    if (e.target.tagName === 'A'){
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

// Back to top
(function(){
  const btn = document.getElementById('toTop');
  window.addEventListener('scroll', function(){ btn.classList.toggle('show', window.scrollY > 500); });
  btn.addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); });
})();

// Contact form: validates, then opens the visitor's email app with the message filled in
document.getElementById('contactForm').addEventListener('submit', function(e){
  e.preventDefault();
  const nameEl = document.getElementById('cName');
  const emailEl = document.getElementById('cEmail');
  const msgEl = document.getElementById('cMessage');
  const box = document.getElementById('contactMsg');
  [nameEl, emailEl, msgEl].forEach(el => el.classList.remove('invalid'));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim());
  if (!nameEl.value.trim()) nameEl.classList.add('invalid');
  if (!emailOk) emailEl.classList.add('invalid');
  if (!msgEl.value.trim()) msgEl.classList.add('invalid');

  if (!nameEl.value.trim() || !emailOk || !msgEl.value.trim()){
    box.className = 'alert alert-danger';
    box.textContent = 'Please fill in your name, a valid email and your message.';
    box.style.display = 'block';
    return;
  }
  const subject = encodeURIComponent('Inquiry from ' + nameEl.value.trim());
  const body = encodeURIComponent(msgEl.value.trim() + '\n\nFrom: ' + nameEl.value.trim() + ' (' + emailEl.value.trim() + ')');
  window.location.href = 'mailto:kmsfrozengoods@gmail.com?subject=' + subject + '&body=' + body;
  box.className = 'alert alert-success';
  box.textContent = 'Thank you! Your email app should open with your message ready to send.';
  box.style.display = 'block';
  this.reset();
});

renderProducts();
