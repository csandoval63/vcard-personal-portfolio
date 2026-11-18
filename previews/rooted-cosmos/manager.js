'use strict';

const managerTabs = [
  ['overview', 'Overview'], ['orders', 'Orders'], ['events', 'Events'], ['menu', 'Menu and stock'],
  ['delivery', 'Delivery'], ['promotions', 'Promotions'], ['website', 'Website']
];
const manager = $('#store-manager');
const managerBody = $('#manager-body');
let managerTab = 'overview';
let orderFilter = 'all';
let orderQuery = '';
let orderAudio;
let directDialog;
const demoLinks = { '#driver': driverDialog, '#track': trackingDialog, '#checkout': checkoutDialog };

const managerTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
const managerDay = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Los_Angeles' });
const managerMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

function updatePage() {
  const nextDialog = demoLinks[location.hash];
  if (directDialog && directDialog !== nextDialog && overlay.open) overlay.close();
  directDialog = nextDialog;
  const wasOpen = !manager.hidden;
  const open = location.hash === '#storemanager';
  manager.hidden = !open;
  document.body.classList.toggle('manager-open', open);
  if (open) {
    renderManager();
    if (!wasOpen) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      $('#manager-title').focus({ preventScroll: true });
    }
  } else if (wasOpen && (location.hash === '' || location.hash === '#')) {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  if (directDialog) directDialog();
}

overlay.addEventListener('close', () => {
  if (!overlay.open && directDialog && demoLinks[location.hash] === directDialog) {
    history.replaceState(null, '', location.pathname + location.search);
    directDialog = undefined;
  }
});

function renderManager() {
  if (manager.hidden) return;
  const tab = managerTabs.find(([id]) => id === managerTab);
  const tabTitle = managerTab === 'overview' ? 'Store manager' : tab[1];
  managerBody.innerHTML = `<div class="m-owner"><span><strong>Owner preview.</strong> <span class="m-note">Orders, settings, and payments are simulated in this browser.</span></span><span class="m-pill green">Owner view</span></div>
    <div class="m-head"><h1 id="manager-title" tabindex="-1">${tabTitle}</h1><div class="m-actions">
      <button class="m-btn m-ghost" aria-pressed="${state.settings.sound}" data-m-action="sound">${state.settings.sound ? 'Order sound on' : 'Turn on order sound'}</button>
      <button class="m-btn" data-m-action="booth">New booth or phone order</button>
    </div></div>
    <nav class="m-tabs" aria-label="Store manager sections">${managerTabs.map(([id, name]) =>
      `<button type="button" data-m-tab="${id}" aria-current="${id === managerTab ? 'page' : 'false'}">${name}</button>`).join('')}</nav>
    <div id="manager-content">${managerSections[managerTab]()}</div>`;
}

function kpis(entries) {
  return `<div class="m-kpis">${entries.map(([label, value]) =>
    `<div class="m-kpi"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
}

function displayStatus(order) {
  if (order.closed) return order.closed === 'cancelled' ? 'Cancelled' : 'Refunded';
  return statusSteps(order)[order.stage];
}

function revenue(orders) {
  return orders.reduce((total, order) => total + (order.payment === 'Pay at pickup' && activeOrder(order) ? 0 : order.total - (order.refunded ?? 0)), 0);
}

function countsByProduct(orders) {
  const counts = Object.fromEntries(products.map(product => [product.id, 0]));
  for (const order of orders) {
    for (const item of order.items) counts[item.id] += item.qty;
  }
  return counts;
}

function eventOrders(event) {
  return state.orders.filter(order => order.mode === 'pickup' && order.eventId === event.id && activeOrder(order));
}

function packList(orders) {
  const counts = countsByProduct(orders);
  const actual = products.filter(product => counts[product.id]);
  return actual.length ? `<div class="m-packs">${actual.map(product =>
    `<div><strong>${counts[product.id]}</strong>${product.name}</div>`).join('')}</div>`
    : '<p class="m-note">No open preorders.</p>';
}

function barChart(rows, display) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return `<ul class="m-bars">${rows.map(row => `<li><span>${row.label}</span>
    <span class="m-bar-track"><span class="m-bar" style="--bar-width:${row.value / max * 100}%;--bar-color:${row.color ?? '#bebebe'}"></span></span>
    <strong>${display(row.value)}</strong></li>`).join('')}</ul>`;
}

