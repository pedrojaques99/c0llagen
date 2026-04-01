import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Maximize2, Download, Video, Film, Trash2, X, Play
} from 'lucide-react';
import { Button, IconButton } from '../ui/Button';
import { AnimationPreset } from '../../types';

interface BatchToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchUpscale: () => void;
  onBatchDownload: () => void;
  onBatchRemove: () => void;
  onBatchRemotion: (preset: AnimationPreset) => void;
  onAISuggest: () => void;
  isAISuggesting: boolean;
}

export const BatchToolbar: React.FC<BatchToolbarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBatchUpscale,
  onBatchDownload,
  onBatchRemove,
  onBatchRemotion,
  onAISuggest,
  isAISuggesting,
}) => {
  if (totalCount === 0) return null;

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1400px] px-8 flex justify-center pointer-events-none"
        >
          <div className="glass px-8 py-4 rounded-[3rem] border border-border shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-center gap-8 backdrop-blur-3xl pointer-events-auto">
            <div className="flex items-center gap-4 pr-8 border-r border-border">
              <div className="w-10 h-10 rounded-2xl bg-ink text-bg flex items-center justify-center font-bold text-sm">
                {selectedCount}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Selected</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={onClearSelection}
                    className="text-[10px] font-bold uppercase tracking-widest text-ink hover:opacity-60 transition-colors flex items-center gap-1"
                  >
                    Clear <X size={10} />
                  </button>
                  {selectedCount < totalCount && (
                    <button 
                      onClick={onSelectAll}
                      className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      All
                    </button>
                  )}
                </div>
              </div>
            </div>

          <div className="flex items-center gap-3">
            <IconButton 
              onClick={onAISuggest}
              disabled={isAISuggesting}
              icon={<Video size={18} className={isAISuggesting ? "animate-pulse" : ""} />}
              badge="AI"
              badgeVariant="gemini"
              title="AI Suggest"
            />
            
            <div className="h-8 w-[1px] bg-border mx-2" />

            <IconButton 
              onClick={onBatchUpscale}
              icon={<Maximize2 size={18} strokeWidth={1} />}
              badge="AI"
              title="Upscale"
            />
            <IconButton 
              onClick={onBatchDownload}
              icon={<Download size={18} strokeWidth={1} />}
              title="Download"
            />
            
            <div className="h-8 w-[1px] bg-border mx-2" />

            <div className="flex items-center gap-1 bg-glass-muted p-1 rounded-2xl border border-border">
              {(['zoom-in', 'zoom-out', 'pan-lr', 'pan-rl', 'fade-in'] as AnimationPreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => onBatchRemotion(preset)}
                  className="px-3 py-2 rounded-xl hover:bg-ink hover:text-bg transition-all text-[8px] font-bold uppercase tracking-widest text-ink"
                >
                  {preset.split('-')[0]}
                </button>
              ))}
            </div>

            <div className="h-8 w-[1px] bg-border mx-2" />

            <IconButton 
              onClick={onBatchRemove}
              icon={<Trash2 size={18} strokeWidth={1} />}
              className="hover:text-red-500"
              title="Remove"
            />
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
  );
};
