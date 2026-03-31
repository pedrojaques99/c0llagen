# Render Engine V2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline MP4 renderer with a background render queue that supports single-clip and multi-slide compositions with `@remotion/transitions`, matching source resolution, per-slide duration, and non-blocking UI.

**Architecture:** A `RenderComposition` config object drives both the Remotion `<Player>` preview and a canvas-based export renderer. The `RenderQueue` service manages jobs sequentially with progress/cancellation. A floating `RenderToast` component shows status while users keep working.

**Tech Stack:** VideoEncoder API, mp4-muxer, @remotion/transitions (TransitionSeries, fade, slide, wipe), React Context

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types.ts` | Add composition, slide, transition, and job types |
| Create | `src/services/canvasRenderer.ts` | Frame-by-frame canvas rendering engine with animation + transition math |
| Create | `src/services/renderQueue.ts` | Job queue: enqueue, cancel, sequential execution, progress callbacks |
| Create | `src/hooks/useRenderQueue.tsx` | React context provider + `useRenderQueue()` hook |
| Create | `src/components/features/MultiSlideComposition.tsx` | Remotion composition using TransitionSeries for multi-slide preview |
| Modify | `src/components/features/RemotionPlayerModal.tsx` | Remove inline renderer, use queue, support multi-slide preview |
| Create | `src/components/features/RenderToast.tsx` | Floating toast showing background render progress/download |
| Modify | `src/App.tsx` | Add RenderQueueProvider, RenderToast, update enqueue handlers |

---

### Task 1: Extend Types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add render composition and queue types**

```ts
// Append to existing types.ts

export type TransitionType = 'fade' | 'slide' | 'wipe' | 'none';

export interface RenderSlide {
  imageUrl: string;
  preset: AnimationPreset;
  durationInSeconds: number;
  width: number;
  height: number;
}

export interface RenderComposition {
  id: string;
  slides: RenderSlide[];
  fps: number;
  transition: TransitionType;
  transitionDurationFrames: number;
}

export type RenderJobStatus = 'queued' | 'rendering' | 'completed' | 'cancelled' | 'error';

