#!/usr/bin/env node
// Mind Palace — graph builder
// Recursively scans notes/ and emits a self-contained graph/index.html.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const NOTES     = path.join(ROOT, 'notes');
const OUT_DIR   = path.join(ROOT, 'graph');
const OUT       = path.join(OUT_DIR, 'index.html');
const TEMPLATE  = path.join(__dirname, 'graph-template.html');
const D3_PATH   = path.join(ROOT, 'node_modules', 'd3', 'dist', 'd3.min.js');

const ROOT_COLOR    = '#64748b';
const MISSING_COLOR = '#475569';
const PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6',
  '#06b6d4','#ef4444','#84cc16','#f97316','#14b8a6',
  '#a855f7','#22c55e',
];

const norm       = s => String(s||'').toLowerCase().replace(/\s+/g, ' ').trim();
const normLoose  = s => norm(s).replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

function parseFrontmatter(text) {
  const fm = { tags: [], date: null, title: null };
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { frontmatter: fm, body: text };
  const lines = m[1].split(/\r?\n/);
  const body = text.slice(m[0].length);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1], val = kv[2].trim();
    if (key === 'tags') {
      if (val === '') {
        const items = [];
        while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
          items.push(lines[++i].replace(/^\s*-\s+/, '').trim());
        }
        fm.tags = items;
      } else if (val.startsWith('[')) {
        fm.tags = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
      } else {
        fm.tags = val.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (key === 'date') {
      fm.date = val;
    } else if (key === 'title') {
      fm.title = val;
    }
  }
  return { frontmatter: fm, body };
}

