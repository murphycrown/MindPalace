'use client';

import React, { useMemo } from 'react';
import { Wikilink } from './Wikilink';
import { norm, normLoose, resolveImage } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  aliases?: Record<string, string>;
  images?: Record<string, string>;
  onNavigateNote?: (nodeId: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  aliases = {},
  images = {},
  onNavigateNote,
}) => {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    const lines = content.split(/\r?\n/);
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockBuffer: string[] = [];

    const processFormattedText = (text: string, keyPrefix: string): React.ReactNode[] => {
      // Step 1: Process ![[image]] or [[wikilink#anchor|alias]]
      const wikiRegex = /(!?)\[\[([^\]]+)\]\]/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = wikiRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }

        const isEmbed = match[1] === '!';
        const rawTarget = match[2];

        if (isEmbed) {
          const imgPath = resolveImage(rawTarget, images);
          if (imgPath) {
            parts.push(
              <img
                key={`${keyPrefix}-img-${match.index}`}
                src={imgPath}
                alt={rawTarget}
                className="my-3 max-w-full rounded-lg border border-slate-800 shadow-lg object-contain max-h-96"
              />
            );
          } else {
            // Embedded note or missing image
            const [noteName] = rawTarget.split('|');
            const resolvedId = aliases[norm(noteName)] || aliases[normLoose(noteName)];
            if (resolvedId && onNavigateNote) {
              parts.push(
                <button
                  key={`${keyPrefix}-embed-note-${match.index}`}
                  onClick={() => onNavigateNote(resolvedId)}
                  className="my-2 block w-full text-left p-2 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-blue-300"
                >
                  📄 Embed Note: {noteName}
                </button>
              );
            } else {
              parts.push(
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
          // Wikilinks [[target#heading|alias]]
          const [fullTarget, aliasPart] = rawTarget.split('|').map((s) => s.trim());
          const [targetPart] = fullTarget.split('#').map((s) => s.trim());
          const alias = aliasPart || fullTarget;

          const strict = norm(targetPart);
          const loose = normLoose(targetPart);
          const resolvedId = aliases[strict] || aliases[loose];
          const isOrphan = !resolvedId;

          parts.push(
            <Wikilink
              key={`${keyPrefix}-wiki-${match.index}`}
              target={targetPart}
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

        lastIndex = wikiRegex.lastIndex;
      }

      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      // Step 2: Highlighting ==highlight==
      const hlProcessed: React.ReactNode[] = [];
      parts.forEach((part, pIdx) => {
        if (typeof part !== 'string') {
          hlProcessed.push(part);
          return;
        }

        const hlRegex = /==([^=]+)==/g;
        let hlLast = 0;
        let hlMatch: RegExpExecArray | null;

        while ((hlMatch = hlRegex.exec(part)) !== null) {
          if (hlMatch.index > hlLast) {
            hlProcessed.push(part.substring(hlLast, hlMatch.index));
          }
          hlProcessed.push(
            <mark
              key={`${keyPrefix}-hl-${pIdx}-${hlMatch.index}`}
              className="bg-amber-500/30 text-amber-200 px-1 rounded border border-amber-500/40"
            >
              {hlMatch[1]}
            </mark>
          );
          hlLast = hlRegex.lastIndex;
        }

        if (hlLast < part.length) {
          hlProcessed.push(part.substring(hlLast));
        }
      });

      // Step 3: Inline code formatting `code`
      const codeProcessed: React.ReactNode[] = [];
      hlProcessed.forEach((item, cIdx) => {
        if (typeof item !== 'string') {
          codeProcessed.push(item);
          return;
        }

        const codeRegex = /`([^`]+)`/g;
        let codeLast = 0;
        let codeMatch: RegExpExecArray | null;

        while ((codeMatch = codeRegex.exec(item)) !== null) {
          if (codeMatch.index > codeLast) {
            codeProcessed.push(item.substring(codeLast, codeMatch.index));
          }
          codeProcessed.push(
            <code
              key={`${keyPrefix}-code-${cIdx}-${codeMatch.index}`}
              className="bg-slate-800 text-amber-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-700/80"
            >
              {codeMatch[1]}
            </code>
          );
          codeLast = codeRegex.lastIndex;
        }

        if (codeLast < item.length) {
          codeProcessed.push(item.substring(codeLast));
        }
      });

      return codeProcessed;
    };

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

      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${i}`}
              className="my-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-200 border border-slate-800 font-mono"
            >
              <code>{codeBlockBuffer.join('\n')}</code>
            </pre>
          );
          codeBlockBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockBuffer.push(line);
        continue;
      }

      // Check for Markdown Table block starting at current index i
      if (
        isTableLine(line) &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      ) {
        const headerCells = parseTableRowCells(line);
        i++; // skip header line
        i++; // skip separator line

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

      // Standard markdown images: ![alt](path)
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

      // Obsidian Callouts: > [!NOTE] Title
      if (line.startsWith('> [!')) {
        const calloutMatch = line.match(/^>\s*\[!([A-Za-z]+)\]\s*(.*)$/);
        if (calloutMatch) {
          const type = calloutMatch[1].toUpperCase();
          const title = calloutMatch[2] || type;

          let calloutColor = 'border-blue-500 text-blue-400';
          if (type === 'WARNING' || type === 'CAUTION') calloutColor = 'border-amber-500 text-amber-400';
          if (type === 'IMPORTANT' || type === 'DANGER') calloutColor = 'border-red-500 text-red-400';
          if (type === 'TIP' || type === 'SUCCESS') calloutColor = 'border-emerald-500 text-emerald-400';

          elements.push(
            <div
              key={`callout-${i}`}
              className={`my-3 rounded-md border-l-4 bg-slate-900/90 p-3 text-sm text-slate-200 border-t border-r border-b border-slate-800 ${calloutColor}`}
            >
              <div className="font-semibold capitalize mb-1">{title}</div>
            </div>
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
          <div key={`task-${i}`} className="flex items-center gap-2 my-1 text-sm text-slate-300">
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

      // Headings (H1 - H6)
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];

        if (level === 1) {
          elements.push(
            <h1 key={`h1-${i}`} className="text-xl font-bold text-slate-100 my-3 border-b border-slate-800 pb-1">
              {processFormattedText(headingText, `h1-${i}`)}
            </h1>
          );
        } else if (level === 2) {
          elements.push(
            <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-200 my-2">
              {processFormattedText(headingText, `h2-${i}`)}
            </h2>
          );
        } else if (level === 3) {
          elements.push(
            <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-300 my-2">
              {processFormattedText(headingText, `h3-${i}`)}
            </h3>
          );
        } else if (level === 4) {
          elements.push(
            <h4 key={`h4-${i}`} className="text-sm font-semibold text-slate-300 my-1.5">
              {processFormattedText(headingText, `h4-${i}`)}
            </h4>
          );
        } else if (level === 5) {
          elements.push(
            <h5 key={`h5-${i}`} className="text-xs font-semibold text-slate-400 my-1">
              {processFormattedText(headingText, `h5-${i}`)}
            </h5>
          );
        } else {
          elements.push(
            <h6 key={`h6-${i}`} className="text-xs font-medium text-slate-400 my-1 uppercase tracking-wider">
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
