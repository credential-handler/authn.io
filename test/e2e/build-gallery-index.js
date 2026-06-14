/*!
 * New BSD License (3-clause)
 * Copyright (c) 2026, Digital Bazaar, Inc.
 */
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

/* Builds an `index.html` contact sheet from the PNGs the gallery spec wrote
to `test/e2e/gallery/<engine>/<theme>/`. Run after `playwright test gallery`
(the `gallery` npm script chains them). Filesystem-driven so it sees every
engine's output regardless of which Playwright worker produced it. */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GALLERY_DIR = path.join(__dirname, 'gallery');

async function findPngs(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, {withFileTypes: true});
  } catch {
    return out;
  }
  for(const entry of entries) {
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()) {
      out.push(...await findPngs(full, base));
    } else if(entry.name.endsWith('.png')) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

const pngs = (await findPngs(GALLERY_DIR)).sort((a, b) => a.localeCompare(b));
if(pngs.length === 0) {
  console.error('No gallery PNGs found. Run `playwright test gallery` first.');
  process.exit(1);
}

const cards = pngs.map(rel => {
  // rel = <engine>/<theme>/<state>.png
  const [engine, theme, file] = rel.split(path.sep);
  const label = file.replace(/\.png$/, '').replace(/-/g, ' ');
  return `
    <figure>
      <img src="${rel}" alt="${label}" loading="lazy">
      <figcaption>${engine} / ${theme} — ${label}</figcaption>
    </figure>`;
}).join('');

const html = `<!doctype html>
<meta charset="utf-8">
<title>authn.io wallet chooser gallery</title>
<style>
  body {font: 14px system-ui, sans-serif; margin: 24px; background: #fafafa;}
  h1 {font-size: 18px;}
  .grid {display: flex; flex-wrap: wrap; gap: 16px;}
  figure {margin: 0; background: #fff; border: 1px solid #ddd;
    border-radius: 6px; padding: 8px;}
  img {display: block; width: 250px; height: auto; border: 1px solid #eee;}
  figcaption {font-size: 12px; color: #444; padding-top: 6px; max-width: 250px;}
</style>
<h1>authn.io wallet chooser — ${pngs.length} shots</h1>
<div class="grid">${cards}</div>`;

const indexPath = path.join(GALLERY_DIR, 'index.html');
await fs.writeFile(indexPath, html);
console.log(`Gallery contact sheet: ${indexPath}`);
