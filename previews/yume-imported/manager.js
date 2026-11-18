const manager = document.querySelector('#manager-view');
const managerTitle = document.querySelector('#manager-title');
const managerPanel = document.querySelector('#manager-panel');
const managerNotice = document.querySelector('#manager-notice');
const managerEditor = document.querySelector('#manager-editor');
const editorTitle = document.querySelector('#manager-dialog-title');
const editorBody = document.querySelector('#manager-editor-body');
const managerTabs = [...document.querySelectorAll('[data-manager-tab]')];
const storeElements = [...document.querySelectorAll('body > .site-header, body > #main, body > .site-footer')];
const skipLink = document.querySelector('.skip');
let managerSection = 'overview';
let inquiryFilter = '';

function syncDemoView() {
  const isManager = location.hash === '#manager';
  const changed = manager.hidden === isManager;
  manager.hidden = !isManager;
  storeElements.forEach(element => { element.hidden = isManager; });
  skipLink.href = isManager ? '#manager-title' : '#main';
  document.title = isManager ? 'Import manager — Yume Imported' : 'Yume Imported — Japan to your garage';
  if (!changed) return;

  if (isManager) {
    renderManager();
    window.scrollTo({ top: 0, behavior: 'instant' });
    managerTitle.focus({ preventScroll: true });
    return;
  }

  const target = location.hash.slice(1);
  requestAnimationFrame(() => document.getElementById(target || 'top')?.scrollIntoView({ behavior: 'instant' }));
}

function statusPill(text) {
  const positive = ['Open', 'New', 'Arrived'].includes(text);
  return `<span class="manager-pill ${positive ? 'positive' : ''}">${demo.escape(text)}</span>`;
}

function managerOverview({ containers, rates, inquiries }) {
  const visible = containers.filter(item => !item.hidden);
  const open = visible.filter(item => item.status === 'Open');
  const kpis = [
    ['Open containers', open.length],
    ['Published containers', visible.length],
    ['New inquiries', inquiries.filter(item => item.status === 'New').length],
    ['Shipping rates', rates.parts.length + rates.vehicles.length],
  ];

  return `<div class="manager-kpis">${kpis.map(([label, value]) =>
    `<div class="manager-kpi"><span>${label}</span><strong>${value}</strong></div>`
  ).join('')}</div>
  <div class="manager-columns">
    <section class="manager-panel">
      <div class="manager-panel-head"><div><h2>Open for booking</h2><p>Published containers with space available.</p></div></div>
      ${open.slice(0, 5).map(item => `<div class="manager-list-row"><div>
        <strong>${demo.escape(item.year)} · Container #${demo.escape(item.number)}</strong>
        <span>${demo.escape(item.cargo || 'Cargo to be confirmed')}${item.eta ? ' · ETA ' + demo.formatDate(item.eta) : ''}</span>
      </div>${statusPill(item.status)}</div>`).join('') || '<p class="manager-empty">No containers are currently open.</p>'}
      <button class="manager-button secondary panel-footer-action" type="button" data-manager-go="containers">Manage containers</button>
    </section>
    <section class="manager-panel">
      <div class="manager-panel-head"><div><h2>Recent inquiries</h2><p>Example requests and drafts saved from the storefront.</p></div></div>
      ${inquiries.slice(0, 4).map(item => `<div class="manager-list-row"><div>
        <strong>${demo.escape(demo.services[item.service])}</strong>
        <span>${demo.escape(item.details)}</span>
      </div>${statusPill(item.status)}</div>`).join('') || '<p class="manager-empty">No demo inquiries yet.</p>'}
      <button class="manager-button secondary panel-footer-action" type="button" data-manager-go="inquiries">Open inbox</button>
    </section>
  </div>
  <button class="manager-reset" type="button" data-edit="reset">Reset demo data</button>`;
}

function managerContainers({ containers, seasonStarts }) {
  return `<div class="manager-panel-head manager-content-head">
    <div><h2>Container schedule</h2><p>Edit dates, cargo, availability, and which containers appear on the storefront.</p></div>
    <button class="manager-button" type="button" data-edit="container">Add container</button>
  </div>
  ${demo.groupContainers(containers).map(({ year, items }) => `<section class="manager-panel manager-season" aria-label="${year} containers">
    <div class="manager-panel-head">
      <div><h3>${year} schedule</h3>${seasonStarts[year] ? `<p>Starts ${demo.formatDate(seasonStarts[year])}</p>` : ''}</div>
      <button class="manager-button secondary" type="button" data-edit="season" data-id="${year}" aria-label="Edit ${year} schedule start">Edit schedule start</button>
    </div>
    <div class="manager-container-list">${items.map(item => `<article class="manager-container">
      <div>
        <h4>Container #${demo.escape(item.number)}</h4>
        <p>${demo.escape(item.cargo || 'Cargo to be confirmed')}</p>
      </div>
      <div class="manager-container-dates">
        ${demo.timing(item).map(([label, date]) => `<span>${label} <strong>${demo.formatDate(date)}</strong></span>`).join('') || '<span>Dates to be confirmed</span>'}
      </div>
      <div class="manager-container-status">${statusPill(item.status)}${item.hidden ? '<span class="manager-pill">Hidden</span>' : ''}</div>
      <button class="manager-button secondary" type="button" data-edit="container" data-id="${demo.escape(item.id)}" aria-label="Edit ${year} container ${demo.escape(item.number)}">Edit</button>
    </article>`).join('')}</div>
  </section>`).join('')}`;
}