function overview() {
  const now = Date.now();
  const recent = state.orders.filter(order => order.closed !== 'cancelled');
  const today = recent.filter(order => dayKey(order.created) === dayKey(now));
  const days = Array.from({ length: 30 }, (_, index) => now - index * 86400000);
  const dayRevenue = new Map();
  for (const date of days) {
    const key = dayKey(date);
    dayRevenue.set(key, revenue(recent.filter(order => dayKey(order.created) === key)));
  }
  const week = days.slice(0, 7).reverse().map((date, index) => ({
    label: index === 6 ? 'Today' : managerDay.format(date), value: dayRevenue.get(dayKey(date)),
    ...(index === 6 ? { color: '#191919' } : {})
  }));
  const counts = countsByProduct(recent.filter(order => order.closed !== 'refunded'));
  const flavors = products.map(product => ({ label: product.name, value: counts[product.id], color: product.color })).sort((a, b) => b.value - a.value);
  const first = pickupEvents()[0];
  return `${kpis([
    ['Revenue today', money(revenue(today))], ['Last 7 days', money(week.reduce((sum, row) => sum + row.value, 0))],
    ['Last 30 days', money([...dayRevenue.values()].reduce((sum, value) => sum + value, 0))],
    ['Orders today', today.length], ['Average order', money(today.length ? Math.round(revenue(today) / today.length) : 0)],
    ['In progress', state.orders.filter(activeOrder).length]
  ])}
  <div class="m-two">
    <section class="m-panel"><h2>Revenue by day</h2>${barChart(week, money)}
      <h2>Pickup vs. delivery today</h2>
      <div class="m-row"><span>Event pickup</span><strong>${money(revenue(today.filter(order => order.mode === 'pickup')))}</strong></div>
      <div class="m-row"><span>Delivery</span><strong>${money(revenue(today.filter(order => order.mode === 'delivery')))}</strong></div>
    </section>
    <section class="m-panel"><h2>Cans sold by flavor</h2>${barChart(flavors, count => count)}
      ${first ? `<h2>Pack for ${escapeHtml(first.name)}</h2>${packList(eventOrders(first))}` : ''}
    </section>
  </div>`;
}

