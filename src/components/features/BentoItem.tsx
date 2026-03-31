import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Maximize2, Download, CheckCircle2, Sparkles, CheckSquare, Square, Video, Play, Loader2, Film
} from 'lucide-react';
import { IconButton } from '../ui/Button';
import { Timer } from '../ui/Timer';
import { CroppedImage, AnimationPreset } from '../../types';

interface BentoItemProps {
  crop: CroppedImage;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpscale: (id: string) => void;
  onAnimate: (id: string, prompt: string) => void;
  onRemotionAnimate: (url: string, preset: AnimationPreset) => void;
  onDownload: (url: string, filename: string) => void;
  onFullscreen: (url: string) => void;
  onViewVideo: (url: string) => void;
}

export const BentoItem: React.FC<BentoItemProps> = React.memo(({
  crop,
  index,
  isSelected,
  onToggleSelect,
  onRemove,
  onUpscale,
  onAnimate,
  onRemotionAnimate,
  onDownload,
  onFullscreen,
  onViewVideo,
}) => {
  const [prompt, setPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [showRemotionPresets, setShowRemotionPresets] = useState(false);

  const handleAnimate = () => {
    if (!prompt.trim()) return;
    onAnimate(crop.id, prompt);
    setShowPromptInput(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`group relative aspect-square rounded-[2rem] overflow-hidden glass flex flex-col transition-all duration-500 ${isSelected ? 'ring-1 ring-white/40 ring-offset-4 ring-offset-bg' : ''}`}
    >
      <div className="relative flex-1 overflow-hidden cursor-zoom-in">
        <img
          src={crop.thumbnailUrl || crop.url}
          alt={`Crop ${index}`}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          onClick={() => onFullscreen(crop.upscaledUrl || crop.url)}
          loading="lazy"
          decoding="async"
        />
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(crop.id);
          }}
          className={`absolute top-4 left-4 p-2.5 rounded-2xl backdrop-blur-2xl transition-all z-20 border border-white/10 shadow-2xl ${isSelected ? 'bg-white text-black scale-110' : 'bg-black/20 text-white opacity-0 group-hover:opacity-100 hover:scale-105'}`}
        >
          {isSelected ? <CheckSquare size={18} strokeWidth={2} /> : <Square size={18} strokeWidth={1.5} />}
        </button>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRemove(crop.id);
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 backdrop-blur-2xl text-white border border-white/10 opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all z-10"
          title="Remove"
        >
          <X size={16} strokeWidth={1.5} />
        </button>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
        
        {crop.isUpscaling && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-white/80">Upscaling</span>
              {crop.upscaleStartTime && <Timer startTime={crop.upscaleStartTime} />}
            </div>
          </div>
        )}

        {crop.isAnimating && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-white/80">Animating</span>
              {crop.animationStartTime && <Timer startTime={crop.animationStartTime} />}
            </div>
          </div>
        )}

        {crop.upscaledUrl && !crop.isAnimating && !crop.videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
            <AnimatePresence>
              {showPromptInput ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="w-full px-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="glass p-2 rounded-2xl flex gap-2 border-white/20 shadow-2xl">
                    <input 
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Animation prompt..."
                      className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 px-3"
                      autoFocus
                    />
                    <IconButton 
                      onClick={handleAnimate}
                      icon={<Play size={14} />}
                      variant="primary"
                    />
                    <IconButton 
                      onClick={() => setShowPromptInput(false)}
                      icon={<X size={14} />}
                    />
                  </div>
                </motion.div>
              ) : showRemotionPresets ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass p-4 rounded-3xl flex flex-col gap-2 w-52 shadow-2xl border-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Presets</span>
                    <IconButton 
                      onClick={() => setShowRemotionPresets(false)}
                      icon={<X size={12} />}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {(['zoom-in', 'zoom-out', 'pan-lr', 'pan-rl', 'fade-in'] as AnimationPreset[]).map(preset => (
                      <button
                        key={preset}
                        onClick={() => {
                          onRemotionAnimate(crop.upscaledUrl || crop.url, preset);
                          setShowRemotionPresets(false);
                        }}
                        className="text-[10px] text-left px-4 py-2.5 rounded-xl hover:bg-white hover:text-black transition-all capitalize font-medium"
                      >
                        {preset.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex gap-4">
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPromptInput(true);
                    }}
                    className="w-12 h-12 rounded-full bg-white text-black hover:scale-105 transition-all shadow-2xl flex items-center justify-center"
                  >
                    <Video size={18} strokeWidth={1.5} />
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRemotionPresets(true);
                    }}
                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-2xl text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-all shadow-2xl flex items-center justify-center"
                  >
                    <Film size={18} strokeWidth={1.5} />
                  </motion.button>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {crop.videoUrl && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onViewVideo(crop.videoUrl!);
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all"
          >
            <div className="p-4 rounded-full bg-white/10 backdrop-blur-2xl text-white border border-white/20 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500">
              <Play size={24} strokeWidth={1.5} fill="currentColor" />
            </div>
          </button>
        )}

        {crop.upscaledUrl && !crop.videoUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-4 right-4 flex flex-col items-end gap-2"
          >
            <div className="px-3 py-1.5 bg-white text-black text-[9px] font-bold rounded-full uppercase tracking-widest flex items-center gap-2 shadow-2xl">
              4K
            </div>
          </motion.div>
        )}
      </div>
      
      <div className="p-4 flex items-center justify-between border-t border-white/5 bg-white/[0.02]">
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">#{index + 1}</span>
        <div className="flex gap-2">
          {!crop.upscaledUrl && !crop.isUpscaling && (
            <IconButton 
              onClick={() => onUpscale(crop.id)}
              icon={<Maximize2 size={16} strokeWidth={1.5} />}
              title="Upscale to 4K"
              size="sm"
            />
          )}
          <IconButton 
            onClick={() => onDownload(crop.upscaledUrl || crop.url, `bento-item-${index + 1}${crop.upscaledUrl ? '-4k' : ''}.jpg`)}
            icon={<Download size={16} strokeWidth={1.5} />}
            title="Download"
            size="sm"
          />
        </div>
      </div>
    </motion.div>
  );
});

BentoItem.displayName = 'BentoItem';
