#!/usr/bin/env tsx
// Mind Palace — graph builder (TypeScript port)
// Recursively scans notes/ and emits a public/graph-data.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NOTES = path.join(ROOT, 'notes');
const OUT_DIR = path.join(ROOT, 'public');
const OUT = path.join(OUT_DIR, 'graph-data.json');

const ROOT_COLOR = '#64748b';
const MISSING_COLOR = '#475569';
const PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
  '#f97316',
  '#14b8a6',
  '#a855f7',
  '#22c55e',
];

const norm = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const normLoose = (s: string) => norm(s).replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

interface Frontmatter {
  tags?: string[];
  date?: string;
  title?: string;
  [key: string]: unknown;
}

interface ParsedNote {
  frontmatter: Frontmatter;
  body: string;
}

function parseFrontmatter(text: string): ParsedNote {
  const { data, content } = matter(text);
  return {
    frontmatter: data as Frontmatter,
    body: content,
  };
}

function inlineTags(body: string): string[] {
  const out = new Set<string>();
  const re = /(^|[^\w#])#([a-z][\w-]*(\/[\w-]+)*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    out.add(m[2].toLowerCase());
  }
  return [...out];
}

async function listMd(dir: string): Promise<string[]> {
  const files = await glob('**/*.md', {
    cwd: dir,
    ignore: ['**/.git/**', '**/node_modules/**', '**/.*/**'],
    absolute: true,
  });
  return files.sort();
}

async function listAssets(dir: string): Promise<string[]> {
  const files = await glob('**/*.{png,jpg,jpeg,gif,webp,svg,bmp,avif,ico,pdf}', {
    cwd: dir,
    ignore: ['**/.git/**', '**/node_modules/**', '**/.*/**'],
    absolute: true,
  });
  return files.sort();
}

async function listCanvases(dir: string): Promise<string[]> {
  const files = await glob('**/*.canvas', {
    cwd: dir,
    ignore: ['**/.git/**', '**/node_modules/**', '**/.*/**'],
    absolute: true,
  });
  return files.sort();
}

interface GraphNode {
  id: string;
  label: string;
  folder: string;
  orphan: boolean;
  tags: string[];
  date: string | null;
  path: string;
  type?: 'canvas';
  color?: string;
  degree?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface FolderLegend {
  name: string;
  color: string;
}

interface CanvasData {
  id: string;
  label: string;
  folder: string;
  path: string;
  data: unknown;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  folders: FolderLegend[];
  contents: Record<string, string>;
  aliases: Record<string, string>;
  images: Record<string, string>;
  canvases: Record<string, CanvasData>;
}

async function main() {
  if (!fs.existsSync(NOTES)) {
    console.error('notes directory not found:', NOTES);
    process.exit(1);
  }

  const files = await listMd(NOTES);
  const aliases: Record<string, string> = {};
  const contents: Record<string, string> = {};
  const rawLinks: Array<{ from: string; target: string }> = [];
  const foldersSet = new Set<string>();
  const notes: GraphNode[] = [];

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
    const tagSet = new Set([
      ...(frontmatter.tags || []).map((t) => t.toLowerCase()),
      ...inlineTags(body).map((t) => t.toLowerCase()),
    ]);

    notes.push({
      id,
      label: title,
      folder,
      orphan: false,
      tags: [...tagSet],
      date: frontmatter.date || null,
      path: posix,
    });
    contents[id] = body;
    foldersSet.add(folder);

    const addAlias = (raw: string) => {
      const k1 = norm(raw);
      const k2 = normLoose(raw);
      if (k1 && !aliases[k1]) aliases[k1] = id;
      if (k2 && k2 !== k1 && !aliases[k2]) aliases[k2] = id;
    };

    addAlias(base);
    if (h1) addAlias(title);
    if (frontmatter.title) addAlias(frontmatter.title);

    // Wikilinks [[target]] or [[target|alias]]
    // Negative lookbehind skips ![[...]] embeds
    const linkRe = /(?<!!)\[\[([^\]]+)\]\]/g;
    let lm: RegExpExecArray | null;
    while ((lm = linkRe.exec(body))) {
      const target = lm[1].split('|')[0].trim();
      if (target) rawLinks.push({ from: id, target });
    }
  }

  // Index .canvas sketch files as first-class graph nodes
  const canvases: Record<string, CanvasData> = {};
  for (const file of await listCanvases(NOTES)) {
    const craw = fs.readFileSync(file, 'utf8');
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(craw);
    } catch {
      parsed = null;
    }
    const posix = path.relative(NOTES, file).split(path.sep).join('/');
    const dir = path.dirname(posix);
    const folder = dir === '.' ? 'root' : dir;
    const base = path.basename(file, '.canvas');
    const id = '__canvas__' + posix.replace(/\.canvas$/, '');
    const label = base;
    canvases[id] = { id, label, folder, path: posix, data: parsed };
    foldersSet.add(folder);

    const k1 = norm(base + '.canvas');
    const k2 = normLoose(base + '.canvas');
    const k1b = norm(base);
    const k2b = normLoose(base);
    if (k1 && !aliases[k1]) aliases[k1] = id;
    if (k2 && !aliases[k2]) aliases[k2] = id;
    if (k1b && !aliases[k1b]) aliases[k1b] = id;
    if (k2b && !aliases[k2b]) aliases[k2b] = id;

    notes.push({
      id,
      label,
      folder,
      orphan: false,
      type: 'canvas',
      tags: [],
      date: null,
      path: posix,
    });
  }

  // Resolve wikilinks
  const orphans = new Map<string, GraphNode>();
  const edgeSeen = new Set<string>();
  const edges: GraphLink[] = [];

  const getOrphan = (rawTarget: string): GraphNode | null => {
    const key = normLoose(rawTarget);
    if (!key) return null;
    if (!orphans.has(key)) {
      orphans.set(key, {
        id: '__missing__' + key.replace(/\s+/g, '_'),
        label: rawTarget,
        folder: '(missing)',
        orphan: true,
        tags: [],
        date: null,
        path: '',
      });
    }
    return orphans.get(key) || null;
  };

  for (const { from, target } of rawLinks) {
    const tStrict = norm(target);
    let toId: string | undefined;
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
  const folderColor: Record<string, string> = {};
  let pi = 0;
  for (const f of realFolders) {
    folderColor[f] = f === 'root' ? ROOT_COLOR : PALETTE[pi++ % PALETTE.length];
  }
  if (orphans.size) folderColor['(missing)'] = MISSING_COLOR;

  // Degree calculation
  const nodeMap = new Map<string, GraphNode>();
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
    if (a) a.degree = (a.degree || 0) + 1;
    if (b) b.degree = (b.degree || 0) + 1;
  }

  // Legend
  const legendNames = [...realFolders];
  if (orphans.size) legendNames.push('(missing)');
  const legend: FolderLegend[] = legendNames
    .map((name) => ({ name, color: folderColor[name] }))
    .sort((a, b) => {
      if (a.name === 'root') return -1;
      if (b.name === 'root') return 1;
      if (a.name === '(missing)') return 1;
      if (b.name === '(missing)') return -1;
      return a.name.localeCompare(b.name);
    });

  // Image / asset index: normalized-basename -> posix path under notes/
  const images: Record<string, string> = {};
  for (const file of await listAssets(NOTES)) {
    const posix = path.relative(NOTES, file).split(path.sep).join('/');
    const key = normLoose(path.basename(file));
    if (!images[key]) images[key] = posix;
  }

  // Escape < for XSS protection
  const graph: GraphData = {
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
    .replace(/ /g, '\\u2028')
    .replace(/ /g, '\\u2029');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, graphJson);

  const noteCount = notes.filter((n) => n.type !== 'canvas').length;
  const canvasCount = Object.keys(canvases).length;
  const linkCount = edges.length;
  const orphanCount = orphans.size;
  const folderCount = realFolders.length;

  console.log(`scanning notes/ ... ${noteCount} note${noteCount === 1 ? '' : 's'}, ${canvasCount} canvas${canvasCount === 1 ? '' : 's'}`);
  console.log(`links: ${linkCount}   orphans: ${orphanCount}   folders: ${folderCount}`);
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});