function orderCardForManager(order) {
  let next = '';
  if (order.stage === 0) next = 'Start packing';
  if (order.stage === 1) next = order.mode === 'pickup' ? 'Packed for event' : 'Ready for driver';
  if (order.stage === 2 && order.mode === 'pickup') next = 'Picked up at booth';
  const canAssign = order.mode === 'delivery' && order.stage === 2;
  const driver = state.drivers.find(item => item.id === order.driver);
  return `<article class="m-order ${order.mode === 'delivery' ? 'm-delivery' : ''}">
    <div class="m-row"><strong>#${order.id} ${escapeHtml(order.name)}</strong><span class="m-pill ${order.mode === 'delivery' ? 'pink' : ''}">${order.mode === 'delivery' ? 'Delivery' : 'Event'}</span></div>
    <p class="m-note">${escapeHtml(order.where)} · ${managerTime.format(order.created)}</p>
    <ul>${order.items.map(line => `<li><strong>${line.qty}× ${productFor(line.id).name}</strong>
      ${line.base ? `<span class="m-note">${escapeHtml(line.base)}</span>` : ''}
      ${line.omit?.length ? `<span class="m-omissions">No ${escapeHtml(line.omit.join(', '))}</span>` : ''}</li>`).join('')}</ul>
    ${order.phone ? `<p class="m-note">${escapeHtml(order.phone)}</p>` : ''}
    ${order.payment ? `<p class="m-note">${escapeHtml(order.payment)}</p>` : ''}
    ${canAssign ? `<label class="m-driver">Driver<select data-m-driver-for="${order.id}" aria-label="Driver for order ${order.id}">
      <option value="">Choose driver</option>${state.drivers.filter(item => item.available || item.id === order.driver).map(item =>
        `<option value="${item.id}" ${item.id === order.driver ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}
    </select></label>` : driver ? `<p class="m-note">${escapeHtml(driver.name)} · ${displayStatus(order)}</p>` : ''}
    <div class="m-actions">${next ? `<button class="m-btn m-small" data-m-advance="${order.id}">${next}</button>` : ''}
      <button class="m-btn m-small m-ghost" data-m-receipt="${order.id}">Receipt</button>
      ${order.stage === 0 ? `<button class="m-btn m-small m-ghost m-danger" data-m-cancel="${order.id}">Cancel</button>` : ''}</div>
  </article>`;
}

function orderBoard() {
  const query = orderQuery.trim().toLowerCase();
  const matches = state.orders.filter(order => (orderFilter === 'all' || order.mode === orderFilter)
    && (!query || `#${order.id} ${order.name} ${order.phone ?? ''}`.toLowerCase().includes(query)));
  const active = matches.filter(activeOrder).sort((a, b) => a.created - b.created);
  const columns = [
    ['New', order => order.stage === 0], ['Packing', order => order.stage === 1],
    ['Packed or waiting for driver', order => order.stage === 2],
    ['Out for delivery', order => order.mode === 'delivery' && order.stage === 3]
  ];
  const finished = matches.filter(order => !activeOrder(order)).sort((a, b) => b.created - a.created);
  return `<div class="m-cols" role="region" aria-label="Active order board" tabindex="0">${columns.map(([name, match]) => {
    const orders = active.filter(match);
    return `<section class="m-col" aria-label="${name}"><h2>${name}<span>${orders.length}</span></h2>
      ${orders.map(orderCardForManager).join('') || '<p class="m-note">Nothing here yet.</p>'}</section>`;
  }).join('')}</div>
  <h2 class="m-heading">Finished</h2>
  ${table(['Order', 'Customer', 'Where', 'Status', 'Total', 'Actions'], finished.map(order => [
    `#${order.id}`, escapeHtml(order.name), escapeHtml(order.where),
    `<span class="m-pill ${order.closed ? 'pink' : 'green'}">${displayStatus(order)}</span>
      ${order.refunded && !order.closed ? '<span class="m-pill amber">Partial refund</span>' : ''}`,
    money(order.total - (order.refunded ?? 0)),
    `<div class="m-actions"><button class="m-btn m-small m-ghost" data-m-receipt="${order.id}">Receipt</button>
      ${!order.closed && (order.refunded ?? 0) < order.total ? `<button class="m-btn m-small m-ghost" data-m-refund="${order.id}">Refund</button>` : ''}</div>`
  ]), 'No finished orders match.')}`;
}

function ordersSection() {
  const filters = [['all', 'All'], ['pickup', 'Event pickup'], ['delivery', 'Delivery']];
  return `<div class="m-search"><input id="manager-search" aria-label="Search orders" placeholder="Search name, phone or #" value="${escapeHtml(orderQuery)}">
    ${filters.map(([id, label]) => `<button class="m-btn m-small ${id === orderFilter ? '' : 'm-ghost'}" data-m-filter="${id}" aria-pressed="${id === orderFilter}">${label}</button>`).join('')}
  </div><div id="manager-board">${orderBoard()}</div>`;
}

function table(headers, rows, empty = 'Nothing here yet.') {
  return `<div class="m-table"><table><thead><tr>${headers.map(heading => `<th scope="col">${heading}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map(cells => `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${headers.length}" class="m-note">${empty}</td></tr>`}</tbody></table></div>`;
}

function toggle(label, attr, checked) {
  return `<label class="m-toggle"><input type="checkbox" ${attr} ${checked ? 'checked' : ''} aria-label="${escapeHtml(label)}"><span aria-hidden="true"></span></label>`;
}

function eventsSection() {
  const open = state.events.filter(event => event.open);
  const closed = state.events.filter(event => !event.open);
  const eventsMarkup = [...open, ...closed].map(event => {
    const orders = eventOrders(event);
    return `<section class="m-panel"><div class="m-row"><div><h2>${escapeHtml(event.name)}</h2><p class="m-note">${event.month} ${event.day} · ${escapeHtml(event.city)} · ${orders.length} open preorders</p></div>
      <div class="m-row">Taking preorders ${toggle(`Taking preorders for ${event.name}`, `data-m-event="${event.id}"`, event.open)}</div></div>${packList(orders)}</section>`;
  }).join('');
  return `<p class="m-intro">Events appear on the storefront. Pack lists count open preorders by flavor.</p>
    ${eventsMarkup}
    <form id="manager-event-form" class="m-panel m-form"><h2>Add an event</h2>
      <div class="m-fields"><label>Event name<input name="name" maxlength="80" required></label><label>City<input name="city" maxlength="50" required></label></div>
      <label>Date<input name="date" type="date" required></label><button class="m-btn">Add to lineup</button>
    </form>
    <section class="m-panel"><h2>Event requests from the website</h2>
      ${state.inquiries.length ? state.inquiries.map(request => `<div class="m-row"><strong>${escapeHtml(request.event)}</strong><span class="m-note">${escapeHtml(request.name)}${request.date ? ' · ' + escapeHtml(request.date) : ''}</span></div>`).join('') : '<p class="m-note">No requests yet.</p>'}
    </section>`;
}

function menuSection() {
  return `<p class="m-intro">Changes show on the storefront immediately. Leave stock blank for an item with no set limit.</p>
    ${table(['Item', 'Price ($)', 'Sale %', 'Stock', 'Available'], products.map(product => {
      const menu = state.menu[product.id];
      const stock = state.stock[product.id];
      return [
        `<strong>${product.name}</strong> <span class="m-note">${product.flavor}</span>
          <span class="m-pill ${stock > 0 ? 'amber' : 'pink'}" data-m-stock-status="${product.id}" ${stock === null || stock > 5 ? 'hidden' : ''}>${stock > 0 ? 'Low' : 'Out'}</span>`,
        `<input type="number" min=".01" max="999" step=".01" aria-label="Price for ${product.name}" data-m-menu="price" data-id="${product.id}" value="${(menu.price / 100).toFixed(2)}">`,
        `<input type="number" min="0" max="90" step="1" aria-label="Sale percent for ${product.name}" data-m-menu="sale" data-id="${product.id}" value="${menu.sale || ''}">`,
        `<input type="number" min="0" max="999" step="1" aria-label="Stock for ${product.name}" data-m-menu="stock" data-id="${product.id}" value="${stock ?? ''}">`,
        toggle(`Available: ${product.name}`, `data-m-menu="enabled" data-id="${product.id}"`, menu.enabled)
      ];
    }))}
    <h2 class="m-heading">Stock changes</h2>
    <div id="manager-stock-log">${stockLog()}</div>`;
}

function stockLog() {
  return table(['Time', 'Item', 'Change', 'Reason'], state.stockLog.slice(0, 12).map(log => [
    managerTime.format(log.at), productFor(log.id).name,
    `${log.before ?? 'Unlimited'} → ${log.value ?? 'Unlimited'}`, escapeHtml(log.reason)
  ]), 'No stock changes yet.');
}

function fixed(value) { return (value / 100).toFixed(2); }

function settingToggle(label, key) {
  return `<div class="m-row m-rule"><span>${label}</span>${toggle(label, `data-m-setting="${key}"`, state.settings[key])}</div>`;
}

function deliverySection() {
  const deliveries = state.orders.filter(order => order.mode === 'delivery' && !order.closed);
  return `${kpis([
    ['Drivers on', `${state.drivers.filter(driver => driver.available).length} of ${state.drivers.length}`],
    ['On the road', deliveries.filter(order => order.stage === 3).length],
    ['Delivered today', deliveries.filter(order => order.stage === 4 && dayKey(order.fulfilledAt ?? order.created) === dayKey(Date.now())).length]
  ])}
  <div class="m-two">
    <section class="m-panel"><h2>Drivers</h2>${state.drivers.map(driver => {
      const assigned = deliveries.filter(order => order.driver === driver.id && activeOrder(order));
      return `<div class="m-row m-rule"><div><strong>${escapeHtml(driver.name)}</strong><p class="m-note">${assigned.length
        ? assigned.map(order => `#${order.id} ${displayStatus(order).toLowerCase()}`).join(', ') : driver.available ? 'Available' : 'Off duty'}</p></div>
        ${toggle(`${driver.name} is available`, `data-m-availability="${driver.id}"`, driver.available)}</div>`;
    }).join('')}
      <form id="manager-driver-form" class="m-form m-add-driver"><label>New driver name<input name="name" maxlength="45" required></label><button class="m-btn">Add demo driver</button></form>
    </section>
    <section class="m-panel"><h2>Delivery zones</h2>
      ${table(['Zone', 'ZIP codes', 'Fee ($)'], state.zones.map((zone, index) => [
        escapeHtml(zone.name), zone.zips.join(', '),
        `<input type="number" min="0" max="999" step=".01" aria-label="Fee for ${escapeHtml(zone.name)}" value="${fixed(zone.fee)}" data-m-zone="${index}">`
      ]))}
      <div class="m-fields m-settings">
        <label>Minimum order ($)<input type="number" min="0" max="999" step=".01" data-m-setting="minimum" value="${fixed(state.settings.minimum)}"></label>
        <label>Free delivery over ($)<input type="number" min="0" max="999" step=".01" data-m-setting="freeDelivery" value="${fixed(state.settings.freeDelivery)}"></label>
      </div>
      <label class="m-field">Deliveries per window<input type="number" min="1" max="200" step="1" data-m-setting="windowLimit" value="${state.settings.windowLimit}"></label>
      ${settingToggle('Pause delivery', 'deliveryPaused')}
    </section>
  </div>`;
}

function promoSection() {
  return `${table(['Code', 'Deal', 'Min spend', 'Used', 'Expires', 'Active'], state.promotions.map(promo => [
    `<strong>${escapeHtml(promo.code)}</strong>`, { percent: `${promo.amount}% off`, fixed: `${money(promo.amount)} off`, free: 'Free delivery' }[promo.type],
    promo.min ? money(promo.min) : 'None', `${promo.uses}${promo.limit ? ' of ' + promo.limit : ''}`,
    escapeHtml(promo.expires) || 'No expiry', toggle(`Activate ${promo.code}`, `data-m-promo="${escapeHtml(promo.code)}"`, promo.active)
  ]))}
  <form id="manager-promo-form" class="m-panel m-form m-settings"><h2>New promo code</h2>
    <div class="m-fields">
      <label>Code<input name="code" maxlength="16" pattern="[A-Za-z0-9]+" required></label>
      <label>Type<select name="type"><option value="percent">Percent off</option><option value="fixed">Dollar amount off</option><option value="free">Free delivery</option></select></label>
      <label>Amount<input name="amount" type="number" min="0" max="999" step=".01" placeholder="10"></label>
      <label>Use limit<input name="limit" type="number" min="0" max="9999" step="1" placeholder="No limit"></label>
      <label>Minimum spend ($)<input name="minimum" type="number" min="0" max="999" step=".01"></label>
      <label>Expires<input name="expires" type="date"></label>
    </div><p class="m-error" role="alert"></p><button class="m-btn">Create code</button>
  </form>`;
}

function siteSection() {
  return `<div class="m-two"><section class="m-panel"><h2>Ordering</h2>
      ${settingToggle('Pause all online orders', 'paused')}
      <label class="m-field">Demo sales tax (%)<input type="number" step=".01" min="0" max="15" data-m-setting="tax" value="${state.settings.tax}"></label>
      <label class="m-field">Announcement banner<textarea rows="2" maxlength="140" data-m-setting="announcement" placeholder="Leave empty to hide">${escapeHtml(state.settings.announcement)}</textarea></label>
    </section><section class="m-panel"><h2>Storefront button accent</h2>
      <div class="m-accents">${Object.entries(accents).map(([name, color]) =>
        `<label><input type="radio" name="shop-color" value="${name}" data-m-setting="accent" ${name === state.settings.accent ? 'checked' : ''}><i style="background:${color}"></i>${name}</label>`).join('')}</div>
      <button class="m-btn m-ghost" data-m-action="reset">Reset demo data</button>
    </section></div>`;
}

const managerSections = { overview, orders: ordersSection, events: eventsSection, menu: menuSection, delivery: deliverySection, promotions: promoSection, website: siteSection };

function managerOrder(id) {
  return state.orders.find(order => order.id === Number(id));
}

function boothDialog() {
  show('booth', 'Booth or phone order', `<form class="panel-form" id="manager-booth-form">
    <p class="demo-note">Use sample details for cash, tap, or phone orders.</p>
    <div class="fields"><label>Customer name<input name="name" required maxlength="45"></label>
    <label>Phone <span class="field-help">Optional</span><input name="phone" type="tel" maxlength="30"></label>
    <label>Flavor<select name="product" required>${products.filter(product => availableStock(product.id) > 0).map(product =>
      `<option value="${product.id}">${product.name}</option>`).join('')}</select></label>
    <label>Quantity<input name="qty" type="number" min="1" max="48" step="1" value="2" required></label>
    <label>Pickup<select name="event"><option value="">At the booth now</option>${pickupEvents().map(event =>
      `<option value="${event.id}">${escapeHtml(eventLabel(event))}</option>`).join('')}</select></label>
    <label>Payment<select name="payment"><option>Paid by tap or cash</option><option>Pay at pickup</option></select></label></div>
    <p class="alert" role="alert"></p><button class="button" type="submit">Add order</button>
  </form>`);
}

function receiptDialog(order) {
  const lines = order.items.map(line => `<div><span>${line.qty}× ${productFor(line.id).name}</span><strong>${money(line.qty * (line.unit ?? price))}</strong></div>`).join('');
  const subtotal = order.quote ? quoteHtml(order.quote, 'Order total', order.mode === 'delivery') : `<div class="total"><span>Order total</span><span>${money(order.total)}</span></div>`;
  show('receipt', `Receipt · #${order.id}`, `<div class="panel-form"><p><strong>${escapeHtml(order.name)}</strong><br>${escapeHtml(order.where)}<br>${displayStatus(order)}</p>
    <div class="totals">${lines}</div><div class="totals">${subtotal}
      ${order.refunded ? `<div><span>Demo refund</span><span>−${money(order.refunded)}</span></div>` : ''}</div>
    <div class="row"><button class="button outline" data-track="${order.id}">Track order</button><button class="button" data-close>Done</button></div></div>`);
}

function closeOrderDialog(order, action) {
  const isRefund = action === 'refund';
  const left = order.total - (order.refunded ?? 0);
  show(action, `${isRefund ? 'Refund' : 'Cancel'} order #${order.id}`, `<form class="panel-form" id="manager-close-form" data-id="${order.id}" data-kind="${action}">
    <p class="demo-note">${isRefund ? 'This records a simulated refund.' : 'This cancels the demo order and returns the drinks to stock.'}</p>
    ${isRefund ? `<label>Refund amount ($)<input name="amount" type="number" min=".01" max="${fixed(left)}" step=".01" value="${fixed(left)}" required></label>
      <label>Reason<select name="reason"><option>Customer request</option><option>Quality issue</option><option>Delivery problem</option><option>Missed pickup</option></select></label>` : ''}
    <button class="button" type="submit">${isRefund ? 'Record demo refund' : 'Cancel demo order'}</button>
  </form>`);
}

function chime() {
  try {
    orderAudio ??= new AudioContext();
    orderAudio.resume().then(() => {
      const oscillator = orderAudio.createOscillator();
      const volume = orderAudio.createGain();
      const now = orderAudio.currentTime;
      oscillator.frequency.value = 660;
      volume.gain.setValueAtTime(.07, now);
      volume.gain.exponentialRampToValueAtTime(.001, now + .24);
      oscillator.connect(volume).connect(orderAudio.destination);
      oscillator.start(now);
      oscillator.stop(now + .24);
    }).catch(() => {});
  } catch {}
}

function updateOrderBoard() {
  const board = $('#manager-board');
  if (!board) return;
  const scrollLeft = $('.m-cols', board).scrollLeft;
  board.innerHTML = orderBoard();
  $('.m-cols', board).scrollLeft = scrollLeft;
}

function syncManager(messageText) {
  save();
  renderStore();
  renderManager();
  if (messageText) message(messageText);
}

manager.addEventListener('click', event => {
  const control = event.target.closest('button');
  if (!control) return;
  const data = control.dataset;
  if (data.mTab) {
    if (managerTab === data.mTab) return;
    managerTab = data.mTab;
    renderManager();
    $(`[data-m-tab="${managerTab}"]`).focus();
  }
  if (data.mFilter) {
    orderFilter = data.mFilter;
    renderManager();
    $(`[data-m-filter="${orderFilter}"]`).focus();
  }
  if (data.mAdvance) {
    const order = managerOrder(data.mAdvance);
    if (order && activeOrder(order) && (order.mode === 'pickup' || order.stage < 2)) {
      order.stage++;
      if (!activeOrder(order)) order.fulfilledAt = Date.now();
      save();
      updateOrderBoard();
      ($(`[data-m-advance="${order.id}"]`) || $(`[data-m-receipt="${order.id}"]`))?.focus();
      message(`Order #${order.id} · ${displayStatus(order)}`);
    }
  }
  if (data.mReceipt) receiptDialog(managerOrder(data.mReceipt));
  if (data.mRefund) closeOrderDialog(managerOrder(data.mRefund), 'refund');
  if (data.mCancel) closeOrderDialog(managerOrder(data.mCancel), 'cancel');
  if (data.mAction === 'booth') boothDialog();
  if (data.mAction === 'sound') {
    state.settings.sound = !state.settings.sound;
    save();
    if (state.settings.sound) chime();
    control.textContent = state.settings.sound ? 'Order sound on' : 'Turn on order sound';
    control.setAttribute('aria-pressed', String(state.settings.sound));
  }
  if (data.mAction === 'reset') {
    show('reset', 'Reset demo data', '<form id="manager-reset-form" class="panel-form"><p>This will clear sample orders you added, menu changes, requests, and other settings in this browser.</p><div class="row"><button type="button" class="button outline" data-close>Keep changes</button><button class="button" type="submit">Reset demo</button></div></form>');
  }
});

manager.addEventListener('input', event => {
  if (event.target.id === 'manager-search') {
    orderQuery = event.target.value;
    updateOrderBoard();
  }
});

function changeMenu(control) {
  const { id, mMenu: field } = control.dataset;
  const value = control.value.trim();
  if (field === 'enabled') state.menu[id].enabled = control.checked;
  if (field === 'stock') setStock(id, value === '' ? null : Number(value), 'Manual adjustment');
  if (field === 'price') state.menu[id].price = Math.round(Number(value) * 100);
  if (field === 'sale') state.menu[id].sale = Number(value);
  const stock = state.stock[id];
  const badge = $(`[data-m-stock-status="${id}"]`);
  if (badge) {
    badge.hidden = stock === null || stock > 5;
    badge.textContent = stock ? 'Low' : 'Out';
    badge.className = `m-pill ${stock ? 'amber' : 'pink'}`;
  }
  if (field === 'stock') $('#manager-stock-log').innerHTML = stockLog();
}

function applyManagerControl(control) {
  const data = control.dataset;
  if (!data.mDriverFor && !data.mEvent && data.mZone === undefined && !data.mSetting
      && !data.mPromo && !data.mMenu && !data.mAvailability) return;
  if (!control.validity.valid || (control.value === '' && (data.mMenu === 'price'
      || data.mZone !== undefined || (data.mSetting && control.type === 'number')))) {
    control.reportValidity();
    return;
  }
  if (data.mDriverFor) {
    const order = managerOrder(data.mDriverFor);
    order.driver = control.value || null;
    const driver = state.drivers.find(item => item.id === order.driver);
    message(driver ? `Order #${order.id} assigned to ${driver.name}` : `Driver removed from order #${order.id}`);
  }
  if (data.mEvent) eventFor(data.mEvent).open = control.checked;
  if (data.mZone !== undefined) state.zones[Number(data.mZone)].fee = Math.round(Number(control.value) * 100);
  if (data.mPromo) state.promotions.find(entry => entry.code === data.mPromo).active = control.checked;
  if (data.mMenu) changeMenu(control);
  if (data.mAvailability) {
    state.drivers.find(driver => driver.id === data.mAvailability).available = control.checked;
    renderManager();
    $(`[data-m-availability="${data.mAvailability}"]`)?.focus();
  }
  if (data.mSetting) {
    const key = data.mSetting;
    if (control.type === 'checkbox') state.settings[key] = control.checked;
    else if (control.type !== 'number') state.settings[key] = control.value.trim();
    else state.settings[key] = ['minimum', 'freeDelivery'].includes(key) ? Math.round(Number(control.value) * 100) : Number(control.value);
  }
  save();
  renderStore();
}

manager.addEventListener('change', event => {
  if (!event.target.matches('input[type="number"],textarea')) applyManagerControl(event.target);
});

manager.addEventListener('focusout', event => {
  if (event.target.matches('input[type="number"],textarea') && event.target.value !== event.target.defaultValue) {
    applyManagerControl(event.target);
    if (event.target.validity.valid) event.target.defaultValue = event.target.value;
  }
});

manager.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.matches('input[type="number"][data-m-menu],input[type="number"][data-m-setting],input[type="number"][data-m-zone]')) {
    event.preventDefault();
    event.target.blur();
  }
});

