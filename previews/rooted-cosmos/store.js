'use strict';

const products = [
  { id: 'dawn', name: 'Dawn', flavor: 'Watermelon Hydration', description: 'Light and bright watermelon for hot days and long sessions.', stock: 36, base: 'Coconut water', color: '#f5dacf' },
  { id: 'all-day', name: 'All Day', flavor: 'Matcha Cloud', description: 'Coconut water and a layer of matcha. Contains caffeine.', stock: 24, base: 'Coconut water', color: '#dfe9d3' },
  { id: 'daytime', name: 'Daytime', flavor: 'Lemon Renew', description: 'A crisp lemon stack mixed with your choice of water.', stock: 40, base: 'Alkaline water', color: '#f9efc8' },
  { id: 'constellation', name: 'Constellation', flavor: 'Beet Recovery', description: 'A bold beet stack for the end of the day.', stock: 5, base: 'Coconut water', color: '#efdeeb' }
];

const sampleEvents = [
  { id: 'eastvale', name: 'Eastvale Run Club', city: 'Eastvale', month: 'Nov', day: 17 },
  { id: 'market', name: 'Boujee Friendly Market', city: 'Ontario', month: 'Nov', day: 21 },
  { id: 'peerless', name: 'Peerless Open Mat', city: 'Corona', month: 'Nov', day: 22 }
];

const sampleZones = [
  { name: 'Pomona area', fee: 399, zips: ['91766', '91767', '91768', '91711', '91750', '91763'] },
  { name: 'Eastvale & nearby', fee: 599, zips: ['91761', '91762', '91764', '91708', '91710', '91765', '91786', '91784', '92880'] }
];

const stages = {
  pickup: ['Order received', 'Packing your drinks', 'Ready at the booth', 'Picked up'],
  delivery: ['Order received', 'Packing your drinks', 'Assigned to crew', 'Out for delivery', 'Delivered']
};

const storageKey = 'rooted-cosmos-studio-v1';
const price = 800;
const pairPrice = 1500;
const windows = ['10 a.m.–noon', '4–6 p.m.'];
const crewId = 'marco';
const accents = { Cobalt: '#2335dc', Black: '#171917', Watermelon: '#a71d4b', Matcha: '#3c6127', Beet: '#801b47' };
const dayKey = timestamp => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
const $ = (selector, root = document) => root.querySelector(selector);
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#${name}"/></svg>`;
const productFor = id => products.find(product => product.id === id);
const eventFor = id => state.events.find(event => event.id === id);
const zoneFor = zip => state.zones.find(zone => zone.zips.includes(String(zip ?? '').trim()));
const eventLabel = event => `${event.name} · ${event.month} ${event.day}, ${event.city}`;

function initialState() {
  return {
    cart: [], mode: 'pickup', event: '', zip: '', nextId: 1050, latest: null,
    stock: Object.fromEntries(products.map(product => [product.id, product.stock])),
    orders: [
      { id: 1048, name: 'Sample customer', mode: 'pickup', stage: 0, where: eventLabel(sampleEvents[0]), total: 1500, items: [{ id: 'dawn', qty: 2 }] },
      { id: 1049, name: 'Sample customer', mode: 'delivery', stage: 2, where: 'Eastvale · 4–6 p.m.', total: 2099, items: [{ id: 'daytime', qty: 2 }] }
    ],
    inquiries: []
  };
}

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.cart && saved?.stock && saved?.orders && saved?.inquiries) return migrateState(saved);
  } catch {}
  return migrateState(initialState());
}

