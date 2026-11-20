'use strict';

const juices = [
  { key:'green', name:'Green Glow', image:'green', ingredients:'Kale, spinach, cucumber, celery, pineapple, green apple, lemon, and ginger' },
  { key:'orange', name:'Orange Glow Boost', image:'orange', ingredients:'Carrots, orange, ginger, and celery' },
  { key:'beet', name:'Beets Vitality', image:'beet', ingredients:'Beets, carrots, red apple, ginger, and lemon' },
  { key:'blue', name:'Blue Spirulina Boost', image:'blue', ingredients:'Pineapple, green apple, lemon, ginger, spirulina, and cucumber' }
];
const bowls = [
  ['berry-bliss','Berry Bliss','Strawberry, blueberries, banana, granola, and honey'],
  ['tropical-glow','Tropical Glow','Mango, kiwi, banana, coconut flakes, and agave syrup'],
  ['cacao-crunch','Cacao Crunch','Banana, strawberry, granola, cacao nibs, and Nutella'],
  ['power-bowl','Power Bowl','Banana, blueberries, granola, peanut butter, and honey'],
  ['island-paradise','Island Paradise','Mango, strawberry, coconut flakes, chia pudding, and agave syrup'],
  ['blue-beauty','Blue Beauty','Blueberries, banana, chia pudding, cacao nibs, and almond butter'],
  ['organic-dream','Organic Dream','Strawberry, mango, kiwi, coconut flakes, and honey'],
  ['monkey-bowl','Monkey Bowl','Banana, granola, peanut butter, Nutella, and cacao nibs'],
  ['golden-sunrise','Golden Sunrise','Mango, banana, coconut flakes, almond butter, and honey'],
  ['green-goddess','Green Goddess','Kiwi, blueberries, chia pudding, coconut flakes, and agave syrup']
].map(([key,name,ingredients]) => ({ key,name,ingredients }));

const toppings = {
  fruit:['Strawberry','Blueberry','Mango','Kiwi','Banana'],
  crunch:['Granola','Coconut flakes','Cacao nibs'],
  drizzle:['Almond butter','Peanut butter','Honey','Nutella','Agave syrup']
};
const shot = { key:'shot', name:'Wellness Ginger Shot', image:'shot', ingredients:'Ginger, orange, lemon, turmeric, and cayenne pepper. Honey optional.' };
const build = { key:'custom', name:'Build your own bowl', image:'bowl', ingredients:'Choose your fruit, crunch, chia pudding, and drizzle.' };
const packs = { key:'bundle', name:'Juice bundle', ingredients:'Choose a 3-pack or 6-pack. Mix any of the four flavors.' };
const catalog = [...juices, ...bowls, shot, build, packs];

const perSize = { '8 oz':700, '12 oz':900 };
const bundlePrices = { 3:{'8 oz':1800,'12 oz':2500}, 6:{'8 oz':3600,'12 oz':4800} };
const pickupWindows = ['Sample pop-up · Saturday, 9 a.m.–noon','Sample pickup · Sunday, 10 a.m.–1 p.m.'];
const deliveryWindows = ['Sample delivery · 10 a.m.–noon','Sample delivery · 3–5 p.m.'];
const exampleZip = '92509';
const deliveryFee = 400;
const storageKey = 'the-organic-blend-portfolio-v1';
const popupStorageKey = 'the-organic-blend-portfolio-popups-v1';
const firstPopUp = {
  id:'medspa-grand-opening', title:'Medspa Grand Opening', date:'2026-12-05',
  start:'10:00', end:'13:00', location:'9033 Baseline Rd, Suite N, Rancho Cucamonga, CA'
};
const calendarDay = new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
const popupDay = new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric',year:'numeric'});
const popupMonth = new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short'});
const popupClock = new Intl.DateTimeFormat('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit'});
const stepText = {
  pickup:['Order received','Preparing','Ready for pickup','Picked up'],
  delivery:['Order received','Preparing','Ready for driver','Assigned to crew','Out for delivery','Delivered']
};
const stockNames = [...juices,shot,{key:'acai',name:'Açaí bowls'}];
const $ = (selector, root = document) => root.querySelector(selector);
const cash = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const money = cents => cash.format(cents / 100);
const itemFor = key => catalog.find(item => item.key === key);
const orderCode = id => 'OB-' + id;
const active = order => order.step < stepText[order.mode].length - 1;
const escape = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function seedOrder(id,mode,step,key,details,amount,qty) {
  return { id,mode,step,target:(mode === 'pickup' ? pickupWindows : deliveryWindows)[0],created:Date.now()-(1105-id)*180000,
    items:[{ key, details, amount, qty }], total:amount*qty+(mode === 'delivery' ? deliveryFee : 0) };
}
function seed() {
  return {
    next:1105, last:null, bag:[], stock:{green:24,orange:24,beet:18,blue:20,shot:48,acai:32},
    orders:[
      seedOrder(1104,'pickup',0,'berry-bliss','House combination',1000,1),
      seedOrder(1103,'delivery',1,'bundle','3-pack · 8 oz',1800,1),
      seedOrder(1102,'pickup',2,'blue','12 oz',900,2),
      seedOrder(1101,'delivery',4,'shot','6-pack · 2 oz · No honey',1500,1)
    ],
    alerts:[]
  };
}
function load() {
  try {
    const record = JSON.parse(localStorage.getItem(storageKey));
    if (record && Array.isArray(record.bag) && Array.isArray(record.orders) && record.stock && Array.isArray(record.alerts)) return record;
  } catch {}
  return seed();
}
function loadPopUps() {
  try {
    const stored = JSON.parse(localStorage.getItem(popupStorageKey));
    if (Array.isArray(stored)) return stored;
  } catch {}
  return [firstPopUp];
}