export interface RenderJob {
  id: string;
  composition: RenderComposition;
  status: RenderJobStatus;
  progress: number;
  blob: Blob | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add render composition and queue types"
```

---

### Task 2: Canvas Renderer Service

**Files:**
- Create: `src/services/canvasRenderer.ts`

This is the core rendering engine. It takes a `RenderComposition`, renders each frame to a canvas, encodes via VideoEncoder, and muxes to MP4.

- [ ] **Step 1: Create the canvas renderer**

```ts
// src/services/canvasRenderer.ts
import * as Mp4Muxer from 'mp4-muxer';
import { RenderComposition, RenderSlide, AnimationPreset, TransitionType } from '../types';

interface RenderCallbacks {
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}

// --- Animation math (mirrors RemotionComposition logic) ---

function applyPreset(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  preset: AnimationPreset,
  progress: number, // 0..1 within this slide
  canvasW: number,
  canvasH: number
) {
  let scale = 1;
  let translateX = 0;
  let opacity = 1;

  switch (preset) {
    case 'zoom-in':
      scale = 1 + 0.2 * progress;
      break;
    case 'zoom-out':
      scale = 1.2 - 0.2 * progress;
      break;
    case 'pan-lr':
      scale = 1.1;
      translateX = -5 + 10 * progress;
      break;
    case 'pan-rl':
      scale = 1.1;
      translateX = 5 - 10 * progress;
      break;
    case 'fade-in':
      opacity = Math.min(progress * (150 / 15), 1); // match remotion: 15 frames at 30fps
      break;
  }

  // Cover-fit the image
  const imgRatio = img.width / img.height;
  const canvasRatio = canvasW / canvasH;
  let drawW: number, drawH: number;

  if (imgRatio > canvasRatio) {
    drawH = canvasH;
    drawW = canvasH * imgRatio;
  } else {
    drawW = canvasW;
    drawH = canvasW / imgRatio;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.scale(scale, scale);
  ctx.translate(translateX * (canvasW / 100), 0);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

// --- Transition compositing ---

function applyTransition(
  ctx: CanvasRenderingContext2D,
  imgA: HTMLImageElement,
  presetA: AnimationPreset,
  progressA: number,
  imgB: HTMLImageElement,
  presetB: AnimationPreset,
  progressB: number,
  transitionProgress: number, // 0..1
  transition: TransitionType,
  canvasW: number,
  canvasH: number
) {
  switch (transition) {
    case 'fade':
      // Draw A at fading-out alpha, then B at fading-in alpha
      ctx.save();
      ctx.globalAlpha = 1 - transitionProgress;
      applyPreset(ctx, imgA, presetA, progressA, canvasW, canvasH);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = transitionProgress;
      applyPreset(ctx, imgB, presetB, progressB, canvasW, canvasH);
      ctx.restore();
      break;

    case 'slide': {
      // B slides in from right, pushing A left
      const offsetX = canvasW * (1 - transitionProgress);
      ctx.save();
      ctx.translate(-canvasW * transitionProgress, 0);
      applyPreset(ctx, imgA, presetA, progressA, canvasW, canvasH);
      ctx.restore();
      ctx.save();
      ctx.translate(offsetX, 0);
      applyPreset(ctx, imgB, presetB, progressB, canvasW, canvasH);
      ctx.restore();
      break;
    }

    case 'wipe': {
      // Draw A fully, then clip-draw B from left
      applyPreset(ctx, imgA, presetA, progressA, canvasW, canvasH);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvasW * transitionProgress, canvasH);
      ctx.clip();
      applyPreset(ctx, imgB, presetB, progressB, canvasW, canvasH);
      ctx.restore();
      break;
    }

    default:
      // 'none' — hard cut, just draw B
      applyPreset(ctx, imgB, presetB, progressB, canvasW, canvasH);
      break;
  }
}

// --- Image loader ---

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

// --- Timeline calculation ---

interface TimelineSegment {
  type: 'slide' | 'transition';
  slideIndexA?: number;
  slideIndexB?: number;
  slideIndex?: number;
  startFrame: number;
  endFrame: number;
}

function buildTimeline(composition: RenderComposition): { segments: TimelineSegment[]; totalFrames: number } {
  const { slides, fps, transition, transitionDurationFrames } = composition;
  const segments: TimelineSegment[] = [];
  let currentFrame = 0;

  for (let i = 0; i < slides.length; i++) {
    const slideDurationFrames = Math.round(slides[i].durationInSeconds * fps);

    if (i > 0 && transition !== 'none' && transitionDurationFrames > 0) {
      // Transition overlaps: it starts transitionDurationFrames before the slide boundary
      // The previous slide segment was already shortened
      segments.push({
        type: 'transition',
        slideIndexA: i - 1,
        slideIndexB: i,
        startFrame: currentFrame,
        endFrame: currentFrame + transitionDurationFrames,
      });
      currentFrame += transitionDurationFrames;
    }

    const effectiveDuration = (i < slides.length - 1 && transition !== 'none')
      ? slideDurationFrames - transitionDurationFrames
      : slideDurationFrames;

    segments.push({
      type: 'slide',
      slideIndex: i,
      startFrame: currentFrame,
      endFrame: currentFrame + Math.max(effectiveDuration, 1),
    });
    currentFrame += Math.max(effectiveDuration, 1);
  }

  return { segments, totalFrames: currentFrame };
}

// --- Main render function ---

export async function renderComposition(
  composition: RenderComposition,
  callbacks: RenderCallbacks
): Promise<Blob> {
  const { slides, fps, transition } = composition;

  // Determine output resolution (largest dimensions)
  const outputWidth = Math.max(...slides.map(s => s.width));
  const outputHeight = Math.max(...slides.map(s => s.height));

  // Ensure even dimensions (required by H.264)
  const width = outputWidth % 2 === 0 ? outputWidth : outputWidth + 1;
  const height = outputHeight % 2 === 0 ? outputHeight : outputHeight + 1;

  // Load all images upfront
  const images = await Promise.all(slides.map(s => loadImage(s.imageUrl)));

  if (callbacks.signal.aborted) throw new DOMException('Render cancelled', 'AbortError');

  // Build timeline
  const { segments, totalFrames } = buildTimeline(composition);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  // Init muxer
  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
  });

