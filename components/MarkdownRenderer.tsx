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

    const lines = content.split('\n');
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
      return parts.map((part, pIdx) => {
        if (typeof part !== 'string') return part;

        const hlRegex = /==([^=]+)==/g;
        const subParts: React.ReactNode[] = [];
        let hlLast = 0;
        let hlMatch: RegExpExecArray | null;

        while ((hlMatch = hlRegex.exec(part)) !== null) {
          if (hlMatch.index > hlLast) {
            subParts.push(part.substring(hlLast, hlMatch.index));
          }
          subParts.push(
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
          subParts.push(part.substring(hlLast));
        }

        return <React.Fragment key={`${keyPrefix}-p-${pIdx}`}>{subParts}</React.Fragment>;
      });
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
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl font-bold text-slate-100 my-3 border-b border-slate-800 pb-1">
            {processFormattedText(line.substring(2), `h1-${i}`)}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-200 my-2">
            {processFormattedText(line.substring(3), `h2-${i}`)}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-300 my-2">
            {processFormattedText(line.substring(4), `h3-${i}`)}
          </h3>
        );
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
