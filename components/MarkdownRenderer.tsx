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

    const processTextWithWikilinksAndImages = (text: string, keyPrefix: string): React.ReactNode[] => {
      // Matches ![[image.png]] or [[target]] / [[target|alias]]
      const regex = /(!?)\[\[([^\]]+)\]\]/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
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
            parts.push(
              <span
                key={`${keyPrefix}-missing-img-${match.index}`}
                className="text-xs text-amber-400/80 italic font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800"
              >
                [Embedded image missing: {rawTarget}]
              </span>
            );
          }
        } else {
          const [targetPart, aliasPart] = rawTarget.split('|').map((s) => s.trim());
          const alias = aliasPart || targetPart;

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

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts;
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

      // Callouts: > [!NOTE] Title
      if (line.startsWith('> [!')) {
        const calloutMatch = line.match(/^>\s*\[!([A-Za-z]+)\]\s*(.*)$/);
        if (calloutMatch) {
          const type = calloutMatch[1].toLowerCase();
          const title = calloutMatch[2] || type.toUpperCase();
          elements.push(
            <div
              key={`callout-${i}`}
              className="my-3 rounded-md border-l-4 border-blue-500 bg-slate-900/80 p-3 text-sm text-slate-200 border border-slate-800"
            >
              <div className="font-semibold text-blue-400 capitalize mb-1">{title}</div>
            </div>
          );
          continue;
        }
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl font-bold text-slate-100 my-3">
            {processTextWithWikilinksAndImages(line.substring(2), `h1-${i}`)}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-200 my-2">
            {processTextWithWikilinksAndImages(line.substring(3), `h2-${i}`)}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-300 my-2">
            {processTextWithWikilinksAndImages(line.substring(4), `h3-${i}`)}
          </h3>
        );
        continue;
      }

      // Unordered lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemContent = line.trim().substring(2);
        elements.push(
          <li key={`li-${i}`} className="ml-4 list-disc text-sm text-slate-300 my-1">
            {processTextWithWikilinksAndImages(itemContent, `li-${i}`)}
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
            {processTextWithWikilinksAndImages(line, `p-${i}`)}
          </p>
        );
      }
    }

    return elements;
  }, [content, aliases, images, onNavigateNote]);

  return <div className="space-y-1">{renderedElements}</div>;
};