  // Init encoder
  const videoEncoder = new VideoEncoder({
    output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
    error: (e) => { throw e; },
  });

  videoEncoder.configure({
    codec: 'avc1.640028', // High Profile Level 4.0
    width,
    height,
    bitrate: 8_000_000,
    framerate: fps,
    hardwareAcceleration: 'prefer-hardware',
  });

  // Render loop
  for (let frame = 0; frame < totalFrames; frame++) {
    if (callbacks.signal.aborted) {
      videoEncoder.close();
      throw new DOMException('Render cancelled', 'AbortError');
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Find which segment this frame belongs to
    const segment = segments.find(s => frame >= s.startFrame && frame < s.endFrame)!;

    if (segment.type === 'slide') {
      const idx = segment.slideIndex!;
      const localProgress = (frame - segment.startFrame) / (segment.endFrame - segment.startFrame);
      applyPreset(ctx, images[idx], slides[idx].preset, localProgress, width, height);
    } else {
      const idxA = segment.slideIndexA!;
      const idxB = segment.slideIndexB!;
      const transitionProgress = (frame - segment.startFrame) / (segment.endFrame - segment.startFrame);

      // For slide A: progress is near end (approaching 1.0)
      // For slide B: progress is near start (approaching 0.0)
      const slideADurationFrames = Math.round(slides[idxA].durationInSeconds * fps);
      const progressA = (slideADurationFrames - (segment.endFrame - frame)) / slideADurationFrames;
      const progressB = (frame - segment.startFrame) / Math.round(slides[idxB].durationInSeconds * fps);

      applyTransition(
        ctx, images[idxA], slides[idxA].preset, Math.min(progressA, 1),
        images[idxB], slides[idxB].preset, Math.min(progressB, 1),
        transitionProgress, transition, width, height
      );
    }

    const videoFrame = new VideoFrame(canvas, { timestamp: (frame * 1_000_000) / fps });
    videoEncoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 });
    videoFrame.close();

    callbacks.onProgress((frame / totalFrames) * 100);

