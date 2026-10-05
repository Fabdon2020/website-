// CV Builder: 10 layouts x 5 palettes = 50 templates, rendered live in the browser.
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'axious-cv-v2';
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lines = (s, sep = /\n/) => String(s || '').split(sep).map((x) => x.trim()).filter(Boolean);

  const PALETTES = [
    { id: 'orange', name: 'Axious Orange', a: '#ff6a00', b: '#fff0e5', d: '#3b1d0a' },
    { id: 'ocean', name: 'Ocean Blue', a: '#1f6fd1', b: '#e8f1fc', d: '#0f2a4a' },
    { id: 'forest', name: 'Forest Green', a: '#1f8a5b', b: '#e6f5ee', d: '#10352a' },
    { id: 'charcoal', name: 'Charcoal', a: '#3a3f47', b: '#eef0f2', d: '#1b1e22' },
    { id: 'plum', name: 'Plum', a: '#8a3ab9', b: '#f4eafa', d: '#2e1340' },
  ];

  const SAMPLE = {
    template: 'sidebar-left-orange', photo: '', photoShape: 'round',
    name: 'Thandiwe Nkosi', title: 'Product Designer',
    email: 'thandiwe.nkosi@example.co.za', phone: '+27 82 555 0147', location: '12 Jan Smuts Avenue, Rosebank, Johannesburg, 2196', website: 'linkedin.com/in/thandiwenkosi',
    summary: 'Creative product designer with 6+ years of experience crafting user-friendly web and mobile apps. Passionate about clean interfaces, accessibility and data-informed design.',
    experience: [
      { role: 'Senior Product Designer', org: 'Ubuntu Digital, Johannesburg', start: '2021', end: 'Present', desc: 'Led redesign of the core app, lifting retention by 18%.\nBuilt and maintained the company design system.' },
      { role: 'UI/UX Designer', org: 'Kasi Creative Agency, Cape Town', start: '2018', end: '2021', desc: 'Designed 20+ client websites and mobile apps.\nRan user research and usability testing.' },
    ],
    education: [{ role: 'BA Graphic Design', org: 'University of Johannesburg', start: '2014', end: '2018', desc: '' }],
    skills: 'Figma, Prototyping, User research, Design systems, HTML & CSS, Accessibility',
    languages: 'English (fluent)\nisiZulu (native)\nAfrikaans (conversational)',
    certs: 'Google UX Design Certificate',
    refs: 'Available on request',
  };

  let cv;
  try { cv = JSON.parse(localStorage.getItem(KEY)) || null; } catch { cv = null; }
  if (!cv) cv = structuredClone(SAMPLE);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cv)); } catch { /* storage full or blocked */ } };

  // ---- shared building blocks ----
  const photo = (d) => d.photo ? `<img class="cv-photo ${d.photoShape}" src="${d.photo}" alt="">` : '';
  const contact = (d) => [d.email, d.phone, d.location, d.website].filter(Boolean).map((c) => `<li>${esc(c)}</li>`).join('');
  const sec = (t, body) => (body ? `<section class="cv-sec"><h3>${t}</h3>${body}</section>` : '');
  const items = (list) => list.filter((e) => e.role || e.org).map((e) => `
    <div class="cv-item"><div class="cv-item-h"><b>${esc(e.role)}</b><span>${esc([e.start, e.end].filter(Boolean).join(' – '))}</span></div>
    <div class="cv-org">${esc(e.org)}</div>${lines(e.desc).length ? `<ul>${lines(e.desc).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div>`).join('');
  const tags = (s) => (lines(s, /\n|,/).length ? `<ul class="cv-tags">${lines(s, /\n|,/).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const plain = (s) => (lines(s).length ? `<ul class="cv-plain">${lines(s).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const parts = (d) => ({
    head: `<h1>${esc(d.name)}</h1><div class="cv-title">${esc(d.title)}</div>`,
    contact: `<ul class="cv-contact">${contact(d)}</ul>`,
    summary: sec('Profile', d.summary ? `<p>${esc(d.summary)}</p>` : ''),
    exp: sec('Experience', items(d.experience)),
    edu: sec('Education', items(d.education)),
    skills: sec('Skills', tags(d.skills)),
    langs: sec('Languages', plain(d.languages)),
    certs: sec('Certifications', plain(d.certs)),
    refs: sec('References', d.refs ? `<p>${esc(d.refs)}</p>` : ''),
  });

  const side = (p, d) => `<aside class="cv-side">${photo(d)}${p.contact}${p.skills}${p.langs}${p.certs}</aside>`;
  const LAYOUTS = [
    { id: 'classic', name: 'Classic', r: (p, d) => `<header class="cv-top">${photo(d)}<div>${p.head}${p.contact}</div></header>${p.summary}${p.exp}${p.edu}${p.skills}${p.langs}${p.certs}${p.refs}` },
    { id: 'sidebar-left', name: 'Sidebar', r: (p, d) => `<div class="cv-cols">${side(p, d)}<div class="cv-main">${p.head}${p.summary}${p.exp}${p.edu}${p.refs}</div></div>` },
    { id: 'sidebar-right', name: 'Sidebar Right', r: (p, d) => `<div class="cv-cols"><div class="cv-main">${p.head}${p.summary}${p.exp}${p.edu}${p.refs}</div>${side(p, d)}</div>` },
    { id: 'band', name: 'Modern Band', r: (p, d) => `<header class="cv-band">${photo(d)}<div>${p.head}</div></header><div class="cv-pad">${p.contact}${p.summary}${p.exp}${p.edu}<div class="cv-2">${p.skills}${p.langs}</div>${p.certs}${p.refs}</div>` },
    { id: 'minimal', name: 'Minimal', r: (p, d) => `<header class="cv-top">${p.head}${p.contact}</header>${photo(d)}${p.summary}${p.exp}${p.edu}${p.skills}${p.langs}${p.certs}${p.refs}` },
    { id: 'twocol', name: 'Two Column', r: (p, d) => `<header class="cv-top">${photo(d)}<div>${p.head}${p.contact}</div></header>${p.summary}<div class="cv-2"><div>${p.exp}</div><div>${p.edu}${p.skills}${p.langs}${p.certs}${p.refs}</div></div>` },
    { id: 'timeline', name: 'Timeline', r: (p, d) => `<header class="cv-top">${photo(d)}<div>${p.head}${p.contact}</div></header>${p.summary}<div class="cv-tl">${p.exp}${p.edu}</div>${p.skills}${p.langs}${p.certs}${p.refs}` },
    { id: 'executive', name: 'Executive', r: (p, d) => `<header class="cv-top">${photo(d)}${p.head}${p.contact}</header>${p.summary}${p.exp}${p.edu}<div class="cv-2">${p.skills}${p.langs}</div>${p.certs}${p.refs}` },
    { id: 'creative', name: 'Creative', r: (p, d) => `<div class="cv-cols">${side(p, d)}<div class="cv-main"><div class="cv-block">${p.head}</div>${p.summary}${p.exp}${p.edu}${p.refs}</div></div>` },
    { id: 'compact', name: 'Compact', r: (p, d) => `<header class="cv-top">${photo(d)}<div>${p.head}</div>${p.contact}</header>${p.summary}${p.exp}<div class="cv-3">${p.edu}${p.skills}${p.langs}</div>${p.certs}${p.refs}` },
  ];
  const TEMPLATES = LAYOUTS.flatMap((l) => PALETTES.map((c) => ({ id: `${l.id}-${c.id}`, name: `${l.name} · ${c.name}`, l, c })));

  function renderInto(el, d, tplId) {
    const t = TEMPLATES.find((x) => x.id === tplId) || TEMPLATES[0];
    el.className = `cv-page cv-${t.l.id}`;
    el.style.setProperty('--cv-a', t.c.a);
    el.style.setProperty('--cv-b', t.c.b);
    el.style.setProperty('--cv-d', t.c.d);
    el.innerHTML = t.l.r(parts(d), d);
    return t;
  }

  // ---- form ----
  const F = (k, label, type = 'text') => `<label>${label}${type === 'area'
    ? `<textarea data-k="${k}" rows="3"></textarea>` : `<input data-k="${k}" type="${type}">`}</label>`;
  const listBox = (k, label, roleL, orgL) => `<fieldset><legend>${label}</legend><div data-list="${k}"></div>
    <button type="button" class="btn btn-ghost sm" data-add="${k}">+ Add</button>
    <template data-tpl="${k}"><div class="cv-row"><input data-f="role" placeholder="${roleL}"><input data-f="org" placeholder="${orgL}">
      <input data-f="start" placeholder="Start"><input data-f="end" placeholder="End">
      <textarea data-f="desc" rows="2" placeholder="Details (one per line)"></textarea>
      <button type="button" class="cv-del" title="Remove">✕</button></div></template></fieldset>`;

  function buildForm() {
    $('cv-form').innerHTML = `
      <fieldset><legend>Photo (optional)</legend>
        <div class="cv-photo-row"><img id="cv-photo-prev" alt=""><div>
        <label class="btn btn-ghost sm">Upload photo<input type="file" id="cv-photo" accept="image/png,image/jpeg,image/webp" hidden></label>
        <button type="button" class="btn btn-ghost sm" id="cv-photo-rm">Remove</button>
        <label class="inline">Shape <select data-k="photoShape"><option value="round">Round</option><option value="square">Square</option></select></label></div></div>
      </fieldset>
      <fieldset><legend>Personal details</legend>${F('name', 'Full name')}${F('title', 'Job title')}${F('email', 'Email', 'email')}${F('phone', 'Phone')}${F('location', 'Location')}${F('website', 'Website / LinkedIn')}${F('summary', 'Profile summary', 'area')}</fieldset>
      ${listBox('experience', 'Experience', 'Job title', 'Company')}
      ${listBox('education', 'Education', 'Degree / course', 'School')}
      <fieldset><legend>More</legend>${F('skills', 'Skills (comma separated)', 'area')}${F('languages', 'Languages (one per line)', 'area')}${F('certs', 'Certifications (one per line)', 'area')}${F('refs', 'References', 'area')}</fieldset>`;

    $('cv-form').querySelectorAll('[data-k]').forEach((el) => {
      el.value = cv[el.dataset.k] || '';
      el.addEventListener('input', () => { cv[el.dataset.k] = el.value; update(); });
    });
    ['experience', 'education'].forEach(fillList);
    $('cv-form').querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => {
      cv[b.dataset.add].push({ role: '', org: '', start: '', end: '', desc: '' });
      fillList(b.dataset.add); update();
    }));
    $('cv-photo').onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      shrinkImage(f).then((url) => { cv.photo = url; update(); });
    };
    $('cv-photo-rm').onclick = () => { cv.photo = ''; update(); };
  }

  function fillList(k) {
    const box = $('cv-form').querySelector(`[data-list="${k}"]`);
    const tpl = $('cv-form').querySelector(`[data-tpl="${k}"]`);
    box.innerHTML = '';
    cv[k].forEach((item, i) => {
      const row = tpl.content.firstElementChild.cloneNode(true);
      row.querySelectorAll('[data-f]').forEach((el) => {
        el.value = item[el.dataset.f] || '';
        el.addEventListener('input', () => { item[el.dataset.f] = el.value; update(); });
      });
      row.querySelector('.cv-del').onclick = () => { cv[k].splice(i, 1); fillList(k); update(); };
      box.append(row);
    });
  }

  // Downscale photos so drafts fit in localStorage and PDFs stay small.
  function shrinkImage(file) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = img.width * s; c.height = img.height * s;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // ---- templates picker ----
  function buildPicker() {
    const grid = $('tpl-grid');
    grid.innerHTML = '';
    TEMPLATES.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tpl'; b.dataset.id = t.id; b.title = t.name;
      b.innerHTML = '<div class="tpl-mini"><div></div></div><span></span>';
      b.querySelector('span').textContent = t.name;
      renderInto(b.querySelector('.tpl-mini > div'), cv, t.id);
      b.onclick = () => { cv.template = t.id; update(); };
      grid.append(b);
    });
  }

  function fitPreview() {
    const wrap = $('cv-scale').parentElement;
    const s = Math.min(1, wrap.clientWidth / 794);
    $('cv-scale').style.transform = `scale(${s})`;
    $('cv-scale').style.height = `${$('cv-page').offsetHeight * s}px`;
  }

  let thumbTimer;
  function update() {
    const t = renderInto($('cv-page'), cv, cv.template);
    $('tpl-name').textContent = `— ${t.name}`;
    document.querySelectorAll('.tpl').forEach((b) => b.classList.toggle('on', b.dataset.id === t.id));
    const prev = $('cv-photo-prev');
    if (prev) { prev.src = cv.photo || ''; prev.style.visibility = cv.photo ? 'visible' : 'hidden'; }
    fitPreview();
    save();
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(() => document.querySelectorAll('.tpl').forEach((b) => renderInto(b.querySelector('.tpl-mini > div'), cv, b.dataset.id)), 400);
  }

  // ---- export ----
  async function downloadPdf() {
    const status = (s) => ($('cv-status').textContent = s);
    status('Creating your PDF…');
    // Render an unscaled copy off-screen so html2canvas sees true A4 size.
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px';
    const page = document.createElement('div');
    holder.append(page); document.body.append(holder);
    renderInto(page, cv, cv.template);
    try {
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
      const pxPerPage = Math.floor(canvas.width * (H / W));
      // Ignore a sliver of overflow caused by rounding so short CVs stay one page.
      const total = canvas.height - pxPerPage < 40 ? Math.min(canvas.height, pxPerPage) : canvas.height;
      for (let y = 0, i = 0; y < total; y += pxPerPage, i++) {
        const slice = document.createElement('canvas');
        slice.width = canvas.width; slice.height = Math.min(pxPerPage, total - y);
        slice.getContext('2d').drawImage(canvas, 0, -y);
        if (i) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, (slice.height * W) / canvas.width);
      }
      pdf.save(`${(cv.name || 'cv').replace(/[^\w-]+/g, '_')}_CV.pdf`);
      status('Done! Your CV has been downloaded.');
    } catch (e) {
      console.error(e);
      status('Error: ' + e.message);
    } finally {
      holder.remove();
    }
  }

  let ready = false;
  window.CV = {
    show() {
      if (!ready) {
        ready = true;
        buildForm(); buildPicker();
        $('cv-pdf').onclick = downloadPdf;
        $('cv-print').onclick = () => window.print();
        $('cv-reset').onclick = () => {
          if (!confirm('Clear your CV and start over with the sample?')) return;
          cv = structuredClone(SAMPLE); buildForm(); update();
        };
        window.addEventListener('resize', fitPreview);
      }
      update();
    },
    TEMPLATES,
  };
  if (location.hash === '#cv') window.CV.show();
})();
