'use client';

import React from 'react';

interface WikilinkProps {
  target: string;
  alias?: string;
  isOrphan?: boolean;
  onClick?: (target: string) => void;
}

export const Wikilink: React.FC<WikilinkProps> = ({
  target,
  alias,
  isOrphan = false,
  onClick,
}) => {
  const label = alias || target;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(target);
      }}
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
        isOrphan
          ? 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/50 italic'
          : 'bg-blue-950/70 text-blue-300 hover:bg-blue-900 hover:text-blue-100 border border-blue-800/50 underline decoration-blue-400/40 underline-offset-2'
      }`}
      title={isOrphan ? `Orphan / Missing note: ${target}` : `Navigate to ${target}`}
    >
      {label}
    </button>
  );
};
