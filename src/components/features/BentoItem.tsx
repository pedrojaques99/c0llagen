import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Maximize2, Download, CheckCircle2, Sparkles, CheckSquare, Square, Video, Play, Loader2, Film
} from 'lucide-react';
import { IconButton } from '../ui/Button';
import { Timer } from '../ui/Timer';
import { CroppedImage, AnimationPreset } from '../../types';
import { PROMPT_PRESETS } from '../../services/gemini';

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
  onUpdateImage?: (file: File) => void;
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
  onUpdateImage,
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
      className={`group relative overflow-hidden glass transition-all duration-500 rounded-[2rem] border border-border/50 ${isSelected ? 'ring-2 ring-ink ring-offset-4 ring-offset-bg' : ''}`}
    >
      <div className="flex flex-col sm:flex-row h-full min-h-[220px]">
        {/* Left Column: Image/Media */}
        <div className="relative w-full sm:w-[45%] overflow-hidden cursor-zoom-in border-r border-border/30 bg-bg/20">
          {crop.url ? (
            <>
              <img
                src={crop.thumbnailUrl || crop.url}
                alt={`Crop ${index}`}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                onClick={() => onFullscreen(crop.upscaledUrl || crop.url)}
                loading="lazy"
              />
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleSelect(crop.id); }}
                className={`absolute top-4 left-4 p-2.5 rounded-2xl backdrop-blur-3xl transition-all z-20 border border-border shadow-2xl ${isSelected ? 'bg-ink text-bg scale-110' : 'bg-bg/40 text-ink opacity-0 group-hover:opacity-100 hover:scale-105'}`}
              >
                {isSelected ? <CheckSquare size={18} strokeWidth={2} /> : <Square size={18} strokeWidth={1.5} />}
              </button>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center bg-glass-muted hover:bg-glass transition-colors group/upload relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onUpdateImage) onUpdateImage(file);
                }}
                accept="image/*"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-ink/5 border border-dashed border-ink/20 flex items-center justify-center group-hover/upload:scale-110 transition-transform">
                  <Play size={20} className="text-muted rotate-90" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Click to add image</span>
              </div>
            </div>
          )}

          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(crop.id); }}
            className="absolute top-4 right-4 p-2 rounded-xl bg-bg/40 backdrop-blur-3xl text-ink border border-border opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all z-10"
            title="Remove"
          >
            <X size={16} strokeWidth={1.5} />
          </button>

          {crop.isUpscaling && (
            <div className="absolute inset-0 bg-bg/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted">Upscaling</span>
                {crop.upscaleStartTime && <Timer startTime={crop.upscaleStartTime} />}
              </div>
            </div>
          )}

          {crop.isAnimating && (
            <div className="absolute inset-0 bg-bg/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted">Animating</span>
                {crop.animationStartTime && <Timer startTime={crop.animationStartTime} />}
              </div>
            </div>
          )}

          {crop.videoUrl && !crop.isAnimating && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg/20 group-hover:bg-bg/40 transition-all cursor-pointer" onClick={() => onViewVideo(crop.videoUrl!)}>
               <Play size={32} className="text-ink drop-shadow-2xl translate-x-0.5" fill="currentColor" />
            </div>
          )}
        </div>

        {/* Right Column: Properties & Generative Controls */}
        <div className="flex-1 p-6 flex flex-col justify-between gap-6 bg-glass/20 backdrop-blur-sm">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted uppercase tracking-[0.2em]">ITEM #{index + 1}</span>
              <div className="flex gap-1.5">
                {!crop.upscaledUrl && !crop.isUpscaling && crop.url && (
                  <IconButton 
                    onClick={() => onUpscale(crop.id)}
                    icon={<Maximize2 size={16} strokeWidth={1.5} />}
                    title="Upscale to 4K"
                    badge="AI"
                    size="sm"
                  />
                )}
                <IconButton 
                  onClick={() => onDownload(crop.upscaledUrl || crop.url, `collagen-item-${index + 1}${crop.upscaledUrl ? '-4k' : ''}.jpg`)}
                  icon={<Download size={16} strokeWidth={1.5} />}
                  title="Download"
                  size="sm"
                  disabled={!crop.url}
                />
              </div>
            </div>

            {crop.url && (
              <div className="space-y-4">
                {/* Remotion Presets */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Film size={12} className="text-muted" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted">Remotion Direction</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['zoom-in', 'zoom-out', 'pan-lr', 'pan-rl', 'fade-in'] as AnimationPreset[]).map(preset => (
                      <button
                        key={preset}
                        onClick={() => onRemotionAnimate(crop.upscaledUrl || crop.url, preset)}
                        className="px-3 py-1.5 rounded-xl border border-border bg-bg/20 text-[9px] font-medium text-ink hover:bg-ink hover:text-bg transition-all capitalize"
                      >
                        {preset.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Veo 3 / Video Gen */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Video size={12} className="text-muted" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted">Veo 3 Animation</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-ink/5 border border-border rounded-xl px-3 py-2 flex items-center gap-2 group-hover:border-ink/20 focus-within:border-ink/40 transition-all">
                      <input 
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Direct animation prompt..."
                        className="flex-1 bg-transparent border-none outline-none text-[10px] text-ink placeholder:text-muted/50"
                        onKeyDown={(e) => e.key === 'Enter' && handleAnimate()}
                      />
                      <IconButton 
                        onClick={handleAnimate}
                        icon={<Sparkles size={14} className="text-ink" />}
                        variant="primary"
                        size="sm"
                        badge="AI"
                        disabled={!prompt.trim() || !crop.upscaledUrl}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!crop.url && (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12">
                <span className="text-[10px] uppercase tracking-widest">Waiting for source image</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/20">
             {crop.upscaledUrl && (
               <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-ink/5 border border-ink/10 text-[8px] font-bold tracking-widest text-muted uppercase">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                 Ready for Render
               </div>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

BentoItem.displayName = 'BentoItem';
