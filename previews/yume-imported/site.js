const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');

function setMenu(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', open);
}

menuToggle.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuToggle.focus();
  }
});

const tabs = [...document.querySelectorAll('.rate-tabs [role="tab"]')];

function showRateTab(selectedTab) {
  for (const tab of tabs) {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showRateTab(tab));
  tab.addEventListener('keydown', (event) => {
    const targets = {
      ArrowLeft: tabs[(index + tabs.length - 1) % tabs.length],
      ArrowRight: tabs[(index + 1) % tabs.length],
      Home: tabs[0],
      End: tabs.at(-1),
    };
    const target = targets[event.key];
    if (!target) return;
    event.preventDefault();
    showRateTab(target);
    target.focus();
  });
});

const dialog = document.querySelector('#quote-dialog');
const form = document.querySelector('#quote-form');
const service = document.querySelector('#quote-service');
const details = document.querySelector('#quote-details');
const preview = document.querySelector('#quote-preview');
const draft = document.querySelector('#quote-draft');
const copyStatus = document.querySelector('#copy-status');

document.querySelectorAll('[data-quote]').forEach((button) => {
  button.addEventListener('click', () => {
    setMenu(false);
    form.reset();
    details.setCustomValidity('');
    form.hidden = false;
    preview.hidden = true;
    draft.value = '';
    copyStatus.textContent = '';
    saveInquiry.disabled = false;
    service.value = button.dataset.quote;
    dialog.showModal();
    (service.value ? details : service).focus();
  });
});

document.querySelector('#close-quote-dialog').addEventListener('click', () => dialog.close());

details.addEventListener('input', () => details.setCustomValidity(''));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = details.value.trim();
  if (!message) {
    details.setCustomValidity('Enter a few details about what you want to import.');
    details.reportValidity();
    return;
  }

  const selectedService = service.selectedOptions[0].textContent;
  saveInquiry.disabled = false;
  draft.value = `Hi Yume Imported,\n\nI'd like a quote for the following.\n\nService: ${selectedService}\nDetails: ${message}\n\nThank you!`;
  form.hidden = true;
  preview.hidden = false;
  copyStatus.textContent = '';
  document.querySelector('#preview-title').focus();
});

document.querySelector('#edit-draft').addEventListener('click', () => {
  preview.hidden = true;
  form.hidden = false;
  details.focus();
});

document.querySelector('#copy-draft').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(draft.value);
    copyStatus.textContent = 'Inquiry copied.';
  } catch {
    draft.focus();
    draft.select();
    copyStatus.textContent = 'The draft is selected. Use your device’s copy command.';
  }
});

const demo = window.yumeDemo;
const schedule = document.querySelector('#container-schedule');
const ratePanels = {
  parts: document.querySelector('#parts-rates'),
  vehicles: document.querySelector('#vehicle-rates'),
};

function rateRows(rates) {
  return `<dl class="rate-list">${rates.map(({ name, price }) =>
    `<div><dt>${demo.escape(name)}</dt><dd>${demo.escape(price)}</dd></div>`
  ).join('')}</dl>`;
}

function containerCard(item) {
  const dates = demo.timing(item);
  return `<li class="container-card">
    <div class="container-card-top">
      <h5>Container #${demo.escape(item.number)}</h5>
      <span class="container-status ${item.status === 'Open' ? 'is-available' : ''}">${demo.escape(item.status)}</span>
    </div>
    ${item.cargo ? `<p class="container-cargo">${demo.escape(item.cargo)}</p>` : ''}
    ${item.note ? `<p class="container-note">${demo.escape(item.note)}</p>` : ''}
    ${dates.length ? `<dl class="container-timing">${dates.map(([label, date]) =>
      `<div><dt>${label}</dt><dd>${demo.formatDate(date)}</dd></div>`
    ).join('')}</dl>` : ''}
  </li>`;
}

function renderShipping() {
  const { containers, seasonStarts, rates } = demo.read();
  const groups = demo.groupContainers(containers.filter(item => !item.hidden));
  schedule.innerHTML = groups.length ? groups.map(({ year, items }) => `<div class="container-group">
    <div class="container-year">
      <h4>${year} containers</h4>
      ${seasonStarts[year] ? `<p>Schedule starts ${demo.formatDate(seasonStarts[year])}</p>` : ''}
    </div>
    <ul class="container-cards">${items.map(containerCard).join('')}</ul>
  </div>`).join('') : '<p>Call Yume for the next available container.</p>';

  const allPartsOpen = ratePanels.parts.querySelector('details')?.open;
  ratePanels.parts.innerHTML = `${rateRows(rates.parts.slice(0, 4))}
    <details class="all-rates" ${allPartsOpen ? 'open' : ''}>
      <summary>View all ${rates.parts.length} parts rates</summary>
      ${rateRows(rates.parts.slice(4))}
    </details>`;
  ratePanels.vehicles.innerHTML = `${rateRows(rates.vehicles)}
    <p class="rate-note">Rates apply to running and non-running vehicles.</p>`;
}

window.addEventListener('yume-demo-change', renderShipping);
renderShipping();

const saveInquiry = document.querySelector('#save-inquiry');

saveInquiry.addEventListener('click', () => {
  const id = 'D-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  demo.update(state => {
    state.inquiries.unshift({
      id,
      service: service.value,
      details: details.value.trim(),
      status: 'New',
      created: new Date().toISOString(),
    });
  });
  saveInquiry.disabled = true;
  copyStatus.textContent = 'Saved in the demo inbox as ' + id + '. Open Admin preview to review it.';
});
