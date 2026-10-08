'use client';

import React, { useMemo, useState } from 'react';
import { Wikilink } from './Wikilink';
import { norm, normLoose, resolveImage } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  aliases?: Record<string, string>;
  images?: Record<string, string>;
  onNavigateNote?: (nodeId: string) => void;
}

// Collapsible Callout Component
const CalloutBlock: React.FC<{
  type: string;
  title: string;
  collapsible?: '+' | '-';
  children?: React.ReactNode;
}> = ({ type, title, collapsible, children }) => {
  const [isOpen, setIsOpen] = useState(collapsible !== '-');

  const normalizedType = type.toUpperCase();
  let calloutColor = 'border-blue-500 bg-blue-950/20 text-blue-300';
  let icon = 'ℹ️';

  if (['WARNING', 'CAUTION', 'ATTENTION'].includes(normalizedType)) {
    calloutColor = 'border-amber-500 bg-amber-950/20 text-amber-300';
    icon = '⚠️';
  } else if (['IMPORTANT', 'DANGER', 'ERROR', 'BUG', 'FAILURE'].includes(normalizedType)) {
    calloutColor = 'border-red-500 bg-red-950/20 text-red-300';
    icon = '🚨';
  } else if (['TIP', 'SUCCESS', 'CHECK', 'DONE'].includes(normalizedType)) {
    calloutColor = 'border-emerald-500 bg-emerald-950/20 text-emerald-300';
    icon = '💡';
  } else if (['QUESTION', 'HELP', 'FAQ'].includes(normalizedType)) {
    calloutColor = 'border-purple-500 bg-purple-950/20 text-purple-300';
    icon = '❓';
  } else if (['QUOTE', 'CITE'].includes(normalizedType)) {
    calloutColor = 'border-slate-500 bg-slate-900/40 text-slate-300';
    icon = '💬';
  }

  return (
    <div className={`my-3 rounded-lg border-l-4 p-3 text-sm border-t border-r border-b border-slate-800 ${calloutColor}`}>
      <div
        className={`flex items-center justify-between font-semibold gap-2 ${
          collapsible ? 'cursor-pointer select-none' : ''
        }`}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="capitalize">{title || type}</span>
        </div>
        {collapsible && (
          <span className="text-xs text-slate-400 font-mono">
            {isOpen ? '▼' : '▶'}
          </span>
        )}
      </div>
      {isOpen && children && <div className="mt-2 text-slate-300 space-y-1">{children}</div>}
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  aliases = {},
  images = {},
  onNavigateNote,
}) => {
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();

  const processFormattedText = (text: string, keyPrefix: string): React.ReactNode[] => {
    if (!text) return [];

    // Step 1: Embeds & Wikilinks: ![[image|note]] or [[wikilink#anchor|alias]]
    const wikiRegex = /(!?)\[\[([^\]]+)\]\]/g;
    const step1Nodes: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = wikiRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        step1Nodes.push(text.substring(lastIdx, match.index));
      }

      const isEmbed = match[1] === '!';
      const rawTarget = match[2];

      if (isEmbed) {
        const imgPath = resolveImage(rawTarget, images);
        if (imgPath) {
          step1Nodes.push(
            <img
              key={`${keyPrefix}-img-${match.index}`}
              src={imgPath}
              alt={rawTarget}
              className="my-3 max-w-full rounded-lg border border-slate-800 shadow-lg object-contain max-h-96"
            />
          );
        } else {
          const [noteName] = rawTarget.split('|');
          const resolvedId = aliases[norm(noteName)] || aliases[normLoose(noteName)];
          if (resolvedId && onNavigateNote) {
            step1Nodes.push(
              <button
                key={`${keyPrefix}-embed-note-${match.index}`}
                onClick={() => onNavigateNote(resolvedId)}
                className="my-2 block w-full text-left p-2 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-blue-300"
              >
                📄 Embed Note: {noteName}
              </button>
            );
          } else {
            step1Nodes.push(
              <span
                key={`${keyPrefix}-missing-img-${match.index}`}
                className="text-xs text-amber-400/80 italic font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800"
              >
                [Embed: {rawTarget}]
              </span>
            );
          }
        }
      } else {
        const [fullTarget, aliasPart] = rawTarget.split('|').map((s) => s.trim());
        const [targetPart, headingPart] = fullTarget.split('#').map((s) => s.trim());
        const alias = aliasPart || fullTarget;

        const strict = norm(targetPart);
        const loose = normLoose(targetPart);
        const resolvedId = aliases[strict] || aliases[loose];
        const isOrphan = !resolvedId;

        step1Nodes.push(
          <Wikilink
            key={`${keyPrefix}-wiki-${match.index}`}
            target={headingPart ? `${targetPart}#${headingPart}` : targetPart}
            alias={alias}
            isOrphan={isOrphan}
            onClick={() => {
              if (resolvedId && onNavigateNote) {
                onNavigateNote(resolvedId);
              }
            }}
          />
        );
      }

      lastIdx = wikiRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      step1Nodes.push(text.substring(lastIdx));
    }

    // Process nested string formatting helper
    const processString = (
      inputNodes: React.ReactNode[],
      regex: RegExp,
      renderFn: (captured: string, idx: number, match: RegExpExecArray) => React.ReactNode
    ): React.ReactNode[] => {
      const output: React.ReactNode[] = [];
      inputNodes.forEach((node, nodeIdx) => {
        if (typeof node !== 'string') {
          output.push(node);
          return;
        }

        let lIdx = 0;
        let m: RegExpExecArray | null;
        const re = new RegExp(regex.source, regex.flags);

        while ((m = re.exec(node)) !== null) {
          if (m.index > lIdx) {
            output.push(node.substring(lIdx, m.index));
          }
          output.push(renderFn(m[2] !== undefined ? m[2] : (m[1] !== undefined ? m[1] : m[0]), nodeIdx + m.index, m));
          lIdx = re.lastIndex;
        }

        if (lIdx < node.length) {
          output.push(node.substring(lIdx));
        }
      });
      return output;
    };

    // Step 2: Inline Math $math$
    const step2Math = processString(
      step1Nodes,
      /\$([^$]+)\$/g,
      (mathText, idx) => (
        <code
          key={`${keyPrefix}-math-${idx}`}
          className="bg-purple-950/40 text-purple-200 font-mono text-xs px-1.5 py-0.5 rounded border border-purple-800/60"
        >
          ${mathText}$
        </code>
      )
    );

    // Step 3: Inline Code `code`
    const step3Code = processString(
      step2Math,
      /`([^`]+)`/g,
      (codeText, idx) => (
        <code
          key={`${keyPrefix}-code-${idx}`}
          className="bg-slate-800 text-amber-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-700/80"
        >
          {codeText}
        </code>
      )
    );

    // Step 4: Highlights ==highlight==
    const step4HL = processString(
      step3Code,
      /==([^=]+)==/g,
      (hlText, idx) => (
        <mark
          key={`${keyPrefix}-hl-${idx}`}
          className="bg-amber-500/30 text-amber-200 px-1 rounded border border-amber-500/40"
        >
          {hlText}
        </mark>
      )
    );

    // Step 5: Bold **bold** or __bold__
    const step5Bold = processString(
      step4HL,
      /(\*\*|__)(.+?)\1/g,
      (boldText, idx) => (
        <strong key={`${keyPrefix}-bold-${idx}`} className="font-bold text-slate-100">
          {boldText}
        </strong>
      )
    );

    // Step 6: Italic *italic* or _italic_
    const step6Italic = processString(
      step5Bold,
      /(?<!\*|_)(\*|_)(?!\*|_)(.+?)(?<!\*|_)\1(?!\*|_)/g,
      (italicText, idx) => (
        <em key={`${keyPrefix}-italic-${idx}`} className="italic text-slate-200">
          {italicText}
        </em>
      )
    );

    // Step 7: Strikethrough ~~text~~
    const step7Strike = processString(
      step6Italic,
      /~~([^~]+)~~/g,
      (strikeText, idx) => (
        <del key={`${keyPrefix}-del-${idx}`} className="line-through text-slate-500">
          {strikeText}
        </del>
      )
    );

    // Step 8: Footnotes ^footnote^ or [^1]
    const step8Footnote = processString(
      step7Strike,
      /(\^([^\^]+)\^|\[\^([^\]]+)\])/g,
      (fnText, idx) => (
        <sup
          key={`${keyPrefix}-fn-${idx}`}
          className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1 rounded border border-amber-800/40 ml-0.5"
        >
          {fnText.replace(/\^/g, '').replace(/\[|\]/g, '')}
        </sup>
      )
    );

    // Step 9: Inline Tags #tag-name or #category/subtag
    const step9Tags = processString(
      step8Footnote,
      /(^|[^\w#])#([a-zA-Z0-9_\-\/]+)/g,
      (tagMatch, idx) => {
        const fullTag = tagMatch.trim();
        return (
          <span
            key={`${keyPrefix}-tag-${idx}`}
            className="inline-block bg-slate-800 text-blue-300 font-mono text-[11px] px-1.5 py-0.5 rounded-full border border-slate-700 mx-0.5 hover:bg-slate-700"
          >
            {fullTag}
          </span>
        );
      }
    );

    return step9Tags;
  };

  const renderedElements = useMemo(() => {
    if (!content) return null;

    const lines = content.split(/\r?\n/);
    const elements: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockBuffer: string[] = [];

    let inMathBlock = false;
    let mathBlockBuffer: string[] = [];

    const isTableLine = (str: string) => {
      const trimmed = str.trim();
      return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
    };

    const isTableSeparator = (str: string) => {
      const trimmed = str.trim();
      if (!isTableLine(trimmed)) return false;
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      return cells.every((c) => /^:?-+:?$/.test(c));
    };

    const parseTableRowCells = (str: string) => {
      return str
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Fenced Block Math $$
      if (line.trim() === '$$') {
        if (inMathBlock) {
          elements.push(
            <div
              key={`mathblock-${i}`}
              className="my-3 overflow-x-auto rounded-lg bg-purple-950/20 p-3 text-xs text-purple-200 border border-purple-800/60 font-mono text-center"
            >
              <div>$${mathBlockBuffer.join('\n')}$$</div>
            </div>
          );
          mathBlockBuffer = [];
          inMathBlock = false;
        } else {
          inMathBlock = true;
        }
        continue;
      }

      if (inMathBlock) {
        mathBlockBuffer.push(line);
        continue;
      }

      // Fenced Code Blocks ```
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`codeblock-${i}`} className="my-3 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
              {codeBlockLang && (
                <div className="bg-slate-800/80 px-3 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-800 uppercase">
                  {codeBlockLang}
                </div>
              )}
              <pre className="p-3 text-xs text-slate-200 font-mono overflow-x-auto">
                <code>{codeBlockBuffer.join('\n')}</code>
              </pre>
            </div>
          );
          codeBlockBuffer = [];
          codeBlockLang = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockLang = line.replace(/^```/, '').trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockBuffer.push(line);
        continue;
      }

      // Markdown Tables
      if (
        isTableLine(line) &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      ) {
        const headerCells = parseTableRowCells(line);
        i++; // skip header
        i++; // skip separator

        const bodyRows: string[][] = [];
        while (i < lines.length && isTableLine(lines[i])) {
          bodyRows.push(parseTableRowCells(lines[i]));
          i++;
        }
        i--;

        elements.push(
          <div
            key={`table-${i}`}
            className="my-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 shadow-sm"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-200">
                  {headerCells.map((headerCell, cellIdx) => (
                    <th
                      key={`th-${i}-${cellIdx}`}
                      className="px-3 py-2 font-semibold border-r border-slate-700/60 last:border-r-0"
                    >
                      {processFormattedText(headerCell, `th-${i}-${cellIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {bodyRows.map((rowCells, rowIdx) => (
                  <tr
                    key={`tr-${i}-${rowIdx}`}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {rowCells.map((cellText, cellIdx) => (
                      <td
                        key={`td-${i}-${rowIdx}-${cellIdx}`}
                        className="px-3 py-2 border-r border-slate-800/60 last:border-r-0"
                      >
                        {processFormattedText(cellText, `td-${i}-${rowIdx}-${cellIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Standard markdown image: ![alt](path)
      const mdImgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (mdImgMatch) {
        const alt = mdImgMatch[1];
        const rawPath = mdImgMatch[2];
        const imgPath = resolveImage(rawPath, images) || rawPath;
        elements.push(
          <img
            key={`md-img-${i}`}
            src={imgPath}
            alt={alt}
            className="my-3 max-w-full rounded-lg border border-slate-800 shadow-lg object-contain max-h-96"
          />
        );
        continue;
      }

      // Obsidian Callouts: > [!NOTE]+ Title or > [!WARNING]- Title
      if (line.startsWith('> [!')) {
        const calloutMatch = line.match(/^>\s*\[!([A-Za-z]+)\]([+-]?)\s*(.*)$/);
        if (calloutMatch) {
          const type = calloutMatch[1];
          const collapsible = (calloutMatch[2] as '+' | '-') || undefined;
          const title = calloutMatch[3] || type;

          elements.push(
            <CalloutBlock
              key={`callout-${i}`}
              type={type}
              title={title}
              collapsible={collapsible}
            />
          );
          continue;
        }
      }

      // Task lists: - [ ] or - [x]
      const taskMatch = line.trim().match(/^-\s*\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        const checked = taskMatch[1].toLowerCase() === 'x';
        const taskText = taskMatch[2];
        elements.push(
          <div key={`task-${i}`} className="flex items-center gap-2 my-1 text-sm text-slate-300 ml-2">
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
            />
            <span className={checked ? 'line-through text-slate-500' : ''}>
              {processFormattedText(taskText, `task-${i}`)}
            </span>
          </div>
        );
        continue;
      }

      // Atx Headers (H1 - H6) with automatic slug generation
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const slug = slugify(headingText);

        if (level === 1) {
          elements.push(
            <h1 id={slug} key={`h1-${i}`} className="text-xl font-bold text-slate-100 my-3 border-b border-slate-800 pb-1">
              {processFormattedText(headingText, `h1-${i}`)}
            </h1>
          );
        } else if (level === 2) {
          elements.push(
            <h2 id={slug} key={`h2-${i}`} className="text-lg font-bold text-slate-200 my-2">
              {processFormattedText(headingText, `h2-${i}`)}
            </h2>
          );
        } else if (level === 3) {
          elements.push(
            <h3 id={slug} key={`h3-${i}`} className="text-base font-semibold text-slate-300 my-2">
              {processFormattedText(headingText, `h3-${i}`)}
            </h3>
          );
        } else if (level === 4) {
          elements.push(
            <h4 id={slug} key={`h4-${i}`} className="text-sm font-semibold text-slate-300 my-1.5">
              {processFormattedText(headingText, `h4-${i}`)}
            </h4>
          );
        } else if (level === 5) {
          elements.push(
            <h5 id={slug} key={`h5-${i}`} className="text-xs font-semibold text-slate-400 my-1">
              {processFormattedText(headingText, `h5-${i}`)}
            </h5>
          );
        } else {
          elements.push(
            <h6 id={slug} key={`h6-${i}`} className="text-xs font-medium text-slate-400 my-1 uppercase tracking-wider">
              {processFormattedText(headingText, `h6-${i}`)}
            </h6>
          );
        }
        continue;
      }

      // Unordered lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemContent = line.trim().substring(2);
        elements.push(
          <li key={`li-${i}`} className="ml-4 list-disc text-sm text-slate-300 my-1">
            {processFormattedText(itemContent, `li-${i}`)}
          </li>
        );
        continue;
      }

      // Paragraphs
      if (line.trim() === '') {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-sm text-slate-300 leading-relaxed my-1">
            {processFormattedText(line, `p-${i}`)}
          </p>
        );
      }
    }

    return elements;
  }, [content, aliases, images, onNavigateNote]);

  return <div className="space-y-1">{renderedElements}</div>;
};
