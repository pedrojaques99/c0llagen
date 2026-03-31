import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Scissors, Video } from 'lucide-react';
import { detectGridItems, upscaleImage, generateVideo, generateVideoWithFrames, generateFullVideo, suggestAIFirst } from './services/gemini';
import { CroppedImage, AnimationPreset, RenderSlide, TransitionType } from './types';
import { RenderQueueProvider } from './hooks/useRenderQueue';
import { RenderToast } from './components/features/RenderToast';
import { Button, IconButton } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { DropZone } from './components/features/DropZone';
import { SourcePreview } from './components/features/SourcePreview';
import { BentoItem } from './components/features/BentoItem';
import { FrameAnimateModal } from './components/features/FrameAnimateModal';
import { RemotionPlayerModal } from './components/features/RemotionPlayerModal';
import { BatchToolbar } from './components/features/BatchToolbar';
import { generateThumbnail, revokeThumbnail } from './utils/thumbnail';

declare global {
  interface Window {
    showDirectoryPicker: (options?: any) => Promise<FileSystemDirectoryHandle>;
  }
}

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [remotionData, setRemotionData] = useState<{
    name?: string;
    thumbnailUrl?: string;
    url?: string;
    preset?: AnimationPreset;
    slides?: RenderSlide[];
    transition?: TransitionType;
  } | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [isAnimatingSource, setIsAnimatingSource] = useState(false);
  const [isUpscalingSource, setIsUpscalingSource] = useState(false);
  const [isCreatingFullVideo, setIsCreatingFullVideo] = useState(false);
  const [showSourcePrompt, setShowSourcePrompt] = useState(false);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [sourcePrompt, setSourcePrompt] = useState("");
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [animationStartTime, setAnimationStartTime] = useState<number | null>(null);
  const [upscaleStartTime, setUpscaleStartTime] = useState<number | null>(null);
  const [fullVideoStartTime, setFullVideoStartTime] = useState<number | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: validFiles.length });
    setUploadStartTime(Date.now());
    setUploadedFiles([]);

    if (validFiles.length === 1 && !sourceImage && croppedImages.length === 0) {
      const file = validFiles[0];
      setUploadedFiles([file.name]);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setCroppedImages([]);
        setSelectedIds(new Set());
        setError(null);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } else {
      const newItems: CroppedImage[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress({ current: i + 1, total: validFiles.length });
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        newItems.push({
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: dataUrl,
          isUpscaling: false,
          isAnimating: false
        });
        setUploadedFiles(prev => [...prev, file.name]);
      }

      if (newItems.length > 0) {
        await Promise.all(
          newItems.map(async (item) => {
            try {
              item.thumbnailUrl = await generateThumbnail(item.url, item.id);
            } catch { /* fallback to full url */ }
          })
        );
        setCroppedImages(prev => [...prev, ...newItems]);
        setError(null);
        await handleAISuggest(newItems);
      }
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) files.push(file as File);
        }
      }
      if (files.length > 0) processFiles(files);
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files as FileList || []).filter((f: File) => f.type.startsWith('image/'));
      if (files.length > 0) processFiles(files);
    };

    const handleGlobalDragOver = (e: DragEvent) => e.preventDefault();

    window.addEventListener('paste', handlePaste);
    window.addEventListener('drop', handleGlobalDrop);
    window.addEventListener('dragover', handleGlobalDragOver);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('drop', handleGlobalDrop);
      window.removeEventListener('dragover', handleGlobalDragOver);
    };
  }, [sourceImage, croppedImages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files as FileList || []);
    if (files.length > 0) processFiles(files as File[]);
  };

  const splitImage = async () => {
    if (!sourceImage) return;
    setIsAnalyzing(true);
    setAnalysisStartTime(Date.now());
    setError(null);
    try {
      const boxes = await detectGridItems(sourceImage);
      const img = new Image();
      img.src = sourceImage;
      await new Promise((resolve) => (img.onload = resolve));
      const newCrops: CroppedImage[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        const x = (box.x / 100) * img.width;
        const y = (box.y / 100) * img.height;
        const w = (box.width / 100) * img.width;
        const h = (box.height / 100) * img.height;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        newCrops.push({
          id: `crop-${i}-${Date.now()}`,
          url: canvas.toDataURL('image/jpeg', 0.9),
          isUpscaling: false,
          isAnimating: false
        });
      }
      await Promise.all(
        newCrops.map(async (item) => {
          try {
            item.thumbnailUrl = await generateThumbnail(item.url, item.id);
          } catch { /* fallback to full url */ }
        })
      );
      setCroppedImages(newCrops);
      setSelectedIds(new Set());
      handleAISuggest(newCrops);
    } catch (err: any) {
      console.error(err);
      setError(err.message?.includes("403") ? "Permission denied. Please enable billing." : "Failed to split image.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStartTime(null);
    }
  };

  const handleUpscale = async (id: string) => {
    const crop = croppedImages.find(c => c.id === id);
    if (!crop || crop.upscaledUrl || crop.isUpscaling) return;
    setCroppedImages(prev => prev.map(c => c.id === id ? { ...c, isUpscaling: true, upscaleStartTime: Date.now() } : c));
    try {
      const upscaled = await upscaleImage(crop.url, "4K");
      setCroppedImages(prev => prev.map(c => c.id === id ? { ...c, upscaledUrl: upscaled, isUpscaling: false } : c));
    } catch (err: any) {
      console.error(err);
      setCroppedImages(prev => prev.map(c => c.id === id ? { ...c, isUpscaling: false } : c));
      setError("Failed to upscale image.");
    }
  };

  const handleAnimate = async (id: string, prompt: string) => {
    const crop = croppedImages.find(c => c.id === id);
    if (!crop || !crop.upscaledUrl || crop.isAnimating) return;
    setCroppedImages(prev => prev.map(c => c.id === id ? { ...c, isAnimating: true, animationStartTime: Date.now(), animationPrompt: prompt } : c));
    try {
      const videoUrl = (await generateVideo(crop.upscaledUrl || crop.url, prompt)) as string;
      setCroppedImages(prev => prev.map(c => c.id === id ? { ...c, videoUrl, isAnimating: false } : c));
    } catch (err: any) {
      console.error(err);
      setCroppedImages(prev => prev.map(c => c.id === id ? { ...c, isAnimating: false } : c));
      setError("Failed to generate video.");
    }
  };

  const handleDirectAnimate = async () => {
    if (!sourceImage || isAnimatingSource) return;
    if (!showSourcePrompt) { setShowSourcePrompt(true); return; }
    if (!sourcePrompt.trim()) { setError("Please enter a prompt."); return; }
    setIsAnimatingSource(true);
    setAnimationStartTime(Date.now());
    try {
      const videoUrl = await generateVideo(sourceImage, sourcePrompt);
      setVideoModalUrl(videoUrl);
      setIsAnimatingSource(false);
      setShowSourcePrompt(false);
      setSourcePrompt("");
    } catch (err: any) {
      console.error(err);
      setIsAnimatingSource(false);
      setError("Failed to generate video.");
    }
  };

  const handleUpscaleSource = async () => {
    if (!sourceImage || isUpscalingSource) return;
    setIsUpscalingSource(true);
    setUpscaleStartTime(Date.now());
    try {
      const upscaledUrl = await upscaleImage(sourceImage, "4K");
      setSourceImage(upscaledUrl);
      setIsUpscalingSource(false);
      setUpscaleStartTime(null);
    } catch (err: any) {
      console.error(err);
      setIsUpscalingSource(false);
      setUpscaleStartTime(null);
      setError("Failed to upscale image.");
    }
  };

  const handleFrameAnimate = async (start: string, end: string, prompt: string) => {
    if (isAnimatingSource) return;
    setIsAnimatingSource(true);
    setAnimationStartTime(Date.now());
    setShowFrameModal(false);
    try {
      const videoUrl = (await generateVideoWithFrames(start, end, prompt)) as string;
      setVideoModalUrl(videoUrl);
      setIsAnimatingSource(false);
      setAnimationStartTime(null);
    } catch (err: any) {
      console.error(err);
      setIsAnimatingSource(false);
      setError("Failed to generate video with frames.");
    }
  };

  const handleCreateFullVideo = async () => {
    if (croppedImages.length === 0 || isCreatingFullVideo) return;
    setIsCreatingFullVideo(true);
    setFullVideoStartTime(Date.now());
    try {
      const targetImages = selectedIds.size > 0 ? croppedImages.filter(c => selectedIds.has(c.id)) : croppedImages;
      const imageUrls = targetImages.map(c => c.upscaledUrl || c.url);
      const videoUrl = await generateFullVideo(imageUrls);
      setVideoModalUrl(videoUrl);
      setIsCreatingFullVideo(false);
      setFullVideoStartTime(null);
    } catch (err: any) {
      console.error(err);
      setIsCreatingFullVideo(false);
      setError("Failed to generate video.");
    }
  };

  const handleAISuggest = async (itemsToSuggest?: CroppedImage[]) => {
    const targets = itemsToSuggest || (selectedIds.size > 0 ? croppedImages.filter(c => selectedIds.has(c.id)) : croppedImages);
    if (targets.length === 0) return;
    setIsAISuggesting(true);
    try {
      const suggestions = await suggestAIFirst(targets.map(t => ({ id: t.id, url: t.url })));
      setCroppedImages(prev => prev.map(crop => {
        const suggestion = suggestions.find(s => s.id === crop.id);
        return suggestion ? { ...crop, animationPrompt: suggestion.prompt, suggestedPreset: suggestion.preset as AnimationPreset } : crop;
      }));
    } catch (err) { console.error(err); } finally { setIsAISuggesting(false); }
  };

  const handleBatchUpscale = async () => {
    for (const id of Array.from(selectedIds) as string[]) { await handleUpscale(id); }
  };

  const handleBatchRemove = () => {
    (Array.from(selectedIds) as string[]).forEach(id => removeImage(id));
    setSelectedIds(new Set());
  };

  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 1920, height: 1080 });
      img.src = url;
    });
  };

  const handleBatchRemotion = async (preset: AnimationPreset) => {
    const targets = selectedIds.size > 0 ? croppedImages.filter(c => selectedIds.has(c.id)) : croppedImages;
    if (targets.length === 1) {
      const crop = targets[0];
      const url = crop.upscaledUrl || crop.url;
      const dims = await getImageDimensions(url);
      setRemotionData({
        name: `Clip ${crop.id.slice(-4)}`,
        thumbnailUrl: crop.thumbnailUrl || crop.url,
        slides: [{ imageUrl: url, preset, durationInSeconds: 5, ...dims }],
      });
    } else {
      const slides: RenderSlide[] = await Promise.all(
        targets.map(async (c) => {
          const url = c.upscaledUrl || c.url;
          const dims = await getImageDimensions(url);
          return { imageUrl: url, preset: c.suggestedPreset || preset, durationInSeconds: 5, ...dims };
        })
      );
      setRemotionData({ 
        name: `Moodboard (${targets.length})`,
        thumbnailUrl: targets[0].thumbnailUrl || targets[0].url,
        slides, 
        transition: 'fade' 
      });
    }
  };

  const removeImage = (id: string) => {
    revokeThumbnail(id);
    setCroppedImages(prev => prev.filter(c => c.id !== id));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => setSelectedIds(new Set(croppedImages.map(c => c.id)));

  const downloadImage = async (url: string, filename: string) => {
    if (directoryHandle) {
      try {
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        const response = await fetch(url);
        await writable.write(await response.blob());
        await writable.close();
        return;
      } catch (err) { setDirectoryHandle(null); }
    }
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadAll = async () => {
    const targets = selectedIds.size > 0 ? croppedImages.filter(c => selectedIds.has(c.id)) : croppedImages;
    if (targets.length === 0) return;
    for (let i = 0; i < targets.length; i++) {
      const crop = targets[i];
      const filename = `item-${i + 1}${crop.upscaledUrl ? '-4k' : ''}.jpg`;
      setTimeout(() => downloadImage(crop.upscaledUrl || crop.url, filename), i * 300);
    }
  };

  const handleReset = () => {
    croppedImages.forEach(c => revokeThumbnail(c.id));
    setSourceImage(null); setCroppedImages([]); setSelectedIds(new Set()); setError(null);
  };

  return (
    <RenderQueueProvider>
      <div className="min-h-screen bg-bg text-ink selection:bg-ink selection:text-bg">
        <Header 
          onReset={handleReset} onUpscaleSourceClick={handleUpscaleSource} isUpscalingSource={isUpscalingSource} 
          upscaleStartTime={upscaleStartTime} onFrameAnimateClick={() => setShowFrameModal(true)} sourceImage={sourceImage}
          hasCroppedImages={croppedImages.length > 0} onCreateFullVideo={handleCreateFullVideo} 
          isCreatingFullVideo={isCreatingFullVideo} fullVideoStartTime={fullVideoStartTime}
        />

        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />

        <main className="pt-32 pb-24 px-8 max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="mb-12 p-6 glass border-red-500/20 text-red-500 rounded-[2rem] text-sm flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="font-medium">{error}</span></div>
                <IconButton onClick={() => setError(null)} icon={<X size={16} />} />
              </motion.div>
            )}

            {!sourceImage && (
              <motion.div key="dropzone" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[60vh]">
                <DropZone onUpload={() => fileInputRef.current?.click()} onFilesDropped={processFiles} />
              </motion.div>
            )}

            {sourceImage && croppedImages.length === 0 && (
              <div className="w-[500px] mx-auto">
                <SourcePreview 
                  sourceImage={sourceImage} isAnalyzing={isAnalyzing} isAnimating={isAnimatingSource} showPrompt={showSourcePrompt}
                  prompt={sourcePrompt} onPromptChange={setSourcePrompt} onAnimate={handleDirectAnimate}
                  onRemotionAnimate={async (preset) => {
                    const dims = await getImageDimensions(sourceImage!);
                    setRemotionData({ name: "Single Render", thumbnailUrl: sourceImage!, slides: [{ imageUrl: sourceImage!, preset, durationInSeconds: 5, ...dims }] });
                  }}
                  analysisStartTime={analysisStartTime} animationStartTime={animationStartTime} onFullscreen={setFullscreenUrl}
                />
                {!isAnalyzing && !isAnimatingSource && !showSourcePrompt && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 flex justify-center gap-4">
                    <Button onClick={splitImage} variant="primary" size="md" icon={<Scissors size={18} />}>Analyze & Split</Button>
                    <Button onClick={() => setShowSourcePrompt(true)} variant="secondary" size="md" icon={<Video size={18} />}>Animate Full</Button>
                  </motion.div>
                )}
              </div>
            )}

            {croppedImages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {croppedImages.map((crop, idx) => (
                  <BentoItem key={crop.id} crop={crop} index={idx} isSelected={selectedIds.has(crop.id)}
                    onToggleSelect={toggleSelect} onRemove={removeImage} onUpscale={handleUpscale} onAnimate={handleAnimate}
                    onRemotionAnimate={async (url, preset) => {
                      const dims = await getImageDimensions(url);
                      setRemotionData({ name: `Item ${idx+1}`, thumbnailUrl: crop.thumbnailUrl || url, slides: [{ imageUrl: url, preset, durationInSeconds: 5, ...dims }] });
                    }}
                    onDownload={downloadImage} onFullscreen={setFullscreenUrl} onViewVideo={setVideoModalUrl}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </main>

        {/* Modals and Toasts */}
        <Modal isOpen={!!fullscreenUrl} onClose={() => setFullscreenUrl(null)}><img src={fullscreenUrl || ''} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" /></Modal>
        <Modal isOpen={!!videoModalUrl} onClose={() => setVideoModalUrl(null)}><video src={videoModalUrl || ''} controls autoPlay loop className="max-w-full max-h-full rounded-xl shadow-2xl" /></Modal>
        <Footer />
        <BatchToolbar selectedCount={selectedIds.size} totalCount={croppedImages.length} onSelectAll={handleSelectAll} onClearSelection={() => setSelectedIds(new Set())}
          onBatchUpscale={handleBatchUpscale} onBatchDownload={downloadAll} onBatchRemove={handleBatchRemove} onBatchRemotion={handleBatchRemotion}
          onAISuggest={() => handleAISuggest()} isAISuggesting={isAISuggesting} />
        {sourceImage && <FrameAnimateModal isOpen={showFrameModal} onClose={() => setShowFrameModal(false)} onAnimate={handleFrameAnimate} sourceImage={sourceImage} />}
        <RemotionPlayerModal isOpen={!!remotionData} onClose={() => setRemotionData(null)} name={remotionData?.name} thumbnailUrl={remotionData?.thumbnailUrl}
          imageUrl={remotionData?.slides?.[0]?.imageUrl || ''} preset={remotionData?.slides?.[0]?.preset || 'zoom-in'}
          slides={remotionData?.slides} transition={remotionData?.transition} />
        
        <AnimatePresence>
          {(isUploading || isAISuggesting) && (
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-32 right-10 z-[60] flex flex-col gap-2 pointer-events-none">
              <div className="bg-bg/80 glass border border-border px-4 py-3 rounded-2xl flex items-center gap-4 shadow-2xl backdrop-blur-xl pointer-events-auto">
                <div className="w-8 h-8 rounded-full border-2 border-border border-t-ink/30 animate-spin flex items-center justify-center">
                  <span className="text-[10px] font-mono text-ink">{uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : '...'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink">{isUploading ? 'Uploading' : 'Analyzing'}</span>
                  <div className="flex items-center gap-2"><span className="text-[9px] font-mono text-muted">{isUploading ? `${uploadProgress.current}/${uploadProgress.total} Files` : 'AI Analysis'}</span>
                  {uploadStartTime && <LiveTimer startTime={uploadStartTime} />}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <RenderToast />
      </div>
    </RenderQueueProvider>
  );
}

const LiveTimer: React.FC<{ startTime: number }> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(i);
  }, [startTime]);
  return <span className="text-[9px] font-mono text-ink/20">{(elapsed / 1000).toFixed(1)}s</span>;
};
