const { PDFDocument, degrees, rgb, StandardFonts } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const $ = (id) => document.getElementById(id);
const PDF = 'application/pdf';

// Parse "1-3,5,8-" into zero-based page indexes.
function parseRanges(str, count) {
  const out = [];
  for (const part of str.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [a, b] = part.split('-');
    const start = parseInt(a || '1', 10);
    const end = part.includes('-') ? parseInt(b || String(count), 10) : start;
    for (let i = start; i <= end; i++) if (i >= 1 && i <= count) out.push(i - 1);
  }
  return out;
}

function download(data, name, type = PDF) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function zipAndDownload(entries, name) {
  const zip = new JSZip();
  entries.forEach(([n, d]) => zip.file(n, d));
  download(await zip.generateAsync({ type: 'blob' }), name, 'application/zip');
}

const load = async (f) => PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
const base = (f) => f.name.replace(/\.[^.]+$/, '');

async function renderPages(file, scale, fn) {
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    await fn(canvas, i, doc.numPages, page.getViewport({ scale: 1 }));
  }
}
const canvasBytes = (c, type, q) =>
  new Promise((r) => c.toBlob(async (b) => r(new Uint8Array(await b.arrayBuffer())), type, q));

const TOOLS = [
  {
    id: 'merge', icon: '🔗', name: 'Merge PDF', desc: 'Combine multiple PDFs into one, in the order you want.',
    accept: PDF, multiple: true, min: 2,
    async run(files) {
      const out = await PDFDocument.create();
      for (const f of files) {
        const src = await load(f);
        (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      }
      download(await out.save(), 'merged.pdf');
    },
  },
  {
    id: 'split', icon: '✂️', name: 'Split PDF', desc: 'Split every page into its own PDF, or by custom ranges.',
    accept: PDF,
    options: [{ id: 'ranges', label: 'Ranges, one output each (e.g. 1-3, 4-6). Leave empty to split every page.', type: 'text' }],
    async run([f], o) {
      const src = await load(f);
      const n = src.getPageCount();
      const groups = o.ranges.trim()
        ? o.ranges.split(',').map((r) => parseRanges(r, n)).filter((g) => g.length)
        : src.getPageIndices().map((i) => [i]);
      const entries = [];
      for (const [k, g] of groups.entries()) {
        const out = await PDFDocument.create();
        (await out.copyPages(src, g)).forEach((p) => out.addPage(p));
        entries.push([`${base(f)}-${k + 1}.pdf`, await out.save()]);
      }
      await zipAndDownload(entries, `${base(f)}-split.zip`);
    },
  },
  {
    id: 'extract', icon: '📑', name: 'Extract pages', desc: 'Pick the pages you want and save them as a new PDF.',
    accept: PDF,
    options: [{ id: 'pages', label: 'Pages to keep (e.g. 1,3,5-7)', type: 'text', value: '1' }],
    async run([f], o) {
      const src = await load(f);
      const out = await PDFDocument.create();
      (await out.copyPages(src, parseRanges(o.pages, src.getPageCount()))).forEach((p) => out.addPage(p));
      download(await out.save(), `${base(f)}-extracted.pdf`);
    },
  },
  {
    id: 'remove', icon: '🗑️', name: 'Remove pages', desc: 'Delete unwanted pages from a PDF.',
    accept: PDF,
    options: [{ id: 'pages', label: 'Pages to remove (e.g. 2,4-5)', type: 'text' }],
    async run([f], o) {
      const doc = await load(f);
      parseRanges(o.pages, doc.getPageCount()).sort((a, b) => b - a)
        .filter((v, i, a) => a.indexOf(v) === i).forEach((i) => doc.removePage(i));
      download(await doc.save(), `${base(f)}-edited.pdf`);
    },
  },
  {
    id: 'organize', icon: '🗂️', name: 'Organize pages', desc: 'Drag to reorder, rotate or delete pages visually.',
    accept: PDF,
    state: [],
    async onFiles([f]) {
      const box = $('pages');
      box.innerHTML = '';
      this.state = [];
      if (!f) return;
      const thumbs = [];
      await renderPages(f, 0.3, async (c, i) => { thumbs[i - 1] = c; this.state.push({ src: i - 1, rot: 0 }); });
      const draw = () => {
        box.innerHTML = '';
        this.state.forEach((s, k) => {
          const card = document.createElement('div');
          card.className = 'page'; card.draggable = true;
          const img = new Image(); img.src = thumbs[s.src].toDataURL();
          img.style.transform = `rotate(${s.rot}deg)`;
          const cap = document.createElement('div'); cap.textContent = s.src + 1;
          const mk = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; cap.append(b); };
          mk('↻', () => { s.rot = (s.rot + 90) % 360; draw(); });
          mk('✕', () => { this.state.splice(k, 1); draw(); $('go').disabled = !this.state.length; });
          card.append(img, cap);
          card.ondragstart = (e) => e.dataTransfer.setData('text/plain', k);
          card.ondragover = (e) => { e.preventDefault(); card.classList.add('over'); };
          card.ondragleave = () => card.classList.remove('over');
          card.ondrop = (e) => {
            e.preventDefault();
            const from = +e.dataTransfer.getData('text/plain');
            this.state.splice(k, 0, ...this.state.splice(from, 1));
            draw();
          };
          box.append(card);
        });
      };
      draw();
    },
    async run([f]) {
      const src = await load(f);
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, this.state.map((s) => s.src));
      pages.forEach((p, k) => {
        p.setRotation(degrees((p.getRotation().angle + this.state[k].rot) % 360));
        out.addPage(p);
      });
      download(await out.save(), `${base(f)}-organized.pdf`);
    },
  },
  {
    id: 'rotate', icon: '🔄', name: 'Rotate PDF', desc: 'Rotate all or selected pages.',
    accept: PDF,
    options: [
      { id: 'angle', label: 'Rotation', type: 'select', choices: ['90', '180', '270'] },
      { id: 'pages', label: 'Pages (empty = all)', type: 'text' },
    ],
    async run([f], o) {
      const doc = await load(f);
      const idx = o.pages.trim() ? parseRanges(o.pages, doc.getPageCount()) : doc.getPageIndices();
      idx.forEach((i) => {
        const p = doc.getPage(i);
        p.setRotation(degrees((p.getRotation().angle + +o.angle) % 360));
      });
      download(await doc.save(), `${base(f)}-rotated.pdf`);
    },
  },
  {
    id: 'compress', icon: '🗜️', name: 'Compress PDF', desc: 'Shrink file size by re-encoding pages as optimized images.',
    accept: PDF,
    options: [{ id: 'level', label: 'Compression', type: 'select', choices: ['Recommended', 'Extreme', 'Less'] }],
    async run([f], o, status) {
      const [scale, q] = { Recommended: [1.5, 0.6], Extreme: [1, 0.4], Less: [2, 0.8] }[o.level];
      const out = await PDFDocument.create();
      await renderPages(f, scale, async (c, i, n, vp) => {
        status(`Compressing page ${i}/${n}…`);
        const img = await out.embedJpg(await canvasBytes(c, 'image/jpeg', q));
        out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      });
      const bytes = await out.save();
      status(`${(f.size / 1024).toFixed(0)} KB → ${(bytes.length / 1024).toFixed(0)} KB`);
      download(bytes.length < f.size ? bytes : new Uint8Array(await f.arrayBuffer()), `${base(f)}-compressed.pdf`);
      return true;
    },
  },
  {
    id: 'jpg2pdf', icon: '🖼️', name: 'Image to PDF', desc: 'Convert JPG and PNG images into a PDF.',
    accept: 'image/jpeg,image/png', multiple: true,
    async run(files) {
      const out = await PDFDocument.create();
      for (const f of files) {
        const bytes = await f.arrayBuffer();
        const img = f.type === 'image/png' ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        out.addPage([img.width, img.height]).drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      download(await out.save(), 'images.pdf');
    },
  },
  {
    id: 'pdf2jpg', icon: '📷', name: 'PDF to Image', desc: 'Turn every PDF page into a JPG or PNG image.',
    accept: PDF,
    options: [{ id: 'fmt', label: 'Format', type: 'select', choices: ['jpg', 'png'] }],
    async run([f], o, status) {
      const entries = [];
      const type = o.fmt === 'png' ? 'image/png' : 'image/jpeg';
      await renderPages(f, 2, async (c, i, n) => {
        status(`Rendering page ${i}/${n}…`);
        entries.push([`${base(f)}-${i}.${o.fmt}`, await canvasBytes(c, type, 0.9)]);
      });
      await zipAndDownload(entries, `${base(f)}-images.zip`);
    },
  },
  {
    id: 'watermark', icon: '💧', name: 'Watermark', desc: 'Stamp text diagonally across every page.',
    accept: PDF,
    options: [
      { id: 'text', label: 'Watermark text', type: 'text', value: 'CONFIDENTIAL' },
      { id: 'opacity', label: 'Opacity (0–1)', type: 'number', value: '0.25' },
    ],
    async run([f], o) {
      const doc = await load(f);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      for (const p of doc.getPages()) {
        const { width, height } = p.getSize();
        const size = Math.min(width, height) / 8;
        const w = font.widthOfTextAtSize(o.text, size);
        p.drawText(o.text, {
          x: width / 2 - (w / 2) * Math.cos(Math.PI / 4), y: height / 2 - (w / 2) * Math.sin(Math.PI / 4),
          size, font, color: rgb(0.8, 0.1, 0.1), opacity: +o.opacity, rotate: degrees(45),
        });
      }
      download(await doc.save(), `${base(f)}-watermarked.pdf`);
    },
  },
  {
    id: 'numbers', icon: '🔢', name: 'Page numbers', desc: 'Add page numbers to the bottom of every page.',
    accept: PDF,
    options: [{ id: 'pos', label: 'Position', type: 'select', choices: ['center', 'right', 'left'] }],
    async run([f], o) {
      const doc = await load(f);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      pages.forEach((p, i) => {
        const { width } = p.getSize();
        const t = `${i + 1} / ${pages.length}`;
        const w = font.widthOfTextAtSize(t, 10);
        const x = o.pos === 'left' ? 30 : o.pos === 'right' ? width - w - 30 : (width - w) / 2;
        p.drawText(t, { x, y: 20, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
      });
      download(await doc.save(), `${base(f)}-numbered.pdf`);
    },
  },
];

// ---- UI ----
let tool = null;
let files = [];

{
  const b = document.createElement('button');
  b.className = 'card featured';
  b.innerHTML = '<div class="ic">📄</div><h3>CV Builder</h3><p>50 templates, photo support, instant PDF download.</p>';
  b.onclick = () => (location.hash = 'cv');
  $('grid').append(b);
}
TOOLS.forEach((t) => {
  const b = document.createElement('button');
  b.className = 'card';
  b.innerHTML = `<div class="ic">${t.icon}</div><h3>${t.name}</h3><p>${t.desc}</p>`;
  b.onclick = () => (location.hash = t.id);
  $('grid').append(b);
});

function route() {
  const hash = location.hash.slice(1);
  tool = TOOLS.find((t) => t.id === hash) || null;
  const cv = hash === 'cv';
  $('grid-view').hidden = !!tool || cv;
  $('tool-view').hidden = !tool;
  $('cv-view').hidden = !cv;
  window.scrollTo(0, 0);
  if (hash === 'tools') $('grid').scrollIntoView();
  if (cv && window.CV) window.CV.show();
  if (!tool) return;
  files = [];
  $('tool-title').textContent = tool.name;
  $('tool-desc').textContent = tool.desc;
  $('file-input').accept = tool.accept;
  $('file-input').multiple = !!tool.multiple;
  $('status').textContent = '';
  $('options').innerHTML = '';
  $('pages').innerHTML = '';
  (tool.options || []).forEach((o) => {
    const l = document.createElement('label');
    l.textContent = o.label;
    const el = document.createElement(o.type === 'select' ? 'select' : 'input');
    el.id = 'opt-' + o.id;
    if (o.type === 'select') o.choices.forEach((c) => el.add(new Option(c, c)));
    else { el.type = o.type; el.value = o.value || ''; if (o.type === 'number') el.step = '0.05'; }
    l.append(el);
    $('options').append(l);
  });
  renderFiles();
}

function renderFiles() {
  const list = $('file-list');
  list.innerHTML = '';
  files.forEach((f, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${f.name.replace(/</g, '&lt;')}</span>`;
    const mk = (txt, fn, show = true) => {
      if (!show) return;
      const b = document.createElement('button'); b.textContent = txt; b.onclick = fn; li.append(b);
    };
    mk('↑', () => { [files[i - 1], files[i]] = [files[i], files[i - 1]]; renderFiles(); }, tool.multiple && i > 0);
    mk('↓', () => { [files[i + 1], files[i]] = [files[i], files[i + 1]]; renderFiles(); }, tool.multiple && i < files.length - 1);
    mk('✕', () => { files.splice(i, 1); renderFiles(); if (tool.onFiles) tool.onFiles(files); });
    list.append(li);
  });
  $('go').disabled = files.length < (tool.min || 1);
  $('go').textContent = tool.name;
}

function addFiles(list) {
  const ok = [...list].filter((f) => tool.accept.split(',').includes(f.type));
  files = tool.multiple ? files.concat(ok) : ok.slice(0, 1);
  renderFiles();
  if (tool.onFiles) tool.onFiles(files);
}

$('file-input').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
const drop = $('drop');
['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });

$('go').onclick = async () => {
  const opts = {};
  (tool.options || []).forEach((o) => (opts[o.id] = $('opt-' + o.id).value));
  const status = (s) => ($('status').textContent = s);
  $('go').disabled = true;
  status('Working…');
  try {
    const keep = await tool.run.call(tool, files, opts, status);
    if (!keep) status('Done! Your download should start automatically.');
  } catch (err) {
    console.error(err);
    status('Error: ' + err.message);
  }
  $('go').disabled = false;
};

$('back').onclick = () => (location.hash = '');
$('home').onclick = (e) => { e.preventDefault(); location.hash = ''; };
window.addEventListener('hashchange', route);
route();
