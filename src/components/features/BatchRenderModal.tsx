import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Download, CheckCircle2, Clock, Loader2, Play, Package, 
  Trash2, AlertCircle, Film
} from 'lucide-react';
import { Button, IconButton } from '../ui/Button';
import { BatchRenderItem, AnimationPreset, ExportStatus } from '../../types';
import * as Mp4Muxer from 'mp4-muxer';
import JSZip from 'jszip';

interface BatchRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: { id: string, url: string, preset: AnimationPreset }[];
}

export const BatchRenderModal: React.FC<BatchRenderModalProps> = ({
  isOpen,
  onClose,
  items: initialItems,
}) => {
  const [queue, setQueue] = useState<BatchRenderItem[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen && initialItems.length > 0) {
      setQueue(initialItems.map(item => ({
        ...item,
        status: 'idle',
        progress: 0,
      })));
    }
  }, [isOpen, initialItems]);

  const renderSingle = async (item: BatchRenderItem): Promise<Blob | null> => {
    setActiveId(item.id);
    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'rendering', progress: 0 } : q));

    const fps = 30;
    const durationInSeconds = 5;
    const totalFrames = fps * durationInSeconds;
    const width = 1920;
    const height = 1080;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error("Context failed");

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = item.url;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: { codec: 'avc', width, height },
        fastStart: 'in-memory'
      });

      const videoEncoder = new VideoEncoder({
        output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
        error: (e) => console.error(e)
      });

      videoEncoder.configure({
        codec: 'avc1.640028',
        width,
        height,
        bitrate: 8_000_000,
        framerate: fps
      });

      for (let i = 0; i < totalFrames; i++) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const progress = i / totalFrames;
        let scale = 1, translateX = 0, opacity = 1;

        switch (item.preset) {
          case 'zoom-in': scale = 1 + (0.2 * progress); break;
          case 'zoom-out': scale = 1.2 - (0.2 * progress); break;
          case 'pan-lr': scale = 1.1; translateX = -5 + (10 * progress); break;
          case 'pan-rl': scale = 1.1; translateX = 5 - (10 * progress); break;
          case 'fade-in': opacity = Math.min(i / 15, 1); break;
        }

        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let dw, dh;
        if (imgRatio > canvasRatio) { dh = height; dw = height * imgRatio; }
        else { dw = width; dh = width / imgRatio; }

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.translate(translateX * (width / 100), 0);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();

        const frame = new VideoFrame(canvas, { timestamp: (i * 1_000_000) / fps });
        videoEncoder.encode(frame, { keyFrame: i % 30 === 0 });
        frame.close();

        if (i % 5 === 0) {
           setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: (i / totalFrames) * 100 } : q));
           await new Promise(r => requestAnimationFrame(r));
        }
      }

      await videoEncoder.flush();
      muxer.finalize();
      const { buffer } = muxer.target as Mp4Muxer.ArrayBufferTarget;
      const blob = new Blob([buffer], { type: 'video/mp4' });
      
      setQueue(prev => prev.map(q => q.id === item.id ? { 
        ...q, 
        status: 'completed', 
        progress: 100, 
        blob,
        videoUrl: URL.createObjectURL(blob)
      } : q));
      
      return blob;
    } catch (err) {
      console.error(err);
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error' } : q));
      return null;
    }
  };

  const startBatch = async () => {
    if (isRendering) return;
    setIsRendering(true);
    
    // Reset any previous state for this batch
    setQueue(prev => prev.map(item => ({ ...item, status: 'idle', progress: 0, blob: undefined, videoUrl: undefined })));

    for (const item of queue) {
      await renderSingle(item);
    }
    
    setIsRendering(false);
    setActiveId(null);
  };

  const downloadSingle = (item: BatchRenderItem) => {
    if (!item.blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(item.blob);
    link.download = `collagen-${item.id}-${item.preset}.mp4`;
    link.click();
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    queue.forEach((item, idx) => {
      if (item.blob) {
        zip.file(`video-${idx + 1}-${item.preset}.mp4`, item.blob);
      }
    });
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `collagen-batch-${Date.now()}.zip`;
    link.click();
  };

  if (!isOpen) return null;

  const totalCompleted = queue.filter(q => q.status === 'completed').length;
  const isFinished = totalCompleted === queue.length && queue.length > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-ink/90 backdrop-blur-3xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-bg glass border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isRendering ? 'bg-blue-400 animate-pulse' : 'bg-white/20'}`} />
                <h2 className="text-xl font-bold tracking-tight">Batch Render</h2>
              </div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                {totalCompleted} of {queue.length} items rendered
              </p>
            </div>
            {!isRendering && (
              <IconButton onClick={onClose} icon={<X size={20} />} />
            )}
          </div>

          {/* Queue List */}
          <div className="p-8 max-h-[50vh] overflow-y-auto scrollbar-hide flex flex-col gap-4">
            {queue.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center justify-between p-5 rounded-3xl transition-all ${
                  activeId === item.id ? 'bg-white/10 scale-[1.02]' : 'bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0">
                    <img src={item.url} className="w-full h-full object-cover" />
                    {item.status === 'rendering' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      {item.preset.replace('-', ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      {item.status === 'completed' && <CheckCircle2 size={14} className="text-emerald-400" />}
                      {item.status === 'error' && <AlertCircle size={14} className="text-red-400" />}
                      <span className="text-sm font-medium">Render #{idx + 1}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {item.status === 'rendering' && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                         className="h-full bg-white"
                         initial={{ width: 0 }}
                         animate={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono opacity-40">{Math.round(item.progress)}%</span>
                    </div>
                  )}
                  {item.status === 'completed' && (
                    <Button 
                      onClick={() => downloadSingle(item)}
                      variant="ghost" 
                      size="sm"
                      icon={<Download size={14} />}
                    >
                      MP4
                    </Button>
                  )}
                  {item.status === 'idle' && (
                    <span className="text-[9px] uppercase tracking-widest opacity-20">Queued</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="p-10 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
            {!isRendering && !isFinished ? (
              <Button 
                onClick={startBatch} 
                variant="primary" 
                size="lg" 
                className="w-full"
                icon={<Film size={18} />}
              >
                Start Sequential Render
              </Button>
            ) : isFinished ? (
              <div className="flex gap-4 w-full">
                <Button 
                  onClick={downloadZip} 
                  variant="primary" 
                  size="lg" 
                  className="flex-1"
                  icon={<Package size={18} />}
                >
                  Download All (ZIP)
                </Button>
                <Button 
                  onClick={onClose} 
                  variant="secondary" 
                  size="lg"
                  className="px-8"
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-white/40 text-[10px] uppercase tracking-[0.3em] w-full justify-center">
                <Loader2 className="animate-spin" size={14} />
                <span>Processing Queue... Do not close window</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
