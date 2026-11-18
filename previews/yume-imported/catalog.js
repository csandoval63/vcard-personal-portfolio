const catalog = (() => {
  const hosted = document.body.dataset.mode === 'server';
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const photoPresets = ['assets/hero.webp', 'assets/kei-truck.webp', 'assets/shipping.webp'];
  let liveCars = [];
  let liveInquiries = [];

  function price(cents) {
    return currency.format(cents / 100).replace(/\.00$/, '');
  }

  function photo(value) {
    if (typeof value !== 'string') return '';
    if (photoPresets.includes(value)) return value;
    return /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length <= 145000 ? value : '';
  }

  async function request(path, method = 'GET', payload) {
    const response = await fetch(path, {
      method,
      cache: 'no-store',
      ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.error || 'Could not connect to the manager. Try again.');
    }
    return response.json();
  }

  async function refreshCars() {
    liveCars = await request('/api/cars');
    window.dispatchEvent(new Event('yume-catalog-change'));
  }

  async function refreshInquiries() {
    liveInquiries = await request('/api/manager/inquiries');
  }

  function cars(state = demo.read()) {
    return hosted ? liveCars : state.cars;
  }

  function inquiries(state = demo.read()) {
    return hosted ? [...liveInquiries, ...state.inquiries] : state.inquiries;
  }

  async function addInquiry(data) {
    if (hosted) return request('/api/inquiries', 'POST', data);
    const car = data.kind === 'car' && cars().find(item => item.id === data.carId && item.status === 'Available');
    const parts = data.kind === 'cart' ? data.items.map(line => {
      const part = demo.parts.find(item => item.id === line.id);
      return { name: part.name, quantity: line.quantity };
    }) : [];
    if (data.kind === 'car' && !car) throw new Error('This car is no longer available for inquiries.');
    const record = {
      id: data.id,
      status: 'New',
      kind: data.kind,
      created: new Date().toISOString(),
      customer: data.customer,
      email: data.email,
      details: data.message,
      items: car ? [{ name: car.name, quantity: 1 }] : parts,
    };
    demo.update(state => {
      if (!state.inquiries.some(item => item.id === record.id)) state.inquiries.unshift(record);
    });
    return record;
  }

  async function saveCar(record) {
    if (hosted) {
      const saved = await request('/api/manager/cars', 'PUT', record);
      const index = liveCars.findIndex(car => car.id === saved.id);
      if (index < 0) liveCars.push(saved);
      else liveCars[index] = saved;
      window.dispatchEvent(new Event('yume-catalog-change'));
      return;
    }
    demo.update(state => {
      const index = state.cars.findIndex(item => item.id === record.id);
      if (index < 0) state.cars.unshift(record);
      else state.cars[index] = record;
    });
  }

  async function updateInquiry(id, status) {
    if (hosted && liveInquiries.some(item => item.id === id)) {
      const updated = await request('/api/manager/inquiries', 'PATCH', { id, status });
      liveInquiries.find(item => item.id === id).status = updated.status;
      return;
    }
    demo.update(state => { state.inquiries.find(item => item.id === id).status = status; });
  }

  function inquiryTitle(item) {
    if (item.kind === 'car') return 'Vehicle inquiry';
    if (item.kind === 'cart') return 'Yume Store inquiry';
    return demo.services[item.service];
  }

  return { hosted, cars, inquiries, saveCar, updateInquiry, addInquiry, refreshCars, refreshInquiries, price, photo, inquiryTitle };
})();

const catalogCars = document.querySelector('#car-inventory');
const partsCatalog = document.querySelector('#parts-catalog');
const cartCount = document.querySelector('#cart-count');
const catalogFeedback = document.querySelector('#store-feedback');
const catalogDialog = document.querySelector('#catalog-dialog');
const catalogForm = document.querySelector('#catalog-inquiry-form');
const catalogTitle = document.querySelector('#catalog-dialog-title');
const catalogItems = document.querySelector('#catalog-inquiry-items');
const catalogResponse = document.querySelector('#catalog-response');
let carFilter = 'All';
let inquiryTarget;
let inquiryId;
let submittingInquiry = false;

