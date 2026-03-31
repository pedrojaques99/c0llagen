import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, Layers, Video, Send, Play } from 'lucide-react';
import { Timer } from '../ui/Timer';
import { AnimationPreset } from '../../types';

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
    <div className="flex flex-col gap-6 border-[4.11111px] px-[30px] py-[10px] rounded-[10px] border-solid border-white/10">
      <motion.div 
        key="preview"
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative group rounded-[3rem] overflow-hidden glass cursor-zoom-in shadow-2xl"
        onClick={() => !showPrompt && onFullscreen(sourceImage)}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
        <img src={sourceImage} alt="Source" className="w-full object-contain max-h-[75vh] transition-transform duration-1000 group-hover:scale-[1.02]" loading="lazy" />
        
        {!isAnalyzing && !isAnimating && !showPrompt && (
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="p-6 rounded-full bg-white/10 backdrop-blur-2xl text-white border border-white/20 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500">
              <ZoomIn size={32} strokeWidth={1.5} />
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/80">
                {analysisStartTime && <Timer startTime={analysisStartTime} />} Analyzing
              </span>
            </div>
          </div>
        )}

        {isAnimating && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/80">
                {animationStartTime && <Timer startTime={animationStartTime} />} Animating
              </span>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showPrompt && !isAnimating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass p-2 rounded-[2rem] flex items-center gap-2 shadow-2xl max-w-2xl mx-auto w-full border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <input 
              autoFocus
              type="text"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAnimate()}
              placeholder="Describe the cinematic vision..."
              className="flex-1 bg-transparent border-none outline-none text-sm px-6 py-3 text-white placeholder:text-white/20"
            />
            <button 
              onClick={onAnimate}
              className="p-4 rounded-full bg-white text-black hover:bg-white/90 transition-all active:scale-95 shadow-xl"
            >
              <Send size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAnalyzing && !isAnimating && !showPrompt && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1 bg-white/5 p-1 rounded-2xl max-w-fit mx-auto"
        >
          {(['zoom-in', 'zoom-out', 'pan-lr', 'pan-rl', 'fade-in'] as AnimationPreset[]).map(preset => (
            <button
              key={preset}
              onClick={(e) => {
                e.stopPropagation();
                onRemotionAnimate(preset);
              }}
              className="px-3 py-2 rounded-xl hover:bg-white hover:text-black transition-all text-[8px] font-bold uppercase tracking-widest"
            >
              {preset.replace('-', ' ')}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};