function inquiryList(inquiries) {
  const matching = inquiries.filter(item => !inquiryFilter || item.status === inquiryFilter);
  return matching.map(item => `<article class="manager-panel manager-inquiry">
    <div>
      <p class="manager-meta">${demo.escape(item.id)} · ${demo.formatDate(item.created)}</p>
      <h3>${demo.escape(demo.services[item.service])}</h3>
      <p class="manager-inquiry-details">${demo.escape(item.details)}</p>
    </div>
    <label>Status<select data-inquiry-id="${demo.escape(item.id)}" aria-label="Status for inquiry ${demo.escape(item.id)}">
      ${options(demo.inquiryStatuses, item.status)}
    </select></label>
  </article>`).join('') || '<p class="manager-empty">No demo inquiries match this status.</p>';
}

function managerInquiries({ inquiries }) {
  return `<div class="manager-panel-head manager-content-head">
    <div><h2>Inquiry inbox</h2><p>Review sample requests and move them through your quote workflow.</p></div>
    <label class="manager-filter">Show<select id="inquiry-filter">
      <option value="">All statuses</option>${options(demo.inquiryStatuses, inquiryFilter)}
    </select></label>
  </div>
  <div id="manager-inquiry-list">${inquiryList(inquiries)}</div>`;
}

function managerRates({ rates }) {
  return `<div class="manager-panel-head manager-content-head">
    <div><h2>Shipping rates</h2><p>Changes update the price list in the storefront preview.</p></div>
  </div>
  ${['parts', 'vehicles'].map(category => `<section class="manager-panel manager-rate-panel">
    <h3>${category === 'parts' ? 'Parts shipping' : 'Vehicle shipping'}</h3>
    <div>${rates[category].map(item => `<div class="manager-rate-row">
      <strong>${demo.escape(item.name)}</strong><span>${demo.escape(item.price)}</span>
      <button class="manager-button secondary" type="button" data-edit="rate" data-category="${category}" data-id="${demo.escape(item.id)}" aria-label="Edit ${demo.escape(item.name)} rate">Edit</button>
    </div>`).join('')}</div>
  </section>`).join('')}`;
}

const managerViews = {
  overview: managerOverview,
  containers: managerContainers,
  inquiries: managerInquiries,
  rates: managerRates,
};

function renderManager() {
  managerPanel.innerHTML = managerViews[managerSection](demo.read());
}