function migrateState(saved) {
  if (saved.managerVersion === 1) return saved;
  const now = Date.now();
  Object.assign(saved, {
    managerVersion: 1, events: sampleEvents.map(event => ({ ...event, open: true })),
    zones: sampleZones.map(zone => ({ ...zone })),
    settings: { minimum: 1500, freeDelivery: 4000, windowLimit: 6, deliveryPaused: false, paused: false, tax: 0, announcement: '', accent: 'Cobalt', sound: false },
    menu: Object.fromEntries(products.map(product => [product.id, { price, sale: 0, enabled: true }])),
    drivers: [{ id: crewId, name: 'Marco R.', available: true }, { id: 'jess', name: 'Jess T.', available: true }],
    stockLog: [], promotions: [
      { code: 'RUNCLUB', type: 'free', amount: 0, min: 1500, limit: 100, uses: 0, expires: '', active: true },
      { code: 'EJI10', type: 'percent', amount: 10, min: 0, limit: 300, uses: 0, expires: '', active: true }
    ]
  });
  for (const order of saved.orders) {
    order.created ??= now;
    order.eventId ??= sampleEvents.find(event => eventLabel(event) === order.where)?.id ?? '';
    if (order.mode === 'delivery') {
      order.window ??= windows.find(window => order.where.endsWith(window)) ?? '';
      if (order.stage >= 2) order.driver ??= crewId;
    }
  }
  const samples = [
    { id: 1047, name: 'Priya N.', age: 1, stage: 1, key: 'peerless', items: [{ id: 'constellation', qty: 2 }] },
    { id: 1046, name: 'Mia K.', age: 2, stage: 2, key: 'market', items: [{ id: 'daytime', qty: 2 }] },
    { id: 1045, name: 'Grace H.', age: 3, stage: 3, items: [{ id: 'dawn', qty: 2 }, { id: 'all-day', qty: 2 }] },
    { id: 1044, name: 'Zoe A.', age: 4, stage: 3, key: 'market', items: [{ id: 'dawn', qty: 2 }] },
    { id: 1043, name: 'Omar F.', age: 27, stage: 4, items: [{ id: 'all-day', qty: 3 }] },
    { id: 1042, name: 'Leo S.', age: 51, stage: 3, key: 'eastvale', items: [{ id: 'daytime', qty: 4 }] }
  ];
  for (const sample of samples) {
    const { key, age, ...order } = sample;
    const event = sampleEvents.find(item => item.id === key);
    const count = order.items.reduce((sum, item) => sum + item.qty, 0);
    saved.orders.push({ ...order, created: now - age * 3600000, eventId: key ?? '', mode: key ? 'pickup' : 'delivery',
      where: event ? eventLabel(event) : 'Pomona area · 10 a.m.–noon',
      total: count * price - Math.floor(count / 2) * 100 + (key ? 0 : 399),
      ...(key ? {} : { driver: crewId, window: windows[0], address: '123 Example St' }) });
  }
  return saved;
}

let state = readState();
let view = '';
let noticeTimeout;
const overlay = $('#overlay');
const dialogBody = $('#dialog-body');

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
}

function message(text) {
  window.clearTimeout(noticeTimeout);
  $('#notice').textContent = text;
  noticeTimeout = window.setTimeout(() => { $('#notice').textContent = ''; }, 3200);
}

function unitPrice(id) {
  const product = state.menu[id];
  return Math.round(product.price * (100 - product.sale) / 100);
}

function pickupEvents() {
  return state.events.filter(event => event.open);
}

function availableStock(id) {
  if (!state.menu[id].enabled) return 0;
  return state.stock[id] ?? Infinity;
}

function statusSteps(order) {
  if (order.mode === 'pickup' || order.driver) return stages[order.mode];
  return stages.delivery.map((step, index) => index === 2 ? 'Ready for driver' : step);
}

function activeOrder(order) {
  return !order.closed && order.stage < stages[order.mode].length - 1;
}

function windowIsFull(window) {
  return state.orders.filter(order => order.mode === 'delivery' && order.window === window
    && dayKey(order.created) === dayKey(Date.now()) && !order.closed).length >= state.settings.windowLimit;
}