    // Yield every 5 frames to keep UI responsive
    if (frame % 5 === 0) await new Promise(r => requestAnimationFrame(r));
  }

  await videoEncoder.flush();
  videoEncoder.close();
  muxer.finalize();

  const { buffer } = muxer.target as Mp4Muxer.ArrayBufferTarget;
  return new Blob([buffer], { type: 'video/mp4' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/canvasRenderer.ts
git commit -m "feat: add canvas renderer service with animation + transition support"
```

---

### Task 3: Render Queue Service

**Files:**
- Create: `src/services/renderQueue.ts`

- [ ] **Step 1: Create the render queue**

```ts
// src/services/renderQueue.ts
import { RenderComposition, RenderJob, RenderJobStatus } from '../types';
import { renderComposition } from './canvasRenderer';

type Listener = () => void;

class RenderQueue {
  private jobs: Map<string, RenderJob> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private queue: string[] = []; // job IDs waiting to run
  private isProcessing = false;
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  getJobs(): RenderJob[] {
    return Array.from(this.jobs.values());
  }

  getJob(id: string): RenderJob | undefined {
    return this.jobs.get(id);
  }

  enqueue(composition: RenderComposition): string {
    const job: RenderJob = {
      id: composition.id,
      composition,
      status: 'queued',
      progress: 0,
      blob: null,
      error: null,
      startedAt: null,
      completedAt: null,
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    this.notify();
    this.processNext();
    return job.id;
  }

  cancel(id: string) {
    const controller = this.abortControllers.get(id);
    if (controller) controller.abort();

    const job = this.jobs.get(id);
    if (job && (job.status === 'queued' || job.status === 'rendering')) {
      job.status = 'cancelled';
      this.queue = this.queue.filter(qId => qId !== id);
      this.notify();
    }
  }

  dismiss(id: string) {
    this.jobs.delete(id);
    this.abortControllers.delete(id);
    this.notify();
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const jobId = this.queue.shift()!;
    const job = this.jobs.get(jobId);

    if (!job || job.status === 'cancelled') {
      this.isProcessing = false;
      this.processNext();
      return;
    }

    const controller = new AbortController();
    this.abortControllers.set(jobId, controller);

    job.status = 'rendering';
    job.startedAt = Date.now();
    this.notify();

    try {
      const blob = await renderComposition(job.composition, {
        onProgress: (percent) => {
          job.progress = percent;
          this.notify();
        },
        signal: controller.signal,
      });

      job.status = 'completed';
      job.progress = 100;
      job.blob = blob;
      job.completedAt = Date.now();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        job.status = 'cancelled';
      } else {
        job.status = 'error';
        job.error = err.message || 'Render failed';
      }
    }

    this.abortControllers.delete(jobId);
    this.isProcessing = false;
    this.notify();
    this.processNext();
  }
}

// Singleton
export const renderQueue = new RenderQueue();
```

- [ ] **Step 2: Commit**

```bash
git add src/services/renderQueue.ts
git commit -m "feat: add render queue service with sequential job processing"
```

---

### Task 4: React Context + Hook

**Files:**
- Create: `src/hooks/useRenderQueue.tsx`

- [ ] **Step 1: Create the context provider and hook**

```tsx
// src/hooks/useRenderQueue.tsx
import React, { createContext, useContext, useSyncExternalStore, useCallback } from 'react';
import { renderQueue } from '../services/renderQueue';
import { RenderComposition, RenderJob } from '../types';

interface RenderQueueContextValue {
  jobs: RenderJob[];
  enqueue: (composition: RenderComposition) => string;
  cancel: (id: string) => void;
  dismiss: (id: string) => void;
}

const RenderQueueContext = createContext<RenderQueueContextValue | null>(null);

export const RenderQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const jobs = useSyncExternalStore(
    (cb) => renderQueue.subscribe(cb),
    () => renderQueue.getJobs()
  );

  const enqueue = useCallback((composition: RenderComposition) => {
    return renderQueue.enqueue(composition);
  }, []);

  const cancel = useCallback((id: string) => {
    renderQueue.cancel(id);
  }, []);

  const dismiss = useCallback((id: string) => {
    renderQueue.dismiss(id);
  }, []);

  return (
    <RenderQueueContext.Provider value={{ jobs, enqueue, cancel, dismiss }}>
      {children}
    </RenderQueueContext.Provider>
  );
};

export function useRenderQueue() {
  const ctx = useContext(RenderQueueContext);
  if (!ctx) throw new Error('useRenderQueue must be used within RenderQueueProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useRenderQueue.tsx
git commit -m "feat: add RenderQueueProvider context and useRenderQueue hook"
```

---

### Task 5: Multi-Slide Remotion Composition

**Files:**
- Create: `src/components/features/MultiSlideComposition.tsx`

This uses `TransitionSeries` from `@remotion/transitions` for the preview player.

- [ ] **Step 1: Create the multi-slide composition**

```tsx
// src/components/features/MultiSlideComposition.tsx
import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { RenderSlide, TransitionType, AnimationPreset } from '../../types';

interface SlideFrameProps {
  imageUrl: string;
  preset: AnimationPreset;
}

const SlideFrame: React.FC<SlideFrameProps> = ({ imageUrl, preset }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  let style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  };

  switch (preset) {
    case 'zoom-in': {
      const s = interpolate(frame, [0, durationInFrames], [1, 1.2], { extrapolateRight: 'clamp' });
      style.transform = `scale(${s})`;
      break;
    }
    case 'zoom-out': {
      const s = interpolate(frame, [0, durationInFrames], [1.2, 1], { extrapolateRight: 'clamp' });
      style.transform = `scale(${s})`;
      break;
    }
    case 'pan-lr': {
      const p = interpolate(frame, [0, durationInFrames], [-5, 5], { extrapolateRight: 'clamp' });
      style.transform = `scale(1.1) translateX(${p}%)`;
      break;
    }
    case 'pan-rl': {
      const p = interpolate(frame, [0, durationInFrames], [5, -5], { extrapolateRight: 'clamp' });
      style.transform = `scale(1.1) translateX(${p}%)`;
      break;
    }
    case 'fade-in': {
      const o = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
      style.opacity = o;
      break;
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img src={imageUrl} style={style} />
    </AbsoluteFill>
  );
};

function getPresentation(transition: TransitionType) {
  switch (transition) {
    case 'fade': return fade();
    case 'slide': return slide({ direction: 'from-right' });
    case 'wipe': return wipe();
    default: return fade();
  }
}

export interface MultiSlideCompositionProps {
  slides: RenderSlide[];
  transition: TransitionType;
  transitionDurationFrames: number;
  fps: number;
}

export const MultiSlideComposition: React.FC<MultiSlideCompositionProps> = ({
  slides,
  transition,
  transitionDurationFrames,
  fps,
}) => {
  if (slides.length === 1) {
    return <SlideFrame imageUrl={slides[0].imageUrl} preset={slides[0].preset} />;
  }

  return (
    <TransitionSeries>
      {slides.map((s, i) => (
        <React.Fragment key={i}>
          <TransitionSeries.Sequence durationInFrames={Math.round(s.durationInSeconds * fps)}>
            <SlideFrame imageUrl={s.imageUrl} preset={s.preset} />
          </TransitionSeries.Sequence>
          {i < slides.length - 1 && transition !== 'none' && (
            <TransitionSeries.Transition
              presentation={getPresentation(transition)}
              timing={linearTiming({ durationInFrames: transitionDurationFrames })}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/MultiSlideComposition.tsx
git commit -m "feat: add MultiSlideComposition with TransitionSeries preview"
```

---

### Task 6: Refactor RemotionPlayerModal

**Files:**
- Modify: `src/components/features/RemotionPlayerModal.tsx`

Remove all inline rendering logic. The modal becomes a pure preview + "enqueue render" trigger. Supports both single and multi-slide compositions.

- [ ] **Step 1: Rewrite RemotionPlayerModal**

Replace the entire file with:

```tsx
// src/components/features/RemotionPlayerModal.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { motion, AnimatePresence } from 'motion/react';
import { X, Video, Settings2 } from 'lucide-react';
import { MultiSlideComposition, MultiSlideCompositionProps } from './MultiSlideComposition';
import { RemotionComposition } from './RemotionComposition';
import { AnimationPreset, RenderSlide, TransitionType, RenderComposition } from '../../types';
import { Button } from '../ui/Button';
import { useRenderQueue } from '../../hooks/useRenderQueue';

interface RemotionPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Single-image mode (backward compat)
  imageUrl?: string;
  preset?: AnimationPreset;
  // Multi-slide mode
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

  // Build slides array — single image or multi
  const slides: RenderSlide[] = propSlides && propSlides.length > 0
    ? propSlides
    : imageUrl
      ? [{ imageUrl, preset, durationInSeconds: 5, width: 1920, height: 1080 }]
      : [];

  if (slides.length === 0) return null;

  const isMulti = slides.length > 1;

  // Calculate total duration in frames
  const totalFrames = slides.reduce((sum, s) => sum + Math.round(s.durationInSeconds * fps), 0)
    - (isMulti && transition !== 'none' ? (slides.length - 1) * transitionDurationFrames : 0);

  // Output resolution = largest slide
  const outputWidth = Math.max(...slides.map(s => s.width));
  const outputHeight = Math.max(...slides.map(s => s.height));

  const handleEnqueueRender = () => {
    const composition: RenderComposition = {
      id: `render-${Date.now()}`,
      slides,
      fps,
      transition: isMulti ? transition : 'none',
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
          {/* Header */}
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

          {/* Player */}
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

          {/* Footer */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/RemotionPlayerModal.tsx
git commit -m "refactor: RemotionPlayerModal uses render queue, supports multi-slide"
```

---

### Task 7: RenderToast Component

**Files:**
- Create: `src/components/features/RenderToast.tsx`

Floating toast in the bottom-right showing active/completed renders with progress, download, and dismiss.

- [ ] **Step 1: Create the toast component**

```tsx
// src/components/features/RenderToast.tsx
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useRenderQueue } from '../../hooks/useRenderQueue';
import { RenderJob } from '../../types';

const JobToast: React.FC<{ job: RenderJob; onCancel: () => void; onDismiss: () => void }> = ({ job, onCancel, onDismiss }) => {
  const elapsed = job.startedAt
    ? ((job.completedAt || Date.now()) - job.startedAt) / 1000
    : 0;

  const slideCount = job.composition.slides.length;
  const label = slideCount === 1 ? 'Single Clip' : `${slideCount} Slides`;

  const handleDownload = () => {
    if (!job.blob) return;
    const url = URL.createObjectURL(job.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `collagen-${job.id}.mp4`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="glass rounded-2xl border border-white/10 p-4 w-80 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{label}</span>
        <button
          onClick={job.status === 'rendering' ? onCancel : onDismiss}
          className="p-1 hover:bg-white/10 rounded-full transition-all"
        >
          <X size={14} className="text-white/40" />
        </button>
      </div>

      {job.status === 'rendering' && (
        <>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-white rounded-full"
              style={{ width: `${job.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-white/40">{Math.round(job.progress)}%</span>
            <span className="text-[10px] font-mono text-white/40">{elapsed.toFixed(1)}s</span>
          </div>
        </>
      )}

      {job.status === 'completed' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400" />
            <span className="text-xs text-white/60">Done in {elapsed.toFixed(1)}s</span>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-all"
          >
            <Download size={12} /> Save
          </button>
        </div>
      )}

      {job.status === 'error' && (
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400" />
          <span className="text-xs text-red-400">{job.error || 'Render failed'}</span>
        </div>
      )}

      {job.status === 'queued' && (
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="text-white/40 animate-spin" />
          <span className="text-xs text-white/40">Queued...</span>
        </div>
      )}

      {job.status === 'cancelled' && (
        <div className="flex items-center gap-2">
          <XCircle size={16} className="text-white/30" />
          <span className="text-xs text-white/30">Cancelled</span>
        </div>
      )}
    </motion.div>
  );
};

export const RenderToast: React.FC = () => {
  const { jobs, cancel, dismiss } = useRenderQueue();

  // Only show active jobs (not dismissed)
  const visibleJobs = jobs.filter(j => j.status !== 'cancelled');

  if (visibleJobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {visibleJobs.map(job => (
          <JobToast
            key={job.id}
            job={job}
            onCancel={() => cancel(job.id)}
            onDismiss={() => dismiss(job.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/RenderToast.tsx
git commit -m "feat: add RenderToast component for background render progress"
```

---

### Task 8: Wire Everything in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add RenderQueueProvider wrapper and RenderToast**

Add imports at the top:
```tsx
import { RenderQueueProvider } from './hooks/useRenderQueue';
import { RenderToast } from './components/features/RenderToast';
```

- [ ] **Step 2: Wrap the entire return JSX with RenderQueueProvider**

Change the return statement — wrap the outermost `<div>` with the provider:

```tsx
return (
  <RenderQueueProvider>
    <div className="min-h-screen bg-bg text-white selection:bg-white selection:text-black">
      {/* ... all existing content stays the same ... */}

      <RenderToast />
    </div>
  </RenderQueueProvider>
);
```

Add `<RenderToast />` just before the closing `</div>` of the root, after the `<RemotionPlayerModal>`.

- [ ] **Step 3: Update RemotionPlayerModal props for multi-slide support**

Update the existing `remotionData` state to support multi-slide:

```tsx
// Replace existing state:
// const [remotionData, setRemotionData] = useState<{ url: string, preset: AnimationPreset } | null>(null);
// With:
const [remotionData, setRemotionData] = useState<{
  url?: string;
  preset?: AnimationPreset;
  slides?: RenderSlide[];
  transition?: TransitionType;
} | null>(null);
```

Add the RenderSlide and TransitionType imports:
```tsx
import { CroppedImage, AnimationPreset, RenderSlide, TransitionType } from './types';
```

- [ ] **Step 4: Add a helper to get image dimensions for RenderSlide**

Add this utility function inside App component (before the return):

```tsx
const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 1920, height: 1080 });
    img.src = url;
  });
};
```

- [ ] **Step 5: Update handleBatchRemotion to build multi-slide compositions**

Replace the existing `handleBatchRemotion` function:

```tsx
const handleBatchRemotion = async (preset: AnimationPreset) => {
  const selected = Array.from(selectedIds);
  const targetCrops = selected.length > 0
    ? croppedImages.filter(c => selectedIds.has(c.id))
    : croppedImages;

  if (targetCrops.length === 1) {
    const crop = targetCrops[0];
    const url = crop.upscaledUrl || crop.url;
    const dims = await getImageDimensions(url);
    setRemotionData({
      slides: [{ imageUrl: url, preset, durationInSeconds: 5, ...dims }],
    });
  } else {
    const slides: RenderSlide[] = await Promise.all(
      targetCrops.map(async (c) => {
        const url = c.upscaledUrl || c.url;
        const dims = await getImageDimensions(url);
        return {
          imageUrl: url,
          preset: c.suggestedPreset || preset,
          durationInSeconds: 5,
          ...dims,
        };
      })
    );
    setRemotionData({ slides, transition: 'fade' });
  }
};
```

- [ ] **Step 6: Update onRemotionAnimate callbacks in SourcePreview and BentoItem**

For single-image calls from SourcePreview, update the callback:
```tsx
// In SourcePreview's onRemotionAnimate prop, change:
onRemotionAnimate={(preset) => setRemotionData({ url: sourceImage, preset })}
// To:
onRemotionAnimate={async (preset) => {
  const dims = await getImageDimensions(sourceImage);
  setRemotionData({
    slides: [{ imageUrl: sourceImage, preset, durationInSeconds: 5, ...dims }],
  });
}}
```

For BentoItem's onRemotionAnimate:
```tsx
// Change:
onRemotionAnimate={(url, preset) => setRemotionData({ url, preset })}
// To:
onRemotionAnimate={async (url, preset) => {
  const dims = await getImageDimensions(url);
  setRemotionData({
    slides: [{ imageUrl: url, preset, durationInSeconds: 5, ...dims }],
  });
}}
```

- [ ] **Step 7: Update RemotionPlayerModal usage in JSX**

Replace the existing `<RemotionPlayerModal>` JSX:

```tsx
<RemotionPlayerModal
  isOpen={!!remotionData}
  onClose={() => setRemotionData(null)}
  imageUrl={remotionData?.slides?.[0]?.imageUrl || ''}
  preset={remotionData?.slides?.[0]?.preset || 'zoom-in'}
  slides={remotionData?.slides}
  transition={remotionData?.transition}
/>
```

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire RenderQueueProvider, RenderToast, and multi-slide support in App"
```

---

## Self-Review Checklist

- **Spec coverage:** All requirements covered — single clip, multi-slide with @remotion/transitions, match-source resolution, per-slide duration, background queue with toast UI.
- **Placeholder scan:** No TBDs, TODOs, or vague steps. All code blocks are complete.
- **Type consistency:** `RenderComposition`, `RenderSlide`, `RenderJob`, `TransitionType` used consistently across all tasks. `AnimationPreset` unchanged from existing code.
- **Scope check:** Single cohesive feature — render engine v2. All 8 tasks are sequential and each produces working changes.
