import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { detectGridItems, upscaleImage, generateVideo, generateVideoWithFrames, generateFullVideo, suggestAIFirst } from './services/gemini';
import { CroppedImage, AnimationPreset } from './types';
import { Button, IconButton } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import { useTheme } from './hooks/useTheme';
import { Scissors, Video, Sparkles } from 'lucide-react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { DropZone } from './components/features/DropZone';
import { SourcePreview } from './components/features/SourcePreview';
import { BentoItem } from './components/features/BentoItem';
import { FrameAnimateModal } from './components/features/FrameAnimateModal';
import { RemotionPlayerModal } from './components/features/RemotionPlayerModal';
import { BatchToolbar } from './components/features/BatchToolbar';
import { BatchRenderModal } from './components/features/BatchRenderModal';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
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
  const [remotionData, setRemotionData] = useState<{ url: string, preset: AnimationPreset } | null>(null);
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
  const [batchRenderItems, setBatchRenderItems] = useState<{ id: string, url: string, preset: AnimationPreset }[]>([]);
  const [isBatchRenderOpen, setIsBatchRenderOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Component initialized
  }, []);

  const handleSelectKey = async () => {
    // Selection is now handled via environment variables on Vercel
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    if (files.length === 1 && !sourceImage && croppedImages.length === 0) {
      // Standard single image flow
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        setError("Please upload an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setCroppedImages([]);
        setSelectedIds(new Set());
        setError(null);
      };
      reader.readAsDataURL(file);
    } else {
      // Batch mode: add directly to grid
      const newItems: CroppedImage[] = [];
      
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        
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
      }

      if (newItems.length > 0) {
        setCroppedImages(prev => [...prev, ...newItems]);
        setError(null);
        // Automatically suggest prompts for the new batch
        handleAISuggest(newItems);
      }
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

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('drop', handleGlobalDrop);
    window.addEventListener('dragover', handleGlobalDragOver);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('drop', handleGlobalDrop);
      window.removeEventListener('dragover', handleGlobalDragOver);
    };
  }, []);

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

      setCroppedImages(newCrops);
      setSelectedIds(new Set());

      // AI First: Automatically suggest presets for the new items
      handleAISuggest(newCrops);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("permission") || err.message?.includes("403")) {
        setError("Permission denied. Please ensure your GEMINI_API_KEY has billing enabled.");
      } else {
        setError("Failed to analyze and split the image. Please try again.");
      }
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
      if (err.message?.includes("permission") || err.message?.includes("403")) {
        setError("Permission denied. Image generation models require a paid API key.");
      } else {
        setError("Failed to upscale image.");
      }
    }
  };

  const handleAnimate = async (id: string, prompt: string) => {
    const crop = croppedImages.find(c => c.id === id);
    if (!crop || !crop.upscaledUrl || crop.isAnimating) return;

    setCroppedImages(prev => prev.map(c => c.id === id ? { 
      ...c, 
      isAnimating: true, 
      animationStartTime: Date.now(),
      animationPrompt: prompt 
    } : c));

    try {
      const videoUrl = (await generateVideo(crop.upscaledUrl || crop.url, prompt)) as string;
      setCroppedImages(prev => prev.map(c => c.id === id ? { 
        ...c, 
        videoUrl, 
        isAnimating: false 
      } : c));
    } catch (err: any) {
      console.error(err);
      setCroppedImages(prev => prev.map(c => c.id === id ? { ...c, isAnimating: false } : c));
      if (err.message?.includes("permission") || err.message?.includes("403")) {
        setError("Permission denied. Video generation requires a paid API key.");
      } else {
        setError("Failed to generate video.");
      }
    }
  };

  const handleDirectAnimate = async () => {
    if (!sourceImage || isAnimatingSource) return;

    if (!showSourcePrompt) {
      setShowSourcePrompt(true);
      return;
    }

    if (!sourcePrompt.trim()) {
      setError("Please enter a prompt for animation.");
      return;
    }

    setIsAnimatingSource(true);
    setAnimationStartTime(Date.now());
    setError(null);

    try {
      const videoUrl = await generateVideo(sourceImage, sourcePrompt);
      setVideoModalUrl(videoUrl);
      setIsAnimatingSource(false);
      setShowSourcePrompt(false);
      setSourcePrompt("");
    } catch (err: any) {
      console.error(err);
      setIsAnimatingSource(false);
      if (err.message?.includes("permission") || err.message?.includes("403")) {
        setError("Permission denied. Video generation requires a paid API key.");
      } else {
        setError("Failed to generate video.");
      }
    }
  };

  const handleUpscaleSource = async () => {
    if (!sourceImage || isUpscalingSource) return;

    setIsUpscalingSource(true);
    setUpscaleStartTime(Date.now());
    setError(null);

    try {
      const upscaledUrl = await upscaleImage(sourceImage, "4K");
      setSourceImage(upscaledUrl);
      setIsUpscalingSource(false);
      setUpscaleStartTime(null);
    } catch (err: any) {
      console.error(err);
      setIsUpscalingSource(false);
      setUpscaleStartTime(null);
      if (err.message?.includes("permission") || err.message?.includes("403")) {
        setError("Permission denied. 4K upscaling requires a paid API key.");
      } else {
        setError("Failed to upscale image.");
      }
    }
  };

  const handleFrameAnimate = async (start: string, end: string, prompt: string) => {
    if (isAnimatingSource) return;

    setIsAnimatingSource(true);
    setAnimationStartTime(Date.now());
    setShowFrameModal(false);
    setError(null);

    try {
      const videoUrl = (await generateVideoWithFrames(start, end, prompt)) as string;
      setVideoModalUrl(videoUrl);
      setIsAnimatingSource(false);
      setAnimationStartTime(null);
    } catch (err: any) {
      console.error(err);
      setIsAnimatingSource(false);
      setAnimationStartTime(null);
      if (err.message?.includes("permission") || err.message?.includes("403")) {
        setError("Permission denied. Video generation requires a paid API key.");
      } else {
        setError("Failed to generate video with frames.");
      }
    }
  };

  const handleCreateFullVideo = async () => {
    if (croppedImages.length === 0 || isCreatingFullVideo) return;

    setIsCreatingFullVideo(true);
    setFullVideoStartTime(Date.now());
    setError(null);

    try {
      // Use selected images if any, otherwise all
      const targetImages = selectedIds.size > 0 
        ? croppedImages.filter(c => selectedIds.has(c.id))
        : croppedImages;

      const imageUrls = targetImages.map(c => c.upscaledUrl || c.url);
      const videoUrl = await generateFullVideo(imageUrls);
      setVideoModalUrl(videoUrl);
      setIsCreatingFullVideo(false);
      setFullVideoStartTime(null);
    } catch (err: any) {
      console.error(err);
      setIsCreatingFullVideo(false);
      setFullVideoStartTime(null);
      if (err.message?.includes("permission") || err.message?.includes("403")) {
        setError("Permission denied. Video generation requires a paid API key.");
      } else {
        setError("Failed to generate complete video.");
      }
    }
  };

  const handleAISuggest = async (itemsToSuggest?: CroppedImage[]) => {
    const targets = itemsToSuggest || (selectedIds.size > 0 
      ? croppedImages.filter(c => selectedIds.has(c.id))
      : croppedImages);

    if (targets.length === 0) return;

    setIsAISuggesting(true);
    try {
      const suggestions = await suggestAIFirst(targets.map(t => ({ id: t.id, url: t.url })));
      
      setCroppedImages(prev => prev.map(crop => {
        const suggestion = suggestions.find(s => s.id === crop.id);
        if (suggestion) {
          return {
            ...crop,
            animationPrompt: suggestion.prompt,
            suggestedPreset: suggestion.preset as AnimationPreset
          };
        }
        return crop;
      }));
    } catch (err) {
      console.error("AI Suggestion failed", err);
    } finally {
      setIsAISuggesting(false);
    }
  };

  const handleBatchUpscale = async () => {
    const selected = Array.from(selectedIds) as string[];
    for (const id of selected) {
      await handleUpscale(id);
    }
  };

  const handleBatchRemove = () => {
    const selected = Array.from(selectedIds) as string[];
    selected.forEach(id => removeImage(id));
    setSelectedIds(new Set());
  };

  const handleBatchRemotion = (preset: AnimationPreset) => {
    const selected = Array.from(selectedIds);
    if (selected.length === 0) return;

    if (selected.length === 1) {
      const crop = croppedImages.find(c => c.id === selected[0]);
      if (crop) setRemotionData({ url: crop.upscaledUrl || crop.url, preset });
    } else {
      // Batch mode: Open the sequential render modal
      const itemsToRender = croppedImages
        .filter(c => selectedIds.has(c.id))
        .map(c => ({
          id: c.id,
          url: c.upscaledUrl || c.url,
          preset: preset
        }));
      
      setBatchRenderItems(itemsToRender);
      setIsBatchRenderOpen(true);
    }
  };

  const removeImage = (id: string) => {
    setCroppedImages(prev => prev.filter(c => c.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(croppedImages.map(c => c.id)));
  };

  const downloadImage = async (url: string, filename: string) => {
    if (directoryHandle) {
      try {
        const permission = await directoryHandle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          const newPermission = await directoryHandle.requestPermission({ mode: 'readwrite' });
          if (newPermission !== 'granted') throw new Error("Permission denied");
        }

        const response = await fetch(url);
        const blob = await response.blob();
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        console.error("Directory save failed, falling back to standard download", err);
        setDirectoryHandle(null);
      }
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        setError("Your browser doesn't support direct folder access. Downloads will proceed individually.");
        return null;
      }
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      setDirectoryHandle(handle);
      return handle;
    } catch (err) {
      console.error("Folder selection cancelled or failed", err);
      return null;
    }
  };

  const downloadAll = async () => {
    const imagesToDownload = selectedIds.size > 0 
      ? croppedImages.filter(c => selectedIds.has(c.id))
      : croppedImages;

    if (imagesToDownload.length === 0) return;

    let currentHandle = directoryHandle;
    
    if (imagesToDownload.length > 1 && !currentHandle && 'showDirectoryPicker' in window) {
      const confirmFolder = window.confirm("Would you like to select a destination folder to save all images at once? (Recommended for batch)");
      if (confirmFolder) {
        currentHandle = await selectFolder();
      }
    }

    for (let idx = 0; idx < imagesToDownload.length; idx++) {
      const crop = imagesToDownload[idx];
      const filename = `bento-item-${idx + 1}${crop.upscaledUrl ? '-4k' : ''}.jpg`;
      
      if (currentHandle) {
        await downloadImage(crop.upscaledUrl || crop.url, filename);
      } else {
        setTimeout(() => {
          downloadImage(crop.upscaledUrl || crop.url, filename);
        }, idx * 300);
      }
    }
  };

  const handleReset = () => {
    setSourceImage(null);
    setCroppedImages([]);
    setSelectedIds(new Set());
    setError(null);
    setShowSourcePrompt(false);
    setSourcePrompt("");
  };



  return (
    <div className="min-h-screen bg-bg text-white selection:bg-white selection:text-black">
      <Header 
        onReset={handleReset}
        onUpscaleSourceClick={handleUpscaleSource}
        isUpscalingSource={isUpscalingSource}
        upscaleStartTime={upscaleStartTime}
        onFrameAnimateClick={() => setShowFrameModal(true)}
        sourceImage={sourceImage}
        hasCroppedImages={croppedImages.length > 0}
        onCreateFullVideo={handleCreateFullVideo}
        isCreatingFullVideo={isCreatingFullVideo}
        fullVideoStartTime={fullVideoStartTime}
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        multiple
        className="hidden" 
      />

      <main className="pt-32 pb-24 px-8 max-w-[1400px] mx-auto">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-12 p-6 glass border-red-500/20 text-red-400 rounded-[2rem] text-sm flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-medium">{error}</span>
              </div>
              <IconButton onClick={() => setError(null)} icon={<X size={16} />} />
            </motion.div>
          )}

          {!sourceImage && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <DropZone 
                onUpload={() => fileInputRef.current?.click()} 
                onFilesDropped={processFiles}
              />
            </motion.div>
          )}

          {sourceImage && croppedImages.length === 0 && (
            <div className="w-[500px] mx-auto">
              <SourcePreview 
                sourceImage={sourceImage}
                isAnalyzing={isAnalyzing}
                isAnimating={isAnimatingSource}
                showPrompt={showSourcePrompt}
                prompt={sourcePrompt}
                onPromptChange={setSourcePrompt}
                onAnimate={handleDirectAnimate}
                onRemotionAnimate={(preset) => setRemotionData({ url: sourceImage, preset })}
                analysisStartTime={analysisStartTime}
                animationStartTime={animationStartTime}
                onFullscreen={setFullscreenUrl}
              />
              
              {!isAnalyzing && !isAnimatingSource && !showSourcePrompt && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 flex justify-center gap-4"
                >
                  <Button 
                    onClick={splitImage}
                    variant="primary"
                    size="md"
                    icon={<Scissors size={18} strokeWidth={1.5} />}
                  >
                    Analyze & Split Grid
                  </Button>
                  <Button 
                    onClick={() => setShowSourcePrompt(true)}
                    variant="secondary"
                    size="md"
                    icon={<Video size={18} strokeWidth={1.5} />}
                  >
                    Animate Full Image
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {croppedImages.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 flex items-center justify-between"
            >
              <div className="flex flex-col">
                <h2 className="text-xl font-bold tracking-tight">Moodboard</h2>
                <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1">{croppedImages.length} items</p>
              </div>
              <div className="flex gap-4">
                <Button 
                  onClick={handleSelectAll}
                  variant="ghost"
                  size="sm"
                >
                  Select All
                </Button>
              </div>
            </motion.div>
          )}

          {croppedImages.length > 0 && (
            <motion.div 
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {croppedImages.map((crop, idx) => (
                <BentoItem 
                  key={crop.id}
                  crop={crop}
                  index={idx}
                  isSelected={selectedIds.has(crop.id)}
                  onToggleSelect={toggleSelect}
                  onRemove={removeImage}
                  onUpscale={handleUpscale}
                  onAnimate={handleAnimate}
                  onRemotionAnimate={(url, preset) => setRemotionData({ url, preset })}
                  onDownload={downloadImage}
                  onFullscreen={setFullscreenUrl}
                  onViewVideo={setVideoModalUrl}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Modal isOpen={!!fullscreenUrl} onClose={() => setFullscreenUrl(null)}>
        <img 
          src={fullscreenUrl || ''} 
          alt="Fullscreen" 
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
        />
      </Modal>

      <Modal isOpen={!!videoModalUrl} onClose={() => setVideoModalUrl(null)}>
        <video 
          src={videoModalUrl || ''} 
          controls 
          autoPlay 
          loop 
          className="max-w-full max-h-full rounded-xl shadow-2xl"
        />
      </Modal>

      <Footer />

      <BatchToolbar 
        selectedCount={selectedIds.size}
        totalCount={croppedImages.length}
        onSelectAll={handleSelectAll}
        onClearSelection={() => setSelectedIds(new Set())}
        onBatchUpscale={handleBatchUpscale}
        onBatchDownload={downloadAll}
        onBatchRemove={handleBatchRemove}
        onBatchRemotion={handleBatchRemotion}
        onAISuggest={() => handleAISuggest()}
        isAISuggesting={isAISuggesting}
      />

      {sourceImage && (
        <FrameAnimateModal 
          isOpen={showFrameModal}
          onClose={() => setShowFrameModal(false)}
          onAnimate={handleFrameAnimate}
          sourceImage={sourceImage}
        />
      )}

      <RemotionPlayerModal 
        isOpen={!!remotionData}
        onClose={() => setRemotionData(null)}
        imageUrl={remotionData?.url || ''}
        preset={remotionData?.preset || 'zoom-in'}
      />

      <BatchRenderModal 
        isOpen={isBatchRenderOpen}
        onClose={() => setIsBatchRenderOpen(false)}
        items={batchRenderItems}
      />
    </div>
  );
}
