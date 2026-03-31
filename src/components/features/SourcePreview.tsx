import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, Layers, Video, Send, Play, Sparkles } from 'lucide-react';
import { Button, IconButton } from '../ui/Button';
import { Timer } from '../ui/Timer';
import { AnimationPreset } from '../../types';
import { PROMPT_PRESETS } from '../../services/gemini';

interface SourcePreviewProps {
  sourceImage: string;
  isAnalyzing: boolean;
  isAnimating: boolean;
  showPrompt: boolean;
  prompt: string;
  onPromptChange: (val: string) => void;
  onAnimate: () => void;
  onRemotionAnimate: (preset: AnimationPreset) => void;
  analysisStartTime: number | null;
  animationStartTime: number | null;
  onFullscreen: (url: string) => void;
}

export const SourcePreview: React.FC<SourcePreviewProps> = ({
  sourceImage,
  isAnalyzing,
  isAnimating,
  showPrompt,
  prompt,
  onPromptChange,
  onAnimate,
  onRemotionAnimate,
  analysisStartTime,
  animationStartTime,
  onFullscreen,
}) => {
  return (
    <div className="flex flex-col gap-6 p-1 rounded-3xl">
      <motion.div 
        key="preview"
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative group rounded-[3rem] overflow-hidden glass cursor-zoom-in shadow-2xl border border-border"
        onClick={() => !showPrompt && onFullscreen(sourceImage)}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg/20 pointer-events-none" />
        <img src={sourceImage} alt="Source" className="w-full object-contain max-h-[75vh] transition-transform duration-1000 group-hover:scale-[1.02]" loading="lazy" />
        
        {!isAnalyzing && !isAnimating && !showPrompt && (
          <div className="absolute inset-0 bg-transparent group-hover:bg-ink/5 transition-all duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="p-6 rounded-full bg-glass backdrop-blur-3xl text-ink border border-border shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500">
              <ZoomIn size={32} strokeWidth={1.5} />
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 bg-bg/40 backdrop-blur-md flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted">
                {analysisStartTime && <Timer startTime={analysisStartTime} />} Analyzing
              </span>
            </div>
          </div>
        )}

        {isAnimating && (
          <div className="absolute inset-0 bg-bg/40 backdrop-blur-md flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted">
                {animationStartTime && <Timer startTime={animationStartTime} />} Animating
              </span>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showPrompt && !isAnimating && (
          <div className="flex flex-col gap-4 items-center w-full">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass p-2 rounded-[2.5rem] flex items-center gap-2 shadow-2xl max-w-2xl mx-auto w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <input 
                autoFocus
                type="text"
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAnimate()}
                placeholder="Describe the cinematic vision..."
                className="flex-1 bg-transparent border-none outline-none text-sm px-6 py-3 text-ink placeholder:text-muted"
              />
              <IconButton 
                onClick={onAnimate}
                variant="primary"
                badge="AI"
                badgeVariant="gemini"
                icon={<Send size={18} />}
                className="p-4"
                title="Generate Video"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap gap-2 justify-center"
            >
              {PROMPT_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onPromptChange(preset.prompt)}
                  className="px-4 py-2 rounded-full bg-glass border border-border text-[10px] font-bold uppercase tracking-widest text-ink/60 hover:text-ink hover:bg-glass-muted transition-all flex items-center gap-2"
                >
                  <Sparkles size={12} className="text-ink/20" />
                  {preset.name}
                </button>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!isAnalyzing && !isAnimating && !showPrompt && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1 bg-glass-muted p-1 rounded-2xl max-w-fit mx-auto border border-border"
        >
          {(['zoom-in', 'zoom-out', 'pan-lr', 'pan-rl', 'fade-in'] as AnimationPreset[]).map(preset => (
            <button
              key={preset}
              onClick={(e) => {
                e.stopPropagation();
                onRemotionAnimate(preset);
              }}
              className="px-4 py-2 rounded-xl hover:bg-ink hover:text-bg transition-all text-[9px] font-bold uppercase tracking-widest text-ink"
            >
              {preset.replace('-', ' ')}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};
