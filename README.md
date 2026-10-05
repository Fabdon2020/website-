# Axious PDF & CV Studio

A completely free PDF toolkit and CV builder that runs entirely in the browser — no server, no uploads, no limits.

**CV Builder:** 50 templates (10 layouts × 5 colour palettes), optional photo, live preview, PDF download/print, autosaved draft.

**Invoice & Quote Maker:** logo upload, quantity / m² / metre / hourly pricing, VAT added on top, VAT-inclusive or no VAT (rate editable, 15% default), banking details, notes & terms, currency picker, PDF download/print, autosaved draft.

**PDF tools:** Merge, Organize pages (drag/rotate/delete), Split, Extract pages, Remove pages, Rotate, Compress, Image → PDF, PDF → Image, Watermark, Page numbers.

Built with [pdf-lib](https://pdf-lib.js.org/), [PDF.js](https://mozilla.github.io/pdf.js/), [JSZip](https://stuk.github.io/jszip/), [html2canvas](https://html2canvas.hertzen.com/) and [jsPDF](https://github.com/parallax/jsPDF) (loaded from cdnjs).

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Deploy for free (GitHub Pages)
1. In the repo: **Settings → Pages → Source: GitHub Actions**.
2. Push to `main` (or this branch). The workflow in `.github/workflows/pages.yml` publishes the site to `https://fabdon2020.github.io/freepdf/`.

Netlify / Cloudflare Pages / Vercel also work — it's a plain static folder.