function inlineTags(body) {
  const out = new Set();
  const re = /(^|[^\w#])#([a-z][\w-]*(\/[\w-]+)*)/gi;
  let m;
  while ((m = re.exec(body))) out.add(m[2].toLowerCase());
  return [...out];
}

function listMd(dir) {
  const out = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

// Scan for non-markdown asset files (images, etc.) so `![[Image.png]]`
// embeds can resolve a bare filename to its real path under notes/.
function listAssets(dir) {
  const out = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico|pdf)$/i.test(e.name)) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

// Scan for Obsidian canvas sketch files so `[[Sketch.canvas]]` links resolve
// to a node instead of an orphan, and the renderer can project them.
function listCanvases(dir) {
  const out = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.canvas')) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

function main() {
  if (!fs.existsSync(NOTES)) {
    console.error('notes directory not found:', NOTES);
    process.exit(1);
  }
  if (!fs.existsSync(D3_PATH)) {
    console.error('d3 not found at', D3_PATH);
    console.error('Run `npm install` first to install d3.');
    process.exit(1);
  }
  if (!fs.existsSync(TEMPLATE)) {
    console.error('Template missing:', TEMPLATE);
    process.exit(1);
  }

  const files = listMd(NOTES);
  const aliases = {};
  const contents = {};
  const rawLinks = [];
  const foldersSet = new Set();
  const notes = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);

    const posix = path.relative(NOTES, file).split(path.sep).join('/');
    const dir = path.dirname(posix);
    const folder = dir === '.' ? 'root' : dir;
    const base = path.basename(file, '.md');
    const id = posix.replace(/\.md$/, '');
    const h1 = body.match(/^#\s+(.+?)\s*$/m);
    const title = h1 ? h1[1] : base;
    const tagSet = new Set(
      [...(frontmatter.tags || []), ...inlineTags(body)].map(t => t.toLowerCase()),
    );

    notes.push({
      id, label: title, folder, orphan: false,
      tags: [...tagSet], date: frontmatter.date, path: posix,
    });
    contents[id] = body;
    foldersSet.add(folder);

    const addAlias = raw => {
      const k1 = norm(raw);
      const k2 = normLoose(raw);
      if (k1) { const cur = aliases[k1]; if (!cur) aliases[k1] = id; }
      if (k2 && k2 !== k1) { const cur = aliases[k2]; if (!cur) aliases[k2] = id; }
    };
    addAlias(base);
    if (h1) addAlias(title);
    if (frontmatter.title) addAlias(frontmatter.title);

    // Wikilinks `[[target]]`. The negative lookbehind skips `![[...]]`
    // embeds (images / transcluded notes) — those are rendered inline,
    // not turned into graph edges.
    const linkRe = /(?<!!)\[\[([^\]]+)\]\]/g;
    let lm;
    while ((lm = linkRe.exec(body))) {
      const target = lm[1].split('|')[0].trim();
      if (target) rawLinks.push({ from: id, target });
    }
  }

  // Index .canvas sketch files as first-class graph nodes so links resolve
  // and they're discoverable in the force graph.
  const canvases = {};
  for (const file of listCanvases(NOTES)) {
    const craw = fs.readFileSync(file, 'utf8');
    let parsed = null;
    try { parsed = JSON.parse(craw); } catch { parsed = null; }
    const posix = path.relative(NOTES, file).split(path.sep).join('/');
    const dir = path.dirname(posix);
    const folder = dir === '.' ? 'root' : dir;
    const base = path.basename(file, '.canvas');
    const id = '__canvas__' + posix.replace(/\.canvas$/, '');
    const label = base;
    canvases[id] = { id, label, folder, path: posix, data: parsed };
    foldersSet.add(folder);
    const k1 = norm(base + '.canvas'), k2 = normLoose(base + '.canvas');
    const k1b = norm(base), k2b = normLoose(base);
    if (k1 && !aliases[k1]) aliases[k1] = id;
    if (k2 && !aliases[k2]) aliases[k2] = id;
    if (k1b && !aliases[k1b]) aliases[k1b] = id;
    if (k2b && !aliases[k2b]) aliases[k2b] = id;
    notes.push({ id, label, folder, orphan: false, type: 'canvas',
                 tags: [], date: null, path: posix });
  }

  // Resolve wikilinks
  const orphans = new Map(); // normLoose key -> orphan node
  const edgeSeen = new Set();
  const edges = [];

  const getOrphan = rawTarget => {
    const key = normLoose(rawTarget);
    if (!key) return null;
    if (!orphans.has(key)) {
      orphans.set(key, {
        id: '__missing__' + key.replace(/\s+/g, '_'),
        label: rawTarget, folder: '(missing)', orphan: true,
        tags: [], date: null, path: '',
      });
    }
    return orphans.get(key);
  };

  for (const { from, target } of rawLinks) {
    const tStrict = norm(target);
    let toId;
    if (tStrict && aliases[tStrict]) toId = aliases[tStrict];
    else {
      const tLoose = normLoose(target);
      if (tLoose && aliases[tLoose]) toId = aliases[tLoose];
    }
    if (toId && toId === from) continue;
    if (!toId) {
      const o = getOrphan(target);
      if (o) toId = o.id;
    }
    if (!toId) continue;
    const k = from + ' ' + toId;
    if (edgeSeen.has(k)) continue;
    edgeSeen.add(k);
    edges.push({ source: from, target: toId });
  }

  // Folder colors
  const realFolders = [...foldersSet];
  realFolders.sort((a, b) => {
    if (a === 'root') return -1;
    if (b === 'root') return 1;
    return a.localeCompare(b);
  });
  const folderColor = {};
  let pi = 0;
  for (const f of realFolders) {
    folderColor[f] = f === 'root' ? ROOT_COLOR : PALETTE[pi++ % PALETTE.length];
  }
  if (orphans.size) folderColor['(missing)'] = MISSING_COLOR;

  // Degree
  const nodeMap = new Map();
  for (const n of notes) {
    const c = folderColor[n.folder] || ROOT_COLOR;
    nodeMap.set(n.id, { ...n, color: c, degree: 0 });
  }
  for (const o of orphans.values()) {
    nodeMap.set(o.id, { ...o, color: MISSING_COLOR, degree: 0 });
  }
  for (const e of edges) {
    const a = nodeMap.get(e.source);
    const b = nodeMap.get(e.target);
    if (a) a.degree++;
    if (b) b.degree++;
  }

  // Legend
  const legendNames = [...realFolders];
  if (orphans.size) legendNames.push('(missing)');
  const legend = legendNames
    .map(name => ({ name, color: folderColor[name] }))
    .sort((a, b) => {
      if (a.name === 'root') return -1;
      if (b.name === 'root') return 1;
      if (a.name === '(missing)') return 1;
      if (b.name === '(missing)') return -1;
      return a.name.localeCompare(b.name);
    });

  // Image / asset index: normalized-basename -> posix path under notes/.
  // Lets the renderer resolve `![[ARP_step_1.png]]` to `../notes/Images/ARP/ARP_step_1.png`.
  const images = {};
  for (const file of listAssets(NOTES)) {
    const posix = path.relative(NOTES, file).split(path.sep).join('/');
    const key = normLoose(path.basename(file));
    if (!images[key]) images[key] = posix;
  }

  // Embed data — escape `<` so any `</script>` in note content can't break the page
  const graph = {
    nodes: [...nodeMap.values()],
    links: edges,
    folders: legend,
    contents,
    aliases,
    images,
    canvases,
  };
  const graphJson = JSON.stringify(graph)
    .replace(/</g, '\\u003c')
    .split(' ').join('\\u2028')
    .split(' ').join('\\u2029')

  const templateContent = fs.readFileSync(TEMPLATE, 'utf8');
  const d3srcContent = fs.readFileSync(D3_PATH, 'utf8');

  const templateParts = templateContent.split('__D3_SOURCE__');
  if (templateParts.length !== 2) {
    console.error('Error: __D3_SOURCE__ placeholder not found or duplicated in template.');
    process.exit(1);
  }
  const htmlWithD3 = templateParts[0] + d3srcContent + templateParts[1];

  const html = htmlWithD3.replace('__GRAPH_JSON__', graphJson);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, html);

  const linkCount = edges.length;
  const orphanCount = orphans.size;
  const folderCount = realFolders.length;
  const noteCount = notes.filter(n => n.type !== 'canvas').length;
  const canvasCount = Object.keys(canvases).length;

  console.log(`scanning notes/ ... ${noteCount} note${noteCount === 1 ? '' : 's'}, ${canvasCount} canvas${canvasCount === 1 ? '' : 's'}`);
  console.log(`links: ${linkCount}   orphans: ${orphanCount}   folders: ${folderCount}`);
  console.log(`wrote ${path.relative(ROOT, OUT)}`);

  // Open browser (best-effort)
  try {
    openBrowser(OUT);
    console.log('opening browser… (or open graph/index.html manually)');
  } catch { /* ignore */ }
}

function openBrowser(p) {
  let cmd, args;
  if (process.platform === 'darwin') { cmd = 'open'; args = [p]; }
  else if (process.platform === 'win32') { cmd = 'cmd'; args = ['/c', 'start', '', '', p]; }
  else { cmd = 'xdg-open'; args = [p]; }
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

main();