function totals(items = state.cart, zone, mode = state.mode, code = '', applyTax = false) {
  const prices = items.flatMap(line => Array(line.qty).fill(unitPrice(line.id))).sort((a, b) => b - a);
  const count = prices.length;
  const subtotal = prices.reduce((sum, cents) => sum + cents, 0);
  let discount = 0;
  for (let i = 0; i + 1 < count; i += 2) discount += Math.max(0, prices[i] + prices[i + 1] - pairPrice);
  const base = subtotal - discount;
  const promoCode = code.trim().toUpperCase();
  const promo = state.promotions.find(entry => entry.code === promoCode && entry.active
    && (!entry.limit || entry.uses < entry.limit) && (!entry.expires || entry.expires >= dayKey(Date.now()))
    && base >= entry.min && (entry.type !== 'free' || mode === 'delivery'));
  const promoError = promoCode && !promo ? 'This promo code is unavailable for this order.' : '';
  const savings = promo?.type === 'percent' ? Math.round(base * promo.amount / 100)
    : promo?.type === 'fixed' ? Math.min(promo.amount, base) : 0;
  const net = base - savings;
  const fee = mode === 'delivery' && zone && net < state.settings.freeDelivery && promo?.type !== 'free' ? zone.fee : 0;
  const tax = applyTax ? Math.round(net * state.settings.tax / 100) : 0;
  return { count, subtotal, discount, savings, net, fee, tax, total: net + fee + tax, promo: promo?.code, promoError };
}

function setStock(id, value, reason) {
  const before = state.stock[id];
  if (before === value) return;
  state.stock[id] = value;
  state.stockLog.unshift({ id, before, value, reason, at: Date.now() });
  state.stockLog = state.stockLog.slice(0, 40);
}

function recordOrder(details, items, quote) {
  const order = {
    id: state.nextId++, created: Date.now(), stage: 0, total: quote.total, quote,
    items: items.map(line => ({ ...line, unit: unitPrice(line.id) })), ...details
  };
  state.orders.unshift(order);
  for (const line of order.items) {
    if (state.stock[line.id] !== null) setStock(line.id, state.stock[line.id] - line.qty, 'Order #' + order.id);
  }
  const promo = state.promotions.find(entry => entry.code === quote.promo);
  if (promo) promo.uses++;
  return order;
}

function reserved(id) {
  return state.cart.filter(line => line.id === id).reduce((sum, line) => sum + line.qty, 0);
}

function updateBag() {
  const quote = totals();
  $('#bag-count').textContent = quote.count;
  $('#mobile-bag').hidden = quote.count === 0;
  $('#mobile-bag-value').textContent = `${quote.count} ${quote.count === 1 ? 'drink' : 'drinks'} · ${money(quote.net)}`;
}