function selectSection(section) {
  managerSection = section;
  managerNotice.textContent = '';
  managerTabs.forEach(tab => {
    if (tab.dataset.managerTab === section) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  renderManager();
  managerTabs.find(tab => tab.dataset.managerTab === section)?.focus();
}

function options(values, selected) {
  return values.map(value =>
    `<option value="${demo.escape(value)}"${selected === value ? ' selected' : ''}>${demo.escape(value)}</option>`
  ).join('');
}

function showEditor(title, body) {
  managerNotice.textContent = '';
  editorTitle.textContent = title;
  editorBody.innerHTML = body;
  managerEditor.showModal();
}

function editorActions(label = 'Save changes') {
  return `<div class="manager-editor-actions">
    <button class="manager-button" type="submit">${label}</button>
    <button class="manager-button secondary" type="button" data-close-editor>Cancel</button>
  </div>`;
}

function editContainer(id) {
  const { containers } = demo.read();
  const item = containers.find(record => record.id === id);
  const year = item?.year ?? Math.max(new Date().getFullYear(), ...containers.map(record => record.year));
  showEditor(item ? `Edit ${item.year} container #${item.number}` : 'Add container', `<form data-editor="container" data-id="${demo.escape(id)}">
    <div class="manager-fields">
      <label>Schedule year<input name="year" type="number" min="2000" max="2200" required value="${demo.escape(year)}"></label>
      <label>Container number<input name="number" required maxlength="12" pattern="[A-Za-z0-9\\-]+" value="${demo.escape(item?.number)}"></label>
      <label>Status<select name="status">${options(demo.containerStatuses, item?.status)}</select></label>
      <label>Cargo<select name="cargo"><option value="">To be confirmed</option>${options(demo.cargoOptions, item?.cargo)}</select></label>
      <label>Departure date<input name="departure" type="date" value="${demo.escape(item?.departure)}"></label>
      <label>Estimated arrival<input name="eta" type="date" value="${demo.escape(item?.eta)}"></label>
      <label>Actual arrival<input name="arrival" type="date" value="${demo.escape(item?.arrival)}"></label>
    </div>
    <label>Public note<input name="note" type="text" maxlength="160" value="${demo.escape(item?.note)}" placeholder="Optional special instructions for this sailing"></label>
    <label class="manager-check"><input name="visible" type="checkbox" ${item?.hidden ? '' : 'checked'}> Show on storefront</label>
    ${editorActions(item ? 'Save changes' : 'Add container')}
  </form>`);
}

function editSeason(year) {
  showEditor(`Edit ${year} schedule start`, `<form data-editor="season" data-id="${year}">
    <label>Start date<input type="date" name="start" value="${demo.escape(demo.read().seasonStarts[year])}"></label>
    <p>Leave blank to remove the start date from the storefront schedule.</p>
    ${editorActions()}
  </form>`);
}

function editRate(category, id) {
  const item = demo.read().rates[category].find(record => record.id === id);
  showEditor(`Edit ${item.name} rate`, `<form data-editor="rate" data-category="${category}" data-id="${demo.escape(id)}">
    <label>Item label<input name="name" required maxlength="70" value="${demo.escape(item.name)}"></label>
    <label>Displayed rate<input name="price" required maxlength="65" value="${demo.escape(item.price)}" placeholder="For example, From $799"></label>
    ${editorActions()}
  </form>`);
}

function confirmReset() {
  showEditor('Reset demo data', `<form data-editor="reset">
    <p>Restore the example schedule, shipping rates, and inquiries in this browser.</p>
    ${editorActions('Reset demo data')}
  </form>`);
}

function saveContainer(form, values) {
  const year = Number(values.get('year'));
  const number = values.get('number').trim();
  const id = form.dataset.id || crypto.randomUUID();
  const { containers } = demo.read();
  if (containers.some(item => item.id !== id && item.year === year && item.number.toLowerCase() === number.toLowerCase())) {
    form.elements.number.setCustomValidity('That container number already exists in this schedule.');
    form.elements.number.reportValidity();
    return false;
  }

  const record = {
    id, year, number,
    status: values.get('status'),
    cargo: values.get('cargo'),
    departure: values.get('departure'),
    eta: values.get('eta'),
    arrival: values.get('arrival'),
    note: values.get('note').trim(),
    hidden: !values.has('visible'),
  };
  demo.update(state => {
    const index = state.containers.findIndex(item => item.id === id);
    if (index < 0) state.containers.push(record);
    else state.containers[index] = record;
  });
  return true;
}

function saveRate(form, values) {
  for (const field of ['name', 'price']) {
    if (values.get(field).trim()) continue;
    form.elements[field].setCustomValidity('Enter a value.');
    form.elements[field].reportValidity();
    return false;
  }
  demo.update(state => {
    const rate = state.rates[form.dataset.category].find(item => item.id === form.dataset.id);
    rate.name = values.get('name').trim();
    rate.price = values.get('price').trim();
  });
  return true;
}

const editorActionsByType = {
  container(button) { editContainer(button.dataset.id); },
  season(button) { editSeason(Number(button.dataset.id)); },
  rate(button) { editRate(button.dataset.category, button.dataset.id); },
  reset: confirmReset,
};

manager.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const section = button.dataset.managerTab || button.dataset.managerGo;
  if (section) selectSection(section);
  if (button.dataset.edit) editorActionsByType[button.dataset.edit](button);
});

managerPanel.addEventListener('change', event => {
  const select = event.target;
  const id = select.dataset.inquiryId;
  if (select.id === 'inquiry-filter') {
    inquiryFilter = select.value;
    document.querySelector('#manager-inquiry-list').innerHTML = inquiryList(demo.read().inquiries);
    return;
  }
  if (!id) return;

  demo.update(state => {
    state.inquiries.find(item => item.id === id).status = select.value;
  });
  if (inquiryFilter) {
    document.querySelector('#manager-inquiry-list').innerHTML = inquiryList(demo.read().inquiries);
    document.querySelector('#inquiry-filter').focus();
  }
  managerNotice.textContent = `Inquiry ${id} updated.`;
});

managerEditor.addEventListener('click', event => {
  if (event.target.closest('[data-close-editor]')) managerEditor.close();
});

managerEditor.addEventListener('input', event => {
  if (event.target instanceof HTMLInputElement) event.target.setCustomValidity('');
});

managerEditor.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const values = new FormData(form);
  const editor = form.dataset.editor;
  if (editor === 'container' && !saveContainer(form, values)) return;
  if (editor === 'rate' && !saveRate(form, values)) return;
  if (editor === 'season') demo.update(state => { state.seasonStarts[form.dataset.id] = values.get('start'); });
  if (editor === 'reset') demo.reset();

  managerEditor.close();
  renderManager();
  managerTabs.find(tab => tab.dataset.managerTab === managerSection)?.focus();
  managerNotice.textContent = editor === 'reset' ? 'Demo data reset.' : 'Saved. Changes are visible in the storefront preview.';
});

skipLink.addEventListener('click', event => {
  if (manager.hidden) return;
  event.preventDefault();
  managerTitle.focus();
});

window.addEventListener('hashchange', syncDemoView);
syncDemoView();
