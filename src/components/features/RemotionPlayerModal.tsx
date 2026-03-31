import React, { useRef, useState, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { motion, AnimatePresence } from 'motion/react';
import { X, Video, Settings2, Clock, Maximize2, MoveHorizontal, Zap } from 'lucide-react';
import { MultiSlideComposition } from './MultiSlideComposition';
import { RemotionComposition } from './RemotionComposition';
import { AnimationPreset, RenderSlide, TransitionType, RenderComposition } from '../../types';
import { Button } from '../ui/Button';
import { ControlGroup } from '../ui/ControlGroup';
import { useRenderQueue } from '../../hooks/useRenderQueue';

interface RemotionPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  preset?: AnimationPreset;
  slides?: RenderSlide[];
  transition?: TransitionType;
  transitionDurationFrames?: number;
  name?: string;
  thumbnailUrl?: string;
}


export const RemotionPlayerModal: React.FC<RemotionPlayerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  preset = 'zoom-in',
  slides: propSlides,
  transition = 'fade',
  transitionDurationFrames = 15,
  name,
  thumbnailUrl,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const { enqueue } = useRenderQueue();
  const fps = 30;

  const [zoomScale, setZoomScale] = useState(1.2);
  const [panAmount, setPanAmount] = useState(5);
  const [speed, setSpeed] = useState(1);
  const [durationPerSlide, setDurationPerSlide] = useState(5);

  useEffect(() => {
    if (isOpen) {
      setZoomScale(1.2);
      setPanAmount(5);
      setSpeed(1);
      setDurationPerSlide(5);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseSlides: RenderSlide[] = propSlides && propSlides.length > 0
    ? propSlides
    : imageUrl
      ? [{ imageUrl, preset, durationInSeconds: 5, width: 1920, height: 1080 }]
      : [];

  if (baseSlides.length === 0) return null;

  const slides = baseSlides.map(s => ({
    ...s,
    durationInSeconds: durationPerSlide,
    zoomScale,
    panAmount,
    speed,
  }));

  const isMulti = slides.length > 1;

  const totalFrames = slides.reduce((sum, s) => sum + Math.round(s.durationInSeconds * fps), 0)
    - (isMulti && transition !== 'none' ? (slides.length - 1) * transitionDurationFrames : 0);

  const outputWidth = Math.max(...slides.map(s => s.width));
  const outputHeight = Math.max(...slides.map(s => s.height));

  const handleEnqueueRender = () => {
    const composition: RenderComposition = {
      id: `render-${Date.now()}`,
      name: name || (isMulti ? `${slides.length} Slides` : 'Single Clip'),
      thumbnailUrl: thumbnailUrl || slides[0].imageUrl,
      slides,
      fps,
      transition: (isMulti ? transition : 'none') as TransitionType,
      transitionDurationFrames: isMulti ? transitionDurationFrames : 0,
    };
    enqueue(composition);
    onClose();
  };

  const handleRenderSeparately = () => {
    slides.forEach((slide, i) => {
      const composition: RenderComposition = {
        id: `render-${Date.now()}-${i}`,
        name: `Clip ${i + 1}`,
        thumbnailUrl: slide.imageUrl,
        slides: [slide],
        fps,
        transition: 'none' as TransitionType,
        transitionDurationFrames: 0,
      };
      enqueue(composition);
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-bg/80 backdrop-blur-2xl"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-6xl glass rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-border"
        >
          {/* Main Player Area */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
            <div className="p-6 border-b border-border flex items-center justify-between bg-glass">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-ink animate-pulse" />
                <h2 className="text-sm font-bold tracking-[0.2em] uppercase opacity-80 text-ink">
                  {isMulti ? `${slides.length} Slides` : slides[0].preset?.replace('-', ' ')}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-glass rounded-full transition-all hover:rotate-90 duration-300 md:hidden text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[400px]">
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
                  inputProps={{ 
                    imageUrl: slides[0].imageUrl, 
                    preset: slides[0].preset,
                    zoomScale,
                    panAmount,
                    speed
                  }}
                  controls
                  loop
                  autoPlay
                />
              )}
            </div>

            <div className="p-6 bg-glass border-t border-border flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-muted uppercase tracking-[0.3em]">
                  Format: MP4 &bull; {outputWidth}x{outputHeight}
                </p>
                <p className="text-[10px] text-ink/40 uppercase tracking-[0.3em]">
                  {fps} FPS &bull; {(totalFrames / fps).toFixed(1)}s
                  {isMulti && ` \u00B7 ${transition} transitions`}
                </p>
              </div>

              {isMulti ? (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleRenderSeparately}
                    variant="secondary"
                    size="md"
                    icon={<Video size={18} />}
                  >
                    {slides.length} Separate
                  </Button>
                  <Button
                    onClick={handleEnqueueRender}
                    variant="primary"
                    size="md"
                    icon={<Video size={18} />}
                  >
                    Combined
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleEnqueueRender}
                  variant="primary"
                  size="md"
                  icon={<Video size={18} />}
                >
                  Render MP4
                </Button>
              )}
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="w-full md:w-[320px] bg-bg flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
                <Settings2 size={16} />
                Parameters
              </div>
              <button
                onClick={onClose}
                className="hidden md:flex p-2 hover:bg-glass rounded-full transition-all hover:rotate-90 duration-300 text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-hide">
              <ControlGroup label="Motion Time" icon={<Clock size={12} />}>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-muted">
                    <span>Duration</span>
                    <span className="text-ink bg-glass px-2 py-0.5 rounded-lg border border-border">{durationPerSlide}s</span>
                  </div>
                  <input 
                    type="range" min="1" max="15" step="0.5"
                    aria-label="Animation Duration"
                    value={durationPerSlide}
                    onChange={(e) => setDurationPerSlide(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </ControlGroup>

              <ControlGroup label="Playback Speed" icon={<Zap size={12} />}>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-muted">
                    <span>Multiplier</span>
                    <span className="text-ink bg-glass px-2 py-0.5 rounded-lg border border-border">{speed}x</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="3" step="0.1"
                    aria-label="Playback Speed Multiplier"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </ControlGroup>

              <ControlGroup label="Zoom Magnitude" icon={<Maximize2 size={12} />}>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-muted">
                    <span>Intensity</span>
                    <span className="text-ink bg-glass px-2 py-0.5 rounded-lg border border-border">{(zoomScale - 1).toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" min="1" max="2" step="0.05"
                    aria-label="Zoom Scale Intensity"
                    value={zoomScale}
                    onChange={(e) => setZoomScale(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </ControlGroup>

              <ControlGroup label="Panning Amount" icon={<MoveHorizontal size={12} />}>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-muted">
                    <span>Range</span>
                    <span className="text-ink bg-glass px-2 py-0.5 rounded-lg border border-border">{panAmount}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="20" step="1"
                    aria-label="Pan Movement Range Percentage"
                    value={panAmount}
                    onChange={(e) => setPanAmount(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </ControlGroup>

              <div className="mt-auto pt-8">
                <button 
                  onClick={() => {
                    setZoomScale(1.2);
                    setPanAmount(5);
                    setSpeed(1);
                    setDurationPerSlide(5);
                  }}
                  className="w-full py-3 text-[10px] uppercase tracking-widest font-bold text-muted hover:text-ink transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