let state = load();
let popUps = loadPopUps();
let selectedTab = 'juices';
let selectedMode = 'pickup';
let operationsTab = 'orders';
let sheetView;
let priorView;
let toastTimer;
const sheet = $('#sheet');
const body = $('#sheet-content');

function save() {
  try { localStorage.setItem(storageKey,JSON.stringify(state)); } catch {}
}
function announce(label) {
  window.clearTimeout(toastTimer);
  $('#toast').textContent = label;
  toastTimer = window.setTimeout(() => { $('#toast').textContent = ''; },2500);
}
function show(view,title,html) {
  const focus = document.activeElement;
  sheetView = view;
  $('#sheet-title').textContent = title;
  body.innerHTML = html;
  sheet.scrollTop = 0;
  if (!sheet.open) sheet.showModal();
  else if (!document.contains(focus)) $('.close',sheet).focus();
}
function unitsFor(line,stockKey) {
  return (line.units[stockKey] ?? 0) * line.qty;
}
function usedStock(items,stockKey) {
  return items.reduce((count,line) => count + unitsFor(line,stockKey),0);
}
function fitsStock(items) {
  return stockNames.every(item => usedStock(items,item.key) <= state.stock[item.key]);
}
function available(key) {
  if (juices.some(juice => juice.key === key)) return state.stock[key] > 0;
  if (key === 'shot') return state.stock.shot > 0;
  return state.stock.acai > 0;
}

function productButton(key,label='Customize') {
  const active = available(key);
  return `<button class="button outline" type="button" data-item="${key}" aria-label="${active ? label : 'Sold out'} ${itemFor(key).name}" ${active ? '' : 'disabled'}>${active ? label : 'Sold out'}</button>`;
}

function card(item,price) {
  return `<article class="product">
    ${item.image ? `<img src="media/${item.image}.webp" alt="" width="420" height="350" loading="lazy">` : ''}
    <div class="product-info"><div class="product-name"><h3>${item.name}</h3><span>${price}</span></div>
    <p>${item.ingredients}</p>${productButton(item.key,item.image ? 'Customize' : 'Add bowl')}</div>
  </article>`;
}