function submitManagerForm(event) {
  const form = event.target;
  if (!form.id.startsWith('manager-')) return;
  event.preventDefault();
  const data = new FormData(form);
  if (form.id === 'manager-event-form') {
    const name = data.get('name').trim();
    const city = data.get('city').trim();
    const date = new Date(data.get('date') + 'T12:00:00Z');
    if (!name || !city || !Number.isFinite(date.getTime())) return;
    state.events.push({ id: 'event-' + Date.now(), name, city, month: managerMonth.format(date), day: date.getUTCDate(), open: true });
    syncManager('Event added to the lineup.');
  }
  if (form.id === 'manager-driver-form') {
    const name = data.get('name').trim();
    if (!name) return;
    state.drivers.push({ id: 'driver-' + Date.now(), name, available: true });
    syncManager('Demo driver added.');
  }
  if (form.id === 'manager-promo-form') {
    const code = data.get('code').trim().toUpperCase();
    const type = data.get('type');
    const amount = Number(data.get('amount'));
    const error = $('.m-error', form);
    if (state.promotions.some(promo => promo.code === code)) {
      error.textContent = 'That code already exists.';
      return;
    }
    if ((type !== 'free' && amount <= 0) || (type === 'percent' && amount > 100)) {
      error.textContent = 'Enter a positive discount. Percent discounts can be up to 100%.';
      return;
    }
    state.promotions.push({ code, type, amount: type === 'free' ? 0 : type === 'fixed' ? Math.round(amount * 100) : amount,
      min: Math.round(Number(data.get('minimum')) * 100), limit: Number(data.get('limit')), uses: 0, expires: data.get('expires'), active: true });
    syncManager(`Created promo code ${code}.`);
  }
  if (form.id === 'manager-booth-form') {
    const id = data.get('product');
    const qty = Number(data.get('qty'));
    const name = data.get('name').trim();
    if (!name || !productFor(id) || !Number.isInteger(qty) || qty < 1 || qty > availableStock(id)) {
      $('.alert', form).textContent = 'Enter a customer name and a quantity that is in stock.';
      return;
    }
    const pickup = eventFor(data.get('event'));
    const items = [{ id, qty, base: productFor(id).base, omit: [] }];
    const order = recordOrder({ name, mode: 'pickup', eventId: pickup?.id ?? '', where: pickup ? eventLabel(pickup) : 'At the booth',
      phone: data.get('phone').trim(), payment: data.get('payment') }, items, totals(items, undefined, 'pickup', '', true));
    managerTab = 'orders';
    orderQuery = '';
    orderFilter = 'all';
    overlay.close();
    syncManager(`Order #${order.id} added.`);
    if (state.settings.sound) chime();
  }
  if (form.id === 'manager-close-form') {
    const order = managerOrder(form.dataset.id);
    if (!order || order.closed) return;
    if (form.dataset.kind === 'cancel') {
      if (order.stage !== 0) return;
      order.closed = 'cancelled';
      order.refunded = order.total;
      for (const item of order.items) {
        if (state.stock[item.id] !== null) setStock(item.id, state.stock[item.id] + item.qty, `Cancelled order #${order.id}`);
      }
      const promo = state.promotions.find(entry => entry.code === order.quote?.promo);
      if (promo) promo.uses = Math.max(0, promo.uses - 1);
    } else {
      const amount = Math.round(Number(data.get('amount')) * 100);
      const refunded = (order.refunded ?? 0) + amount;
      if (activeOrder(order) || !Number.isFinite(amount) || amount < 1 || refunded > order.total) return;
      order.refunded = refunded;
      order.refundReason = data.get('reason');
      if (refunded === order.total) order.closed = 'refunded';
    }
    overlay.close();
    syncManager(`Order #${order.id} · ${order.closed ? displayStatus(order) : 'Demo refund recorded'}`);
  }
  if (form.id === 'manager-reset-form') {
    state = migrateState(initialState());
    managerTab = 'overview';
    orderQuery = '';
    orderFilter = 'all';
    overlay.close();
    syncManager('Demo data reset.');
  }
}

document.addEventListener('submit', submitManagerForm);
window.addEventListener('hashchange', updatePage);
window.addEventListener('rooted-order-created', () => { if (state.settings.sound) chime(); });
window.addEventListener('rooted-driver-updated', () => {
  if (managerTab === 'orders') updateOrderBoard();
  else renderManager();
});
updatePage();