function renderStore() {
  const announcement = state.settings.paused ? 'Online orders are paused.' : state.settings.announcement;
  $('#shop-announcement').textContent = announcement;
  $('#shop-announcement').hidden = !announcement;
  document.body.style.setProperty('--shop-accent', accents[state.settings.accent] ?? accents.Cobalt);
  $('#flavors').innerHTML = products.map((product, index) => {
    const stock = availableStock(product.id);
    const note = stock === 0 ? 'Sold out' : stock <= 5 ? `${stock} left` : '';
    return `<article class="flavor">
      <div class="flavor-photo" style="--swatch:${product.color};--index:${index}">
        <img src="media/${product.id}.webp" alt="" width="460" height="400" data-flavor-img>
        ${note ? `<span class="flavor-stock">${note}</span>` : ''}
      </div>
      <div class="flavor-info">
        <div class="flavor-head"><h3>${product.name}</h3><strong>${money(unitPrice(product.id))}</strong></div>
        <p>${product.flavor}</p>
        <button class="button outline" type="button" data-product="${product.id}" aria-label="Customize ${product.name}" ${stock ? '' : 'disabled'}>${stock ? 'Customize' : 'Sold out'} ${icon('plus')}</button>
      </div>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-flavor-img]').forEach(img => {
    const useFallback = () => {
      img.parentElement.classList.add('fallback');
      img.src = 'media/photo-2.webp';
    };
    img.addEventListener('error', useFallback, { once: true });
    if (img.complete && !img.naturalWidth) useFallback();
  });

  $('#events').innerHTML = state.events.map(event => `<article class="event-row">
    <div class="date" aria-label="${event.month} ${event.day}"><span>${event.month}</span><b>${event.day}</b></div>
    <div><strong>${escapeHtml(event.name)}</strong><p>${escapeHtml(event.city)}, CA</p></div>
    <button class="button outline" data-pickup="${event.id}" aria-label="${event.open ? 'Preorder for ' : 'Preorders closed for '}${escapeHtml(event.name)}" ${event.open && !state.settings.paused ? '' : 'disabled'}>${event.open ? 'Preorder' : 'Preorders closed'} ${icon('diagonal')}</button>
  </article>`).join('');
  updateBag();
}

function show(name, title, html, wide = false) {
  view = name;
  $('#dialog-title').textContent = title;
  overlay.classList.toggle('wide', wide);
  dialogBody.innerHTML = html;
  if (!overlay.open) overlay.showModal();
  overlay.scrollTop = 0;
}

function productDialog(id) {
  const product = productFor(id);
  const available = Math.min(999, Math.max(0, availableStock(id) - reserved(id)));
  const options = ['Coconut water', 'Alkaline water'].map(base =>
    `<label class="radio-option"><input type="radio" name="base" value="${base}" ${product.base === base ? 'checked' : ''}> ${base}</label>`
  ).join('');
  show('product', product.name, `<form class="panel-form" id="product-form" data-id="${id}">
    <p><strong>${product.flavor} · ${money(unitPrice(id))}</strong><br>${product.description}</p>
    <fieldset><legend>Choose your base</legend><div class="options">${options}</div></fieldset>
    <fieldset><legend>Leave out of this drink</legend><div class="options">
      <label class="check-option"><input type="checkbox" name="omit" value="Lion’s mane"> Lion’s mane</label>
      <label class="check-option"><input type="checkbox" name="omit" value="L-theanine"> L-theanine</label>
    </div></fieldset>
    ${available ? `<label>Quantity
      <input name="qty" type="number" min="1" max="${available}" step="1" value="1" required>
    </label><button type="submit" class="button">Add to bag <span id="product-price">${money(unitPrice(id))}</span></button>`
    : '<p class="demo-note">All available cans of this flavor are in your bag.</p><button type="button" class="button" data-open="cart">View bag</button>'}
  </form>`);
}

function addProduct(form) {
  const data = new FormData(form);
  const id = form.dataset.id;
  const qty = Number(data.get('qty'));
  if (!Number.isInteger(qty) || qty < 1 || reserved(id) + qty > Math.min(999, availableStock(id))) return;
  const base = data.get('base');
  const omit = data.getAll('omit');
  const key = `${id}|${base}|${omit.join(',')}`;
  const existing = state.cart.find(line => line.key === key);
  if (existing) existing.qty += qty;
  else state.cart.push({ key, id, qty, base, omit });
  save();
  updateBag();
  overlay.close();
  message(`${qty} × ${productFor(id).name} added to your bag`);
}

function quoteHtml(quote, label = 'Subtotal', showDelivery = false) {
  return `<div><span>Drinks</span><span>${money(quote.subtotal)}</span></div>
    ${quote.discount ? `<div class="discount"><span>2 for $15 offer</span><span>−${money(quote.discount)}</span></div>` : ''}
    ${quote.savings ? `<div class="discount"><span>${escapeHtml(quote.promo)}</span><span>−${money(quote.savings)}</span></div>` : ''}
    ${quote.tax ? `<div><span>Tax</span><span>${money(quote.tax)}</span></div>` : ''}
    ${showDelivery ? `<div><span>Delivery</span><span>${quote.fee ? money(quote.fee) : 'Free'}</span></div>` : ''}
    <div class="total"><span>${label}</span><span>${money(quote.total)}</span></div>`;
}

function cartDialog() {
  if (!state.cart.length) {
    show('cart', 'Your bag', '<div class="panel-form"><p>Your bag is empty.</p><a href="#menu" class="button" data-close>Browse the menu</a></div>');
    return;
  }
  const quote = totals();
  const lines = state.cart.map((line, index) => {
    const product = productFor(line.id);
    const modifiers = line.omit.map(item => ` · no ${escapeHtml(item)}`).join('');
    return `<div class="cart-item">
      <div><strong>${product.name}</strong><p>${escapeHtml(line.base)}${modifiers}</p></div>
      <strong>${money(line.qty * unitPrice(line.id))}</strong>
      <div class="quantity">
        <button type="button" data-adjust="${index}" data-delta="-1" aria-label="Decrease ${product.name} quantity">−</button><span>${line.qty}</span>
        <button type="button" data-adjust="${index}" data-delta="1" aria-label="Increase ${product.name} quantity" ${reserved(line.id) >= Math.min(999, availableStock(line.id)) ? 'disabled' : ''}>+</button>
      </div><button type="button" data-remove="${index}">Remove</button>
    </div>`;
  }).join('');
  const hint = quote.count % 2 ? '<p class="demo-note">Add another drink to make a $15 pair.</p>' : '';
  show('cart', 'Your bag', `${lines}${hint}<div class="totals">${quoteHtml(quote)}</div>
    <div class="row"><a class="button outline" href="#menu" data-close>Keep browsing</a><button class="button" data-open="checkout">Checkout ${icon('arrow')}</button></div>`);
}

function changeQuantity(index, delta) {
  const line = state.cart[index];
  if (!line || (delta > 0 && reserved(line.id) + delta > Math.min(999, availableStock(line.id)))) return;
  line.qty += delta;
  if (line.qty <= 0) state.cart.splice(index, 1);
  save();
  updateBag();
  cartDialog();
  const matching = `[data-adjust="${index}"][data-delta="${delta}"]`;
  ($(matching, dialogBody) || $('.button', dialogBody))?.focus();
}

function checkoutDialog() {
  if (!state.cart.length) return cartDialog();
  show('checkout', 'Checkout', `<form class="panel-form" id="checkout-form">
    <p class="demo-note">This is a sample order. Use the demo details below to try checkout.</p>
    <fieldset><legend>How will you get your order?</legend><div class="options">
      <label class="radio-option"><input type="radio" name="mode" value="pickup" ${state.mode === 'pickup' ? 'checked' : ''}> Event pickup</label>
      <label class="radio-option"><input type="radio" name="mode" value="delivery" ${state.mode === 'delivery' ? 'checked' : ''}> Local delivery</label>
    </div></fieldset>
    <div id="pickup-fields"><label>Pickup event<select name="event" required><option value="">Choose an event</option>${pickupEvents().map(event =>
      `<option value="${event.id}" ${state.event === event.id ? 'selected' : ''}>${escapeHtml(eventLabel(event))}</option>`
    ).join('')}</select></label></div>
    <div class="fields" id="delivery-fields">
      <label>Delivery ZIP<input name="zip" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" value="${escapeHtml(state.zip)}" placeholder="92880" required></label>
      <label>Delivery window<select name="window" required><option value="">Choose a window</option>${windows.map(window => `<option value="${window}" ${windowIsFull(window) ? 'disabled' : ''}>${window}${windowIsFull(window) ? ' · full' : ''}</option>`).join('')}</select></label>
      <label class="span-all">Delivery address<input name="address" placeholder="123 Example St" required></label>
    </div>
    <div class="fields"><label>Name<input name="name" maxlength="45" placeholder="Sample Customer" required></label>
    <label>Email<input type="email" name="email" placeholder="demo@example.com" required></label></div>
    <label>Promo code <span class="field-help">Optional</span><input name="promo" maxlength="16"></label>
    <button type="button" class="button outline" data-action="demo-details">Use sample details</button>
    <p class="alert" id="checkout-error" role="alert"></p>
    <div class="totals" id="checkout-total"></div>
    <button class="button" type="submit">Place demo order ${icon('arrow')}</button>
  </form>`);
  updateCheckout();
}

function checkoutMode(form) {
  return form.elements.mode.value;
}

function updateCheckout() {
  const form = $('#checkout-form');
  const mode = checkoutMode(form);
  const delivery = mode === 'delivery';
  $('#delivery-fields').hidden = !delivery;
  $('#pickup-fields').hidden = delivery;
  [...$('#delivery-fields').querySelectorAll('input,select')].forEach(input => { input.disabled = !delivery; });
  form.elements.event.disabled = delivery;
  const zip = form.elements.zip.value;
  const zone = delivery ? zoneFor(zip) : undefined;
  const quote = totals(state.cart, zone, mode, form.elements.promo.value, true);
  $('#checkout-error').textContent = checkoutProblem(mode, zone, quote, zip);
  $('#checkout-total').innerHTML = quoteHtml(quote, 'Order total', Boolean(zone));
}

function checkoutProblem(mode, zone, quote, zip) {
  if (state.settings.paused) return 'Online orders are paused.';
  if (mode === 'delivery') {
    if (state.settings.deliveryPaused) return 'Delivery is paused.';
    if (!zone && zip.trim().length === 5) return 'That ZIP is outside the sample delivery area.';
  }
  if (quote.promoError) return quote.promoError;
  if (mode === 'delivery' && quote.net < state.settings.minimum) {
    return `Delivery has a ${money(state.settings.minimum)} minimum after discounts.`;
  }
  return '';
}

function placeOrder(form) {
  const data = new FormData(form);
  const mode = data.get('mode');
  const zip = data.get('zip') ?? '';
  const zone = mode === 'delivery' ? zoneFor(zip) : undefined;
  const quote = totals(state.cart, zone, mode, data.get('promo'), true);
  const pickup = eventFor(data.get('event'));
  const deliveryWindow = data.get('window');
  const name = data.get('name').trim();
  let error = checkoutProblem(mode, zone, quote, zip);
  if (!error) {
    if (!quote.count) error = 'Add a drink to your bag first.';
    else if (products.some(product => reserved(product.id) > availableStock(product.id))) {
      error = 'Stock changed. Adjust your bag before checking out.';
    } else if (!name) error = 'Enter a name or use the sample details.';
    else if (mode === 'delivery' && (!zone || !windows.includes(deliveryWindow) || windowIsFull(deliveryWindow) || !data.get('address').trim())) {
      error = 'Choose a valid ZIP, delivery address, and available window.';
    } else if (mode === 'pickup' && !pickup?.open) error = 'Choose an event that’s taking preorders.';
  }
  if (error) {
    $('#checkout-error').textContent = error;
    return;
  }
  const details = { name, mode, eventId: pickup?.id ?? '', where: pickup ? eventLabel(pickup) : `${zone.name} · ${deliveryWindow}` };
  if (mode === 'delivery') Object.assign(details, { address: data.get('address').trim(), window: deliveryWindow, driver: null });
  const order = recordOrder(details, state.cart, quote);
  state.latest = order.id;
  state.mode = mode;
  state.event = details.eventId;
  if (mode === 'delivery') state.zip = zip;
  state.cart = [];
  save();
  renderStore();
  window.dispatchEvent(new Event('rooted-order-created'));
  trackingDialog(order.id, true);
}

function itemsLabel(order) {
  return order.items.map(line => {
    const modifiers = line.base ? ` (${line.base}${(line.omit ?? []).map(item => `, no ${item}`).join('')})` : '';
    return escapeHtml(`${line.qty} × ${productFor(line.id).name}${modifiers}`);
  }).join(' · ');
}

function trackingDialog(id = state.latest, confirmed = false, missing = false) {
  const order = state.orders.find(item => item.id === Number(id));
  const status = order ? `<article class="order-card">
    <h3>Order #${order.id} · ${escapeHtml(order.where)}</h3><p>${itemsLabel(order)}</p>
    ${order.closed ? `<p class="alert"><strong>${order.closed === 'cancelled' ? 'Order cancelled' : 'Order refunded'}</strong></p>`
    : `<ol class="track-list">${statusSteps(order).map((step, index) =>
      `<li ${index <= order.stage ? 'class="done"' : ''} ${index === order.stage ? 'aria-current="step"' : ''}>${index < order.stage ? icon('check') + ' ' : ''}${step}</li>`
    ).join('')}</ol>`}<strong>${money(order.total)}</strong>
    ${order.refunded ? `<p>Demo refund · ${money(order.refunded)}</p>` : ''}
  </article>` : '';
  show('track', confirmed ? 'Demo order placed' : 'Track a demo order', `${status}
    <form class="panel-form" id="track-form">
      <label>Order number<input type="text" inputmode="numeric" pattern="[0-9]+" name="number" placeholder="1048" value="${id ? escapeHtml(id) : ''}" required></label>
      ${missing ? '<p class="alert" role="alert">This browser has no demo order with that number.</p>' : ''}
      <div class="row"><button class="button" type="submit">Check status</button>${order ? '<button class="button outline" type="button" data-open="manager">Open store manager</button>' : ''}</div>
    </form>`);
}

function driverOrderCard(order) {
  const next = { 2: 'Start delivery', 3: 'Confirm delivered' }[order.stage];
  return `<article class="order-card">
    <div class="row"><h3>#${order.id} · ${escapeHtml(order.name)}</h3><strong>${money(order.total)}</strong></div>
    <p>${escapeHtml(order.where)}${order.address ? ` · ${escapeHtml(order.address)}` : ''}</p>
    <p>${itemsLabel(order)}</p>
    <div class="row"><strong>${statusSteps(order)[order.stage]}</strong><div class="row">
      <button class="button outline" data-track="${order.id}">Track</button>
      ${next ? `<button class="button" data-stage="${order.id}">${next}</button>` : ''}
    </div></div>
  </article>`;
}

function driverDialog() {
  const deliveries = state.orders.filter(order => order.mode === 'delivery' && order.stage >= 2 && order.driver && !order.closed);
  show('driver', 'Driver view', `<p class="demo-note">Sample crew workspace · orders appear here once the store manager assigns them.</p>
    ${deliveries.map(driverOrderCard).join('') || '<p>No deliveries assigned.</p>'}`);
}

function bookingDialog() {
  show('booking', 'Invite the crew', `<form class="panel-form" id="booking-form">
    <p class="demo-note">Sample request. It appears in the store manager’s event view.</p>
    <div class="fields"><label>Your name<input name="name" required maxlength="50"></label>
    <label>Email<input type="email" name="email" required></label>
    <label>Event or organization<input name="event" maxlength="80" required></label>
    <label>Event date<input name="date" type="date"></label></div>
    <button class="button" type="submit">Submit sample request</button>
  </form>`);
}

const dialogs = { cart: cartDialog, checkout: checkoutDialog, track: () => trackingDialog(), driver: driverDialog, booking: bookingDialog };

function selectFulfillment(mode, value) {
  state.mode = mode;
  if (mode === 'pickup') state.event = value;
  if (mode === 'delivery') state.zip = value;
  save();
  if (state.cart.length) checkoutDialog();
  else {
    window.location.hash = 'menu';
    message(mode === 'pickup' ? `${eventFor(value).name} selected. Add a drink to start your order.` : 'Delivery selected. Add a drink to start your order.');
  }
}

document.addEventListener('click', event => {
  const control = event.target.closest('button,a');
  if (!control) return;
  const action = control.dataset;
  if ('close' in action) overlay.close();
  if (action.open === 'manager') {
    if (overlay.open) overlay.close();
    if (location.hash !== '#storemanager') location.hash = 'storemanager';
    else $('#manager-title')?.focus();
  } else if (action.open) dialogs[action.open]?.();
  if (action.product) productDialog(action.product);
  if (action.pickup) selectFulfillment('pickup', action.pickup);
  if (action.action === 'start-delivery') selectFulfillment('delivery', $('#delivery-zip').value.trim());
  if (action.adjust !== undefined) changeQuantity(Number(action.adjust), Number(action.delta));
  if (action.remove !== undefined) changeQuantity(Number(action.remove), -state.cart[Number(action.remove)].qty);
  if (action.track) trackingDialog(action.track);
  if (action.stage && view === 'driver') {
    const order = state.orders.find(item => item.id === Number(action.stage));
    if (order?.mode === 'delivery' && order.driver && !order.closed && [2, 3].includes(order.stage)) {
      order.stage++;
      if (order.stage === 4) order.fulfilledAt = Date.now();
      save();
      if (location.hash === '#storemanager') window.dispatchEvent(new Event('rooted-driver-updated'));
      driverDialog();
      const next = $(`[data-stage="${order.id}"]`, dialogBody);
      (next || $('.close', overlay))?.focus();
    }
  }
  if (action.action === 'demo-details') {
    const form = $('#checkout-form');
    form.elements.name.value = 'Sample Customer';
    form.elements.email.value = 'demo@example.com';
    if (checkoutMode(form) === 'delivery') {
      form.elements.zip.value ||= '92880';
      form.elements.address.value = '123 Example St';
      if (!form.elements.window.value) form.elements.window.value = [...windows].reverse().find(window => !windowIsFull(window)) ?? '';
    } else form.elements.event.value ||= pickupEvents()[0]?.id ?? '';
    updateCheckout();
  }
});

overlay.addEventListener('click', event => {
  if (event.target === overlay) overlay.close();
});
overlay.addEventListener('close', () => { view = ''; });

document.addEventListener('input', event => {
  const control = event.target;
  if (control.form?.id === 'checkout-form' && ['zip', 'promo'].includes(control.name)) updateCheckout();
  if (control.id === 'delivery-zip') {
    $('#zip-result').textContent = '';
    $('[data-action="start-delivery"]').hidden = true;
  }
  if (control.form?.id === 'product-form' && control.name === 'qty') {
    $('#product-price').textContent = money(unitPrice(control.form.dataset.id) * (Number(control.value) || 1));
  }
});

document.addEventListener('change', event => {
  const control = event.target;
  if (control.form?.id === 'checkout-form' && control.name === 'mode') {
    state.mode = checkoutMode(control.form);
    save();
    updateCheckout();
  }
});

document.addEventListener('submit', event => {
  const form = event.target;
  if (!['product-form', 'checkout-form', 'track-form', 'zip-check', 'booking-form'].includes(form.id)) return;
  event.preventDefault();
  if (form.id === 'product-form') addProduct(form);
  if (form.id === 'checkout-form') placeOrder(form);
  if (form.id === 'track-form') {
    const id = form.elements.number.value;
    trackingDialog(id, false, !state.orders.some(order => order.id === Number(id)));
  }
  if (form.id === 'zip-check') {
    const zone = zoneFor(form.elements.zip.value);
    const paused = state.settings.deliveryPaused || state.settings.paused;
    $('#zip-result').textContent = paused ? 'Delivery is paused.'
      : zone ? `${zone.name} · ${money(zone.fee)} delivery · Free on orders of ${money(state.settings.freeDelivery)} or more.`
      : 'That ZIP is outside the sample delivery area.';
    $('[data-action="start-delivery"]').hidden = paused || !zone;
  }
  if (form.id === 'booking-form') {
    const data = new FormData(form);
    if (!data.get('name').trim() || !data.get('event').trim()) return;
    state.inquiries.push({ name: data.get('name').trim(), event: data.get('event').trim(), date: data.get('date') });
    save();
    show('booking', 'Sample request saved', '<div class="panel-form"><p>Find it under Events in the store manager.</p><button class="button" data-close>Done</button></div>');
  }
});

save();
renderStore();
