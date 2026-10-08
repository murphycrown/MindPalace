'use client';

import React from 'react';
import { FolderLegend as IFolderLegend } from '@/lib/graph-types';

interface FolderLegendProps {
  folders: IFolderLegend[];
  selectedFolder: string | null;
  onSelectFolder: (folder: string | null) => void;
}

export const FolderLegend: React.FC<FolderLegendProps> = ({
  folders,
  selectedFolder,
  onSelectFolder,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs shadow-lg backdrop-blur-sm max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-200">Folders</span>
        {selectedFolder && (
          <button
            onClick={() => onSelectFolder(null)}
            className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
        {folders.map((f) => {
          const isSelected = selectedFolder === f.name;
          return (
            <button
              key={f.name}
              onClick={() => onSelectFolder(isSelected ? null : f.name)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all border ${
                isSelected
                  ? 'bg-slate-800 text-slate-100 border-slate-600 ring-1 ring-slate-500'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: f.color }}
              />
              <span className="truncate max-w-[100px]">{f.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