function renderMenu() {
  document.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('aria-pressed',String(tab.dataset.tab === selectedTab)));
  const content = $('#menu-items');
  if (selectedTab === 'juices') {
    const n = juices.reduce((total,juice) => total + state.stock[juice.key],0);
    content.innerHTML = `<div class="cards">${juices.map(juice => card(juice,'From $7')).join('')}</div>
      <div class="feature"><div><h3>Mix a juice bundle.</h3><p>Choose any flavors in the same bottle size.</p></div>
      <div><p><strong>3-pack</strong> · 8 oz $18 · 12 oz $25<br><strong>6-pack</strong> · 8 oz $36 · 12 oz $48</p>
      <button type="button" class="button" data-item="bundle" ${n < 3 ? 'disabled' : ''}>Build a bundle</button></div></div>`;
  } else if (selectedTab === 'bowls') {
    content.innerHTML = `<div class="feature"><img src="media/bowl.webp" alt="" width="420" height="350"><div>
      <h3>Build your own açaí bowl.</h3><p>Choose fruit, crunch, chia pudding, and a drizzle. $10.</p>${productButton('custom','Build your bowl')}</div></div>
      <div class="cards bowl-grid">${bowls.map(bowl => card(bowl,'$10')).join('')}</div>`;
  } else {
    content.innerHTML = `<div class="cards">${card(shot,'From $3')}</div>`;
  }
}
function today() {
  const parts = Object.fromEntries(calendarDay.formatToParts(new Date()).map(({type,value}) => [type,value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function sortedPopUps() {
  return [...popUps].sort((a,b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}
function upcomingPopUps() {
  const date = today();
  return sortedPopUps().filter(event => event.date >= date);
}
function popUpDate(event) {
  return new Date(event.date + 'T12:00:00Z');
}
function popUpTime(event) {
  const toTime = time => new Date('2000-01-01T' + time + 'Z');
  return popupClock.formatRange(toTime(event.start),toTime(event.end));
}
function popUpLabel(event) {
  return `${popupDay.format(popUpDate(event))} · ${popUpTime(event)}`;
}
function popUpCard(event) {
  const date = popUpDate(event);
  return `<article class="event">
    <time class="event-date" datetime="${escape(event.date)}" aria-label="${popupDay.format(date)}"><span>${popupMonth.format(date).toUpperCase()}</span><strong>${date.getUTCDate()}</strong></time>
    <div><h3>${escape(event.title)}</h3><p>${popUpLabel(event)}</p><p>${escape(event.location)}</p></div>
  </article>`;
}
function renderPopUps() {
  $('#popup-list').innerHTML = upcomingPopUps().map(popUpCard).join('') || '<p>No upcoming pop-ups posted.</p>';
}

function renderBagCount() {
  const count = state.bag.reduce((sum,line) => sum + line.qty,0);
  $('#bag-count').textContent = count;
  $('#mobile-bag').hidden = !count || location.hash === '#storemanager' || location.hash === '#driver';
  $('#mobile-bag').textContent = `View bag · ${count} · ${money(bagTotal())}`;
}
function bagTotal() {
  return state.bag.reduce((sum,line) => sum + line.amount*line.qty,0);
}

const sizeControls = `<label>Bottle size<select name="size"><option value="8 oz">8 oz</option><option value="12 oz">12 oz</option></select></label>`;
function checks(name,options) {
  return `<div class="choices">${options.map(option => `<label class="choice"><input type="checkbox" name="${name}" value="${option}">${option}</label>`).join('')}</div>`;
}
function fieldsFor(key) {
  if (key === 'bundle') return `<div class="fields">${sizeControls}<label>Bundle size<select name="pack"><option value="3">3-pack</option><option value="6">6-pack</option></select></label></div><div class="fields" id="bundle-flavors"></div>`;
  if (key === 'shot') return `<label>Pack size<select name="pack"><option value="1">Single · 2 oz</option><option value="6">Six-pack · 2 oz each</option></select></label>
    <div class="choices"><label class="choice"><input type="checkbox" name="honey">Add honey</label></div>`;
  if (key === 'custom') return `<fieldset><legend>Choose at least one fruit</legend>${checks('fruit',toppings.fruit)}</fieldset>
    <fieldset><legend>Add crunch</legend>${checks('crunch',toppings.crunch)}</fieldset>
    <fieldset><legend>Optional add-on</legend>${checks('chia',['Chia pudding'])}</fieldset>
    <label>Drizzle or spread<select name="drizzle"><option value="">None</option>${toppings.drizzle.map(flavor => `<option>${flavor}</option>`).join('')}</select></label>`;
  if (juices.some(item => item.key === key)) return sizeControls;
  return '';
}
function chooseItem(key) {
  const item = itemFor(key);
  if (!item) return;
  show('product',item.name,`<form class="form" id="product-form" data-key="${key}">
    <p class="hint">${item.ingredients}</p>
    ${fieldsFor(key)}
    <label>Quantity<input type="number" name="qty" min="1" max="25" required value="1"></label>
    <p class="error" role="alert"></p>
    <button class="button" type="submit">Add to bag <span id="item-total"></span></button>
  </form>`);
  const form = $('#product-form');
  if (key === 'bundle') renderBundleChoices(form);
  updateItemQuote(form);
}
function renderBundleChoices(form) {
  const area = $('#bundle-flavors');
  const saved = [...area.querySelectorAll('select')].map(select => select.value);
  const options = juices.filter(juice => state.stock[juice.key] > 0).map(juice => `<option value="${juice.key}">${juice.name}</option>`).join('');
  area.innerHTML = Array.from({length:Number(form.elements.pack.value)},(_,i) => `<label>Bottle ${i+1}<select name="flavor" required>${options}</select></label>`).join('');
  [...area.querySelectorAll('select')].forEach((select,i) => { if (saved[i] && [...select.options].some(option => option.value === saved[i])) select.value = saved[i]; });
}
function itemLine(form) {
  const item = itemFor(form.dataset.key);
  const data = new FormData(form);
  const key = item.key;
  const qty = Number(data.get('qty'));
  const size = data.get('size');
  const pack = Number(data.get('pack'));
  if (key === 'bundle') {
    const flavors = data.getAll('flavor').filter(flavor => juices.some(juice => juice.key === flavor));
    const units = {};
    for (const flavor of flavors) units[flavor] = (units[flavor] ?? 0) + 1;
    const list = juices.filter(juice => units[juice.key]).map(juice => `${units[juice.key]}× ${juice.name}`);
    return {key,qty,units,amount:bundlePrices[pack]?.[size] ?? 0,details:`${pack}-pack · ${size} · ${list.join(', ')}`,valid:flavors.length === pack};
  }
  if (key === 'shot') return {key,qty,units:{shot:pack},amount:pack === 6 ? 1500 : 300,
    details:`${pack === 6 ? '6-pack' : 'Single'} · 2 oz ${pack === 6 ? 'each · ' : '· '}${data.has('honey') ? 'Add honey' : 'No honey'}`,valid:true};
  if (key === 'custom') {
    const fruits = data.getAll('fruit');
    const selections = [...fruits,...data.getAll('crunch'),...data.getAll('chia'),data.get('drizzle')].filter(Boolean);
    return {key,qty,units:{acai:1},amount:1000,details:selections.join(', '),valid:fruits.length>0};
  }
  if (size) return {key,qty,units:{[key]:1},amount:perSize[size] ?? 0,details:size,valid:true};
  return {key,qty,units:{acai:1},amount:1000,details:'House combination',valid:true};
}
function updateItemQuote(form) {
  const line = itemLine(form);
  $('#item-total').textContent = money(line.amount * (line.qty || 1));
  $('.error',form).textContent = '';
}
function addItem(form) {
  const {valid,...line} = itemLine(form);
  const alert = $('.error',form);
  if (!valid) { alert.textContent = line.key === 'custom' ? 'Choose at least one fruit.' : 'Choose a flavor for each bottle.'; return; }
  if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 25 || !line.amount) return;
  if (!fitsStock([...state.bag,line])) { alert.textContent = 'There isn’t enough demo stock for that quantity. Try fewer items.'; return; }
  const match = state.bag.find(item => item.key === line.key && item.details === line.details);
  if (match) match.qty += line.qty;
  else state.bag.push(line);
  save();
  renderBagCount();
  sheet.close();
  announce(`${line.qty} added to the bag`);
}
function lineMarkup(line) {
  return `<strong>${line.qty} × ${itemFor(line.key).name}</strong> · ${escape(line.details)}`;
}

function bag() {
  if (!state.bag.length) return show('bag','Your bag','<div class="stack"><p>Your bag is empty.</p><button class="button" data-browse>Browse the menu</button></div>');
  const lines = state.bag.map((line,index) => `<article class="line"><div class="row"><strong>${itemFor(line.key).name}</strong><strong>${money(line.qty*line.amount)}</strong></div>
    <p class="hint">${escape(line.details)}</p><div class="adjust"><button type="button" data-adjust="${index}" data-delta="-1" aria-label="Decrease ${itemFor(line.key).name} quantity">−</button>
      <span>${line.qty}</span><button type="button" data-adjust="${index}" data-delta="1" aria-label="Increase ${itemFor(line.key).name} quantity">+</button></div></article>`).join('');
  show('bag','Your bag',`<div class="stack">${lines}<div class="row totals"><span>Subtotal</span><strong>${money(bagTotal())}</strong></div>
    <button class="button" data-view="checkout" type="button">Try checkout</button></div>`);
}
function adjust(index,delta) {
  const line = state.bag[index];
  if (!line) return;
  if (delta > 0 && !fitsStock([...state.bag,{...line,qty:1}])) { announce('That quantity is sold out.'); return; }
  line.qty += delta;
  if (line.qty === 0) state.bag.splice(index,1);
  save();
  renderBagCount();
  bag();
  $(`[data-adjust="${index}"][data-delta="${delta}"]`,body)?.focus();
}
function checkout() {
  if (!state.bag.length) return bag();
  show('checkout','Demo checkout',`<form class="form" id="checkout-form">
    <p class="demo-hint">Sample orders stay in this browser. Checkout skips personal information and payment.</p>
    <fieldset><legend>Fulfillment</legend><div class="choices">
      <label class="choice"><input type="radio" name="mode" value="pickup" ${selectedMode === 'pickup' ? 'checked' : ''}> Event pickup</label>
      <label class="choice"><input type="radio" name="mode" value="delivery" ${selectedMode === 'delivery' ? 'checked' : ''}> Local delivery</label>
    </div></fieldset>
    <label id="zip-field">Demo ZIP code<input name="zip" type="text" inputmode="numeric" pattern="[0-9]{5}" value="${exampleZip}" maxlength="5" required></label>
    <label>Fulfillment window<select name="window" required></select></label>
    <p class="error" role="alert"></p><div class="totals" id="checkout-total"></div>
    <div class="row"><button class="button outline" type="button" data-view="bag">Back to bag</button><button class="button" type="submit">Place demo order</button></div>
  </form>`);
  refreshCheckout($('#checkout-form'),true);
}
function checkoutWindows(mode) {
  const windows = (mode === 'delivery' ? deliveryWindows : pickupWindows).map(label => ({value:label,label}));
  if (mode === 'pickup') {
    windows.unshift(...upcomingPopUps().map(event => ({
      value:event.id, label:`${event.title} · ${popUpLabel(event)}`, location:event.location
    })));
  }
  return windows;
}
function refreshCheckout(form,refreshWindows) {
  const delivery = form.elements.mode.value === 'delivery';
  $('#zip-field').hidden = !delivery;
  form.elements.zip.disabled = !delivery;
  if (refreshWindows) {
    const select = form.elements.window;
    const selected = select.value;
    const windows = checkoutWindows(form.elements.mode.value);
    select.innerHTML = windows.map(window => `<option value="${escape(window.value)}">${escape(window.label)}</option>`).join('');
    if (windows.some(window => window.value === selected)) select.value = selected;
  }
  const eligible = !delivery || form.elements.zip.value === exampleZip;
  $('.error',form).textContent = eligible ? '' : `Use ${exampleZip} to try local delivery.`;
  $('#checkout-total').innerHTML = `<div class="row"><span>Subtotal</span><span>${money(bagTotal())}</span></div>
    ${delivery ? `<div class="row"><span>Sample delivery</span><span>${money(deliveryFee)}</span></div>` : ''}
    <div class="row"><strong>Order total</strong><strong>${money(bagTotal()+(delivery ? deliveryFee : 0))}</strong></div>`;
}
function submitOrder(form) {
  const fields = new FormData(form);
  const mode = fields.get('mode');
  const delivery = mode === 'delivery';
  const choice = checkoutWindows(mode).find(window => window.value === fields.get('window'));
  if (delivery && fields.get('zip') !== exampleZip) { refreshCheckout(form,false); return; }
  if (!choice) {
    refreshCheckout(form,true);
    $('.error',form).textContent = 'That window is no longer available. Choose another one.';
    return;
  }
  const target = choice.location ? `${choice.label} · ${choice.location}` : choice.label;
  if (!state.bag.length || !fitsStock(state.bag)) { $('.error',form).textContent = 'Stock changed. Check your bag before continuing.'; return; }
  const id = state.next++;
  for (const item of stockNames) state.stock[item.key] -= usedStock(state.bag,item.key);
  state.orders.unshift({id,mode,target,step:0,created:Date.now(),items:state.bag,total:bagTotal()+(delivery ? deliveryFee : 0)});
  state.alerts.unshift(id);
  state.bag = [];
  state.last = id;
  save();
  renderBagCount();
  renderMenu();
  tracking(id,true);
}
function tracking(id=state.last,confirmed=false,missing=false) {
  const order = state.orders.find(item => item.id === Number(id));
  const receipt = order ? `<div class="stack"><strong>${orderCode(order.id)} · ${order.mode === 'pickup' ? 'Event pickup' : 'Local delivery'}</strong>
    <p class="hint">${escape(order.target)}</p><ul class="progress">${stepText[order.mode].map((step,index) =>
      `<li class="${index <= order.step ? 'done' : ''}" ${index === order.step ? 'aria-current="step"' : ''}>${step}</li>`).join('')}</ul>
    <div>${order.items.map(line => `<p>${lineMarkup(line)}</p>`).join('')}</div><strong>${money(order.total)}</strong></div>` : '';
  show('track',confirmed ? 'Demo order placed' : 'Track a demo order',`<div class="stack">${receipt}
    <form class="form" id="track-form"><label>Order number<input name="order" value="${id ? orderCode(Number(id)) : ''}" placeholder="OB-1104" maxlength="14" required></label>
    ${missing ? '<p class="error" role="alert">This browser has no demo order with that number.</p>' : ''}
    <div class="row"><button type="submit" class="button">Check status</button><a class="button outline" href="#storemanager">Store manager</a></div></form></div>`);
}

function opsHeading(title,description) {
  return `<div class="section-heading"><p class="eyebrow">Independent demo</p><h1 tabindex="-1">${title}</h1><p>${description}</p></div>
    <nav class="row left" aria-label="Checkout demo views"><a class="button outline" href="#menu">Storefront</a>
      <a class="button outline" href="#storemanager">Store manager</a><a class="button outline" href="#driver">Driver view</a></nav>`;
}
function orderCard(order,view) {
  const managerSteps = { 0:'Start preparing',1:order.mode === 'delivery' ? 'Ready for driver' : 'Ready for pickup',2:order.mode === 'delivery' ? 'Assign to crew' : 'Mark picked up' };
  const action = view === 'manager' ? managerSteps[order.step] : {3:'Start delivery',4:'Mark delivered'}[order.step];
  return `<article class="order"><div class="row"><strong>${orderCode(order.id)}</strong><span class="pill">${order.mode === 'pickup' ? 'Pickup' : 'Delivery'}</span></div>
    <p><strong>${stepText[order.mode][order.step]}</strong> · ${money(order.total)}</p><p class="hint">${escape(order.target)}</p>
    <div>${order.items.map(line => `<p>${lineMarkup(line)}</p>`).join('')}</div>
    <div class="row left">${action && active(order) ? `<button class="button" type="button" data-advance="${order.id}">${action}</button>` : ''}
    <button class="button outline" type="button" data-track="${order.id}">Track</button></div></article>`;
}
function ordersBoard() {
  const groups = [
    ['New',order => order.step === 0],['Preparing',order => order.step === 1],
    ['Ready or assigned',order => order.step === 2 || order.step === 3],['Out for delivery',order => order.mode === 'delivery' && order.step === 4]
  ];
  const open = state.orders.filter(active);
  const finished = state.orders.filter(order => !active(order));
  return `<div class="board" role="region" tabindex="0" aria-label="Active demo orders">${groups.map(([label,match]) => {
    const orders = open.filter(match);
    return `<section class="board-col"><h2>${label} · ${orders.length}</h2>${orders.map(order => orderCard(order,'manager')).join('') || '<p class="hint">No open orders.</p>'}</section>`;
  }).join('')}</div><h3>Completed orders</h3><div class="completed">${finished.map(order => orderCard(order,'manager')).join('') || '<p class="hint">No completed orders.</p>'}</div>`;
}
function stockControls() {
  return `<form id="stock-form" class="stock-form">${stockNames.map(item =>
    `<label class="stock-row">${item.name}<input type="number" name="${item.key}" min="0" max="999" step="1" required value="${state.stock[item.key]}"></label>`
  ).join('')}<button class="button" type="submit">Save demo stock</button></form>`;
}
function alertsPanel() {
  return `<div class="stack"><p class="demo-hint">Sample email and text alerts appear here whenever a visitor places a demo order in this browser.</p>
    ${state.alerts.length ? state.alerts.slice(0,12).map(id => `<article class="order"><strong>New order · ${orderCode(id)}</strong><p class="hint">Email and SMS preview</p></article>`).join('') : '<p class="hint">Place a demo order from the storefront to see an alert.</p>'}</div>`;
}
function popUpsPanel() {
  return `<div class="popup-manager">
    <form class="form popup-editor" id="popup-form">
      <h2>Add a pop-up</h2>
      <p class="hint">Added events appear on the storefront and in demo pickup checkout in this browser. Times are Pacific.</p>
      <label>Event name<input name="title" required maxlength="80"></label>
      <label>Date<input type="date" name="date" min="${today()}" required></label>
      <div class="fields"><label>Start time<input type="time" name="start" required></label>
      <label>End time<input type="time" name="end" required></label></div>
      <label>Location or address<input name="location" required maxlength="160"></label>
      <p class="error" role="alert"></p>
      <button class="button" type="submit">Add pop-up</button>
    </form>
    <section aria-labelledby="scheduled-popups"><h2 id="scheduled-popups">Upcoming pop-ups</h2>
      <div class="popup-list" id="manager-popup-list">${upcomingPopUps().map(popUpCard).join('') || '<p class="hint">No upcoming pop-ups.</p>'}</div>
    </section>
  </div>`;
}
function addPopUp(form) {
  const fields = new FormData(form);
  const title = fields.get('title').trim();
  const location = fields.get('location').trim();
  const date = fields.get('date');
  const start = fields.get('start');
  const end = fields.get('end');
  const error = $('.error',form);
  if (!title || !location) {
    error.textContent = 'Enter an event name and a location.';
    return;
  }
  if (date < today() || end <= start) {
    error.textContent = 'Choose a date today or later and an end time after the start time.';
    return;
  }
  const events = [...loadPopUps(),{ id:crypto.randomUUID(),title,date,start,end,location }];
  try {
    localStorage.setItem(popupStorageKey,JSON.stringify(events));
  } catch {
    error.textContent = 'This browser couldn’t save the pop-up.';
    return;
  }
  popUps = events;
  renderPopUps();
  renderOps();
  $('#popup-form [name="title"]').focus();
  announce('Pop-up added');
}
function renderOps() {
  const store = $('#manager');
  const driver = $('#driver');
  if (!store.hidden) {
    const tabs = [['orders','Orders'],['stock','Menu stock'],['pop-ups','Pop-ups'],['alerts','Order alerts']];
    const board = {orders:ordersBoard,stock:stockControls,'pop-ups':popUpsPanel,alerts:alertsPanel};
    store.innerHTML = opsHeading('Store manager','Prepare orders, assign deliveries, and manage stock and pop-ups.') +
      `<div class="ops-tabs row left">${tabs.map(([id,label]) =>
        `<button type="button" class="button ${id === operationsTab ? '' : 'outline'}" data-ops="${id}" aria-pressed="${id === operationsTab}">${label}</button>`
      ).join('')}</div>` + board[operationsTab]();
  }
  if (!driver.hidden) {
    const deliveries = state.orders.filter(order => order.mode === 'delivery' && order.step >= 3);
    driver.innerHTML = opsHeading('Driver view','Assigned demo deliveries appear here.') +
      `<div class="driver-list">${deliveries.map(order => orderCard(order,'driver')).join('') || '<p class="hint">No deliveries assigned.</p>'}</div>`;
  }
}
function route() {
  $('#manager').hidden = location.hash !== '#storemanager';
  $('#driver').hidden = location.hash !== '#driver';
  const showOps = !$('#manager').hidden || !$('#driver').hidden;
  const leaving = !showOps && $('#main').hidden;
  $('#main').hidden = showOps;
  $('.site-header').hidden = showOps;
  $('.skip').setAttribute('href',!$('#manager').hidden ? '#storemanager' : !$('#driver').hidden ? '#driver' : '#main');
  if (showOps) {
    if (sheet.open) sheet.close();
    renderOps();
    if (priorView !== location.hash) {
      window.scrollTo(0,0);
      $(!$('#manager').hidden ? '#manager h1' : '#driver h1').focus({preventScroll:true});
    }
  } else if (location.hash === '#track') tracking();
  else if (leaving && location.hash === '#menu') $('#menu').scrollIntoView();
  priorView = location.hash;
  renderBagCount();
}
function advance(id) {
  const order = state.orders.find(item => item.id === Number(id));
  if (!order || !active(order)) return;
  const manager = location.hash === '#storemanager' && order.step <= 2;
  const driver = location.hash === '#driver' && order.mode === 'delivery' && order.step >= 3;
  if (!manager && !driver) return;
  order.step++;
  save();
  renderOps();
  ($(`[data-advance="${id}"]`) || $(`[data-track="${id}"]`))?.focus();
  announce(`${orderCode(order.id)} · ${stepText[order.mode][order.step]}`);
}

const views = {bag,checkout,track:tracking};
document.addEventListener('click',event => {
  const target = event.target.closest('button,a');
  if (!target) return;
  const data = target.dataset;
  if ('close' in data) sheet.close();
  if ('browse' in data) { sheet.close(); location.hash = '#menu'; }
  if (data.view) views[data.view]();
  if (data.item) chooseItem(data.item);
  if (data.adjust !== undefined) adjust(Number(data.adjust),Number(data.delta));
  if (data.track) tracking(data.track);
  if (data.advance) advance(data.advance);
  if (data.ops) { operationsTab = data.ops; renderOps(); $(`[data-ops="${operationsTab}"]`)?.focus(); }
  if (data.category || data.tab) {
    selectedTab = data.category ?? data.tab;
    renderMenu();
    if (data.category) {
      location.hash = '#menu';
      $('#menu').scrollIntoView();
    }
  }
});
document.addEventListener('input',event => {
  const form = event.target.form;
  if (form?.id === 'product-form' && event.target.name !== 'pack') updateItemQuote(form);
  if (form?.id === 'checkout-form' && event.target.name === 'zip') refreshCheckout(form,false);
});
document.addEventListener('change',event => {
  const form = event.target.form;
  if (form?.id === 'product-form') {
    if (form.dataset.key === 'bundle' && event.target.name === 'pack') renderBundleChoices(form);
    updateItemQuote(form);
  }
  if (form?.id === 'checkout-form' && event.target.name === 'mode') {
    selectedMode = form.elements.mode.value;
    refreshCheckout(form,true);
  }
});
document.addEventListener('submit',event => {
  const form = event.target;
  if (!['product-form','checkout-form','track-form','stock-form','popup-form'].includes(form.id)) return;
  event.preventDefault();
  if (form.id === 'product-form') addItem(form);
  if (form.id === 'checkout-form') submitOrder(form);
  if (form.id === 'popup-form') addPopUp(form);
  if (form.id === 'track-form') {
    const input = form.elements.order.value.trim().replace(/^OB-/i,'');
    const id = /^\d+$/.test(input) ? Number(input) : null;
    tracking(id,false,!state.orders.some(item => item.id === id));
  }
  if (form.id === 'stock-form') {
    const changes = new FormData(form);
    for (const item of stockNames) state.stock[item.key] = Number(changes.get(item.key));
    save();
    renderMenu();
    announce('Demo stock updated');
  }
});

sheet.addEventListener('click',event => { if (event.target === sheet) sheet.close(); });
sheet.addEventListener('close',() => {
  if (!sheet.open && sheetView === 'track' && location.hash === '#track') history.replaceState(null,'',location.pathname+location.search);
});
window.addEventListener('hashchange',route);
window.addEventListener('storage',event => {
  if (event.key !== popupStorageKey) return;
  popUps = loadPopUps();
  renderPopUps();
  const list = $('#manager-popup-list');
  if (list) list.innerHTML = upcomingPopUps().map(popUpCard).join('') || '<p class="hint">No upcoming pop-ups.</p>';
  const form = $('#checkout-form');
  if (form?.elements.mode.value === 'pickup') refreshCheckout(form,true);
});
renderMenu();
renderPopUps();
route();