function renderCars() {
  const filtered = catalog.cars().filter(car => !car.hidden && (carFilter === 'All' || car.status === carFilter));
  catalogCars.innerHTML = filtered.map(car => {
    const available = car.status === 'Available';
    const source = catalog.photo(car.photo);
    const name = demo.escape(car.name);
    return `<article class="catalog-card">
      <div class="car-photo">${source ? `<img src="${demo.escape(source)}" alt="${name}" loading="lazy">` : '<span>Photo pending</span>'}</div>
      <div class="catalog-card-body">
        <span class="listing-status ${available ? 'available' : ''}">${available ? 'Available' : 'Sold'}</span>
        <h3>${name}</h3>
        <p>${demo.escape(car.description)}</p>
        ${available ? `<p class="listing-price">${car.priceCents ? catalog.price(car.priceCents) : 'Inquire for price'}</p>
          <div class="catalog-card-actions">
            <button class="button outline" type="button" data-car-inquiry="${demo.escape(car.id)}" aria-label="Inquire about ${name}">Inquire</button>
            ${car.priceCents ? '' : '<a class="text-action light-action" href="tel:+19512205245">Call Yume</a>'}
          </div>` : ''}
      </div>
    </article>`;
  }).join('') || '<p>No cars match this filter.</p>';
}

function renderParts() {
  partsCatalog.innerHTML = demo.parts.map(part => `<article class="catalog-card part-card">
    ${part.photo ? `<img class="part-photo" src="${part.photo}" alt="" loading="lazy">` : ''}
    <div class="catalog-card-body">
      <p class="part-category">${demo.escape(part.reference)}</p>
      <h3>${demo.escape(part.name)}</h3><p>${demo.escape(part.description)}</p>
      <button class="button outline" type="button" data-add-part="${part.id}" aria-label="Add ${demo.escape(part.name)} to inquiry cart">Add to inquiry</button>
    </div>
  </article>`).join('');
}

function cartLines() {
  return demo.read().cart.filter(line => Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 99 && demo.parts.some(part => part.id === line.id));
}

function updateCart(id, delta) {
  demo.update(state => {
    const line = state.cart.find(row => row.id === id);
    const quantity = Math.max(0, Math.min(99, (line?.quantity || 0) + delta));
    if (!quantity) state.cart = state.cart.filter(row => row.id !== id);
    else if (line) line.quantity = quantity;
    else state.cart.push({ id, quantity });
  });
}

function renderCart() {
  const lines = cartLines();
  cartCount.textContent = String(lines.reduce((count, line) => count + line.quantity, 0));
  if (inquiryTarget?.kind !== 'cart' || !catalogDialog.open) return;

  catalogItems.innerHTML = lines.length ? `<ul class="cart-lines">${lines.map(line => {
    const name = demo.escape(demo.parts.find(part => part.id === line.id).name);
    const id = demo.escape(line.id);
    return `<li><strong>${name}</strong><div class="cart-quantity">
      <button type="button" data-cart-part="${id}" data-cart-step="-1" aria-label="Decrease ${name} quantity">−</button>
      <span aria-label="Quantity">${line.quantity}</span>
      <button type="button" data-cart-part="${id}" data-cart-step="1" aria-label="Increase ${name} quantity" ${line.quantity >= 99 ? 'disabled' : ''}>+</button>
    </div></li>`;
  }).join('')}</ul>` : '<p class="cart-empty">Your inquiry cart is empty. Add a part from Yume Store to get started.</p>';
  catalogForm.hidden = !lines.length;
}

function openCatalogInquiry(target) {
  inquiryTarget = target;
  inquiryId = crypto.randomUUID();
  catalogForm.reset();
  catalogResponse.textContent = '';
  catalogForm.hidden = false;
  catalogTitle.textContent = target.kind === 'cart' ? 'Inquiry cart' : 'Inquire about this car';
  catalogItems.textContent = target.name || '';
  catalogDialog.showModal();
  renderCart();
}

