import React, { useState, useEffect, useRef } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Play, Pause, Loader2, CheckCircle2, Clock, Sparkles, Video } from 'lucide-react';
import { RemotionComposition } from './RemotionComposition';
import { AnimationPreset } from '../../types';
import { Button, IconButton } from '../ui/Button';
import * as Mp4Muxer from 'mp4-muxer';

interface RemotionPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  preset: AnimationPreset;
}

type ExportStatus = 'idle' | 'rendering' | 'completed' | 'error';

export const RemotionPlayerModal: React.FC<RemotionPlayerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  preset,
}) => {
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const renderStartTime = useRef<number>(0);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (typeof VideoEncoder === 'undefined') {
      setExportStatus('error');
      return;
    }

    setExportStatus('rendering');
    setProgress(0);
    setElapsedTime(0);
    renderStartTime.current = Date.now();

    const fps = 30;
    const durationInSeconds = 5;
    const totalFrames = fps * durationInSeconds;
    const width = 1920;
    const height = 1080;

    try {
      // 1. Create a dedicated rendering canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error("Failed to get canvas context");

      // 2. Load the image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load image for rendering"));
      });

      // 3. Initialize Muxer
      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width,
          height
        },
        fastStart: 'in-memory'
      });

      // 4. Initialize VideoEncoder
      const videoEncoder = new VideoEncoder({
        output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
        error: (e) => {
          console.error("VideoEncoder error:", e);
          setExportStatus('error');
        }
      });

      videoEncoder.configure({
        codec: 'avc1.640028',
        width,
        height,
        bitrate: 8_000_000,
        framerate: fps
      });

      // 5. Render Loop
      for (let i = 0; i < totalFrames; i++) {
        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Calculate Animation Values (matching RemotionComposition logic)
        let scale = 1;
        let translateX = 0;
        let opacity = 1;

        // Simple interpolation logic
        const progress = i / totalFrames;
        
        switch (preset) {
          case 'zoom-in':
            scale = 1 + (0.2 * progress);
            break;
          case 'zoom-out':
            scale = 1.2 - (0.2 * progress);
            break;
          case 'pan-lr':
            scale = 1.1;
            translateX = -5 + (10 * progress);
            break;
          case 'pan-rl':
            scale = 1.1;
            translateX = 5 - (10 * progress);
            break;
          case 'fade-in':
            opacity = Math.min(i / 15, 1);
            break;
        }

        // Draw Image with "Cover" logic and animation
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > canvasRatio) {
          drawHeight = height;
          drawWidth = height * imgRatio;
        } else {
          drawWidth = width;
          drawHeight = width / imgRatio;
        }

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.translate(translateX * (width / 100), 0);
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        // Capture and Encode
        const frame = new VideoFrame(canvas, { timestamp: (i * 1_000_000) / fps });
        videoEncoder.encode(frame, { keyFrame: i % 30 === 0 });
        frame.close();

        // Update UI
        setProgress((i / totalFrames) * 100);
        setElapsedTime((Date.now() - renderStartTime.current) / 1000);
        
        // Yield to main thread occasionally
        if (i % 10 === 0) await new Promise(resolve => requestAnimationFrame(resolve));
      }

      // 6. Finalize
      await videoEncoder.flush();
      muxer.finalize();
      
      const { buffer } = muxer.target as Mp4Muxer.ArrayBufferTarget;
      const blob = new Blob([buffer], { type: 'video/mp4' });
      setVideoBlob(blob);
      setExportStatus('completed');
      setProgress(100);
    } catch (err) {
      console.error("Export failed:", err);
      setExportStatus('error');
    }
  };

  const handleDownload = () => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `collagen-${preset}-${Date.now()}.mp4`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const formatTime = (seconds: number) => {
    return seconds.toFixed(1) + 's';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-ink/90 backdrop-blur-2xl"
          onClick={exportStatus === 'rendering' ? undefined : onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl glass rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border border-white/10"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase opacity-80">
                {exportStatus === 'rendering' ? 'Rendering MP4' : 
                 exportStatus === 'completed' ? 'MP4 Ready' : 
                 exportStatus === 'error' ? 'Export Failed' :
                 preset.replace('-', ' ')}
              </h2>
            </div>
            {exportStatus !== 'rendering' && (
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/10 rounded-full transition-all hover:rotate-90 duration-300"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Main Content Area */}
          <div ref={wrapperRef} className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
            <Player
              ref={playerRef}
              component={RemotionComposition}
              durationInFrames={150}
              compositionWidth={1920}
              compositionHeight={1080}
              fps={30}
              style={{
                width: '100%',
                height: '100%',
                opacity: exportStatus === 'rendering' ? 0.3 : 1,
                transition: 'opacity 0.5s ease',
              }}
              inputProps={{
                imageUrl,
                preset,
              }}
              controls={exportStatus === 'idle'}
              loop
              autoPlay
            />

            {/* Rendering Overlay */}
            <AnimatePresence>
              {exportStatus === 'rendering' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                  <div className="relative w-24 h-24 mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        className="text-white/10"
                      />
                      <motion.circle
                        cx="48"
                        cy="48"
                        r="44"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        strokeDasharray={276.46}
                        initial={{ strokeDashoffset: 276.46 }}
                        animate={{ strokeDashoffset: 276.46 * (1 - progress / 100) }}
                        className="text-white"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-mono font-light tracking-tighter">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-[0.3em]">
                      <Clock size={12} />
                      <span>Elapsed: {formatTime(elapsedTime)}</span>
                    </div>
                    <p className="text-white/60 text-[10px] uppercase tracking-[0.3em] animate-pulse">
                      Encoding MP4 Stream...
                    </p>
                  </div>
                </motion.div>
              )}

              {exportStatus === 'completed' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-ink/60 backdrop-blur-md"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                  >
                    <CheckCircle2 size={40} className="text-ink" />
                  </motion.div>
                  <h3 className="text-2xl font-bold tracking-tight mb-2">MP4 Rendered</h3>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mb-8">
                    Processed in {formatTime(elapsedTime)}
                  </p>
                  <div className="flex gap-4">
                    <Button 
                      onClick={handleDownload}
                      variant="primary"
                      size="md"
                      icon={<Download size={18} />}
                    >
                      Download MP4
                    </Button>
                    <Button 
                      onClick={() => setExportStatus('idle')}
                      variant="secondary"
                      size="md"
                    >
                      Back to Preview
                    </Button>
                  </div>
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute top-1/4 left-1/4"
                  >
                    <Sparkles size={24} className="text-white/20" />
                  </motion.div>
                </motion.div>
              )}

              {exportStatus === 'error' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
                >
                  <h3 className="text-xl font-bold text-red-500 mb-4">Rendering Error</h3>
                  <p className="text-white/60 text-sm mb-8 text-center max-w-xs">
                    Your browser might not support WebCodecs MP4 encoding. Try using Chrome or Edge.
                  </p>
                  <Button onClick={() => setExportStatus('idle')} variant="secondary" size="md">
                    Try Again
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-6 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-white/20 uppercase tracking-[0.3em]">
                Format: H.264 (AVC) • 1920x1080
              </p>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.3em]">
                30 FPS • 5.0 Seconds • High Quality
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {exportStatus === 'idle' && (
                <Button 
                  onClick={handleExport}
                  variant="primary"
                  size="md"
                  icon={<Video size={18} />}
                >
                  Render Real MP4
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
