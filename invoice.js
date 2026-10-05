// Invoice & Quote maker: live A4 preview, logo, qty / m² pricing, VAT options, banking details.
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'axious-invoice-v1';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const br = (s) => esc(s).replace(/\n/g, '<br>');
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (n) => iso(new Date(Date.now() + n * 864e5));

  const UNITS = { qty: 'Qty', m2: 'm²', m: 'm', hrs: 'Hours', each: 'Each' };
  const COLORS = ['#ff6a00', '#1f6fd1', '#1f8a5b', '#3a3f47', '#8a3ab9', '#c0392b'];

  const SAMPLE = () => ({
    type: 'invoice', layout: 'classic', logo: '', color: '#ff6a00', currency: 'R',
    number: 'INV-0001', date: addDays(0), due: addDays(30), ref: '',
    from: { name: 'Sizwe Mahlangu Building & Tiling (Pty) Ltd', address: '45 Rivonia Road\nSandton, Johannesburg, 2196', email: 'accounts@example.co.za', phone: '+27 11 555 0123', vatNo: '4123456789', regNo: '2019/123456/07' },
    to: { name: 'Lerato Dlamini', address: '8 Oxford Road\nParktown, Johannesburg, 2193', email: 'lerato@example.co.za', phone: '+27 72 555 0198', vatNo: '' },
    items: [
      { desc: 'Floor tiling – supply and install 600x600 porcelain', unit: 'm2', qty: 42, rate: 385 },
      { desc: 'Tile adhesive and grout', unit: 'qty', qty: 12, rate: 165 },
      { desc: 'Removal of old flooring', unit: 'm2', qty: 42, rate: 60 },
    ],
    vatMode: 'exclusive', vatRate: 15,
    bank: { bank: 'FNB', holder: 'Sizwe Mahlangu Building & Tiling', account: '62000000000', branch: '250655', type: 'Cheque / Current', ref: 'INV-0001' },
    notes: 'Thank you for your business!',
    terms: 'Payment due within 30 days. Please use the invoice number as your payment reference.',
  });

  let d;
  try { d = JSON.parse(localStorage.getItem(KEY)) || null; } catch { d = null; }
  if (!d) d = SAMPLE();
  d.layout = d.layout || 'classic';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage full or blocked */ } };

  const num = (v) => (Number.isFinite(+v) ? +v : 0);
  const money = (n) => `${d.currency} ${num(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function totals() {
    const sum = d.items.reduce((t, i) => t + num(i.qty) * num(i.rate), 0);
    const r = num(d.vatRate) / 100;
    if (d.vatMode === 'exclusive') return { sub: sum, vat: sum * r, total: sum * (1 + r) };
    if (d.vatMode === 'inclusive') return { sub: sum / (1 + r), vat: sum - sum / (1 + r), total: sum };
    return { sub: sum, vat: 0, total: sum };
  }

  // ---- preview: shared blocks arranged by 10 layouts ----
  const COLOR_NAMES = { '#ff6a00': 'Orange', '#1f6fd1': 'Blue', '#1f8a5b': 'Green', '#3a3f47': 'Charcoal', '#8a3ab9': 'Plum', '#c0392b': 'Red' };

  function blocks() {
    const q = d.type === 'quote';
    const t = totals();
    const party = (p) => `<b>${esc(p.name)}</b>${p.address ? `<br>${br(p.address)}` : ''}${p.email ? `<br>${esc(p.email)}` : ''}${p.phone ? `<br>${esc(p.phone)}` : ''}${p.vatNo ? `<br>VAT No: ${esc(p.vatNo)}` : ''}${p.regNo ? `<br>Reg No: ${esc(p.regNo)}` : ''}`;
    const vatLabel = d.vatMode === 'inclusive' ? `VAT (${num(d.vatRate)}%, included)` : `VAT (${num(d.vatRate)}%)`;
    const b = d.bank;
    const bankRows = [['Bank', b.bank], ['Account holder', b.holder], ['Account number', b.account], ['Branch code', b.branch], ['Account type', b.type], ['Reference', b.ref]].filter((r) => r[1]);
    const dueLabel = q ? 'Valid until' : 'Due date';
    return {
      q, t, dueLabel,
      title: q ? 'QUOTATION' : (d.vatMode === 'none' ? 'INVOICE' : 'TAX INVOICE'),
      logo: d.logo ? `<img class="inv-logo" src="${d.logo}" alt="">` : '',
      from: `<div class="inv-from">${party(d.from)}</div>`,
      to: `<div class="inv-to"><div class="inv-label">${q ? 'Quote for' : 'Bill to'}</div>${party(d.to)}</div>`,
      meta: `<table class="inv-meta">
        <tr><td>${q ? 'Quote' : 'Invoice'} no.</td><td>${esc(d.number)}</td></tr>
        <tr><td>Date</td><td>${esc(d.date)}</td></tr>
        <tr><td>${dueLabel}</td><td>${esc(d.due)}</td></tr>
        ${d.ref ? `<tr><td>Reference</td><td>${esc(d.ref)}</td></tr>` : ''}</table>`,
      items: `<table class="inv-items">
        <thead><tr><th>#</th><th>Description</th><th class="r">Qty / Size</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
        <tbody>${d.items.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.desc)}</td>
          <td class="r">${num(i.qty)}${i.unit === 'qty' || i.unit === 'each' ? '' : ' ' + UNITS[i.unit]}</td>
          <td class="r">${money(i.rate)}${i.unit === 'm2' ? ' /m²' : i.unit === 'm' ? ' /m' : i.unit === 'hrs' ? ' /hr' : ''}</td>
          <td class="r">${money(num(i.qty) * num(i.rate))}</td></tr>`).join('')}</tbody></table>`,
      totals: `<table class="inv-totals">
        ${d.vatMode === 'none' ? '' : `<tr><td>Subtotal (excl. VAT)</td><td>${money(t.sub)}</td></tr><tr><td>${vatLabel}</td><td>${money(t.vat)}</td></tr>`}
        <tr class="inv-grand"><td>Total${d.vatMode === 'none' ? '' : ' (incl. VAT)'}</td><td>${money(t.total)}</td></tr></table>`,
      notes: `<div class="inv-notes">${d.notes ? `<p>${br(d.notes)}</p>` : ''}${d.terms ? `<div class="inv-label">Terms</div><p>${br(d.terms)}</p>` : ''}</div>`,
      bank: bankRows.length ? `<div class="inv-bank"><div class="inv-label">Banking details</div><table>${bankRows.map((r) => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td></tr>`).join('')}</table></div>` : '',
      foot: q ? '<p class="inv-foot">This quotation is valid until the date shown above. Prices are subject to change thereafter.</p>' : '',
    };
  }

  // Arrangements shared by several layouts; CSS under .inv-<layout> does the rest.
  const classic = (B) => `<header class="inv-top"><div class="inv-brand">${B.logo}${B.from}</div><div class="inv-title"><h1>${B.title}</h1>${B.meta}</div></header>
    ${B.to}${B.items}<div class="inv-bottom">${B.notes}${B.totals}</div>${B.bank}${B.foot}`;
  const boxed = (B) => `<header class="inv-head">${B.logo}<h1>${B.title}</h1></header>
    <div class="inv-boxes"><div class="inv-box"><div class="inv-label">From</div>${B.from}</div>${B.to}<div class="inv-box">${B.meta}</div></div>
    ${B.items}<div class="inv-bottom">${B.notes}${B.totals}</div>${B.bank}${B.foot}`;
  const LAYOUTS = [
    { id: 'classic', name: 'Classic', r: classic },
    { id: 'band', name: 'Modern Band', r: (B) => `<header class="inv-bandh"><div class="inv-chip">${B.logo || '<span></span>'}</div><div class="inv-title"><h1>${B.title}</h1>${B.meta}</div></header>
      <div class="inv-body"><div class="inv-parties"><div><div class="inv-label">From</div>${B.from}</div>${B.to}</div>${B.items}<div class="inv-bottom">${B.notes}${B.totals}</div>${B.bank}${B.foot}</div>` },
    { id: 'minimal', name: 'Minimal', r: classic },
    { id: 'sidebar', name: 'Sidebar', r: (B) => `<div class="inv-cols"><aside class="inv-side">${B.logo}${B.from}${B.bank}</aside>
      <div class="inv-main"><h1>${B.title}</h1>${B.meta}${B.to}${B.items}${B.totals}${B.notes}${B.foot}</div></div>` },
    { id: 'corporate', name: 'Corporate', r: boxed },
    { id: 'elegant', name: 'Elegant', r: (B) => `<header class="inv-center">${B.logo}<h1>${B.title}</h1>${B.from}</header>
      <div class="inv-parties">${B.to}<div>${B.meta}</div></div>${B.items}<div class="inv-bottom">${B.notes}${B.totals}</div>${B.bank}${B.foot}` },
    { id: 'bold', name: 'Bold', r: (B) => `<header class="inv-boldh"><div class="inv-block"><h1>${B.title}</h1><div>No. ${esc(d.number)} · ${esc(d.date)}</div></div>
      <div class="inv-due"><div class="inv-label">${B.q ? 'Quoted total' : 'Amount due'}</div><b>${money(B.t.total)}</b><div>${B.dueLabel}: ${esc(d.due)}</div></div></header>
      <div class="inv-parties"><div>${B.logo}${B.from}</div>${B.to}</div>${B.items}<div class="inv-bottom">${B.notes}${B.totals}</div>${B.bank}${B.foot}` },
    { id: 'split', name: 'Split', r: (B) => `<header class="inv-splith"><div class="inv-splitl">${B.logo}<h1>${B.title}</h1>${B.from}</div><div class="inv-splitr">${B.meta}${B.to}</div></header>
      <div class="inv-body">${B.items}<div class="inv-bottom">${B.notes}${B.totals}</div>${B.bank}${B.foot}</div>` },
    { id: 'stripe', name: 'Stripe', r: classic },
    { id: 'compact', name: 'Compact', r: boxed },
  ];
  const TEMPLATES = LAYOUTS.flatMap((l) => COLORS.map((c) => ({ id: `${l.id}|${c}`, name: `${l.name} · ${COLOR_NAMES[c]}`, l, c })));

  // Light tint of the accent, computed here because html2canvas can't parse color-mix().
  const tint = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    const mix = (v) => Math.round(v * a + 255 * (1 - a));
    return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  };

  function renderInto(el, layout = d.layout, color = d.color) {
    const l = LAYOUTS.find((x) => x.id === layout) || LAYOUTS[0];
    el.className = `inv-page inv-${l.id}${el.id === 'inv-page' ? ' print-page' : ''}`;
    el.style.setProperty('--ia', color);
    el.style.setProperty('--ia-soft', tint(color, 0.08));
    el.innerHTML = l.r(blocks());
    return l;
  }

  function buildPicker() {
    const grid = $('inv-tpl-grid');
    grid.innerHTML = '';
    TEMPLATES.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tpl'; b.dataset.l = t.l.id; b.dataset.c = t.c; b.title = t.name;
      b.innerHTML = '<div class="tpl-mini"><div></div></div><span></span>';
      b.querySelector('span').textContent = t.name;
      renderInto(b.querySelector('.tpl-mini > div'), t.l.id, t.c);
      b.onclick = () => { d.layout = t.l.id; d.color = t.c; update(); };
      grid.append(b);
    });
  }

  // ---- form ----
  const F = (k, label, type = 'text') => `<label>${label}${type === 'area' ? `<textarea data-k="${k}" rows="2"></textarea>` : `<input data-k="${k}" type="${type}">`}</label>`;
  function buildForm() {
    $('inv-form').innerHTML = `
      <fieldset><legend>Your business</legend>
        <div class="cv-photo-row"><img id="inv-logo-prev" alt=""><div>
          <label class="btn btn-ghost sm">Upload logo<input type="file" id="inv-logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>
          <button type="button" class="btn btn-ghost sm" id="inv-logo-rm">Remove</button></div></div>
        ${F('from.name', 'Business name')}${F('from.address', 'Address', 'area')}
        <div class="two">${F('from.email', 'Email', 'email')}${F('from.phone', 'Phone')}</div>
        <div class="two">${F('from.vatNo', 'VAT number')}${F('from.regNo', 'Company reg. number')}</div>
        <label>Accent colour<div class="swatches" id="inv-colors"></div></label>
      </fieldset>
      <fieldset><legend id="inv-client-legend">Client</legend>
        ${F('to.name', 'Client name')}${F('to.address', 'Address', 'area')}
        <div class="two">${F('to.email', 'Email', 'email')}${F('to.phone', 'Phone')}</div>${F('to.vatNo', 'Client VAT number (optional)')}
      </fieldset>
      <fieldset><legend>Details</legend>
        <div class="two">${F('number', 'Number')}${F('ref', 'Reference / PO (optional)')}</div>
        <div class="two">${F('date', 'Date', 'date')}<label><span id="inv-due-label">Due date</span><input data-k="due" type="date"></label></div>
        <div class="two"><label>Currency<select data-k="currency"><option value="R">R (ZAR)</option><option value="$">$ (USD)</option><option value="€">€ (EUR)</option><option value="£">£ (GBP)</option><option value="₦">₦ (NGN)</option><option value="KSh">KSh (KES)</option><option value="GH₵">GH₵ (GHS)</option><option value="P">P (BWP)</option><option value="N$">N$ (NAD)</option></select></label>
        <label>VAT<select data-k="vatMode"><option value="exclusive">Add VAT on top</option><option value="inclusive">Prices include VAT</option><option value="none">No VAT</option></select></label></div>
        ${F('vatRate', 'VAT rate (%)', 'number')}
      </fieldset>
      <fieldset><legend>Items</legend>
        <div id="inv-items"></div>
        <button type="button" class="btn btn-ghost sm" id="inv-add">+ Add item</button>
        <div class="inv-sum" id="inv-sum"></div>
      </fieldset>
      <fieldset><legend>Banking details</legend>
        <div class="two">${F('bank.bank', 'Bank')}${F('bank.holder', 'Account holder')}</div>
        <div class="two">${F('bank.account', 'Account number')}${F('bank.branch', 'Branch code')}</div>
        <div class="two">${F('bank.type', 'Account type')}${F('bank.ref', 'Payment reference')}</div>
      </fieldset>
      <fieldset><legend>Notes &amp; terms</legend>${F('notes', 'Notes', 'area')}${F('terms', 'Terms', 'area')}</fieldset>`;

    const get = (k) => k.split('.').reduce((o, p) => o[p], d);
    const set = (k, v) => { const ps = k.split('.'); const last = ps.pop(); ps.reduce((o, p) => o[p], d)[last] = v; };
    $('inv-form').querySelectorAll('[data-k]').forEach((el) => {
      el.value = get(el.dataset.k) ?? '';
      el.addEventListener('input', () => { set(el.dataset.k, el.value); update(); });
    });
    $('inv-colors').innerHTML = COLORS.map((c) => `<button type="button" style="background:${c}" data-c="${c}" title="${c}"></button>`).join('');
    $('inv-colors').querySelectorAll('button').forEach((b) => (b.onclick = () => { d.color = b.dataset.c; update(); }));
    $('inv-add').onclick = () => { d.items.push({ desc: '', unit: 'qty', qty: 1, rate: 0 }); fillItems(); update(); };
    $('inv-logo').onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { d.logo = r.result; update(); };
      r.readAsDataURL(f);
    };
    $('inv-logo-rm').onclick = () => { d.logo = ''; update(); };
    fillItems();
  }

  function fillItems() {
    const box = $('inv-items');
    box.innerHTML = '';
    d.items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'inv-row';
      row.innerHTML = `<input data-f="desc" placeholder="Description" class="wide">
        <select data-f="unit">${Object.entries(UNITS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
        <input data-f="qty" type="number" step="any" min="0" placeholder="Qty">
        <input data-f="rate" type="number" step="any" min="0" placeholder="Rate">
        <span class="inv-amt"></span>
        <button type="button" class="cv-del" title="Remove">✕</button>`;
      row.querySelectorAll('[data-f]').forEach((el) => {
        el.value = it[el.dataset.f] ?? '';
        el.addEventListener('input', () => { it[el.dataset.f] = el.value; update(); });
      });
      row.querySelector('.cv-del').onclick = () => { d.items.splice(i, 1); fillItems(); update(); };
      box.append(row);
    });
  }

  function fit() {
    const wrap = $('inv-scale').parentElement;
    const s = Math.min(1, wrap.clientWidth / 794);
    $('inv-scale').style.transform = `scale(${s})`;
    $('inv-scale').style.height = `${$('inv-page').offsetHeight * s}px`;
  }

  let thumbTimer;
  function update() {
    const q = d.type === 'quote';
    const l = renderInto($('inv-page'));
    $('inv-tpl-name').textContent = `— ${l.name} · ${COLOR_NAMES[d.color] || ''}`;
    document.querySelectorAll('#inv-tpl-grid .tpl').forEach((b) => b.classList.toggle('on', b.dataset.l === d.layout && b.dataset.c === d.color));
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(() => document.querySelectorAll('#inv-tpl-grid .tpl').forEach((b) => renderInto(b.querySelector('.tpl-mini > div'), b.dataset.l, b.dataset.c)), 400);
    document.querySelectorAll('#inv-type button').forEach((b) => b.classList.toggle('on', b.dataset.type === d.type));
    document.querySelectorAll('#inv-colors button').forEach((b) => b.classList.toggle('on', b.dataset.c === d.color));
    $('inv-due-label').textContent = q ? 'Valid until' : 'Due date';
    $('inv-client-legend').textContent = q ? 'Quote for' : 'Bill to';
    $('inv-form').querySelector('[data-k="vatRate"]').closest('label').hidden = d.vatMode === 'none';
    document.querySelectorAll('#inv-items .inv-row').forEach((r, i) => {
      const it = d.items[i];
      if (it) r.querySelector('.inv-amt').textContent = money(num(it.qty) * num(it.rate));
    });
    const t = totals();
    $('inv-sum').innerHTML = `Total: <b>${money(t.total)}</b>${d.vatMode === 'none' ? '' : ` <span>(VAT ${money(t.vat)})</span>`}`;
    const prev = $('inv-logo-prev');
    prev.src = d.logo || ''; prev.style.visibility = d.logo ? 'visible' : 'hidden';
    fit();
    save();
  }

  function setType(type) {
    if (d.type === type) return;
    // Swap the default number prefix when switching between invoice and quote.
    const [from, to] = type === 'quote' ? ['INV-', 'QUO-'] : ['QUO-', 'INV-'];
    if (d.number.startsWith(from)) d.number = to + d.number.slice(from.length);
    if (d.bank.ref.startsWith(from)) d.bank.ref = to + d.bank.ref.slice(from.length);
    d.type = type;
    if (type === 'quote' && /Payment due/.test(d.terms)) d.terms = 'A 50% deposit is required to confirm this quotation. Balance payable on completion.';
    if (type === 'invoice' && /deposit is required/.test(d.terms)) d.terms = SAMPLE().terms;
    buildForm(); update();
  }

  let ready = false;
  window.INV = {
    show() {
      if (!ready) {
        ready = true;
        buildForm(); buildPicker();
        document.querySelectorAll('#inv-type button').forEach((b) => (b.onclick = () => setType(b.dataset.type)));
        $('inv-pdf').onclick = () => window.exportA4((p) => renderInto(p), `${(d.number || d.type).replace(/[^\w-]+/g, '_')}.pdf`, (s) => ($('inv-status').textContent = s));
        $('inv-print').onclick = () => window.print();
        $('inv-reset').onclick = () => {
          if (!confirm('Clear this document and start over with the sample?')) return;
          d = SAMPLE(); buildForm(); update();
        };
        window.addEventListener('resize', fit);
      }
      update();
    },
  };
  if (location.hash === '#invoice') window.INV.show();
})();