document.querySelector('.catalog-filters').addEventListener('click', event => {
  const control = event.target.closest('[data-car-filter]');
  if (!control) return;
  carFilter = control.dataset.carFilter;
  document.querySelectorAll('[data-car-filter]').forEach(button => button.setAttribute('aria-pressed', String(button === control)));
  renderCars();
});

catalogCars.addEventListener('click', event => {
  const control = event.target.closest('[data-car-inquiry]');
  if (!control) return;
  const car = catalog.cars().find(item => item.id === control.dataset.carInquiry && item.status === 'Available' && !item.hidden);
  if (car) openCatalogInquiry({ kind: 'car', carId: car.id, name: car.name });
});

partsCatalog.addEventListener('click', event => {
  const part = demo.parts.find(item => item.id === event.target.closest('[data-add-part]')?.dataset.addPart);
  if (!part) return;
  updateCart(part.id, 1);
  catalogFeedback.textContent = part.name + ' added to your inquiry cart.';
});

document.querySelector('#view-cart').addEventListener('click', () => openCatalogInquiry({ kind: 'cart' }));
const closeCatalog = document.querySelector('#close-catalog-dialog');
closeCatalog.addEventListener('click', () => catalogDialog.close());
catalogDialog.addEventListener('cancel', event => {
  if (submittingInquiry) event.preventDefault();
});
catalogItems.addEventListener('click', event => {
  const control = event.target.closest('[data-cart-part]');
  if (!control) return;
  const { cartPart, cartStep } = control.dataset;
  updateCart(cartPart, Number(cartStep));
  const next = [...catalogItems.querySelectorAll('[data-cart-part]')].find(button => button.dataset.cartPart === cartPart && button.dataset.cartStep === cartStep && !button.disabled);
  (next || catalogItems.querySelector('button') || document.querySelector('#close-catalog-dialog')).focus();
});

catalogForm.addEventListener('submit', async event => {
  event.preventDefault();
  const values = new FormData(catalogForm);
  const customer = values.get('customer').trim();
  const button = catalogForm.querySelector('button[type="submit"]');
  if (!customer) {
    catalogResponse.textContent = 'Enter a name to continue.';
    return;
  }

  if (submittingInquiry) return;
  submittingInquiry = true;
  button.disabled = true;
  closeCatalog.disabled = true;
  catalogItems.inert = true;
  catalogResponse.textContent = 'Sending inquiry…';
  try {
    const { kind, carId } = inquiryTarget;
    const lines = kind === 'cart' ? cartLines() : [];
    const record = await catalog.addInquiry({
      id: inquiryId, kind, carId, customer, email: values.get('email').trim(),
      message: values.get('message').trim(),
      items: lines,
    });
    inquiryTarget = null;
    if (kind === 'cart') demo.update(state => {
      state.cart = state.cart.map(line => ({
        ...line,
        quantity: line.quantity - (lines.find(submitted => submitted.id === line.id)?.quantity || 0),
      })).filter(line => line.quantity > 0);
    });
    catalogForm.hidden = true;
    catalogItems.textContent = '';
    catalogResponse.textContent = catalog.hosted ? 'Inquiry sent. Reference ' + record.id : 'Inquiry saved. Open Admin preview, then Inquiries, to see it.';
    catalogResponse.focus();
  } catch (error) {
    catalogResponse.textContent = error.message;
  } finally {
    button.disabled = false;
    closeCatalog.disabled = false;
    catalogItems.inert = false;
    submittingInquiry = false;
  }
});

window.addEventListener('yume-demo-change', () => {
  renderCart();
  if (!catalog.hosted) renderCars();
});
window.addEventListener('yume-catalog-change', renderCars);
renderParts();
renderCart();
if (catalog.hosted) {
  catalogCars.textContent = 'Loading vehicle inventory…';
  document.querySelector('#catalog-instructions').textContent = 'Add contact details so the shop can respond to your inquiry.';
  catalog.refreshCars().catch(error => { catalogCars.textContent = error.message; });
} else renderCars();
