# FreePDF

A completely free, ilovepdf-style PDF toolkit that runs entirely in the browser — no server, no uploads, no limits.

**Tools:** Merge, Organize pages (drag/rotate/delete), Split, Extract pages, Remove pages, Rotate, Compress, Image → PDF, PDF → Image, Watermark, Page numbers.

Built with [pdf-lib](https://pdf-lib.js.org/), [PDF.js](https://mozilla.github.io/pdf.js/) and [JSZip](https://stuk.github.io/jszip/) (loaded from cdnjs).

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Deploy for free (GitHub Pages)
1. In the repo: **Settings → Pages → Source: GitHub Actions**.
2. Push to `main` (or this branch). The workflow in `.github/workflows/pages.yml` publishes the site to `https://fabdon2020.github.io/website-/`.

Netlify / Cloudflare Pages / Vercel also work — it's a plain static folder.
