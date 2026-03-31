import React, { useRef } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { motion, AnimatePresence } from 'motion/react';
import { X, Video } from 'lucide-react';
import { MultiSlideComposition } from './MultiSlideComposition';
import { RemotionComposition } from './RemotionComposition';
import { AnimationPreset, RenderSlide, TransitionType, RenderComposition } from '../../types';
import { Button } from '../ui/Button';
import { useRenderQueue } from '../../hooks/useRenderQueue';

interface RemotionPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  preset?: AnimationPreset;
  slides?: RenderSlide[];
  transition?: TransitionType;
  transitionDurationFrames?: number;
}

export const RemotionPlayerModal: React.FC<RemotionPlayerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  preset = 'zoom-in',
  slides: propSlides,
  transition = 'fade',
  transitionDurationFrames = 15,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const { enqueue } = useRenderQueue();
  const fps = 30;

  if (!isOpen) return null;

  const slides: RenderSlide[] = propSlides && propSlides.length > 0
    ? propSlides
    : imageUrl
      ? [{ imageUrl, preset, durationInSeconds: 5, width: 1920, height: 1080 }]
      : [];

  if (slides.length === 0) return null;

  const isMulti = slides.length > 1;

  const totalFrames = slides.reduce((sum, s) => sum + Math.round(s.durationInSeconds * fps), 0)
    - (isMulti && transition !== 'none' ? (slides.length - 1) * transitionDurationFrames : 0);

  const outputWidth = Math.max(...slides.map(s => s.width));
  const outputHeight = Math.max(...slides.map(s => s.height));

  const handleEnqueueRender = () => {
    const composition: RenderComposition = {
      id: `render-${Date.now()}`,
      slides,
      fps,
      transition: (isMulti ? transition : 'none') as TransitionType,
      transitionDurationFrames: isMulti ? transitionDurationFrames : 0,
    };
    enqueue(composition);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-ink/90 backdrop-blur-2xl"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl glass rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border border-white/10"
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase opacity-80">
                {isMulti ? `${slides.length} Slides` : preset?.replace('-', ' ')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-all hover:rotate-90 duration-300"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
            {isMulti ? (
              <Player
                ref={playerRef}
                component={MultiSlideComposition}
                durationInFrames={Math.max(totalFrames, 1)}
                compositionWidth={outputWidth}
                compositionHeight={outputHeight}
                fps={fps}
                style={{ width: '100%', height: '100%' }}
                inputProps={{ slides, transition, transitionDurationFrames, fps }}
                controls
                loop
                autoPlay
              />
            ) : (
              <Player
                ref={playerRef}
                component={RemotionComposition}
                durationInFrames={Math.max(totalFrames, 1)}
                compositionWidth={outputWidth}
                compositionHeight={outputHeight}
                fps={fps}
                style={{ width: '100%', height: '100%' }}
                inputProps={{ imageUrl: slides[0].imageUrl, preset: slides[0].preset }}
                controls
                loop
                autoPlay
              />
            )}
          </div>

          <div className="p-6 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-white/20 uppercase tracking-[0.3em]">
                Format: H.264 (AVC) &bull; {outputWidth}x{outputHeight}
              </p>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.3em]">
                {fps} FPS &bull; {(totalFrames / fps).toFixed(1)}s
                {isMulti && ` \u00B7 ${transition} transitions`}
              </p>
            </div>

            <Button
              onClick={handleEnqueueRender}
              variant="primary"
              size="md"
              icon={<Video size={18} />}
            >
              Render MP4
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
