'use client';

import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  resultCount,
}) => {
  return (
    <div className="relative flex items-center w-64 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-lg backdrop-blur-sm">
      <svg
        className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search notes, tags, title..."
        className="bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-full"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-slate-500 hover:text-slate-300 ml-1 text-xs font-bold"
        >
          ×
        </button>
      )}
      {value && resultCount !== undefined && (
        <span className="ml-2 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-full font-mono">
          {resultCount}
        </span>
      )}
    </div>
  );
};
