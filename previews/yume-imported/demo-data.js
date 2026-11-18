window.yumeDemo = (() => {
  const key = 'yume-imported-demo-v2';
  const containerStatuses = ['Open', 'Closed', 'In transit', 'Arrived'];
  const cargoOptions = ['Parts only', 'Vehicles only', 'Vehicles and parts'];
  const inquiryStatuses = ['New', 'Reviewing', 'Quote sent', 'Closed'];
  const services = {
    vehicle: 'Vehicles',
    parts: 'Parts & collectibles',
    shipping: 'Container shipping',
  };

  const parts = [
    { id: 'nankang-ns2r', reference: '165/55R14 · Set of 4', name: 'Nankang NS-2R tires', description: 'Ask about this size and container availability.' },
    { id: 'wheel-set', reference: 'Wheels', name: 'Japanese alloy wheel set', description: 'Include your diameter, bolt pattern, and offset.', photo: 'assets/parts.webp' },
    { id: 'body-kit', reference: 'Exterior', name: 'Body kit sourcing', description: 'Include your chassis code and the kit or brand you’re looking for.' },
  ];
  const initial = {
    cars: [
      { id: 'skyline-sedan', name: 'Nissan Skyline sedan', description: 'Purple four-door Skyline. Ask about the vehicle and inspection details.', status: 'Available', priceCents: null, photo: 'assets/hero.webp' },
      { id: 'kei-truck', name: 'Japanese kei truck', description: 'Compact pickup with a drop-side bed. Example listing.', status: 'Available', priceCents: 890000, photo: 'assets/kei-truck.webp' },
      { id: 'skyline-coupe', name: 'Nissan Skyline coupe', description: 'Silver two-door Skyline. Example of a sold listing.', status: 'Sold', priceCents: null, photo: 'assets/shipping.webp' },
    ],
    cart: [],

    containers: [
      { id: '26-1', number: '1', year: 2026, status: 'Closed', arrival: '2026-02-28' },
      { id: '26-2', number: '2', year: 2026, status: 'Arrived', arrival: '2026-10-30' },
      { id: '26-3', number: '3', year: 2026, status: 'Closed', departure: '2026-11-23', eta: '2026-12-23' },
      { id: '26-4', number: '4', year: 2026, status: 'Open', cargo: 'Parts only', departure: '2026-12-01', eta: '2027-01-10' },
      ...['1', '2', '3', '4'].map(number => ({ id: '27-' + number, number, year: 2027, status: 'Open' })),
    ],
    seasonStarts: { 2027: '2027-01-10' },
    rates: {
      parts: [
        { id: 'wheels', name: 'Wheel', price: '$75 each / $99 with tire' },
        { id: 'lights', name: 'Headlights', price: '$199 per set' },
        { id: 'bumper', name: 'Bumper', price: '$299 each' },
        { id: 'kit', name: 'Body kit', price: 'From $799' },
        { id: 'fenders', name: 'Fenders', price: '$299 per set' },
        { id: 'hood', name: 'Hood', price: '$499' },
        { id: 'doors', name: 'Doors', price: '$359 each' },
        { id: 'glass', name: 'Windshield (front or rear)', price: '$400' },
        { id: 'spoilers', name: 'Spoilers', price: '$99' },
        { id: 'suspension', name: 'Suspension', price: 'From $99' },
        { id: 'motors', name: 'Motors', price: '$550' },
        { id: 'gearbox', name: 'Transmission', price: '$450' },
        { id: 'cage', name: 'Roll cage (4–10 point)', price: '$475' },
        { id: 'interior', name: 'Interior pieces', price: '$50 minimum' },
        { id: 'seats', name: 'Seats', price: '$299 each' },
        { id: 'scooters', name: 'Scooters', price: '$399' },
        { id: 'motorcycles', name: 'Motorcycles', price: '$650' },
        { id: 'heavy', name: 'Heavy equipment', price: 'From $1,500' },
      ],
      vehicles: [
        { id: 'small', name: 'Small vehicle', price: 'From $2,200' },
        { id: 'medium', name: 'Medium vehicle', price: 'From $2,600' },
        { id: 'special', name: 'Specialty vehicle', price: '$5,000–$10,000' },
      ],
    },
    inquiries: [
      { id: 'D-104', service: 'parts', status: 'New', details: 'Looking for front headlights for a 1995 RX-7 FD. A used set is fine.', created: '2026-11-18T18:00:00Z' },
      { id: 'D-103', service: 'shipping', status: 'Reviewing', details: 'I already bought a body kit in Japan. Is there space in the next shared container?', created: '2026-11-17T20:00:00Z' },
      { id: 'D-102', service: 'vehicle', status: 'Quote sent', details: 'Interested in finding a 4WD kei truck for a project. Can you help source one?', created: '2026-11-16T19:00:00Z' },
    ],
  };

  let memory = structuredClone(initial);
  let persistent = true;

  function read() {
    if (persistent) {
      try {
        const saved = localStorage.getItem(key);
        memory = { ...structuredClone(initial), ...(saved ? JSON.parse(saved) : {}) };
      } catch {
        persistent = false;
      }
    }
    return memory;
  }

  function write() {
    try {
      localStorage.setItem(key, JSON.stringify(memory));
      persistent = true;
    } catch {
      persistent = false;
    }
    window.dispatchEvent(new Event('yume-demo-change'));
  }

  function update(change) {
    change(read());
    write();
  }

  function reset() {
    memory = structuredClone(initial);
    write();
  }

  function escape(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
  }

  const calendarDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
  });
  function formatDate(value) {
    return value ? calendarDate.format(new Date(value)) : '';
  }

  function groupContainers(list) {
    const years = [...new Set(list.map(item => item.year))].filter(Number.isInteger).sort((a, b) => a - b);
    return years.map(year => ({
      year,
      items: list.filter(item => item.year === year)
        .sort((a, b) => a.number.localeCompare(b.number, 'en', { numeric: true })),
    }));
  }

  function timing(item) {
    return [
      ['Ships', item.departure], ['ETA', item.eta], ['Arrived', item.arrival],
    ].filter(([, date]) => date);
  }

  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) window.dispatchEvent(new Event('yume-demo-change'));
  });

  return {
    read, update, reset, escape, formatDate, groupContainers, timing,
    containerStatuses, cargoOptions, inquiryStatuses, services, parts,
  };
})();
